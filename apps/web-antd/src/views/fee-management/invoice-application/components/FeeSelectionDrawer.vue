<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';

import {
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Spin,
} from 'ant-design-vue';

import NestedDataTable from '#/components/nested-data-table/nested-data-table.vue';

import { ClientSelect, CurrencySelect } from '#/adapter/component';
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();
interface Props {
  visible: boolean;
  settlementId?: string; // 已选择的结算单位（固定）
  currencyId?: number; // 已选择的币别（固定）
  invoiceApplicationId?: string; // 发票申请ID（用于排除已关联的费用）
  addedFeeIds?: string[]; // ✅ 新增：已添加的费用ID列表
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  settlementId: '',
  currencyId: undefined,
  invoiceApplicationId: '',
  addedFeeIds: () => [], // ✅ 默认空数组
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (
    e: 'save',
    data: {
      selectedFees: any[];
      settlementId: string;
      currencyId: number;
      invoiceExchangeRate?: number;
      feeGroupsData?: any[]; // ✅ 新增：传递完整的费用分组数据
    },
  ): void;
}>();

// 抽屉相关状态
const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const feeDrawerLoading = ref(false);
const selectedSettlementId = ref<string>('');
const selectedSettlementName = ref<string>('');
const selectedCurrencyId = ref<number | undefined>();
const selectedCurrencyCode = ref<string>('');

// 抽屉筛选条件
const keyWord = ref<string>('');
const filterMblNum = ref<string>('');
const filterClientId = ref<string>(''); // 新增：委托单位
const filterEtdStart = ref<string>(''); // 新增：开船日期起
const filterEtdEnd = ref<string>(''); // 新增：开船日期止
const filterPaySide = ref<number>(0); // 新增：收付类型，默认应收(0)
const filterBizType = ref<number | undefined>(undefined); // ✅ 新增：业务类型

// ✅ 新增：用于 RangePicker 的日期范围状态
const filterEtdRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(undefined);

// 费用明细表格数据
const feeGroupsData = ref<any[]>([]);

// 选中的费用行 keys（支持父级和子级）
const selectedFeeRowKeys = ref<string[]>([]);

// NestedDataTable 展开的行 keys
const expandedRowKeys = ref<string[]>([]);

// 监听费用数据变化，自动展开所有行
watch(
  feeGroupsData,
  (newData) => {
    if (newData && newData.length > 0) {
      expandedRowKeys.value = newData.map((item) => item.id);
    } else {
      expandedRowKeys.value = [];
    }
  },
  { immediate: true },
);

// 发票汇率
const invoiceExchangeRate = ref<number>(1.0);

// ✅ 新增：监听 currencyId 变化，自动加载汇率
watch(
  () => props.currencyId,
  async (newCurrencyId) => {
    if (newCurrencyId && drawerVisible.value) {
      console.log('🔄 检测到 currencyId 变化，加载对应汇率:', newCurrencyId);
      await loadDefaultExchangeRate(newCurrencyId);
    }
  },
  { immediate: false },
);

/** 从选中的费用中更新币别 */
async function updateCurrencyFromSelectedFees() {
  const allSelected = flattenTreeData(feeGroupsData.value);
  const selectedFees = allSelected.filter(
    (item: any) => item.orderFee && selectedFeeRowKeys.value.includes(item.id),
  );

  if (selectedFees.length > 0) {
    const firstFee = selectedFees[0];
    const currencyId = firstFee.orderFee?.currencyId;

    if (currencyId && currencyId !== selectedCurrencyId.value) {
      selectedCurrencyId.value = currencyId;
      await loadDefaultExchangeRate(currencyId);
    }
  }
}

/** 检查父级是否全部选中 */
const isAllParentSelected = computed(() => {
  if (feeGroupsData.value.length === 0) return false;
  return feeGroupsData.value.every((record) => isParentSelected(record.id));
});

/** 检查父级是否部分选中（用于indeterminate状态） */
const isIndeterminate = computed(() => {
  if (feeGroupsData.value.length === 0) return false;
  const selectedCount = feeGroupsData.value.filter((record) =>
    isParentSelected(record.id),
  ).length;
  return selectedCount > 0 && selectedCount < feeGroupsData.value.length;
});

