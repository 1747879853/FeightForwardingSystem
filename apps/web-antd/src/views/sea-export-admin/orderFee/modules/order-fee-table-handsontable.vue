<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import {
  Button,
  Space,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Textarea,
  Tag,
  Card,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

import { PrintJsonType, usePrintFormat } from '#/components/print-format';

import * as feeConstants from '../data';
import * as clientConstants from '#/views/client/base/data';

import { getFeeCodePagedList } from '#/api/system/base-data/fee-code-admin';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';
import {
  batchEditOrderFee,
  getOrderFeePagedList,
  batchDeleteOrderFee,
  generateOppositeOrderFees,
} from '#/api/sea-export/order-fee-admin';

import {
  submitOrderFee,
  modifyOrderFee,
  deleteOrderFee,
  submitOrderFeeWithdrawAsync,
  OrderFeeTaskWithdraw,
} from '#/api/audit-approval/expense-admin';

import { GetDetail } from '#/api/sea-export/change-order-admin';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { HotTable } from '@handsontable/vue3';
import { registerAllModules } from 'handsontable/registry';
import * as Handsontable from 'handsontable';
import { getIndustryCategoryOptions, getCurrencyEnumOptions } from '../data';
import {
  useOrderFeeColumns,
  initOrderFeeEnumCache,
  setOrderCtnList,
} from '../data';
import OrderFeeEditorModal from './order-fee-editor-modal.vue';
import OrderFeeAuditHistoryModal from './order-fee-audit-history-modal.vue';
import BatchImportFeeModal from './batch-import-fee-modal.vue';

// 注册Handsontable所有模块
registerAllModules();

const dataSource = defineModel<OrderFeeAdminApi.OrderFeeDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);
const printing = ref(false);
const { openPrint } = usePrintFormat();

const props = defineProps<{
  type: number; // 收付类型 0 应收 1 应付
  mode?: string; // changeOrder 更改单
  parentChangeOrderId?: string; //更改单Id
  recAmountMap?: Record<string, any>; // 应收金额汇总
  payAmountMap?: Record<string, any>; // 应付金额汇总
  orderDetail?: SeaExportAdminApi.SeaExportDto | null; // 父组件传入的订单详情，避免重复请求 DetailAsync
}>();

const emit = defineEmits([
  'sync-fee',
  'update-amount',
  'refresh-opposite-table',
]);

const route = useRoute();

// 订单箱型列表（用于单位下拉框过滤）
const orderCtnList = ref<Array<{ ctnCodeId: number; ctnCodeName: string }>>([]);

// 订单基础数据（用于行业类别切换时自动填充结算对象）
const orderBaseData = ref<SeaExportAdminApi.SeaExportDto | null>(null);

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

// 订单基础数据（用于行业类别切换时自动填充结算对象）
const ORDER_CTN_API_KEYS: Array<
  Extract<keyof OrderFeeAdminApi.OrderFeeDto, string>
> = [
    'id',
    'transportOrderId',
    'paySide',
    'feeCodeId',
    'industryCategory',
    'settlementId',
    'currencyId',
    'exchangeRate',
    'unitPrice',
    'amount',
    'unit',
    'quantity',
    'taxRate',
    'noTaxUnitPrice',
    'noTaxAmount',
    'rqstPaymentAmount',
    'invoicedAmount',
    'orderInvoiceAmount',
    'settledAmount',
    'canInvoice',
    'isConfidential',
    'dataEntryMethod',
    'remark',
  ];
let rowKeyCounter = 0;

const setChangeOrderFee = async (id: string) => {
  if (id) {
    let res = await GetDetail(id);
    console.log(
      'res',
      res.orderFees.filter((item) => item.paySide === props.type),
    );
    let orderFees = res.orderFees.filter((item) => item.paySide === props.type);
    orderFees.forEach((item) => {
      item.taskStatus = '';
      if (
        item.modifyOrderFeeTasks &&
        item.modifyOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus = $t('auditApproval.task.typeOptions.ModifyOrderFee');
      } else if (
        item.deleteOrderFeeTasks &&
        item.deleteOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus = $t('auditApproval.task.typeOptions.DeleteOrderFee');
      } else {
        item.taskStatus = '';
      }
    });

    dataSource.value = normalizeOrderFeeWithRowKey(orderFees);
    //更改单使用
    syncFee();
  } else {
    dataSource.value = [];
  }
};
const changeOrderId = ref('');

const getTableDate = async (id = '') => {
  if (id) {
    changeOrderId.value = id;
  }
  await queryTableData();
};

