<script lang="ts" setup>
import type { StatementAdminApi } from '#/api/settlement-management/statement-admin';

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { useUserStore } from '@vben/stores';

import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Dropdown,
  Input,
  Menu,
  MenuItem,
  message,
  Modal,
  Select,
  SelectOption,
  Space,
  Spin,
  Tag,
} from 'ant-design-vue';

import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import { PrintJsonType, usePrintFormat } from '#/components/print-format';
import { NestedDataTable } from '#/components/nested-data-table';
import type { Attachment } from '#/api/common/upload';
import { getFeeStatusOptions } from '#/views/air-export-admin/orderFee/data';
import { getFeeInvoiceStatusTagColor } from '#/views/settlement-management/invoice-issue/invoice-status';
import {
  ClientSelect,
  MyOrgSelect,
  OrgBankAccountLinkageSelect,
} from '#/adapter/component';
import { formatDetailOrgPathLabel } from '#/composables/use-my-org';
import {
  addStatement,
  getStatementDetail,
  editStatement,
  addStatementFees,
  removeStatementFees,
} from '#/api/settlement-management/statement-admin';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';
import { addByStatement as addPaymentApplicationByStatement } from '#/api/settlement-management/payment-application-admin';
import FileUploadInput from '../../../adapter/component/file-upload/file-upload-input.vue';

import AddFeeDrawer from '../add-fee-statement-modal/index.vue';
import FeeSummaryCard from './components/fee-summary-card.vue';
import {
  formatAmount,
  groupFeesByOrder,
  useFeeInnerColumns,
  useOrderGroupColumns,
  type FeeDetailRow,
  type OrderGroupRow,
} from './form-data';
import {
  buildDynamicCurrencyColumns,
  type SelectedFeeItem,
  type CurrencyInfo,
} from '../add-fee-statement-modal/data';
import { getCurrencyEnumSymbolOptions } from '#/views/sea-export-admin/orderFee/data';

const t = (key: string, args?: any[]) =>
  $t(`seaExport.export.statement.${key}`, args as any);

// --- 状态标签和颜色映射函数 ---

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
  return getFeeInvoiceStatusTagColor(invoiceStatus);
}

/**
 * 币别动态列 -> 金额样式 class；非币别列返回 null。
 *
 * 必须用 endsWith 精确匹配且长后缀优先：列名形如 currency_1_un_receive、
 * currency_1_rqst_receive，它们同样包含 "_receive"。早期用 includes('_receive')
 * 判断时，「未收」「已申请收」会被「应收」分支抢先命中，永远套不上自己的样式。
 */
function getCurrencyAmountClass(key: unknown): null | string {
  if (typeof key !== 'string' || !key.startsWith('currency_')) return null;
  if (key.endsWith('_rqst_receive')) return 'rqst-receive-amount';
  if (key.endsWith('_rqst_pay')) return 'rqst-pay-amount';
  if (key.endsWith('_un_receive')) return 'un-receive-amount';
  if (key.endsWith('_un_pay')) return 'un-pay-amount';
  if (key.endsWith('_receive')) return 'receive-amount';
  if (key.endsWith('_pay')) return 'pay-amount';
  return null;
}

const route = useRoute();
const router = useRouter();
const { closeTabByKey } = useTabs();
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

/** 上下分栏：拖拽条移动的是顶栏（基础信息等）高度，底栏费用明细吃剩余空间 */
const TOP_PANE_HEIGHT_KEY = 'statement-editor-top-pane-height';
const TOP_PANE_MIN = 160;
const BOTTOM_PANE_MIN = 280;
const HANDLE_SIZE = 14;

const splitBodyRef = ref<HTMLElement | null>(null);
const topPaneHeight = ref(0);
const isResizingSplit = ref(false);

let splitResizeCleanup: (() => void) | null = null;

function clampTopPaneHeight(height: number, containerHeight: number): number {
  const maxTop = Math.max(
    TOP_PANE_MIN,
    containerHeight - HANDLE_SIZE - BOTTOM_PANE_MIN,
  );
  return Math.max(TOP_PANE_MIN, Math.min(maxTop, height));
}

function readStoredTopPaneHeight(): number | null {
  try {
    const raw = Number(localStorage.getItem(TOP_PANE_HEIGHT_KEY));
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return raw;
  } catch {
    return null;
  }
}

