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

import { MyOrgSelect } from '#/adapter/component';
import { getBankStatementDetailByPermission } from '#/api/settlement-management/bank-statement-admin';
import {
  addReceiveSettlement,
  addReceiveSettlementItems,
  deleteReceiveSettlement,
  deleteReceiveSettlementItems,
  editReceiveSettlement,
  getReceiveSettlementDetail,
  lockReceiveSettlement,
  unlockReceiveSettlement,
} from '#/api/settlement-management/receive-settlement-admin';
import { formatOrgPathLabel } from '#/composables/use-all-user-org';
import { getMyDefaultOrgId, getMyOrgPath } from '#/composables/use-my-org';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

/** 收费结算变更后，收费结算列表与银行流水列表均需刷新 */
function markReceiveSettlementRelatedListsShouldRefresh() {
  markListShouldRefresh('ReceiveSettlementList');
  markListShouldRefresh('BankStatementList');
}

import AddFeeDrawer from './add-fee-drawer/index.vue';
import type { SelectedReceiveFee } from './add-fee-drawer/data';
import BankStatementPicker from './bank-statement-picker/index.vue';
import {
  formatAmount,
  formatAmountWithCurrency,
  formatDateTime,
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
  type ReceiveSettlementSelectedFee,
} from './form-data';

interface SettlementItem extends Omit<
  ReceiveSettlementSelectedFee,
  'remainingAmount'
> {
  _key: string;
  /** 是否属于当前正在编辑的核销单，只有本单明细可增删改 */
  _isCurrent: boolean;
  /** 所属核销单号，仅其他核销单的明细有值 */
  _settlementNo?: string;
  /** 所属核销单创建人，仅其他核销单的明细有值 */
  _creatorUserName?: string;
  /** 剩余额度仅本单明细的接口返回，其他核销单明细为空 */
  remainingAmount?: number;
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
const addFeeDrawerRef = ref<InstanceType<typeof AddFeeDrawer>>();

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
const items = ref<SettlementItem[]>([]);
const selectedItemRowKeys = ref<string[]>([]);

const orgDisplayName = computed(
  () => formatOrgPathLabel(getMyOrgPath(orgId.value)) || '-',
);

let rowKeyCounter = 0;
const makeRowKey = () => `receive_fee_${++rowKeyCounter}_${Date.now()}`;

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
  if (!isEdit.value) return '新建收费核销';
  return isReadonly.value ? '查看收费核销' : '编辑收费核销';
});

function handleBack() {
  if (props.embedded) {
    emit('close');
    return;
  }
  router.back();
}

const selectedFeeIds = computed(() =>
  items.value.map((item) => item.orderFeeId),
);

const bankStatementCurrencyCode = computed(
  () => bankStatementDetail.value?.currency?.code || '',
);

const currentSettlementTotal = computed(() =>
  items.value.reduce((sum, item) => sum + (item.settledAmount || 0), 0),
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

/** 同一银行流水下其他核销单的明细，只读展示便于核对流水已被谁核销 */
const foreignItems = computed<SettlementItem[]>(() => {
  const settlements = bankStatementDetail.value?.receiveSettlements ?? [];
  return settlements
    .filter((settlement) => settlement.id !== editId.value)
    .flatMap((settlement) => {
      const settlementNoText = settlement.settlementNo || settlement.id;
      const creator =
        settlement.creatorUserNickName || settlement.creatorUserName || '';
      return [
        ...(settlement.receiveSettlementItems ?? []),
        ...(settlement.receiveSettlementInvoiceItems ?? []),
      ].map((item) => mapForeignItem(item, settlementNoText, creator));
    });
});

const tableItems = computed<SettlementItem[]>(() => [
  ...items.value,
  ...foreignItems.value,
]);

const itemRowSelection = computed(() => {
  if (!canManageItems.value) return undefined;
  return {
    selectedRowKeys: selectedItemRowKeys.value,
    getCheckboxProps: (record: SettlementItem) => ({
      disabled: !record._isCurrent,
    }),
    onChange: (keys: (string | number)[]) => {
      selectedItemRowKeys.value = keys.map(String);
    },
  };
});

function itemRowClassName(record: SettlementItem) {
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
    dataIndex: 'commissionNum',
    title: '委托编号',
    width: 150,
  },
  {
    dataIndex: 'mblNum',
    title: '主提单号',
    width: 150,
  },
  {
    dataIndex: 'feeCodeName',
    title: '费用名称',
    minWidth: 150,
  },
  {
    dataIndex: 'currencyCode',
    title: '币别',
    width: 90,
  },
  {
    dataIndex: 'amount',
    title: '费用总额',
    width: 120,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'remainingAmount',
    title: '剩余额度',
    width: 120,
    align: 'right' as const,
    customRender: ({ record }: { record: SettlementItem }) =>
      record.remainingAmount === undefined
        ? '-'
        : formatAmount(record.remainingAmount),
  },
  {
    dataIndex: 'settledAmount',
    key: 'settledAmount',
    title: '本次结算金额',
    width: 160,
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
    minWidth: 180,
  },
];

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
      .reduce(
        (sum, settlement) => sum + (settlement.totalSettledAmount || 0),
        0,
      );
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
    creatorUserName.value = detail.creatorUserName || '';
    orgId.value = detail.orgId ?? undefined;
    settlementTime.value = detail.settlementTime
      ? dayjs(detail.settlementTime)
      : dayjs();
    remark.value = detail.remark || '';
    items.value = (detail.receiveSettlementItems || []).map((item) =>
      mapDetailItem(item),
    );
    selectedItemRowKeys.value = [];

    if (detail.bankStatementId) {
      try {
        await loadBankStatementSummary(detail.bankStatementId);
      } catch {
        // 详情接口已返回流水号时，不因补充摘要失败阻断编辑页。
      }
    }
  } finally {
    pageLoading.value = false;
  }
}