/** 切换所有父级选择 */
async function toggleAllParentSelection(checked: boolean) {
  if (checked) {
    // 全选所有父级（及其可选子级）
    const allChildIds: string[] = [];
    feeGroupsData.value.forEach((record) => {
      if (record.feeDetails && record.feeDetails.length > 0) {
        const selectableChildren = record.feeDetails
          .filter((child: any) => !child.disabled && !child.alreadyAdded)
          .map((child: any) => child.id);
        allChildIds.push(...selectableChildren);
      }
    });
    selectedFeeRowKeys.value = allChildIds;
  } else {
    // 取消全选
    selectedFeeRowKeys.value = [];
  }
  await updateCurrencyFromSelectedFees();
}

/** 检查单个父级是否选中 */
function isParentSelected(parentId: string): boolean {
  const parent = feeGroupsData.value.find((item) => item.id === parentId);
  if (!parent || !parent.feeDetails) return false;

  // 父级选中当且仅当所有可选子级都被选中
  const selectableChildren = parent.feeDetails.filter(
    (child: any) => !child.disabled && !child.alreadyAdded,
  );

  if (selectableChildren.length === 0) return false;

  return selectableChildren.every((child: any) =>
    selectedFeeRowKeys.value.includes(child.id),
  );
}

/** 检查单个父级是否部分选中 */
function isParentIndeterminate(parentId: string): boolean {
  const parent = feeGroupsData.value.find((item) => item.id === parentId);
  if (!parent || !parent.feeDetails) return false;

  const selectableChildren = parent.feeDetails.filter(
    (child: any) => !child.disabled && !child.alreadyAdded,
  );

  if (selectableChildren.length === 0) return false;

  const selectedCount = selectableChildren.filter((child: any) =>
    selectedFeeRowKeys.value.includes(child.id),
  ).length;

  return selectedCount > 0 && selectedCount < selectableChildren.length;
}

/** 切换单个父级选择 */
async function toggleParentSelection(record: any, checked: boolean) {
  if (checked) {
    // 选中父级时，自动选中所有未禁用的子级
    if (record.feeDetails && record.feeDetails.length > 0) {
      const selectableChildren = record.feeDetails
        .filter((child: any) => !child.disabled && !child.alreadyAdded)
        .map((child: any) => child.id);

      const currentSelected = selectedFeeRowKeys.value.filter(
        (key) =>
          !record.feeDetails ||
          !record.feeDetails.some((child: any) => child.id === key),
      );

      selectedFeeRowKeys.value = [...currentSelected, ...selectableChildren];
    }
  } else {
    // 取消选中父级时，取消所有子级的选中
    if (record.feeDetails && record.feeDetails.length > 0) {
      selectedFeeRowKeys.value = selectedFeeRowKeys.value.filter(
        (key) => !record.feeDetails.some((child: any) => child.id === key),
      );
    }
  }

  await updateCurrencyFromSelectedFees();
}

/** 检查子级是否选中 */
function isChildSelected(childId: string): boolean {
  return selectedFeeRowKeys.value.includes(childId);
}

/** 切换单个子级选择 */
async function toggleChildSelection(record: any, checked: boolean) {
  if (checked) {
    if (!selectedFeeRowKeys.value.includes(record.id)) {
      selectedFeeRowKeys.value = [...selectedFeeRowKeys.value, record.id];
    }
  } else {
    selectedFeeRowKeys.value = selectedFeeRowKeys.value.filter(
      (key) => key !== record.id,
    );
  }
  await updateCurrencyFromSelectedFees();
}

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};
/** 加载默认汇率 */
async function loadDefaultExchangeRate(currencyId: number) {
  try {
    const now = dayjs();
    const currentDate = now.format('YYYY-MM-DD');

    const result = await getExchangeRatePagedList({
      CurrencyId: currencyId,
      PageIndex: 1,
      PageSize: 100,
    });

    if (result.items && result.items.length > 0) {
      const matchedRate = result.items.find((item: any) => {
        const startDate = item.startDate ? dayjs(item.startDate) : null;
        const endDate = item.endDate ? dayjs(item.endDate) : null;

        const isStartDateValid =
          !startDate || now.isAfter(startDate) || now.isSame(startDate);
        const isEndDateValid =
          !endDate || now.isBefore(endDate) || now.isSame(endDate);

        return isStartDateValid && isEndDateValid;
      });

      if (matchedRate) {
        const defaultRate = matchedRate.invoiceValue ?? 1.0;
        invoiceExchangeRate.value = defaultRate;
      } else {
        const firstRate = result.items[0];
        if (firstRate) {
          const defaultRate = firstRate.invoiceValue ?? 1.0;
          invoiceExchangeRate.value = defaultRate;
        } else {
          invoiceExchangeRate.value = 1.0;
        }
      }
    } else {
      invoiceExchangeRate.value = 1.0;
    }

    try {
      const currencyDetail = await getCurrencyDetail(currencyId);
      selectedCurrencyCode.value = currencyDetail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
      selectedCurrencyCode.value = '';
    }
  } catch (error) {
    console.error('加载默认汇率失败:', error);
    invoiceExchangeRate.value = 1.0;
  }
}

