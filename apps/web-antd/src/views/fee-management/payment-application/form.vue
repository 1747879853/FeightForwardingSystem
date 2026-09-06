<script lang="ts" setup>
import type { ClientAppApi } from '#/api/common/client';
import type { ClientInvoiceInfoAdminApi } from '#/api/sea-export/clinet-invoice-admin';
import type { GeminiInvoiceDto } from '#/api/sea-export/gemini-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { SelectedFeeItem } from '../add-fee-modal/data';
import type { CurrencySummary, FeeDetailRow, OrderGroupRow } from './form-data';
import type { InvoiceRowForm } from './invoice-rows';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';

import coinsHandSvg from '#/assets/images/payment-coins-hand.svg';
import feePackageSvg from '#/assets/images/payment-fee-package.svg';
import invoiceTicketSvg from '#/assets/images/payment-invoice-ticket.svg';
import workflowSvg from '#/assets/images/payment-workflow.svg';
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
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { $t } from '#/locales';
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
import {
  markListShouldRefresh,
  returnToListWithRefresh,
} from '#/utils/list-refresh-flag';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { WorkflowTimeline } from '#/components/workflow-timeline';
import { NestedDataTable } from '#/components/nested-data-table';
import { AuditStatusStamp } from '#/components/audit-status-stamp';
import {
  ClientSelect,
  CurrencySelect,
  FeeCodeSelect,
  MyOrgSelect,
} from '#/adapter/component';
import { formatOrgPathLabel } from '#/composables/use-all-user-org';
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
import AddFeeDrawer from '../add-fee-modal/index.vue';
import AttachmentGroups from './attachment-groups.vue';
import InvoiceTable from './invoice-table.vue';
import {
  INVOICE_PROCESS,
  applyExtractedInvoiceToRows,
  buildInvoiceSubmitPayload,
  createEmptyInvoiceRow,
  mapInvoicesFromDetail,
  validateInvoiceRequiredOnSubmit,
  validateInvoiceRows,
} from './invoice-rows';
import {
  fetchOrderFeesForPaymentApplication,
  notifyPrefillOrderFeesResult,
  parseOrderFeeIdsFromQuery,
} from './prefill-from-order-fee-ids';
import {
  isOriginalCurrencyApplication,
  isSpecifiedCurrencyApplication,
  resolvePodPortDisplayName,
  resolvePolPortDisplayName,
} from '../add-fee-modal/data';
import {
  buildAppliedAmountCurrencyColumns,
  calcAppliedAmountConverted,
  calcAppliedConvertedTotal,
  collectAppliedCurrencies,
  filterOrderGroups,
  formatAmount,
  groupFeesByOrder,
  isAppliedAmountColumnKey,
  isUserRoleColumnKey,
  resolveFeeCurrencyCode,
  summarizeByCurrency,
  useFeeInnerColumns,
  useOrderGroupColumns,
} from './form-data';

/** 从详情结算对象构建 ClientSelect 回显项 */
function toSettlementSelectedItems(
  settlement?: null | PaymentApplicationAdminApi.ClientSimpleDtoForOrder,
  settlementId?: null | string,
): ClientAppApi.ClientSimpleDto[] {
  if (settlement?.id) {
    return [
      {
        fullName: settlement.fullName,
        id: settlement.id,
        name: settlement.name ?? '',
      },
    ];
  }
  if (settlementId) {
    return [{ id: settlementId, name: settlement?.name ?? '' }];
  }
  return [];
}

const t = (key: string, args?: any[]) =>
  $t(`seaExport.export.paymentApplication.${key}`, args as any);

const route = useRoute();
const router = useRouter();
const { closeTabByKey } = useTabs();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const isEdit = computed(() => !!editId.value);
/** 提交/撤销提交后后端审核流可能尚未更新，延迟再拉 */
const WORKFLOW_STATUS_CHANGE_DELAY_MS = 2000;
/** 递增以强制 WorkflowTimeline 重挂载并重新调度拉取 */
const workflowReloadKey = ref(0);
const workflowDelayAfterStatusChange = ref(false);

/** 新增刚保存跳转，或提交/撤销后，工作流实例可能尚未就绪，延迟拉取 */
const workflowLoadDelayMs = computed(() => {
  if (workflowDelayAfterStatusChange.value) {
    return WORKFLOW_STATUS_CHANGE_DELAY_MS;
  }
  return route.query.fromCreate === '1' ? WORKFLOW_STATUS_CHANGE_DELAY_MS : 0;
});