function persistTopPaneHeight(height: number) {
  try {
    localStorage.setItem(TOP_PANE_HEIGHT_KEY, String(Math.round(height)));
  } catch {
    // ignore
  }
}

function initTopPaneHeight() {
  const container = splitBodyRef.value;
  if (!container) return;
  const containerHeight = container.clientHeight;
  if (containerHeight <= 0) return;

  const stored = readStoredTopPaneHeight();
  if (stored != null) {
    topPaneHeight.value = clampTopPaneHeight(stored, containerHeight);
    return;
  }

  // 默认：顶栏约占 38%，给费用明细更大可视区（TAPD #1001030）
  topPaneHeight.value = clampTopPaneHeight(
    Math.round(containerHeight * 0.38),
    containerHeight,
  );
}

function startSplitResize(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  const container = splitBodyRef.value;
  if (!container) return;

  splitResizeCleanup?.();

  isResizingSplit.value = true;
  const startY = e.clientY;
  const startTop = topPaneHeight.value || container.clientHeight * 0.38;

  const onMouseMove = (moveEvent: MouseEvent) => {
    moveEvent.preventDefault();
    // 手柄上移 → 顶栏变矮；下移 → 顶栏变高
    const next = startTop + (moveEvent.clientY - startY);
    topPaneHeight.value = clampTopPaneHeight(next, container.clientHeight);
  };

  const onMouseUp = () => {
    isResizingSplit.value = false;
    persistTopPaneHeight(topPaneHeight.value);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    splitResizeCleanup = null;
  };

  splitResizeCleanup = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    isResizingSplit.value = false;
    splitResizeCleanup = null;
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
}

function onWindowResize() {
  const container = splitBodyRef.value;
  if (!container || topPaneHeight.value <= 0) return;
  topPaneHeight.value = clampTopPaneHeight(
    topPaneHeight.value,
    container.clientHeight,
  );
}

onUnmounted(() => {
  splitResizeCleanup?.();
  window.removeEventListener('resize', onWindowResize);
});

// 存储对账单详情，用于获取paySide
const statementDetail = ref<StatementAdminApi.StatementDto | null>(null);

/** 申请人：新建用当前登录用户，编辑回显详情 creatorUserName */
const applicantName = ref(
  userStore.userInfo?.realName ?? userStore.userInfo?.username ?? '',
);
const creationTime = ref(dayjs().format('YYYY-MM-DD HH:mm'));
const endTime = ref<string | undefined>(undefined);
const startTime = ref<string | undefined>(undefined);
const statementNum = ref('');

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

// 所属组织 id + 详情 orgs（用于回显，不依赖当前登录人组织树）
const orgId = ref<number | undefined>(undefined);
const statementOrgs = ref<StatementAdminApi.OrganizationUnitSimpleDto[]>([]);

const orgSelectedItems = computed(() => {
  if (orgId.value == null) return [];
  const label = formatDetailOrgPathLabel(statementOrgs.value);
  if (!label) return [];
  return [{ label, value: orgId.value }];
});

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
const filterReferenceNum = ref<string>(''); // 编号（支持委托编号和提单号）
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
/** 是否有生效的费用筛选条件（无筛选时 filteredFeeDetailRows 直接返回原始数据） */
const hasActiveFilter = computed(
  () =>
    Boolean(
      filterAccountDate.value ||
      filterFeeName.value ||
      filterReferenceNum.value ||
      filterEtdStart.value ||
      filterEtdEnd.value,
    ) || filterPaySide.value !== undefined,
);

