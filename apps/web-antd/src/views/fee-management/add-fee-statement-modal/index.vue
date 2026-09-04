<script lang="ts" setup>
import type { StatementAdminApi } from '#/api/settlement-management/statement-admin';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import { computed, nextTick, reactive, ref } from 'vue';
import { getFeeStatusOptions } from '#/views/air-export-admin/orderFee/data';
import { useThrottleFn } from '@vueuse/core';
import dayjs from 'dayjs';
import {
  Button,
  Checkbox,
  Drawer,
  message,
  Pagination,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { NestedDataTable } from '#/components/nested-data-table';

import { getOrderFeeGroup } from '#/api/settlement-management/statement-admin';
import { normalizeKeysParam } from '#/utils/keys-search';
import { formatAmount } from '#/views/settlement-management/receive-settlement/form-data';

import {
  type AddFeeDrawerProps,
  buildDynamicCurrencyColumns,
  buildOrderRow,
  collectCurrencies,
  type CurrencyInfo,
  getPaySideLabel,
  type SelectedFeeItem,
  useAddFeeSearchSchema,
  useOrderFixedColumns,
} from './data';

const emit = defineEmits<{
  confirm: [fees: SelectedFeeItem[]];
  'update:settlementCurrencyId': [value: null | number];
  'update:settlementId': [value: string];
}>();

const open = ref(false);
const loading = ref(false);
const drawerProps = ref<AddFeeDrawerProps>({});

const orderList = ref<SeaExportAdminApi.TransportOrderDto[]>([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const currencies = ref<CurrencyInfo[]>([]);
const tableRows = ref<Record<string, any>[]>([]);

/** 选中状态：orderId -> Set<feeId> */
const selectionMap = reactive(new Map<string, Set<string>>());
/** 费用输入金额：feeId -> appliedAmount */
const appliedAmountMap = reactive(new Map<string, number>());

const expandedRowKeys = ref<string[]>([]);

// 勾选合计：按币别和收付类型汇总选中费用金额
const selectedFeeSummary = computed(() => {
  const summary = new Map<
    string,
    {
      currencyName: string;
      receiveAmount: number;
      payAmount: number;
      receiveCount: number;
      payCount: number;
    }
  >();
  const disabled = disabledFeeIds.value;

  for (const [orderId, feeIds] of selectionMap.entries()) {
    const fees = getOrderFees(orderId);

    for (const fee of fees) {
      if (feeIds.has(fee.id) && !disabled.has(fee.id)) {
        const currencyId = fee.currencyId ?? 0;
        const currencyName =
          fee.currency?.cnName ?? fee.currency?.code ?? '未知币别';
        // 真实可用额度：unRqstPaymentAmount = amount - settlementOccupiedAmount（已扣被开票/付费申请及收费结算占住的部分）
        const availableAmount = fee.unRqstPaymentAmount ?? 0;
        const key = String(currencyId);

        if (summary.has(key)) {
          const item = summary.get(key)!;
          if (fee.paySide === 0) {
            // 应收
            item.receiveAmount += availableAmount;
            item.receiveCount += 1;
          } else {
            // 应付
            item.payAmount += availableAmount;
            item.payCount += 1;
          }
        } else {
          const newItem = {
            currencyName,
            receiveAmount: 0,
            payAmount: 0,
            receiveCount: 0,
            payCount: 0,
          };
          if (fee.paySide === 0) {
            newItem.receiveAmount = availableAmount;
            newItem.receiveCount = 1;
          } else {
            newItem.payAmount = availableAmount;
            newItem.payCount = 1;
          }
          summary.set(key, newItem);
        }
      }
    }
  }

  return Array.from(summary.values());
});

const selectedFeeCount = computed(() => {
  let count = 0;
  const disabled = disabledFeeIds.value;

  for (const [, feeIds] of selectionMap.entries()) {
    for (const feeId of feeIds) {
      if (!disabled.has(feeId)) {
        count++;
      }
    }
  }

  return count;
});

// 全选和半选状态计算
const isAllSelected = computed(() => {
  if (tableRows.value.length === 0) return false;
  return tableRows.value.every((row) => isOrderChecked(row.id));
});

const isIndeterminate = computed(() => {
  const checkedCount = tableRows.value.filter((row) =>
    isOrderChecked(row.id),
  ).length;
  return checkedCount > 0 && checkedCount < tableRows.value.length;
});

function toggleAllOrders(checked: boolean) {
  if (checked) {
    // 全选：只勾选可选费用（同一结算对象且有结算对象）
    for (const row of tableRows.value) {
      const selectable = getSelectableFees(row.id);
      if (selectable.length === 0) continue;
      const set = new Set<string>(selectionMap.get(row.id));
      for (const fee of selectable) {
        set.add(fee.id);
        if (!appliedAmountMap.has(fee.id)) {
          appliedAmountMap.set(fee.id, fee.unRqstPaymentAmount ?? 0);
        }
      }
      selectionMap.set(row.id, set);
    }
  } else {
    // 取消全选
    selectionMap.clear();
  }
}

/** 是否至少存在一个有效查询条件（该接口不分页，无任何条件时会全量拉取，必须拦截） */
function hasAnySearchCondition(
  values: Record<string, any> | undefined,
): values is Record<string, any> {
  if (!values) return false;
  const hasArray = (v: unknown) => Array.isArray(v) && v.length > 0;
  return Boolean(
    values.SettlementId ||
    values.Keyword ||
    // Keys 现在是输入框字符串（也兼容历史数组值），统一归一化后判断是否有值
    normalizeKeysParam(values.Keys) ||
    values.OrgId ||
    values.CurrencyId ||
    values.PaySide !== undefined ||
    values.BizType !== undefined ||
    values.FeeStatus !== undefined ||
    values.SettlementStatus !== undefined ||
    values.includeStatemented !== undefined ||
    hasArray(values.FeeCodeIds) ||
    hasArray(values.OperatorIds) ||
    hasArray(values.SaleIds) ||
    hasArray(values.CustomerServiceIds) ||
    (Array.isArray(values.ETDRange) && values.ETDRange.length > 0),
  );
}

const throttledAutoSearch = useThrottleFn(
  async (values: Record<string, any>) => {
    // 结算对象非必填后，无任何条件时不自动查询，避免全租户费用全量拉取
    if (!hasAnySearchCondition(values)) return;
    const feeCodeMode = values.feeCodeMode ?? 'include';
    const feeCodeIds = values.FeeCodeIds;
    const hasFeeCodes = Array.isArray(feeCodeIds) && feeCodeIds.length > 0;
    if (feeCodeMode === 'exclude' && !hasFeeCodes) return;
    currentPage.value = 1;
    await checkSearchChanged();
    await fetchData(values);
  },
  800,
);

const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  layout: 'horizontal',
  schema: useAddFeeSearchSchema(),
  showDefaultActions: false,
  submitOnChange: false,
  compact: true,
  wrapperClass: 'grid-cols-4',
  handleValuesChange: (values) => {
    throttledAutoSearch(values);
  },
});

const fixedColumns = useOrderFixedColumns();

const dynamicColumns = computed(() =>
  buildDynamicCurrencyColumns(currencies.value),
);

const allColumns = computed(() => [...fixedColumns, ...dynamicColumns.value]);

// 费用明细内层列定义
const feeInnerColumnsForAddFee = [
  { title: '', dataIndex: 'checkbox', key: 'checkbox', width: 40 },
  {
    title: '结算单位',
    dataIndex: 'settlementName',
    key: 'settlementName',
    width: 140,
  },
  {
    title: '收付类型',
    dataIndex: 'paySide',
    key: 'paySide',
    width: 80,
  },
  {
    title: '费用名称',
    dataIndex: 'feeCodeName',
    key: 'feeCodeName',
    width: 120,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    width: 80,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right' as const,
  },
  {
    // 已申请 = rqstPaymentAmount（仅付费申请已申请），不含开票申请/收费结算
    title: '已申请',
    dataIndex: 'rqstPaymentAmount',
    key: 'rqstPaymentAmount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '可用额度',
    dataIndex: 'unRqstPaymentAmount',
    key: 'unRqstPaymentAmount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '汇率',
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    width: 50,
  },
  {
    title: '开票状态',
    dataIndex: 'invoiceStatus',
    key: 'invoiceStatus',
    width: 100,
    customRender: ({ record }: any) => {
      const statusMap: Record<number, string> = {
        0: '未开票',
        1: '部分开票',
        2: '已开票',
      };
      return statusMap[record.invoiceStatus] ?? '-';
    },
  },
  {
    title: '费用状态',
    dataIndex: 'combinedFeeStatus',
    key: 'combinedFeeStatus',
    width: 120,
    customRender: ({ record }: any) => {
      const statusMap: Record<number, string> = {
        0: '录入中',
        1: '待审核',
        2: '已驳回',
        3: '审核通过',
        4: '部分结算',
        5: '已结算',
        6: '已开票',
        7: '已付款',
      };
      return statusMap[record.combinedFeeStatus] ?? '-';
    },
  },
  {
    title: '对账信息',
    dataIndex: 'isStatemented',
    key: 'isStatemented',
    width: 150,
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    width: 120,
  },
];

const disabledFeeIds = computed(
  () => new Set(drawerProps.value.selectedFeeIds ?? []),
);

// --- 单一结算对象限制：一张对账单只能对一个结算对象 ---

/** 当前锁定的结算对象：优先取已勾费用的结算对象；已有费用的对账单加费用时锁定为对账单客户 */
const lockedSettlementId = computed<string | undefined>(() => {
  const disabled = disabledFeeIds.value;
  for (const [orderId, feeIds] of selectionMap.entries()) {
    for (const fee of getOrderFees(orderId)) {
      if (feeIds.has(fee.id) && !disabled.has(fee.id) && fee.settlementId) {
        return fee.settlementId;
      }
    }
  }
  if ((drawerProps.value.selectedFeeIds?.length ?? 0) > 0) {
    return drawerProps.value.settlementId || undefined;
  }
  return undefined;
});

/** 费用是否可勾选：已含费用、未设置结算对象、结算对象与锁定值不一致的费用均不可勾选 */
function isFeeSelectable(fee: OrderFeeAdminApi.OrderFeeDto): boolean {
  if (disabledFeeIds.value.has(fee.id)) return false;
  if (!fee.settlementId) return false;
  const locked = lockedSettlementId.value;
  return !locked || fee.settlementId === locked;
}

/** 不可勾选原因（悬停提示）；可勾选或已含费用时返回 undefined */
function getFeeDisabledReason(
  fee: OrderFeeAdminApi.OrderFeeDto,
): string | undefined {
  if (disabledFeeIds.value.has(fee.id)) return undefined;
  if (!fee.settlementId) return '该费用未设置结算对象，不可对账';
  if (
    lockedSettlementId.value &&
    fee.settlementId !== lockedSettlementId.value
  ) {
    return '与已选费用的结算对象不一致，不可勾选';
  }
  return undefined;
}

function getSelectableFees(orderId: string): OrderFeeAdminApi.OrderFeeDto[] {
  return getOrderFees(orderId).filter((fee) => isFeeSelectable(fee));
}

async function openDrawer(props: AddFeeDrawerProps = {}) {
  drawerProps.value = props;
  open.value = true;
  resetState();
  await nextTick();
  await searchFormApi.resetForm();
  await nextTick();

  const hasFees = (props.selectedFeeIds?.length ?? 0) > 0;
  // 先回显结算对象选项，再写表单值，避免首次 getValues 丢 SettlementId
  searchFormApi.updateSchema([
    {
      fieldName: 'SettlementId',
      componentProps: {
        disabled: hasFees,
        selectedItems:
          props.settlementId && props.settlementName
            ? [
                {
                  fullName: props.settlementName,
                  id: props.settlementId,
                  name: props.settlementName,
                },
              ]
            : [],
      },
    },
  ]);
  await nextTick();
  if (props.settlementId) {
    searchFormApi.setValues({ SettlementId: props.settlementId });
  }
}

function resetState() {
  orderList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  currencies.value = [];
  tableRows.value = [];
  selectionMap.clear();
  appliedAmountMap.clear();
  expandedRowKeys.value = [];
}

function clearSelection() {
  selectionMap.clear();
  appliedAmountMap.clear();
}

async function handleSearch() {
  const values = await searchFormApi.getValues();
  // 结算对象已非必填：允许不选委托单位按其它条件检索，但至少需要一个查询条件
  if (!hasAnySearchCondition(values)) {
    message.warning('请至少输入一个查询条件后再查询');
    return;
  }
  currentPage.value = 1;
  await checkSearchChanged();
  await fetchData(values);
}

async function fetchData(formValues?: Record<string, any>) {
  const values = formValues ?? (await searchFormApi.getValues());
  if (!hasAnySearchCondition(values)) return;

  const [etdStart, etdEnd] = Array.isArray(values.ETDRange)
    ? values.ETDRange
    : [undefined, undefined];

  const feeCodeMode = values.feeCodeMode ?? 'include';
  const feeCodeIds = values.FeeCodeIds;
  const hasFeeCodes = Array.isArray(feeCodeIds) && feeCodeIds.length > 0;

  // 处理操作、销售和客服的多选ID，直接传递数组
  const operatorIds =
    Array.isArray(values.OperatorIds) && values.OperatorIds.length > 0
      ? values.OperatorIds
      : undefined;
  const saleIds =
    Array.isArray(values.SaleIds) && values.SaleIds.length > 0
      ? values.SaleIds
      : undefined;
  const customerServiceIds =
    Array.isArray(values.CustomerServiceIds) &&
    values.CustomerServiceIds.length > 0
      ? values.CustomerServiceIds
      : undefined;

  const params: StatementAdminApi.OrderFeeGroupQueryParams = {
    // 结算对象非必填：不传则不按结算对象过滤；传了才享受对账人免数据权限
    SettlementId: values.SettlementId || undefined,
    PaySide: values.PaySide !== undefined ? values.PaySide : undefined,
    OrgId: values.OrgId,
    Keyword: values.Keyword,
    // Keys 精确搜索：去空白去重后作为 List<string>（repeat 序列化）
    Keys: normalizeKeysParam(values.Keys),
    ETDStart: etdStart ? dayjs(etdStart).toISOString() : undefined,
    ETDEnd: etdEnd ? dayjs(etdEnd).toISOString() : undefined,
    CurrencyId: values.CurrencyId,
    FeeCodeIds:
      feeCodeMode === 'include' && hasFeeCodes ? feeCodeIds : undefined,
    ExceptFeeCodeIds:
      feeCodeMode === 'exclude' && hasFeeCodes ? feeCodeIds : undefined,
    FeeStatus:
      values.FeeStatus !== null && values.FeeStatus !== undefined
        ? values.FeeStatus
        : undefined,
    BizType: values.BizType,
    OperatorIds: operatorIds,
    SaleIds: saleIds,
    CustomerServiceIds: customerServiceIds,
    SettlementStatus:
      values.SettlementStatus !== null && values.SettlementStatus !== undefined
        ? values.SettlementStatus
        : undefined,
    includeStatemented:
      values.includeStatemented !== undefined &&
      values.includeStatemented !== null
        ? values.includeStatemented
        : undefined,
    PageIndex: currentPage.value,
    PageSize: pageSize.value,
  };

  loading.value = true;
  try {
    const result = await getOrderFeeGroup(params);
    orderList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;

    currencies.value = collectCurrencies(orderList.value);
    tableRows.value = orderList.value.map((order) =>
      buildOrderRow(order, currencies.value),
    );
    console.log('Fetched order fee group data:', tableRows.value);
    expandedRowKeys.value = [];
  } finally {
    loading.value = false;
  }
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

// --- Checkbox 联动逻辑 ---

function getOrderFees(orderId: string): OrderFeeAdminApi.OrderFeeDto[] {
  const order = orderList.value.find((o) => o.id === orderId);
  return order?.orderFees ?? [];
}

function isOrderChecked(orderId: string): boolean {
  const selectable = getSelectableFees(orderId);
  if (selectable.length === 0) return false;
  const selected = selectionMap.get(orderId);
  if (!selected) return false;
  return selectable.every((f) => selected.has(f.id));
}

function isOrderIndeterminate(orderId: string): boolean {
  const selectable = getSelectableFees(orderId);
  const selected = selectionMap.get(orderId);
  if (!selected || selected.size === 0) return false;
  const checkedCount = selectable.filter((f) => selected.has(f.id)).length;
  return checkedCount > 0 && checkedCount < selectable.length;
}

function toggleOrder(orderId: string, checked: boolean) {
  if (checked) {
    // 仅勾选可选费用（同一结算对象且有结算对象）
    const set = new Set<string>(selectionMap.get(orderId));
    for (const fee of getSelectableFees(orderId)) {
      set.add(fee.id);
      if (!appliedAmountMap.has(fee.id)) {
        appliedAmountMap.set(fee.id, fee.unRqstPaymentAmount ?? 0);
      }
    }
    selectionMap.set(orderId, set);
  } else {
    const disabledIds = disabledFeeIds.value;
    const existing = selectionMap.get(orderId);
    if (existing) {
      const kept = new Set<string>();
      for (const feeId of existing) {
        if (disabledIds.has(feeId)) kept.add(feeId);
      }
      if (kept.size > 0) {
        selectionMap.set(orderId, kept);
      } else {
        selectionMap.delete(orderId);
      }
    }
  }
}

function isFeeChecked(orderId: string, feeId: string): boolean {
  return selectionMap.get(orderId)?.has(feeId) ?? false;
}

function toggleFee(orderId: string, feeId: string, checked: boolean) {
  if (!selectionMap.has(orderId)) {
    selectionMap.set(orderId, new Set());
  }
  const set = selectionMap.get(orderId)!;
  if (checked) {
    set.add(feeId);
    const fee = getOrderFees(orderId).find((f) => f.id === feeId);
    if (fee && !appliedAmountMap.has(feeId)) {
      appliedAmountMap.set(feeId, fee.unRqstPaymentAmount ?? 0);
    }
  } else {
    set.delete(feeId);
    if (set.size === 0) {
      selectionMap.delete(orderId);
    }
  }
}

// --- 搜索条件变化清空选择 ---
let lastSearchSnapshot = '';

async function checkSearchChanged() {
  const values = await searchFormApi.getValues();
  const snapshot = JSON.stringify({
    SettlementId: values?.SettlementId,
    OrgId: values?.OrgId,
    Keyword: values?.Keyword,
    Keys: values?.Keys,
    CurrencyId: values?.CurrencyId,
  });
  if (lastSearchSnapshot && snapshot !== lastSearchSnapshot) {
    clearSelection();
  }
  lastSearchSnapshot = snapshot;
}

// --- 汇总选中费用 ---

function getSelectedFees(): SelectedFeeItem[] {
  const result: SelectedFeeItem[] = [];
  const disabled = disabledFeeIds.value;
  const seen = new Set<string>();
  const hasUserAttribute = (
    userAttribute: number | undefined,
    target: PaymentApplicationAdminApi.UserAttribute,
  ) => typeof userAttribute === 'number' && (userAttribute & target) === target;
  const getOrderUserNamesByAttribute = (
    orderUsers: SeaExportAdminApi.OrderUserDto[] | undefined,
    target: PaymentApplicationAdminApi.UserAttribute,
  ) =>
    (orderUsers ?? [])
      .filter((user) => hasUserAttribute(user.userAttribute, target))
      .map((user) => user.userNickName)
      .filter((name): name is string => Boolean(name))
      .join('、');
  for (const [orderId, feeIds] of selectionMap.entries()) {
    const order = orderList.value.find((o) => o.id === orderId);
    const saleUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Sale,
    );
    const operationUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Operation,
    );
    const customerServiceUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.CustomerService,
    );
    const fees = getOrderFees(orderId);
    for (const fee of fees) {
      if (feeIds.has(fee.id) && !disabled.has(fee.id) && !seen.has(fee.id)) {
        seen.add(fee.id);
        result.push({
          feeId: fee.id,
          transportOrderId: fee.transportOrderId ?? '',
          commissionNum: order?.commissionNum,
          mblNum: order?.mblNum,
          clientName: order?.client?.name,
          accountDate: order?.accountDate,
          etd: order?.etd,
          saleUserNames,
          operationUserNames,
          customerServiceUserNames,
          paySide: fee.paySide ?? 0,
          feeCodeId: fee.feeCodeId ?? 0,
          feeCodeName: fee.feeCode?.cnName ?? undefined,
          currencyId: fee.currencyId ?? 0,
          currencyName: fee.currency?.cnName ?? fee.currency?.code ?? undefined,
          settlementId: fee.settlementId ?? '',
          settlementName: fee.settlement?.name ?? undefined,
          amount: fee.amount ?? 0,
          settledAmount: fee.settledAmount ?? 0,
          // 未结算：优先接口值，缺失时回退 amount - settledAmount
          unSettledAmount:
            fee.unSettledAmount ?? (fee.amount ?? 0) - (fee.settledAmount ?? 0),
          // 已申请金额（仅付费申请已申请）
          rqstPaymentAmount: fee.rqstPaymentAmount ?? 0,
          orderInvoiceAmount: fee.orderInvoiceAmount ?? 0,
          settlementOccupiedAmount: fee.settlementOccupiedAmount ?? 0,
        });
      }
    }
  }
  return result;
}