function mapDetailItem(
  item: ReceiveSettlementAdminApi.ReceiveSettlementItemDetailDto,
): SettlementItem {
  const orderFee = item.orderFee;
  const order = item.transportOrder;
  return {
    _key: makeRowKey(),
    _isCurrent: true,
    id: item.id,
    orderFeeId: item.orderFeeId,
    transportOrderId: order?.id,
    commissionNum: order?.commissionNum,
    mblNum: order?.mblNum,
    bookingNum: order?.bookingNum,
    clientName: order?.client?.name,
    feeCodeName: orderFee?.feeCode?.cnName,
    currencyCode: orderFee?.currency?.code,
    amount: orderFee?.amount ?? 0,
    remainingAmount: orderFee?.remainingAmount ?? 0,
    settlementName: orderFee?.settlement?.name,
    settledAmount: item.settledAmount,
    remark: item.remark || '',
  };
}

/** 其他核销单的明细行：主键稳定复用后端 id，避免 computed 重算时表格整片重挂载 */
function mapForeignItem(
  item:
    | ReceiveSettlementAdminApi.ReceiveSettlementInvoiceItemDetailDto
    | ReceiveSettlementAdminApi.ReceiveSettlementItemDetailDto,
  settlementNoText: string,
  creatorName: string,
): SettlementItem {
  const orderFee = item.orderFee;
  const order = item.transportOrder;
  return {
    _key: `foreign_${item.id}`,
    _isCurrent: false,
    _settlementNo: settlementNoText,
    _creatorUserName: creatorName,
    id: item.id,
    orderFeeId: item.orderFeeId,
    transportOrderId: order?.id,
    commissionNum: order?.commissionNum,
    mblNum: order?.mblNum,
    bookingNum: order?.bookingNum,
    clientName: order?.client?.name,
    feeCodeName: orderFee?.feeCode?.cnName,
    currencyCode: orderFee?.currency?.code,
    amount: orderFee?.amount ?? 0,
    remainingAmount: orderFee?.remainingAmount,
    settlementName: orderFee?.settlement?.name,
    settledAmount: item.settledAmount,
    remark: item.remark || '',
  };
}