const filteredFeeDetailRows = computed(() => {
  // 如果所有过滤条件都为空，返回原始数据
  if (!hasActiveFilter.value) {
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

    // 编号过滤（支持委托编号和提单号，模糊匹配，不区分大小写）
    if (filterReferenceNum.value) {
      const commissionNum = row.commissionNum || '';
      const mblNum = row.mblNum || '';
      const searchValue = filterReferenceNum.value.toLowerCase();
      if (
        !commissionNum.toLowerCase().includes(searchValue) &&
        !mblNum.toLowerCase().includes(searchValue)
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
    settlementName: clientName.value || undefined,
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

  if (newRows.length === 0) {
    message.warning('所选费用已全部添加');
    return;
  }

  if (isEdit.value && editId.value) {
    // 编辑模式：添加费用后自动保存
    submitting.value = true;
    try {
      await addStatementFees({
        id: editId.value,
        orderFeeIds: newRows.map((row) => row.feeId),
      });

      // 自动保存其他字段
      await saveEditMode();

      message.success('添加费用并保存成功');
      markListShouldRefresh('StatementList');

      // 重新加载数据以获取最新状态
      await loadEditData();
    } catch (error) {
      console.error('添加费用或保存失败:', error);
      message.error('操作失败');
    } finally {
      submitting.value = false;
    }
  } else if (!isEdit.value && newRows.length > 0) {
    // 新增模式：添加费用后自动保存并跳转到编辑页面
    if (!ensureClientSelected()) {
      return;
    }

    submitting.value = true;
    try {
      // 先更新费用明细
      feeDetailRows.value = [...feeDetailRows.value, ...newRows];

      // 自动保存
      const newId = await addStatement(buildSubmitData());
      message.success(t('addSuccess'));
      markListShouldRefresh('StatementList');

      // 跳转到编辑页面（replace 复用当前页签，再关闭残留的新建页签）
      const createTabKey = route.fullPath;
      await router.replace(`/fee-management/statement/${newId}/edit`);
      await closeTabByKey(createTabKey);
      return;
    } catch (error) {
      console.error('自动保存失败:', error);
      message.error('自动保存失败');
      submitting.value = false;
      return;
    } finally {
      submitting.value = false;
    }
  }

  feeDetailRows.value = [...feeDetailRows.value, ...newRows];
  originalFeeDetailRows.value = [
    ...originalFeeDetailRows.value,
    ...newRows.map((r) => ({ ...r })),
  ];
  currencies.value = collectCurrenciesByFeeConfirm(feeDetailRows.value ?? []);
  nextTick(() => {
    // expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
  });
}

async function handleDeleteSelected() {
  const toRemove = new Set(selectedRowKeys.value);
  if (toRemove.size === 0) return;

  if (isEdit.value && editId.value) {
    // 编辑模式：删除费用后自动保存
    submitting.value = true;
    try {
      await removeStatementFees({
        id: editId.value,
        orderFeeIds: [...toRemove],
      });

      // 自动保存其他字段
      await saveEditMode();

      message.success('删除费用并保存成功');
      markListShouldRefresh('StatementList');

      // 重新加载数据以获取最新状态
      await loadEditData();
    } catch (error) {
      console.error('删除费用或保存失败:', error);
      message.error('操作失败');
    } finally {
      submitting.value = false;
    }
  } else {
    // 新增模式：仅从列表中移除
    feeDetailRows.value = feeDetailRows.value.filter(
      (r) => !toRemove.has(r.feeId),
    );
    originalFeeDetailRows.value = originalFeeDetailRows.value.filter(
      (r) => !toRemove.has(r.feeId),
    );
  }

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
      const name = fee.currency?.code ?? fee.currency?.cnName ?? '';
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

    // 根据 bizType 获取对应的业务类型对象
    const bizInfo = getBizTypeInfo(order);

    for (const item of group.orderFees ?? []) {
      const fee = item;
      console.log('mapDetailToFeeRows fee', fee);
      rows.push({
        feeId: fee.id,
        transportOrderId: fee?.transportOrderId ?? order?.id ?? '',
        commissionNum: order?.commissionNum ?? undefined,
        mblNum: order?.mblNum ?? undefined,
        clientName: order?.client?.name ?? undefined,
        accountDate: order?.accountDate ?? undefined,
        etd: order?.etd ?? undefined,
        polName: bizInfo.polName ?? order?.seaExportPOLCnName ?? undefined,
        podName: bizInfo.podName ?? order?.seaExportPODCnName ?? undefined,
        saleUserNames: order?.saleNames?.join('、'),
        operationUserNames: order?.operatorNames?.join('、'),
        customerServiceUserNames: undefined,
        paySide: fee?.paySide ?? 0,
        feeCodeId: fee?.feeCodeId ?? 0,
        feeCodeName: fee?.feeCode?.cnName ?? undefined,
        currencyId: fee?.currencyId ?? 0,
        currencyName: fee?.currency?.code ?? fee?.currency?.cnName ?? undefined,
        settlementId: fee?.settlementId ?? '',
        settlementName: fee?.settlement?.name ?? undefined,
        amount: fee?.amount ?? 0,
        settledAmount: fee?.settledAmount ?? 0,
        // 未结算：优先接口 unSettledAmount，缺失时回退 amount - settledAmount。
        // 在此单点兜底，下游（二级行展示、币别合计、汇总卡）直接用本字段即可。
        unSettledAmount:
          fee?.unSettledAmount ??
          (fee?.amount ?? 0) - (fee?.settledAmount ?? 0),
        // 已申请金额（rqstPaymentAmount：仅付费申请已申请，不含开票申请/收费结算）
        rqstPaymentAmount: fee?.rqstPaymentAmount ?? 0,
        // 发票/结算已占用额度（供币别汇总卡展示占用合计）
        orderInvoiceAmount: fee?.orderInvoiceAmount ?? 0,
        settlementOccupiedAmount: fee?.settlementOccupiedAmount ?? 0,
        exchangeRate: fee?.exchangeRate,
        itemRemark: item.remark ?? '',
        // 新增字段
        invoiceStatus: fee.invoiceStatus,
        combinedFeeStatus: fee.combinedFeeStatus,
        // 保存 transportOrder 信息，用于订单分组行显示应收完结状态
        transportOrder: order
          ? {
              recSettlementStatus: order.recSettlementStatus,
              paySettlementStatus: order.paySettlementStatus,
            }
          : undefined,
      });
    }
  }
  return rows;
}

/**
 * 根据 bizType 从 TransportOrderSimpleDto 中获取对应的业务类型信息
 * @param order 运输订单简易对象
 * @returns 包含 polName 和 podName 的对象
 */
function getBizTypeInfo(order: any): { polName?: string; podName?: string } {
  if (!order) return {};

  const bizType = order.bizType;

  // bizType: 0=海运出口, 1=海运进口, 2=空运出口
  if (bizType === 0 && order.seaExport) {
    return {
      polName: order.seaExport.polRemark ?? order.seaExport.polRemark,
      podName: order.seaExport.podRemark ?? order.seaExport.podRemark,
    };
  } else if (bizType === 1 && order.seaImport) {
    return {
      polName: order.seaImport.polRemark ?? order.seaImport.polRemark,
      podName: order.seaImport.podRemark ?? order.seaImport.podRemark,
    };
  } else if (bizType === 2 && order.airExport) {
    return {
      polName: order.airExport.polRemark ?? order.airExport.polRemark,
      podName: order.airExport.podRemark ?? order.airExport.podRemark,
    };
  }

  // 如果没有 SimpleDto 对象，返回空对象，兼容旧逻辑
  return {};
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

    console.log('📋 加载对账单详情:', {
      orgId: detail.orgId,
      orgBankAccountId: detail.orgBankAccountId,
    });

    // 申请人：详情创建人，勿用当前登录用户覆盖
    applicantName.value = detail.creatorUserName ?? '';

    // 所属组织：id + orgs 路径名回显
    orgId.value = detail.orgId || undefined;
    statementOrgs.value = detail.orgs ?? [];
    console.log('✅ 设置 orgId:', orgId.value);

    // 新增：再加载我司银行id（组件会在 orgId 变化后重新加载银行列表，然后自动匹配该值）
    orgBankAccountId.value = detail.orgBankAccountId || undefined;
    console.log('✅ 设置 orgBankAccountId:', orgBankAccountId.value);

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
      // expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
    });
  } finally {
    pageLoading.value = false;
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  } else {
    // 新建时自动打开抽屉，让用户选择客户和费用
    nextTick(() => {
      handleOpenAddFee();
    });
  }

  window.addEventListener('resize', onWindowResize);
  nextTick(() => {
    requestAnimationFrame(() => initTopPaneHeight());
  });
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
        // 原累加语句被注释掉，导致底部「未收」恒显示 0.00，此处恢复累加
        unRecMap[currencyKey].totalRecAmount += fee.unSettledAmount || 0;
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
        // 同上：恢复「未付」累加，避免底部恒显示 0.00
        unPayMap[currencyKey].totalPayAmount += fee.unSettledAmount || 0;
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
  // 底部合计条展示项（显式标注类型，避免 let list = [] 的隐式 any[] 推断）
  let list: { color: string; name: string; value: string }[] = [];
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
  // console.log(list);
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
      // 跳转到编辑页面（replace 复用当前页签，再关闭残留的新建页签）
      const createTabKey = route.fullPath;
      await router.replace(`/fee-management/statement/${newId}/edit`);
      await closeTabByKey(createTabKey);
    }
  } finally {
    submitting.value = false;
  }
}