function handleConfirm() {
  const selected = getSelectedFees();
  if (selected.length === 0) {
    message.warning('请至少选择一条费用');
    return;
  }
  // 后端提交时会拦截以下情况，前端提前校验，避免提交才报错
  if (selected.some((fee) => !fee.settlementId)) {
    message.warning('存在未设置结算对象的费用 不可对账');
    return;
  }
  const settlementIds = new Set(selected.map((fee) => fee.settlementId));
  if (settlementIds.size > 1) {
    message.warning('所选费用的结算对象不一致 不可对账');
    return;
  }
  emitResult(selected);
}

async function emitResult(fees: SelectedFeeItem[]) {
  const values = await searchFormApi.getValues();
  // 结算对象：优先取搜索条件所选；未选时回退勾选费用锁定的结算对象（作为对账单客户）
  const settlementId = values.SettlementId || lockedSettlementId.value;
  if (settlementId) {
    emit('update:settlementId', String(settlementId));
  }
  emit('confirm', fees);
  open.value = false;
}

function handleCancel() {
  open.value = false;
}

// function formatAmount(val: number | undefined | null): string {
//   if (val == null) return '';
//   return Number(val).toFixed(2);
// }

function formatMonth(val: string | undefined | null): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM') : '';
}

function getBizTypeLabel(bizType: number | undefined): string {
  const bizTypeMap: Record<number, string> = {
    0: '海运出口',
    1: '海运进口',
    2: '空运出口',
    3: '空运进口',
    4: '陆运',
    5: '仓储',
  };
  return bizTypeMap[bizType ?? -1] || '-';
}

