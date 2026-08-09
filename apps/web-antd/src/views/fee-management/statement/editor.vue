<script lang="ts" setup>
import type { StatementAdminApi } from '#/api/settlement-management/statement-admin';
import type { Attachment } from '#/api/common/upload';
import {
  type SelectedFeeItem,
  type CurrencyInfo,
  buildDynamicCurrencyColumns,
} from '../add-fee-statement-modal/data';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
} from '#/views/sea-export-admin/orderFee/data';
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
  Modal,
  Select,
  SelectOption,
  Space,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import { PrintJsonType, usePrintFormat } from '#/components/print-format';
import { NestedDataTable } from '#/components/nested-data-table';
import {
  ClientSelect,
  CurrencySelect,
  MyOrgSelect,
  OrgBankAccountLinkageSelect,
} from '#/adapter/component';
import {
  addStatement,
  getOrderFeeGroup,
  deleteStatement,
  getStatementDetail,
  batchDeleteStatements,
  editStatement,
  addStatementFees,
  removeStatementFees,
  getStatementPagedList,
} from '#/api/settlement-management/statement-admin';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';
import { addByStatement as addPaymentApplicationByStatement } from '#/api/settlement-management/payment-application-admin';
import FileUploadInput from '../../../adapter/component/file-upload/file-upload-input.vue';

import AddFeeDrawer from '../add-fee-statement-modal/index.vue';
import FeeSummaryCard from './components/fee-summary-card.vue';
import AttachmentUpload from './components/attachment-upload.vue';
import {
  calcConvertedTotal,
  formatAmount,
  groupFeesByOrder,
  summarizeByCurrency,
  summarizeByCurrencyWithConversion,
  useFeeInnerColumns,
  useOrderGroupColumns,
} from './form-data';

const t = (key: string, args?: any[]) =>
  $t(`seaExport.export.statement.${key}`, args as any);

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const isEdit = computed(() => !!editId.value);

const pageLoading = ref(false);
const pageTitle = computed(() =>
  isEdit.value ? t('editTitle') : t('addTitle'),
);

const submitting = ref(false);
const addFeeDrawerRef = ref<InstanceType<typeof AddFeeDrawer> | null>(null);

// 存储对账单详情，用于获取paySide
const statementDetail = ref<StatementAdminApi.StatementDto | null>(null);

const applicantName = computed(
  () => userStore.userInfo?.realName ?? userStore.userInfo?.username ?? '',
);
const creationTime = ref(dayjs().format('YYYY-MM-DD HH:mm'));
const endTime = ref<string | undefined>(undefined);
const startTime = ref<string | undefined>(undefined);
const statementNum = ref('');
const displayApplicationNo = computed(() =>
  isEdit.value ? statementNum.value : t('autoGenerate'),
);

const clientId = ref<string>('');
const clientName = ref('');

// 用于ClientSelect组件回显的selectedItems（从返回的数据中获取，不单独请求详情）
const clientSelectedItems = computed(() => {
  if (!clientId.value) return [];
  return [
    {
      id: clientId.value,
      name: clientName.value || '',
    },
  ];
});

// 新增：所属组织id
const orgId = ref<number | undefined>(undefined);

// 新增：我司银行id
const orgBankAccountId = ref<string | undefined>(undefined);

const statementDescription = ref('');
const remark = ref('');
const attachments = ref<Attachment[]>([]);

const feeDetailRows = ref<FeeDetailRow[]>([]);
const originalFeeDetailRows = ref<FeeDetailRow[]>([]);
const initialLoadFeeIds = ref<Set<string>>(new Set());
const selectedRowKeys = ref<string[]>([]);
const currencies = ref<CurrencyInfo[]>([]);

// --- 过滤条件 ---
const filterAccountDate = ref<string>('');
const filterFeeName = ref<string>('');
const filterCommissionNum = ref<string>(''); // 委托编号
const filterEtdStart = ref<string>(''); // 开船日期起始
const filterEtdEnd = ref<string>(''); // 开船日期截止
const filterPaySide = ref<number | undefined>(undefined); // 收付类型：0-收，1-付，undefined-全部

const orderGroupColumns = useOrderGroupColumns();
const dynamicColumns = computed(() =>
  buildDynamicCurrencyColumns(currencies.value),
);
const allColumns = computed(() => [
  ...orderGroupColumns,
  ...dynamicColumns.value,
]);
const feeInnerColumns = useFeeInnerColumns();