function clearFilters() {
  filterAccountDate.value = '';
  filterFeeName.value = '';
  filterReferenceNum.value = ''; // 重置编号过滤条件
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
  <Page
    auto-content-height
    class="statement-editor-page"
    content-class="statement-editor-page__content"
  >
    <Spin :spinning="pageLoading" wrapper-class-name="statement-editor-spin">
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
              <Button :loading="submitting" @click="handleSave">
                {{ t('save') }}
              </Button>
              <Button
                v-if="canGenerateInvoiceApplication"
                type="primary"
                class="stmt-primary-btn"
                @click="handleGenerateInvoiceApplication"
              >
                生成开票申请
              </Button>
              <Button
                v-if="canGeneratePaymentApplication"
                type="primary"
                class="stmt-primary-btn"
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
                  </Menu>
                </template>
              </Dropdown>
              <Button @click="handlePrint">
                {{ t('print') }}
              </Button>
            </Space>
          </div>
        </div>

        <!-- 上下分栏：顶栏高度可拖，底栏费用明细占剩余 -->
        <div ref="splitBodyRef" class="split-body">
          <div
            class="top-pane"
            :style="
              topPaneHeight > 0 ? { height: `${topPaneHeight}px` } : undefined
            "
          >
            <div class="main-layout">
              <!-- 左侧：基础信息 -->
              <div class="left-column">
                <Card size="small" class="basic-info-card info-card h-full">
                  <template #title>
                    <div class="card-title-wrapper">
                      <span class="title-indicator"></span>
                      <span class="card-title-text">基础信息</span>
                    </div>
                  </template>

                  <div class="info-section">
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
                        <label class="field-label">{{
                          t('creationTime')
                        }}</label>
                        <div class="field-value-text">{{ creationTime }}</div>
                      </div>
                    </div>

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
                      <div class="info-field">
                        <label class="field-label">所属组织</label>
                        <myOrgSelect
                          v-model:model-value="orgId"
                          :auto-default="!isEdit"
                          :selected-items="orgSelectedItems"
                          placeholder="请选择所属公司"
                          allow-clear
                          size="middle"
                        />
                      </div>
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
                <Card size="small" class="fee-summary-card info-card h-full">
                  <template #title>
                    <div class="card-title-wrapper">
                      <span class="title-indicator"></span>
                      <span class="card-title-text">{{ t('feeSummary') }}</span>
                    </div>
                  </template>
                  <FeeSummaryCard :fee-details="filteredFeeDetailRows" />
                </Card>
              </div>

              <!-- 右侧：附件（与左/中三卡齐高，拖拽区紧凑、列表区内滚） -->
              <div class="right-column">
                <Card size="small" class="attachment-card info-card h-full">
                  <template #title>
                    <div class="card-title-wrapper">
                      <span class="title-indicator"></span>
                      <span class="card-title-text">
                        {{ t('attachment') }}
                      </span>
                    </div>
                  </template>
                  <div class="attachment-body">
                    <FileUploadInput
                      v-model="attachments"
                      module-type-id="160011"
                      :max-count="20"
                      drag
                    />
                  </div>
                </Card>
              </div>
            </div>
          </div>

          <!-- 拖拽条：上移缩短顶栏，下移加高顶栏 -->
          <div
            class="fee-detail-resize-handle"
            :class="{ 'is-dragging': isResizingSplit }"
            title="拖动调整上下区域高度"
            @mousedown="startSplitResize"
          >
            <div class="fee-detail-resize-handle__line"></div>
          </div>

          <!-- 费用明细：占剩余高度 -->
          <div class="bottom-pane">
            <Card size="small" class="fee-detail-card info-card">
              <template #title>
                <div class="card-title-wrapper">
                  <span class="title-indicator"></span>
                  <span class="card-title-text">{{ t('feeDetail') }}</span>
                </div>
              </template>

              <template #extra>
                <Space class="m-2">
                  <Button
                    type="primary"
                    class="stmt-primary-btn"
                    @click="handleOpenAddFee"
                  >
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

              <div
                class="filter-bar mb-3 flex flex-wrap items-center gap-3 p-3"
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
                  <span class="text-sm text-gray-600">编号：</span>
                  <Input
                    v-model:value="filterReferenceNum"
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
                  <span class="text-sm text-gray-600"
                    >{{ t('paySide') }}：</span
                  >
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
                      <span
                        v-if="column.key === 'seq'"
                        class="table-sequence-cell"
                      >
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
                              (e) =>
                                toggleGroupSelection(record, e.target.checked)
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
                      <template
                        v-else-if="column.key === 'recSettlementStatus'"
                      >
                        <Tag
                          :color="
                            getRecSettlementStatusColor(
                              record.transportOrder?.recSettlementStatus,
                            )
                          "
                        >
                          {{
                            getRecSettlementStatusLabel(
                              record.transportOrder?.recSettlementStatus,
                            )
                          }}
                        </Tag>
                      </template>
                      <!-- 币别动态列（应收/应付/未收/未付/已申请收/已申请付）：
                       统一由 getCurrencyAmountClass 按后缀精确取样式 -->
                      <template v-else-if="getCurrencyAmountClass(column.key)">
                        <span
                          class="reconciliation-amount"
                          :class="getCurrencyAmountClass(column.key)"
                        >
                          {{
                            formatAmount(
                              column.dataIndex ? record[column.dataIndex] : 0,
                            )
                          }}
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
                      <template v-else-if="column.key === 'rqstPaymentAmount'">
                        {{ formatAmount(record.rqstPaymentAmount) }}
                      </template>
                      <template v-else-if="column.key === 'exchangeRate'">
                        {{ record.exchangeRate }}
                      </template>
                      <template v-else-if="column.key === 'settledAmount'">
                        {{ formatAmount(record.settledAmount) }}
                      </template>
                      <template v-else-if="column.key === 'unSettledAmount'">
                        <!-- 直接用接口 unSettledAmount（已在 mapDetailToFeeRows 兜底），不再前端重算 -->
                        {{ formatAmount(record.unSettledAmount) }}
                      </template>
                      <template v-else-if="column.key === 'invoiceStatus'">
                        <Tag
                          :color="getInvoiceStatusColor(record.invoiceStatus)"
                        >
                          {{ getInvoiceStatusLabel(record.invoiceStatus) }}
                        </Tag>
                      </template>
                      <template v-else-if="column.key === 'combinedFeeStatus'">
                        <Tag
                          :color="
                            getFeeStatusOptions().find(
                              (item) => item.value === record.combinedFeeStatus,
                            )?.color
                          "
                        >
                          {{
                            getFeeStatusOptions().find(
                              (item) => item.value === record.combinedFeeStatus,
                            )?.label
                          }}
                        </Tag>
                      </template>
                      <template v-else>
                        {{ column.dataIndex ? record[column.dataIndex] : '' }}
                      </template>
                    </template>
                  </NestedDataTable>
                </div>

                <div class="total-amount flex rounded-md px-1 py-1">
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
        </div>

        <AddFeeDrawer
          ref="addFeeDrawerRef"
          @confirm="handleFeeConfirm"
          @update:settlement-id="onClientIdSync"
        />
      </div>
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

/* 分区卡片：圆角 + 轻阴影，悬停加深 */
.info-card {
  overflow: hidden;
  border: 1px solid #e8ecf3;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 6%);
  transition: box-shadow 0.3s ease;
}

.info-card:hover {
  box-shadow: 0 6px 20px rgb(16 42 83 / 10%);
}

/* 卡片头：主题色横向渐变 */
:deep(.info-card.ant-card-small > .ant-card-head) {
  min-height: 48px;
  padding: 0 16px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 3%) 55%,
    hsl(var(--background)) 100%
  );
  border-bottom: 1px solid #e4e8ef;
}