function getRecSettlementStatusLabel(
  recSettlementStatus: number | undefined,
): string {
  const statusMap: Record<number, string> = {
    0: '未结算',
    1: '部分结算',
    2: '结算完毕',
  };
  return statusMap[recSettlementStatus ?? -1] ?? '-';
}

function getRecSettlementStatusColor(
  recSettlementStatus: number | undefined,
): string {
  const colorMap: Record<number, string> = {
    0: 'default', // 录入中 - 灰色
    1: 'purple', // 部分结算 - 紫色
    2: 'green', // 已结算 - 绿色
  };
  return colorMap[recSettlementStatus ?? -1] ?? 'default';
}

function getInvoiceStatusLabel(invoiceStatus: number | undefined): string {
  const statusMap: Record<number, string> = {
    0: '未开票',
    1: '部分开票',
    2: '已开票',
  };
  return statusMap[invoiceStatus ?? -1] ?? '-';
}

function getInvoiceStatusColor(invoiceStatus: number | undefined): string {
  const colorMap: Record<number, string> = {
    0: 'default', // 未开票 - 灰色
    1: 'orange', // 部分开票 - 橙色
    2: 'green', // 已开票 - 绿色
  };
  return colorMap[invoiceStatus ?? -1] ?? 'default';
}

function onFeeCheckChange(transportOrderId: string, feeId: string, e: any) {
  toggleFee(transportOrderId, feeId, e.target.checked);
}

