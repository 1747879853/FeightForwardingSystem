<script lang="ts" setup>
import type { ReportApi } from '#/api/system/report';

import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { HotTable } from '@handsontable/vue3';

import { Page } from '@vben/common-ui';

import { useAccess } from '@vben/access';
import { useVbenForm } from '#/adapter/form';

import { Button, Card, message, Tag } from 'ant-design-vue';

import { getArrearsReportList } from '#/api/system/report';

import { useArrearsReportFormSchema, getHotColumns } from './data';

// 导入 SheetJS
import * as XLSX from 'xlsx';

defineOptions({
  name: 'ArrearsReport',
});

const router = useRouter();
const { hasAccessByCodes } = useAccess();

// 权限检查
const canView = computed(() => true); // 临时允许所有用户访问

// Handsontable 引用
const hotTableRef = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
// 当前显示的列配置
const currentColumnsRef = ref<any[]>([]);

// 表格数据
const tableData = ref<any[]>([]);
const originalData = ref<any[]>([]); // 保存原始数据用于分组
const loading = ref(false);

// 分组相关状态
const groupColumns = ref<string[]>([]); // 当前分组的列名数组
const expandedGroups = ref<Set<string>>(new Set()); // 展开的分组键集合

// 表单配置
const formSchema = useArrearsReportFormSchema();

// Handsontable 列配置
const hotColumns = getHotColumns();

// 获取列标题映射（用于表头显示）
const columnTitleMap = hotColumns.reduce(
  (map, col) => {
    map[col.data] = col.title;
    return map;
  },
  {} as Record<string, string>,
);

// 数值列字段（用于累加和右对齐）
const numericColumns = new Set([
  'totalReceivable',
  'totalReceived',
  'totalUnReceived',
  'overdueDays',
]);

// Handsontable 配置
const hotSettings = {
  data: tableData.value,
  columns: [] as any[], // 动态设置
  rowHeaders: true,
  colHeaders: true,
  height: '100%', // 使用百分比高度，配合 CSS 实现自适应
  width: '100%',
  stretchH: 'all',

  // ✅ 关键配置：启用所有必要的功能
  manualColumnResize: true, // 允许调整列宽
  manualRowResize: true, // 允许调整行高
  manualColumnMove: true, // ✅ 允许拖拽移动列
  manualRowMove: false, // 不允许移动行

  // ✅ 启用列排序功能
  columnSorting: {
    indicator: true,
    sortEmptyCells: false,
  },

  // ⚠️ 重要：contextMenu 设置为 false 可能影响某些功能
  // 如果拖拽仍不工作，可以尝试启用 contextMenu
  contextMenu: false,

  // ⚠️ readOnly 可能会影响交互，但通常不影响拖拽
  readOnly: true,

  licenseKey: 'non-commercial-and-evaluation',
  className: 'htCenter htMiddle',
  rowHeight: 28,
  autoWrapRow: false,
  autoWrapCol: false,
  afterGetColHeader: (col: number, TH: HTMLTableCellElement) => {
    TH.style.backgroundColor = '#1890ff'; // 蓝色背景
    TH.style.color = '#ffffff'; // 白色文字
    TH.style.fontWeight = '600';
    TH.style.textAlign = 'center';

    // 如果是分组列（第一列且有分组），不添加列分组点击事件
    if (groupColumns.value.length > 0 && col === 0) {
      TH.style.cursor = 'default';
      TH.title = '';
      return;
    }

    // 提示用户可以使用左键单击排序，右键菜单添加分组
    TH.style.cursor = 'pointer';
    TH.title = '左键单击排序 | 右键直接添加分组';

    // 移除自定义的双击事件，让 Handsontable 原生排序功能正常工作
    TH.ondblclick = null;
    TH.onclick = null;

    // 添加右键菜单来添加分组（不干扰排序和拖拽）
    TH.oncontextmenu = (e: MouseEvent) => {
      e.preventDefault();

      // 从当前显示的列配置中获取列数据
      const currentColumns = currentColumnsRef.value;
      if (col >= 0 && col < currentColumns.length) {
        const columnData = currentColumns[col]?.data;
        // 确保不是分组列的数据字段
        if (
          columnData &&
          columnData !== '_groupDisplay' &&
          !groupColumns.value.includes(columnData)
        ) {
          // 直接添加分组，无需确认弹窗
          groupColumns.value.push(columnData);
          if (originalData.value.length > 0) {
            applyGrouping([...originalData.value]);
          }
        } else {
          window.alert('该列已在分组中或是分组列，无法重复添加');
        }
      }
    };
  },
  //afterOnCellMouseDown: onAfterOnCellMouseDown,
  afterDblClick: onAfterOnCellDblClick, // 添加双击事件处理
  // 添加单元格渲染后的事件处理（用于分组列的点击）
  afterRenderer: (
    TD: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string,
    value: any,
    cellProperties: any,
  ) => {
    const rowData = tableData.value[row];

    // 为合计行添加data属性
    if (rowData?._isTotalRow) {
      TD.parentElement?.setAttribute('data-total-row', 'true');
      TD.style.fontWeight = 'bold';
      return;
    }

    if (col === 0 && groupColumns.value.length > 0) {
      // 分组列，添加点击事件
      if (rowData?._isGroupRow) {
        TD.onclick = () => {
          toggleGroupExpand(rowData._groupKey);
        };
        TD.style.cursor = 'pointer';
      }
    }
  },
};