const queryTableData = async () => {
  if (props.mode === 'changeOrder') {
    return await setChangeOrderFee(changeOrderId.value);
  }

  let params = {
    TransportOrderId: editId.value,
    PaySide: props.type ?? 0,
    PageIndex: 1,
    PageSize: 999,
  };
  const res = await getOrderFeePagedList(params);
  res.items.forEach((item) => {
    item.taskStatus = '';
    if (
      item.modifyOrderFeeTasks &&
      item.modifyOrderFeeTasks[0]?.taskStatus === 0
    ) {
      item.taskStatus = $t('auditApproval.task.typeOptions.ModifyOrderFee');
    } else if (
      item.deleteOrderFeeTasks &&
      item.deleteOrderFeeTasks[0]?.taskStatus === 0
    ) {
      item.taskStatus = $t('auditApproval.task.typeOptions.DeleteOrderFee');
    } else {
      let modifyOrderFeeTasksLength =
        item.modifyOrderFeeTasks?.filter((item) => item.taskStatus === 2)
          .length || 0;
      if (modifyOrderFeeTasksLength > 0) {
        item.ModificationCount = modifyOrderFeeTasksLength || 0;
      }
      item.taskStatus = '';
    }

    // 根据结算状态重新计算费用状态
    // 只有审核通过的费用才需要根据结算金额调整状态
    if (item.feeStatus === feeConstants.getFeeStatusValue.Approved) {
      const amount = item.amount || 0;
      const settledAmount = item.settledAmount || 0;

      if (settledAmount <= 0) {
        // 未结算，保持审核通过状态
        item.feeStatus = feeConstants.getFeeStatusValue.Approved;
      } else if (settledAmount >= amount) {
        // 已完全结算
        item.feeStatus = feeConstants.getFeeStatusValue.Settled;
      } else if (settledAmount > 0 && settledAmount < amount) {
        // 部分结算
        item.feeStatus = feeConstants.getFeeStatusValue.PartialSettlement;
      }
    }
  });
  dataSource.value = normalizeOrderFeeWithRowKey(res.items);
};

// 应用订单详情：保存基础数据并提取箱型列表（供单位下拉框过滤使用）
const applyOrderDetail = (
  orderDetail: SeaExportAdminApi.SeaExportDto | null | undefined,
) => {
  // 保存订单基础数据（用于行业类别切换时自动填充结算对象）
  orderBaseData.value = orderDetail ?? null;

  const orderCtns = orderDetail?.transportOrder?.orderCtns;
  if (orderCtns?.length) {
    // 提取唯一的箱型列表
    const ctnMap = new Map<number, string>();
    orderCtns.forEach((ctn: any) => {
      if (ctn.ctnCodeId && ctn.ctnCodeName) {
        ctnMap.set(ctn.ctnCodeId, ctn.ctnCodeName);
      }
    });

    const ctnList = Array.from(ctnMap.entries()).map(([id, name]) => ({
      ctnCodeId: id,
      ctnCodeName: name,
    }));

    orderCtnList.value = ctnList;
    setOrderCtnList(ctnList);
  } else {
    orderCtnList.value = [];
    setOrderCtnList([]);
  }
};

// 父组件传入的订单详情就绪后应用（初始加载走此处，不再单独请求 DetailAsync）
watch(
  () => props.orderDetail,
  (detail) => {
    if (detail) applyOrderDetail(detail);
  },
  { immediate: true },
);

// 模态框引用
const modifyModalRef = ref<InstanceType<typeof OrderFeeEditorModal>>();
const auditHistoryModalRef =
  ref<InstanceType<typeof OrderFeeAuditHistoryModal>>();
const batchImportModalRef = ref<InstanceType<typeof BatchImportFeeModal>>();

// 打开批量引入费用弹窗
const openBatchImportModal = async () => {
  // 获取当前订单的详细信息，用于设置默认检索条件
  console.log('🔍 [openBatchImportModal] 检查 editId:', editId.value);
  console.log('🔍 [openBatchImportModal] editId 类型:', typeof editId.value);

  if (!editId.value) {
    console.warn('⚠️ [openBatchImportModal] editId 为空');
    message.warning('请先保存业务信息');
    return;
  }

  try {
    // 优先复用已加载的订单详情，避免重复请求 DetailAsync
    const orderDetail =
      orderBaseData.value ?? (await getSeaExportDetail(editId.value));

    console.log('✅ [openBatchImportModal] 获取订单详情成功');
    console.log('📋 [openBatchImportModal] 订单详情:', orderDetail);
    console.log('📋 [openBatchImportModal] carrierId:', orderDetail?.carrierId);
    console.log('📋 [openBatchImportModal] polId:', orderDetail?.polId);
    console.log('📋 [openBatchImportModal] podId:', orderDetail?.podId);

    // 设置弹窗数据
    batchImportModalRef.value?.modalApi.setData({
      transportOrderId: editId.value,
      paySide: props.type, // 当前表格的收付类型（0=应收，1=应付）
      carrierId: orderDetail?.carrierId,
      polId: orderDetail?.polId,
      podId: orderDetail?.podId,
    });

    console.log('✅ [openBatchImportModal] 已设置弹窗数据，准备打开弹窗');

    // 打开弹窗
    batchImportModalRef.value?.modalApi.open();
  } catch (error) {
    console.error('❌ [openBatchImportModal] 获取订单详情失败:', error);
    console.error('❌ [openBatchImportModal] 错误对象:', error);
    console.error(
      '❌ [openBatchImportModal] 错误消息:',
      error instanceof Error ? error.message : '未知错误',
    );
    console.error(
      '❌ [openBatchImportModal] 错误堆栈:',
      error instanceof Error ? error.stack : '无堆栈信息',
    );

    const errorMsg = error instanceof Error ? error.message : '请稍后重试';
    message.error(`获取订单详情失败: ${errorMsg}`);
  }
};

// 处理批量导入确认
const handleBatchImportConfirm = () => {
  // 刷新当前表格数据
  getTableDate();

  // 通知父组件同步费用
  syncFee();

  // 通知父组件刷新对立表格
  emit('refresh-opposite-table');
};

