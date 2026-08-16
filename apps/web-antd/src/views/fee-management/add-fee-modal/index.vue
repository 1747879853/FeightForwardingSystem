<script lang="ts" setup>
import { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { computed, nextTick, reactive, ref } from 'vue';

import { useThrottleFn } from '@vueuse/core';
import dayjs from 'dayjs';
import {
  Button,
  Checkbox,
  Drawer,
  InputNumber,
  Modal,
  message,
  Pagination,
  Select,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { CurrencySelect } from '#/adapter/component';
import { useVbenForm } from '#/adapter/form';
import { getOrderFeeGroupAsync } from '#/api/settlement-management/payment-application-admin';
import { NestedDataTable } from '#/components/nested-data-table';
import { $t } from '#/locales';

import ExchangeRateModal from './exchange-rate-modal.vue';

import {
  type AddFeeDrawerProps,
  buildDynamicCurrencyColumns,
  buildFeeGroupKey,
  buildOrderRow,
  collectCurrencies,
  type CurrencyInfo,
  type FeeRowData,
  getPaySideLabel,
  type SelectedFeeItem,
  isOriginalCurrencyApplication,
  isSpecifiedCurrencyApplication,
  resolveGroupSettlementName,
  resolvePolPortDisplayName,
  resolvePodPortDisplayName,
  isUserRoleColumnField,
  useAddFeeSearchSchema,
  useOrderFixedColumns,
} from './data';
const emit = defineEmits<{
  confirm: [fees: SelectedFeeItem[]];
  'update:invoiceProcess': [value: number | undefined];
  'update:settlementCurrencyId': [value: null | number];
  'update:settlementId': [value: string];
}>();

const open = ref(false);
const loading = ref(false);
const drawerProps = ref<AddFeeDrawerProps>({});

const orderList = ref<PaymentApplicationAdminApi.PayAppFeeGroupDto[]>([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const currencies = ref<CurrencyInfo[]>([]);
const tableRows = ref<Record<string, any>[]>([]);

/** 选中状态：groupKey -> Set<feeId> */
const selectionMap = reactive(new Map<string, Set<string>>());
/** 费用输入金额：feeId -> appliedAmount */
const appliedAmountMap = reactive(new Map<string, number>());
/**
 * 跨页勾选缓存：feeId -> SelectedFeeItem。
 * 翻页后当前页 orderList 不含其他页费用，确认/合计需依赖此缓存。
 */
const selectedFeeCache = reactive(new Map<string, SelectedFeeItem>());
/** 选择/金额变更计数，驱动合计 computed */
const selectionEpoch = ref(0);

const expandedRowKeys = ref<string[]>([]);

const exchangeRateModalVisible = ref(false);
const pendingCurrencies = ref<CurrencyInfo[]>([]);
const settlementCurrencyName = ref('');
const currencySelectRef = ref();
/** 发票方式未选时标红 */
const invoiceProcessError = ref(false);

function hasExistingFees(): boolean {
  return (drawerProps.value.selectedFeeIds?.length ?? 0) > 0;
}

const throttledAutoSearch = useThrottleFn(
  async (values: Record<string, any>) => {
    if (hasExistingFees() && !values.SettlementId) return;
    const feeCodeMode = values.feeCodeMode ?? 'include';
    const feeCodeIds = values.FeeCodeIds;
    const hasFeeCodes = Array.isArray(feeCodeIds) && feeCodeIds.length > 0;
    // 排除模式未选费用名称时不自动查询，避免误以为「排除未生效」
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
    labelWidth: 72,
  },
  layout: 'horizontal',
  schema: useAddFeeSearchSchema(),
  showDefaultActions: true,
  actionLayout: 'inline',
  actionWrapperClass: 'col-span-2 col-start-4 justify-end',
  actionPosition: 'right',
  submitButtonOptions: {
    content: $t('common.query'),
  },
  submitOnChange: false,
  compact: true,
  wrapperClass: 'grid-cols-5',
  handleSubmit: async (values) => {
    if (hasExistingFees() && !values.SettlementId) {
      message.warning(
        $t('seaExport.export.paymentApplication.noSettlementWarning'),
      );
      return;
    }
    const feeCodeMode = values.feeCodeMode ?? 'include';
    const feeCodeIds = values.FeeCodeIds;
    const hasFeeCodes = Array.isArray(feeCodeIds) && feeCodeIds.length > 0;
    if (feeCodeMode === 'exclude' && !hasFeeCodes) {
      message.warning('排除模式下请先选择要排除的费用名称');
      return;
    }
    currentPage.value = 1;
    await checkSearchChanged();
    await fetchData(values);
  },
  handleReset: async () => {
    const hasFees = (drawerProps.value.selectedFeeIds?.length ?? 0) > 0;
    const preservedSettlementId = hasFees
      ? drawerProps.value.settlementId
      : undefined;
    await searchFormApi.resetForm();
    clearSelection();
    lastSearchSnapshot = '';
    orderList.value = [];
    totalCount.value = 0;
    currencies.value = [];
    tableRows.value = [];
    expandedRowKeys.value = [];
    currentPage.value = 1;
    searchFormApi.setValues({
      PaySide: 1,
      ...(preservedSettlementId ? { SettlementId: preservedSettlementId } : {}),
    });
    await nextTick();
    if (preservedSettlementId) {
      await fetchData(await searchFormApi.getValues());
    }
  },
  handleValuesChange: (values) => {
    throttledAutoSearch(values);
  },
});

const fixedColumns = useOrderFixedColumns();

const dynamicColumns = computed(() =>
  buildDynamicCurrencyColumns(currencies.value),
);

const allColumns = computed(() =>
  [...fixedColumns, ...dynamicColumns.value].map((column) => ({
    ...column,
    align:
      'align' in column && column.align === 'right'
        ? ('right' as const)
        : ('left' as const),
    dataIndex: 'field' in column ? column.field : undefined,
    key: 'type' in column ? column.type : column.field,
  })),
);

const disabledFeeIds = computed(
  () => new Set(drawerProps.value.selectedFeeIds ?? []),
);
const isSettlementCurrencyLocked = computed(
  () => (drawerProps.value.selectedFeeIds?.length ?? 0) > 0,
);
const isSpecifiedSettlement = computed(() =>
  isSpecifiedCurrencyApplication(drawerProps.value.settlementCurrencyId),
);
const lockedSettlementCurrencyText = computed(() => {
  if (!isSpecifiedSettlement.value) {
    return `🔒 ${$t('seaExport.export.paymentApplication.originalCurrency')}`;
  }
  const name =
    drawerProps.value.settlementCurrencyName ||
    resolveSettlementCurrencyName(drawerProps.value.settlementCurrencyId!) ||
    'RMB';
  return `🔒 固定币别 · ${name}`;
});

function isFeeDisabled(feeId: string): boolean {
  return disabledFeeIds.value.has(feeId);
}

function resolveAppliedAmount(
  feeId: string,
  unRqstPaymentAmount?: number | null,
): number | undefined {
  if (appliedAmountMap.has(feeId)) {
    return appliedAmountMap.get(feeId);
  }
  if (isFeeDisabled(feeId)) {
    return undefined;
  }
  return unRqstPaymentAmount ?? 0;
}

function initDisabledFeeAppliedAmounts() {
  const amounts = drawerProps.value.selectedAppliedAmounts;
  if (!amounts) return;
  for (const feeId of drawerProps.value.selectedFeeIds ?? []) {
    const amount = amounts[feeId];
    if (amount != null) {
      appliedAmountMap.set(feeId, amount);
    }
  }
}

async function openDrawer(props: AddFeeDrawerProps = {}) {
  drawerProps.value = props;
  settlementCurrencyName.value =
    props.settlementCurrencyName ??
    (isSpecifiedCurrencyApplication(props.settlementCurrencyId)
      ? resolveSettlementCurrencyName(props.settlementCurrencyId!)
      : '');
  open.value = true;
  resetState();
  await nextTick();
  await searchFormApi.resetForm();
  await nextTick();

  const hasFees = hasExistingFees();
  // 先回显结算对象选项，再写表单值，避免首次 getValues 丢 SettlementId
  searchFormApi.updateSchema([
    {
      fieldName: 'SettlementId',
      rules: hasFees ? 'required' : undefined,
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
  searchFormApi.setValues({
    PaySide: 1,
    ...(props.settlementId ? { SettlementId: props.settlementId } : {}),
  });
  await nextTick();

  const values = await searchFormApi.getValues();
  await fetchData({
    ...values,
    ...(props.settlementId ? { SettlementId: props.settlementId } : {}),
  });
  initDisabledFeeAppliedAmounts();
}

function bumpSelectionEpoch() {
  selectionEpoch.value += 1;
}

function resetState() {
  orderList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  currencies.value = [];
  tableRows.value = [];
  selectionMap.clear();
  appliedAmountMap.clear();
  selectedFeeCache.clear();
  bumpSelectionEpoch();
  expandedRowKeys.value = [];
  invoiceProcessError.value = false;
}

function clearSelection() {
  selectionMap.clear();
  appliedAmountMap.clear();
  selectedFeeCache.clear();
  bumpSelectionEpoch();
}

async function fetchData(formValues?: Record<string, any>) {
  const values = formValues ?? (await searchFormApi.getValues());
  if (hasExistingFees() && !values.SettlementId) return;

  const [etdStart, etdEnd] = Array.isArray(values.ETDRange)
    ? values.ETDRange
    : [undefined, undefined];

  const feeCodeMode = values.feeCodeMode ?? 'include';
  const feeCodeIds = values.FeeCodeIds;
  const hasFeeCodes = Array.isArray(feeCodeIds) && feeCodeIds.length > 0;

  const params: PaymentApplicationAdminApi.GetOrderFeeGroupParams = {
    SettlementId: values.SettlementId,
    OrgId: values.OrgId,
    Keyword: values.Keyword,
    PaySide: values.PaySide ?? undefined,
    BizType: values.BizType ?? undefined,
    ETDStart: etdStart ? dayjs(etdStart).toISOString() : undefined,
    ETDEnd: etdEnd ? dayjs(etdEnd).toISOString() : undefined,
    CurrencyId: values.CurrencyId,
    FeeCodeIds:
      feeCodeMode === 'include' && hasFeeCodes ? feeCodeIds : undefined,
    ExceptFeeCodeIds:
      feeCodeMode === 'exclude' && hasFeeCodes ? feeCodeIds : undefined,
    PageIndex: currentPage.value,
    PageSize: pageSize.value,
  };

  loading.value = true;
  try {
    const result = await getOrderFeeGroupAsync(params);
    orderList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;

    currencies.value = collectCurrencies(orderList.value);
    tableRows.value = orderList.value.map((order) =>
      buildOrderRow(order, currencies.value),
    );
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

function resolveGroupKey(
  group: PaymentApplicationAdminApi.PayAppFeeGroupDto,
): string {
  const settlementId =
    group.settlementId ?? group.orderFees?.[0]?.settlementId ?? '';
  return buildFeeGroupKey(group.id, settlementId);
}

function findGroupByKey(
  groupKey: string,
): PaymentApplicationAdminApi.PayAppFeeGroupDto | undefined {
  return orderList.value.find((g) => resolveGroupKey(g) === groupKey);
}

function getGroupFees(
  groupKey: string,
): PaymentApplicationAdminApi.OrderFeeDto[] {
  return findGroupByKey(groupKey)?.orderFees ?? [];
}

function getSelectableGroupFees(
  groupKey: string,
): PaymentApplicationAdminApi.OrderFeeDto[] {
  const disabledIds = disabledFeeIds.value;
  return getGroupFees(groupKey).filter((fee) => !disabledIds.has(fee.id));
}

function isGroupCheckboxDisabled(groupKey: string): boolean {
  return getSelectableGroupFees(groupKey).length === 0;
}

function isGroupChecked(groupKey: string): boolean {
  const fees = getSelectableGroupFees(groupKey);
  if (fees.length === 0) return false;
  const selected = selectionMap.get(groupKey);
  if (!selected) return false;
  return fees.every((f) => selected.has(f.id));
}

function isGroupIndeterminate(groupKey: string): boolean {
  const fees = getSelectableGroupFees(groupKey);
  if (fees.length === 0) return false;
  const selected = selectionMap.get(groupKey);
  if (!selected || selected.size === 0) return false;
  const selectedCount = fees.filter((f) => selected.has(f.id)).length;
  return selectedCount > 0 && selectedCount < fees.length;
}

function toggleGroup(groupKey: string, checked: boolean) {
  const fees = getSelectableGroupFees(groupKey);
  if (fees.length === 0) return;

  if (checked) {
    const set = new Set<string>();
    for (const fee of fees) {
      set.add(fee.id);
      if (!appliedAmountMap.has(fee.id)) {
        appliedAmountMap.set(fee.id, fee.unRqstPaymentAmount ?? 0);
      }
      cacheSelectedFee(groupKey, fee);
    }
    selectionMap.set(groupKey, set);
  } else {
    const existing = selectionMap.get(groupKey);
    if (!existing) return;
    const set = new Set(existing);
    for (const fee of fees) {
      set.delete(fee.id);
      uncacheSelectedFee(fee.id);
    }
    if (set.size > 0) {
      selectionMap.set(groupKey, set);
    } else {
      selectionMap.delete(groupKey);
    }
  }
  bumpSelectionEpoch();
}

const selectablePageGroupKeys = computed(() =>
  tableRows.value
    .map((record) => String(record.groupKey))
    .filter((groupKey) => !isGroupCheckboxDisabled(groupKey)),
);

const isAllPageGroupsChecked = computed(
  () =>
    selectablePageGroupKeys.value.length > 0 &&
    selectablePageGroupKeys.value.every(isGroupChecked),
);

const isPageGroupsIndeterminate = computed(
  () =>
    !isAllPageGroupsChecked.value &&
    selectablePageGroupKeys.value.some(
      (groupKey) => isGroupChecked(groupKey) || isGroupIndeterminate(groupKey),
    ),
);

function togglePageGroups(checked: boolean) {
  for (const groupKey of selectablePageGroupKeys.value) {
    toggleGroup(groupKey, checked);
  }
}

function isFeeChecked(groupKey: string, feeId: string): boolean {
  return selectionMap.get(groupKey)?.has(feeId) ?? false;
}

function cacheSelectedFee(
  groupKey: string,
  fee: PaymentApplicationAdminApi.OrderFeeDto,
) {
  const item = buildSelectedFeeItem(groupKey, fee);
  if (!item) return;
  selectedFeeCache.set(fee.id, item);
}

function uncacheSelectedFee(feeId: string) {
  selectedFeeCache.delete(feeId);
}

function toggleFee(groupKey: string, feeId: string, checked: boolean) {
  if (isFeeDisabled(feeId)) return;
  if (!selectionMap.has(groupKey)) {
    selectionMap.set(groupKey, new Set());
  }
  const set = selectionMap.get(groupKey)!;
  if (checked) {
    set.add(feeId);
    const fee = getGroupFees(groupKey).find((f) => f.id === feeId);
    if (fee && !isFeeDisabled(feeId)) {
      if (!appliedAmountMap.has(feeId)) {
        appliedAmountMap.set(feeId, fee.unRqstPaymentAmount ?? 0);
      }
      cacheSelectedFee(groupKey, fee);
    }
  } else {
    set.delete(feeId);
    uncacheSelectedFee(feeId);
    if (set.size === 0) {
      selectionMap.delete(groupKey);
    }
  }
  bumpSelectionEpoch();
}

function setAppliedAmount(feeId: string, value: number | null) {
  appliedAmountMap.set(feeId, value ?? 0);
  const cached = selectedFeeCache.get(feeId);
  if (cached) {
    cached.appliedAmount = value ?? 0;
  }
  bumpSelectionEpoch();
}

function getFeeRows(groupKey: string): FeeRowData[] {
  const fees = getGroupFees(groupKey);
  return fees.map((f) => ({
    ...f,
    appliedAmount: resolveAppliedAmount(f.id, f.unRqstPaymentAmount) ?? 0,
  }));
}

const nestedTableRows = computed(() =>
  tableRows.value.map((record) => ({
    ...record,
    feeRows: getFeeRows(record.groupKey),
  })),
);

// --- 搜索条件变化清空选择 ---
let lastSearchSnapshot = '';

async function checkSearchChanged() {
  const values = await searchFormApi.getValues();
  const snapshot = JSON.stringify({
    SettlementId: values?.SettlementId,
    OrgId: values?.OrgId,
    Keyword: values?.Keyword,
    PaySide: values?.PaySide,
    CurrencyId: values?.CurrencyId,
  });
  if (lastSearchSnapshot && snapshot !== lastSearchSnapshot) {
    clearSelection();
    initDisabledFeeAppliedAmounts();
  }
  lastSearchSnapshot = snapshot;
}

// --- 汇总选中费用 ---

function hasUserAttribute(
  userAttribute: number | undefined,
  target: PaymentApplicationAdminApi.UserAttribute,
) {
  return (
    typeof userAttribute === 'number' && (userAttribute & target) === target
  );
}

function getOrderUserNamesByAttribute(
  orderUsers: PaymentApplicationAdminApi.OrderUserDto[] | undefined,
  target: PaymentApplicationAdminApi.UserAttribute,
) {
  return (orderUsers ?? [])
    .filter((user) => hasUserAttribute(user.userAttribute, target))
    .map((user) => user.userNickName)
    .filter((name): name is string => Boolean(name))
    .join('、');
}

/** 勾选时写入跨页缓存；翻页后仍可确认/合计 */
function buildSelectedFeeItem(
  groupKey: string,
  fee: PaymentApplicationAdminApi.OrderFeeDto,
): null | SelectedFeeItem {
  const order = findGroupByKey(groupKey);
  return {
    feeId: fee.id,
    transportOrderId: fee.transportOrderId,
    commissionNum: order?.commissionNum,
    mblNum: order?.mblNum,
    clientId: order?.clientId,
    clientName: order?.client?.name,
    accountDate: order?.accountDate,
    etd: order?.etd,
    polName: order ? resolvePolPortDisplayName(order) : '',
    podName: order ? resolvePodPortDisplayName(order) : '',
    saleUserNames: getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Sale,
    ),
    operationUserNames: getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Operation,
    ),
    customerServiceUserNames: getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.CustomerService,
    ),
    paySide: fee.paySide,
    feeCodeId: fee.feeCodeId,
    feeCodeName: fee.feeCode?.cnName,
    currencyId: fee.currencyId,
    currencyCode: fee.currency?.code ?? '',
    currencyName: fee.currency?.cnName,
    settlementId: fee.settlementId,
    settlementName: order
      ? resolveGroupSettlementName(order)
      : (fee.settlement?.name ?? ''),
    amount: fee.amount,
    settledAmount: fee.settledAmount,
    unRqstPaymentAmount: fee.unRqstPaymentAmount ?? 0,
    appliedAmount: resolveAppliedAmount(fee.id, fee.unRqstPaymentAmount) ?? 0,
  };
}

function getSelectedFees(): SelectedFeeItem[] {
  const disabled = disabledFeeIds.value;
  const result: SelectedFeeItem[] = [];
  for (const [feeId, fee] of selectedFeeCache.entries()) {
    if (disabled.has(feeId)) continue;
    result.push({
      ...fee,
      appliedAmount: resolveAppliedAmount(feeId, fee.unRqstPaymentAmount) ?? 0,
    });
  }
  return result;
}

/** 已选费用按币别汇总本次申请净额（付 − 收），含跨页勾选 */
const selectedCurrencyTotals = computed(() => {
  void selectionEpoch.value;
  const disabled = disabledFeeIds.value;
  const map = new Map<
    string,
    { amount: number; count: number; currencyCode: string }
  >();
  for (const [feeId, fee] of selectedFeeCache.entries()) {
    if (disabled.has(feeId)) continue;
    const applied = resolveAppliedAmount(feeId, fee.unRqstPaymentAmount) ?? 0;
    const signed = fee.paySide === 0 ? -applied : applied;
    const currencyCode = fee.currencyCode || '未知';
    const key = String(fee.currencyId ?? currencyCode);
    const prev = map.get(key);
    if (prev) {
      prev.amount += signed;
      prev.count += 1;
    } else {
      map.set(key, { amount: signed, count: 1, currencyCode });
    }
  }
  return [...map.values()];
});

const selectedFeeCount = computed(() => {
  void selectionEpoch.value;
  const disabled = disabledFeeIds.value;
  let count = 0;
  for (const feeId of selectedFeeCache.keys()) {
    if (!disabled.has(feeId)) count += 1;
  }
  return count;
});

function validateAppliedAmounts(selected: SelectedFeeItem[]): boolean {
  for (const fee of selected) {
    const maxAmount = fee.unRqstPaymentAmount ?? 0;
    const applied = fee.appliedAmount ?? 0;
    if (applied <= 0) {
      message.warning('本次申请必须大于 0');
      return false;
    }
    if (applied > maxAmount) {
      message.warning(
        `费用「${fee.feeCodeName ?? ''}」本次申请不能超过可申请金额 ${formatAmount(maxAmount)}`,
      );
      return false;
    }
  }
  return true;
}

function validateSameSettlement(selected: SelectedFeeItem[]): boolean {
  const settlementIds = new Set(
    selected.map((fee) => fee.settlementId).filter(Boolean),
  );
  if (settlementIds.size <= 1) return true;
  Modal.warning({
    title: '提示',
    content: '请选择同一结算对象费用',
  });
  return false;
}

function resolveSettlementCurrencyName(targetId: number): string {
  const fromCurrencies = currencies.value.find(
    (c) => c.currencyId === targetId,
  );
  if (fromCurrencies) return fromCurrencies.currencyCode;
  for (const order of orderList.value) {
    for (const fee of order.orderFees ?? []) {
      if (fee.currencyId === targetId) {
        return fee.currency?.code ?? '';
      }
    }
  }
  if (currencySelectRef.value) {
    const options = currencySelectRef.value.getOptions?.() ?? [];
    const opt = options.find((o: any) => o.value === targetId);
    if (opt) return opt.raw?.code ?? opt.label ?? '';
  }
  return '';
}

function handleConfirm() {
  if (
    drawerProps.value.enableInvoiceProcess &&
    drawerProps.value.invoiceProcess == null
  ) {
    invoiceProcessError.value = true;
    message.warning('请选择发票方式');
    return;
  }
  const selected = getSelectedFees();
  if (selected.length === 0) {
    message.warning('请至少选择一条费用');
    return;
  }
  if (!validateSameSettlement(selected)) return;
  if (!validateAppliedAmounts(selected)) return;

  const curSettlementCurrencyId = drawerProps.value.settlementCurrencyId;
  if (isSpecifiedCurrencyApplication(curSettlementCurrencyId)) {
    const diffCurrencies = new Map<number, string>();
    for (const fee of selected) {
      if (fee.currencyId !== curSettlementCurrencyId) {
        diffCurrencies.set(
          fee.currencyId,
          fee.currencyCode ?? fee.currencyName ?? '',
        );
      }
    }
    if (diffCurrencies.size > 0) {
      pendingCurrencies.value = [...diffCurrencies.entries()].map(
        ([currencyId, currencyCode]) => ({ currencyId, currencyCode }),
      );
      settlementCurrencyName.value = resolveSettlementCurrencyName(
        curSettlementCurrencyId,
      );
      exchangeRateModalVisible.value = true;
      return;
    }
  }

  emitResult(selected);
}

function handleExchangeRateConfirm(rateMap: Map<number, number>) {
  const selected = getSelectedFees();
  if (!validateSameSettlement(selected)) return;
  if (!validateAppliedAmounts(selected)) return;
  for (const fee of selected) {
    const rate = rateMap.get(fee.currencyId);
    if (rate !== undefined) {
      fee.exchangeRate = rate;
    }
  }
  emitResult(selected);
}

async function emitResult(fees: SelectedFeeItem[]) {
  const values = await searchFormApi.getValues();
  const settlementId = values.SettlementId ?? fees[0]?.settlementId;
  if (settlementId) {
    emit('update:settlementId', String(settlementId));
  }
  if (drawerProps.value.enableInvoiceProcess) {
    emit('update:invoiceProcess', drawerProps.value.invoiceProcess);
  }
  emit('confirm', fees);
  open.value = false;
}

function handleCancel() {
  open.value = false;
}

function onSettlementCurrencyChange(val: number | string | null) {
  const nextValue =
    val === 'original' || val === null || val === undefined
      ? null
      : Number(val);
  drawerProps.value = {
    ...drawerProps.value,
    settlementCurrencyId: nextValue,
  };
  emit('update:settlementCurrencyId', nextValue);
}

function onInvoiceProcessChange(value: number | undefined) {
  drawerProps.value = {
    ...drawerProps.value,
    invoiceProcess: value,
  };
  if (value != null) {
    invoiceProcessError.value = false;
  }
  emit('update:invoiceProcess', value);
}

const feeColumns = [
  {
    title: '',
    dataIndex: 'checkbox',
    key: 'checkbox',
    width: 40,
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
    title: '原始币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    width: 80,
  },
  {
    title: $t('seaExport.export.paymentApplication.originalAmountLabel'),
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '可申请金额',
    dataIndex: 'unRqstPaymentAmount',
    key: 'unRqstPaymentAmount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '本次申请',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    width: 130,
    align: 'right' as const,
    className: 'fee-applied-amount-cell',
  },
];

function formatAmount(val: number | undefined | null): string {
  if (val == null) return '';
  return Number(val).toFixed(2);
}

function formatMonth(val: string | undefined | null): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM') : '';
}

function formatDate(val: string | undefined | null): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : '';
}

function getUserRoleCellText(value: unknown): string {
  if (value == null || value === '') return '';
  return String(value);
}

function getUserRoleCellTextFromRecord(
  record: Record<string, unknown>,
  field: string | undefined,
): string {
  if (!field) return '';
  return getUserRoleCellText(record[field]);
}

function onFeeCheckChange(groupKey: string, feeId: string, e: any) {
  toggleFee(groupKey, feeId, e.target.checked);
}

function onGroupCheckChange(groupKey: string, e: any) {
  toggleGroup(groupKey, e.target.checked);
}

function onPageGroupCheckChange(e: any) {
  togglePageGroups(e.target.checked);
}

function onExpandClick(record: any, e: Event, onExpand: Function) {
  e.stopPropagation();
  onExpand(record, e);
}

function onAppliedAmountChange(feeId: string, val: number | null) {
  setAppliedAmount(feeId, val);
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
  >
    <!-- 搜索区域 -->
    <div class="mb-4">
      <SearchForm />
    </div>

    <!-- 主体区域 -->
    <div class="mb-2 flex items-center gap-3">
      <div class="shrink-0 text-base font-semibold">费用明细</div>
      <div
        v-if="selectedFeeCount > 0"
        class="selected-fee-summary min-w-0 flex-1"
      >
        <span class="selected-fee-summary__label">
          已选 {{ selectedFeeCount }} 笔
        </span>
        <span
          v-for="item in selectedCurrencyTotals"
          :key="item.currencyCode"
          class="selected-fee-summary__item"
        >
          <span class="selected-fee-summary__code">{{
            item.currencyCode
          }}</span>
          <span class="selected-fee-summary__amount">{{
            formatAmount(item.amount)
          }}</span>
        </span>
      </div>
      <div class="ml-auto flex shrink-0 items-center gap-2">
        <template v-if="drawerProps.enableInvoiceProcess">
          <span class="text-sm text-gray-600">
            发票方式
            <span class="text-red-500">*</span>
          </span>
          <Select
            :value="drawerProps.invoiceProcess"
            :options="[
              { label: '先票后付', value: 0 },
              { label: '先付后票', value: 1 },
              { label: '不开票', value: 2 },
            ]"
            :status="invoiceProcessError ? 'error' : undefined"
            placeholder="请选择"
            size="small"
            style="width: 140px"
            @change="onInvoiceProcessChange"
          />
        </template>
        <span
          v-if="isSettlementCurrencyLocked"
          class="settlement-currency-mode"
        >
          {{ lockedSettlementCurrencyText }}
        </span>
        <CurrencySelect
          v-else
          ref="currencySelectRef"
          :model-value="drawerProps.settlementCurrencyId"
          :extra-options="[{ label: '按原票币', value: null }]"
          size="small"
          style="width: 160px"
          @update:model-value="onSettlementCurrencyChange"
        />
      </div>
    </div>

    <!-- 主表格（业务列表） -->
    <div class="fee-order-table">
      <NestedDataTable
        :columns="allColumns"
        :data-source="nestedTableRows"
        :inner-columns="feeColumns"
        inner-data-key="feeRows"
        inner-row-key="id"
        :loading="loading"
        :max-height="500"
        row-key="groupKey"
        v-model:expanded-row-keys="expandedRowKeys"
      >
        <template #outerHeaderCell="{ column }">
          <span v-if="column.type === 'seq'" class="table-sequence-cell">
            <Checkbox
              :checked="isAllPageGroupsChecked"
              :disabled="selectablePageGroupKeys.length === 0"
              :indeterminate="isPageGroupsIndeterminate"
              @change="onPageGroupCheckChange"
            />
            {{ column.title }}
          </span>
          <template v-else>{{ column.title }}</template>
        </template>

        <template #outerBodyCell="{ column, record, index }">
          <template v-if="column.type === 'seq'">
            <span class="table-sequence-cell">
              <Checkbox
                :checked="isGroupChecked(record.groupKey)"
                :disabled="isGroupCheckboxDisabled(record.groupKey)"
                :indeterminate="isGroupIndeterminate(record.groupKey)"
                @change="(e) => onGroupCheckChange(record.groupKey, e)"
              />
              {{ index + 1 + (currentPage - 1) * pageSize }}
            </span>
          </template>
          <template
            v-else-if="column.field && column.field.startsWith('currency_')"
          >
            {{ formatAmount(record[column.field]) }}
          </template>
          <template v-else-if="column.field === 'accountDate'">
            {{ formatMonth(record.accountDate) }}
          </template>
          <template v-else-if="column.field === 'etd'">
            {{ formatDate(record.etd) }}
          </template>
          <template v-else-if="isUserRoleColumnField(column.field)">
            <Tooltip
              v-if="getUserRoleCellTextFromRecord(record, column.field)"
              :title="getUserRoleCellTextFromRecord(record, column.field)"
            >
              <span class="ellipsis-cell">
                {{ getUserRoleCellTextFromRecord(record, column.field) }}
              </span>
            </Tooltip>
          </template>
          <template
            v-else-if="
              column.field === 'mblNum' || column.field === 'orderCtnsText'
            "
          >
            <Tooltip v-if="record[column.field]" :title="record[column.field]">
              <span class="ellipsis-cell">{{ record[column.field] }}</span>
            </Tooltip>
          </template>
          <template v-else>
            {{ column.field ? record[column.field] : '' }}
          </template>
        </template>

        <!-- 展开行内容：费用子表格 -->
        <template #innerBodyCell="{ column, record: feeRecord, parentRecord }">
          <template v-if="column.key === 'checkbox'">
            <Checkbox
              :checked="isFeeChecked(parentRecord.groupKey, feeRecord.id)"
              :disabled="disabledFeeIds.has(feeRecord.id)"
              @change="
                (e) => onFeeCheckChange(parentRecord.groupKey, feeRecord.id, e)
              "
            />
          </template>
          <template v-else-if="column.key === 'paySide'">
            <Tag :color="feeRecord.paySide === 0 ? 'blue' : 'orange'">
              {{ getPaySideLabel(feeRecord.paySide) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'feeCodeName'">
            {{ feeRecord.feeCode?.cnName ?? '' }}
          </template>
          <template v-else-if="column.key === 'currencyCode'">
            {{ feeRecord.currency?.code }}
          </template>
          <template v-else-if="column.key === 'amount'">
            {{ formatAmount(feeRecord.amount) }}
          </template>
          <template v-else-if="column.key === 'unRqstPaymentAmount'">
            {{ formatAmount(feeRecord.unRqstPaymentAmount) }}
          </template>
          <template v-else-if="column.key === 'appliedAmount'">
            <InputNumber
              :value="
                resolveAppliedAmount(
                  feeRecord.id,
                  feeRecord.unRqstPaymentAmount,
                )
              "
              :disabled="disabledFeeIds.has(feeRecord.id)"
              :min="0"
              :max="feeRecord.unRqstPaymentAmount ?? 0"
              :precision="2"
              size="small"
              class="fee-applied-amount-input w-full"
              @change="(val) => onAppliedAmountChange(feeRecord.id, val)"
            />
          </template>
          <template v-else>
            {{ column.dataIndex ? feeRecord[column.dataIndex] : '' }}
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
      <div class="flex justify-end gap-2">
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" @click="handleConfirm">添加到申请单</Button>
      </div>
    </template>

    <!-- 汇率录入弹窗 -->
    <ExchangeRateModal
      :open="exchangeRateModalVisible"
      :currencies="pendingCurrencies"
      :settlement-currency-id="drawerProps.settlementCurrencyId"
      :settlement-currency-name="settlementCurrencyName"
      @confirm="handleExchangeRateConfirm"
      @update:open="(val) => (exchangeRateModalVisible = val)"
    />
  </Drawer>
</template>

<style scoped>
:deep(.ant-form-item-label > label) {
  white-space: nowrap;
}

.fee-order-table :deep(.user-role-column) {
  max-width: 72px;
}

.settlement-currency-mode {
  min-width: 132px;
  padding: 4px;
  font-size: 12px;
  font-weight: 700;
  line-height: 15px;
  color: #1d4ed8;
  text-align: center;
  background: #eff6ff;
  border-radius: 6px;
}

.selected-fee-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  font-size: 12px;
  line-height: 1.4;
  color: #657286;
}

.selected-fee-summary__label {
  font-weight: 600;
  color: #334155;
}

.selected-fee-summary__item {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
  padding: 2px 8px;
  background: #f0f7ff;
  border-radius: 6px;
}

.selected-fee-summary__code {
  font-weight: 600;
  color: #475569;
}

.selected-fee-summary__amount {
  font-weight: 700;
  color: #1677ff;
}

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
}

.fee-order-table :deep(.nested-data-table__inner) {
  width: 750px;
  min-width: 750px;
  max-width: 750px;
}

.fee-order-table :deep(.nested-data-table__inner .ant-input-number-input) {
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
</style>
