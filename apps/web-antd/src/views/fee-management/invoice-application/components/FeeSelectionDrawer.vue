<script lang="ts" setup>
import { createDrawerSelectionQuery } from '#/utils/drawer-selection-query';

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
  Spin,
  Tag,
} from 'ant-design-vue';

import NestedDataTable from '#/components/nested-data-table/nested-data-table.vue';

import { IconifyIcon } from '@vben/icons';
import { ClientSelect, CurrencySelect } from '#/adapter/component';
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import {
  isExchangeRateEffective,
  isRmbLocalCurrencyRate,
} from '#/utils/exchange-rate-cache';
import { normalizeKeysParam } from '#/utils/keys-search';
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();
interface Props {
  visible: boolean;
  settlementId?: string; // 已选择的结算单位（固定）
  currencyId?: number; // 已选择的币别（固定）
  invoiceApplicationId?: string; // 发票申请ID（用于排除已关联的费用）
  addedFeeIds?: string[]; // ✅ 新增：已添加的费用ID列表
  orderFeeIds?: string[]; // ✅ 新增：按费用 id 回捞并自动勾选（从应收应付页跳转开票申请时传入）
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  settlementId: '',
  currencyId: undefined,
  invoiceApplicationId: '',
  addedFeeIds: () => [], // ✅ 默认空数组
  orderFeeIds: () => [], // ✅ 默认空数组
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
/** 筛选区是否展开（默认只显示一行） */
const filterExpanded = ref(false);
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
const filterStatementNum = ref<string>(''); // ✅ 新增：客户对账单号
const filterKeys = ref<string>(''); // ✅ 新增：Keys 精确搜索（主提单号/委托编号），多个值用逗号/空格/分号分隔

// ✅ 新增：用于 RangePicker 的日期范围状态
const filterEtdRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(undefined);

// 费用明细表格数据
const feeGroupsData = ref<any[]>([]);

// 选中的费用行 keys（支持父级和子级）
const selectedFeeRowKeys = ref<string[]>([]);
const selectionQuery = createDrawerSelectionQuery<any>(
  (row) => row.id,
  () => {
    selectedFeeRowKeys.value = [];
    feeGroupsData.value = [];
  },
);

// NestedDataTable 展开的行 keys
const expandedRowKeys = ref<string[]>([]);

// 监听费用数据变化，自动展开所有行
// watch(
//   feeGroupsData,
//   (newData) => {
//     if (newData && newData.length > 0) {
//       expandedRowKeys.value = newData.map((item) => item.id);
//     } else {
//       expandedRowKeys.value = [];
//     }
//   },
//   { immediate: true },
// );

// 发票汇率
const invoiceExchangeRate = ref<number>(1.0);

// ✅ 新增：监听 currencyId 变化，自动加载汇率
watch(
  () => props.currencyId,
  async (newCurrencyId) => {
    if (newCurrencyId && drawerVisible.value) {
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
/** 加载默认汇率（发票只有中国有：本位币恒为人民币 + 在有效期内） */
async function loadDefaultExchangeRate(currencyId: number) {
  try {
    const result = await getExchangeRatePagedList({
      CurrencyId: currencyId,
      LocalCurrencyId: 1,
      PageIndex: 1,
      PageSize: 100,
    });

    const validRates = (result?.items || []).filter(
      (rate) => isRmbLocalCurrencyRate(rate) && isExchangeRateEffective(rate),
    );

    if (validRates.length > 0) {
      // 同币别多条时 sortId 大者优先，其次 id 大者
      validRates.sort((a, b) => {
        const aSortId = Number(a.sortId ?? 0);
        const bSortId = Number(b.sortId ?? 0);
        if (bSortId !== aSortId) return bSortId - aSortId;
        return String(b.id) > String(a.id) ? -1 : 1;
      });

      const defaultRate = validRates[0]?.invoiceValue ?? 1.0;
      invoiceExchangeRate.value = defaultRate;
    } else {
      console.warn(
        '⚠️ 未找到币别',
        currencyId,
        '本位币为人民币且在有效期内的发票汇率，使用默认 1.0',
      );
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
  selectionQuery.reset();
  selectedSettlementId.value = '';
  selectedSettlementName.value = '';
  selectedCurrencyId.value = undefined;
  keyWord.value = '';
  filterMblNum.value = '';
  filterClientId.value = '';
  filterEtdStart.value = '';
  filterEtdEnd.value = '';
  filterEtdRange.value = undefined; // ✅ 重置日期范围
  filterPaySide.value = 0; // ✅ 重置为全部，而不是默认应收
  filterBizType.value = undefined; // ✅ 重置业务类型
  filterStatementNum.value = ''; // ✅ 重置客户对账单号
  filterKeys.value = ''; // ✅ 重置 Keys 精确搜索
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
  selectionQuery.reset();
  feeGroupsData.value = [];
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
  filterExpanded.value = false;
  nextTick(() => {
    loadFeeGroupData();
  });
}

/** 保存费用选择 */
async function handleSaveFeeSelection() {
  if (feeDrawerLoading.value) return;
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
  let request: number | undefined;
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
    // Keys 精确搜索：去空白去重后作为 List<string>（repeat 序列化）
    const normalizedKeys = normalizeKeysParam(filterKeys.value);
    if (normalizedKeys) {
      params.keys = normalizedKeys;
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

    // 新增：收付类型（预填场景按 id 回捞时后端收付都返回，不过滤收付）
    if (
      (!props.orderFeeIds || props.orderFeeIds.length === 0) &&
      filterPaySide.value !== null &&
      filterPaySide.value !== undefined
    ) {
      params.paySide = filterPaySide.value;
    }

    // ✅ 新增：业务类型
    if (filterBizType.value !== undefined) {
      params.bizType = filterBizType.value;
    }

    // ✅ 新增：客户对账单号
    if (filterStatementNum.value) {
      params.statementNum = filterStatementNum.value;
    }

    if (props.invoiceApplicationId) {
      params.invoiceApplicationId = props.invoiceApplicationId;
    }

    // ✅ 按费用 id 回捞（从应收应付页跳转开票申请时预填勾选）
    if (props.orderFeeIds && props.orderFeeIds.length > 0) {
      params.orderFeeIds = props.orderFeeIds;
    }

    request = selectionQuery.begin(params);
    const result = await InvoiceApplicationApi.getOrderFeeGroupAsync(params);
    if (!selectionQuery.isCurrent(request)) return;

    const treeData = transformToTreeData(result.items || []);
    feeGroupsData.value = treeData;

    // ✅ 预填场景：自动勾选回捞到的费用子节点并展开父级
    if (props.orderFeeIds && props.orderFeeIds.length > 0) {
      const flat = flattenTreeData(treeData);
      const matchedKeys = flat
        .filter(
          (node: any) =>
            node.orderFee &&
            props.orderFeeIds!.includes(String(node.orderFee.id)),
        )
        .map((node: any) => node.id);
      selectedFeeRowKeys.value = matchedKeys;
      expandedRowKeys.value = treeData.map((node: any) => node.id);
      await updateCurrencyFromSelectedFees();
    }
  } catch (error) {
    console.error('❌ 加载费用数据失败:', error);
    message.error('加载费用数据失败');
  } finally {
    if (request === undefined || selectionQuery.isCurrent(request))
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
          // ✅ 对账单号：将statements数组中的statementNum拼接显示
          statementNums:
            fee.statements && fee.statements.length > 0
              ? fee.statements.map((s: any) => s.statementNum).join(' ')
              : '-',
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
      clientName: item.transportOrder.client?.name,
      bizType:
        getBizTypeOptions().find(
          (o: any) => o.value === item.transportOrder?.bizType,
        )?.label || '-',
      carrier: item.transportOrder?.seaExport?.carrier?.code || '-',
      company: item.transportOrder.orgs?.at(0)?.name || '-',
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
    width: 130,
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
    width: 120,
    ellipsis: true,
  },
  {
    title: '对账单号',
    dataIndex: 'statementNums',
    key: 'statementNums',
    width: 150,
    ellipsis: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
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
    width: 100,
    align: 'right' as const,
  },
  {
    title: '本次申请金额',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    width: 140,
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
    width="1050"
    class="fee-selection-drawer"
    :body-style="{ padding: '16px', background: '#f8fafc' }"
    :footer-style="{
      padding: '12px 16px',
      borderTop: '1px solid #f1f5f9',
      background: '#fff',
    }"
  >
    <Spin :spinning="feeDrawerLoading">
      <div class="fsd">
        <section class="fsd-section">
          <div class="fsd-filters__head">
            <span class="fsd-indicator" />
            <span class="fsd-filters__title">筛选条件</span>
            <span class="fsd-filters__hint">设置条件后点击查询</span>
          </div>
          <div
            class="fsd-filters__body"
            :class="{ 'fsd-filters__body--collapsed': !filterExpanded }"
          >
            <div class="fsd-field">
              <span class="fsd-field__label">编号</span>
              <Input
                v-model:value="keyWord"
                placeholder="委托编号 / 主提单号 / 订舱编号"
                class="fsd-field__control"
                allow-clear
              />
            </div>
            <div class="fsd-field">
              <span class="fsd-field__label">精确搜索</span>
              <Input
                v-model:value="filterKeys"
                class="fsd-field__control"
                placeholder="主提单号/委托编号，多值分隔"
                allow-clear
              />
            </div>
            <div class="fsd-field">
              <span class="fsd-field__label">结算单位</span>
              <ClientSelect
                :model-value="selectedSettlementId"
                placeholder="请选择结算单位"
                class="fsd-field__control"
                :disabled="!!settlementId"
                :selected-items="
                  toSelectedItems(
                    selectedSettlementId,
                    selectedSettlementName,
                    'name',
                  )
                "
                @update:model-value="
                  (v) => (selectedSettlementId = v as string)
                "
              />
            </div>
            <div class="fsd-filters__actions">
              <Button
                type="link"
                size="small"
                class="fsd-filters__toggle"
                @click="filterExpanded = !filterExpanded"
              >
                {{ filterExpanded ? '收起' : '展开' }}
                <IconifyIcon
                  icon="ant-design:down-outlined"
                  class="fsd-filters__toggle-icon"
                  :class="{
                    'fsd-filters__toggle-icon--expanded': filterExpanded,
                  }"
                />
              </Button>
              <Button type="primary" @click="loadFeeGroupData">查询</Button>
            </div>

            <div class="fsd-field fsd-field--more">
              <span class="fsd-field__label">对账单号</span>
              <Input
                v-model:value="filterStatementNum"
                placeholder="请输入客户对账单号"
                class="fsd-field__control"
                allow-clear
              />
            </div>
            <div class="fsd-field fsd-field--more">
              <span class="fsd-field__label">业务类型</span>
              <Select
                v-model:value="filterBizType"
                class="fsd-field__control"
                :options="getBizTypeOptions()"
                placeholder="请选择业务类型"
                allow-clear
              />
            </div>
            <div class="fsd-field fsd-field--more">
              <span class="fsd-field__label">委托单位</span>
              <ClientSelect
                v-model:model-value="filterClientId"
                :industry-category="'p'"
                placeholder="请选择委托单位"
                class="fsd-field__control"
                allow-clear
              />
            </div>
            <div class="fsd-field fsd-field--more">
              <span class="fsd-field__label">开船日期</span>
              <DatePicker.RangePicker
                v-model:value="filterEtdRange"
                class="fsd-field__control"
                format="YYYY-MM-DD"
                :placeholder="['开始日期', '结束日期']"
                @update:value="handleEtdRangeChange"
              />
            </div>
            <div class="fsd-field fsd-field--more">
              <span class="fsd-field__label">收付类型</span>
              <Select
                v-model:value="filterPaySide"
                class="fsd-field__control"
                :options="[
                  { label: '全部', value: null },
                  { label: '应收', value: 0 },
                  { label: '应付', value: 1 },
                ]"
                placeholder="请选择收付类型"
              />
            </div>
            <div class="fsd-field fsd-field--more">
              <span class="fsd-field__label">币别</span>
              <CurrencySelect
                :model-value="selectedCurrencyId"
                placeholder="请选择币别"
                class="fsd-field__control"
                :disabled="!!currencyId && !!settlementId"
                @update:model-value="(v) => (selectedCurrencyId = v as number)"
              />
            </div>
          </div>
        </section>

        <section class="fsd-section">
          <div class="fsd-table-panel__head">
            <div class="fsd-table-panel__title-wrap">
              <span class="fsd-indicator" />
              <span class="fsd-table-panel__title">费用列表</span>
              <span class="fsd-count">{{ feeGroupsData.length }}</span>
            </div>
          </div>
          <div
            class="fsd-table-wrap fee-order-table fee-selection-table-wrapper"
          >
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
                  <span v-if="record.alreadyAdded" class="fsd-added">
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
                <template v-else-if="column.key === 'payReceiveType'">
                  <Tag
                    v-if="record.payReceiveType === '应收'"
                    color="blue"
                    style="margin: 0"
                  >
                    应收
                  </Tag>
                  <Tag
                    v-else-if="record.payReceiveType === '应付'"
                    color="orange"
                    style="margin: 0"
                  >
                    应付
                  </Tag>
                </template>
                <template v-else>
                  {{ column.dataIndex ? record[column.dataIndex] : '' }}
                </template>
              </template>
            </NestedDataTable>
          </div>
        </section>

        <div v-if="selectedFeesByCurrency.length > 0" class="fsd-summary">
          <span class="fsd-summary__label">勾选合计</span>
          <div
            v-for="currencyGroup in selectedFeesByCurrency"
            :key="currencyGroup.currencyCode"
            class="fsd-summary__pair"
          >
            <span class="fsd-summary__code"
              >{{ currencyGroup.currencyCode }}:</span
            >
            <span class="fsd-summary__value">{{
              currencyGroup.total.toFixed(2)
            }}</span>
          </div>
        </div>
      </div>
    </Spin>

    <template #footer>
      <div class="fsd-footer">
        <div
          v-if="selectedCurrencyId && selectedCurrencyId !== 1"
          class="fsd-footer__rate"
        >
          <span class="fsd-footer__rate-label">
            币别汇率转换 ({{ selectedCurrencyCode || '外币' }}兑人民币)
          </span>
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
        <div v-else />
        <div class="fsd-footer__actions">
          <Button @click="drawerVisible = false">取消</Button>
          <Button
            type="primary"
            :disabled="feeDrawerLoading"
            @click="handleSaveFeeSelection"
            >确定</Button
          >
        </div>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
@import '#/views/_shared/invoice-fee-selection/fee-selection-drawer.scss';
</style>
