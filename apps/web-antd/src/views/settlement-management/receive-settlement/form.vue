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
  getBankStatementDetail,
  getBankStatementReceiveSettlementPagedList,
} from '#/api/settlement-management/bank-statement-admin';
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
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

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

interface SettlementItem extends ReceiveSettlementSelectedFee {
  _key: string;
}

const route = useRoute();
const router = useRouter();
const perm = createAbpPermission('Admin.ReceiveSettlement');
const extraPerm = {
  lock: 'Admin.ReceiveSettlement.Lock',
  unlock: 'Admin.ReceiveSettlement.Unlock',
};
const { hasAccessByCodes } = useAccess();

const editId = computed<string | undefined>(() => {
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
const settlementTime = ref<Dayjs>(dayjs());
const remark = ref('');
const items = ref<SettlementItem[]>([]);
const selectedItemRowKeys = ref<string[]>([]);

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
  if (!isEdit.value) return '新建收费结算';
  return isReadonly.value ? '查看收费结算' : '编辑收费结算';
});

const selectedFeeIds = computed(() =>
  items.value.map((item) => item.orderFeeId),
);

const bankStatementCurrencyCode = computed(
  () => bankStatementDetail.value?.currencyCode || '',
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

const isRemainingOverLimit = computed(() => remainingSettleAmount.value <= 0);

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
    customRender: ({ text }: { text: number }) => formatAmount(text),
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
    dataIndex: 'remark',
    key: 'remark',
    title: '备注',
    minWidth: 180,
  },
];

async function loadBankStatementSummary(id: string) {
  bankStatementSummaryLoading.value = true;
  try {
    const [detail, settlementRes] = await Promise.all([
      getBankStatementDetail(id),
      getBankStatementReceiveSettlementPagedList({
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
    creatorUserName.value = detail.creatorUserName || '';
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
    id: item.id,
    orderFeeId: item.orderFeeId,
    transportOrderId: order?.id,
    commissionNum: order?.commissionNum,
    mblNum: order?.mblNum,
    bookingNum: order?.bookingNum,
    clientName: order?.clientName,
    feeCodeName: orderFee?.feeCodeName,
    currencyCode: orderFee?.currencyCode,
    amount: orderFee?.amount ?? 0,
    remainingAmount: orderFee?.remainingAmount ?? 0,
    settlementName: orderFee?.settlementName,
    settledAmount: item.settledAmount,
    remark: item.remark || '',
  };
}

function mapSelectedFee(fee: SelectedReceiveFee): SettlementItem {
  return {
    _key: makeRowKey(),
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
  addFeeDrawerRef.value?.open({
    receiveSettlementId: editId.value,
    settlementId: bankStatementSettlementId.value,
    settlementName: bankStatementSettlementName.value,
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
      markListShouldRefresh('ReceiveSettlementList');
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
          markListShouldRefresh('ReceiveSettlementList');
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

  const overLimitItem = items.value.find(
    (item) => !item.id && item.settledAmount > item.remainingAmount,
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
        settlementTime: settlementTime.value.toISOString(),
        remark: remark.value || undefined,
      });
      message.success('保存成功');
      markListShouldRefresh('ReceiveSettlementList');
      await loadEditData();
      return;
    }

    const id = await addReceiveSettlement({
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
    markListShouldRefresh('ReceiveSettlementList');
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
    content: `确定要删除收费结算「${settlementNo.value || editId.value}」吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        await deleteReceiveSettlement({ id: editId.value! });
        message.success('删除成功');
        markListShouldRefresh('ReceiveSettlementList');
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
    content: `确定要锁定收费结算「${settlementNo.value || editId.value}」吗？锁定后将无法编辑和删除。`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await lockReceiveSettlement({ id: editId.value! });
        message.success('锁定成功');
        markListShouldRefresh('ReceiveSettlementList');
        await loadEditData();
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
    content: `确定要解锁收费结算「${settlementNo.value || editId.value}」吗？`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await unlockReceiveSettlement({ id: editId.value! });
        message.success('解锁成功');
        markListShouldRefresh('ReceiveSettlementList');
        await loadEditData();
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
        <Button @click="router.back()">返回</Button>
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
      <Card
        v-if="bankStatementId && bankStatementDetail"
        title="银行流水信息"
        size="small"
        class="mb-3"
      >
        <div v-loading="bankStatementSummaryLoading">
          <Descriptions :column="3" size="small" bordered>
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
            <DescriptionsItem label="交易备注" :span="3">
              {{ bankStatementDetail.statementRemark || '-' }}
            </DescriptionsItem>
          </Descriptions>

          <div class="bank-summary-row">
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

      <Card title="结算信息" size="small">
        <div class="form-grid">
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

      <Card title="结算明细" size="small" class="mt-3">
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
          :data-source="items"
          :pagination="false"
          :row-key="(record) => record._key"
          :row-selection="itemRowSelection"
          size="small"
          bordered
          :scroll="{ x: 1210 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'currencyCode'">
              <Tag v-if="record.currencyCode">{{ record.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'settledAmount'">
              <InputNumber
                v-if="!record.id && !isReadonly"
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
    <AddFeeDrawer ref="addFeeDrawerRef" @confirm="handleFeeConfirm" />
  </Page>
</template>

<style scoped lang="scss">
.receive-settlement-form {
  min-width: 0;
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