/** 将树状数据扁平化 */
function flattenTreeData(data: any[]): any[] {
  const result: any[] = [];

  function flatten(items: any[]) {
    items.forEach((item) => {
      result.push(item);
      if (item.feeDetails && item.feeDetails.length > 0) {
        flatten(item.feeDetails);
      }
    });
  }

  flatten(data);
  return result;
}

/** 为表格添加列宽拖拽功能 */
function enableColumnResize(tableElement: HTMLElement | null) {
  if (!tableElement) return;

  const headers = tableElement.querySelectorAll('th');

  headers.forEach((header) => {
    if (
      header.classList.contains('ant-table-selection-column') ||
      header.classList.contains('ant-table-expand-icon-th')
    ) {
      return;
    }

    if (header.querySelector('.column-resizer')) {
      return;
    }

    const resizer = document.createElement('div');
    resizer.className = 'column-resizer';
    resizer.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      cursor: col-resize;
      background-color: transparent;
      transition: background-color 0.2s;
      z-index: 10;
    `;

    resizer.addEventListener('mouseenter', () => {
      resizer.style.backgroundColor = '#d9d9d9';
    });

    resizer.addEventListener('mouseleave', () => {
      resizer.style.backgroundColor = 'transparent';
    });

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = header.offsetWidth;
      resizer.style.backgroundColor = '#1890ff';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const diff = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      header.style.width = `${newWidth}px`;
      header.style.minWidth = `${newWidth}px`;
      header.style.maxWidth = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      isResizing = false;
      resizer.style.backgroundColor = 'transparent';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    header.style.position = 'relative';
    header.appendChild(resizer);
  });
}

/** 为所有可见的表格启用列宽拖拽 */
function enableResizeForAllTables() {
  // 等待 DOM 更新完成后再查找表格元素
  nextTick(() => {
    const tables = document.querySelectorAll(
      '.fee-selection-table-wrapper .ant-table-wrapper',
    );
    tables.forEach((table) => {
      enableColumnResize(table as HTMLElement);
    });
  });
}

// 在抽屉打开后启用列宽拖拽
watch(drawerVisible, (visible) => {
  if (visible) {
    // 延迟执行以确保表格已渲染
    setTimeout(() => {
      enableResizeForAllTables();
    }, 100);
  }
});

// 在数据加载完成后也尝试启用列宽拖拽
watch(feeGroupsData, () => {
  if (drawerVisible.value) {
    setTimeout(() => {
      enableResizeForAllTables();
    }, 50);
  }
});

/** 从表格获取选中的费用 */
function getSelectedFeesFromTable(): any[] {
  const allSelected = flattenTreeData(feeGroupsData.value);
  const selectedFees = allSelected.filter(
    (item: any) => item.orderFee && selectedFeeRowKeys.value.includes(item.id),
  );

  return selectedFees;
}

/** 重置筛选条件 */
function handleResetFilter() {
  selectedSettlementId.value = '';
  selectedSettlementName.value = '';
  selectedCurrencyId.value = undefined;
  keyWord.value = '';
  filterMblNum.value = '';
  filterClientId.value = '';
  filterEtdStart.value = '';
  filterEtdEnd.value = '';
  filterEtdRange.value = undefined; // ✅ 重置日期范围
  filterPaySide.value = 0;
  filterBizType.value = undefined; // ✅ 重置业务类型
  selectedFeeRowKeys.value = [];
  loadFeeGroupData();
}

/** 处理日期范围变化 */
function handleEtdRangeChange(
  dates: [dayjs.Dayjs, dayjs.Dayjs] | [string, string] | undefined,
) {
  if (dates && dates.length === 2) {
    const startDate = dates[0];
    const endDate = dates[1];

    // 处理 Dayjs 对象或字符串
    if (typeof startDate === 'string') {
      filterEtdStart.value = startDate;
    } else {
      filterEtdStart.value = startDate?.format('YYYY-MM-DD') || '';
    }

    if (typeof endDate === 'string') {
      filterEtdEnd.value = endDate;
    } else {
      filterEtdEnd.value = endDate?.format('YYYY-MM-DD') || '';
    }
  } else {
    filterEtdStart.value = '';
    filterEtdEnd.value = '';
  }
}

/** ✅ 新增：根据 settlementId 自动更新 settlementName */
async function updateSettlementNameById(settlementId: string) {
  if (!settlementId) {
    selectedSettlementName.value = '';
    return;
  }

  try {
    // 从 baseStore 中查找客户名称
    const clients = baseStore.clients;
    const client = clients.find((item) => item.id === settlementId);

    if (client) {
      selectedSettlementName.value = client.name || '';
    } else {
      // 如果 store 中没有，尝试重新加载（可选）
      await baseStore.fetchClients({ pageIndex: 1, pageSize: 1000 });
      const updatedClient = baseStore.clients.find(
        (item) => item.id === settlementId,
      );
      selectedSettlementName.value = updatedClient?.name || '';
    }
  } catch (error) {
    console.error('更新结算单位名称失败:', error);
    selectedSettlementName.value = '';
  }
}

/** 打开费用选择抽屉 */
function handleOpenFeeDrawer() {
  if (!props.settlementId) {
    selectedSettlementId.value = '';
    selectedSettlementName.value = '';
    selectedCurrencyId.value = undefined;
    selectedFeeRowKeys.value = [];
  } else {
    selectedSettlementId.value = props.settlementId;
    updateSettlementNameById(props.settlementId);
    selectedCurrencyId.value = props.currencyId;
  }

  drawerVisible.value = true;
  nextTick(() => {
    loadFeeGroupData();
  });
}

/** 保存费用选择 */
async function handleSaveFeeSelection() {
  const selectedFees = getSelectedFeesFromTable();

  if (selectedFees.length === 0) {
    message.warning('请至少选择一个费用');
    return;
  }

  // 检查所有选中的费用是否属于同一个结算对象
  const settlementIds = selectedFees
    .map((fee: any) => fee.orderFee?.settlementId)
    .filter(Boolean); // 过滤掉 null/undefined 的 settlementId

  const uniqueSettlementIds = [...new Set(settlementIds)];

  if (uniqueSettlementIds.length > 1) {
    message.error(
      '不同结算对象的费用不能添加到同一个开票申请中，请确保所有选中的费用属于同一结算对象',
    );
    return;
  }

  const firstFee = selectedFees[0];
  const settlementId = firstFee.orderFee?.settlementId;

  if (!settlementId) {
    message.warning('无法获取结算单位信息');
    return;
  }

  console.log('✅ FeeSelectionDrawer 准备保存数据:');
  console.log('  - 选中费用数量:', selectedFees.length);
  console.log('  - 结算单位ID:', settlementId);
  console.log('  - 币别ID:', selectedCurrencyId.value);
  console.log('  - 汇率:', invoiceExchangeRate.value);
  console.log('  - feeGroupsData 数量:', feeGroupsData.value.length);

  emit('save', {
    selectedFees,
    settlementId,
    currencyId: selectedCurrencyId.value || 1,
    invoiceExchangeRate: invoiceExchangeRate.value,
    feeGroupsData: feeGroupsData.value, // ✅ 传递完整的费用分组数据
  });

  drawerVisible.value = false;
}

/** 加载费用分组数据 */
async function loadFeeGroupData() {
  feeDrawerLoading.value = true;
  try {
    const params: any = {
      pageIndex: 1,
      pageSize: 1000,
    };

    if (selectedSettlementId.value) {
      params.settlementId = selectedSettlementId.value;
    }
    if (selectedCurrencyId.value !== undefined) {
      params.currencyId = selectedCurrencyId.value;
    }

    // 合并委托编号和主提单号到 commissionNum 参数
    if (keyWord.value) {
      params.keyword = keyWord.value;
    }
    // 新增：委托单位
    if (filterClientId.value) {
      params.clientId = filterClientId.value;
    }

    // 新增：开船日期范围
    if (filterEtdStart.value) {
      params.etdStart = filterEtdStart.value;
    }
    if (filterEtdEnd.value) {
      params.etdEnd = filterEtdEnd.value;
    }

    // 新增：收付类型
    params.paySide = filterPaySide.value;

    // ✅ 新增：业务类型
    if (filterBizType.value !== undefined) {
      params.bizType = filterBizType.value;
    }

    if (props.invoiceApplicationId) {
      params.invoiceApplicationId = props.invoiceApplicationId;
    }

    const result = await InvoiceApplicationApi.getOrderFeeGroupAsync(params);

    const treeData = transformToTreeData(result.items || []);
    feeGroupsData.value = treeData;
  } catch (error) {
    console.error('❌ 加载费用数据失败:', error);
    message.error('加载费用数据失败');
  } finally {
    feeDrawerLoading.value = false;
  }
}

/** 获取已添加的费用ID列表 */
function getAddedFeeIds(): Set<string> {
  // ✅ 从 props 中获取已添加的费用ID列表
  return new Set(props.addedFeeIds || []);
}

/** 将费用数据转换为树状结构 */
function transformToTreeData(
  items: InvoiceApplicationApi.InvoiceApplicationFeeGroupOutputDto[],
): any[] {
  const treeData: any[] = [];
  const addedFeeIds = getAddedFeeIds();

  items.forEach((item, index) => {
    const childrenList: any[] = [];

    if (item.orderFees && item.orderFees.length > 0) {
      item.orderFees.forEach((fee, feeIndex) => {
        const isAlreadyAdded = addedFeeIds.has(String(fee.id));

        const childNode: any = {
          id: `child_${fee.id}`,
          parentId: `parent_${item.transportOrder.id}`,
          orderFee: fee,
          appliedAmount: fee.remainingInvoiceAmount,
          checked: false,
          disabled: isAlreadyAdded,
          alreadyAdded: isAlreadyAdded,
          settlementUnit: fee.settlement?.name || '-',
          payReceiveType: fee.paySide === 1 ? '应付' : '应收',
          feeName: fee.feeCode?.cnName || '-',
          amount: fee.amount,
          currencyCode: fee.currency?.code || '-',
          remainingInvoiceAmount: fee.remainingInvoiceAmount,
          // ✅ 关键修复：在子节点中也保存委托编号和主提单号
          commissionNum: item.transportOrder.commissionNum,
          mblNum: item.transportOrder.mblNum || '-',
          bookingNum: item.transportOrder.bookingNum || '-',
          transportOrder: item.transportOrder, // ✅ 保存完整的 transportOrder 对象
        };

        childrenList.push(childNode);
      });
    }

    // ✅ 计算父级是否应该被禁用（所有子级都已添加）
    const allChildrenDisabled =
      childrenList.length > 0 &&
      childrenList.every((child: any) => child.disabled || child.alreadyAdded);

    const parentNode: any = {
      id: `parent_${item.transportOrder.id}`,
      parentId: null,
      transportOrder: item.transportOrder,
      seaExport: item.transportOrder?.seaExport,
      orderFees: item.orderFees,
      commissionNum: item.transportOrder.commissionNum,
      mblNum: item.transportOrder.mblNum || '-',
      bookingNum: item.transportOrder.bookingNum || '-',
      clientName: item.transportOrder.clientName,
      bizType:
        getBizTypeOptions().find(
          (o: any) => o.value === item.transportOrder?.bizType,
        )?.label || '-',
      carrier: item.transportOrder?.seaExport?.carrier?.cnName || '-',
      company: item.transportOrder.orgs?.at(-1)?.name || '-',
      checked: false,
      disabled: allChildrenDisabled, // ✅ 如果所有子级都已添加，则禁用父级复选框
      feeDetails: childrenList, // ✅ 使用 feeDetails 而非 children，避免被 Table 识别为树形结构
    };

    treeData.push(parentNode);
  });

  return treeData;
}

// 监听 props 变化
watch(
  () => props.settlementId,
  (newValue) => {
    if (newValue) {
      selectedSettlementId.value = newValue;
      updateSettlementNameById(newValue);
    }
  },
);

watch(
  () => props.currencyId,
  (newValue) => {
    if (newValue !== undefined) {
      selectedCurrencyId.value = newValue;
    }
  },
);

// ✅ 新增：监听 selectedSettlementId 变化，自动更新名称
watch(
  () => selectedSettlementId.value,
  (newValue) => {
    updateSettlementNameById(newValue || '');
  },
);

/** 计算按币别分组的选中费用合计 */
const selectedFeesByCurrency = computed(() => {
  const selectedFees = getSelectedFeesFromTable();
  const currencyMap: Record<string, { total: number; currencyCode: string }> =
    {};

  selectedFees.forEach((fee: any) => {
    const currencyCode = fee.currencyCode || '未知币别';
    const appliedAmount = fee.appliedAmount || 0;

    if (!currencyMap[currencyCode]) {
      currencyMap[currencyCode] = { total: 0, currencyCode };
    }
    currencyMap[currencyCode].total += appliedAmount;
  });

  return Object.values(currencyMap);
});

// NestedDataTable 外层列定义（订单分组）
const feeOuterColumns = computed(() => [
  {
    title: '',
    key: 'seq',
    width: 50,
  },
  {
    title: '委托编号',
    dataIndex: 'commissionNum',
    key: 'commissionNum',
    width: 140,
    ellipsis: true,
  },
  {
    title: '主提单号',
    dataIndex: 'mblNum',
    key: 'mblNum',
    width: 100,
    ellipsis: true,
  },
  {
    title: '订舱编号',
    dataIndex: 'bookingNum',
    key: 'bookingNum',
    width: 100,
    ellipsis: true,
  },
  {
    title: '委托单位',
    dataIndex: 'clientName',
    key: 'clientName',
    width: 140,
    ellipsis: true,
  },
  {
    title: '业务类型',
    dataIndex: 'bizType',
    key: 'bizType',
    width: 100,
  },
  {
    title: '船公司',
    dataIndex: 'carrier',
    key: 'carrier',
    width: 120,
    ellipsis: true,
  },
  {
    title: '所属公司',
    dataIndex: 'company',
    key: 'company',
    width: 150,
    ellipsis: true,
  },
]);

// NestedDataTable 内层列定义（费用明细）
const feeInnerColumns = computed(() => [
  {
    title: '',
    key: 'seq',
    width: 50,
  },
  {
    title: '结算单位',
    dataIndex: 'settlementUnit',
    key: 'settlementUnit',
    width: 180,
    ellipsis: true,
  },
  {
    title: '收付类型',
    dataIndex: 'payReceiveType',
    key: 'payReceiveType',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '费用名称',
    dataIndex: 'feeName',
    key: 'feeName',
    width: 200,
    ellipsis: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '未开票金额',
    dataIndex: 'remainingInvoiceAmount',
    key: 'remainingInvoiceAmount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '本次申请金额',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    width: 180,
    align: 'right' as const,
  },
]);

// 暴露方法给父组件
defineExpose({
  handleOpenFeeDrawer,
  loadFeeGroupData,
});
</script>

<template>
  <Drawer
    v-model:open="drawerVisible"
    title="选择剩余未开票费用"
    width="1000"
    :footer-style="{ textAlign: 'right' }"
  >
    <Spin :spinning="feeDrawerLoading">
      <!-- 筛选条件 -->
      <div
        style="
          padding: 10px 5px;
          margin-bottom: 16px;
        "
      >
        <div
          style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center"
        >
          <div
            style="display: flex; gap: 8px; align-items: center; width: 290px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >编号:</span
            >
            <Input
              v-model:value="keyWord"
              placeholder="委托编号/主提单号/订舱编号"
              style="flex: 1"
              allow-clear
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 290px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >业务类型:</span
            >
            <Select
              v-model:value="filterBizType"
              style="flex: 1"
              :options="getBizTypeOptions()"
              placeholder="请选择业务类型"
              allow-clear
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 290px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >委托单位:</span
            >
            <ClientSelect
              v-model:model-value="filterClientId"
              :industry-category="'p'"
              placeholder="请选择委托单位"
              style="flex: 1"
              allow-clear
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 290px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >开船日期:</span
            >
            <DatePicker.RangePicker
              v-model:value="filterEtdRange"
              @update:value="handleEtdRangeChange"
              style="flex: 1"
              format="YYYY-MM-DD"
              :placeholder="['开始日期', '结束日期']"
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 290px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >收付类型:</span
            >
            <Select
              v-model:value="filterPaySide"
              style="flex: 1"
              :options="[
                { label: '全部', value: null },
                { label: '应收', value: 0 },
                { label: '应付', value: 1 },
              ]"
              placeholder="请选择收付类型"
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 290px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >结算单位:</span
            >
            <ClientSelect
              :model-value="selectedSettlementId"
              placeholder="请选择结算单位"
              style="flex: 1"
              :disabled="!!settlementId"
              @update:model-value="(v) => (selectedSettlementId = v as string)"
              :selected-items="
                toSelectedItems(
                  selectedSettlementId,
                  selectedSettlementName,
                  'name',
                )
              "
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 290px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >币别:</span
            >
            <CurrencySelect
              :model-value="selectedCurrencyId"
              placeholder="请选择币别"
              style="flex: 1"
              :disabled="!!currencyId && !!settlementId"
              @update:model-value="(v) => (selectedCurrencyId = v as number)"
            />
          </div>
          <div style="display: flex; flex: 1; justify-content: flex-end">
            <Button type="primary" @click="loadFeeGroupData">查询</Button>
          </div>
        </div>
      </div>

      <!-- 费用表格 -->
      <div class="fee-order-table fee-selection-table-wrapper">
        <NestedDataTable
          :columns="feeOuterColumns"
          :data-source="feeGroupsData"
          fill-height
          :inner-columns="feeInnerColumns"
          inner-data-key="feeDetails"
          inner-row-key="id"
          row-key="id"
          v-model:expanded-row-keys="expandedRowKeys"
        >
          <template #outerHeaderCell="{ column }">
            <span v-if="column.key === 'seq'" class="table-sequence-cell">
              <Checkbox
                :checked="isAllParentSelected"
                :indeterminate="isIndeterminate"
                @change="(e) => toggleAllParentSelection(e.target.checked)"
              />
              {{ column.title }}
            </span>
            <template v-else>{{ column.title }}</template>
          </template>

          <template #outerBodyCell="{ column, record, index }">
            <template v-if="column.key === 'seq'">
              <span class="table-sequence-cell">
                <Checkbox
                  :checked="isParentSelected(record.id)"
                  :indeterminate="isParentIndeterminate(record.id)"
                  :disabled="record.disabled"
                  @change="
                    (e) => toggleParentSelection(record, e.target.checked)
                  "
                />
                {{ index + 1 }}
              </span>
            </template>
            <template v-else>
              {{ column.dataIndex ? record[column.dataIndex] : '' }}
            </template>
          </template>

          <template #expandColumnTitle></template>
          <template #expandIcon="{ expanded, record, onExpand }">
            <span
              class="expand-toggle cursor-pointer"
              :class="{ 'expand-toggle--expanded': expanded }"
              @click="
                (e) => {
                  e.stopPropagation();
                  onExpand(record, e);
                }
              "
            >
              &#9654;
            </span>
          </template>

          <template #innerHeaderCell="{ column }">
            <span v-if="column.key === 'seq'" class="table-sequence-cell">
              {{ column.title }}
            </span>
            <template v-else>{{ column.title }}</template>
          </template>

          <template #innerBodyCell="{ column, record, index }">
            <template v-if="column.key === 'seq'">
              <span class="table-sequence-cell">
                <Checkbox
                  :checked="isChildSelected(record.id)"
                  :disabled="record.disabled || record.alreadyAdded"
                  @change="
                    (e) => toggleChildSelection(record, e.target.checked)
                  "
                />
                {{ index + 1 }}
              </span>
            </template>
            <template v-else-if="column.key === 'alreadyAdded'">
              <span
                v-if="record.alreadyAdded"
                style="font-size: 12px; color: #999"
              >
                ✓ 已添加
              </span>
            </template>
            <template v-else-if="column.key === 'appliedAmount'">
              <InputNumber
                v-model:value="record.appliedAmount"
                :min="0"
                :max="record.remainingInvoiceAmount"
                :precision="2"
                size="small"
                class="fee-applied-amount-input w-full"
                :disabled="record.alreadyAdded"
              />
            </template>
            <template v-else>
              {{ column.dataIndex ? record[column.dataIndex] : '' }}
            </template>
          </template>
        </NestedDataTable>
      </div>

      <!-- 勾选合计显示区域 -->
      <div
        v-if="selectedFeesByCurrency.length > 0"
        style="
          padding: 12px;
          margin-top: 16px;
          background: #f5f5f5;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
        "
      >
        <div style="margin-bottom: 8px; font-weight: bold; color: #333">
          勾选合计:
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 16px">
          <div
            v-for="currencyGroup in selectedFeesByCurrency"
            :key="currencyGroup.currencyCode"
            style="display: flex; gap: 4px; align-items: center"
          >
            <span style="font-weight: 600; color: #1890ff"
              >{{ currencyGroup.currencyCode }}:</span
            >
            <span style="font-weight: bold; color: #ff4d4f">{{
              currencyGroup.total.toFixed(2)
            }}</span>
          </div>
        </div>
      </div>
    </Spin>

    <template #footer>
      <div
        style="
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
        "
      >
        <!-- 左侧：币别汇率转换 -->
        <div
          v-if="selectedCurrencyId && selectedCurrencyId !== 1"
          style="display: flex; gap: 8px; align-items: center"
        >
          <span style="font-size: 14px; color: #666"
            >币别汇率转换 ({{ selectedCurrencyCode || '外币' }}兑人民币)</span
          >
          <Form layout="inline" size="small">
            <Form.Item label="发票汇率">
              <InputNumber
                v-model:value="invoiceExchangeRate"
                :min="0"
                :precision="4"
                style="width: 150px"
                placeholder="请输入汇率"
                disabled
              />
            </Form.Item>
          </Form>
        </div>

        <!-- 占位元素，确保按钮始终在右侧 -->
        <div v-else style="flex: 1"></div>

        <!-- 右侧：操作按钮 -->
        <Space>
          <Button @click="drawerVisible = false">取消</Button>
          <Button type="primary" @click="handleSaveFeeSelection">确定</Button>
        </Space>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
/* 列宽拖拽手柄样式 */
.column-resizer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: 5px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s;
}

.column-resizer:hover {
  background-color: #d9d9d9;
}

/* 确保表头可以相对定位 */
.fee-selection-table-wrapper :deep(th) {
  position: relative;
}

/* 仿照 add-fee-modal 的样式 */
.fee-order-table .ellipsis-cell {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fee-order-table :deep(.fee-applied-amount-cell) {
  padding-right: 8px !important;
}

.fee-order-table :deep(.fee-applied-amount-input .ant-input-number-input) {
  padding-right: 28px;
  font-weight: 600;
  color: #1677ff;
  text-align: right;
}

.fee-order-table :deep(.ant-input-number-input) {
  text-align: right;
}

.table-sequence-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.expand-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  min-width: 14px;
  line-height: 1;
  transform-origin: center;
  transition: transform 0.15s ease;
}

.expand-toggle--expanded {
  transform: rotate(90deg);
}

/* ========== 一级表格样式 ========== */
.fee-order-table :deep(.ant-table) {
  border: none;
}

/* 一级表格表头 */
.fee-order-table :deep(.ant-table-thead > tr > th) {
  height: 35px;
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  white-space: nowrap;
  background: #fafafa;
  border-right: 1px solid #e8e8e8;
  border-bottom: 1px solid #e8e8e8;
}

.fee-order-table :deep(.ant-table-thead > tr > th:last-child) {
  border-right: none;
}

/* 一级表格表体单元格 */
.fee-order-table :deep(.ant-table-tbody > tr > td) {
  height: 46px;
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  border-bottom: 1px solid #e8e8e8;
}

.fee-order-table :deep(.ant-table-tbody > tr > td:last-child) {
  border-right: none;
}

.fee-order-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fbff;
}

/* 展开列样式 */
.fee-order-table :deep(.ant-table-expand-icon-th),
.fee-order-table :deep(.ant-table-row-expand-icon-cell) {
  width: 32px;
  min-width: 32px;
  max-width: 32px;
  padding: 0 !important;
  text-align: center;
  border-right: 1px solid #e8e8e8;
}

.fee-order-table :deep(.ant-table-row-expand-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  font-size: 10px;
  color: #4b5563;
  cursor: pointer;
  background: transparent;
  border: 0;
}

/* ========== 二级表格（展开行内部表格）样式 ========== */
.fee-order-table :deep(.ant-table-expanded-row .ant-table) {
  margin: 0;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

/* 二级表格表头 */
.fee-order-table :deep(.ant-table-expanded-row .ant-table-thead > tr > th) {
  height: 32px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  color: #657286;
  background: #f5f5f5;
  border-right: 1px solid #e8e8e8;
  border-bottom: 1px solid #e8e8e8;
}

.fee-order-table
  :deep(.ant-table-expanded-row .ant-table-thead > tr > th:last-child) {
  border-right: none;
}

/* 二级表格表体单元格 */
.fee-order-table :deep(.ant-table-expanded-row .ant-table-tbody > tr > td) {
  height: 32px;
  padding: 0 10px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  border-bottom: 1px solid #e8e8e8;
}

.fee-order-table
  :deep(.ant-table-expanded-row .ant-table-tbody > tr > td:last-child) {
  border-right: none;
}

.fee-order-table
  :deep(.ant-table-expanded-row .ant-table-tbody > tr:last-child > td) {
  border-bottom: none;
}

/* 二级表格悬停效果 */
.fee-order-table
  :deep(.ant-table-expanded-row .ant-table-tbody > tr:hover > td) {
  background: #f8fbff;
}

/* 收付类型标签样式 */
.fee-order-table :deep(.ant-tag) {
  padding: 2px 8px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.fee-order-table :deep(.ant-tag-orange) {
  color: #fa8c16;
  background: #fff7e6;
  border-color: #ffd591;
}

.fee-order-table :deep(.ant-tag-blue) {
  color: #1890ff;
  background: #e6f7ff;
  border-color: #91d5ff;
}
</style>