// --- 过滤后的费用明细 ---
const filteredFeeDetailRows = computed(() => {
  // 如果所有过滤条件都为空，返回原始数据
  if (
    !filterAccountDate.value &&
    !filterFeeName.value &&
    !filterCommissionNum.value &&
    !filterEtdStart.value &&
    !filterEtdEnd.value &&
    filterPaySide.value === undefined
  ) {
    return feeDetailRows.value;
  }

  return feeDetailRows.value.filter((row) => {
    // 会计日期过滤（模糊匹配）
    if (filterAccountDate.value) {
      const rowDate = row.accountDate || '';
      if (!rowDate.includes(filterAccountDate.value)) {
        return false;
      }
    }

    // 费用名称过滤（模糊匹配，不区分大小写）
    if (filterFeeName.value) {
      const feeName = row.feeCodeName || '';
      if (!feeName.toLowerCase().includes(filterFeeName.value.toLowerCase())) {
        return false;
      }
    }

    // 委托编号过滤（模糊匹配，不区分大小写）
    if (filterCommissionNum.value) {
      const commissionNum = row.commissionNum || '';
      if (
        !commissionNum
          .toLowerCase()
          .includes(filterCommissionNum.value.toLowerCase())
      ) {
        return false;
      }
    }

    // 开船日期范围过滤
    if (filterEtdStart.value || filterEtdEnd.value) {
      const rowEtd = row.etd || '';
      if (filterEtdStart.value && rowEtd < filterEtdStart.value) {
        return false;
      }
      if (filterEtdEnd.value && rowEtd > filterEtdEnd.value) {
        return false;
      }
    }

    // 收付类型过滤
    if (filterPaySide.value !== undefined) {
      if (row.paySide !== filterPaySide.value) {
        return false;
      }
    }

    return true;
  });
});

const orderGroups = computed(() =>
  groupFeesByOrder(filteredFeeDetailRows.value, currencies.value),
);
const expandedGroupKeys = ref<string[]>([]);

const isClientLocked = computed(() => feeDetailRows.value.length > 0);

// --- 根据paySide判断是否显示生成按钮 ---
const canGenerateInvoiceApplication = computed(() => {
  // 只有编辑模式且全部为收（paySide === 0）时才显示
  return isEdit.value && statementDetail.value?.paySide === 0;
});

const canGeneratePaymentApplication = computed(() => {
  // 只有编辑模式且全部为付（paySide === 1）时才显示
  return isEdit.value && statementDetail.value?.paySide === 1;
});

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
  console.log('getGroupByKey', group);
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
    settlementId: clientId.value || undefined,
    selectedFeeIds: feeDetailRows.value.map((r) => r.feeId),
    statementNum: editId.value,
  });
}
function collectCurrenciesByFeeConfirm(fees: FeeDetailRow[]): CurrencyInfo[] {
  const map = new Map<number, string>();
  for (const fee of fees) {
    if (fee.currencyId && fee.currencyName && !map.has(fee.currencyId)) {
      map.set(fee.currencyId, fee.currencyName);
    }
  }
  return [...map.entries()].map(([currencyId, currencyName]) => ({
    currencyId,
    currencyName,
  }));
}

async function handleFeeConfirm(fees: SelectedFeeItem[]) {
  const existingIds = new Set(feeDetailRows.value.map((r) => r.feeId));
  const newRows: FeeDetailRow[] = fees.filter(
    (fee) => !existingIds.has(fee.feeId),
  );

  if (isEdit.value && editId.value && newRows.length > 0) {
    try {
      await addStatementFees({
        id: editId.value,
        orderFeeIds: newRows.map((row) => row.feeId),
      });
    } catch {
      message.error('添加费用关联失败');
      return;
    }
  }

  feeDetailRows.value = [...feeDetailRows.value, ...newRows];
  originalFeeDetailRows.value = [
    ...originalFeeDetailRows.value,
    ...newRows.map((r) => ({ ...r })),
  ];
  currencies.value = collectCurrenciesByFeeConfirm(feeDetailRows.value ?? []);
  nextTick(() => {
    expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
  });
}