/**
 * 更新表格高度
 */
let resizeObserver: ResizeObserver | null = null;

function updateTableHeight() {
  nextTick(() => {
    const container = containerRef.value;
    const hotInstance = hotTableRef.value?.hotInstance;

    if (!container || !hotInstance) {
      // 如果实例还没准备好，稍后重试
      setTimeout(updateTableHeight, 50);
      return;
    }

    // 1. 获取视口总高度
    const viewportHeight = window.innerHeight;

    // 2. 获取容器相对于视口的位置
    const rect = container.getBoundingClientRect();

    // 3. 计算目标高度：视口高度 - 容器顶部距离视口顶部的距离 - 底部缓冲(防止出现垂直滚动条)
    let targetHeight = viewportHeight - rect.top - 24;

    // 确保高度不小于 200
    if (targetHeight < 200) {
      targetHeight = 200;
    }

    // 4. 更新 Handsontable 高度
    hotInstance.updateSettings({ height: targetHeight }, false);
  });
}

function initResizeObserver() {
  if (!containerRef.value) return;

  // 清理旧的观察者
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  resizeObserver = new ResizeObserver(() => {
    updateTableHeight();
  });

  // 观察 body 的变化，因为窗口缩放时容器本身尺寸可能不变但视口变了
  resizeObserver.observe(document.body);
}

// 监听窗口大小变化
window.addEventListener('resize', updateTableHeight);

