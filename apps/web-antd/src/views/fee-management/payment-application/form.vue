<script lang="ts" setup>
import type { ClientAppApi } from '#/api/common/client';
import type { ClientInvoiceInfoAdminApi } from '#/api/sea-export/clinet-invoice-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { Attachment } from '#/api/common/upload';
import type { SelectedFeeItem } from '../add-fee-modal/data';
import type {
  CurrencyConversionSummary,
  CurrencySummary,
  FeeDetailRow,
  OrderGroupRow,
} from './form-data';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Dropdown,
  Input,
  InputNumber,
  Menu,
  MenuItem,
  message,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { $t } from '#/locales';
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
import {
  markListShouldRefresh,
  returnToListWithRefresh,
} from '#/utils/list-refresh-flag';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { ClientSelect, CurrencySelect, MyOrgSelect } from '#/adapter/component';
import { getMyDefaultOrgId } from '#/composables/use-my-org';
import {
  addPaymentApplication,
  editPaymentApplication,
  getPaymentApplicationDetail,
  payAppItemAdd,
  payAppItemDel,
  PaymentApplicationStatus,
  submitPaymentApplication,
  unsubmitPaymentApplication,
} from '#/api/settlement-management/payment-application-admin';
import FileUploadInput from '../../../adapter/component/file-upload/file-upload-input.vue';

import AddFeeDrawer from '../add-fee-modal/index.vue';
import {
  resolvePodPortDisplayName,
  resolvePolPortDisplayName,
} from '../add-fee-modal/data';
import {
  buildAppliedAmountCurrencyColumns,
  calcConvertedApplied,
  calcConvertedTotal,
  collectAppliedCurrencies,
  formatAmount,
  groupFeesByOrder,
  isAppliedAmountColumnKey,
  isUserRoleColumnKey,
  resolveFeeCurrencyCode,
  summarizeByCurrency,
  summarizeByCurrencyWithConversion,
  useFeeInnerColumns,
  useOrderGroupColumns,
} from './form-data';

/** 从详情结算对象构建 ClientSelect 回显项 */
function toSettlementSelectedItems(
  settlement?: null | PaymentApplicationAdminApi.ClientSimpleDtoForOrder,
  settlementId?: null | string,
  clientName?: null | string,
): ClientAppApi.ClientSimpleDto[] {
  if (settlement?.id) {
    return [
      {
        fullName: settlement.fullName,
        id: settlement.id,
        name: settlement.name ?? clientName ?? '',
      },
    ];
  }
  if (settlementId) {
    return [{ id: settlementId, name: clientName ?? '' }];
  }
  return [];
}

const t = (key: string, args?: any[]) =>
  $t(`seaExport.export.paymentApplication.${key}`, args as any);

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const isEdit = computed(() => !!editId.value);
const currentStatus = ref<number>(PaymentApplicationStatus.Entering);
const isEntering = computed(
  () => currentStatus.value === PaymentApplicationStatus.Entering,
);
const isAuditing = computed(
  () => currentStatus.value === PaymentApplicationStatus.Auditing,
);
const pageLoading = ref(false);
const pageTitle = computed(() =>
  isEdit.value ? t('editTitle') : t('addTitle'),
);

const submitting = ref(false);
const addFeeDrawerRef = ref<InstanceType<typeof AddFeeDrawer> | null>(null);
const { open: openWorkflowTimeline } = useWorkflowTimeline();

function handleViewWorkflow() {
  if (!editId.value) return;
  openWorkflowTimeline({ entityId: editId.value });
}

const applicantName = computed(
  () => userStore.userInfo?.realName ?? userStore.userInfo?.username ?? '',
);
const submitTime = ref(dayjs().format('YYYY-MM-DD HH:mm'));
const endTime = ref<string | undefined>(undefined);
const companyName = ref('-');
const orgId = ref<number | undefined>(getMyDefaultOrgId());
const applicationNo = ref('');
const displayApplicationNo = computed(() =>
  isEdit.value ? applicationNo.value : t('autoGenerate'),
);

const currencySelectRef = ref<InstanceType<typeof CurrencySelect> | null>(null);
const settlementId = ref<string>('');
const settlementName = ref('');
/** ClientSelect 编辑回显（详情 settlement / clientName） */
const settlementSelectedItems = ref<ClientAppApi.ClientSimpleDto[]>([]);

/** null = 按原票币, number = 指定币别 */
const settlementCurrencyId = ref<null | number>(null);
const settlementCurrencyName = ref('');

const paymentRequire = ref('');
const remark = ref('');
const attachments = ref<Attachment[]>([]);

const feeDetailRows = ref<FeeDetailRow[]>([]);
const originalFeeDetailRows = ref<FeeDetailRow[]>([]);
const initialLoadFeeIds = ref<Set<string>>(new Set());
const selectedRowKeys = ref<string[]>([]);

const orderGroupColumns = useOrderGroupColumns();
const feeInnerColumns = computed(() =>
  useFeeInnerColumns(settlementCurrencyId.value !== null),
);

const appliedCurrencies = computed(() =>
  collectAppliedCurrencies(feeDetailRows.value),
);
const appliedAmountDynamicColumns = computed(() =>
  buildAppliedAmountCurrencyColumns(appliedCurrencies.value),
);
const allOrderGroupColumns = computed(() => [
  ...orderGroupColumns,
  ...appliedAmountDynamicColumns.value,
]);

const orderGroups = computed(() =>
  groupFeesByOrder(feeDetailRows.value, appliedCurrencies.value),
);
const expandedGroupKeys = ref<string[]>([]);

const currencySummaries = computed<CurrencySummary[]>(() =>
  summarizeByCurrency(feeDetailRows.value),
);

const convertedTotal = computed(() => calcConvertedTotal(feeDetailRows.value));

const currencyConversionSummaries = computed<CurrencyConversionSummary[]>(() =>
  summarizeByCurrencyWithConversion(feeDetailRows.value),
);

const grandConvertedTotal = computed(() =>
  currencyConversionSummaries.value.reduce(
    (sum, cs) => sum + cs.convertedTotal,
    0,
  ),
);

const payableSummaryText = computed(() => {
  const total = feeDetailRows.value.reduce(
    (sum, f) => sum + (f.appliedAmount ?? 0),
    0,
  );
  return formatAmount(total);
});