:deep(.info-card.ant-card-small > .ant-card-body) {
  padding: 14px 16px;
}

.card-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #252a31;
}

/* 输入聚焦：品牌色反馈 */
:deep(.info-card .ant-input),
:deep(.info-card .ant-select-selector),
:deep(.info-card .ant-picker) {
  border-color: #e4e8ef;
  border-radius: 8px;
  transition: all 0.2s ease;
}

:deep(.info-card .ant-input:focus),
:deep(.info-card .ant-input-focused),
:deep(.info-card .ant-select-focused .ant-select-selector),
:deep(.info-card .ant-picker-focused) {
  border-color: hsl(var(--primary) / 75%);
  box-shadow: 0 0 0 2px hsl(var(--primary) / 12%);
}

:deep(.info-card .ant-input-disabled),
:deep(.info-card .ant-select-disabled .ant-select-selector) {
  color: #b9c0c9;
  background: #f6f7f9;
}

:deep(.info-card label),
:deep(.info-card div[style*='font-size: 13px']) {
  font-weight: 500;
}

:deep(.info-card .file-upload-container) {
  border-radius: 8px;
}

.total-amount {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0 4px;
  align-items: center;
  min-height: 40px;
  padding: 8px 16px !important;
  margin-top: 8px;
  font-size: 13px;
  color: #52607a;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--background)) 50%,
    hsl(var(--primary) / 6%) 100%
  );
  border: 1px solid hsl(var(--primary) / 12%);
  border-radius: 8px;
  box-shadow: 0 2px 8px hsl(var(--primary) / 6%);

  .split {
    color: #d9dee8;
  }
}