onMounted(() => {
  // 初始化观察者
  initResizeObserver();
  // 默认执行一次查询
  handleQuery();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateTableHeight);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// 创建表单
const [QueryForm, formApi] = useVbenForm({
  schema: formSchema,
  showDefaultActions: true,
  commonConfig: {
    labelWidth: 100,
  },
  wrapperClass: 'grid-cols-5', // 修改为每行5个字段
  showCollapseButton: true,
  collapsed: true,
  submitButtonOptions: {
    content: '查询',
  },
  resetButtonOptions: {
    content: '重置',
  },
  handleSubmit: async (values) => {
    await handleQuery(values);
  },
  handleReset: async () => {
    await handleReset();
  },
});

/**
 * 根据业务类型自动设置港口类型
 */
function setPortTypeByBizType(queryParams: any) {
  const { bizType } = queryParams;

  // 根据业务类型设置港口类型
  if (bizType !== undefined && bizType !== null) {
    if (bizType === 2) {
      // 空运出口
      queryParams.polIsSeaPort = false;
      queryParams.podIsSeaPort = false;
    } else {
      // 海运出口(0)或海运进口(1)
      queryParams.polIsSeaPort = true;
      queryParams.podIsSeaPort = true;
    }
  }

  return queryParams;
}

/**
 * 查询报表数据
 */
async function handleQuery(formData?: any) {
  if (!canView.value) {
    message.warning('您没有权限查看欠费报表');
    return;
  }

  try {
    loading.value = true;

    const values = formData || (await formApi.getValues());

    // 根据业务类型自动设置港口类型
    const processedValues = setPortTypeByBizType({ ...values });

    const result = await getArrearsReportList(
      processedValues as ReportApi.ArrearsReportQueryDto,
    );

    const dataList = result || [];

    const transformedData = transformDataForHotTable(dataList);

    originalData.value = [...transformedData];
    applyGrouping(transformedData);

    // 数据加载并渲染后，重新计算表格高度
    nextTick(() => {
      updateTableHeight();
    });

    message.success(`查询成功，共 ${transformedData.length} 条记录`);
  } catch (error: any) {
    console.error('查询失败:', error);
    message.error(error?.message || '查询失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

/**
 * 重置查询条件
 */
async function handleReset() {
  await formApi.resetForm();
  tableData.value = [];
  originalData.value = [];
  groupColumns.value = [];
  expandedGroups.value = new Set();

  await nextTick();
  if (hotTableRef.value && hotTableRef.value.hotInstance) {
    hotTableRef.value.hotInstance.loadData([]);
  }
}

/**
 * 处理表格点击事件
 */
function onAfterOnCellMouseDown(
  event: any,
  coords: any,
  TD: HTMLTableCellElement,
) {
  if (coords.row >= 0 && coords.row < tableData.value.length) {
    const rowData = tableData.value[coords.row];
    if (rowData && rowData._isGroupRow) {
      // 点击分组行，切换展开/折叠
      toggleGroupExpand(rowData._groupKey);
    }
    // 数据行双击跳转在 afterOnCellDblClick 中处理
  }
}

/**
 * 添加双击事件处理
 */
function onAfterOnCellDblClick(
  event: any,
  coords: any,
  TD: HTMLTableCellElement,
) {
  if (coords.row >= 0 && coords.row < tableData.value.length) {
    const rowData = tableData.value[coords.row];
    // 排除合计行和分组行
    if (
      rowData &&
      rowData._isDataRow &&
      rowData._originalData &&
      !rowData._isTotalRow
    ) {
      // 双击数据行，跳转详情
      handleViewDetail(rowData._originalData);
    }
  }
}

/**
 * 安全的日期格式化函数
 */
function safeFormatDate(
  dateStr: string | undefined | null,
  format: 'date' | 'month' = 'date',
): string {
  if (!dateStr) {
    return '-';
  }

  // 尝试解析日期
  const date = new Date(dateStr);

  // 检查是否为有效日期
  if (isNaN(date.getTime())) {
    console.warn('无效的日期格式:', dateStr);
    return '-';
  }

  try {
    if (format === 'month') {
      // 使用标准格式 YYYY-MM，避免末尾多余的斜杠
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.warn('日期格式化失败:', dateStr, error);
    return '-';
  }
}

/**
 * 转换数据以适应 Handsontable
 */
function transformDataForHotTable(data: ReportApi.ArrearsReportDto[]) {
  return data.map((item) => {
    // 从 transportOrder 中提取业务字段
    const transportOrder = item.transportOrder;

    // 根据业务类型获取专属字段
    let seaExport: ReportApi.ReportSeaExportDto | null = null;
    let seaImport: ReportApi.ReportSeaImportDto | null = null;
    let airExport: ReportApi.ReportAirExportDto | null = null;

    if (transportOrder) {
      seaExport = transportOrder.seaExport || null;
      seaImport = transportOrder.seaImport || null;
      airExport = transportOrder.airExport || null;
    }

    // 确定港口信息（根据业务类型）
    let pol: any = null;
    let pod: any = null;
    let polRemark: string = '';
    let podRemark: string = '';
    let vessel: string = '';
    let innerVoyno: string = '';

    if (seaExport) {
      pol = seaExport.pol;
      pod = seaExport.pod;
      polRemark = seaExport.polRemark || '';
      podRemark = seaExport.podRemark || '';
      vessel = seaExport.vessel || '';
      innerVoyno = seaExport.innerVoyno || '';
    } else if (seaImport) {
      pol = seaImport.pol;
      pod = seaImport.pod;
      polRemark = seaImport.polRemark || '';
      podRemark = seaImport.podRemark || '';
      vessel = seaImport.vessel || '';
      innerVoyno = seaImport.innerVoyno || '';
    } else if (airExport) {
      pol = airExport.pol;
      pod = airExport.pod;
      polRemark = airExport.polRemark || '';
      podRemark = airExport.podRemark || '';
    }

    return {
      // 行级字段
      transportOrderId: item.transportOrderId,
      changeOrderId: item.changeOrderId,
      isOriginal: item.isOriginal,
      accountDate: safeFormatDate(item.accountDate, 'month'),

      // 业务字段（从 transportOrder 提取）
      bizType: formatBizType(transportOrder?.bizType ?? 0),
      client: transportOrder?.client?.name || '-',
      mblNum: transportOrder?.mblNum || '',
      commissionNum: transportOrder?.commissionNum || '',
      bizDate: safeFormatDate(transportOrder?.bizDate, 'date'),
      settlementDate: safeFormatDate(transportOrder?.settlementDate, 'date'),

      // 结算对象
      settlement: item.settlement?.name || '-',

      // 费用锁定
      feeLocked: item.feeLocked,

      // 超期天数
      overdueDays: item.overdueDays || 0,

      // 发票号
      invoiceNos: Array.isArray(item.invoiceNos) ? item.invoiceNos : [],

      // 港口和运输信息
      pol: pol ? pol.code : '-',
      pod: pod ? pod.code : '-',
      polRemark,
      podRemark,
      vessel,
      innerVoyno,

      // 箱型箱量
      ctns: formatCtns(transportOrder?.ctns || []),

      // 币别明细
      currencies: formatCurrencies(item.currencies),

      // 金额
      totalReceivable: item.totalReceivable?.toFixed(2) || '0.00',
      totalReceived: item.totalReceived?.toFixed(2) || '0.00',
      totalUnReceived: item.totalUnReceived?.toFixed(2) || '0.00',

      // 原始数据（用于跳转详情）
      _originalData: item,
      _isDataRow: true,
    };
  });
}

/**
 * 格式化业务类型
 */
function formatBizType(bizType: number) {
  const typeMap: Record<number, string> = {
    0: '海运出口',
    1: '海运进口',
    2: '空运出口',
  };
  return typeMap[bizType] || '-';
}

/**
 * 格式化箱型箱量
 */
function formatCtns(ctns: any[]) {
  if (!ctns || ctns.length === 0) return '-';
  return ctns.map((ctn) => `${ctn.ctnCode.ctnName}×${ctn.count}`).join(', ');
}

/**
 * 格式化币别明细
 */
function formatCurrencies(currencies: any[]) {
  if (!currencies || currencies.length === 0) return '-';
  return currencies
    .map(
      (curr) =>
        `${curr.currency.code}:应收${curr.receivable.toFixed(2)}/已收${curr.received.toFixed(2)}/欠费${curr.unReceived.toFixed(2)}`,
    )
    .join('; ');
}

/**
 * 跳转到业务详情 /sea-exports/7897b6b1-039f-4b88-ae51-b419f5a85e8f/edit
 */
function handleViewDetail(record: ReportApi.ArrearsReportDto) {
  // 从 transportOrder 中获取业务信息
  const transportOrder = record.transportOrder;

  if (!record || !record.transportOrderId) {
    message.warning('该记录没有关联的业务订单，无法跳转详情');
    return;
  }

  const bizType = transportOrder?.bizType ?? record.bizType;

  const bizTypeMap: Record<number, string> = {
    0: 'sea-exports',
    1: 'sea-imports',
    2: 'air-exports',
  };

  const basePath = bizTypeMap[bizType];
  if (!basePath) {
    message.warning('不支持的业务类型，无法跳转详情');
    return;
  }

  router.push({
    path: `/${basePath}/${record.transportOrderId}/edit`,
  });
}

/**
 * 计算合计行数据
 */
function calculateTotalRow(): any {
  const totalRow: any = {
    _isTotalRow: true, // 标记为合计行
  };

  // 初始化所有字段为空字符串
  hotColumns.forEach((col) => {
    totalRow[col.data] = '';
  });

  // 设置分组列显示（如果有分组）
  if (groupColumns.value.length > 0) {
    totalRow._groupDisplay = '合计';
  } else {
    // 无分组时，在第一列显示"合计"
    if (hotColumns.length > 0) {
      totalRow[hotColumns[0].data] = '合计';
    }
  }

  // 基于原始数据计算合计（originalData.value 包含所有原始数据）
  const originalDataArray = originalData.value;

  // 对数值列进行合计
  numericColumns.forEach((colName) => {
    let sum = 0;
    let hasData = false;

    originalDataArray.forEach((item) => {
      const value = parseFloat(item[colName]) || 0;
      sum += value;
      hasData = true;
    });

    if (hasData) {
      totalRow[colName] = sum.toFixed(2);
    } else {
      totalRow[colName] = '0.00';
    }
  });

  return totalRow;
}

// 递归构建树状结构（带聚合数据）
function buildTreeStructure(
  data: any[],
  groupCols: string[],
  level: number = 0,
): any[] {
  if (groupCols.length === 0) {
    // 没有更多分组列，返回原始数据（标记层级）
    return data.map((item) => ({
      ...item,
      _groupLevel: level,
      _isDataRow: true,
    }));
  }

  const [currentGroupCol, ...remainingGroupCols] = groupCols;

  // 按当前分组列分组
  const groups = new Map<string, any[]>();
  data.forEach((item) => {
    const groupValue = item[currentGroupCol] || '空값';
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)?.push(item);
  });

  const result: any[] = [];

  groups.forEach((items, groupName) => {
    // 创建聚合后的分组行数据
    const aggregatedRow: any = {};

    // 设置分组列的值
    aggregatedRow[currentGroupCol] = groupName;

    // 聚合其他列的数据
    hotColumns.forEach((colConfig) => {
      const col = colConfig.data;
      if (col === currentGroupCol) return; // 分组列已经设置

      const values = items.map((item) => item[col]);

      if (numericColumns.has(col)) {
        // 数值列：累加
        let sum = 0;
        values.forEach((val) => {
          const numVal = parseFloat(val) || 0;
          sum += numVal;
        });
        aggregatedRow[col] = sum.toFixed(2);
      } else {
        // 文本列：统计每个值的出现次数并格式化显示
        const valueCounts: Record<string, number> = {};
        let totalCount = 0;

        values.forEach((val) => {
          if (val && val !== '-') {
            valueCounts[val] = (valueCounts[val] || 0) + 1;
            totalCount++;
          }
        });

        const uniqueValues = Object.keys(valueCounts);
        if (uniqueValues.length === 0) {
          aggregatedRow[col] = '-';
        } else if (uniqueValues.length === 1) {
          // 只有一个唯一值，显示为 "값(数量)"
          const value = uniqueValues[0];
          const count = valueCounts[value];
          aggregatedRow[col] = `${value}(${count})`;
        } else {
          // 多个唯一값，显示为 "값1(번호1), 값2(번호2), ..."
          const formattedValues = uniqueValues.map((value) => {
            return `${value}(${valueCounts[value]})`;
          });
          aggregatedRow[col] = formattedValues.join(', ');
        }
      }
    });

    // 添加分组行元数据
    aggregatedRow._isGroupRow = true;
    aggregatedRow._groupName = `${groupName}(${items.length})`;
    aggregatedRow._groupKey = `${currentGroupCol}|${groupName}|${level}`;
    aggregatedRow._groupLevel = level;
    aggregatedRow._groupItems = items;
    aggregatedRow._hasChildren =
      remainingGroupCols.length > 0 || items.length > 0;

    result.push(aggregatedRow);

    // 检查是否展开（即使是第一级也不默认展开，让用户手动控制）
    const isExpanded = expandedGroups.value.has(aggregatedRow._groupKey);

    if (isExpanded) {
      if (remainingGroupCols.length > 0) {
        // 还有更多分组列，递归处理
        const subTree = buildTreeStructure(
          items,
          remainingGroupCols,
          level + 1,
        );
        result.push(...subTree);
      } else {
        // 最后一级，添加原始数据行
        const dataRows = items.map((item) => ({
          ...item,
          _groupLevel: level + 1,
          _isDataRow: true,
          _originalData: item._originalData,
        }));
        result.push(...dataRows);
      }
    }
  });

  return result;
}

// 构建完整的导出树结构（包含所有数据，无论是否展开）
function buildFullExportTree(
  data: any[],
  groupCols: string[],
  level: number = 0,
): any[] {
  if (groupCols.length === 0) {
    // 没有更多分组列，返回原始数据（标记层级）
    return data.map((item) => ({
      ...item,
      _groupLevel: level,
      _isDataRow: true,
    }));
  }

  const [currentGroupCol, ...remainingGroupCols] = groupCols;

  // 按当前分组列分组
  const groups = new Map<string, any[]>();
  data.forEach((item) => {
    const groupValue = item[currentGroupCol] || '空값';
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)?.push(item);
  });

  const result: any[] = [];

  groups.forEach((items, groupName) => {
    // 创建聚合后的分组行数据
    const aggregatedRow: any = {};

    // 设置分组列的值
    aggregatedRow[currentGroupCol] = groupName;

    // 聚合其他列的数据
    hotColumns.forEach((colConfig) => {
      const col = colConfig.data;
      if (col === currentGroupCol) return; // 分组列已经设置

      const values = items.map((item) => item[col]);

      if (numericColumns.has(col)) {
        // 数值列：累加
        let sum = 0;
        values.forEach((val) => {
          const numVal = parseFloat(val) || 0;
          sum += numVal;
        });
        aggregatedRow[col] = sum.toFixed(2);
      } else {
        // 文本列：统计每个值的出现次数并格式化显示
        const valueCounts: Record<string, number> = {};
        let totalCount = 0;

        values.forEach((val) => {
          if (val && val !== '-') {
            valueCounts[val] = (valueCounts[val] || 0) + 1;
            totalCount++;
          }
        });

        const uniqueValues = Object.keys(valueCounts);
        if (uniqueValues.length === 0) {
          aggregatedRow[col] = '-';
        } else if (uniqueValues.length === 1) {
          // 只有一个唯一值，显示为 "값(数量)"
          const value = uniqueValues[0];
          const count = valueCounts[value];
          aggregatedRow[col] = `${value}(${count})`;
        } else {
          // 多个唯一값，显示为 "값1(번호1), 값2(번호2), ..."
          const formattedValues = uniqueValues.map((value) => {
            return `${value}(${valueCounts[value]})`;
          });
          aggregatedRow[col] = formattedValues.join(', ');
        }
      }
    });

    // 添加分组行元数据
    aggregatedRow._isGroupRow = true;
    aggregatedRow._groupName = `${groupName}(${items.length})`;
    aggregatedRow._groupLevel = level;
    aggregatedRow._hasChildren =
      remainingGroupCols.length > 0 || items.length > 0;

    result.push(aggregatedRow);

    // 始终展开所有子节点用于导出
    if (remainingGroupCols.length > 0) {
      // 还有更多分组列，递归处理
      const subTree = buildFullExportTree(items, remainingGroupCols, level + 1);
      result.push(...subTree);
    } else {
      // 最后一级，添加原始数据行
      const dataRows = items.map((item) => ({
        ...item,
        _groupLevel: level + 1,
        _isDataRow: true,
        _originalData: item._originalData,
      }));
      result.push(...dataRows);
    }
  });

  return result;
}

// 获取带对齐样式的列配置
function getColumnsWithAlignment() {
  return hotColumns.map((col) => {
    const isNumeric = numericColumns.has(col.data);
    return {
      ...col,
      className: isNumeric ? 'htRight' : 'htLeft',
    };
  });
}

// 创建分组列配置
function createGroupColumn() {
  return {
    data: '_groupDisplay',
    title: '分组',
    width: 250,
    className: 'htLeft', // 分组列左对齐
    renderer: (
      instance: any,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string,
      value: any,
      cellProperties: any,
    ) => {
      const rowData = tableData.value[row];
      if (rowData?._isGroupRow) {
        // 分组行：显示分组信息和展开/折叠图标
        const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(
          rowData._groupLevel || 0,
        );
        const isExpanded = expandedGroups.value.has(rowData._groupKey);
        const expandIcon = isExpanded ? 'v ​' : '> ';
        td.innerHTML = `${indent}${expandIcon} <strong>${rowData._groupName}</strong>`;
        td.style.backgroundColor = '#e6f7ff';
        //td.style.fontWeight = 'bold';
        td.style.cursor = 'pointer';
      } else if (rowData?._isDataRow) {
        // 数据行：显示缩进
        const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(
          (rowData._groupLevel || 0) + 1,
        );
        td.innerHTML = `${indent}•`;
        td.style.backgroundColor = '#fafafa';
      } else {
        // 晧行
        td.innerHTML = '';
      }
      return td;
    },
  };
}

// 切换分组展开/折叠
function toggleGroupExpand(groupKey: string) {
  const newExpanded = new Set(expandedGroups.value);
  if (newExpanded.has(groupKey)) {
    newExpanded.delete(groupKey);
  } else {
    newExpanded.add(groupKey);
  }
  expandedGroups.value = newExpanded;

  if (originalData.value.length > 0) {
    applyGrouping([...originalData.value]);
  }
}

// 应用分组逻辑
function applyGrouping(data: any[]) {
  console.log(
    '应用分组，分组列:',
    groupColumns.value,
    '数据长度:',
    data.length,
  );

  let columnsConfig = [];

  if (groupColumns.value.length > 0) {
    // 如果有分组，在最前面添加分组列，并过滤掉已用于分组的列
    const groupedColumnSet = new Set(groupColumns.value);
    const filteredColumns = hotColumns
      .filter((col) => !groupedColumnSet.has(col.data))
      .map((col) => {
        const isNumeric = numericColumns.has(col.data);
        return {
          ...col,
          className: isNumeric ? 'htRight' : 'htLeft',
        };
      });

    columnsConfig = [createGroupColumn(), ...filteredColumns];
  } else {
    // 无分组时显示所有列
    columnsConfig = getColumnsWithAlignment();
  }

  // 保存当前列配置
  currentColumnsRef.value = columnsConfig;
  hotSettings.columns = columnsConfig;

  if (groupColumns.value.length === 0) {
    tableData.value = data.map((item) => ({
      ...item,
      _isDataRow: true,
    }));
    console.log('无分组，显示原始数据');
  } else {
    // 构建树状结构
    const treeData = buildTreeStructure(data, groupColumns.value);
    tableData.value = treeData;

    console.log('分组后的数据长度:', treeData.length);
    console.log('前5条数据:', treeData.slice(0, 5));
  }

  // 添加合计行（只要有数据就显示）
  if (originalData.value.length > 0) {
    const totalRow = calculateTotalRow();
    tableData.value = [...tableData.value, totalRow];
  }

  // 更新 Handsontable 数据
  nextTick(() => {
    if (hotTableRef.value && hotTableRef.value.hotInstance) {
      try {
        hotTableRef.value.hotInstance.loadData(tableData.value);
        // 重新设置列配置
        hotTableRef.value.hotInstance.updateSettings({
          columns: hotSettings.columns,
        });

        console.log(
          'Handsontable 更新完成，当前行数:',
          hotTableRef.value.hotInstance.countRows(),
        );
      } catch (error) {
        console.error('Handsontable 更新失败:', error);
      }
    } else {
      console.warn('HotTable 实例未找到');
    }
  });
}

// 移除分组列
function removeGroupColumn(index: number) {
  groupColumns.value.splice(index, 1);
  if (originalData.value.length > 0) {
    applyGrouping([...originalData.value]);
  }
}

// 监听分组变化
watch(groupColumns, (newVal, oldVal) => {
  if (originalData.value.length > 0) {
    applyGrouping([...originalData.value]);
  }
});

/**
 * 导出当前显示的数据为Excel
 */
function handleExport() {
  if (originalData.value.length === 0) {
    message.warning('没有数据可导出');
    return;
  }

  try {
    let exportData: any[] = [];
    let headers: string[] = [];
    let headerTitles: string[] = [];

    if (groupColumns.value.length > 0) {
      // 有分组的情况 - 使用完整的导出树结构
      const currentColumns = currentColumnsRef.value;
      headers = currentColumns.map((col) => col.data);
      headerTitles = currentColumns.map((col) =>
        col.data === '_groupDisplay'
          ? '分组'
          : columnTitleMap[col.data] || col.data,
      );

      // 构建完整的导出数据（包含所有未展开的数据）
      const fullExportTree = buildFullExportTree(
        [...originalData.value],
        groupColumns.value,
      );

      // 添加合计行
      const totalRow = calculateTotalRow();

      // 处理每一行数据
      for (const row of [...fullExportTree, totalRow]) {
        const exportRow: Record<string, any> = {};

        for (let i = 0; i < headers.length; i++) {
          const colData = headers[i];
          if (colData === '_groupDisplay') {
            // 分组列的特殊处理
            if (row._isGroupRow) {
              exportRow[colData] = row._groupName;
            } else if (row._isTotalRow) {
              exportRow[colData] = '合计';
            } else if (row._isDataRow) {
              // 数据行显示缩进标记
              const indentLevel = (row._groupLevel || 0) + 1;
              exportRow[colData] = '•'.repeat(indentLevel);
            } else {
              exportRow[colData] = '';
            }
          } else {
            // 普通列
            exportRow[colData] = row[colData] ?? '';
          }
        }

        exportData.push(exportRow);
      }
    } else {
      // 无分组的情况
      headers = hotColumns.map((col) => col.data);
      headerTitles = hotColumns.map(
        (col) => columnTitleMap[col.data] || col.data,
      );

      // 包含合计行
      const totalRow = calculateTotalRow();
      const allData = [...originalData.value, totalRow];

      for (const row of allData) {
        const exportRow: Record<string, any> = {};
        for (const col of hotColumns) {
          exportRow[col.data] = row[col.data] ?? '';
        }
        exportData.push(exportRow);
      }
    }

    // 创建工作表数据
    const wsData: any[][] = [];

    // 添加表头
    wsData.push(headerTitles);

    // 添加数据行
    for (const row of exportData) {
      const rowData: any[] = [];
      for (const header of headers) {
        rowData.push(row[header]);
      }
      wsData.push(rowData);
    }

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 计算列宽（考虑表头和数据内容的最大长度）
    const colWidths = headers.map((header, index) => {
      const title = headerTitles[index];
      let maxWidth = Math.min(50, Math.max(10, title.length + 2)); // 表头长度

      // 检查数据内容的最大长度
      for (const row of exportData) {
        const cellValue = String(row[header] || '');
        const cellLength = cellValue.length;
        if (cellLength > maxWidth && cellLength <= 50) {
          maxWidth = cellLength + 2;
        }
      }

      return { wch: maxWidth };
    });

    // 设置列宽
    ws['!cols'] = colWidths;

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '欠费报表');

    // 导出Excel文件
    const timestamp =
      new Date().toLocaleDateString('zh-CN').replace(/\//g, '') +
      '_' +
      new Date().toLocaleTimeString('zh-CN').replace(/[:]/g, '');
    XLSX.writeFile(wb, `欠费报表_${timestamp}.xlsx`);

    message.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败，请稍后重试');
  }
}
</script>

<template>
  <Page auto-content-height>
    <!-- 查询区域 -->
    <Card class="mb-3" :bordered="false">
      <QueryForm />
    </Card>

    <!-- 分组区域 -->
    <div
      class="group-area mb-2 flex items-center rounded border bg-gray-50 px-4"
      style="width: 100%; height: 40px"
    >
      <span class="mr-2 text-sm text-gray-600">点击列标题添加分组：</span>
      <div
        v-if="groupColumns.length === 0"
        class="flex-1 text-sm text-gray-400"
      >
        暂无分组列
      </div>
      <div v-else class="flex flex-1 flex-wrap gap-1">
        <Tag
          v-for="(col, index) in groupColumns"
          :key="index"
          closable
          @close="removeGroupColumn(index)"
          class="cursor-pointer"
        >
          {{ columnTitleMap[col] || col }}
          <span class="ml-1 text-xs text-gray-500">{{ index + 1 }}级</span>
        </Tag>
      </div>
      <!-- 导出按钮 -->
      <Button
        type="primary"
        size="small"
        class="ml-2"
        @click="handleExport"
        :disabled="tableData.length === 0"
      >
        导出
      </Button>
    </div>

    <!-- 表格区域 -->
    <Card class="flex flex-col" :bordered="false">
      <div ref="containerRef" class="handsontable-container">
        <HotTable ref="hotTableRef" :settings="hotSettings" />
      </div>
    </Card>
  </Page>
</template>

<style scoped lang="scss">
.group-area {
  min-width: 200px;
}

.handsontable-container {
  position: relative;
  width: 100%;
  height: 100%;

  :deep(.handsontable) {
    height: 100%;
    font-size: 13px;

    .htCore {
      td {
        padding: 6px 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: middle;
        white-space: nowrap;
      }

      // 数据行可双击样式
      tr:not([data-group-row='true']) td {
        cursor: pointer;
      }

      th {
        padding: 6px 4px;
        font-weight: 600;
        vertical-align: middle;
      }
    }

    // 分组行样式
    :deep(tr[data-group-row='true']) {
      font-weight: bold;
      background-color: #fafafa29 !important;
    }

    // 详细行样式
    :deep(tr[data-detail-row='true']) {
      background-color: #fafafa29 !important;
    }

    // 合计行样式
    :deep(tr[data-total-row='true']) {
      font-weight: bold !important;
      background-color: #f0f0f0 !important;
    }
  }
}
</style>