const isSettlementLocked = computed(() => feeDetailRows.value.length > 0);

const isSettlementCurrencyLocked = computed(
  () => feeDetailRows.value.length > 0,
);

// --- 结算对象银行账户 ---

interface BankCurrencyRow {
  currencyId: number;
  currencyCode: string;
  currencyName: string;
}

/** 结算对象下所有币别的开票银行（扁平化） */
const clientBanks = ref<ClientInvoiceInfoAdminApi.ClientInvoiceBankDto[]>([]);
const bankLoading = ref(false);
/** 已加载银行列表的结算对象id */
const loadedBankClientId = ref<string>('');
/** currencyId -> clientInvoiceBankId */
const bankSelections = ref<Record<number, string | undefined>>({});

/** 银行选择可编辑（新增模式或编辑且录入中） */
const canEditBank = computed(() => !isEdit.value || isEntering.value);

/** 需要绑定银行的币别：原币结算=各费用币别；指定币别结算=结算币别 */
const bankCurrencies = computed<BankCurrencyRow[]>(() => {
  if (feeDetailRows.value.length === 0) return [];
  if (settlementCurrencyId.value === null) {
    return currencySummaries.value.map((cs) => ({
      currencyId: cs.currencyId,
      currencyCode: cs.currencyCode ?? '',
      currencyName: cs.currencyName ?? '',
    }));
  }
  return [
    {
      currencyId: settlementCurrencyId.value,
      currencyCode: settlementCurrencyName.value,
      currencyName: settlementCurrencyName.value,
    },
  ];
});

function getBankOptions(currencyId: number) {
  return clientBanks.value
    .filter((b) => b.currencyId === currencyId)
    .map((b) => ({
      value: b.id,
      label: `${b.bankName || '-'} / ${b.accountName || '-'}`,
    }));
}

function getBankById(
  id: string | undefined,
): ClientInvoiceInfoAdminApi.ClientInvoiceBankDto | undefined {
  if (!id) return undefined;
  return clientBanks.value.find((b) => b.id === id);
}

function getSelectedBank(
  currencyId: number,
): ClientInvoiceInfoAdminApi.ClientInvoiceBankDto | undefined {
  return getBankById(bankSelections.value[currencyId]);
}

function onBankChange(currencyId: number, val: string | undefined) {
  bankSelections.value = { ...bankSelections.value, [currencyId]: val };
}

/** 指定币别结算模式下的银行选择（结算币别） */
const settlementBankValue = computed(() =>
  settlementCurrencyId.value === null
    ? undefined
    : bankSelections.value[settlementCurrencyId.value],
);
const settlementBankOptions = computed(() =>
  settlementCurrencyId.value === null
    ? []
    : getBankOptions(settlementCurrencyId.value),
);
const settlementSelectedBank = computed(() =>
  settlementCurrencyId.value === null
    ? undefined
    : getSelectedBank(settlementCurrencyId.value),
);
function onSettlementBankChange(val: string | undefined) {
  if (settlementCurrencyId.value === null) return;
  onBankChange(settlementCurrencyId.value, val);
}

/** 为缺失/失效的币别选择默认银行（已有有效选择则保留） */
function applyDefaultBankSelections() {
  const next: Record<number, string | undefined> = { ...bankSelections.value };
  for (const c of bankCurrencies.value) {
    const optionsForCur = clientBanks.value.filter(
      (b) => b.currencyId === c.currencyId,
    );
    const current = next[c.currencyId];
    if (current && optionsForCur.some((b) => b.id === current)) continue;
    const def = optionsForCur.find((b) => b.isDefault) ?? optionsForCur[0];
    next[c.currencyId] = def?.id;
  }
  bankSelections.value = next;
}

/** 加载结算对象开票信息中维护的银行账户 */
async function loadClientBanks(force = false) {
  const clientId = settlementId.value;
  if (!clientId) {
    clientBanks.value = [];
    loadedBankClientId.value = '';
    return;
  }
  if (!force && loadedBankClientId.value === clientId) return;
  bankLoading.value = true;
  try {
    const list = await getClientInvoiceInfoList({ ClientId: clientId });
    const banks: ClientInvoiceInfoAdminApi.ClientInvoiceBankDto[] = [];
    for (const info of list ?? []) {
      for (const b of info.clientInvoiceBanks ?? []) banks.push(b);
    }
    clientBanks.value = banks;
    loadedBankClientId.value = clientId;
    applyDefaultBankSelections();
  } finally {
    bankLoading.value = false;
  }
}

/** 费用币别变化时为新币别补默认银行 */
watch(bankCurrencies, () => {
  applyDefaultBankSelections();
});

/** 构造提交用银行列表 */
function buildBankSubmitList(): PaymentApplicationAdminApi.PaymentApplicationBankAddDto[] {
  return bankCurrencies.value
    .map((c) => bankSelections.value[c.currencyId])
    .filter((id): id is string => !!id)
    .map((id) => ({ clientInvoiceBankId: id }));
}

// --- Fee detail selection ---

function isRowSelected(feeId: string) {
  return selectedRowKeys.value.includes(feeId);
}

function toggleRowSelection(feeId: string, checked: boolean) {
  if (checked) {
    if (!selectedRowKeys.value.includes(feeId)) {
      selectedRowKeys.value.push(feeId);
    }
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== feeId);
  }
}

function toggleAllSelection(checked: boolean) {
  if (checked) {
    selectedRowKeys.value = feeDetailRows.value.map((r) => r.feeId);
  } else {
    selectedRowKeys.value = [];
  }
}

const isAllSelected = computed(
  () =>
    feeDetailRows.value.length > 0 &&
    selectedRowKeys.value.length === feeDetailRows.value.length,
);

const isIndeterminate = computed(
  () =>
    selectedRowKeys.value.length > 0 &&
    selectedRowKeys.value.length < feeDetailRows.value.length,
);

// --- Group selection ---

function getGroupByKey(key: string): OrderGroupRow | undefined {
  return orderGroups.value.find((g) => g.key === key);
}

