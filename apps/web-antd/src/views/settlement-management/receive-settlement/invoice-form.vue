<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';
import dayjs, { type Dayjs } from 'dayjs';

import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { MyOrgSelect } from '#/adapter/component';
import { getBankStatementDetailByPermission } from '#/api/settlement-management/bank-statement-admin';
import {
  addReceiveSettlementByInvoiceApplication,
  addReceiveSettlementItemsByInvoiceApplication,
  deleteReceiveSettlement,
  deleteReceiveSettlementInvoiceItems,
  editReceiveSettlement,
  getReceiveSettlementDetail,
  lockReceiveSettlement,
  unlockReceiveSettlement,
} from '#/api/settlement-management/receive-settlement-admin';
import { NestedDataTable } from '#/components/nested-data-table';
import { formatOrgPathLabel } from '#/composables/use-all-user-org';
import { getMyDefaultOrgId, getMyOrgPath } from '#/composables/use-my-org';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import AddInvoiceApplicationDrawer from './add-invoice-application-drawer/index.vue';
import {
  invoiceIssueFeeKey,
  type SelectedInvoiceFee,
} from './add-invoice-application-drawer/data';
import BankStatementPicker from './bank-statement-picker/index.vue';
import {
  formatAmount,
  formatAmountWithCurrency,
  formatDateTime,
  getPaySideColor,
  getPaySideLabel,
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
} from './form-data';
import {
  hasSharedOrderFee,
  isNotableDiff,
  isSettledAmountWithinQuota,
  settledAmountBounds,
  settledAmountQuotaMessage,
  SHARED_FEE_QUOTA_HINT,
  suggestInvoiceActualSettled,
} from './settlement-amount';

/** 收费核销变更后，收费核销列表与银行流水列表均需刷新 */
function markReceiveSettlementRelatedListsShouldRefresh() {
  markListShouldRefresh('ReceiveSettlementList');
  markListShouldRefresh('BankStatementList');
}

interface InvoiceSettlementItem {
  _key: string;
  /** 是否属于当前正在编辑的核销单，只有本单明细可增删改 */
  _isCurrent: boolean;
  /** 所属核销单号，仅其他核销单的明细有值 */
  _settlementNo?: string;
  /** 所属核销单创建人，仅其他核销单的明细有值 */
  _creatorUserName?: string;
  id?: string;
  invoiceIssueId: string;
  orderFeeId: string;
  applicationNo?: string;
  invoiceNo?: string;
  invoiceIssueTime?: string;
  appliedAmount?: number;
  exchangeRate?: null | number;
  paySide?: number;
  transportOrderId?: string;
  commissionNum?: string;
  mblNum?: string;
  bookingNum?: string;
  clientName?: string;
  feeCodeName?: string;
  currencyCode?: string;
  amount?: number;
  invoiceSettleableAmount?: number;
  settlementName?: string;
  /** 用户录入的本次结算金额（费用原币） */
  settledAmount: number;
  remark?: string;
}

const UNBOUND_INVOICE_ISSUE_LABEL = '无发票开出（已冲红解绑）';

interface InvoiceFeeRow {
  _key: string;
  _isCurrent: boolean;
  /** 按费用核销摊进来的行，没有开票金额 */
  _fromFeeSettlement?: boolean;
  invoiceIssueId: null | string;
  orderFeeId: string;
  commissionNum?: string;
  mblNum?: string;
  feeCodeName?: string;
  paySide?: number;
  currencyCode?: string;
  amount?: number;
  appliedAmount?: null | number;
  settledAmount: number;
  exchangeRate?: null | number;
  originalSettledAmount?: null | number;
  remark?: string;
}

interface InvoiceIssueGroupRow {
  _key: string;
  _isCurrent: boolean;
  _settlementNo?: string;
  _creatorUserName?: string;
  _fromFeeSettlement?: boolean;
  invoiceIssueId: null | string;
  applicationNo?: string;
  invoiceNo?: string;
  invoiceIssueTime?: string;
  currencyCode?: string;
  originalSettledAmount?: null | number;
  items: InvoiceFeeRow[];
}

const route = useRoute();
const router = useRouter();
const { closeTabByKey } = useTabs();
const props = defineProps<{
  embedded?: boolean;
  embeddedId?: string;
}>();
const emit = defineEmits<{
  close: [];
  changed: [];
}>();
const perm = createAbpPermission('Admin.ReceiveSettlement');
const extraPerm = {
  lock: 'Admin.ReceiveSettlement.Lock',
  unlock: 'Admin.ReceiveSettlement.Unlock',
};
const { hasAccessByCodes } = useAccess();