function reloadWorkflowAfterStatusChange() {
  workflowDelayAfterStatusChange.value = true;
  workflowReloadKey.value += 1;
}
const currentStatus = ref<number>(PaymentApplicationStatus.Entering);
/** 录入中或已驳回均可再次提交审核 */
const canSubmit = computed(
  () =>
    currentStatus.value === PaymentApplicationStatus.Entering ||
    currentStatus.value === PaymentApplicationStatus.Rejected,
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

const applicationCreatorName = ref('');
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
/** ClientSelect 编辑回显（详情 settlement） */
const settlementSelectedItems = ref<ClientAppApi.ClientSimpleDto[]>([]);

/** 付费申请 `currencyId`：null=原币申请，有值=指定结算币别 */
const settlementCurrencyId = ref<null | number>(null);
const settlementCurrencyName = ref('');

const paymentRequire = ref('');
const remark = ref('');
const invoiceProcess = ref<number | undefined>(undefined);
const invoiceRows = ref<InvoiceRowForm[]>([]);
/** 发票方式未选时标红 */
const invoiceProcessError = ref(false);
/** 不开票 */
const isNoInvoice = computed(
  () => invoiceProcess.value === INVOICE_PROCESS.NoInvoice,
);

function onInvoiceProcessChange(value: number) {
  invoiceProcess.value = value;
  invoiceProcessError.value = false;
  if (value === INVOICE_PROCESS.NoInvoice) {
    invoiceRows.value = [];
    return;
  }
  if (invoiceRows.value.length === 0) {
    invoiceRows.value = [createEmptyInvoiceRow()];
  }
}

/** 识别结果仅预填表单，不自动保存 */
function applyExtractedInvoice(result: GeminiInvoiceDto) {
  if (isNoInvoice.value) {
    message.warning('当前为不开票，无法填入发票信息');
    return;
  }
  const applied = applyExtractedInvoiceToRows(invoiceRows.value, result);
  if (!applied.ok) {
    message.warning(applied.message);
    return;
  }
  invoiceRows.value = applied.next;
  message.success(applied.message);
}
const attachmentGroup = ref<
  PaymentApplicationAdminApi.AttachmentGroupInputDto[]
>([]);
/** 关联付费结算附件（只读，申请侧不可增删） */
const settlementAttachments = ref<
  PaymentApplicationAdminApi.AttachmentItemDto[]
>([]);

/** 组装 Add/Edit 的 attachmentGroup（仅含有文件的分组） */
function buildAttachmentGroupSubmit(): PaymentApplicationAdminApi.AttachmentGroupInputDto[] {
  return (attachmentGroup.value ?? [])
    .map((group) => ({
      attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
      items: (group.items ?? []).map((item, index) => ({
        attachmentId: Number(item.attachmentId),
        attachmentDtlTypeId:
          item.attachmentDtlTypeId ?? group.attachmentDtlTypeId ?? null,
        clientVisible: item.clientVisible ?? false,
        displayOrder: item.displayOrder ?? index,
        friendlyFileName: item.friendlyFileName,
        url: item.url,
      })),
    }))
    .filter((group) => (group.items?.length ?? 0) > 0);
}

function openSettlementAttachment(
  item: PaymentApplicationAdminApi.AttachmentItemDto,
) {
  openAttachmentViewer(item);
}

const feeDetailRows = ref<FeeDetailRow[]>([]);
const originalFeeDetailRows = ref<FeeDetailRow[]>([]);
const initialLoadFeeIds = ref<Set<string>>(new Set());
const selectedRowKeys = ref<string[]>([]);
/** 详情 currencyGroup 按币别的已核销量（原币） */
const currencySettledAmountMap = ref<Record<number, number>>({});

function getCurrencySettledAmount(currencyId: number): number {
  return currencySettledAmountMap.value[currencyId] ?? 0;
}

function syncCurrencySettledAmounts(
  groups?: PaymentApplicationAdminApi.CurrencyGroupDto[] | null,
) {
  const next: Record<number, number> = {};
  for (const group of groups ?? []) {
    next[group.id] = group.settledAmount ?? 0;
  }
  currencySettledAmountMap.value = next;
}

const orderGroupColumns = useOrderGroupColumns();
const feeInnerColumns = computed(() =>
  useFeeInnerColumns(
    isSpecifiedCurrencyApplication(settlementCurrencyId.value),
  ),
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
const feeFilterNo = ref('');
const feeFilterName = ref<null | number | string>(null);
const feeFilterClient = ref<null | string>(null);
const feeFilterCurrency = ref<null | number | string>(null);
const feeFilterEtd = ref('');
const filteredOrderGroups = computed(() =>
  filterOrderGroups(
    orderGroups.value,
    {
      no: feeFilterNo.value,
      clientId: feeFilterClient.value,
      etd: feeFilterEtd.value,
      feeCodeId: feeFilterName.value,
      currencyId: feeFilterCurrency.value,
      formatEtd: formatDate,
    },
    appliedCurrencies.value,
  ),
);
const expandedGroupKeys = ref<string[]>([]);

function onFeeFilterDateChange(_value: unknown, dateString: string | string[]) {
  feeFilterEtd.value = Array.isArray(dateString)
    ? (dateString[0] ?? '')
    : dateString;
}

const currencySummaries = computed<CurrencySummary[]>(() =>
  summarizeByCurrency(feeDetailRows.value),
);

/** 指定结算币别时的申请金额合计（费用明细「申请金额折币」之和） */
const settlementAppliedConvertedTotal = computed(() =>
  calcAppliedConvertedTotal(feeDetailRows.value),
);

/** 指定结算币别时的已核销量（结算币别口径） */
const settlementSettledAmount = computed(() =>
  settlementCurrencyId.value == null
    ? 0
    : getCurrencySettledAmount(settlementCurrencyId.value),
);

const isSettlementLocked = computed(() => feeDetailRows.value.length > 0);

const isSettlementCurrencyLocked = computed(
  () => feeDetailRows.value.length > 0,
);

const isOriginalSettlementCurrency = computed(() =>
  isOriginalCurrencyApplication(settlementCurrencyId.value),
);

function resolveSettlementCurrencyNameFromSelect(id: number): string {
  const options = currencySelectRef.value?.getOptions?.() ?? [];
  const opt = options.find((o: any) => String(o.value) === String(id));
  return opt?.raw?.code ?? opt?.label ?? '';
}

const settlementCurrencyLockedLabel = computed(() => {
  if (!isSpecifiedCurrencyApplication(settlementCurrencyId.value)) {
    return t('originalCurrency');
  }
  return (
    settlementCurrencyName.value ||
    resolveSettlementCurrencyNameFromSelect(settlementCurrencyId.value!) ||
    'RMB'
  );
});

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

/**
 * 按费用行解析需绑定银行的币别。
 * 新增自动保存时 feeDetailRows 尚未写入 nextRows，必须用入参 rows 计算，否则银行会漏提交。
 */
function resolveBankCurrencies(rows: FeeDetailRow[]): BankCurrencyRow[] {
  if (rows.length === 0) return [];
  if (isOriginalCurrencyApplication(settlementCurrencyId.value)) {
    return summarizeByCurrency(rows).map((cs) => ({
      currencyId: cs.currencyId,
      currencyCode: cs.currencyCode ?? '',
      currencyName: cs.currencyName ?? '',
    }));
  }
  return [
    {
      currencyId: settlementCurrencyId.value!,
      currencyCode: settlementCurrencyName.value,
      currencyName: settlementCurrencyName.value,
    },
  ];
}

/** 需要绑定银行的币别：原币结算=各费用币别；指定币别结算=结算币别 */
const bankCurrencies = computed<BankCurrencyRow[]>(() =>
  resolveBankCurrencies(feeDetailRows.value),
);

function getBankOptions(currencyId: number) {
  return clientBanks.value
    .filter((b) => Number(b.currencyId) === Number(currencyId))
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

function onBankChange(currencyId: number, val: unknown) {
  const bankId = typeof val === 'string' ? val : undefined;
  bankSelections.value = { ...bankSelections.value, [currencyId]: bankId };
}

/** 指定币别结算模式下的银行选择（结算币别） */
const settlementBankValue = computed(() =>
  isOriginalCurrencyApplication(settlementCurrencyId.value)
    ? undefined
    : bankSelections.value[settlementCurrencyId.value!],
);
const settlementBankOptions = computed(() =>
  isOriginalCurrencyApplication(settlementCurrencyId.value)
    ? []
    : getBankOptions(settlementCurrencyId.value!),
);
const settlementSelectedBank = computed(() =>
  isOriginalCurrencyApplication(settlementCurrencyId.value)
    ? undefined
    : getSelectedBank(settlementCurrencyId.value!),
);
function onSettlementBankChange(val: unknown) {
  if (isOriginalCurrencyApplication(settlementCurrencyId.value)) return;
  onBankChange(settlementCurrencyId.value!, val);
}

/** 为缺失/失效的币别选择默认银行（已有有效选择则保留） */
function applyDefaultBankSelections(
  currencies: BankCurrencyRow[] = bankCurrencies.value,
) {
  const next: Record<number, string | undefined> = { ...bankSelections.value };
  for (const c of currencies) {
    const optionsForCur = clientBanks.value.filter(
      (b) => Number(b.currencyId) === Number(c.currencyId),
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

/** 构造提交用银行列表（可按即将写入的费用行币别构造，避免新增时漏带银行） */
function buildBankSubmitList(
  currencies: BankCurrencyRow[] = bankCurrencies.value,
): PaymentApplicationAdminApi.PaymentApplicationBankAddDto[] {
  return currencies
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
  return filteredOrderGroups.value.find((g) => g.key === key);
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
  const currencyId = settlementCurrencyId.value;
  const currencyName =
    settlementCurrencyName.value ||
    (currencyId != null
      ? resolveSettlementCurrencyNameFromSelect(currencyId)
      : '');
  addFeeDrawerRef.value?.open({
    enableInvoiceProcess: true,
    invoiceProcess: invoiceProcess.value,
    settlementId: settlementId.value || undefined,
    settlementName: settlementName.value || undefined,
    settlementCurrencyId: currencyId,
    settlementCurrencyName: currencyName || undefined,
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
          rate: isOriginalCurrencyApplication(settlementCurrencyId.value)
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
    if (!ensureInvoiceRowsValid()) {
      feeDetailRows.value = nextRows;
      return;
    }
    submitting.value = true;
    try {
      // 首次添加费用即创建申请：自动带出结算对象开票默认银行，并随 Add 一并保存
      const feeSettlementId =
        settlementId.value ||
        nextRows.find((r) => r.settlementId)?.settlementId ||
        '';
      if (feeSettlementId) {
        settlementId.value = String(feeSettlementId);
      }
      await loadClientBanks(true);
      const currencies = resolveBankCurrencies(nextRows);
      applyDefaultBankSelections(currencies);
      createdApplicationId = await addPaymentApplication(
        buildSubmitData(nextRows),
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
    const createTabKey = route.fullPath;
    await router.replace({
      path: `/fee-management/payment-application/${createdApplicationId}/edit`,
      query: { fromCreate: '1' },
    });
    await closeTabByKey(createTabKey);
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

function onRateChange(feeId: string, val: unknown) {
  const row = feeDetailRows.value.find((r) => r.feeId === feeId);
  if (!row) return;
  const rate = Number(val);
  row.rate =
    val === null || val === undefined || Number.isNaN(rate) ? undefined : rate;
}

function onItemRemarkChange(feeId: string, val: string) {
  const row = feeDetailRows.value.find((r) => r.feeId === feeId);
  if (row) row.itemRemark = val;
}

function onEndTimeChange(_date: any, dateStr: string | string[]) {
  endTime.value = Array.isArray(dateStr) ? dateStr[0] : dateStr || undefined;
}

function onSettlementChange(val: unknown, option?: unknown) {
  settlementId.value =
    typeof val === 'string' || typeof val === 'number' ? String(val) : '';
  const selectedOption = Array.isArray(option) ? option.at(-1) : option;
  const selectedName =
    selectedOption &&
    typeof selectedOption === 'object' &&
    typeof (selectedOption as { label?: unknown }).label === 'string'
      ? (selectedOption as { label: string }).label
      : '';
  settlementName.value = selectedName;
  settlementSelectedItems.value =
    settlementId.value && selectedName
      ? [{ id: settlementId.value, name: selectedName }]
      : [];
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

/** 新建必须先选发票方式。先票后付可先建单再补票；先付后票可在结算后补录。 */
function ensureInvoiceProcessSelected() {
  if (invoiceProcess.value == null) {
    invoiceProcessError.value = true;
    message.warning('请选择发票方式');
    return false;
  }
  return true;
}

/** 录入阶段：流程必选、票号合法。先票后付允许空票。 */
function ensureInvoiceRowsValid() {
  if (!ensureInvoiceProcessSelected()) return false;
  const result = validateInvoiceRows(invoiceProcess.value, invoiceRows.value);
  if (!result.ok) {
    message.warning(result.message);
    return false;
  }
  return true;
}

/** 提交阶段：先票后付必须已有发票。抽屉确认/保存不走这里。 */
function ensureInvoiceRequiredOnSubmit() {
  const result = validateInvoiceRequiredOnSubmit(
    invoiceProcess.value,
    invoiceRows.value,
  );
  if (!result.ok) {
    message.warning(result.message);
    return false;
  }
  return true;
}

// --- Settlement currency ---

function onSettlementCurrencyChange(val: unknown) {
  if (val === 'original' || val === null || val === undefined) {
    settlementCurrencyId.value = null;
    settlementCurrencyName.value = '';
  } else if (typeof val === 'number' || typeof val === 'string') {
    settlementCurrencyId.value = Number(val);
    nextTick(() => {
      const options = currencySelectRef.value?.getOptions?.() ?? [];
      const opt = options.find((o: any) => String(o.value) === String(val));
      settlementCurrencyName.value = opt?.raw?.code ?? opt?.label ?? '';
    });
  }
}

/** 添加费用抽屉改币别时同步；已有指定币别费用时不允许被改回按票原币 */
function onSettlementCurrencyChangeFromDrawer(val: unknown) {
  if (
    feeDetailRows.value.length > 0 &&
    isSpecifiedCurrencyApplication(settlementCurrencyId.value)
  ) {
    if (val === 'original' || val === null || val === undefined) {
      return;
    }
  }
  onSettlementCurrencyChange(val);
}

// --- Load detail for edit mode ---

function mapDetailToFeeRows(
  detail: PaymentApplicationAdminApi.PaymentApplicationDetailDto,
): FeeDetailRow[] {
  const settlementShortName = detail.settlement?.name ?? '';
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
        clientId: order?.clientId ?? order?.client?.id,
        clientName: order?.client?.name,
        accountDate: order?.accountDate,
        etd: order?.etd,
        polName: order ? resolvePolPortDisplayName(order) : '',
        podName: order ? resolvePodPortDisplayName(order) : '',
        saleUserNames: order?.saleNames?.join('、'),
        operationUserNames: order?.operatorNames?.join('、'),
        customerServiceUserNames: order?.customerServiceNames?.join('、'),
        paySide: fee?.paySide ?? 0,
        feeCodeId: fee?.feeCodeId ?? 0,
        feeCodeName: fee?.feeCode?.cnName,
        currencyId: fee?.currencyId ?? 0,
        currencyCode: resolveFeeCurrencyCode(fee, group.currencyGroup),
        currencyName: fee?.currency?.cnName,
        settlementId: fee?.settlementId ?? '',
        settlementName: settlementShortName || fee?.settlement?.name || '',
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
  if (isOriginalCurrencyApplication(settlementCurrencyId.value)) {
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
    applicationCreatorName.value = detail.creatorUserName ?? '';
    settlementId.value = detail.settlementId ?? '';
    settlementName.value = detail.settlement?.name ?? '';
    settlementSelectedItems.value = toSettlementSelectedItems(
      detail.settlement,
      detail.settlementId,
    );
    settlementCurrencyId.value = detail.currencyId ?? null;
    settlementCurrencyName.value = detail.currency?.code ?? '';

    submitTime.value = detail.submitTime
      ? dayjs(detail.submitTime).format('YYYY-MM-DD HH:mm')
      : dayjs().format('YYYY-MM-DD HH:mm');
    endTime.value = detail.endTime
      ? dayjs(detail.endTime).format('YYYY-MM-DD')
      : undefined;
    paymentRequire.value = detail.require ?? '';
    remark.value = detail.remark ?? '';

    orgId.value = detail.orgId ?? undefined;
    if (detail.orgs?.length) {
      companyName.value = formatOrgPathLabel(detail.orgs) || '-';
    }

    feeDetailRows.value = mapDetailToFeeRows(detail);
    originalFeeDetailRows.value = feeDetailRows.value.map((r) => ({ ...r }));
    initialLoadFeeIds.value = new Set(feeDetailRows.value.map((r) => r.feeId));
    syncCurrencySettledAmounts(detail.currencyGroup);

    await loadClientBanks(true);
    restoreBankSelectionsFromDetail(detail);
    // 详情未带银行（如新增漏提交）时，用开票信息默认账户补齐，避免编辑页银行空白
    applyDefaultBankSelections();

    invoiceProcess.value = detail.invoiceProcess ?? undefined;
    invoiceProcessError.value = false;
    invoiceRows.value =
      invoiceProcess.value === INVOICE_PROCESS.NoInvoice
        ? []
        : mapInvoicesFromDetail(detail.paymentApplicationInvoices);
    if (
      invoiceProcess.value !== INVOICE_PROCESS.NoInvoice &&
      invoiceRows.value.length === 0
    ) {
      invoiceRows.value = [createEmptyInvoiceRow()];
    }
    attachmentGroup.value = (detail.attachmentGroup ?? []).map((group) => ({
      attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
      items: (group.items ?? []).map((item) => ({
        attachmentId: item.attachmentId,
        attachmentDtlTypeId:
          item.attachmentDtlTypeId ?? group.attachmentDtlTypeId ?? null,
        clientVisible: item.clientVisible ?? false,
        displayOrder: item.displayOrder,
        friendlyFileName: item.friendlyFileName,
        url: item.url,
      })),
    }));
    settlementAttachments.value = (detail.paymentSettlements ?? []).flatMap(
      (ps) => ps.attachments ?? [],
    );

    nextTick(() => {
      expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
    });
  } finally {
    pageLoading.value = false;
  }
}

async function prefillFromOrderFeeIds(feeIds: string[]): Promise<boolean> {
  const result = await fetchOrderFeesForPaymentApplication(feeIds);
  if (!notifyPrefillOrderFeesResult(result)) {
    return false;
  }

  const rows: FeeDetailRow[] = result.items.map((item) => ({
    ...item,
    itemRemark: '',
    rate: item.exchangeRate ?? 1,
  }));
  feeDetailRows.value = rows;
  originalFeeDetailRows.value = rows.map((r) => ({ ...r }));

  const first = rows[0];
  if (first?.settlementId) {
    settlementId.value = String(first.settlementId);
    settlementName.value = first.settlementName ?? '';
    settlementSelectedItems.value = [
      { id: first.settlementId, name: first.settlementName ?? '' },
    ];
  }

  nextTick(() => {
    expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
  });
  return true;
}

onMounted(async () => {
  if (isEdit.value) {
    loadEditData();
    return;
  }

  const orderFeeIds = parseOrderFeeIdsFromQuery(route.query);
  if (orderFeeIds.length > 0) {
    pageLoading.value = true;
    try {
      const ok = await prefillFromOrderFeeIds(orderFeeIds);
      if (!ok) {
        nextTick(() => {
          handleOpenAddFee();
        });
      }
    } finally {
      pageLoading.value = false;
    }
    return;
  }

  nextTick(() => {
    handleOpenAddFee();
  });
});

// --- Submit ---

function buildSubmitData(
  rows: FeeDetailRow[] = feeDetailRows.value,
): PaymentApplicationAdminApi.PaymentApplicationAddDto {
  const items: PaymentApplicationAdminApi.PaymentApplicationItemAddDto[] =
    rows.map((row) => ({
      orderFeeId: row.feeId,
      rate: isOriginalCurrencyApplication(settlementCurrencyId.value)
        ? null
        : (row.rate ?? null),
      appliedAmount: row.appliedAmount,
      remark: row.itemRemark,
    }));

  // 必须按入参 rows 解析币别：新增自动保存时 feeDetailRows 可能仍为空
  const banks = buildBankSubmitList(resolveBankCurrencies(rows));

  return {
    id: editId.value || undefined,
    orgId: (orgId.value ?? getMyDefaultOrgId())!,
    endTime: endTime.value ? dayjs(endTime.value).toISOString() : null,
    settlementId: settlementId.value,
    currencyId: settlementCurrencyId.value,
    require: paymentRequire.value || undefined,
    remark: remark.value || undefined,
    invoiceProcess: invoiceProcess.value as number,
    paymentApplicationInvoices: buildInvoiceSubmitPayload(
      invoiceProcess.value,
      invoiceRows.value,
    ),
    paymentApplicationItems: items,
    paymentApplicationBanks: banks.length > 0 ? banks : undefined,
    attachmentGroup: (() => {
      const groups = buildAttachmentGroupSubmit();
      return groups.length > 0 ? groups : undefined;
    })(),
  };
}

async function saveEditMode() {
  const id = editId.value!;

  const banks = buildBankSubmitList();

  await editPaymentApplication({
    id,
    orgId: orgId.value ?? undefined,
    endTime: endTime.value ? dayjs(endTime.value).toISOString() : null,
    require: paymentRequire.value || undefined,
    remark: remark.value || undefined,
    invoiceProcess: invoiceProcess.value as number,
    paymentApplicationInvoices: buildInvoiceSubmitPayload(
      invoiceProcess.value,
      invoiceRows.value,
    ),
    paymentApplicationBanks:
      banks.length > 0
        ? banks.map((b) => ({ clientInvoiceBankId: b.clientInvoiceBankId }))
        : undefined,
    // 编辑全量覆盖：先删后建，始终传 attachmentGroup（可为空数组清空）
    attachmentGroup: buildAttachmentGroupSubmit(),
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
        rate: isOriginalCurrencyApplication(settlementCurrencyId.value)
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
  if (!ensureInvoiceRowsValid()) {
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
      const newId = await addPaymentApplication(buildSubmitData());
      message.success(t('addSuccess'));
      markListShouldRefresh('PaymentApplicationList');
      const createTabKey = route.fullPath;
      await router.replace({
        path: `/fee-management/payment-application/${newId}/edit`,
        query: { fromCreate: '1' },
      });
      await closeTabByKey(createTabKey);
    }
  } finally {
    submitting.value = false;
  }
}

async function handleSubmit() {
  if (!ensureSettlementSelected()) {
    return;
  }
  if (!ensureInvoiceRowsValid()) {
    return;
  }
  if (!ensureInvoiceRequiredOnSubmit()) {
    return;
  }
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    const newId = await addPaymentApplication(buildSubmitData());
    await submitPaymentApplication(String(newId));
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
  if (!ensureInvoiceRowsValid()) {
    return;
  }
  if (!ensureInvoiceRequiredOnSubmit()) {
    return;
  }
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    const newId = await addPaymentApplication(buildSubmitData());
    await submitPaymentApplication(String(newId));
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
  if (!ensureInvoiceRowsValid()) return;
  if (!ensureInvoiceRequiredOnSubmit()) return;
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
    reloadWorkflowAfterStatusChange();
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
    reloadWorkflowAfterStatusChange();
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
  invoiceProcess.value = undefined;
  invoiceProcessError.value = false;
  invoiceRows.value = [];
  attachmentGroup.value = [];
  settlementAttachments.value = [];
  bankSelections.value = {};
  currencySettledAmountMap.value = {};
  applicationCreatorName.value = '';
  submitTime.value = dayjs().format('YYYY-MM-DD HH:mm');
}

function handleExportMenuClick({ key }: any) {
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

// Preserve the alternate add-page actions while the Figma edit layout keeps them hidden.
void pageTitle;
void onItemRemarkChange;
void handleSubmit;
void handleSubmitAndNew;
</script>

<template>
  <Page
    auto-content-height
    class="payment-application-page"
    content-class="!h-auto !p-0"
  >
    <Spin :spinning="pageLoading">
      <div class="payment-app-form">
        <!-- 顶部操作栏 -->
        <div class="action-bar">
          <div class="action-bar__left">
            <span class="action-bar__label">{{ t('applicationNo') }}：</span>
            <span class="action-bar__title">{{ displayApplicationNo }}</span>
          </div>
          <div class="action-bar__right">
            <Space>
              <!-- 新建模式：仅保存 -->
              <template v-if="!isEdit">
                <Button :loading="submitting" @click="handleSave">
                  {{ t('save') }}
                </Button>
              </template>
              <!-- 编辑模式：始终可保存（银行/发票等）；录入中/已驳回可提交 -->
              <template v-if="isEdit">
                <Button :loading="submitting" @click="handleSave">
                  {{ t('save') }}
                </Button>
                <Button
                  v-if="canSubmit"
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
                <IconifyIcon icon="mdi:file-undo-outline" />
                撤销提交
              </Button>
              <Dropdown>
                <Button>
                  <IconifyIcon icon="mdi:file-export-outline" />
                  {{ t('export') }}
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
                <IconifyIcon icon="mdi:printer-outline" />
                {{ t('print') }}
              </Button>
            </Space>
          </div>
        </div>

        <div class="payment-app-form__content">
          <!-- 中间三栏布局 -->
          <div class="main-layout">
            <div class="main-column">
              <!-- 左侧：结算单位 -->
              <div class="left-column">
                <Card size="small" class="settlement-unit-card">
                  <template #title>
                    <div class="settlement-unit-title">
                      <span v-if="isEdit"
                        >结算单位：{{ settlementName || '-' }}</span
                      >
                      <div v-else class="settlement-unit-title__select">
                        <span>结算单位：</span>
                        <ClientSelect
                          :model-value="settlementId"
                          :selected-items="settlementSelectedItems"
                          :placeholder="$t('ui.placeholder.select')"
                          :disabled="isSettlementLocked"
                          size="small"
                          @change="onSettlementChange"
                        />
                      </div>
                    </div>
                  </template>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label info-label--required">{{
                        t('company')
                      }}</span>
                      <MyOrgSelect
                        v-if="!isEdit"
                        v-model="orgId"
                        :disabled="isSettlementLocked"
                      />
                      <span v-else class="info-value">
                        {{ companyName || '-' }}
                      </span>
                    </div>
                    <div class="info-item info-item--latest-payment">
                      <span class="info-label">{{
                        t('latestPaymentDate')
                      }}</span>
                      <DatePicker
                        :value="endTime ? dayjs(endTime) : undefined"
                        class="w-full"
                        @change="onEndTimeChange"
                      />
                    </div>
                    <div class="info-item info-item--payment-require">
                      <span class="info-label">{{ t('require') }}</span>
                      <Input.TextArea
                        :value="paymentRequire"
                        :rows="2"
                        :auto-size="false"
                        class="info-payment-require-input"
                        :placeholder="$t('ui.placeholder.input')"
                        @update:value="(val) => (paymentRequire = val)"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <Card size="small" class="invoice-card">
                <template #title>
                  <div class="invoice-card__title">
                    <div class="section-title">
                      <span
                        class="section-title__icon section-title__icon--violet"
                      >
                        <img :src="invoiceTicketSvg" alt="" />
                      </span>
                      <span class="invoice-process-title">
                        发票方式
                        <span class="invoice-process-title__required">*</span>
                      </span>
                    </div>
                    <div
                      class="invoice-tabs"
                      :class="{ 'invoice-tabs--error': invoiceProcessError }"
                    >
                      <button
                        v-for="option in [
                          { label: '先票后付', value: 0 },
                          { label: '先付后票', value: 1 },
                          { label: '不开票', value: 2 },
                        ]"
                        :key="option.value"
                        type="button"
                        class="invoice-tab"
                        :class="{
                          'invoice-tab--active':
                            invoiceProcess === option.value,
                        }"
                        @click="onInvoiceProcessChange(option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                  </div>
                </template>
                <div class="invoice-card__content">
                  <div
                    v-if="
                      invoiceProcess === INVOICE_PROCESS.InvoiceBeforePayment
                    "
                    class="invoice-hint"
                  >
                    可先保存申请，提交前再补录发票
                  </div>
                  <div
                    class="invoice-fields"
                    :class="{ 'invoice-fields--collapsed': isNoInvoice }"
                  >
                    <InvoiceTable
                      v-model="invoiceRows"
                      :disabled="isNoInvoice"
                    />
                  </div>
                </div>
              </Card>

              <!-- 中部：费用合计 -->
              <div class="center-column">
                <Card size="small" class="settlement-currency-card">
                  <template #title>
                    <div class="settlement-currency-title">
                      <div class="section-title">
                        <span
                          class="section-title__icon section-title__icon--green"
                        >
                          <img :src="coinsHandSvg" alt="" />
                        </span>
                        <span>结算币别</span>
                      </div>
                      <span
                        v-if="isSettlementCurrencyLocked"
                        class="settlement-currency-mode"
                      >
                        🔒
                        {{
                          isSpecifiedCurrencyApplication(settlementCurrencyId)
                            ? `固定币别 · ${settlementCurrencyLockedLabel}`
                            : settlementCurrencyLockedLabel
                        }}
                      </span>
                      <CurrencySelect
                        v-else
                        ref="currencySelectRef"
                        :model-value="settlementCurrencyId"
                        :extra-options="[
                          { label: t('originalCurrency'), value: null },
                        ]"
                        size="small"
                        class="settlement-currency-select"
                        @update:model-value="onSettlementCurrencyChange"
                      />
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
                    <div v-else class="currency-table">
                      <div class="currency-table__head">
                        <span>支付币别</span>
                        <span>申请金额</span>
                        <span>已核销</span>
                        <span>银行账户</span>
                      </div>
                      <div class="currency-cards">
                        <div
                          v-for="cs in currencySummaries"
                          :key="cs.currencyId"
                          class="currency-card"
                        >
                          <div class="currency-card__header">
                            <span class="currency-card__currency">{{
                              cs.currencyCode
                            }}</span>
                            <span class="currency-card__amount">
                              {{ formatAmount(cs.totalAmount) }}
                            </span>
                            <span class="currency-card__amount">
                              {{
                                formatAmount(
                                  getCurrencySettledAmount(cs.currencyId),
                                )
                              }}
                            </span>
                          </div>
                          <div class="bank-block">
                            <div class="bank-block__content">
                              <Select
                                :value="bankSelections[cs.currencyId]"
                                :options="getBankOptions(cs.currencyId)"
                                :loading="bankLoading"
                                size="small"
                                class="bank-block__select"
                                placeholder="请选择银行账户"
                                @update:value="
                                  (v) => onBankChange(cs.currencyId, v)
                                "
                              />
                              <div
                                v-if="getSelectedBank(cs.currencyId)"
                                class="bank-detail"
                              >
                                <div class="bank-detail__row">
                                  <span class="bank-detail__label">开户行</span>
                                  <span class="bank-detail__value">{{
                                    getSelectedBank(cs.currencyId)?.bankName ||
                                    '-'
                                  }}</span>
                                </div>
                                <div class="bank-detail__row">
                                  <span class="bank-detail__label">账号</span>
                                  <span class="bank-detail__value">{{
                                    getSelectedBank(cs.currencyId)
                                      ?.bankAccount || '-'
                                  }}</span>
                                </div>
                                <div class="bank-detail__row">
                                  <span class="bank-detail__label">SWIFT</span>
                                  <span class="bank-detail__value">{{
                                    getSelectedBank(cs.currencyId)?.swiftCode ||
                                    '-'
                                  }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- 指定币别模式：汇总为结算币别一行，金额取申请金额折币合计 -->
                  <template v-else>
                    <div
                      v-if="feeDetailRows.length === 0"
                      class="py-4 text-center text-gray-400"
                    >
                      {{ t('noFeeWarning') }}
                    </div>
                    <div v-else class="settlement-table">
                      <table class="settlement-table__native">
                        <colgroup>
                          <col style="width: 97px" />
                          <col style="width: 96px" />
                          <col style="width: 96px" />
                          <col style="width: 193px" />
                          <col style="width: 118px" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>
                              <span class="settlement-table__currency-head">
                                <Checkbox />
                                支付币别
                              </span>
                            </th>
                            <th>申请金额</th>
                            <th>已核销</th>
                            <th>银行账户</th>
                            <th>银行账号</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <span class="settlement-table__currency-cell">
                                <Checkbox />
                                {{ settlementCurrencyLockedLabel }}
                              </span>
                            </td>
                            <td>
                              {{
                                formatAmount(settlementAppliedConvertedTotal)
                              }}
                            </td>
                            <td>
                              {{ formatAmount(settlementSettledAmount) }}
                            </td>
                            <td class="settlement-table__bank-cell">
                              <div class="settlement-table__bank-field">
                                <Select
                                  :value="settlementBankValue"
                                  :options="settlementBankOptions"
                                  :loading="bankLoading"
                                  size="small"
                                  class="settlement-table__bank-select"
                                  placeholder="请选择银行账户"
                                  @update:value="onSettlementBankChange"
                                />
                                <div
                                  v-if="settlementSelectedBank"
                                  class="bank-detail"
                                >
                                  <div class="bank-detail__row">
                                    <span class="bank-detail__label"
                                      >开户行</span
                                    >
                                    <span class="bank-detail__value">{{
                                      settlementSelectedBank.bankName || '-'
                                    }}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span class="settlement-table__account">
                                {{
                                  settlementSelectedBank?.bankAccount ||
                                  '请输入'
                                }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </template>
                </Card>
              </div>
            </div>

            <!-- 右侧：审核流程与附件 -->
            <div class="right-column">
              <Card size="small" class="workflow-card">
                <template #title>
                  <div class="section-title">
                    <span class="section-title__icon section-title__icon--blue">
                      <img :src="workflowSvg" alt="" />
                    </span>
                    <span>审核流程</span>
                  </div>
                </template>
                <WorkflowTimeline
                  :key="`workflow-${editId}-${workflowReloadKey}`"
                  class="payment-application-workflow"
                  :applicant-name="applicationCreatorName"
                  :application-time="submitTime"
                  :entity-id="editId"
                  :load-delay-ms="workflowLoadDelayMs"
                  :show-header="false"
                />
                <AuditStatusStamp
                  class="status-stamp"
                  :status="currentStatus"
                />
              </Card>

              <Card size="small" class="attachment-card">
                <template #title>
                  <div class="section-title">
                    <span class="section-title__icon section-title__icon--blue">
                      <IconifyIcon icon="mdi:paperclip" />
                    </span>
                    <span>附件</span>
                  </div>
                </template>
                <div class="attachment-card__content">
                  <AttachmentGroups
                    v-model="attachmentGroup"
                    :application-id="editId"
                    @extracted="applyExtractedInvoice"
                  />
                </div>
                <div
                  v-if="settlementAttachments.length > 0"
                  class="settlement-attachments"
                >
                  <div class="settlement-attachments__title">
                    结算附件（只读）
                  </div>
                  <div class="settlement-attachments__list">
                    <button
                      v-for="item in settlementAttachments"
                      :key="item.id || item.attachmentId"
                      type="button"
                      class="settlement-attachments__item"
                      :title="item.friendlyFileName || '附件'"
                      @click="openSettlementAttachment(item)"
                    >
                      <IconifyIcon icon="mdi:file-outline" />
                      <span class="settlement-attachments__name">{{
                        item.friendlyFileName || '附件'
                      }}</span>
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <!-- 费用明细表格 -->
          <Card size="small" class="fee-detail-card">
            <template #title>
              <div class="flex items-center justify-between">
                <div class="section-title">
                  <span class="section-title__icon section-title__icon--orange">
                    <img :src="feePackageSvg" alt="" />
                  </span>
                  <span>{{ t('feeDetail') }}</span>
                </div>
                <div class="fee-detail-actions">
                  <span class="fee-detail-status">
                    共 {{ orderGroups.length }} 票 · 录入状态可增删
                  </span>
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      class="fee-detail-add-btn"
                      @click="handleOpenAddFee"
                    >
                      + {{ t('addFee') }}
                    </Button>
                    <Button
                      v-if="selectedRowKeys.length > 0"
                      danger
                      size="small"
                      @click="handleDeleteSelected"
                    >
                      {{ t('deleteFee') }}
                    </Button>
                  </Space>
                </div>
              </div>
            </template>

            <div class="fee-filter-bar">
              <!-- 勿用 label 包裹 Select：会抢焦点并触发收起，清空远程搜索词 -->
              <div class="fee-filter-field">
                <span>编号</span>
                <Input
                  v-model:value="feeFilterNo"
                  size="small"
                  allow-clear
                  placeholder="请选择"
                />
              </div>
              <div class="fee-filter-field">
                <span>委托单位</span>
                <ClientSelect v-model="feeFilterClient" placeholder="请选择" />
              </div>
              <div class="fee-filter-field">
                <span>开船日期</span>
                <DatePicker
                  size="small"
                  class="w-full"
                  @change="onFeeFilterDateChange"
                />
              </div>
              <div class="fee-filter-field">
                <span>费用名称</span>
                <FeeCodeSelect v-model="feeFilterName" placeholder="请选择" />
              </div>
              <div class="fee-filter-field">
                <span>币别检索</span>
                <CurrencySelect
                  v-model="feeFilterCurrency"
                  placeholder="请选择"
                />
              </div>
            </div>

            <div class="fee-group-table">
              <NestedDataTable
                :columns="allOrderGroupColumns"
                :data-source="filteredOrderGroups"
                fill-height
                :inner-columns="feeInnerColumns"
                inner-data-key="children"
                inner-row-key="feeId"
                row-key="key"
                v-model:expanded-row-keys="expandedGroupKeys"
              >
                <template #outerHeaderCell="{ column }">
                  <span v-if="column.key === 'seq'" class="table-sequence-cell">
                    <Checkbox
                      :checked="isAllSelected"
                      :indeterminate="isIndeterminate"
                      @change="(e) => toggleAllSelection(e.target.checked)"
                    />
                    {{ column.title }}
                  </span>
                  <template v-else>{{ column.title }}</template>
                </template>

                <template #outerBodyCell="{ column, record, index }">
                  <template v-if="column.key === 'seq'">
                    <span class="table-sequence-cell">
                      <Checkbox
                        :checked="isGroupAllSelected(record.key)"
                        :indeterminate="isGroupIndeterminate(record.key)"
                        @change="
                          (e) => toggleGroupSelection(record, e.target.checked)
                        "
                      />
                      {{ index + 1 }}
                    </span>
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
                          getUserRoleCellTextFromRecord(
                            record,
                            column.dataIndex,
                          )
                        }}
                      </span>
                    </Tooltip>
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
                    <Checkbox
                      :checked="isAllSelected"
                      :indeterminate="isIndeterminate"
                      @change="(e) => toggleAllSelection(e.target.checked)"
                    />
                    {{ column.title }}
                  </span>
                  <template v-else>{{ column.title }}</template>
                </template>

                <template #innerBodyCell="{ column, record, index }">
                  <template v-if="column.key === 'seq'">
                    <span class="table-sequence-cell">
                      <Checkbox
                        :checked="isRowSelected(record.feeId)"
                        @change="
                          (e) =>
                            toggleRowSelection(record.feeId, e.target.checked)
                        "
                      />
                      {{ index + 1 }}
                    </span>
                  </template>
                  <template v-else-if="column.key === 'paySide'">
                    <Tag :color="record.paySide === 0 ? 'blue' : 'orange'">
                      {{ getPaySideLabel(record.paySide) }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'currencyCode'">
                    {{ record.currencyCode }}
                  </template>
                  <template v-else-if="column.key === 'amount'">
                    {{ formatAmount(record.amount) }}
                  </template>
                  <template v-else-if="column.key === 'exchangeRate'">
                    {{ record.exchangeRate }}
                  </template>
                  <template v-else-if="column.key === 'settledAmount'">
                    {{ formatAmount(record.settledAmount) }}
                  </template>
                  <template v-else-if="column.key === 'appliedAmount'">
                    <span class="fee-applied-amount-value">{{
                      formatAmount(record.appliedAmount)
                    }}</span>
                  </template>
                  <template v-else-if="column.key === 'appliedAmountConverted'">
                    {{
                      formatAmount(
                        calcAppliedAmountConverted(
                          record.appliedAmount,
                          record.rate,
                        ),
                      )
                    }}
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
              </NestedDataTable>
            </div>

            <div class="fee-detail-bottom">
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
                    <Tag color="blue" size="small">{{ cs.currencyCode }}</Tag>
                    <strong>{{ formatAmount(cs.totalAmount) }}</strong>
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <!-- 添加费用抽屉 -->
      <AddFeeDrawer
        ref="addFeeDrawerRef"
        @confirm="handleFeeConfirm"
        @update:invoice-process="onInvoiceProcessChange"
        @update:settlement-currency-id="onSettlementCurrencyChangeFromDrawer"
        @update:settlement-id="onSettlementIdSync"
      />
    </Spin>
  </Page>
</template>

<style scoped>
.payment-app-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  padding-bottom: 48px;
  color: #1f2937;
  background: #f8f8f8;
}

.payment-app-form__content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 10px;
}

.payment-app-form :deep(.ant-card) {
  border: 0;
  border-radius: 16px;
  box-shadow: 0 0 10px rgb(0 0 0 / 2%);
}

.payment-app-form :deep(.ant-card-head) {
  min-height: 42px;
  padding: 0 14px;
  border-bottom-color: #eef2f6;
}

.payment-app-form :deep(.ant-card-head-title) {
  padding: 10px 0;
  font-size: 13px;
}

.payment-app-form :deep(.ant-card-body) {
  padding: 14px;
}

.action-bar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 8px 14px;
  background: #fff;
  border-bottom: 1px solid #edf0f3;
  border-radius: 0;
  box-shadow: none;
}

.action-bar__left {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-bar__label {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.action-bar__title {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.action-bar :deep(.ant-btn) {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 13px;
  font-size: 12px;
  border-color: #d1d5dc;
  border-radius: 8px;
  box-shadow: none;
}

.action-bar__right :deep(.ant-space) {
  gap: 4px !important;
}

.action-bar :deep(.ant-btn .iconify) {
  width: 12px;
  height: 12px;
}

.main-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 356px;
  gap: 10px;
  align-items: stretch;
}

.main-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 0;
}

.left-column {
  flex: 0 0 auto;
  min-width: 0;
}

.center-column {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 356px;
}

.fee-detail-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 650px;
  overflow: hidden;
}

.fee-detail-card :deep(.ant-card-head) {
  flex-shrink: 0;
  min-height: 60px;
  padding: 0 16px;
}

.fee-detail-card :deep(.ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: calc(100% - 60px);
  min-height: 0;
  padding: 16px;
  overflow: hidden;
}

.fee-detail-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.fee-detail-actions :deep(.ant-btn) {
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  border-color: #d1d5dc;
  border-radius: 8px;
  box-shadow: none;
}

.fee-detail-actions :deep(.fee-detail-add-btn.ant-btn-primary) {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  border-color: #1677ff;
  box-shadow: 0 1px 2px rgb(22 119 255 / 24%);
}

.fee-detail-status {
  font-size: 11px;
  font-weight: 400;
  color: #9ca3af;
}

.settlement-unit-title,
.settlement-currency-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.settlement-unit-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 16px;
  color: #111827;
}

.settlement-unit-title__select {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 360px;
}

.settlement-unit-title__select :deep(.ant-select) {
  flex: 1;
}

.settlement-unit-card :deep(.ant-card-body) {
  padding: 12px 14px;
}

.info-grid {
  display: grid;
  grid-template-rows: auto auto;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px 32px;
  align-items: stretch;
}

.info-grid > .info-item:first-child {
  grid-row: 1;
  grid-column: 1;
}

.info-item {
  display: grid;
  grid-template-columns: 91px minmax(0, 1fr);
  gap: 0;
  align-items: center;
  min-height: 32px;
}

.info-label {
  font-size: 12px;
  color: #7c8798;
  white-space: nowrap;
}

.info-label--required::after {
  margin-left: 2px;
  color: #ef4444;
  content: '*';
}

.info-item--payment-require {
  grid-template-columns: 71px minmax(0, 1fr);
  grid-row: 1 / span 2;
  grid-column: 2;
  align-items: stretch;
  align-self: stretch;
  min-height: 0;
}

.info-item--payment-require :deep(.ant-input-textarea) {
  display: flex;
  flex: 1;
  min-height: 0;
}

.info-item--payment-require :deep(textarea.info-payment-require-input) {
  flex: 1;
  height: 100% !important;
  min-height: 72px;
  padding-top: 4px;
  padding-bottom: 4px;
  line-height: 22px;
  resize: none;
  background: #fff !important;
}

.info-item--latest-payment {
  grid-row: 2;
  grid-column: 1;
}

.info-value {
  min-height: 28px;
  font-size: 12px;
  line-height: 28px;
  color: #1f2937;
}

.info-item:not(.info-item--payment-require) :deep(.ant-input),
.info-item :deep(.ant-input-affix-wrapper),
.info-item :deep(.ant-picker),
.info-item :deep(.ant-select-selector) {
  font-size: 12px !important;
  background: #fff !important;
  border-color: #e4e8ee !important;
  border-radius: 8px !important;
  box-shadow: none !important;
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.section-title__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 13px;
  border-radius: 8px;
}

.section-title__icon img {
  display: block;
  width: 16px;
  height: 16px;
}

.section-title__icon--blue {
  color: #4263eb;
  background: #e9efff;
}

.section-title__icon--violet {
  color: #7656d6;
  background: #f0ecff;
}

.section-title__icon--orange {
  color: #ff7a2f;
  background: #fff0e7;
}

.section-title__icon--green {
  color: #24a871;
  background: #eaf9f1;
}

.settlement-currency-select {
  width: 160px;
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

.settlement-currency-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.settlement-currency-card :deep(.ant-card-head) {
  flex-shrink: 0;
}

.settlement-currency-card :deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  padding: 16px 10px 14px;
}

.workflow-card {
  position: relative;
  height: 296px;
  overflow: hidden;
}

.workflow-card :deep(.ant-card-body) {
  height: calc(100% - 48px);
  overflow: auto;
}

.payment-application-workflow {
  min-height: 100%;
}

.status-stamp {
  position: absolute;
  top: 18px;
  right: 18px;
}

.invoice-card {
  min-width: 0;
}

.invoice-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.invoice-card__title {
  display: flex;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.invoice-card__content {
  display: block;
}

.invoice-hint {
  margin-bottom: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.invoice-process-title {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

.invoice-process-title__required {
  color: #ef4444;
}

.invoice-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  width: min(100%, 360px);
  padding: 3px;
  background: #f7f8fa;
  border: 1px solid transparent;
  border-radius: 7px;
}

.invoice-tabs--error {
  background: #fef2f2;
  border-color: #fca5a5;
}

.invoice-tab {
  padding: 4px 6px;
  font-size: 11px;
  color: #4b5563;
  text-align: center;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;
}

.invoice-tab:disabled {
  cursor: default;
}

.invoice-tab--active {
  color: #111827;
  background: #fff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 8%);
}

.invoice-fields {
  max-height: 280px;
  margin-top: 0;
  overflow: hidden auto;
  opacity: 1;
  transition:
    max-height 0.28s ease,
    opacity 0.2s ease,
    margin-top 0.28s ease;
}

@media (max-width: 640px) {
  .invoice-card__title {
    gap: 8px;
    align-items: flex-start;
  }

  .invoice-tabs {
    flex: 1;
    width: auto;
  }
}

.invoice-fields--collapsed {
  max-height: 0;
  margin-top: 0;
  pointer-events: none;
  opacity: 0;
}

.attachment-card {
  display: flex;
  flex: 0 0 200px;
  flex-direction: column;
  height: 200px;
  min-height: 0;
}

.attachment-card :deep(.ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 4px 16px 16px;
}

.attachment-card__content,
.attachment-card__content :deep(.payment-attachment-groups),
.attachment-card__content :deep(.ant-spin-nested-loading),
.attachment-card__content :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.attachment-card__content :deep(.attachment-type-grid) {
  flex: 1;
  height: 100%;
  min-height: 0;
  max-height: none;
}

.attachment-card__content :deep(.attachment-group) {
  height: 100%;
  min-height: 0;
  transition: height 0.28s ease;
}

.settlement-attachments {
  flex-shrink: 0;
  margin-top: 8px;
}

.settlement-attachments__title {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #657286;
}

.settlement-attachments__list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  max-height: 56px;
  overflow-y: auto;
}

.settlement-attachments__item {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  max-width: 100%;
  padding: 2px 6px;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  background: #f8fafc;
  border: 1px solid #e5e9ef;
  border-radius: 4px;
}

.settlement-attachments__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invoice-document {
  height: 97px;
  padding: 8px;
  overflow: hidden;
  font-size: 11px;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
}

.invoice-document--upload :deep(.file-upload-input) {
  margin-top: 4px;
  transform: scale(0.75);
  transform-origin: top left;
}

.currency-table {
  overflow: hidden;
  border: 1px solid #edf1f5;
  border-radius: 10px;
}

.currency-table__head,
.currency-card {
  display: grid;
  grid-template-columns: 80px 100px 100px minmax(180px, 1fr);
  gap: 10px;
  align-items: center;
}

.currency-table__head {
  height: 34px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 500;
  color: #657286;
  background: #f2f7fc;
  border-bottom: 1px solid #d4e4f4;
}

.currency-cards {
  display: grid;
  gap: 0;
}

.currency-card {
  min-width: 0;
  padding: 9px 12px;
  background: #fff;
  border: 0;
  border-bottom: 1px solid #d4e4f4;
  border-radius: 0;
}

.currency-card:last-child {
  border-bottom: 0;
}

.currency-card__header {
  display: contents;
}

.currency-card__currency {
  display: flex;
  align-items: center;
  height: 24px;
  font-size: 12px;
  line-height: 20px;
  color: #1f2937;
}

.currency-card__amount {
  font-size: 12px;
  font-weight: 500;
  color: #1f2937;
}

.bank-block {
  display: contents;
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

.bank-block__content {
  display: flex;
  gap: 20px;
  align-items: center;
  min-width: 0;
}

.bank-block__select {
  flex: 0 0 260px;
  width: 260px;
}

.bank-detail {
  display: flex;
  gap: 20px;
  align-items: center;
  min-width: 0;
}

.settlement-table {
  overflow: auto;
}

.settlement-table__native {
  width: 100%;
  min-width: 837px;
  table-layout: fixed;
  border-spacing: 0;
  border-collapse: separate;
}

.settlement-table__native th,
.settlement-table__native td {
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid #d4e4f4;
}

.settlement-table__native th {
  height: 35px;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  background: #f9fafb;
}

.settlement-table__native td {
  height: 52px;
  font-size: 12px;
  color: #1f2937;
}

.settlement-table__native tbody tr:last-child td {
  border-bottom: 0;
}

.settlement-table__currency-head,
.settlement-table__currency-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.settlement-table__account {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  color: #9ca3af;
  background: #fbfcfd;
  border: 1px solid #e4e8ee;
  border-radius: 8px;
}

.settlement-table__bank-cell {
  white-space: normal;
}

.settlement-table__bank-field {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
  padding: 6px 0;
}

.settlement-table__bank-select {
  flex: 1 1 120px;
  min-width: 120px;
}

.settlement-table__native :deep(.ant-select) {
  width: 100%;
}

.bank-detail__row {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
}

.bank-detail__label {
  flex-shrink: 0;
  color: #8c8c8c;
}

.bank-detail__value {
  overflow: hidden;
  text-overflow: ellipsis;
  color: #262626;
  white-space: nowrap;
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

.fee-filter-bar {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px 32px;
  padding: 0 0 16px;
}

.fee-filter-field {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 0;
  align-items: center;
  min-width: 0;
  min-height: 32px;
  font-size: 12px;
  color: #657286;
}

.fee-filter-field:nth-child(1),
.fee-filter-field:nth-child(4) {
  grid-template-columns: 54px minmax(0, 1fr);
}

.fee-filter-field :deep(.ant-input),
.fee-filter-field :deep(.ant-input-affix-wrapper),
.fee-filter-field :deep(.ant-picker),
.fee-filter-field :deep(.ant-select-selector) {
  min-height: 32px !important;
  font-size: 12px !important;
  background: #fff !important;
  border-color: #e5e9ef !important;
  border-radius: 8px !important;
  box-shadow: none !important;
}

.fee-group-table :deep(.user-role-column) {
  max-width: 72px;
}

.fee-group-table {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.table-sequence-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.fee-group-table .ellipsis-cell {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fee-group-table :deep(.fee-applied-amount-cell) {
  padding-right: 8px !important;
}

.fee-applied-amount-value {
  font-weight: 600;
  color: #1677ff;
}

.fee-detail-bottom {
  flex-shrink: 0;
  margin-top: auto;
}

.fee-group-table :deep(.fee-applied-amount-input .ant-input-number-input) {
  font-weight: 600;
  color: #1677ff;
}

.fee-group-table :deep(.ant-input-number-input) {
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
  font-size: 12px;
  color: #8792a2;
}

@media (max-width: 1200px) {
  .main-layout {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  .main-column {
    width: 100%;
  }

  .center-column {
    flex: none;
  }

  .settlement-currency-card {
    flex: none;
  }

  .right-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }
}

@media (max-width: 720px) {
  .action-bar {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .right-column {
    display: flex;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-grid > .info-item:first-child {
    grid-column: 1;
  }

  .info-grid > .info-item:first-child,
  .info-item--payment-require,
  .info-item--latest-payment {
    grid-row: auto;
    grid-column: 1;
  }

  .info-item--payment-require :deep(textarea.info-payment-require-input) {
    height: auto !important;
    min-height: 64px;
  }
}
</style>