function isGroupAllSelected(groupKey: string): boolean {
  const group = getGroupByKey(groupKey);
  if (!group || group.children.length === 0) return false;
  return group.children.every((f) => selectedRowKeys.value.includes(f.feeId));
}

function isGroupIndeterminate(groupKey: string): boolean {
  const group = getGroupByKey(groupKey);
  if (!group || group.children.length === 0) return false;
  const count = group.children.filter((f) =>
    selectedRowKeys.value.includes(f.feeId),
  ).length;
  return count > 0 && count < group.children.length;
}

function toggleGroupSelection(group: OrderGroupRow, checked: boolean) {
  const ids = group.children.map((f) => f.feeId);
  if (checked) {
    const set = new Set(selectedRowKeys.value);
    for (const id of ids) set.add(id);
    selectedRowKeys.value = [...set];
  } else {
    const toRemove = new Set(ids);
    selectedRowKeys.value = selectedRowKeys.value.filter(
      (k) => !toRemove.has(k),
    );
  }
}

// --- Add / Remove fee ---

function handleOpenAddFee() {
  addFeeDrawerRef.value?.open({
    settlementId: settlementId.value || undefined,
    settlementCurrencyId: settlementCurrencyId.value,
    selectedFeeIds: feeDetailRows.value.map((r) => r.feeId),
    selectedAppliedAmounts: Object.fromEntries(
      feeDetailRows.value.map((r) => [r.feeId, r.appliedAmount ?? 0]),
    ),
  });
}

function getGroupAppliedAmountDisplay(
  record: OrderGroupRow,
  columnKey: string | number | undefined,
): string {
  if (!isAppliedAmountColumnKey(String(columnKey))) return '';
  const val = (record as unknown as Record<string, number>)[String(columnKey)];
  return formatAmount(val ?? 0);
}

function getUserRoleCellText(value: unknown): string {
  if (value == null || value === '') return '';
  return String(value);
}

function getUserRoleCellTextFromRecord(
  record: OrderGroupRow,
  dataIndex: string | number | undefined,
): string {
  if (!dataIndex) return '';
  return getUserRoleCellText(record[String(dataIndex) as keyof OrderGroupRow]);
}

async function handleFeeConfirm(fees: SelectedFeeItem[]) {
  const existingIds = new Set(feeDetailRows.value.map((r) => r.feeId));
  const newRows: FeeDetailRow[] = fees
    .filter((fee) => !existingIds.has(fee.feeId))
    .map((fee) => ({
      ...fee,
      itemRemark: '',
      rate: fee.exchangeRate ?? 1,
    }));

  if (isEdit.value && editId.value && newRows.length > 0) {
    try {
      await payAppItemAdd({
        id: editId.value,
        paymentApplicationItems: newRows.map((row) => ({
          orderFeeId: row.feeId,
          rate:
            settlementCurrencyId.value === null
              ? undefined
              : (row.rate ?? undefined),
          appliedAmount: row.appliedAmount,
          remark: row.itemRemark || undefined,
        })),
      });
      message.success('保存成功');
    } catch {
      message.error('添加费用关联失败');
      return;
    }
  }

  const nextRows = [...feeDetailRows.value, ...newRows];
  let createdApplicationId: string | undefined;

  if (!isEdit.value && newRows.length > 0) {
    submitting.value = true;
    try {
      createdApplicationId = await addPaymentApplication(
        buildSubmitData(PaymentApplicationStatus.Entering, nextRows),
      );
    } catch {
      message.error('保存失败');
      return;
    } finally {
      submitting.value = false;
    }
  }

  feeDetailRows.value = nextRows;
  originalFeeDetailRows.value = [
    ...originalFeeDetailRows.value,
    ...newRows.map((r) => ({ ...r })),
  ];

  if (settlementId.value) {
    const fee = nextRows.find((r) => r.settlementId === settlementId.value);
    if (fee?.settlementName) {
      settlementName.value = fee.settlementName;
      settlementSelectedItems.value = [
        { id: settlementId.value, name: fee.settlementName },
      ];
    }
  }

  nextTick(() => {
    expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
  });

  if (createdApplicationId) {
    message.success(t('addSuccess'));
    markListShouldRefresh('PaymentApplicationList');
    await router.replace(
      `/fee-management/payment-application/${createdApplicationId}/edit`,
    );
  }
}

async function handleDeleteSelected() {
  const toRemove = new Set(selectedRowKeys.value);
  if (toRemove.size === 0) return;

  if (isEdit.value && editId.value) {
    try {
      await payAppItemDel({
        id: editId.value,
        orderFeeIds: [...toRemove],
      });
      message.success('删除费用关联成功');
    } catch {
      message.error('删除费用关联失败');
      return;
    }
  }

  feeDetailRows.value = feeDetailRows.value.filter(
    (r) => !toRemove.has(r.feeId),
  );
  originalFeeDetailRows.value = originalFeeDetailRows.value.filter(
    (r) => !toRemove.has(r.feeId),
  );
  selectedRowKeys.value = [];
}

// --- Editable cells ---

function isOriginalFee(feeId: string): boolean {
  return isEdit.value && initialLoadFeeIds.value.has(feeId);
}

function onRateChange(feeId: string, val: number | null) {
  const row = feeDetailRows.value.find((r) => r.feeId === feeId);
  if (row) row.rate = val ?? undefined;
}

function onItemRemarkChange(feeId: string, val: string) {
  const row = feeDetailRows.value.find((r) => r.feeId === feeId);
  if (row) row.itemRemark = val;
}

function onEndTimeChange(_date: any, dateStr: string | string[]) {
  endTime.value = Array.isArray(dateStr) ? dateStr[0] : dateStr || undefined;
}

function onSettlementChange(val: string | null | undefined) {
  settlementId.value = val ? String(val) : '';
  settlementName.value = '';
  settlementSelectedItems.value = [];
  bankSelections.value = {};
  loadClientBanks(true);
}

function onSettlementIdSync(val: string) {
  if (settlementId.value !== val) {
    bankSelections.value = {};
  }
  settlementId.value = val;
  const fee = feeDetailRows.value.find((r) => r.settlementId === val);
  if (val && fee?.settlementName) {
    settlementName.value = fee.settlementName;
    settlementSelectedItems.value = [{ id: val, name: fee.settlementName }];
  } else if (!val) {
    settlementSelectedItems.value = [];
  }
  loadClientBanks();
}