// 打开审核历史弹窗
const openAuditHistoryModal = (row: OrderFeeAdminApi.OrderFeeDto) => {
  if (!row) return;
  console.log('row', row);
  // 设置数据并打开模态框
  auditHistoryModalRef.value?.modalApi.setData(row);
  auditHistoryModalRef.value?.modalApi.open();
};

// Handsontable 引用
const hotTableRef = ref<{ hotInstance?: any } | null>(null);

// 显示自定义下拉框
const showCustomDropdown = (event: MouseEvent, td: HTMLTableCellElement, rowIndex: number, field: string) => {
  // 获取当前值
  const currentValue = dataSource.value[rowIndex]?.[field];

  // 确定使用哪个数据源
  let options: Array<{ label: string; value: any }> = [];
  if (field === 'feeCodeId') {
    options = dropdownSources.value.feeCodeList;
  } else if (field === 'industryCategory') {
    options = dropdownSources.value.industryCategoryList;
  } else if (field === 'currencyId') {
    options = dropdownSources.value.currencyList;
  }

  if (options.length === 0) {
    console.warn(`⚠️ [showCustomDropdown] ${field} 的数据源为空`);
    return;
  }

  // 创建下拉框容器
  const dropdown = document.createElement('div');
  dropdown.style.position = 'fixed';
  dropdown.style.zIndex = '9999';
  dropdown.style.backgroundColor = '#fff';
  dropdown.style.border = '1px solid #d9d9d9';
  dropdown.style.borderRadius = '4px';
  dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  dropdown.style.padding = '4px 0';
  dropdown.style.minWidth = '200px';
  dropdown.style.maxHeight = '300px';
  dropdown.style.overflowY = 'auto';

  // 定位到单元格下方
  const rect = td.getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom + 5}px`;

  // 添加选项
  options.forEach(option => {
    const item = document.createElement('div');
    item.style.padding = '8px 12px';
    item.style.cursor = 'pointer';
    item.style.fontSize = '13px';
    item.textContent = option.label;

    // 高亮当前选中的项
    if (String(option.value) === String(currentValue)) {
      item.style.backgroundColor = '#e6f7ff';
      item.style.color = '#1890ff';
    }

    // 鼠标悬停效果
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f5f5f5';
    });
    item.addEventListener('mouseleave', () => {
      if (String(option.value) !== String(currentValue)) {
        item.style.backgroundColor = '#fff';
      }
    });

    // 点击选择
    item.addEventListener('click', (e) => {
      e.stopPropagation();

      // 更新数据源
      if (dataSource.value[rowIndex]) {
        dataSource.value[rowIndex][field] = option.value;
        console.log(`✅ [${field}] 已更新为:`, option.value, option.label);
      }

      // 移除下拉框
      document.body.removeChild(dropdown);

      // 刷新表格
      nextTick(() => {
        if (hotTableRef.value?.hotInstance) {
          hotTableRef.value.hotInstance.render();
        }
      });
    });

    dropdown.appendChild(item);
  });

  // 添加到 body
  document.body.appendChild(dropdown);

  // 点击其他地方关闭下拉框
  const closeDropdown = (e: MouseEvent) => {
    if (!dropdown.contains(e.target as Node)) {
      document.body.removeChild(dropdown);
      document.removeEventListener('click', closeDropdown);
    }
  };

  // 延迟添加事件监听器，避免立即触发
  setTimeout(() => {
    document.addEventListener('click', closeDropdown);
  }, 100);
};

// 下拉框数据源缓存
const dropdownSources = ref({
  feeCodeList: [] as Array<{ label: string; value: any }>,
  industryCategoryList: [] as Array<{ label: string; value: any }>,
  currencyList: [] as Array<{ label: string; value: any }>,
});

// 初始化下拉框数据源
const initDropdownSources = async () => {
  try {
    // 费用代码列表（已在 onMounted 中加载）
    // 行业类别列表
    const industryOptions = getIndustryCategoryOptions();
    dropdownSources.value.industryCategoryList = industryOptions.map((opt) => ({
      label: opt.label,
      value: opt.key,
    }));

    // 币种列表
    const currencyOptions = getCurrencyEnumOptions().filter(opt => opt.value !== 9999); // 排除"合计"选项
    dropdownSources.value.currencyList = currencyOptions.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));

    console.log('✅ [initDropdownSources] 行业类别数据:', dropdownSources.value.industryCategoryList.length, '条');
    console.log('✅ [initDropdownSources] 币种数据:', dropdownSources.value.currencyList.length, '条');
  } catch (error) {
    console.error('❌ [initDropdownSources] 初始化失败:', error);
  }
};

// 获取费用代码显示文本
const getFeeCodeLabel = (feeCodeId: any): string => {
  if (!feeCodeId) return '';
  const item = feeCodeList.value.find((f) => f.id === feeCodeId || String(f.id) === String(feeCodeId));
  if (!item) return '';
  const surLabel = item.cnName || item.enName || '';
  return item.code ? `${item.code}-${surLabel}` : surLabel;
};

// 获取行业类别显示文本
const getIndustryCategoryLabel = (industryCategory: any): string => {
  if (!industryCategory) return '';
  const option = dropdownSources.value.industryCategoryList.find(
    (opt) => opt.value === industryCategory
  );
  return option?.label || '';
};

// 获取币种显示文本
const getCurrencyLabel = (currencyId: any): string => {
  if (!currencyId) return '';
  const option = dropdownSources.value.currencyList.find(
    (opt) => opt.value === currencyId
  );
  return option?.label || '';
};

// Handsontable 列配置
const hotColumns = computed(() => {
  const vxeColumns = useOrderFeeColumns(props.type);

  // 如果 vxeColumns 为空或未定义，返回空数组
  if (!vxeColumns || !Array.isArray(vxeColumns)) {
    return [];
  }

  // 转换 VXE Table 列配置为 Handsontable 列配置
  return vxeColumns.map((col) => {
    const hotCol: any = {
      data: col.field,
      title: col.title,
      width: col.width || col.minWidth || 100,
    };

    // 根据字段类型设置不同的编辑器和渲染器
    if (col.field === 'feeCodeId') {
      // 费用代码 - 使用文本类型 + 自定义渲染器
      hotCol.type = 'text';

      // 自定义渲染器：根据 ID 显示对应的标签
      hotCol.renderer = function (this: any, instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: any, cellProperties: any) {
        const label = getFeeCodeLabel(value);
        td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
        return td;
      };
    } else if (col.field === 'industryCategory') {
      // 行业类别 - 只使用自定义渲染器
      hotCol.type = 'text';

      // 自定义渲染器：根据 value 显示对应的标签
      hotCol.renderer = function (this: any, instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: any, cellProperties: any) {
        const label = getIndustryCategoryLabel(value);
        td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
        return td;
      };
    } else if (col.field === 'settlementId') {
      // 结算对象 - 暂时使用文本编辑器，后续可以集成 ClientSelect 组件
      hotCol.type = 'text';
      hotCol.placeholder = '请输入结算对象';
    } else if (col.field === 'currencyId') {
      // 币种 - 只使用自定义渲染器
      hotCol.type = 'text';

      // 自定义渲染器：根据 ID 显示对应的标签
      hotCol.renderer = function (this: any, instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: any, cellProperties: any) {
        const label = getCurrencyLabel(value);
        td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
        return td;
      };
    } else if (['exchangeRate', 'unitPrice', 'amount', 'quantity', 'taxRate'].includes(col.field || '')) {
      hotCol.type = 'numeric';
      hotCol.numericFormat = {
        pattern: '0.00',
        culture: 'en-US',
      };
    } else if (col.field === 'canInvoice' || col.field === 'isConfidential') {
      hotCol.type = 'checkbox';
    } else {
      hotCol.type = 'text';
    }

    return hotCol;
  });
});

// Handsontable 设置
const hotSettings = computed(() => ({
  data: dataSource.value,
  columns: hotColumns.value,
  rowHeaders: true,
  colHeaders: true,
  height: 'auto',
  maxHeight: 700,
  licenseKey: 'non-commercial-and-evaluation',
  contextMenu: true,
  manualColumnResize: true,
  manualRowMove: false,
  stretchH: 'all',
  autoWrapRow: true,
  autoWrapCol: true,
  afterSelection: (row: number, column: number, row2: number, column2: number) => {
    // 处理行选择
    const selectedRows = dataSource.value.slice(row, row2 + 1);
    selectedRowKeys.value = selectedRows.map((r) => (r as any)._rowKey);
  },
  afterChange: (changes: any, source: string) => {
    // 处理数据变化
    if (source !== 'loadData') {
      syncFee();
    }
  },
  // 单元格点击事件 - 用于触发自定义下拉框
  afterOnCellMouseDown: (event: MouseEvent, coords: any, td: HTMLTableCellElement) => {
    // 获取当前列的字段名
    const columnIndex = coords.col;
    const rowIndex = coords.row;

    // 检查是否是表头
    if (rowIndex < 0) return;

    // 获取当前列配置
    const columnConfig = hotColumns.value[columnIndex];
    if (!columnConfig) return;

    const field = columnConfig.data;

    // 只对特定字段显示自定义下拉框
    if (['feeCodeId', 'industryCategory', 'currencyId'].includes(field)) {
      event.preventDefault();
      event.stopPropagation();

      showCustomDropdown(event, td, rowIndex, field);
    }
  },
  // 确保数据更新时重新渲染
  observeDOMVisibility: true,
}));

const addRow = () => {
  console.log('🔵 [addRow] 开始添加新行');
  console.log('🔵 [addRow] 当前数据源长度:', dataSource.value?.length || 0);

  const list = [...(dataSource.value ?? [])];
  const newRow = {
    _rowKey: `ofee_${++rowKeyCounter}_${Date.now()}`,
    id: '',
    transportOrderId: editId.value,
    paySide: props.type,
    currencyId: '',
    unit: '',
    feeStatus: 0,
    taxRate: 0,
    taskStatus: '',
    invoiceStatus: 0,
    canInvoice: true,
    isConfidential: false,
    dataEntryMethod: 0,
  } as any;

  list.push(newRow);
  console.log('🔵 [addRow] 新行的 _rowKey:', newRow._rowKey);
  console.log('🔵 [addRow] 添加后数据源长度:', list.length);

  // 使用 nextTick 确保 DOM 更新后再操作 Handsontable
  nextTick(() => {
    dataSource.value = list;
    console.log('🔵 [addRow] 已更新 dataSource.value');

    // 如果 HotTable 实例存在，手动加载新数据
    if (hotTableRef.value?.hotInstance) {
      console.log('🔵 [addRow] 调用 hotInstance.loadData');
      hotTableRef.value.hotInstance.loadData(list);
      console.log('🔵 [addRow] loadData 调用完成');
    } else {
      console.warn('⚠️ [addRow] hotInstance 不存在');
    }
  });
};

const delRow = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  const needDelIds = (dataSource.value ?? [])
    .filter((row) => keysSet.has((row as any)._rowKey))
    .filter((row) => (row as any).id !== '')
    .map((row) => (row as any).id);

  selectedRowKeys.value = [];
  if (props.mode !== 'changeOrder' && needDelIds.length > 0) {
    batchDeleteOrderFee(needDelIds).then(() => {
      nextTick(() => {
        dataSource.value = list;

        // 使用 Handsontable API 更新数据
        if (hotTableRef.value?.hotInstance) {
          hotTableRef.value.hotInstance.loadData(list);
        }

        message.success({
          content: $t('ui.actionMessage.operationSuccess'),
          key: 'action_process_msg',
        });
      });
    });
  } else {
    nextTick(() => {
      dataSource.value = list;

      // 使用 Handsontable API 更新数据
      if (hotTableRef.value?.hotInstance) {
        hotTableRef.value.hotInstance.loadData(list);
      }
    });
  }
};

const getSelectedRows = (): OrderFeeAdminApi.OrderFeeDto[] => {
  const keysSet = new Set(selectedRowKeys.value);
  return (dataSource.value ?? []).filter((row) => {
    const rowKey = (row as { _rowKey?: string })._rowKey;
    return rowKey !== undefined && keysSet.has(rowKey);
  });
};

const isSavedOrderFee = (row: OrderFeeAdminApi.OrderFeeDto) =>
  Boolean(row.id && String(row.id).trim());

const handlePrint = async () => {
  if (printing.value) return;

  const selected = getSelectedRows();
  if (!selected.length) {
    message.warning('请先勾选要打印的费用');
    return;
  }
  if (selected.some((row) => !isSavedOrderFee(row))) {
    message.warning('请先保存费用后再打印');
    return;
  }

  printing.value = true;
  const hideLoading = message.loading('正在准备打印...', 0);
  try {
    const json = JSON.stringify(
      selected.map((row) => {
        const { _rowKey, ...fee } = row as OrderFeeAdminApi.OrderFeeDto & {
          _rowKey?: string;
        };
        return fee;
      }),
    );
    openPrint({
      printJsonType:
        props.type === 0
          ? PrintJsonType.RecOrderFeeList
          : PrintJsonType.PayOrderFeeList,
      json,
    });
  } catch {
    message.error('打印准备失败，请稍后重试');
  } finally {
    hideLoading();
    printing.value = false;
  }
};

const showDeleteWithRemark = () => {
  if (!selectedRowKeys.value.length) return;

  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  // 验证：只有费用状态是审核通过，并且已开票金额、发票申请金额、已结算金额、申请付款金额全是0，才可以申请删除
  const invalidRows = list.filter((row) => {
    const isApproved =
      row.feeStatus === feeConstants.getFeeStatusValue.Approved;
    const hasInvoicedAmount = (row.invoicedAmount || 0) !== 0;
    const hasOrderInvoiceAmount = (row.orderInvoiceAmount || 0) !== 0;
    const hasSettledAmount = (row.settledAmount || 0) !== 0;
    const hasRqstPaymentAmount = (row.rqstPaymentAmount || 0) !== 0;

    return (
      !isApproved ||
      hasInvoicedAmount ||
      hasOrderInvoiceAmount ||
      hasSettledAmount ||
      hasRqstPaymentAmount
    );
  });

  if (invalidRows.length > 0) {
    message.error({
      content: '当前费用不允许申请更改',
      key: 'action_process_msg',
    });
    return;
  }

  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: $t('auditApproval.task.okDelete'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkDeletePlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      await nextTick();
      submitDelete(modalRemark);
    },
    onCancel() {
      modalRemark = '';
    },
  });
};

const ImportOther = async (e: any) => {
  switch (e.key) {
    case 'submit': {
      generateOppositeFees();
      break;
    }
  }
};

const SubmittedOther = async (e: any) => {
  switch (e.key) {
    case 'modify': {
      openModifyModal();
      break;
    }
    case 'delete': {
      showDeleteWithRemark();
      break;
    }
  }
};

const orderFeeWithdraw = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  let orderFeeWithdrawDto: ExpenseSubmissionAdminApi.OrderFeeTaskWithdrawDto = {
    orderFeeIds: list.map((item) => item.id),
  };
  OrderFeeTaskWithdraw(orderFeeWithdrawDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

// 收付互生费用（应收生成应付 / 应付生成应收）
const generateOppositeFees = async () => {
  if (!selectedRowKeys.value.length) {
    message.warning($t('请选择一条数据'));
    return;
  }

  const keysSet = new Set(selectedRowKeys.value);
  const selectedList = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  if (selectedList.length === 0) {
    message.warning($t('请选择一条数据'));
    return;
  }

  // 获取当前更改单ID（如果有）
  const changeOrderId =
    props.mode === 'changeOrder' ? props.parentChangeOrderId : undefined;

  // 构建请求参数
  const params: OrderFeeAdminApi.GenerateOppositeOrderFeesInputDto = {
    transportOrderId: editId.value || '',
    paySide: props.type,
    orderFeeIds: selectedList.map((item) => item.id),
    changeOrderId: changeOrderId,
  };

  console.log('🔄 [generateOppositeFees] 收付互生参数:', params);

  try {
    const result = await generateOppositeOrderFees(params);
    console.log('✅ [generateOppositeFees] 生成的费用ID列表:', result);

    message.success({
      content: `成功生成 ${result.length} 条${props.type === 0 ? '应付' : '应收'}费用`,
      key: 'action_process_msg',
    });

    // 刷新当前表格数据
    await getTableDate();

    // 通知父组件同步费用（触发emit事件）
    syncFee();

    // 通知父组件刷新对立表格（应收生成应付时刷新应付表，反之亦然）
    emit('refresh-opposite-table');
  } catch (error) {
    console.error('❌ [generateOppositeFees] 收付互生失败:', error);
  }
};

const Submitted = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? [])
    .filter((row) => keysSet.has((row as any)._rowKey))
    .filter(
      (row) =>
        row.feeStatus === feeConstants.getFeeStatusValue.Entering ||
        row.feeStatus === feeConstants.getFeeStatusValue.Rejected ||
        row.feeStatus === feeConstants.getFeeStatusValue.ApplyModify,
    );
  let SubmitOrderFeeDto = {
    TransportOrderId: editId.value,
    PaySide: props.type ?? 0,
    orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(SubmitOrderFeeDto);
  submitOrderFee(SubmitOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const openModifyModal = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  // 验证：只有费用状态是审核通过，并且已开票金额、发票申请金额、已结算金额、申请付款金额全是0，才可以申请修改
  const invalidRows = list.filter((row) => {
    const isApproved =
      row.feeStatus === feeConstants.getFeeStatusValue.Approved;
    const hasInvoicedAmount = (row.invoicedAmount || 0) !== 0;
    const hasOrderInvoiceAmount = (row.orderInvoiceAmount || 0) !== 0;
    const hasSettledAmount = (row.settledAmount || 0) !== 0;
    const hasRqstPaymentAmount = (row.rqstPaymentAmount || 0) !== 0;

    return (
      !isApproved ||
      hasInvoicedAmount ||
      hasOrderInvoiceAmount ||
      hasSettledAmount ||
      hasRqstPaymentAmount
    );
  });

  if (invalidRows.length > 0) {
    message.error({
      content: '当前费用不允许申请更改',
      key: 'action_process_msg',
    });
    return;
  }

  if (list.length > 1) {
    message.error({
      content: $t('ui.actionMessage.lengthLimit1'),
      key: 'action_process_msg',
    });
    return;
  }

  // 打开模态框，传递选中的费用数据、合计数据和订单基础数据
  const selectedFee = list[0];
  modifyModalRef.value?.modalApi.setData({
    feeData: selectedFee,
    orderBaseData: orderBaseData.value,
  });

  modifyModalRef.value?.modalApi.open();
};

// 处理模态框确认事件
const handleModalConfirm = (data: {
  originalData: OrderFeeAdminApi.OrderFeeDto | null;
  updatedData: OrderFeeAdminApi.OrderFeeDto | null;
}) => {
  let list = [data.updatedData];
  let ModifyOrderFeeDto = {
    remark: data.updatedData?.remark || '',
    TransportOrderId: editId.value,
    orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(ModifyOrderFeeDto);
  modifyOrderFee(ModifyOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const submitModify = (remark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let ModifyOrderFeeDto = {
    remark: remark,
    TransportOrderId: editId.value,
    orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(ModifyOrderFeeDto);
  modifyOrderFee(ModifyOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const submitDelete = (remark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let DeleteOrderFeeDto = {
    remark: remark,
    TransportOrderId: editId.value,
    orderFeeIds: list.map((item) => item.id),
  };
  console.log(DeleteOrderFeeDto);
  deleteOrderFee(DeleteOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderFeeWithRowKey = (
  items: OrderFeeAdminApi.OrderFeeDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    industryCategory:
      item.industryCategory === 0 ? undefined : item.industryCategory,
    _rowKey: `ofee_${i}_${Date.now()}`,
  })) as any[];
};

/** 提交时移除 _rowKey 等非 API 字段，仅保留 OrderCtnAddDto 字段 */
const sanitizeOrderFee = (
  items: any[] | undefined,
): OrderFeeAdminApi.OrderFeeEditDto[] => {
  if (!items?.length) return [];

  const numericFields = new Set([
    'currencyId',
    'feeCodeId',
    'paySide',
    'feeStatus',
    'invoiceStatus',
    'industryCategory',
    'dataEntryMethod',
  ]);

  return items.map((item) => {
    const dto: Record<string, any> = {};
    for (const key of ORDER_CTN_API_KEYS) {
      const val = item[key];

      if (val === undefined || val === null) continue;
      if (typeof val === 'string' && val === '') continue;

      if (numericFields.has(key)) {
        dto[key] = typeof val === 'number' ? val : Number(val);
        continue;
      }

      dto[key] = val;
    }
    return dto as OrderFeeAdminApi.OrderFeeEditDto;
  });
};

const saveRow = () => {
  const list = (dataSource.value ?? []).filter(
    (row) =>
      row.feeStatus === feeConstants.getFeeStatusValue.Entering ||
      row.feeStatus === feeConstants.getFeeStatusValue.Rejected ||
      row.feeStatus === feeConstants.getFeeStatusValue.ApplyModify,
  );

  const editList = sanitizeOrderFee(list);
  batchEditOrderFee(editList).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const removeSelectedRows = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  const needDelIds = (dataSource.value ?? [])
    .filter((row) => keysSet.has((row as any)._rowKey))
    .filter((row) => (row as any).id !== '')
    .map((row) => (row as any).id);

  selectedRowKeys.value = [];
  if (props.mode !== 'changeOrder' && needDelIds.length > 0) {
    batchDeleteOrderFee(needDelIds).then(() => {
      nextTick(() => {
        dataSource.value = list;

        // 使用 Handsontable API 更新数据
        if (hotTableRef.value?.hotInstance) {
          hotTableRef.value.hotInstance.loadData(list);
        }

        message.success({
          content: $t('ui.actionMessage.operationSuccess'),
          key: 'action_process_msg',
        });
      });
    });
  } else {
    nextTick(() => {
      dataSource.value = list;

      // 使用 Handsontable API 更新数据
      if (hotTableRef.value?.hotInstance) {
        hotTableRef.value.hotInstance.loadData(list);
      }
    });
  }
};

const syncFee = () => {
  const list = dataSource.value ?? [];
  const syncFeeDto = {
    type: props.type ?? 0,
    orderFees: list,
  };
  console.log('费用同步', syncFeeDto);
  emit('sync-fee', syncFeeDto);

  // 实时计算当前表格的金额汇总
  calculateAndEmitAmount(list);
};

// 计算并发送金额汇总数据
const calculateAndEmitAmount = (list: OrderFeeAdminApi.OrderFeeDto[]) => {
  if (!list || list.length === 0) {
    emit('update-amount', {
      type: props.type ?? 0,
      amountMap: {},
    });
    return;
  }

  const amountMap: Record<string, any> = {};
  const currencyIdList = list.map((item) => item.currencyId).filter(Boolean);

  const uniqueCurrencyIds = [...new Set(currencyIdList)];

  uniqueCurrencyIds.forEach((currencyId) => {
    const currencyList = list.filter((item) => item.currencyId === currencyId);

    const totalAmount = currencyList.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);

    const totalRMBAmount = currencyList.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);

    const exchangeRate = currencyList[0]?.exchangeRate || 1;
    const currencyName = currencyList[0]?.currencyName || '';

    if (currencyId !== undefined && currencyId !== null) {
      if (props.type === 0) {
        amountMap[currencyId] = {
          totalRecAmount: totalAmount,
          totalRMBRecAmount: totalRMBAmount,
          exchangeRate,
          currencyName,
          currencyId,
        };
      } else {
        amountMap[currencyId] = {
          totalPayAmount: totalAmount,
          totalRMBPayAmount: totalRMBAmount,
          exchangeRate,
          currencyName,
          currencyId,
        };
      }
    }
  });

  console.log(
    `💰 [${props.type === 0 ? '应收' : '应付'}] 金额汇总更新:`,
    amountMap,
  );

  emit('update-amount', {
    type: props.type ?? 0,
    amountMap,
  });
};

watch(
  () => dataSource.value,
  (val) => {
    if (val === undefined || val === null) {
      dataSource.value = [];
    }
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
    syncFee();
  },
  { immediate: true },
);

// 监听 editId 变化，重新加载箱型数据
watch(
  () => editId.value,
  async (newEditId, oldEditId) => {
    if (newEditId && newEditId !== oldEditId) {
      try {
        const orderDetail = await getSeaExportDetail(newEditId);
        applyOrderDetail(orderDetail);
      } catch (error) {
        console.error('❌ [watch editId] 加载订单详情失败:', error);
      }
      getTableDate();
    }
  },
);

const feeCodeList = ref<FeeCodeAdminApi.FeeCodeDto[]>([]);
const getFeeCodeList = async () => {
  try {
    let res = (await getFeeCodePagedList({ PageIndex: 1, PageSize: 1000 })) || {};
    feeCodeList.value = res.items || [];

    // 更新费用代码下拉框数据源
    dropdownSources.value.feeCodeList = feeCodeList.value.map((item) => {
      const surLabel = item.cnName || item.enName || '';
      const label = item.code ? `${item.code}-${surLabel}` : surLabel;
      return {
        label: label || item.cnName || item.enName || item.code || '',
        value: item.id,
      };
    });

    console.log('✅ [getFeeCodeList] 费用代码列表加载完成:', dropdownSources.value.feeCodeList.length, '条');
  } catch (error) {
    console.error('❌ [getFeeCodeList] 加载失败:', error);
  }
};

// 监听费用代码列表变化，更新下拉框数据源
watch(
  () => feeCodeList.value,
  (newList) => {
    if (newList && newList.length > 0) {
      dropdownSources.value.feeCodeList = newList.map((item) => {
        const surLabel = item.cnName || item.enName || '';
        const label = item.code ? `${item.code}-${surLabel}` : surLabel;
        return {
          label: label || item.cnName || item.enName || item.code || '',
          value: item.id,
        };
      });

      // 如果 HotTable 实例存在，重新加载列配置
      if (hotTableRef.value?.hotInstance) {
        hotTableRef.value.hotInstance.updateSettings({
          columns: hotColumns.value,
        });
      }
    }
  },
  { deep: true }
);

onMounted(async () => {
  // 初始化枚举数据缓存
  initOrderFeeEnumCache();

  // 初始化下拉框数据源
  await initDropdownSources();

  // 订单详情（含箱型列表、订单基础数据）由父组件通过 orderDetail 传入
  // 加载表格数据
  getTableDate();
  getFeeCodeList();
});

defineExpose({
  getTableDate,
});
</script>

<template>
  <Card class="order-fee-card">
    <div class="px-1">
      <div>
        <div class="order-ctn-table">
          <div class="handsontable-container">
            <div class="table-header">
              <span class="table-title">
                {{
                  type === 0
                    ? $t('seaExport.export.orderFee.receivableCharges')
                    : $t('seaExport.export.orderFee.payableCharges')
                }}
              </span>
              <Space class="toolbar-actions">
                <Button type="primary" @click="addRow">
                  {{ $t('common.create') }}
                </Button>
                <Button type="primary" @click="saveRow" v-show="props.mode !== 'changeOrder'">
                  {{ $t('common.save') }}
                </Button>
                <Button v-show="props.mode !== 'changeOrder'" :loading="printing" @click="handlePrint">
                  <IconifyIcon icon="mdi:printer-outline" class="mr-1 inline-block size-3.5 align-middle" />
                  打印
                </Button>
                <Button danger :disabled="!selectedRowKeys.length" @click="removeSelectedRows">
                  {{ $t('common.delete') }}
                </Button>

                <DropdownButton @click="openBatchImportModal" type="primary">
                  {{ $t('seaExport.export.orderFee.batchImport') }}
                  <template #overlay>
                    <Menu @click="ImportOther">
                      <MenuItem key="submit">
                        {{ type === 0 ? '应收生成应付' : '应付生成应收' }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <DropdownButton @click="Submitted" type="primary" :disabled="!selectedRowKeys.length">
                  {{ $t('auditApproval.status.Submitted') }}
                  <template #overlay>
                    <Menu @click="SubmittedOther">
                      <MenuItem key="modify">
                        {{ $t('auditApproval.ApplyModification') }}
                      </MenuItem>
                      <MenuItem key="delete">
                        {{ $t('auditApproval.ApplyDeletion') }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <Button type="primary" :disabled="!selectedRowKeys.length" @click="orderFeeWithdraw">{{
                  $t('auditApproval.withdraw')
                }}</Button>
              </Space>
            </div>

            <HotTable ref="hotTableRef" :settings="hotSettings" class="handsontable-wrapper" />
          </div>
        </div>
      </div>
    </div>

    <!-- 费用编辑模态框 -->
    <OrderFeeEditorModal ref="modifyModalRef" :rec-amount-map="recAmountMap || {}" :pay-amount-map="payAmountMap || {}"
      :fee-code-list="feeCodeList" @confirm="handleModalConfirm" />

    <!-- 审核历史模态框 -->
    <OrderFeeAuditHistoryModal ref="auditHistoryModalRef" />

    <!-- 批量引入费用模态框 -->
    <BatchImportFeeModal ref="batchImportModalRef" @confirm="handleBatchImportConfirm" />
  </Card>
</template>

<style scoped lang="scss">
.order-fee-card {
  :deep(.ant-card-body) {
    padding: 0 20px 12px !important;
  }

  .order-ctn-table {
    display: flex;
    flex-direction: column;
    height: 500px;
  }

  .handsontable-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    overflow: hidden;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;

    .table-title {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
  }

  .handsontable-wrapper {
    flex: 1;
    min-height: 0;
    overflow: auto;

    :deep(.htCore) {
      width: 100% !important;
    }

    :deep(.ht_master) {
      overflow: auto !important;
      max-height: calc(700px - 60px);
    }

    // 优化滚动条样式
    :deep(::-webkit-scrollbar) {
      width: 16px;
      height: 16px;
    }

    :deep(::-webkit-scrollbar-track) {
      background: #f5f5f5;
      border-radius: 8px;
    }

    :deep(::-webkit-scrollbar-thumb) {
      min-width: 40px;
      min-height: 40px;
      background: #c1c1c1;
      border-radius: 8px;

      &:hover {
        background: #a8a8a8;
      }

      &:active {
        background: #8a8a8a;
      }
    }
  }

  // Handsontable 自定义样式
  :deep(.handsontable) {
    font-size: 13px;

    .htCore {
      border-collapse: collapse;
    }

    th {
      background: #fafafa;
      font-weight: 500;
      color: #262626;
      border-color: #e8e8e8;
    }

    td {
      border-color: #e8e8e8;
    }

    .htSelected {
      background: #e6f7ff !important;
    }

    .htCurrent {
      outline: 2px solid #1890ff !important;
      outline-offset: -2px;
    }
  }
}
</style>