const editId = computed<string | undefined>(() => {
  if (props.embeddedId) return props.embeddedId;
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const isEdit = computed(() => !!editId.value);

const pageLoading = ref(false);
const submitting = ref(false);
const actionLoading = ref(false);
const bankPickerRef = ref<InstanceType<typeof BankStatementPicker>>();
const addInvoiceDrawerRef =
  ref<InstanceType<typeof AddInvoiceApplicationDrawer>>();

const bankStatementId = ref('');
const bankStatementNo = ref('');
const bankStatementSettlementId = ref<string>();
const bankStatementSettlementName = ref('');
const bankStatementDetail =
  ref<BankStatementAdminApi.BankStatementDetailDto | null>(null);
const bankStatementSummaryLoading = ref(false);
const otherSettledAmount = ref(0);
const settlementNo = ref('');
const status = ref(0);
const locked = ref(false);
const lockeTime = ref<string>();
const creatorUserName = ref('');
const orgId = ref<number | undefined>(getMyDefaultOrgId());
const settlementTime = ref<Dayjs>(dayjs());
const remark = ref('');
const items = ref<InvoiceSettlementItem[]>([]);
const sharedFeeQuotaHint = computed(() =>
  hasSharedOrderFee(items.value) ? SHARED_FEE_QUOTA_HINT : '',
);
const issueGroups = ref<InvoiceIssueGroupRow[]>([]);
const actualSettled = ref<number | null>(null);
const actualSettledTouched = ref(false);
const originalSettledAmount = ref<number | null>(null);
const diffAmount = ref<number | null>(null);
const selectedItemRowKeys = ref<string[]>([]);
const selectedFeeKeys = ref<string[]>([]);
const expandedIssueKeys = ref<Array<number | string>>([]);
const seenIssueKeys = new Set<string>();
const deleteAmountOpen = ref(false);
const deleteActualSettled = ref<number | null>(null);
const pendingDeleteItems = ref<
  ReceiveSettlementAdminApi.ReceiveSettlementByInvoiceKeyDto[]
>([]);

const orgDisplayName = computed(
  () => formatOrgPathLabel(getMyOrgPath(orgId.value)) || '-',
);

let rowKeyCounter = 0;
const makeRowKey = () => `receive_inv_${++rowKeyCounter}_${Date.now()}`;

const isReadonly = computed(() => isEdit.value && locked.value);
const canSave = computed(() => {
  if (isReadonly.value) return false;
  return isEdit.value
    ? hasAccessByCodes([perm.edit])
    : hasAccessByCodes([perm.add]);
});
const canEditItems = computed(
  () => isEdit.value && !isReadonly.value && hasAccessByCodes([perm.edit]),
);
const canManageItems = computed(
  () => !isReadonly.value && (!isEdit.value || canEditItems.value),
);
const canDelete = computed(
  () => isEdit.value && !isReadonly.value && hasAccessByCodes([perm.delete]),
);
const canLock = computed(
  () => isEdit.value && !locked.value && hasAccessByCodes([extraPerm.lock]),
);
const canUnlock = computed(
  () => isEdit.value && locked.value && hasAccessByCodes([extraPerm.unlock]),
);
const pageTitle = computed(() => {
  if (!isEdit.value) return '新建发票结算';
  return isReadonly.value ? '查看发票结算' : '编辑发票结算';
});

function handleBack() {
  if (props.embedded) {
    emit('close');
    return;
  }
  router.back();
}

const selectedInvoiceItemIds = computed(() =>
  items.value.map((item) =>
    invoiceIssueFeeKey(item.invoiceIssueId, item.orderFeeId),
  ),
);

const bankStatementCurrencyCode = computed(
  () => bankStatementDetail.value?.currency?.code || '',
);

const suggestedActualSettled = computed(() =>
  suggestInvoiceActualSettled(
    items.value.map((item) => ({
      settledAmount: item.settledAmount || 0,
      exchangeRate: item.exchangeRate,
      paySide: item.paySide,
    })),
  ),
);

watch(suggestedActualSettled, (value) => {
  if (isEdit.value || actualSettledTouched.value) return;
  actualSettled.value = value;
});

/** 本单本次结算认输入框；流水剩余可结算也按它扣 */
const currentSettlementTotal = computed(() => actualSettled.value ?? 0);

const remainingSettleAmount = computed(
  () =>
    (bankStatementDetail.value?.amount ?? 0) -
    otherSettledAmount.value -
    currentSettlementTotal.value,
);

const isRemainingOverLimit = computed(() => remainingSettleAmount.value < 0);

function formatBankAmount(value: number | undefined | null) {
  return formatAmountWithCurrency(value, bankStatementCurrencyCode.value);
}

function formatOptionalAmount(value: number | null | undefined) {
  if (value === undefined || value === null) return '-';
  return formatAmount(value);
}

function formatExchangeRate(value: number | null | undefined) {
  if (value === undefined || value === null) return '-';
  return value.toFixed(6);
}

function issueKeyPart(issueId: null | string | undefined) {
  return issueId == null || issueId === '' ? 'unbound' : String(issueId);
}

function mapInvoiceFeeRow(
  fee: ReceiveSettlementAdminApi.ReceiveSettlementInvoiceFeeDto,
  groupKey: string,
  invoiceIssueId: null | string,
  isCurrent: boolean,
): InvoiceFeeRow {
  const orderFee = fee.orderFee;
  const order = fee.transportOrder;
  return {
    _key: `${groupKey}::${fee.orderFeeId}`,
    _isCurrent: isCurrent,
    invoiceIssueId,
    orderFeeId: fee.orderFeeId,
    commissionNum: order?.commissionNum,
    mblNum: order?.mblNum,
    feeCodeName: orderFee?.feeCode?.cnName,
    paySide: orderFee?.paySide,
    currencyCode: orderFee?.currency?.code,
    amount: orderFee?.amount,
    appliedAmount: fee.appliedAmount,
    settledAmount: fee.settledAmount,
    exchangeRate: fee.exchangeRate,
    originalSettledAmount: fee.originalSettledAmount,
    remark: fee.remark || '',
  };
}

function mapInvoiceIssueGroup(
  issue: ReceiveSettlementAdminApi.ReceiveSettlementInvoiceIssueDto,
  ownerId: string,
  isCurrent: boolean,
  settlementNoText?: string,
  creatorName?: string,
): InvoiceIssueGroupRow {
  const invoiceIssueId =
    issue.id == null || issue.id === '' ? null : String(issue.id);
  const unbound = invoiceIssueId == null;
  const groupKey = `${ownerId}::${issueKeyPart(invoiceIssueId)}`;
  return {
    _key: groupKey,
    _isCurrent: isCurrent,
    _settlementNo: settlementNoText,
    _creatorUserName: creatorName,
    invoiceIssueId,
    applicationNo: unbound
      ? UNBOUND_INVOICE_ISSUE_LABEL
      : issue.applicationNo || '-',
    invoiceNo: issue.invoiceNo,
    invoiceIssueTime: issue.invoiceIssueTime,
    currencyCode: issue.currency?.code,
    originalSettledAmount: issue.originalSettledAmount,
    items: (issue.items ?? []).map((fee) =>
      mapInvoiceFeeRow(fee, groupKey, invoiceIssueId, isCurrent),
    ),
  };
}

/** 同一流水上的按费用核销，收成一组只读行，避免从发票结算页里消失 */
function mapFeeSettlementGroup(
  settlement: BankStatementAdminApi.BankStatementReceiveSettlementDto,
): InvoiceIssueGroupRow {
  const groupKey = `fee::${settlement.id}`;
  return {
    _key: groupKey,
    _isCurrent: false,
    _fromFeeSettlement: true,
    _settlementNo: settlement.settlementNo || settlement.id,
    _creatorUserName:
      settlement.creatorUserNickName || settlement.creatorUserName || '',
    invoiceIssueId: null,
    applicationNo: '按费用核销',
    originalSettledAmount: settlement.originalSettledAmount,
    items: (settlement.receiveSettlementItems ?? []).map((item) => {
      const orderFee = item.orderFee;
      const order = item.transportOrder;
      return {
        _key: `${groupKey}::${item.id}`,
        _isCurrent: false,
        _fromFeeSettlement: true,
        invoiceIssueId: null,
        orderFeeId: item.orderFeeId,
        commissionNum: order?.commissionNum,
        mblNum: order?.mblNum,
        feeCodeName: orderFee?.feeCode?.cnName,
        paySide: orderFee?.paySide,
        currencyCode: orderFee?.currency?.code,
        amount: orderFee?.amount,
        settledAmount: item.settledAmount,
        exchangeRate: item.exchangeRate,
        originalSettledAmount: item.originalSettledAmount,
        remark: item.remark || '',
      };
    }),
  };
}

/** 同一银行流水下其他核销单，按发票开出分组；按费用核销单独成组 */
const foreignIssueGroups = computed<InvoiceIssueGroupRow[]>(() => {
  const settlements = bankStatementDetail.value?.receiveSettlements ?? [];
  return settlements
    .filter((settlement) => settlement.id !== editId.value)
    .flatMap((settlement) => {
      const settlementNoText = settlement.settlementNo || settlement.id;
      const creator =
        settlement.creatorUserNickName || settlement.creatorUserName || '';
      const invoiceGroups = (settlement.invoiceIssues ?? []).map((issue) =>
        mapInvoiceIssueGroup(
          issue,
          settlement.id,
          false,
          settlementNoText,
          creator,
        ),
      );
      const feeGroup = mapFeeSettlementGroup(settlement);
      return feeGroup.items.length > 0
        ? [...invoiceGroups, feeGroup]
        : invoiceGroups;
    });
});

const savedIssueGroups = computed<InvoiceIssueGroupRow[]>(() => [
  ...issueGroups.value,
  ...foreignIssueGroups.value,
]);

const currentFeeRows = computed(() =>
  issueGroups.value.flatMap((group) => group.items),
);

const foreignFeeCount = computed(() =>
  foreignIssueGroups.value.reduce((sum, group) => sum + group.items.length, 0),
);

function flattenGroupFee(
  group: InvoiceIssueGroupRow,
  fee: InvoiceFeeRow,
): InvoiceSettlementItem {
  return {
    _key: fee._key,
    _isCurrent: false,
    _settlementNo: group._settlementNo,
    _creatorUserName: group._creatorUserName,
    invoiceIssueId: fee.invoiceIssueId ? String(fee.invoiceIssueId) : '',
    orderFeeId: fee.orderFeeId,
    applicationNo: group.applicationNo,
    invoiceNo: group.invoiceNo,
    invoiceIssueTime: group.invoiceIssueTime,
    appliedAmount: fee.appliedAmount ?? undefined,
    exchangeRate: fee.exchangeRate,
    paySide: fee.paySide,
    commissionNum: fee.commissionNum,
    mblNum: fee.mblNum,
    feeCodeName: fee.feeCodeName,
    currencyCode: fee.currencyCode,
    amount: fee.amount ?? 0,
    settledAmount: fee.settledAmount,
    remark: fee.remark || '',
  };
}

/** 新建页仍是平表，他单明细从发票开出分组摊平进来 */
const foreignItems = computed<InvoiceSettlementItem[]>(() =>
  foreignIssueGroups.value.flatMap((group) =>
    group.items.map((fee) => flattenGroupFee(group, fee)),
  ),
);

const tableItems = computed<InvoiceSettlementItem[]>(() => [
  ...items.value,
  ...foreignItems.value,
]);

const itemRowSelection = computed(() => {
  if (!canManageItems.value) return undefined;
  return {
    selectedRowKeys: selectedItemRowKeys.value,
    getCheckboxProps: (record: InvoiceSettlementItem) => ({
      disabled: !record._isCurrent,
    }),
    onChange: (keys: (string | number)[]) => {
      selectedItemRowKeys.value = keys.map(String);
    },
  };
});

function itemRowClassName(record: InvoiceSettlementItem) {
  return record._isCurrent ? '' : 'settlement-row--foreign';
}

const columns = [
  {
    dataIndex: '_settlementNo',
    key: 'ownerSettlementNo',
    title: '核销单号',
    width: 140,
  },
  {
    dataIndex: 'applicationNo',
    title: '开出单号',
    width: 160,
  },
  {
    dataIndex: 'invoiceNo',
    title: '发票号',
    width: 140,
  },
  {
    dataIndex: 'commissionNum',
    title: '委托编号',
    width: 140,
  },
  {
    dataIndex: 'mblNum',
    title: '主提单号',
    width: 140,
  },
  {
    dataIndex: 'feeCodeName',
    title: '费用名称',
    minWidth: 140,
  },
  {
    dataIndex: 'paySide',
    key: 'paySide',
    title: '收付',
    width: 80,
  },
  {
    dataIndex: 'currencyCode',
    title: '币别',
    width: 80,
  },
  {
    dataIndex: 'amount',
    title: '费用总额',
    width: 110,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'appliedAmount',
    title: '开票金额',
    width: 110,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    title: '汇率',
    width: 110,
  },
  {
    dataIndex: 'settledAmount',
    key: 'settledAmount',
    title: '本次结算金额',
    width: 150,
  },
  {
    dataIndex: 'settlementName',
    title: '结算对象',
    minWidth: 140,
  },
  {
    dataIndex: '_creatorUserName',
    key: 'ownerCreator',
    title: '创建人',
    width: 110,
  },
  {
    dataIndex: 'remark',
    key: 'remark',
    title: '备注',
    minWidth: 160,
  },
];

const issueGroupColumns = [
  {
    key: 'ownerSettlementNo',
    dataIndex: 'applicationNo',
    title: '核销单号',
    width: 140,
  },
  {
    key: 'applicationNo',
    dataIndex: 'applicationNo',
    title: '开出单号',
    width: 180,
  },
  { key: 'invoiceNo', dataIndex: 'invoiceNo', title: '发票号', width: 180 },
  {
    key: 'invoiceIssueTime',
    dataIndex: 'invoiceIssueTime',
    title: '开票时间',
    width: 150,
  },
  { key: 'currencyCode', dataIndex: 'currencyCode', title: '币别', width: 80 },
  {
    key: 'originalSettledAmount',
    dataIndex: 'originalSettledAmount',
    title: '原始结算金额',
    width: 140,
    align: 'right' as const,
  },
  {
    key: 'ownerCreator',
    dataIndex: '_creatorUserName',
    title: '创建人',
    width: 110,
  },
];

const issueFeeColumns = computed(() => {
  const feeColumns: Array<{
    align?: 'right';
    dataIndex?: string;
    key: string;
    title: string;
    width?: number;
  }> = [];
  if (canManageItems.value) {
    feeColumns.push({ key: 'checkbox', title: '', width: 46 });
  }
  feeColumns.push(
    {
      key: 'commissionNum',
      dataIndex: 'commissionNum',
      title: '委托编号',
      width: 140,
    },
    { key: 'mblNum', dataIndex: 'mblNum', title: '主提单号', width: 140 },
    {
      key: 'feeCodeName',
      dataIndex: 'feeCodeName',
      title: '费用名称',
      width: 140,
    },
    { key: 'paySide', dataIndex: 'paySide', title: '收付', width: 80 },
    {
      key: 'currencyCode',
      dataIndex: 'currencyCode',
      title: '费用币别',
      width: 90,
    },
    {
      key: 'appliedAmount',
      dataIndex: 'appliedAmount',
      title: '开票金额',
      width: 110,
      align: 'right',
    },
    {
      key: 'settledAmount',
      dataIndex: 'settledAmount',
      title: '结算金额',
      width: 110,
      align: 'right',
    },
    {
      key: 'exchangeRate',
      dataIndex: 'exchangeRate',
      title: '汇率',
      width: 120,
      align: 'right',
    },
    {
      key: 'originalSettledAmount',
      dataIndex: 'originalSettledAmount',
      title: '原始结算金额',
      width: 130,
      align: 'right',
    },
    { key: 'remark', dataIndex: 'remark', title: '备注', width: 160 },
  );
  return feeColumns;
});

watch(savedIssueGroups, (groups) => {
  const alive = new Set(groups.map((group) => group._key));
  const fresh = groups.filter((group) => !seenIssueKeys.has(group._key));
  for (const group of fresh) seenIssueKeys.add(group._key);
  expandedIssueKeys.value = [
    ...expandedIssueKeys.value.filter((key) => alive.has(String(key))),
    ...fresh.map((group) => group._key),
  ];
});

function isFeeChecked(fee: InvoiceFeeRow) {
  return selectedFeeKeys.value.includes(fee._key);
}

function selectableFees(group: InvoiceIssueGroupRow) {
  return group.items.filter((fee) => fee._isCurrent);
}

function isGroupAllChecked(group: InvoiceIssueGroupRow) {
  const fees = selectableFees(group);
  return fees.length > 0 && fees.every((fee) => isFeeChecked(fee));
}

function isGroupIndeterminate(group: InvoiceIssueGroupRow) {
  const fees = selectableFees(group);
  const checked = fees.filter((fee) => isFeeChecked(fee)).length;
  return checked > 0 && checked < fees.length;
}

function toggleFee(fee: InvoiceFeeRow, checked: boolean) {
  if (!fee._isCurrent) return;
  if (checked) {
    if (!selectedFeeKeys.value.includes(fee._key)) {
      selectedFeeKeys.value = [...selectedFeeKeys.value, fee._key];
    }
    return;
  }
  selectedFeeKeys.value = selectedFeeKeys.value.filter(
    (key) => key !== fee._key,
  );
}

function toggleGroup(group: InvoiceIssueGroupRow, checked: boolean) {
  const keys = new Set(selectedFeeKeys.value);
  for (const fee of selectableFees(group)) {
    if (checked) keys.add(fee._key);
    else keys.delete(fee._key);
  }
  selectedFeeKeys.value = [...keys];
}

async function loadBankStatementSummary(id: string) {
  bankStatementSummaryLoading.value = true;
  try {
    const detail = await getBankStatementDetailByPermission(id);

    bankStatementId.value = detail.id;
    bankStatementNo.value = detail.bankStatementNo || detail.id;
    bankStatementSettlementId.value = detail.settlementId;
    bankStatementSettlementName.value = detail.settlement?.name || '';
    bankStatementDetail.value = detail;
    // 与明细表的他单行同源，避免汇总数字和列表对不上
    otherSettledAmount.value = (detail.receiveSettlements ?? [])
      .filter((settlement) => settlement.id !== editId.value)
      .reduce((sum, settlement) => sum + (settlement.actualSettled || 0), 0);
  } finally {
    bankStatementSummaryLoading.value = false;
  }
}

async function loadEditData() {
  if (!editId.value) return;
  pageLoading.value = true;
  try {
    const detail = await getReceiveSettlementDetail(editId.value);
    bankStatementId.value = detail.bankStatementId;
    bankStatementNo.value = detail.bankStatementNo || detail.bankStatementId;
    settlementNo.value = detail.settlementNo || '';
    status.value = detail.status;
    locked.value = detail.locked;
    lockeTime.value = detail.lockeTime;
    creatorUserName.value =
      detail.creatorUserNickName || detail.creatorUserName || '';
    orgId.value = detail.orgId ?? undefined;
    settlementTime.value = detail.settlementTime
      ? dayjs(detail.settlementTime)
      : dayjs();
    remark.value = detail.remark || '';
    actualSettled.value = detail.actualSettled ?? null;
    actualSettledTouched.value = false;
    originalSettledAmount.value = detail.originalSettledAmount ?? null;
    diffAmount.value = detail.diffAmount ?? null;
    const ownerId = detail.id;
    issueGroups.value = (detail.invoiceIssues ?? [])
      .map((issue) => mapInvoiceIssueGroup(issue, ownerId, true))
      .filter((group) => group.items.length > 0);
    items.value = [];
    selectedItemRowKeys.value = [];
    selectedFeeKeys.value = [];

    if (detail.bankStatementId) {
      try {
        await loadBankStatementSummary(detail.bankStatementId);
      } catch {
        // 详情已返回流水号时，补充摘要失败不阻断编辑页。
      }
    }
  } finally {
    pageLoading.value = false;
  }
}

function mapSelectedFee(fee: SelectedInvoiceFee): InvoiceSettlementItem {
  return {
    _key: makeRowKey(),
    _isCurrent: true,
    invoiceIssueId: fee.invoiceIssueId,
    orderFeeId: fee.orderFeeId,
    applicationNo: fee.applicationNo,
    invoiceNo: fee.invoiceNo,
    invoiceIssueTime: fee.invoiceIssueTime,
    appliedAmount: fee.appliedAmount,
    exchangeRate: fee.exchangeRate,
    paySide: fee.paySide,
    transportOrderId: fee.transportOrderId,
    commissionNum: fee.commissionNum,
    mblNum: fee.mblNum,
    bookingNum: fee.bookingNum,
    clientName: fee.clientName,
    feeCodeName: fee.feeCodeName,
    currencyCode: fee.currencyCode,
    amount: fee.amount,
    invoiceSettleableAmount: fee.invoiceSettleableAmount,
    settlementName: fee.settlementName,
    settledAmount: fee.settledAmount,
    remark: fee.remark || '',
  };
}

async function handleSelectBankStatement(
  row: BankStatementAdminApi.BankStatementListDto,
) {
  if (items.value.length > 0) {
    message.warning('已有结算明细时不能更换银行流水');
    return;
  }

  try {
    await loadBankStatementSummary(row.id);
  } catch (error: any) {
    message.error(error.message || '加载银行流水信息失败');
  }
}

function handleOpenBankPicker() {
  if (isEdit.value || isReadonly.value) return;
  if (items.value.length > 0) {
    message.warning('已有结算明细时不能更换银行流水');
    return;
  }
  bankPickerRef.value?.open();
}

function handleOpenAddInvoice() {
  if (!bankStatementId.value) {
    message.warning('请先选择银行流水');
    return;
  }
  if (!bankStatementSettlementId.value) {
    message.warning('当前银行流水未关联结算对象');
    return;
  }
  const currencyId = bankStatementDetail.value?.currencyId;
  addInvoiceDrawerRef.value?.open({
    receiveSettlementId: editId.value,
    settlementId: bankStatementSettlementId.value,
    settlementName: bankStatementSettlementName.value,
    currencyId,
    currencyCode: bankStatementDetail.value?.currency?.code,
    selectedItemIds: selectedInvoiceItemIds.value,
  });
}

async function handleInvoiceConfirm(fees: SelectedInvoiceFee[]) {
  const existingIds = new Set(
    items.value.map((item) =>
      invoiceIssueFeeKey(item.invoiceIssueId, item.orderFeeId),
    ),
  );
  const incoming = fees.filter(
    (fee) =>
      !existingIds.has(invoiceIssueFeeKey(fee.invoiceIssueId, fee.orderFeeId)),
  );
  if (incoming.length === 0) {
    message.warning('选择的费用已在明细中');
    return;
  }

  if (isEdit.value && editId.value) {
    if (actualSettled.value == null) {
      message.warning('请先在结算信息里填写本次结算，再重新添加费用');
      return;
    }

    const appendSuggest = suggestInvoiceActualSettled(
      incoming.map((fee) => ({
        settledAmount: fee.settledAmount,
        exchangeRate: fee.exchangeRate,
        paySide: fee.paySide,
      })),
    );
    let nextActualSettled = actualSettled.value;
    if (!actualSettledTouched.value && appendSuggest != null) {
      nextActualSettled = (originalSettledAmount.value ?? 0) + appendSuggest;
      actualSettled.value = nextActualSettled;
    }

    submitting.value = true;
    try {
      await addReceiveSettlementItemsByInvoiceApplication({
        id: editId.value,
        actualSettled: nextActualSettled,
        items: incoming.map((fee) => ({
          invoiceIssueId: fee.invoiceIssueId,
          orderFeeId: fee.orderFeeId,
          settledAmount: fee.settledAmount,
          remark: fee.remark || undefined,
        })),
      });
      message.success('添加明细成功');
      await loadEditData();
      markReceiveSettlementRelatedListsShouldRefresh();
      emit('changed');
    } catch (error: any) {
      message.error(error.message || '添加明细失败');
    } finally {
      submitting.value = false;
    }
    return;
  }

  items.value = [...items.value, ...incoming.map((fee) => mapSelectedFee(fee))];
  selectedItemRowKeys.value = [];
}

function updateItemRemark(key: string, value: string | undefined) {
  items.value = items.value.map((item) =>
    item._key === key ? { ...item, remark: value || '' } : item,
  );
}

function handleDeleteSelectedItems() {
  if (!canManageItems.value) return;

  if (isEdit.value && editId.value) {
    const selectedFees = currentFeeRows.value.filter((fee) =>
      selectedFeeKeys.value.includes(fee._key),
    );
    if (selectedFees.length === 0) {
      message.warning('请先选择要删除的明细');
      return;
    }
    const payload = selectedFees.map((fee) => ({
      invoiceIssueId: fee.invoiceIssueId,
      orderFeeId: fee.orderFeeId,
    }));
    if (currentFeeRows.value.length - selectedFees.length > 0) {
      pendingDeleteItems.value = payload;
      deleteActualSettled.value = actualSettled.value;
      deleteAmountOpen.value = true;
      return;
    }
    const content =
      selectedFees.length === 1
        ? `确定要删除费用「${selectedFees[0]?.feeCodeName || '-'}」吗？删除后这张结算单的本次结算会变为 0。`
        : `确定要删除选中的 ${selectedFees.length} 条明细吗？删除后这张结算单的本次结算会变为 0。`;
    Modal.confirm({
      title: '确认删除明细',
      content,
      okType: 'danger',
      onOk: () => submitDeleteInvoiceItems(payload),
    });
    return;
  }

  if (selectedItemRowKeys.value.length === 0) {
    message.warning('请先选择要删除的明细');
    return;
  }

  const selectedItems = items.value.filter((item) =>
    selectedItemRowKeys.value.includes(item._key),
  );
  if (selectedItems.length === 0) return;

  const content =
    selectedItems.length === 1
      ? `确定要删除费用「${selectedItems[0]?.feeCodeName || '-'}」吗？`
      : `确定要删除选中的 ${selectedItems.length} 条明细吗？`;

  Modal.confirm({
    title: '确认删除明细',
    content,
    okType: 'danger',
    onOk: () => {
      const selectedKeySet = new Set(selectedItemRowKeys.value);
      items.value = items.value.filter(
        (item) => !selectedKeySet.has(item._key),
      );
      selectedItemRowKeys.value = [];
    },
  });
}

async function submitDeleteInvoiceItems(
  deleteItems: ReceiveSettlementAdminApi.ReceiveSettlementByInvoiceKeyDto[],
  nextActualSettled?: number,
) {
  if (!editId.value || deleteItems.length === 0) return;
  submitting.value = true;
  try {
    await deleteReceiveSettlementInvoiceItems({
      id: editId.value,
      actualSettled: nextActualSettled,
      items: deleteItems,
    });
    message.success('删除明细成功');
    deleteAmountOpen.value = false;
    pendingDeleteItems.value = [];
    selectedFeeKeys.value = [];
    await loadEditData();
    markReceiveSettlementRelatedListsShouldRefresh();
    emit('changed');
  } catch (error: any) {
    message.error(error.message || '删除明细失败');
    return Promise.reject(error);
  } finally {
    submitting.value = false;
  }
}

async function confirmDeleteWithAmount() {
  if (pendingDeleteItems.value.length === 0) return;
  if (deleteActualSettled.value == null) {
    message.warning('请填写本次结算');
    return Promise.reject(new Error('本次结算不能为空'));
  }
  await submitDeleteInvoiceItems(
    pendingDeleteItems.value,
    deleteActualSettled.value,
  );
}

function validateForm(): boolean {
  if (!bankStatementId.value) {
    message.warning('请选择银行流水');
    return false;
  }
  if (!orgId.value || orgId.value <= 0) {
    message.warning(
      isEdit.value ? '归属组织缺失，请刷新后重试' : '请选择归属组织',
    );
    return false;
  }
  if (!settlementTime.value) {
    message.warning('请选择结算时间');
    return false;
  }
  if (!isEdit.value && items.value.length === 0) {
    message.warning('结算明细不能为空');
    return false;
  }

  const invalidItem = items.value.find((item) => {
    const amount = Number(item.settledAmount);
    if (!Number.isFinite(amount) || amount === 0) return true;
    if (item.id) return false;
    return !isSettledAmountWithinQuota(amount, item.invoiceSettleableAmount);
  });
  if (invalidItem) {
    message.warning(
      settledAmountQuotaMessage(
        invalidItem.feeCodeName,
        invalidItem.invoiceSettleableAmount,
      ),
    );
    return false;
  }

  if (
    (!isEdit.value || currentFeeRows.value.length > 0) &&
    actualSettled.value == null
  ) {
    message.warning('请填写本次结算');
    return false;
  }

  if (bankStatementDetail.value && remainingSettleAmount.value < 0) {
    const availableAmount =
      bankStatementDetail.value.amount - otherSettledAmount.value;
    message.warning(
      `本单结算合计 ${formatBankAmount(currentSettlementTotal.value)} 已超过流水剩余可结算金额 ${formatBankAmount(availableAmount)}`,
    );
    return false;
  }

  return true;
}

async function handleSave() {
  if (!canSave.value || !validateForm()) return;

  submitting.value = true;
  try {
    if (isEdit.value && editId.value) {
      await editReceiveSettlement({
        id: editId.value,
        orgId: orgId.value!,
        settlementTime: settlementTime.value.toISOString(),
        actualSettled:
          currentFeeRows.value.length > 0 ? actualSettled.value! : 0,
        remark: remark.value || undefined,
      });
      message.success('保存成功');
      markReceiveSettlementRelatedListsShouldRefresh();
      await loadEditData();
      emit('changed');
      return;
    }

    const id = await addReceiveSettlementByInvoiceApplication({
      orgId: orgId.value!,
      bankStatementId: bankStatementId.value,
      settlementTime: settlementTime.value.toISOString(),
      actualSettled: actualSettled.value!,
      remark: remark.value || undefined,
      items: items.value.map((item) => ({
        invoiceIssueId: item.invoiceIssueId,
        orderFeeId: item.orderFeeId,
        settledAmount: item.settledAmount,
        remark: item.remark || undefined,
      })),
    });
    message.success('新建成功');
    markReceiveSettlementRelatedListsShouldRefresh();
    emit('changed');
    if (props.embedded) {
      emit('close');
      return;
    }
    const createTabKey = route.fullPath;
    await router.replace(
      `/settlement-management/receive-settlement/edit-by-invoice/${id}`,
    );
    await closeTabByKey(createTabKey);
  } catch (error: any) {
    message.error(error.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function handleDelete() {
  if (!editId.value || !canDelete.value) return;

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除发票结算「${settlementNo.value || editId.value}」吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        await deleteReceiveSettlement({ id: editId.value! });
        message.success('删除成功');
        markReceiveSettlementRelatedListsShouldRefresh();
        emit('changed');
        if (props.embedded) {
          emit('close');
          return;
        }
        router.push('/settlement-management/receive-settlement');
      } catch (error: any) {
        message.error(error.message || '删除失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

function handleLock() {
  if (!editId.value || !canLock.value) return;

  Modal.confirm({
    title: '确认锁定',
    content: `确定要锁定发票结算「${settlementNo.value || editId.value}」吗？锁定后将无法编辑和删除。`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await lockReceiveSettlement({ id: editId.value! });
        message.success('锁定成功');
        markReceiveSettlementRelatedListsShouldRefresh();
        await loadEditData();
        emit('changed');
      } catch (error: any) {
        message.error(error.message || '锁定失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

function handleUnlock() {
  if (!editId.value || !canUnlock.value) return;

  Modal.confirm({
    title: '确认解锁',
    content: `确定要解锁发票结算「${settlementNo.value || editId.value}」吗？`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await unlockReceiveSettlement({ id: editId.value! });
        message.success('解锁成功');
        markReceiveSettlementRelatedListsShouldRefresh();
        await loadEditData();
        emit('changed');
      } catch (error: any) {
        message.error(error.message || '解锁失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

async function initAddPage() {
  const rawId = route.query.bankStatementId;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return;

  pageLoading.value = true;
  try {
    await loadBankStatementSummary(String(id));
  } catch (error: any) {
    message.error(error.message || '加载银行流水失败');
  } finally {
    pageLoading.value = false;
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  } else {
    initAddPage();
  }
});
</script>

<template>
  <Page :title="pageTitle">
    <template #extra>
      <Space>
        <Button v-if="!embedded" @click="handleBack">返回</Button>
        <Button
          v-if="canSave"
          type="primary"
          :loading="submitting"
          @click="handleSave"
        >
          保存
        </Button>
        <Button v-if="canLock" :loading="actionLoading" @click="handleLock">
          锁定
        </Button>
        <Button v-if="canUnlock" :loading="actionLoading" @click="handleUnlock">
          解锁
        </Button>
        <Button
          v-if="canDelete"
          danger
          :loading="actionLoading"
          @click="handleDelete"
        >
          删除
        </Button>
      </Space>
    </template>

    <div v-loading="pageLoading" class="receive-settlement-form">
      <div
        class="form-info-layout"
        :class="{
          'form-info-layout--single': !(bankStatementId && bankStatementDetail),
        }"
      >
        <Card
          v-if="bankStatementId && bankStatementDetail"
          title="银行流水信息"
          size="small"
          class="form-info-layout__panel form-panel-card"
        >
          <div v-loading="bankStatementSummaryLoading">
            <Descriptions :column="2" size="small" bordered>
              <DescriptionsItem label="流水号">
                {{
                  bankStatementDetail.bankStatementNo || bankStatementDetail.id
                }}
              </DescriptionsItem>
              <DescriptionsItem label="交易时间">
                {{ formatDateTime(bankStatementDetail.statementTime) }}
              </DescriptionsItem>
              <DescriptionsItem label="总金额">
                <span class="bank-amount bank-amount--total">
                  {{ formatBankAmount(bankStatementDetail.amount) }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem label="币别">
                <Tag v-if="bankStatementDetail.currency?.code">
                  {{ bankStatementDetail.currency?.code }}
                </Tag>
                <span v-else>-</span>
              </DescriptionsItem>
              <DescriptionsItem label="付款方">
                {{ bankStatementDetail.settlement?.name || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="我司银行">
                {{
                  bankStatementDetail.orgBankAccount?.bankName ||
                  bankStatementDetail.orgBankAccount?.accountName ||
                  '-'
                }}
              </DescriptionsItem>
              <DescriptionsItem label="交易备注" :span="2">
                {{ bankStatementDetail.statementRemark || '-' }}
              </DescriptionsItem>
            </Descriptions>

            <div class="bank-summary-row bank-summary-row--compact">
              <div class="bank-summary-item">
                <span class="bank-summary-label">已结算（不含本单）</span>
                <span class="bank-summary-value bank-summary-value--settled">
                  {{ formatBankAmount(otherSettledAmount) }}
                </span>
              </div>
              <div class="bank-summary-item">
                <span class="bank-summary-label">剩余可结算</span>
                <span
                  class="bank-summary-value"
                  :class="
                    isRemainingOverLimit
                      ? 'bank-summary-value--remaining-danger'
                      : 'bank-summary-value--remaining'
                  "
                >
                  {{ formatBankAmount(remainingSettleAmount) }}
                </span>
                <span v-if="isRemainingOverLimit" class="bank-summary-warning">
                  本单结算合计已超过流水剩余可结算金额
                </span>
              </div>
              <div class="bank-summary-item">
                <span class="bank-summary-label">本单本次合计</span>
                <span class="bank-summary-value bank-summary-value--current">
                  {{ formatBankAmount(currentSettlementTotal) }}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="结算信息"
          size="small"
          class="form-info-layout__panel form-panel-card"
        >
          <div
            class="form-grid"
            :class="{
              'form-grid--compact': bankStatementId && bankStatementDetail,
            }"
          >
            <div class="form-item">
              <div class="form-label">银行流水</div>
              <div class="form-control">
                <Input
                  :value="bankStatementNo"
                  placeholder="请选择银行流水"
                  readonly
                  :class="{ 'bank-input--clickable': !isEdit && !isReadonly }"
                  @click="handleOpenBankPicker"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="form-label">
                归属组织
                <span v-if="!isEdit" class="form-required-mark">*</span>
              </div>
              <div class="form-control">
                <MyOrgSelect
                  v-if="!isEdit"
                  v-model="orgId"
                  placeholder="请选择归属组织"
                />
                <span v-else class="form-text">{{ orgDisplayName }}</span>
              </div>
            </div>
            <div class="form-item">
              <div class="form-label">结算单号</div>
              <div class="form-control">
                <span class="form-text">{{ settlementNo || '-' }}</span>
              </div>
            </div>
            <div class="form-item">
              <div class="form-label">结算类型</div>
              <div class="form-control">
                <Tag color="purple">按开票申请</Tag>
              </div>
            </div>
            <div class="form-item">
              <div class="form-label">创建人</div>
              <div class="form-control">
                <span class="form-text">{{ creatorUserName || '-' }}</span>
              </div>
            </div>
            <div class="form-item">
              <div class="form-label">结算时间</div>
              <div class="form-control">
                <DatePicker
                  v-model:value="settlementTime"
                  show-time
                  format="YYYY-MM-DD HH:mm"
                  :disabled="isReadonly"
                  style="width: 100%"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="form-label">
                本次结算
                <span v-if="!isReadonly" class="form-required-mark">*</span>
              </div>
              <div class="form-control">
                <InputNumber
                  v-if="!isReadonly"
                  v-model:value="actualSettled"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="
                    bankStatementCurrencyCode
                      ? `银行流水币别 ${bankStatementCurrencyCode}`
                      : '银行流水币别金额'
                  "
                  @update:value="actualSettledTouched = true"
                />
                <span v-else class="form-text">{{
                  formatBankAmount(actualSettled)
                }}</span>
                <div
                  v-if="!isEdit && !isReadonly && items.length > 0"
                  class="actual-settled-hint"
                >
                  <template v-if="suggestedActualSettled != null">
                    参考
                    {{
                      formatBankAmount(suggestedActualSettled)
                    }}（保存后可能差约 1 分）
                  </template>
                  <template v-else>
                    <span class="missing-rate">缺汇率，请手工填写本次结算</span>
                  </template>
                </div>
              </div>
            </div>
            <div v-if="isEdit" class="form-item">
              <div class="form-label">原始金额</div>
              <div class="form-control">
                <span class="form-text">{{
                  formatOptionalAmount(originalSettledAmount)
                }}</span>
                <span
                  v-if="
                    originalSettledAmount == null && currentFeeRows.length > 0
                  "
                  class="missing-rate"
                >
                  缺汇率
                </span>
              </div>
            </div>
            <div v-if="isEdit" class="form-item">
              <div class="form-label">差值</div>
              <div class="form-control">
                <span
                  class="form-text"
                  :class="{ 'diff-amount--warn': isNotableDiff(diffAmount) }"
                >
                  {{ formatOptionalAmount(diffAmount) }}
                </span>
              </div>
            </div>
            <div v-if="isEdit" class="form-item">
              <div class="form-label">结算状态</div>
              <div class="form-control">
                <Tag :color="getReceiveSettlementStatusColor(status)">
                  {{ getReceiveSettlementStatusLabel(status) }}
                </Tag>
              </div>
            </div>
            <div v-if="isEdit" class="form-item">
              <div class="form-label">锁定状态</div>
              <div class="form-control">
                <Space>
                  <Tag :color="locked ? 'red' : 'green'">
                    {{ locked ? '已锁定' : '未锁定' }}
                  </Tag>
                  <span v-if="lockeTime">{{ formatDateTime(lockeTime) }}</span>
                </Space>
              </div>
            </div>
            <div class="form-item form-item--wide form-item--align-top">
              <div class="form-label">备注</div>
              <div class="form-control">
                <Input.TextArea
                  v-model:value="remark"
                  :disabled="isReadonly"
                  :rows="3"
                  placeholder="请输入备注"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card size="small" class="mt-3">
        <template #title>
          <Space size="small">
            <span>开票结算明细</span>
            <span v-if="foreignFeeCount > 0" class="settlement-items-hint">
              含本流水下其他核销单明细 {{ foreignFeeCount }} 条（只读）
            </span>
            <span v-if="sharedFeeQuotaHint" class="settlement-items-hint">
              {{ sharedFeeQuotaHint }}
            </span>
          </Space>
        </template>
        <template v-if="canManageItems" #extra>
          <Space size="small">
            <Button size="small" @click="handleOpenAddInvoice">
              <IconifyIcon icon="mdi:plus" class="toolbar-btn-icon" />
              添加明细
            </Button>
            <Button
              size="small"
              danger
              :disabled="
                (isEdit
                  ? selectedFeeKeys.length
                  : selectedItemRowKeys.length) === 0
              "
              @click="handleDeleteSelectedItems"
            >
              <IconifyIcon icon="mdi:delete-outline" class="toolbar-btn-icon" />
              删除
            </Button>
          </Space>
        </template>

        <NestedDataTable
          v-if="isEdit"
          :columns="issueGroupColumns"
          :data-source="savedIssueGroups"
          :inner-columns="issueFeeColumns"
          inner-data-key="items"
          :inner-row-key="(record) => record._key"
          row-key="_key"
          :max-height="560"
          v-model:expanded-row-keys="expandedIssueKeys"
        >
          <template #outerBodyCell="{ column, record }">
            <template v-if="column.key === 'ownerSettlementNo'">
              <Tag v-if="record._isCurrent" color="blue">本单</Tag>
              <span v-else>{{ record._settlementNo || '-' }}</span>
            </template>
            <template v-else-if="column.key === 'applicationNo'">
              {{ record.applicationNo || '-' }}
            </template>
            <template v-else-if="column.key === 'invoiceNo'">
              {{ record.invoiceNo || '-' }}
            </template>
            <template v-else-if="column.key === 'invoiceIssueTime'">
              {{
                record._fromFeeSettlement
                  ? '-'
                  : formatDateTime(record.invoiceIssueTime)
              }}
            </template>
            <template v-else-if="column.key === 'currencyCode'">
              <Tag v-if="record.currencyCode">{{ record.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'originalSettledAmount'">
              {{ formatOptionalAmount(record.originalSettledAmount) }}
              <span
                v-if="record.originalSettledAmount == null"
                class="missing-rate"
              >
                缺汇率
              </span>
            </template>
            <template v-else-if="column.key === 'ownerCreator'">
              {{
                record._isCurrent
                  ? creatorUserName || '-'
                  : record._creatorUserName || '-'
              }}
            </template>
          </template>

          <template #innerHeaderCell="{ column, parentRecord }">
            <template v-if="column.key === 'checkbox'">
              <Checkbox
                v-if="parentRecord?._isCurrent"
                :checked="isGroupAllChecked(parentRecord)"
                :indeterminate="isGroupIndeterminate(parentRecord)"
                @change="
                  (event) => toggleGroup(parentRecord, event.target.checked)
                "
              />
            </template>
            <template v-else>{{ column.title }}</template>
          </template>

          <template #innerBodyCell="{ column, record: fee }">
            <template v-if="column.key === 'checkbox'">
              <Checkbox
                :checked="isFeeChecked(fee)"
                :disabled="!fee._isCurrent"
                @change="(event) => toggleFee(fee, event.target.checked)"
              />
            </template>
            <template v-else-if="column.key === 'paySide'">
              <Tag :color="getPaySideColor(fee.paySide)">
                {{ getPaySideLabel(fee.paySide) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'currencyCode'">
              <Tag v-if="fee.currencyCode">{{ fee.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'appliedAmount'">
              {{
                fee._fromFeeSettlement
                  ? '-'
                  : formatOptionalAmount(fee.appliedAmount)
              }}
            </template>
            <template v-else-if="column.key === 'settledAmount'">
              {{ formatAmount(fee.settledAmount) }}
            </template>
            <template v-else-if="column.key === 'exchangeRate'">
              {{ formatExchangeRate(fee.exchangeRate) }}
              <span v-if="fee.exchangeRate == null" class="missing-rate">
                缺汇率
              </span>
            </template>
            <template v-else-if="column.key === 'originalSettledAmount'">
              {{ formatOptionalAmount(fee.originalSettledAmount) }}
            </template>
            <template v-else-if="column.key === 'remark'">
              {{ fee.remark || '-' }}
            </template>
            <template v-else>
              {{ fee[column.dataIndex] || '-' }}
            </template>
          </template>
        </NestedDataTable>

        <Table
          v-else
          :columns="columns"
          :data-source="tableItems"
          :pagination="false"
          :row-key="(record) => record._key"
          :row-selection="itemRowSelection"
          :row-class-name="itemRowClassName"
          size="small"
          bordered
          :scroll="{ x: 1750 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'ownerSettlementNo'">
              <Tag v-if="record._isCurrent" color="blue">本单</Tag>
              <span v-else>{{ record._settlementNo || '-' }}</span>
            </template>
            <template v-else-if="column.key === 'ownerCreator'">
              <span>
                {{
                  record._isCurrent
                    ? creatorUserName || '-'
                    : record._creatorUserName || '-'
                }}
              </span>
            </template>
            <template v-else-if="column.key === 'paySide'">
              <Tag :color="getPaySideColor(record.paySide)">
                {{ getPaySideLabel(record.paySide) }}
              </Tag>
            </template>
            <template v-else-if="column.dataIndex === 'currencyCode'">
              <Tag v-if="record.currencyCode">{{ record.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'exchangeRate'">
              {{ formatExchangeRate(record.exchangeRate) }}
              <span
                v-if="record._isCurrent && record.exchangeRate == null"
                class="missing-rate"
              >
                缺汇率
              </span>
            </template>
            <template v-else-if="column.key === 'settledAmount'">
              <InputNumber
                v-if="record._isCurrent && !record.id && !isReadonly"
                v-model:value="record.settledAmount"
                :min="settledAmountBounds(record.invoiceSettleableAmount).min"
                :max="settledAmountBounds(record.invoiceSettleableAmount).max"
                :precision="2"
                style="width: 130px"
              />
              <span v-else>{{ formatAmount(record.settledAmount) }}</span>
            </template>
            <template v-else-if="column.key === 'remark'">
              <Input
                v-if="record._isCurrent && !record.id && !isReadonly"
                :value="record.remark"
                placeholder="备注"
                @change="
                  (event) => updateItemRemark(record._key, event.target.value)
                "
              />
              <span v-else>{{ record.remark || '-' }}</span>
            </template>
          </template>
        </Table>
      </Card>
    </div>

    <BankStatementPicker
      ref="bankPickerRef"
      @select="handleSelectBankStatement"
    />
    <AddInvoiceApplicationDrawer
      ref="addInvoiceDrawerRef"
      @confirm="handleInvoiceConfirm"
    />
    <Modal
      v-model:open="deleteAmountOpen"
      title="填写删除后的本次结算"
      ok-text="确认删除"
      :confirm-loading="submitting"
      @ok="confirmDeleteWithAmount"
    >
      <p class="delete-amount-hint">
        删除后这张收费结算还剩明细，请填写删除后的本次结算（{{
          bankStatementCurrencyCode || '银行流水币别'
        }}）。
      </p>
      <InputNumber
        v-model:value="deleteActualSettled"
        :precision="2"
        style="width: 100%"
        placeholder="本次结算"
      />
    </Modal>
  </Page>
</template>

<style scoped lang="scss">
.receive-settlement-form {
  min-width: 0;
}

.form-info-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
  margin-bottom: 12px;
}

.form-info-layout--single {
  grid-template-columns: 1fr;
}

.form-info-layout__panel {
  min-width: 0;
}

.form-panel-card {
  display: flex;
  flex-direction: column;
  height: 100%;

  :deep(.ant-card-body) {
    flex: 1;
    min-width: 0;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-item {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.form-item--align-top {
  align-items: flex-start;
}

.form-item--wide {
  grid-column: span 3;
}

.form-grid--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid--compact .form-item--wide {
  grid-column: span 2;
}

.form-label {
  flex-shrink: 0;
  width: 72px;
  font-size: 12px;
  line-height: 32px;
  color: #666;
  text-align: right;
}

.form-item--align-top .form-label {
  line-height: 32px;
}

.form-control {
  flex: 1;
  min-width: 0;
}

.form-text {
  font-size: 14px;
  line-height: 32px;
  color: #333;
}

.form-text.diff-amount--warn {
  font-weight: 600;
  color: #d46b08;
}

.toolbar-btn-icon {
  margin-right: 4px;
  font-size: 14px;
  vertical-align: -2px;
}

.settlement-items-hint {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
}

.missing-rate {
  margin-left: 6px;
  font-size: 12px;
  color: #d48806;
}

.actual-settled-hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: #8a97a8;
}

.delete-amount-hint {
  margin-bottom: 12px;
}

:deep(.settlement-row--foreign) > td {
  color: #8c8c8c;
  background: #fafafa;
}

.bank-input--clickable {
  cursor: pointer;
}

.bank-amount {
  font-weight: 600;
}

.bank-amount--total {
  color: #1677ff;
}

.bank-summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.bank-summary-row--compact {
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 8px;
}

.bank-summary-row--compact .bank-summary-item {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.bank-summary-row--compact .bank-summary-warning {
  text-align: right;
}

@media (max-width: 1280px) {
  .form-info-layout:not(.form-info-layout--single) {
    grid-template-columns: 1fr;
  }
}

.bank-summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  min-width: 0;
  text-align: center;
}

.bank-summary-value--settled {
  color: #fa8c16;
}

.bank-summary-value--remaining {
  color: #52c41a;
}

.bank-summary-value--remaining-danger,
.bank-summary-warning {
  color: #ff4d4f;
}

.bank-summary-value--current {
  color: #722ed1;
}

.bank-summary-label {
  font-size: 12px;
  color: #666;
}

.bank-summary-value {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.bank-summary-warning {
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
}
</style>