function ensureSettlementSelected() {
  if (!settlementId.value) {
    message.warning(t('noSettlementWarning'));
    return false;
  }
  return true;
}

// --- Settlement currency ---

function onSettlementCurrencyChange(val: number | string | null) {
  if (val === 'original' || val === null || val === undefined) {
    settlementCurrencyId.value = null;
    settlementCurrencyName.value = '';
  } else {
    settlementCurrencyId.value = Number(val);
    nextTick(() => {
      const options = currencySelectRef.value?.getOptions?.() ?? [];
      const opt = options.find((o: any) => String(o.value) === String(val));
      settlementCurrencyName.value = opt?.label ?? '';
    });
  }
}

// --- Load detail for edit mode ---

function mapDetailToFeeRows(
  detail: PaymentApplicationAdminApi.PaymentApplicationDetailDto,
): FeeDetailRow[] {
  const settlementShortName = detail.clientName ?? '';
  const rows: FeeDetailRow[] = [];
  for (const group of detail.payAppFeeBySeaExportGroup ?? []) {
    const order = group.transportOrder;
    for (const item of group.paymentApplicationItems ?? []) {
      const fee = item.orderFee;
      rows.push({
        feeId: item.orderFeeId,
        transportOrderId: fee?.transportOrderId ?? order?.id ?? '',
        commissionNum: order?.commissionNum,
        mblNum: order?.mblNum,
        clientName: order?.clientName,
        accountDate: order?.accountDate,
        etd: order?.etd,
        polName: order ? resolvePolPortDisplayName(order) : '',
        podName: order ? resolvePodPortDisplayName(order) : '',
        saleUserNames: order?.saleNames?.join('、'),
        operationUserNames: order?.operatorNames?.join('、'),
        customerServiceUserNames: order?.customerServiceNames?.join('、'),
        paySide: fee?.paySide ?? 0,
        feeCodeId: fee?.feeCodeId ?? 0,
        feeCodeName: item.feeCodeName ?? fee?.feeCodeName,
        currencyId: fee?.currencyId ?? 0,
        currencyCode: resolveFeeCurrencyCode(fee, group.currencyGroup),
        currencyName: item.feeCurrencyName ?? fee?.currencyName,
        settlementId: fee?.settlementId ?? '',
        settlementName:
          settlementShortName ||
          item.feeSettlementName ||
          fee?.settlementName ||
          '',
        amount: fee?.amount ?? item.feeAmount ?? 0,
        settledAmount: fee?.settledAmount ?? 0,
        unRqstPaymentAmount: fee?.unRqstPaymentAmount ?? 0,
        appliedAmount: item.appliedAmount,
        exchangeRate: fee?.exchangeRate,
        itemRemark: item.remark ?? '',
        rate: item.rate ?? undefined,
      });
    }
  }
  return rows;
}

/** 从详情的 currencyGroup.paymentApplicationBank 回填银行选择 */
function restoreBankSelectionsFromDetail(
  detail: PaymentApplicationAdminApi.PaymentApplicationDetailDto,
) {
  const groups = detail.currencyGroup ?? [];
  const next: Record<number, string | undefined> = {};
  if (settlementCurrencyId.value === null) {
    // 原币结算：每个币别分组对应一条银行
    for (const g of groups) {
      const bankId = g.paymentApplicationBank?.clientInvoiceBankId;
      if (bankId) next[g.id] = bankId;
    }
  } else {
    // 指定币别结算：所有分组共享同一条结算币别银行
    const sharedBankId = groups
      .map((g) => g.paymentApplicationBank?.clientInvoiceBankId)
      .find(Boolean);
    if (sharedBankId) next[settlementCurrencyId.value] = sharedBankId;
  }
  bankSelections.value = next;
}

async function loadEditData() {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getPaymentApplicationDetail(editId.value);

    currentStatus.value = detail.status ?? PaymentApplicationStatus.Entering;
    applicationNo.value = detail.applicationNo ?? '';
    settlementId.value = detail.settlementId ?? '';
    settlementName.value = detail.settlement?.name ?? detail.clientName ?? '';
    settlementSelectedItems.value = toSettlementSelectedItems(
      detail.settlement,
      detail.settlementId,
      detail.clientName,
    );
    settlementCurrencyId.value = detail.currencyId ?? null;
    settlementCurrencyName.value = detail.currencyCode ?? '';
    submitTime.value = detail.submitTime
      ? dayjs(detail.submitTime).format('YYYY-MM-DD HH:mm')
      : dayjs().format('YYYY-MM-DD HH:mm');
    endTime.value = detail.endTime
      ? dayjs(detail.endTime).format('YYYY-MM-DD')
      : undefined;
    paymentRequire.value = detail.require ?? '';
    remark.value = detail.remark ?? '';

    orgId.value = detail.orgId ?? undefined;
    if (detail.orgs && detail.orgs.length > 0) {
      companyName.value = detail.orgs.at(-1)?.name ?? '-';
    }

    feeDetailRows.value = mapDetailToFeeRows(detail);
    originalFeeDetailRows.value = feeDetailRows.value.map((r) => ({ ...r }));
    initialLoadFeeIds.value = new Set(feeDetailRows.value.map((r) => r.feeId));

    await loadClientBanks(true);
    restoreBankSelectionsFromDetail(detail);

    attachments.value = (detail.attachments ?? []).map((a) => ({
      attachmentId: a.attachmentId ?? a.id,
      url: a.url ?? '',
      fileName: a.friendlyFileName ?? '',
    }));

    nextTick(() => {
      expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
    });
  } finally {
    pageLoading.value = false;
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  } else {
    nextTick(() => {
      handleOpenAddFee();
    });
  }
});

// --- Submit ---

