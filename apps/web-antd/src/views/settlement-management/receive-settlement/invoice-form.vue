<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import dayjs, { type Dayjs } from 'dayjs';

import {
  Button,
  Card,
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

import {
  getBankStatementDetailByPermission,
  getBankStatementReceiveSettlementPagedListByPermission,
} from '#/api/settlement-management/bank-statement-admin';
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
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import AddInvoiceApplicationDrawer from './add-invoice-application-drawer/index.vue';
import type { SelectedInvoiceFee } from './add-invoice-application-drawer/data';
import BankStatementPicker from './bank-statement-picker/index.vue';
import {
  formatAmount,
  formatAmountWithCurrency,
  formatDateTime,
  getPaySideColor,
  getPaySideLabel,
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
  toNetAmount,
} from './form-data';

/** 收费核销变更后，收费核销列表与银行流水列表均需刷新 */
function markReceiveSettlementRelatedListsShouldRefresh() {
  markListShouldRefresh('ReceiveSettlementList');
  markListShouldRefresh('BankStatementList');
}

interface InvoiceSettlementItem {
  _key: string;
  id?: string;
  invoiceApplicationId?: string;
  invoiceApplicationItemId: string;
  orderFeeId: string;
  applicationNo?: string;
  invoiceNo?: string;
  appliedAmount?: number;
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
  settledAmount: number;
  remark?: string;
}

const route = useRoute();
const router = useRouter();
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
const settlementTime = ref<Dayjs>(dayjs());
const remark = ref('');
const items = ref<InvoiceSettlementItem[]>([]);
const selectedItemRowKeys = ref<string[]>([]);

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
  items.value.map((item) => item.invoiceApplicationItemId),
);

const bankStatementCurrencyCode = computed(
  () => bankStatementDetail.value?.currencyCode || '',
);

/** 本单本次结算净额（Σ应收 − Σ应付） */
const currentSettlementTotal = computed(() =>
  items.value.reduce(
    (sum, item) => sum + toNetAmount(item.paySide, item.settledAmount || 0),
    0,
  ),
);

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

const itemRowSelection = computed(() => {
  if (!canManageItems.value) return undefined;
  return {
    selectedRowKeys: selectedItemRowKeys.value,
    onChange: (keys: (string | number)[]) => {
      selectedItemRowKeys.value = keys.map(String);
    },
  };
});

const columns = [
  {
    dataIndex: 'applicationNo',
    title: '开票申请单号',
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
    title: '本单开票额',
    width: 110,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
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
    dataIndex: 'remark',
    key: 'remark',
    title: '备注',
    minWidth: 160,
  },
];