.green {
  color: #00b96b;
}

.yellow {
  color: #ffc107;
}

.blue {
  color: hsl(var(--primary));
}

:deep(.green-btn) {
  color: #fff;
  background-color: #00b96b !important;
  border-color: #00b96b !important;
}

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

:deep(.yellow-btn:hover),
:deep(.yellow-btn:focus) {
  color: #fff;
  background-color: #ffc107 !important;
  border-color: #ffc107 !important;
}

.green-dropdown-btn.ant-btn:hover,
.green-dropdown-btn.ant-btn:focus {
  color: #fff;
  background-color: #73d13d;
  border-color: #73d13d;
}

.green-dropdown-btn.ant-btn:active {
  color: #fff;
  background-color: #389e0d;
  border-color: #389e0d;
}

/* 视口内上下分栏：拖拽条真正分配顶栏/费用明细高度 */
:deep(.statement-editor-page__content) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0 !important;
  overflow: hidden;
}

:deep(.statement-editor-spin) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

:deep(.statement-editor-spin > .ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.payment-app-form {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 4%) 0%,
    hsl(var(--background)) 120px,
    hsl(var(--background)) 100%
  );
}

.action-bar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 8px 14px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 10%) 0%,
    hsl(var(--primary) / 3%) 45%,
    hsl(var(--background)) 100%
  );
  border: 1px solid hsl(var(--primary) / 12%);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
}