function buildSubmitData(
  status: PaymentApplicationStatus,
  rows: FeeDetailRow[] = feeDetailRows.value,
): PaymentApplicationAdminApi.PaymentApplicationAddDto {
  const items: PaymentApplicationAdminApi.PaymentApplicationItemAddDto[] =
    rows.map((row) => ({
      orderFeeId: row.feeId,
      rate: settlementCurrencyId.value === null ? null : (row.rate ?? null),
      appliedAmount: row.appliedAmount,
      remark: row.itemRemark,
    }));

  const attachmentItems: PaymentApplicationAdminApi.AttachmentItemForItemInputDto[] =
    attachments.value.map((a, idx) => ({
      attachmentId: Number(a.attachmentId),
      displayOrder: idx,
      url: a.url,
    }));

  const banks = buildBankSubmitList();

  return {
    id: editId.value || undefined,
    orgId: (orgId.value ?? getMyDefaultOrgId())!,
    status,
    submitTime: dayjs().toISOString(),
    endTime: endTime.value ? dayjs(endTime.value).toISOString() : null,
    settlementId: settlementId.value,
    currencyId: settlementCurrencyId.value,
    require: paymentRequire.value || undefined,
    remark: remark.value || undefined,
    paymentApplicationItems: items,
    paymentApplicationBanks: banks.length > 0 ? banks : undefined,
    attachments: attachmentItems.length > 0 ? attachmentItems : undefined,
  };
}

async function saveEditMode() {
  const id = editId.value!;

  const attachmentItems: PaymentApplicationAdminApi.AttachmentItemForItemInputDto[] =
    attachments.value.map((a, idx) => ({
      attachmentId: Number(a.attachmentId),
      displayOrder: idx,
      url: a.url,
    }));

  const banks = buildBankSubmitList();

  await editPaymentApplication({
    id,
    orgId: orgId.value ?? undefined,
    status: PaymentApplicationStatus.Entering,
    submitTime: dayjs().toISOString(),
    endTime: endTime.value ? dayjs(endTime.value).toISOString() : null,
    require: paymentRequire.value || undefined,
    remark: remark.value || undefined,
    paymentApplicationBanks:
      banks.length > 0
        ? banks.map((b) => ({ clientInvoiceBankId: b.clientInvoiceBankId }))
        : undefined,
    attachments: attachmentItems.length > 0 ? attachmentItems : undefined,
  });

  const originalMap = new Map(
    originalFeeDetailRows.value.map((r) => [r.feeId, r]),
  );
  const modifiedDeleteIds: string[] = [];
  const modifiedAddFees: FeeDetailRow[] = [];

  for (const curr of feeDetailRows.value) {
    if (initialLoadFeeIds.value.has(curr.feeId)) continue;
    const orig = originalMap.get(curr.feeId);
    if (!orig) continue;
    if (
      orig.appliedAmount !== curr.appliedAmount ||
      orig.rate !== curr.rate ||
      (orig.itemRemark ?? '') !== (curr.itemRemark ?? '')
    ) {
      modifiedDeleteIds.push(curr.feeId);
      modifiedAddFees.push(curr);
    }
  }

  if (modifiedDeleteIds.length > 0) {
    await payAppItemDel({ id, orderFeeIds: modifiedDeleteIds });
  }
  if (modifiedAddFees.length > 0) {
    await payAppItemAdd({
      id,
      paymentApplicationItems: modifiedAddFees.map((row) => ({
        orderFeeId: row.feeId,
        rate:
          settlementCurrencyId.value === null
            ? undefined
            : (row.rate ?? undefined),
        appliedAmount: row.appliedAmount,
        remark: row.itemRemark || undefined,
      })),
    });
  }

  originalFeeDetailRows.value = feeDetailRows.value.map((r) => ({ ...r }));
}

async function handleSave() {
  if (!ensureSettlementSelected()) {
    return;
  }
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    if (isEdit.value && editId.value) {
      await saveEditMode();
      message.success('保存成功');
      markListShouldRefresh('PaymentApplicationList');
      await loadEditData();
    } else {
      const newId = await addPaymentApplication(
        buildSubmitData(PaymentApplicationStatus.Entering),
      );
      message.success(t('addSuccess'));
      markListShouldRefresh('PaymentApplicationList');
      router.replace(`/fee-management/payment-application/${newId}/edit`);
    }
  } finally {
    submitting.value = false;
  }
}

async function handleSubmit() {
  if (!ensureSettlementSelected()) {
    return;
  }
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    await addPaymentApplication(
      buildSubmitData(PaymentApplicationStatus.Auditing),
    );
    message.success(t('submitSuccess'));
    returnToListWithRefresh('PaymentApplicationList', () => {
      router.push('/fee-management/payment-application');
    });
  } finally {
    submitting.value = false;
  }
}

async function handleSubmitAndNew() {
  if (!ensureSettlementSelected()) {
    return;
  }
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    await addPaymentApplication(
      buildSubmitData(PaymentApplicationStatus.Auditing),
    );
    message.success(t('submitSuccess'));
    markListShouldRefresh('PaymentApplicationList');
    resetForm();
  } finally {
    submitting.value = false;
  }
}

async function handleSubmitApplication() {
  if (!editId.value) return;
  if (!ensureSettlementSelected()) return;
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    await saveEditMode();
    await submitPaymentApplication(editId.value);
    message.success(t('submitSuccess'));
    markListShouldRefresh('PaymentApplicationList');
    await loadEditData();
  } finally {
    submitting.value = false;
  }
}

async function handleUnsubmitApplication() {
  if (!editId.value) return;
  submitting.value = true;
  try {
    await unsubmitPaymentApplication(editId.value);
    message.success('撤销提交成功');
    currentStatus.value = PaymentApplicationStatus.Entering;
    await loadEditData();
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  endTime.value = undefined;
  paymentRequire.value = '';
  remark.value = '';
  feeDetailRows.value = [];
  selectedRowKeys.value = [];
  expandedGroupKeys.value = [];
  attachments.value = [];
  bankSelections.value = {};
  submitTime.value = dayjs().format('YYYY-MM-DD HH:mm');
}

function handleExportMenuClick({ key }: { key: string }) {
  message.info(`导出: ${key}`);
}

function handlePrint() {
  message.info('打印');
}

function getPaySideLabel(val: number) {
  return val === 0 ? '收' : '付';
}

function formatDate(val: string | undefined | null): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : '';
}