function mapSelectedFee(fee: SelectedReceiveFee): SettlementItem {
  return {
    _key: makeRowKey(),
    _isCurrent: true,
    orderFeeId: fee.orderFeeId,
    transportOrderId: fee.transportOrderId,
    commissionNum: fee.commissionNum,
    mblNum: fee.mblNum,
    bookingNum: fee.bookingNum,
    clientName: fee.clientName,
    feeCodeName: fee.feeCodeName,
    currencyCode: fee.currencyCode,
    amount: fee.amount,
    remainingAmount: fee.remainingAmount,
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

function handleOpenAddFee() {
  if (!bankStatementId.value) {
    message.warning('请先选择银行流水');
    return;
  }
  if (!bankStatementSettlementId.value) {
    message.warning('当前银行流水未关联结算对象');
    return;
  }
  const currencyId = bankStatementDetail.value?.currencyId;
  if (!currencyId) {
    message.warning('当前银行流水未关联币别');
    return;
  }
  addFeeDrawerRef.value?.open({
    receiveSettlementId: editId.value,
    settlementId: bankStatementSettlementId.value,
    settlementName: bankStatementSettlementName.value,
    currencyId,
    currencyCode: bankStatementDetail.value?.currency?.code,
    selectedFeeIds: selectedFeeIds.value,
  });
}

async function handleFeeConfirm(fees: SelectedReceiveFee[]) {
  const existingIds = new Set(items.value.map((item) => item.orderFeeId));
  const incoming = fees.filter((fee) => !existingIds.has(fee.orderFeeId));
  if (incoming.length === 0) {
    message.warning('选择的费用已在明细中');
    return;
  }

  if (isEdit.value && editId.value) {
    submitting.value = true;
    try {
      await addReceiveSettlementItems({
        id: editId.value,
        receiveSettlementItems: incoming.map((fee) => ({
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
          await deleteReceiveSettlementItems({
            id: editId.value,
            receiveSettlementItemIds: itemIds,
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

  const invalidItem = items.value.find(
    (item) => !item.settledAmount || item.settledAmount <= 0,
  );
  if (invalidItem) {
    message.warning(
      `费用「${invalidItem.feeCodeName || '-'}」结算金额必须大于0`,
    );
    return false;
  }

  const overLimitItem = items.value.find(
    (item) =>
      !item.id &&
      item.remainingAmount !== undefined &&
      item.settledAmount > item.remainingAmount,
  );
  if (overLimitItem) {
    message.warning(
      `费用「${overLimitItem.feeCodeName || '-'}」结算金额不能超过剩余额度 ${formatAmount(overLimitItem.remainingAmount)}`,
    );
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
        remark: remark.value || undefined,
      });
      message.success('保存成功');
      markReceiveSettlementRelatedListsShouldRefresh();
      await loadEditData();
      emit('changed');
      return;
    }

    const id = await addReceiveSettlement({
      orgId: orgId.value!,
      bankStatementId: bankStatementId.value,
      settlementTime: settlementTime.value.toISOString(),
      remark: remark.value || undefined,
      receiveSettlementItems: items.value.map((item) => ({
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
    router.replace(`/settlement-management/receive-settlement/edit/${id}`);
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
    content: `确定要删除收费核销「${settlementNo.value || editId.value}」吗？`,
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
    content: `确定要锁定收费核销「${settlementNo.value || editId.value}」吗？锁定后将无法编辑和删除。`,
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
    content: `确定要解锁收费核销「${settlementNo.value || editId.value}」吗？`,
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
                归属组织 <span v-if="!isEdit" class="text-red-500">*</span>
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

      <Card size="small" class="mt-3">
        <template #title>
          <Space size="small">
            <span>结算明细</span>
            <span v-if="foreignItems.length > 0" class="settlement-items-hint">
              含本流水下其他核销单明细 {{ foreignItems.length }} 条（只读）
            </span>
          </Space>
        </template>
        <template v-if="canManageItems" #extra>
          <Space size="small">
            <Button size="small" @click="handleOpenAddFee">
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
          :data-source="tableItems"
          :pagination="false"
          :row-key="(record) => record._key"
          :row-selection="itemRowSelection"
          :row-class-name="itemRowClassName"
          size="small"
          bordered
          :scroll="{ x: 1460 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'ownerSettlementNo'">
              <Tag v-if="record._isCurrent" color="blue">本单</Tag>
              <span v-else>{{ record._settlementNo || '-' }}</span>
            </template>
            <template v-if="column.key === 'ownerCreator'">
              <span>
                {{
                  record._isCurrent
                    ? creatorUserName || '-'
                    : record._creatorUserName || '-'
                }}
              </span>
            </template>
            <template v-if="column.dataIndex === 'currencyCode'">
              <Tag v-if="record.currencyCode">{{ record.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'settledAmount'">
              <InputNumber
                v-if="record._isCurrent && !record.id && !isReadonly"
                v-model:value="record.settledAmount"
                :min="0"
                :max="record.remainingAmount"
                :precision="2"
                style="width: 130px"
              />
              <span v-else>{{ formatAmount(record.settledAmount) }}</span>
            </template>
            <template v-if="column.key === 'remark'">
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
    <AddFeeDrawer ref="addFeeDrawerRef" @confirm="handleFeeConfirm" />
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

.settlement-items-hint {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
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