async function handleDeleteSelected() {
  const toRemove = new Set(selectedRowKeys.value);
  if (toRemove.size === 0) return;

  if (isEdit.value && editId.value) {
    try {
      await removeStatementFees({
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

function onStartTimeChange(_date: any, dateStr: string | string[]) {
  startTime.value = Array.isArray(dateStr) ? dateStr[0] : dateStr || undefined;
}
function onEndTimeChange(_date: any, dateStr: string | string[]) {
  endTime.value = Array.isArray(dateStr) ? dateStr[0] : dateStr || undefined;
}

function onClientChange(val: unknown) {
  clientId.value = val ? String(val) : '';
  clientName.value = '';
}

function onClientIdSync(val: string) {
  clientId.value = val;
}

function ensureClientSelected() {
  if (!clientId.value) {
    message.warning(t('noClientWarning'));
    return false;
  }
  return true;
}

// --- Load detail for edit mode ---
function collectCurrenciesByInit(
  items: StatementAdminApi.OrderFeeAndSeaExportDto[],
): CurrencyInfo[] {
  const map = new Map<number, string>();
  for (const order of items) {
    for (const fee of order.orderFees ?? []) {
      const name = fee.currency?.cnName ?? fee.currency?.code;
      if (fee.currencyId && name && !map.has(fee.currencyId)) {
        map.set(fee.currencyId, name);
      }
    }
  }
  return [...map.entries()].map(([currencyId, currencyName]) => ({
    currencyId,
    currencyName,
  }));
}
function mapDetailToFeeRows(
  detail: StatementAdminApi.StatementDto,
): FeeDetailRow[] {
  const rows: FeeDetailRow[] = [];
  currencies.value = collectCurrenciesByInit(detail.orderFeeGroups ?? []);
  console.log('mapDetailToFeeRows currencies', currencies.value);
  for (const group of detail.orderFeeGroups ?? []) {
    const order = group.transportOrder;

    for (const item of group.orderFees ?? []) {
      const fee = item;
      console.log('mapDetailToFeeRows fee', fee);
      rows.push({
        feeId: fee.id,
        transportOrderId: fee?.transportOrderId ?? order?.id ?? '',
        commissionNum: order?.commissionNum ?? undefined,
        mblNum: order?.mblNum ?? undefined,
        clientName: order?.clientName ?? undefined,
        accountDate: order?.accountDate ?? undefined,
        etd: order?.etd ?? undefined,
        polName: order?.seaExportPOLCnName ?? undefined,
        podName: order?.seaExportPODCnName ?? undefined,
        saleUserNames: order?.saleNames?.join('、'),
        operationUserNames: order?.operatorNames?.join('、'),
        customerServiceUserNames: undefined,
        paySide: fee?.paySide ?? 0,
        feeCodeId: fee?.feeCodeId ?? 0,
        feeCodeName: fee?.feeCode?.cnName ?? undefined,
        currencyId: fee?.currencyId ?? 0,
        currencyName: fee?.currency?.cnName ?? fee?.currency?.code ?? undefined,
        settlementId: fee?.settlementId ?? '',
        settlementName: fee?.settlement?.name ?? undefined,
        amount: fee?.amount ?? 0,
        settledAmount: fee?.settledAmount ?? 0,
        unSettledAmount: fee?.unSettledAmount ?? 0,
        exchangeRate: fee?.exchangeRate,
        itemRemark: item.remark ?? '',
      });
    }
  }
  return rows;
}

async function loadEditData() {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getStatementDetail(editId.value);

    // 保存对账单详情，用于获取paySide
    statementDetail.value = detail;

    statementNum.value = detail.statementNum ?? '';
    clientId.value = detail.clientId ?? '';
    clientName.value = detail.client?.name ?? '';

    // 新增：加载所属组织id
    orgId.value = detail.orgId || undefined;

    // 新增：加载我司银行id
    orgBankAccountId.value = detail.orgBankAccountId || undefined;

    creationTime.value = detail.creationTime
      ? dayjs(detail.creationTime).format('YYYY-MM-DD HH:mm')
      : dayjs().format('YYYY-MM-DD HH:mm');
    startTime.value = detail.startTime
      ? dayjs(detail.startTime).format('YYYY-MM-DD')
      : undefined;
    endTime.value = detail.endTime
      ? dayjs(detail.endTime).format('YYYY-MM-DD')
      : undefined;
    statementDescription.value = detail.description ?? '';
    remark.value = detail.remark ?? '';

    feeDetailRows.value = mapDetailToFeeRows(detail);
    originalFeeDetailRows.value = feeDetailRows.value.map((r) => ({ ...r }));
    initialLoadFeeIds.value = new Set(feeDetailRows.value.map((r) => r.feeId));

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
  loadEditData();
});

// --- Submit ---

function buildSubmitData(): StatementAdminApi.StatementAddDto {
  const orderFeeIds = feeDetailRows.value.map((r) => r.feeId);
  const attachmentItems: StatementAdminApi.AttachmentItemForItemInputDto[] =
    attachments.value.map((a, idx) => ({
      attachmentId: Number(a.attachmentId),
      displayOrder: idx,
      url: a.url,
    }));

  return {
    id: editId.value || undefined,
    startTime: startTime.value ? dayjs(startTime.value).toISOString() : null,
    endTime: endTime.value ? dayjs(endTime.value).toISOString() : null,
    clientId: clientId.value,
    description: statementDescription.value || undefined,
    remark: remark.value || undefined,
    orderFeeIds: orderFeeIds,
    attachments: attachmentItems.length > 0 ? attachmentItems : undefined,
    // 新增：所属组织id
    orgId: orgId.value || undefined,
    // 新增：我司银行id
    orgBankAccountId: orgBankAccountId.value || null,
  };
}

const transCurrencySymbol = (currencyId: number) => {
  const option = getCurrencyEnumSymbolOptions().find(
    (o) => o.value === currencyId,
  );
  return option ? option.label : currencyId;
};
async function saveEditMode() {
  const id = editId.value!;

  const attachmentItems: StatementAdminApi.AttachmentItemForItemInputDto[] =
    attachments.value.map((a, idx) => ({
      attachmentId: Number(a.attachmentId),
      displayOrder: idx,
      url: a.url,
    }));

  await editStatement({
    id,
    startTime: startTime.value ? dayjs(startTime.value).toISOString() : null,
    endTime: endTime.value ? dayjs(endTime.value).toISOString() : null,
    description: statementDescription.value || undefined,
    remark: remark.value || undefined,
    attachments: attachmentItems.length > 0 ? attachmentItems : undefined,
    // 新增：所属组织id
    orgId: orgId.value || undefined,
    // 新增：我司银行id
    orgBankAccountId: orgBankAccountId.value || null,
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
  }

  if (modifiedDeleteIds.length > 0) {
    await removeStatementFees({ id, orderFeeIds: modifiedDeleteIds });
  }
  if (modifiedAddFees.length > 0) {
    await addStatementFees({
      id,
      orderFeeIds: modifiedAddFees.map((row) => row.feeId),
    });
  }

  originalFeeDetailRows.value = feeDetailRows.value.map((r) => ({ ...r }));
}
let recAmountMap: any = ref({} as any);
let payAmountMap: any = ref({} as any);

let unRecAmountMap: any = ref({} as any);
let unPayAmountMap: any = ref({} as any);

const totalAmount = computed(() => {
  // 从 orderGroups（已过滤）中提取应收和应付金额，按币种分组
  const recMap: Record<string, any> = {};
  const payMap: Record<string, any> = {};
  const unRecMap: Record<string, any> = {};
  const unPayMap: Record<string, any> = {};

  // console.log('orderGroups (filtered)', orderGroups.value);
  orderGroups.value.forEach((orderGroup) => {
    orderGroup.children?.forEach((fee) => {
      const currencyKey = String(fee.currencyId);

      if (fee.paySide === 0) {
        // 应收
        if (!recMap[currencyKey]) {
          recMap[currencyKey] = {
            totalRMBRecAmount: 0,
            totalRecAmount: 0,
            exchangeRate: fee.exchangeRate || 1,
            currencyName: fee.currencyName || '人民币',
            currencyId: fee.currencyId,
          };
        }
        recMap[currencyKey].totalRecAmount += fee.amount || 0;
        recMap[currencyKey].totalRMBRecAmount +=
          fee.amount * (fee.exchangeRate || 1) || 0;

        // 未收
        if (!unRecMap[currencyKey]) {
          unRecMap[currencyKey] = {
            totalRecAmount: 0,
            exchangeRate: fee.exchangeRate || 1,
            currencyName: fee.currencyName || '人民币',
            currencyId: fee.currencyId,
          };
        }
        // unRecMap[currencyKey].totalRecAmount += fee.unSettledAmount || 0;
        // unRecMap[currencyKey].totalRMBRecAmount += fee.unSettledAmount * (fee.exchangeRate || 1) || 0;
      } else if (fee.paySide === 1) {
        // 应付
        if (!payMap[currencyKey]) {
          payMap[currencyKey] = {
            totalPayAmount: 0,
            totalRMBPayAmount: 0,
            exchangeRate: fee.exchangeRate || 1,
            currencyName: fee.currencyName || '人民币',
            currencyId: fee.currencyId,
          };
        }
        payMap[currencyKey].totalPayAmount += fee.amount || 0;
        payMap[currencyKey].totalRMBPayAmount +=
          fee.amount * (fee.exchangeRate || 1) || 0;

        // 未付
        if (!unPayMap[currencyKey]) {
          unPayMap[currencyKey] = {
            totalPayAmount: 0,
            exchangeRate: fee.exchangeRate || 1,
            currencyName: fee.currencyName || '人民币',
            currencyId: fee.currencyId,
          };
        }
        // unPayMap[currencyKey].totalPayAmount += fee.unSettledAmount || 0;
        // unPayMap[currencyKey].totalRMBPayAmount += fee.unSettledAmount * (fee.exchangeRate || 1) || 0;
      }
    });
  });

  recAmountMap.value = recMap;
  payAmountMap.value = payMap;

  unRecAmountMap.value = unRecMap;
  unPayAmountMap.value = unPayMap;

  //console.log('recAmountMap', recAmountMap.value);
  //console.log('payAmountMap', payAmountMap.value);

  const allKeys = new Set([
    ...Object.keys(recAmountMap.value),
    ...Object.keys(payAmountMap.value),
  ]);
  //console.log('allKeys', allKeys);
  const total: any = {};

  allKeys.forEach((key) => {
    total[key] = {
      totalPayAmount: payAmountMap.value[key]?.totalPayAmount || 0,
      totalRMBPayAmount: payAmountMap.value[key]?.totalRMBPayAmount || 0,
      totalRecAmount: recAmountMap.value[key]?.totalRecAmount || 0,
      totalRMBRecAmount: recAmountMap.value[key]?.totalRMBRecAmount || 0,
      totalUnPayAmount: unPayAmountMap.value[key]?.totalPayAmount || 0,
      totalUnRecAmount: unRecAmountMap.value[key]?.totalRecAmount || 0,
      exchangeRate:
        (payAmountMap.value[key] || recAmountMap.value[key])?.exchangeRate || 1,
      currencyName:
        (payAmountMap.value[key] || recAmountMap.value[key])?.currencyName ||
        '人民币',
      currencyId: (payAmountMap.value[key] || recAmountMap.value[key])
        ?.currencyId,
    };
    //  console.log('total', total);
  });
  // 转换为对象数组
  const totalList = Object.keys(total).map((key) => ({
    id: key,
    ...total[key],
  }));
  let list = [];
  // console.log("totalList", totalList);
  let totalPay = 0;
  let totalRec = 0;

  totalList.forEach((item) => {
    let recName = `应收${item.currencyName}:`;
    let recColor = 'green';
    let recAmount = (item.totalRecAmount || 0).toFixed(2);
    list.push({
      name: recName,
      color: recColor,
      value: transCurrencySymbol(item.currencyId) + recAmount,
    });

    // totalRec += recAmount * item.exchangeRate;

    let payName = `应付${item.currencyName}:`;
    let payColor = 'yellow';
    let payAmount = (item.totalPayAmount || 0).toFixed(2);
    list.push({
      name: payName,
      color: payColor,
      value: transCurrencySymbol(item.currencyId) + payAmount,
    });
    totalPay += item.totalRMBPayAmount;

    let unRecName = `未收${item.currencyName}:`;
    let unRecColor = 'green';
    let unRecAmount = (item.totalUnRecAmount || 0).toFixed(2);
    list.push({
      name: unRecName,
      color: unRecColor,
      value: transCurrencySymbol(item.currencyId) + unRecAmount,
    });
    totalRec += item.totalRMBRecAmount;

    let unPayName = `未付${item.currencyName}:`;
    let unPayColor = 'yellow';
    let unPayAmount = (item.totalUnPayAmount || 0).toFixed(2);
    list.push({
      name: unPayName,
      color: unPayColor,
      value: transCurrencySymbol(item.currencyId) + unPayAmount,
    });
    //totalPay += payAmount * item.exchangeRate;
  });
  console.log(list);
  return list;
});
async function handleSave() {
  if (!ensureClientSelected()) {
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
      markListShouldRefresh('StatementList');
      await loadEditData();
    } else {
      const newId = await addStatement(buildSubmitData());
      message.success(t('addSuccess'));
      markListShouldRefresh('StatementList');
      router.replace(`/fee-management/statement/${newId}/edit`);
    }
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  startTime.value = undefined;
  endTime.value = undefined;
  statementDescription.value = '';
  remark.value = '';
  feeDetailRows.value = [];
  selectedRowKeys.value = [];
  expandedGroupKeys.value = [];
  attachments.value = [];
  creationTime.value = dayjs().format('YYYY-MM-DD HH:mm');
  // 重置过滤条件
  filterAccountDate.value = '';
  filterFeeName.value = '';
  filterCommissionNum.value = '';
  filterEtdStart.value = '';
  filterEtdEnd.value = '';
  filterPaySide.value = undefined;
}

function clearFilters() {
  filterAccountDate.value = '';
  filterFeeName.value = '';
  filterCommissionNum.value = '';
  filterEtdStart.value = '';
  filterEtdEnd.value = '';
  filterPaySide.value = undefined;
}

function handleExportMenuClick({ key }: { key: string | number }) {
  message.info(`导出: ${key}`);
}

const { openPrint } = usePrintFormat();

function handlePrint() {
  if (!isEdit.value || !editId.value) {
    message.warning('请先保存后再打印');
    return;
  }
  // 客户对账单打印：由后端按对账单 id 取数（StatementAdmin/DetailAsync）
  openPrint({
    printJsonType: PrintJsonType.StatementDetail,
    detailInput: { id: editId.value },
  });
}

// --- 生成开票申请 ---
async function handleGenerateInvoiceApplication() {
  if (!editId.value) {
    message.warning('请先保存对账单');
    return;
  }

  try {
    Modal.confirm({
      title: '确认生成开票申请',
      content: '将根据对账单下的应收费用自动生成开票申请，是否继续？',
      onOk: async () => {
        try {
          const applicationId = await InvoiceApplicationAdminApi.addByStatement(
            {
              statementId: editId.value!,
            },
          );

          if (applicationId) {
            message.success(`成功生成开票申请`);
            markListShouldRefresh('InvoiceApplicationList');

            // 跳转到第一个生成的开票申请编辑页
            router.push(
              `/fee-management/invoice-application/${applicationId}/edit`,
            );
          } else {
            message.warning('未生成任何开票申请');
          }
        } catch (error) {
          console.error('生成开票申请失败:', error);
          //message.error('生成开票申请失败');
        }
      },
    });
  } catch (error) {
    console.error('显示确认框失败:', error);
  }
}

// --- 生成付费申请 ---
async function handleGeneratePaymentApplication() {
  if (!editId.value) {
    message.warning('请先保存对账单');
    return;
  }

  try {
    Modal.confirm({
      title: '确认生成付费申请',
      content: '将根据对账单下的应付费用自动生成付费申请，是否继续？',
      onOk: async () => {
        try {
          const applicationId = await addPaymentApplicationByStatement({
            statementId: editId.value!,
          });

          if (applicationId) {
            message.success(`成功生成付费申请`);
            markListShouldRefresh('PaymentApplicationList');

            // 跳转到第一个生成的付费申请编辑页
            router.push(
              `/fee-management/payment-application/${applicationId}/edit`,
            );
          } else {
            message.warning('未生成任何付费申请');
          }
        } catch (error) {
          console.error('生成付费申请失败:', error);
          //message.error('生成付费申请失败');
        }
      },
    });
  } catch (error) {
    console.error('显示确认框失败:', error);
  }
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
            <span v-if="isEdit" class="action-bar__statement-num">
              {{ t('statementNum') }}: {{ statementNum }}
            </span>
          </div>
          <div class="action-bar__right">
            <Space>
              <!-- 新建模式：仅保存 -->

              <Button :loading="submitting" @click="handleSave">
                {{ t('save') }}
              </Button>

              <!-- 生成开票申请按钮：仅在编辑模式且全部为收时显示 -->
              <Button
                v-if="canGenerateInvoiceApplication"
                type="primary"
                @click="handleGenerateInvoiceApplication"
              >
                生成开票申请
              </Button>

              <!-- 生成付费申请按钮：仅在编辑模式且全部为付时显示 -->
              <Button
                v-if="canGeneratePaymentApplication"
                type="primary"
                @click="handleGeneratePaymentApplication"
              >
                生成付费申请
              </Button>

              <Dropdown>
                <Button>
                  {{ t('export') }}
                  <span class="ml-1">▾</span>
                </Button>
                <template #overlay>
                  <Menu @click="handleExportMenuClick">
                    <MenuItem key="feeDetail">
                      {{ t('title') }}
                    </MenuItem>
                    <!-- <MenuItem key="summary">
                      {{ t('exportBySummary') }}
                    </MenuItem> -->
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
          <!-- 左侧：基础信息 -->
          <div class="left-column">
            <Card size="small" class="basic-info-card">
              <template #title>
                <div class="card-title-wrapper">
                  <span class="title-indicator"></span>
                  <span class="text-lg font-semibold">基础信息</span>
                </div>
              </template>

              <div class="divider-line"></div>

              <div class="info-section">
                <!-- 第一行：客户名称、对账人、创建时间 -->
                <div class="info-row">
                  <div class="info-field">
                    <label class="field-label">{{ t('clientName') }}</label>
                    <ClientSelect
                      :model-value="clientId"
                      :placeholder="$t('ui.placeholder.select')"
                      :disabled="isClientLocked"
                      :selected-items="clientSelectedItems"
                      size="middle"
                      @update:model-value="onClientChange"
                    />
                  </div>
                  <div class="info-field">
                    <label class="field-label">{{ t('applicant') }}</label>
                    <div class="field-value-text">{{ applicantName }}</div>
                  </div>
                  <div class="info-field">
                    <label class="field-label">{{ t('creationTime') }}</label>
                    <div class="field-value-text">{{ creationTime }}</div>
                  </div>
                </div>

                <!-- 第二行：对账开始时间、对账结束时间、对账说明 -->
                <div class="info-row">
                  <div class="info-field">
                    <label class="field-label">{{ t('startTime') }}</label>
                    <DatePicker
                      :value="startTime ? dayjs(startTime) : undefined"
                      class="w-full"
                      size="middle"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                      @change="onStartTimeChange"
                    />
                  </div>
                  <div class="info-field">
                    <label class="field-label">{{ t('endTime') }}</label>
                    <DatePicker
                      :value="endTime ? dayjs(endTime) : undefined"
                      class="w-full"
                      size="middle"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                      @change="onEndTimeChange"
                    />
                  </div>
                  <div class="info-field">
                    <label class="field-label">{{ t('notes') }}</label>
                    <Input
                      :value="statementDescription"
                      :placeholder="$t('ui.placeholder.input')"
                      size="middle"
                      @update:value="(val) => (statementDescription = val)"
                    />
                  </div>
                </div>

                <!-- 第三行：备注、所属组织、我司银行 -->
                <div class="info-row">
                  <div class="info-field">
                    <label class="field-label">{{ t('remark') }}</label>
                    <Input.TextArea
                      :value="remark"
                      :rows="1"
                      :placeholder="$t('ui.placeholder.input')"
                      size="middle"
                      @update:value="(val) => (remark = val)"
                    />
                  </div>
                  <!-- 新增：所属组织 -->
                  <div class="info-field">
                    <label class="field-label">所属组织</label>
                    <MyOrgSelect
                      v-model:model-value="orgId"
                      placeholder="请选择所属组织"
                      allow-clear
                      size="middle"
                    />
                  </div>
                  <!-- 新增：我司银行 -->
                  <div class="info-field">
                    <label class="field-label">我司银行</label>
                    <OrgBankAccountLinkageSelect
                      v-model:value="orgBankAccountId"
                      :org-id="orgId"
                      placeholder="请选择我司银行"
                      allow-clear
                      size="middle"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <!-- 中部：费用合计 -->
          <div class="center-column">
            <Card size="small" class="fee-summary-card h-full">
              <template #title>
                <div class="card-title-wrapper">
                  <span class="title-indicator"></span>
                  <span class="text-lg font-semibold">{{
                    t('feeSummary')
                  }}</span>
                </div>
              </template>

              <div class="divider-line"></div>

              <!-- 使用新的费用合计组件 -->
              <FeeSummaryCard :fee-details="filteredFeeDetailRows" />
            </Card>
          </div>

          <!-- 右侧：附件上传 -->
          <div class="right-column">
            <Card size="small" class="attachment-card h-full">
              <template #title>
                <div class="card-title-wrapper">
                  <span class="title-indicator"></span>
                  <span class="text-lg font-semibold">{{
                    t('attachment')
                  }}</span>
                </div>
              </template>

              <div class="divider-line"></div>

              <div class="attachment-area">
                <AttachmentUpload v-model="attachments" :max-count="20" />
              </div>
            </Card>
          </div>
        </div>

        <!-- 费用明细表格 -->
        <Card size="small" class="fee-detail-card mt-3">
          <template #title>
            <div class="card-title-wrapper">
              <span class="title-indicator"></span>
              <span class="text-lg font-semibold">{{ t('feeDetail') }}</span>
            </div>
          </template>

          <template #extra>
            <Space class="m-2">
              <Button type="primary" @click="handleOpenAddFee">
                {{ t('addFee') }}
              </Button>
              <Button
                danger
                :disabled="selectedRowKeys.length === 0"
                @click="handleDeleteSelected"
              >
                {{ t('deleteFee') }}
              </Button>
            </Space>
          </template>

          <div class="divider-line"></div>

          <!-- 过滤条件 -->
          <div
            class="filter-bar mb-3 flex flex-wrap items-center gap-3 rounded bg-gray-50 p-3"
          >
            <Space wrap>
              <span class="text-sm text-gray-600"
                >{{ t('accountDate') }}：</span
              >
              <Input
                v-model:value="filterAccountDate"
                :placeholder="$t('ui.placeholder.input')"
                size="small"
                style="width: 150px"
                allow-clear
              />
              <span class="text-sm text-gray-600"
                >{{ t('feeCodeName') }}：</span
              >
              <Input
                v-model:value="filterFeeName"
                :placeholder="$t('ui.placeholder.input')"
                size="small"
                style="width: 200px"
                allow-clear
              />
              <span class="text-sm text-gray-600"
                >{{ t('commissionNum') }}：</span
              >
              <Input
                v-model:value="filterCommissionNum"
                :placeholder="$t('ui.placeholder.input')"
                size="small"
                style="width: 180px"
                allow-clear
              />
              <span class="text-sm text-gray-600">{{ t('etd') }}：</span>
              <DatePicker
                v-model:value="filterEtdStart"
                :placeholder="$t('ui.placeholder.select')"
                size="small"
                style="width: 150px"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                allow-clear
              />
              <span class="text-sm text-gray-600">-</span>
              <DatePicker
                v-model:value="filterEtdEnd"
                :placeholder="$t('ui.placeholder.select')"
                size="small"
                style="width: 150px"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                allow-clear
              />
              <span class="text-sm text-gray-600">{{ t('paySide') }}：</span>
              <Select
                v-model:value="filterPaySide"
                :placeholder="$t('ui.placeholder.select')"
                size="small"
                style="width: 120px"
                allow-clear
              >
                <SelectOption :value="0">{{
                  $t('seaExport.export.statement.receivableAmount') || '收'
                }}</SelectOption>
                <SelectOption :value="1">{{
                  $t('seaExport.export.statement.payAmount') || '付'
                }}</SelectOption>
              </Select>
              <Button size="small" @click="clearFilters">
                {{ $t('common.reset') || '重置' }}
              </Button>
            </Space>
          </div>

          <div class="fee-group-table">
            <div class="table-container">
              <NestedDataTable
                :columns="allColumns"
                :data-source="orderGroups"
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

                <template #innerBodyCell="{ column, record, index }">
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
                  <template v-else-if="column.key === 'amount'">
                    {{ formatAmount(record.amount) }}
                  </template>
                  <template v-else-if="column.key === 'exchangeRate'">
                    {{ record.exchangeRate }}
                  </template>
                  <template v-else-if="column.key === 'settledAmount'">
                    {{ formatAmount(record.settledAmount) }}
                  </template>
                  <template v-else-if="column.key === 'unSettledAmount'">
                    {{ formatAmount(record.unSettledAmount) }}
                  </template>
                  <template v-else>
                    {{ column.dataIndex ? record[column.dataIndex] : '' }}
                  </template>
                </template>
              </NestedDataTable>
            </div>

            <div class="total-amount flex rounded-md px-1 py-1 shadow">
              <div
                v-for="(item, index) in totalAmount"
                class="mr-2 flex"
                :key="item.name"
              >
                <span class="flex">{{ item.name }}</span>
                <span class="ml-2 flex font-medium" :class="item.color">{{
                  item.value
                }}</span>
                <span class="split mx-3 flex" v-show="(index + 1) % 5 === 0"
                  >|
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- 添加费用抽屉 -->
      <AddFeeDrawer
        ref="addFeeDrawerRef"
        @confirm="handleFeeConfirm"
        @update:settlement-id="onClientIdSync"
      />
    </Spin>
  </Page>
</template>

<style scoped lang="scss">
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

.total-amount {
  display: flex;
  flex-wrap: wrap;
  background: #fff;

  .split {
    color: #33333345;
  }
}

.green {
  color: #00b96b;
}

.yellow {
  color: #ffc107;
}

.blue {
  color: #007bff;
}

:deep(.green-btn) {
  color: #fff;
  background-color: #00b96b !important;
  border-color: #00b96b !important;
}

/* 如果需要处理悬停状态 */
:deep(.green-btn:hover),
:deep(.green-btn:focus) {
  color: #fff;
  background-color: #009a55 !important;
  border-color: #009a55 !important;
}

:deep(.yellow-btn) {
  color: #fff;
  background-color: #ffc107 !important;
  border-color: #ffc107 !important;
}

/* 如果需要处理悬停状态 */
:deep(.yellow-btn:hover),
:deep(.yellow-btn:focus) {
  color: #fff;
  background-color: #ffc107 !important;
  border-color: #ffc107 !important;
}

/* 悬停状态 */
.green-dropdown-btn.ant-btn:hover,
.green-dropdown-btn.ant-btn:focus {
  color: #fff;
  background-color: #73d13d;
  border-color: #73d13d;
}

/* 激活/按下状态 */
.green-dropdown-btn.ant-btn:active {
  color: #fff;
  background-color: #389e0d;
  border-color: #389e0d;
}

.payment-app-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%; // 确保容器占满父元素高度
  min-height: 0; // 关键：允许flex子元素正确计算高度
  overflow: hidden; // 防止整体页面滚动
}

.action-bar {
  display: flex;
  flex-shrink: 0; // 防止被压缩
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

.action-bar__statement-num {
  margin-left: 24px;
  font-size: 14px;
  font-weight: normal;
  color: #8c8c8c;
}

.main-layout {
  display: flex;
  flex-shrink: 0; // 防止被压缩
  gap: 8px;
}

.left-column {
  flex-shrink: 0;
  width: 720px;
}

.center-column {
  flex: 1;
  min-width: 0;
}

.right-column {
  flex-shrink: 0;
  width: 240px;
}

// 费用明细卡片样式 - 使其能够占满剩余空间
.fee-detail-card {
  display: flex;
  flex: 1; // 占据剩余空间
  flex-direction: column;
  min-height: 0; // 允许flex子元素正确计算高度
  overflow: hidden; // 关键：防止内容溢出导致页面滚动

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 12px; // 保持内边距
    overflow: hidden; // 防止内容溢出
  }
}

.basic-info-card :deep(.ant-card-head) {
  padding-bottom: 0;
  border-bottom: none;
}

.basic-info-card :deep(.ant-card-body) {
  padding-top: 0;
}

.fee-detail-card :deep(.ant-card-head),
.attachment-card :deep(.ant-card-head),
.fee-summary-card :deep(.ant-card-head) {
  display: flex;
  flex-shrink: 0; // 防止卡片头部被压缩
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0;
  border-bottom: none;
}

.fee-detail-card :deep(.ant-card-head-title) {
  flex: 1;
}

.fee-detail-card :deep(.ant-card-extra) {
  flex-shrink: 0;
}

.fee-detail-card :deep(.ant-card-body),
.attachment-card :deep(.ant-card-body),
.fee-summary-card :deep(.ant-card-body) {
  padding-top: 0;
}

.divider-line {
  width: calc(100% - 10px);
  height: 1px;
  margin-right: 5px;
  margin-left: 5px;
  background-color: #e8e8e8;
}

.card-title-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.title-indicator {
  width: 4px;
  height: 16px;
  background: linear-gradient(180deg, #91caff 0%, #1890ff 100%);
  border-radius: 2px;
}

.info-section {
  padding-top: 10px;
}

.info-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 14px;
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// 为输入框组件添加基于rem的宽度适配
.info-field :deep(.ant-input),
.info-field :deep(.ant-picker),
.info-field :deep(.ant-select),
.info-field :deep(.ant-input-textarea) {
  width: 100%;
  max-width: 15rem; // 使用rem单位，适配不同分辨率
}

// 对于TextArea，设置合适的宽度
.info-field :deep(.ant-input-textarea) {
  max-width: 20rem;
}

.field-label {
  font-size: 13px;
  font-weight: normal;
  color: #8c8c8c;
}

.field-value-text {
  padding: 6px 0;
  font-size: 15px;
  font-weight: 500;
  color: #262626;
}

.currency-card {
  min-width: 140px;
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

.currency-card__recamount {
  font-family: Monaco, Consolas, 'Courier New';
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
  letter-spacing: 0.02em;
}

.currency-card__payamount {
  font-family: Monaco, Consolas, 'Courier New';
  font-size: 18px;
  font-weight: 600;
  color: #d46b08;
  letter-spacing: 0.02em;
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

.fee-group-table {
  display: flex;
  flex: 1; // 占据父容器的剩余空间
  flex-direction: column;
  min-height: 0; // 允许flex子元素正确计算高度
  overflow: hidden; // 关键：防止表格内容溢出

  :deep(.ant-table-expanded-row > td) {
    padding: 4px 8px;
  }

  // 表格滚动容器 - 使用flex布局自动填充剩余空间
  .table-container {
    flex: 1;
    min-height: 0; // 允许flex子元素正确计算高度
    overflow: auto; // 只在表格内部滚动
  }
}

.expanded-fee-table {
  max-width: 100%;
  overflow-x: auto;
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

// 过滤栏样式 - 防止占用过多空间
.filter-bar {
  flex-shrink: 0; // 防止被压缩
}
</style>