function formatMonth(val: string | undefined | null): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM') : '';
}
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="pageLoading">
      <div class="payment-app-form">
        <!-- 顶部操作栏 -->
        <div class="action-bar">
          <div class="action-bar__left">
            <span class="action-bar__title">{{ pageTitle }}</span>
          </div>
          <div class="action-bar__right">
            <Space>
              <!-- 新建模式：仅保存 -->
              <template v-if="!isEdit">
                <Button :loading="submitting" @click="handleSave">
                  {{ t('save') }}
                </Button>
              </template>
              <!-- 编辑模式 且 录入中：保存 + 提交（SubmitAsync） -->
              <template v-if="isEdit && isEntering">
                <Button :loading="submitting" @click="handleSave">
                  {{ t('save') }}
                </Button>
                <Button
                  type="primary"
                  :loading="submitting"
                  @click="handleSubmitApplication"
                >
                  提交
                </Button>
              </template>
              <!-- 审核中：显示撤销提交 + 查看审批流 -->
              <Button
                v-if="isEdit && isAuditing"
                :loading="submitting"
                @click="handleUnsubmitApplication"
              >
                撤销提交
              </Button>
              <Button v-if="isEdit && !isEntering" @click="handleViewWorkflow">
                审批流程
              </Button>
              <Dropdown>
                <Button>
                  {{ t('export') }}
                  <span class="ml-1">▾</span>
                </Button>
                <template #overlay>
                  <Menu @click="handleExportMenuClick">
                    <MenuItem key="feeDetail">
                      {{ t('exportFeeDetail') }}
                    </MenuItem>
                    <MenuItem key="summary">
                      {{ t('exportBySummary') }}
                    </MenuItem>
                  </Menu>
                </template>
              </Dropdown>
              <Button @click="handlePrint">
                {{ t('print') }}
              </Button>
            </Space>
          </div>
        </div>

        <!-- 中间三栏布局 -->
        <div class="main-layout">
          <!-- 左侧：申请人信息 -->
          <div class="left-column">
            <Card size="small">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">{{ t('applicationNo') }}</span>
                  <Input
                    :value="displayApplicationNo"
                    :disabled="true"
                    size="small"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('clientName') }}</span>
                  <ClientSelect
                    :model-value="settlementId"
                    :selected-items="settlementSelectedItems"
                    :placeholder="$t('ui.placeholder.select')"
                    :disabled="isSettlementLocked"
                    size="small"
                    @update:model-value="onSettlementChange"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('applicant') }}</span>
                  <span class="info-value">{{ applicantName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('submitTime') }}</span>
                  <span class="info-value">{{ submitTime }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('latestPaymentDate') }}</span>
                  <DatePicker
                    :value="endTime ? dayjs(endTime) : undefined"
                    class="w-full"
                    size="small"
                    @change="onEndTimeChange"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('company') }}</span>
                  <MyOrgSelect
                    v-model="orgId"
                    :disabled="isSettlementLocked"
                    size="small"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('require') }}</span>
                  <Input.TextArea
                    :value="paymentRequire"
                    :rows="2"
                    :placeholder="$t('ui.placeholder.input')"
                    size="small"
                    @update:value="(val) => (paymentRequire = val)"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('remark') }}</span>
                  <Input.TextArea
                    :value="remark"
                    :rows="2"
                    :placeholder="$t('ui.placeholder.input')"
                    size="small"
                    @update:value="(val) => (remark = val)"
                  />
                </div>
              </div>
            </Card>
          </div>

          <!-- 中部：费用合计 -->
          <div class="center-column">
            <Card size="small" class="h-full">
              <template #title>
                <div class="flex items-center gap-3">
                  <span class="font-semibold">{{ t('feeSummary') }}</span>
                  <span class="text-sm text-gray-500">{{
                    t('settlementCurrency')
                  }}</span>
                  <CurrencySelect
                    ref="currencySelectRef"
                    :model-value="settlementCurrencyId"
                    :extra-options="[
                      { label: t('originalCurrency'), value: null },
                    ]"
                    :disabled="isSettlementCurrencyLocked"
                    size="small"
                    style="width: 160px"
                    @update:model-value="onSettlementCurrencyChange"
                  >
                  </CurrencySelect>
                </div>
              </template>

              <!-- 按票原币模式：显示各币别金额 -->
              <template v-if="settlementCurrencyId === null">
                <div
                  v-if="currencySummaries.length === 0"
                  class="py-4 text-center text-gray-400"
                >
                  {{ t('noFeeWarning') }}
                </div>
                <div v-else class="currency-cards">
                  <div
                    v-for="cs in currencySummaries"
                    :key="cs.currencyId"
                    class="currency-card"
                  >
                    <div class="currency-card__header">
                      <Tag color="blue">{{
                        cs.currencyCode || cs.currencyName
                      }}</Tag>
                      <span class="currency-card__amount">
                        {{ formatAmount(cs.totalAmount) }}
                      </span>
                    </div>
                    <div class="bank-block">
                      <span class="bank-block__label"> 结算银行 </span>
                      <Select
                        :value="bankSelections[cs.currencyId]"
                        :options="getBankOptions(cs.currencyId)"
                        :loading="bankLoading"
                        :disabled="!canEditBank"
                        size="small"
                        class="w-full"
                        placeholder="请选择结算银行"
                        @update:value="(v) => onBankChange(cs.currencyId, v)"
                      />
                      <div
                        v-if="getSelectedBank(cs.currencyId)"
                        class="bank-detail"
                      >
                        <div class="bank-detail__row">
                          <span class="bank-detail__label">开户行</span>
                          <span class="bank-detail__value">{{
                            getSelectedBank(cs.currencyId)?.bankName || '-'
                          }}</span>
                        </div>
                        <div class="bank-detail__row">
                          <span class="bank-detail__label">账号</span>
                          <span class="bank-detail__value">{{
                            getSelectedBank(cs.currencyId)?.bankAccount || '-'
                          }}</span>
                        </div>
                        <div class="bank-detail__row">
                          <span class="bank-detail__label">SWIFT</span>
                          <span class="bank-detail__value">{{
                            getSelectedBank(cs.currencyId)?.swiftCode || '-'
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 指定币别模式：展示各原始币别金额、汇率及折算汇总 -->
              <template v-else>
                <div
                  v-if="currencyConversionSummaries.length === 0"
                  class="py-4 text-center text-gray-400"
                >
                  {{ t('noFeeWarning') }}
                </div>
                <template v-else>
                  <div class="conversion-cards">
                    <div
                      v-for="cs in currencyConversionSummaries"
                      :key="`${cs.currencyId}_${cs.rate}`"
                      class="conversion-card"
                    >
                      <div class="conversion-card__head">
                        <Tag color="blue">{{
                          cs.currencyCode || cs.currencyName
                        }}</Tag>
                        <span class="conversion-card__amount">
                          {{ formatAmount(cs.originalTotal) }}
                        </span>
                      </div>
                      <div class="conversion-card__foot">
                        <span class="conversion-card__rate">
                          {{ t('exchangeRate') }} {{ cs.rate.toFixed(4) }}
                        </span>
                        <span class="conversion-card__converted">
                          ≈ {{ formatAmount(cs.convertedTotal) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="conversion-total-bar">
                    <span class="conversion-total-bar__label">
                      {{ t('convertedTotal') }}
                      <template v-if="settlementCurrencyName">
                        ({{ settlementCurrencyName }})
                      </template>
                    </span>
                    <span class="conversion-total-bar__amount">
                      {{ formatAmount(grandConvertedTotal) }}
                    </span>
                  </div>
                  <div
                    v-if="settlementCurrencyId !== null"
                    class="bank-block bank-block--inline"
                  >
                    <span class="bank-block__label">
                      结算银行
                      <template v-if="settlementCurrencyName">
                        ({{ settlementCurrencyName }})
                      </template>
                    </span>
                    <Select
                      :value="settlementBankValue"
                      :options="settlementBankOptions"
                      :loading="bankLoading"
                      :disabled="!canEditBank"
                      size="small"
                      style="width: 280px"
                      placeholder="请选择结算银行"
                      @update:value="onSettlementBankChange"
                    />
                    <div v-if="settlementSelectedBank" class="bank-detail">
                      <div class="bank-detail__row">
                        <span class="bank-detail__label">开户行</span>
                        <span class="bank-detail__value">{{
                          settlementSelectedBank?.bankName || '-'
                        }}</span>
                      </div>
                      <div class="bank-detail__row">
                        <span class="bank-detail__label">账号</span>
                        <span class="bank-detail__value">{{
                          settlementSelectedBank?.bankAccount || '-'
                        }}</span>
                      </div>
                      <div class="bank-detail__row">
                        <span class="bank-detail__label">SWIFT</span>
                        <span class="bank-detail__value">{{
                          settlementSelectedBank?.swiftCode || '-'
                        }}</span>
                      </div>
                    </div>
                  </div>
                </template>
              </template>
            </Card>
          </div>

          <!-- 右侧：附件上传 -->
          <div class="right-column">
            <Card size="small" class="h-full">
              <template #title>
                <span class="font-semibold">{{ t('attachment') }}</span>
              </template>
              <div class="attachment-area">
                <FileUploadInput v-model="attachments" :max-count="20" />
              </div>
            </Card>
          </div>
        </div>

        <!-- 费用明细表格 -->
        <Card size="small">
          <template #title>
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{ t('feeDetail') }}</span>
              <Space>
                <Button type="primary" size="small" @click="handleOpenAddFee">
                  {{ t('addFee') }}
                </Button>
                <Button
                  danger
                  size="small"
                  :disabled="selectedRowKeys.length === 0"
                  @click="handleDeleteSelected"
                >
                  {{ t('deleteFee') }}
                </Button>
              </Space>
            </div>
          </template>

          <div class="fee-group-table">
            <Table
              :columns="allOrderGroupColumns"
              :data-source="orderGroups"
              :pagination="false"
              :scroll="{ x: 'max-content', y: 500 }"
              :children-column-name="'_none'"
              row-key="key"
              size="small"
              :expanded-row-keys="expandedGroupKeys"
              @expanded-rows-change="(keys) => (expandedGroupKeys = [...keys])"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'seq'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'etd'">
                  {{ formatDate(record.etd) }}
                </template>
                <template v-else-if="column.key === 'accountDate'">
                  {{ formatMonth(record.accountDate) }}
                </template>
                <template v-else-if="isAppliedAmountColumnKey(column.key)">
                  {{ getGroupAppliedAmountDisplay(record, column.key) }}
                </template>
                <template v-else-if="isUserRoleColumnKey(column.key)">
                  <Tooltip
                    v-if="
                      getUserRoleCellTextFromRecord(record, column.dataIndex)
                    "
                    :title="
                      getUserRoleCellTextFromRecord(record, column.dataIndex)
                    "
                  >
                    <span class="ellipsis-cell">
                      {{
                        getUserRoleCellTextFromRecord(record, column.dataIndex)
                      }}
                    </span>
                  </Tooltip>
                </template>
                <template v-else>
                  {{ column.dataIndex ? record[column.dataIndex] : '' }}
                </template>
              </template>

              <template #expandColumnTitle>
                <Checkbox
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="(e) => toggleAllSelection(e.target.checked)"
                />
              </template>
              <template #expandIcon="{ expanded, record, onExpand }">
                <div class="flex items-center gap-1">
                  <Checkbox
                    :checked="isGroupAllSelected(record.key)"
                    :indeterminate="isGroupIndeterminate(record.key)"
                    @change="
                      (e) => toggleGroupSelection(record, e.target.checked)
                    "
                  />
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
                </div>
              </template>

              <template #expandedRowRender="{ record: group }">
                <div class="expanded-fee-table p-2">
                  <Table
                    :columns="feeInnerColumns"
                    :data-source="group.children"
                    :pagination="false"
                    row-key="feeId"
                    size="small"
                  >
                    <template #bodyCell="{ column, record, index }">
                      <template v-if="column.key === 'checkbox'">
                        <Checkbox
                          :checked="isRowSelected(record.feeId)"
                          @change="
                            (e) =>
                              toggleRowSelection(record.feeId, e.target.checked)
                          "
                        />
                      </template>
                      <template v-else-if="column.key === 'seq'">
                        {{ index + 1 }}
                      </template>
                      <template v-else-if="column.key === 'paySide'">
                        <Tag :color="record.paySide === 0 ? 'blue' : 'orange'">
                          {{ getPaySideLabel(record.paySide) }}
                        </Tag>
                      </template>
                      <template v-else-if="column.key === 'currencyCode'">
                        {{ record.currencyCode || record.currencyName }}
                      </template>
                      <template v-else-if="column.key === 'amount'">
                        {{ formatAmount(record.amount) }}
                      </template>
                      <template v-else-if="column.key === 'exchangeRate'">
                        {{ record.exchangeRate }}
                      </template>
                      <template v-else-if="column.key === 'convertedApplied'">
                        {{
                          formatAmount(
                            calcConvertedApplied(record.amount, record.rate),
                          )
                        }}
                      </template>
                      <template v-else-if="column.key === 'settledAmount'">
                        {{ formatAmount(record.settledAmount) }}
                      </template>
                      <template
                        v-else-if="column.key === 'unRqstPaymentAmount'"
                      >
                        {{ formatAmount(record.unRqstPaymentAmount) }}
                      </template>
                      <template v-else-if="column.key === 'appliedAmount'">
                        <span class="fee-applied-amount-value">{{
                          formatAmount(record.appliedAmount)
                        }}</span>
                      </template>
                      <template v-else-if="column.key === 'rate'">
                        <InputNumber
                          v-if="!isOriginalFee(record.feeId)"
                          :value="record.rate"
                          :precision="6"
                          :step="0.01"
                          :min="0"
                          size="small"
                          class="w-full"
                          @change="(val) => onRateChange(record.feeId, val)"
                        />
                        <span v-else>{{ record.rate }}</span>
                      </template>
                      <template v-else>
                        {{ column.dataIndex ? record[column.dataIndex] : '' }}
                      </template>
                    </template>
                  </Table>
                </div>
              </template>
            </Table>
          </div>

          <div class="fee-footer">
            <span>
              {{ t('groupCount', [orderGroups.length]) }}
            </span>
            <div class="flex items-center gap-4">
              <span
                v-for="cs in currencySummaries"
                :key="cs.currencyId"
                class="flex items-center gap-1"
              >
                <Tag color="blue" size="small">{{
                  cs.currencyCode || cs.currencyName
                }}</Tag>
                <strong>{{ formatAmount(cs.totalAmount) }}</strong>
              </span>
            </div>
          </div>
        </Card>
      </div>

      <!-- 添加费用抽屉 -->
      <AddFeeDrawer
        ref="addFeeDrawerRef"
        @confirm="handleFeeConfirm"
        @update:settlement-currency-id="onSettlementCurrencyChange"
        @update:settlement-id="onSettlementIdSync"
      />
    </Spin>
  </Page>
</template>

<style scoped>
.payment-app-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
}

.action-bar__title {
  font-size: 16px;
  font-weight: 600;
}

.main-layout {
  display: flex;
  gap: 12px;
}

.left-column {
  flex-shrink: 0;
  width: 480px;
}

.center-column {
  flex: 1;
  min-width: 0;
}

.right-column {
  flex-shrink: 0;
  width: 240px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  color: #8c8c8c;
  white-space: nowrap;
}

.info-value {
  font-size: 13px;
  color: #262626;
}

.currency-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.currency-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 240px;
  padding: 10px 16px;
  background: #f6f9ff;
  border: 1px solid #e8eef6;
  border-radius: 6px;
}

.currency-card__header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.currency-card__amount {
  font-size: 18px;
  font-weight: 700;
  color: #1890ff;
}

.bank-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bank-block--inline {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #e8eef6;
}

.bank-block__label {
  font-size: 12px;
  color: #8c8c8c;
}

.bank-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  margin-top: 2px;
  background: #fff;
  border: 1px dashed #d9e2ec;
  border-radius: 4px;
}