.action-bar__left {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.action-bar__title {
  font-size: 16px;
  font-weight: 600;
  color: #252a31;
}

.action-bar__statement-num {
  font-size: 13px;
  font-weight: normal;
  color: #8c95a3;
}

.action-bar__right {
  flex-shrink: 0;
}

.action-bar :deep(.ant-btn) {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 13px;
  font-size: 12px;
  border-radius: 6px;
}

.stmt-primary-btn {
  box-shadow: 0 2px 8px hsl(var(--primary) / 28%);
  transition: box-shadow 0.2s ease;
}

.stmt-primary-btn:hover {
  box-shadow: 0 4px 12px hsl(var(--primary) / 40%);
}

.split-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.top-pane {
  flex-shrink: 0;
  min-height: 160px;
  overflow: auto;
}

.bottom-pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 280px;
  overflow: hidden;
}

.main-layout {
  display: flex;
  gap: 12px;
  align-items: stretch;
  height: 100%;
  min-height: 0;
}

.left-column,
.center-column,
.right-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.left-column {
  flex-shrink: 0;
  width: 40em;
}

.center-column {
  flex: 1;
  min-width: 0;
}

.right-column {
  flex-shrink: 0;
  width: 240px;
}

/* 三卡齐高：卡片撑满列高；附件内容区内部滚动，拖拽区保持紧凑 */
.basic-info-card,
.fee-summary-card,
.attachment-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.basic-info-card :deep(.ant-card-body),
.fee-summary-card :deep(.ant-card-body),
.attachment-card :deep(.ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding-top: 12px;
}

.attachment-card :deep(.ant-card-body) {
  padding: 8px 12px 12px;
}

.attachment-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
}

.attachment-body :deep(.file-upload-input) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.attachment-body :deep(.upload-dragger) {
  flex-shrink: 0;
  padding: 8px 6px;
}

.attachment-body :deep(.upload-dragger-icon) {
  margin-bottom: 4px;
}

.attachment-body :deep(.upload-dragger-icon .text-4xl) {
  font-size: 1.5rem;
  line-height: 1;
}

.attachment-body :deep(.upload-dragger-text) {
  margin-bottom: 2px;
  font-size: 12px;
}

.attachment-body :deep(.upload-dragger-hint) {
  font-size: 11px;
}

.attachment-body :deep(.file-upload-input > .mt-4) {
  flex: 1;
  min-height: 0;
  margin-top: 8px;
  overflow: auto;
}