function onOrderCheckChange(orderId: string, e: any) {
  toggleOrder(orderId, e.target.checked);
}

function onExpandClick(record: any, e: Event, onExpand: Function) {
  e.stopPropagation();
  onExpand(record, e);
}

function onPageChange(page: number, size: number) {
  handlePageChange(page, size);
}

defineExpose({ open: openDrawer });
</script>

<template>
  <Drawer
    :open="open"
    title="添加费用"
    :width="1600"
    :destroy-on-close="true"
    placement="right"
    @close="handleCancel"
    class="add-fee-drawer"
  >
    <!-- 搜索区域 -->
    <div class="mb-4">
      <SearchForm />
      <div class="mt-2 flex items-center justify-between">
        <div class="text-xs text-gray-400">
          提示：不选委托单位可跨结算对象浏览，但仅按普通数据权限展示；选择委托单位后对账人可免数据权限查看该客户全部费用。
        </div>
        <Button type="primary" :loading="loading" @click="handleSearch">
          查询
        </Button>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="mb-2 flex items-center gap-3">
      <div class="text-base font-semibold">费用明细</div>
    </div>

    <!-- 主表格（业务列表） -->
    <div class="fee-order-table-container">
      <NestedDataTable
        :columns="allColumns"
        :data-source="tableRows"
        :loading="loading"
        fill-height
        :inner-columns="feeInnerColumnsForAddFee"
        inner-data-key="_fees"
        inner-row-key="id"
        row-key="id"
        v-model:expanded-row-keys="expandedRowKeys"
      >
        <template #outerHeaderCell="{ column }">
          <span v-if="column.type === 'seq'" class="table-sequence-cell">
            <Checkbox
              :checked="isAllSelected"
              :indeterminate="isIndeterminate"
              @change="(e) => toggleAllOrders(e.target.checked)"
            />
            {{ column.title }}
          </span>
          <template v-else>{{ column.title }}</template>
        </template>

        <template #outerBodyCell="{ column, record, index }">
          <template v-if="column.type === 'seq'">
            <span class="table-sequence-cell">
              <Checkbox
                :checked="isOrderChecked(record.id)"
                :indeterminate="isOrderIndeterminate(record.id)"
                @change="(e) => onOrderCheckChange(record.id, e)"
              />
              {{ index + 1 + (currentPage - 1) * pageSize }}
            </span>
          </template>
          <template
            v-else-if="column.field && column.field.startsWith('currency_')"
          >
            {{ formatAmount(record[column.field]) }}
          </template>
          <template v-else-if="column.field === 'client.name'">
            {{ record.client?.name || '-' }}
          </template>
          <template v-else-if="column.field === 'accountDate'">
            {{ formatMonth(record.accountDate) }}
          </template>
          <template v-else-if="column.field === 'bizType'">
            {{ getBizTypeLabel(record.bizType) }}
          </template>
          <template v-else-if="column.field === 'polName'">
            {{ record.seaExport?.polRemark || record.seaImport?.polRemark }}
          </template>
          <template v-else-if="column.field === 'podName'">
            {{ record.seaExport?.podRemark || record.seaImport?.podRemark }}
          </template>
          <template v-else-if="column.field === 'recSettlementStatus'">
            <Tag
              :color="getRecSettlementStatusColor(record.recSettlementStatus)"
            >
              {{ getRecSettlementStatusLabel(record.recSettlementStatus) }}
            </Tag>
          </template>
          <template v-else>
            {{ column.field ? record[column.field] : '' }}
          </template>
        </template>

        <template #expandColumnTitle></template>
        <template #expandIcon="{ expanded, record, onExpand }">
          <span
            class="expand-toggle cursor-pointer"
            :class="{ 'expand-toggle--expanded': expanded }"
            @click="(e) => onExpandClick(record, e, onExpand)"
          >
            &#9654;
          </span>
        </template>

        <template #innerBodyCell="{ column, record: feeRecord }">
          <template v-if="column.key === 'checkbox'">
            <Tooltip :title="getFeeDisabledReason(feeRecord)">
              <Checkbox
                :checked="isFeeChecked(feeRecord._orderId, feeRecord.id)"
                :disabled="!isFeeSelectable(feeRecord)"
                @change="
                  (e) => onFeeCheckChange(feeRecord._orderId, feeRecord.id, e)
                "
              />
            </Tooltip>
          </template>
          <template v-else-if="column.key === 'paySide'">
            <Tag :color="feeRecord.paySide === 0 ? 'blue' : 'orange'">
              {{ getPaySideLabel(feeRecord.paySide) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'amount'">
            {{ formatAmount(feeRecord.amount) }}
          </template>
          <template v-else-if="column.key === 'rqstPaymentAmount'">
            {{ formatAmount(feeRecord.rqstPaymentAmount) }}
          </template>
          <template v-else-if="column.key === 'unRqstPaymentAmount'">
            {{ formatAmount(feeRecord.unRqstPaymentAmount) }}
          </template>
          <template v-else-if="column.key === 'invoiceStatus'">
            <Tag :color="getInvoiceStatusColor(feeRecord.invoiceStatus)">
              {{ getInvoiceStatusLabel(feeRecord.invoiceStatus) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'combinedFeeStatus'">
            <Tag
              :color="
                getFeeStatusOptions().find(
                  (item) => item.value === feeRecord.combinedFeeStatus,
                )?.color
              "
            >
              {{
                getFeeStatusOptions().find(
                  (item) => item.value === feeRecord.combinedFeeStatus,
                )?.label
              }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'isStatemented'">
            <!-- 未对账时显示红色Tag -->
            <Tag
              v-if="
                !feeRecord.isStatemented ||
                !feeRecord.statements ||
                feeRecord.statements.length === 0
              "
              color="red"
            >
              未对账
            </Tag>
            <!-- 已对账时显示绿色Tag，鼠标悬停显示完整信息 -->
            <Tooltip v-else placement="topLeft">
              <template #title>
                <div style="max-width: 300px">
                  <div
                    v-for="(stmt, index) in feeRecord.statements"
                    :key="index"
                    :style="{
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom:
                        Number(index) < feeRecord.statements.length - 1
                          ? '1px solid #f0f0f0'
                          : 'none',
                    }"
                  >
                    <div>
                      <strong>对账单号：</strong>{{ stmt.statementNum }}
                    </div>
                    <div v-if="stmt.creationTime">
                      <strong>对账月份：</strong
                      >{{ dayjs(stmt.creationTime).format('YYYY-MM') }}
                    </div>
                    <div v-if="stmt.creatorUserName">
                      <strong>对账人：</strong>{{ stmt.creatorUserName }}
                    </div>
                  </div>
                </div>
              </template>
              <Tag color="green">
                已对账
                <span v-if="feeRecord.statements.length > 1">
                  ({{ feeRecord.statements.length }}条)
                </span>
              </Tag>
            </Tooltip>
          </template>
          <template v-else-if="column.key === 'settlementName'">
            {{ feeRecord.settlement?.name ?? '-' }}
          </template>
          <template v-else-if="column.key === 'feeCodeName'">
            {{ feeRecord.feeCode?.cnName ?? '' }}
          </template>
          <template v-else-if="column.key === 'currencyCode'">
            {{ feeRecord.currency?.code ?? '' }}
          </template>
          <template v-else>
            {{ column.dataIndex ? feeRecord[column.dataIndex] : '' }}
          </template>
        </template>
      </NestedDataTable>

      <!-- 分页 -->
      <div class="mt-2 flex justify-end">
        <Pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="totalCount"
          size="small"
          show-size-changer
          show-quick-jumper
          @change="onPageChange"
        />
      </div>
    </div>

    <!-- 底部操作栏 -->
    <template #footer>
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-600">
          <span v-if="selectedFeeCount > 0">
            已选 {{ selectedFeeCount }} 笔，
            <span
              v-for="(item, index) in selectedFeeSummary"
              :key="index"
              class="ml-2"
            >
              <span v-if="item.receiveCount > 0" class="mr-2">
                <span class="font-medium">{{ item.currencyName }}应收</span>：
                <span class="text-blue-600">{{
                  formatAmount(item.receiveAmount)
                }}</span>
                ({{ item.receiveCount }}笔)
              </span>
              <span v-if="item.payCount > 0">
                <span class="font-medium">{{ item.currencyName }}应付</span>：
                <span class="text-orange-600">{{
                  formatAmount(item.payAmount)
                }}</span>
                ({{ item.payCount }}笔)
              </span>
            </span>
          </span>
          <span v-else>&nbsp;</span>
        </div>
        <div class="flex gap-2">
          <Button @click="handleCancel">取消</Button>
          <Button type="primary" @click="handleConfirm">添加对账</Button>
        </div>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
/* Drawer内容区域使用flex布局 */
:deep(.add-fee-drawer .ant-drawer-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  overflow: hidden;
}

/* 搜索区域不伸缩 */
:deep(.add-fee-drawer .ant-drawer-body > div:first-child) {
  flex-shrink: 0;
}

/* 标题区域不伸缩 */
:deep(.add-fee-drawer .ant-drawer-body > div:nth-child(2)) {
  flex-shrink: 0;
}

/* 表格容器占满剩余高度 */
.fee-order-table-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: calc(100% - 200px);
  min-height: 200px;
  overflow: hidden;
}

/* NestedDataTable占满容器 */
.fee-order-table-container :deep(.nested-data-table) {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.fee-order-table-container :deep(.nested-data-table__scroll) {
  flex: 1;
  min-height: 0;
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

.table-sequence-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