.bank-detail__row {
  display: flex;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.bank-detail__label {
  flex-shrink: 0;
  width: 44px;
  color: #8c8c8c;
}

.bank-detail__value {
  color: #262626;
  word-break: break-all;
}

.conversion-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.conversion-card {
  flex: 1;
  min-width: 140px;
  padding: 10px 14px;
  background: #f6f9ff;
  border: 1px solid #e8eef6;
  border-radius: 6px;
}

.conversion-card__head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.conversion-card__amount {
  font-size: 17px;
  font-weight: 700;
  color: #262626;
}

.conversion-card__foot {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
}

.conversion-card__rate {
  font-size: 12px;
  color: #8c8c8c;
}

.conversion-card__converted {
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
}

.conversion-total-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #e8eef6;
}

.conversion-total-bar__label {
  font-size: 13px;
  color: #8c8c8c;
}

.conversion-total-bar__amount {
  font-size: 22px;
  font-weight: 700;
  color: #1890ff;
}

.attachment-area {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  min-height: 100px;
}

.attachment-area :deep(.file-upload-input) {
  width: 100%;
}

.fee-group-table :deep(.ant-table-container::before),
.fee-group-table :deep(.ant-table-container::after) {
  box-shadow: none !important;
}

.fee-group-table :deep(.ant-table-expanded-row > td) {
  padding: 4px 8px;
  background: #fff;
}

.fee-group-table :deep(.user-role-column) {
  max-width: 72px;
}

.fee-group-table .ellipsis-cell {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expanded-fee-table {
  overflow-x: auto;
}

.expanded-fee-table :deep(.ant-table-wrapper) {
  width: max-content;
  max-width: none;
}

.expanded-fee-table :deep(.ant-table-container::before),
.expanded-fee-table :deep(.ant-table-container::after) {
  box-shadow: none !important;
}

.expanded-fee-table :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}

.expanded-fee-table :deep(.fee-applied-amount-cell) {
  padding-right: 8px !important;
}

.fee-applied-amount-value {
  font-weight: 600;
  color: #1677ff;
}

.expanded-fee-table :deep(.fee-applied-amount-input .ant-input-number-input) {
  font-weight: 600;
  color: #1677ff;
}

.expanded-fee-table :deep(.ant-table-tbody > tr > td) {
  background: #fff;
}

.expanded-fee-table :deep(.ant-input-number-input) {
  text-align: right;
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

.fee-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-top: 8px;
  font-size: 13px;
  color: #8c8c8c;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 1200px) {
  .main-layout {
    flex-direction: column;
  }

  .left-column,
  .center-column,
  .right-column {
    width: 100%;
  }
}
</style>