.attachment-body :deep(.file-upload-input > .mt-4 > .mb-2) {
  margin-bottom: 4px;
  font-size: 12px;
}

.attachment-body :deep(.file-upload-input > .mt-4 > .max-h-20) {
  max-height: calc(100% - 24px);
  overflow-y: auto;
}

/* 费用明细：占底栏剩余高度；表内 fill-height 局部滚动 */
.fee-detail-resize-handle {
  z-index: 2;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 14px;
  margin: 0;
  cursor: row-resize;
  user-select: none;
}

.fee-detail-resize-handle__line {
  width: 56px;
  height: 4px;
  background-color: #e4e8ef;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.fee-detail-resize-handle:hover .fee-detail-resize-handle__line,
.fee-detail-resize-handle.is-dragging .fee-detail-resize-handle__line {
  width: 72px;
  background-color: hsl(var(--primary));
  box-shadow: 0 0 6px hsl(var(--primary) / 30%);
}

.fee-detail-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: auto;
    min-height: 0;
    padding: 12px 16px;
    overflow: hidden;
  }
}

.fee-detail-card :deep(.ant-card-head),
.attachment-card :deep(.ant-card-head),
.fee-summary-card :deep(.ant-card-head) {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
}

.fee-detail-card :deep(.ant-card-head-title) {
  flex: 1;
}

.fee-detail-card :deep(.ant-card-extra) {
  flex-shrink: 0;
}

.card-title-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.title-indicator {
  width: 4px;
  height: 16px;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 55%) 0%,
    hsl(var(--primary)) 100%
  );
  border-radius: 2px;
  box-shadow: 0 0 8px hsl(var(--primary) / 35%);
}

.info-section {
  padding-top: 4px;
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

.info-field :deep(.ant-input),
.info-field :deep(.ant-picker),
.info-field :deep(.ant-select),
.info-field :deep(.ant-input-textarea) {
  width: 100%;
  max-width: 15rem;
}

.info-field :deep(.ant-input-textarea) {
  max-width: 20rem;
}

.field-label {
  font-size: 13px;
  font-weight: normal;
  color: #8c95a3;
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
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--background)) 100%
  );
  border: 1px solid hsl(var(--primary) / 12%);
  border-radius: 8px;
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
  color: hsl(var(--primary));
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
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--background)) 100%
  );
  border: 1px solid hsl(var(--primary) / 12%);
  border-radius: 8px;
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
  color: hsl(var(--primary));
}

.conversion-total-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid hsl(var(--primary) / 12%);
}

.conversion-total-bar__label {
  font-size: 13px;
  color: #8c8c8c;
}

.conversion-total-bar__amount {
  font-size: 22px;
  font-weight: 700;
  color: hsl(var(--primary));
}

.fee-group-table {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  :deep(.ant-table-expanded-row > td) {
    padding: 4px 8px;
  }

  .table-container {
    flex: 1;
    min-height: 0;
    overflow: auto;
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
  color: hsl(var(--primary) / 80%);
  transform-origin: center;
  transition:
    transform 0.15s ease,
    color 0.15s ease;
}

.expand-toggle:hover {
  color: hsl(var(--primary));
}

.expand-toggle--expanded {
  transform: rotate(90deg);
}

.reconciliation-amount {
  display: inline-block;
  padding: 2px 6px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 4px;
}

.receive-amount {
  color: #52c41a;
  background: linear-gradient(135deg, #f6ffed 0%, rgb(82 196 26 / 12%) 100%);
}

.pay-amount {
  color: hsl(var(--primary));
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 14%) 100%
  );
}

.un-receive-amount {
  color: #fa8c16;
  background: linear-gradient(135deg, #fff7e6 0%, rgb(250 140 22 / 12%) 100%);
}

.un-pay-amount {
  color: #ff4d4f;
  background: linear-gradient(135deg, #fff1f0 0%, rgb(255 77 79 / 10%) 100%);
}

.rqst-receive-amount {
  color: #722ed1;
  background: linear-gradient(135deg, #f9f0ff 0%, rgb(114 46 209 / 10%) 100%);
}

.rqst-pay-amount {
  color: #eb2f96;
  background: linear-gradient(135deg, #fff0f6 0%, rgb(235 47 150 / 10%) 100%);
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

.filter-bar {
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 5%) 0%,
    hsl(var(--background)) 70%
  );
  border: 1px solid hsl(var(--primary) / 10%);
  border-radius: 10px;
}
</style>