async function loadBankStatementSummary(id: string) {
  bankStatementSummaryLoading.value = true;
  try {
    const [detail, settlementRes] = await Promise.all([
      getBankStatementDetailByPermission(id),
      getBankStatementReceiveSettlementPagedListByPermission({
        bankStatementId: id,
        pageIndex: 1,
        pageSize: 500,
      }),
    ]);

    bankStatementId.value = detail.id;
    bankStatementNo.value = detail.bankStatementNo || detail.id;
    bankStatementSettlementId.value = detail.settlementId;
    bankStatementSettlementName.value = detail.settlementName || '';
    bankStatementDetail.value = detail;
    otherSettledAmount.value = (settlementRes.items ?? [])
      .filter((item) => item.id !== editId.value)
      .reduce((sum, item) => sum + (item.totalSettledAmount || 0), 0);
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
    settlementTime.value = detail.settlementTime
      ? dayjs(detail.settlementTime)
      : dayjs();
    remark.value = detail.remark || '';
    items.value = (detail.receiveSettlementInvoiceItems || []).map((item) =>
      mapDetailItem(item),
    );
    selectedItemRowKeys.value = [];

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

function mapDetailItem(
  item: ReceiveSettlementAdminApi.ReceiveSettlementInvoiceItemDetailDto,
): InvoiceSettlementItem {
  const orderFee = item.orderFee;
  const order = item.transportOrder;
  return {
    _key: makeRowKey(),
    id: item.id,
    invoiceApplicationId: item.invoiceApplicationId,
    invoiceApplicationItemId: item.invoiceApplicationItemId,
    orderFeeId: item.orderFeeId,
    applicationNo: item.applicationNo,
    invoiceNo: item.invoiceNo,
    appliedAmount: item.appliedAmount,
    paySide: orderFee?.paySide,
    transportOrderId: order?.id,
    commissionNum: order?.commissionNum,
    mblNum: order?.mblNum,
    bookingNum: order?.bookingNum,
    clientName: order?.clientName,
    feeCodeName: orderFee?.feeCodeName,
    currencyCode: orderFee?.currencyCode,
    amount: orderFee?.amount ?? 0,
    settlementName: orderFee?.settlementName,
    settledAmount: item.settledAmount,
    remark: item.remark || '',
  };
}

function mapSelectedFee(fee: SelectedInvoiceFee): InvoiceSettlementItem {
  return {
    _key: makeRowKey(),
    invoiceApplicationId: fee.invoiceApplicationId,
    invoiceApplicationItemId: fee.invoiceApplicationItemId,
    orderFeeId: fee.orderFeeId,
    applicationNo: fee.applicationNo,
    invoiceNo: fee.invoiceNo,
    appliedAmount: fee.appliedAmount,
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
    currencyCode: bankStatementDetail.value?.currencyCode,
    selectedItemIds: selectedInvoiceItemIds.value,
  });
}

async function handleInvoiceConfirm(fees: SelectedInvoiceFee[]) {
  const existingIds = new Set(
    items.value.map((item) => item.invoiceApplicationItemId),
  );
  const incoming = fees.filter(
    (fee) => !existingIds.has(fee.invoiceApplicationItemId),
  );
  if (incoming.length === 0) {
    message.warning('选择的开票明细已在明细中');
    return;
  }

  if (isEdit.value && editId.value) {
    submitting.value = true;
    try {
      await addReceiveSettlementItemsByInvoiceApplication({
        id: editId.value,
        items: incoming.map((fee) => ({
          invoiceApplicationItemId: fee.invoiceApplicationItemId,
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
    onOk: async () => {
      if (isEdit.value && editId.value) {
        const itemIds = selectedItems
          .map((item) => item.id)
          .filter((id): id is string => !!id);
        if (itemIds.length !== selectedItems.length) {
          message.warning('所选明细无法删除，请刷新后重试');
          return;
        }

        submitting.value = true;
        try {
          await deleteReceiveSettlementInvoiceItems({
            id: editId.value,
            receiveSettlementInvoiceItemIds: itemIds,
          });
          message.success('删除明细成功');
          selectedItemRowKeys.value = [];
          await loadEditData();
          markReceiveSettlementRelatedListsShouldRefresh();
          emit('changed');
        } catch (error: any) {
          message.error(error.message || '删除明细失败');
        } finally {
          submitting.value = false;
        }
        return;
      }

      const selectedKeySet = new Set(selectedItemRowKeys.value);
      items.value = items.value.filter(
        (item) => !selectedKeySet.has(item._key),
      );
      selectedItemRowKeys.value = [];
    },
  });
}

function validateForm(): boolean {
  if (!bankStatementId.value) {
    message.warning('请选择银行流水');
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

  const invalidItem = items.value.find(
    (item) => !item.settledAmount || item.settledAmount <= 0,
  );
  if (invalidItem) {
    message.warning(
      `费用「${invalidItem.feeCodeName || '-'}」结算金额必须大于0`,
    );
    return false;
  }

  // 未保存明细按费用聚合校验发票口径可结算余额
  const consumedByFee = new Map<string, number>();
  const settleableByFee = new Map<string, number>();
  for (const item of items.value) {
    if (item.id) continue;
    consumedByFee.set(
      item.orderFeeId,
      (consumedByFee.get(item.orderFeeId) ?? 0) + item.settledAmount,
    );
    settleableByFee.set(item.orderFeeId, item.invoiceSettleableAmount ?? 0);
  }
  for (const [orderFeeId, consumed] of consumedByFee) {
    const settleable = settleableByFee.get(orderFeeId) ?? 0;
    if (consumed > settleable + 1e-6) {
      const item = items.value.find((i) => i.orderFeeId === orderFeeId);
      message.warning(
        `费用「${item?.feeCodeName || '-'}」发票口径可结算余额不足，可用额度 ${formatAmount(settleable)}`,
      );
      return false;
    }
  }

  if (bankStatementDetail.value && remainingSettleAmount.value < 0) {
    const availableAmount =
      bankStatementDetail.value.amount - otherSettledAmount.value;
    message.warning(
      `本单结算净额 ${formatBankAmount(currentSettlementTotal.value)} 已超过流水剩余可结算金额 ${formatBankAmount(availableAmount)}`,
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
        settlementTime: settlementTime.value.toISOString(),
        remark: remark.value || undefined,
      });
      message.success('保存成功');
      markReceiveSettlementRelatedListsShouldRefresh();
      await loadEditData();
      emit('changed');
      return;
    }

    const id = await addReceiveSettlementByInvoiceApplication({
      bankStatementId: bankStatementId.value,
      settlementTime: settlementTime.value.toISOString(),
      remark: remark.value || undefined,
      items: items.value.map((item) => ({
        invoiceApplicationItemId: item.invoiceApplicationItemId,
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
    router.replace(
      `/settlement-management/receive-settlement/edit-by-invoice/${id}`,
    );
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
        <Button @click="handleBack">{{ embedded ? '关闭' : '返回' }}</Button>
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
                <Tag v-if="bankStatementDetail.currencyCode">
                  {{ bankStatementDetail.currencyCode }}
                </Tag>
                <span v-else>-</span>
              </DescriptionsItem>
              <DescriptionsItem label="付款方">
                {{ bankStatementDetail.settlementName || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="我司银行">
                {{ bankStatementDetail.orgBankAccountName || '-' }}
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
                  本单结算净额已超过流水剩余可结算金额
                </span>
              </div>
              <div class="bank-summary-item">
                <span class="bank-summary-label">本单本次净额</span>
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

      <Card title="开票结算明细" size="small" class="mt-3">
        <template v-if="canManageItems" #extra>
          <Space size="small">
            <Button size="small" @click="handleOpenAddInvoice">
              <IconifyIcon icon="mdi:plus" class="toolbar-btn-icon" />
              添加明细
            </Button>
            <Button
              size="small"
              danger
              :disabled="selectedItemRowKeys.length === 0"
              @click="handleDeleteSelectedItems"
            >
              <IconifyIcon icon="mdi:delete-outline" class="toolbar-btn-icon" />
              删除
            </Button>
          </Space>
        </template>

        <Table
          :columns="columns"
          :data-source="items"
          :pagination="false"
          :row-key="(record) => record._key"
          :row-selection="itemRowSelection"
          size="small"
          bordered
          :scroll="{ x: 1500 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'paySide'">
              <Tag :color="getPaySideColor(record.paySide)">
                {{ getPaySideLabel(record.paySide) }}
              </Tag>
            </template>
            <template v-else-if="column.dataIndex === 'currencyCode'">
              <Tag v-if="record.currencyCode">{{ record.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'settledAmount'">
              <InputNumber
                v-if="!record.id && !isReadonly"
                v-model:value="record.settledAmount"
                :min="0"
                :max="record.invoiceSettleableAmount"
                :precision="2"
                style="width: 130px"
              />
              <span v-else>{{ formatAmount(record.settledAmount) }}</span>
            </template>
            <template v-else-if="column.key === 'remark'">
              <Input
                v-if="!record.id && !isReadonly"
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

.toolbar-btn-icon {
  margin-right: 4px;
  font-size: 14px;
  vertical-align: -2px;
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
