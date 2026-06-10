<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import dayjs, { type Dayjs } from 'dayjs';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { getBankStatementDetail } from '#/api/settlement-management/bank-statement-admin';
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
const settlementNo = ref('');
const status = ref(0);
const locked = ref(false);
const lockeTime = ref<string>();
const creatorUserName = ref('');
const settlementTime = ref<Dayjs>(dayjs());
const remark = ref('');
const items = ref<SettlementItem[]>([]);

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
    title: '本次结算金额',
    width: 160,
    slots: { customRender: 'settledAmount' },
  },
  {
    dataIndex: 'settlementName',
    title: '结算对象',
    minWidth: 140,
  },
  {
    dataIndex: 'remark',
    title: '备注',
    minWidth: 180,
    slots: { customRender: 'remark' },
  },
  {
    key: 'action',
    title: '操作',
    width: 90,
    fixed: 'right' as const,
    slots: { customRender: 'action' },
  },
];

async function loadBankStatement(id: string) {
  const detail = await getBankStatementDetail(id);
  bankStatementId.value = detail.id;
  bankStatementNo.value = detail.bankStatementNo || detail.id;
  bankStatementSettlementId.value = detail.settlementId;
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

    if (detail.bankStatementId) {
      try {
        await loadBankStatement(detail.bankStatementId);
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

function handleSelectBankStatement(
  row: BankStatementAdminApi.BankStatementListDto,
) {
  if (items.value.length > 0) {
    message.warning('已有结算明细时不能更换银行流水');
    return;
  }
  bankStatementId.value = row.id;
  bankStatementNo.value = row.bankStatementNo || row.id;
  bankStatementSettlementId.value = row.settlementId;
}

function handleOpenBankPicker() {
  if (isReadonly.value) return;
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
  addFeeDrawerRef.value?.open({
    receiveSettlementId: editId.value,
    settlementId: bankStatementSettlementId.value,
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
}

function updateItemAmount(key: string, value: unknown) {
  const numericValue = Number(value ?? 0);
  items.value = items.value.map((item) =>
    item._key === key
      ? {
          ...item,
          settledAmount: Number.isFinite(numericValue) ? numericValue : 0,
        }
      : item,
  );
}

function updateItemRemark(key: string, value: string | undefined) {
  items.value = items.value.map((item) =>
    item._key === key ? { ...item, remark: value || '' } : item,
  );
}

function handleDeleteItem(row: SettlementItem | Record<string, any>) {
  if (isReadonly.value) return;
  const item = row as SettlementItem;

  Modal.confirm({
    title: '确认删除明细',
    content: `确定要删除费用「${item.feeCodeName || '-'}」吗？`,
    okType: 'danger',
    onOk: async () => {
      if (isEdit.value && editId.value && item.id) {
        submitting.value = true;
        try {
          await deleteReceiveSettlementItems({
            id: editId.value,
            receiveSettlementItemIds: [item.id],
          });
          message.success('删除明细成功');
          await loadEditData();
          markListShouldRefresh('ReceiveSettlementList');
        } catch (error: any) {
          message.error(error.message || '删除明细失败');
        } finally {
          submitting.value = false;
        }
        return;
      }

      items.value = items.value.filter((rowItem) => rowItem._key !== item._key);
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

function goBankStatement() {
  if (!bankStatementId.value) return;
  router.push(`/bank-statement/edit/${bankStatementId.value}`);
}

async function initAddPage() {
  const rawId = route.query.bankStatementId;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return;

  pageLoading.value = true;
  try {
    await loadBankStatement(String(id));
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
      <Card title="结算信息" size="small">
        <div class="form-grid">
          <div class="form-item">
            <div class="form-label">银行流水</div>
            <div class="inline-picker">
              <Input
                :value="bankStatementNo"
                placeholder="请选择银行流水"
                readonly
              />
              <Button
                v-if="!isEdit && !isReadonly"
                @click="handleOpenBankPicker"
              >
                选择
              </Button>
              <Button v-if="bankStatementId" @click="goBankStatement">
                查看
              </Button>
            </div>
          </div>
          <div v-if="isEdit" class="form-item">
            <div class="form-label">结算单号</div>
            <Input :value="settlementNo" disabled />
          </div>
          <div class="form-item">
            <div class="form-label">结算时间</div>
            <DatePicker
              v-model:value="settlementTime"
              show-time
              format="YYYY-MM-DD HH:mm"
              :disabled="isReadonly"
              style="width: 100%"
            />
          </div>
          <div v-if="isEdit" class="form-item">
            <div class="form-label">结算状态</div>
            <Tag :color="getReceiveSettlementStatusColor(status)">
              {{ getReceiveSettlementStatusLabel(status) }}
            </Tag>
          </div>
          <div v-if="isEdit" class="form-item">
            <div class="form-label">锁定状态</div>
            <Space>
              <Tag :color="locked ? 'red' : 'green'">
                {{ locked ? '已锁定' : '未锁定' }}
              </Tag>
              <span v-if="lockeTime">{{ formatDateTime(lockeTime) }}</span>
            </Space>
          </div>
          <div v-if="isEdit" class="form-item">
            <div class="form-label">创建人</div>
            <Input :value="creatorUserName" disabled />
          </div>
          <div class="form-item form-item--wide">
            <div class="form-label">备注</div>
            <Input.TextArea
              v-model:value="remark"
              :disabled="isReadonly"
              :rows="3"
              placeholder="请输入备注"
            />
          </div>
        </div>
      </Card>

      <Card title="结算明细" size="small" class="mt-3">
        <template #extra>
          <Button
            v-if="!isEdit || canEditItems"
            type="primary"
            @click="handleOpenAddFee"
          >
            添加明细
          </Button>
        </template>

        <Table
          :columns="columns"
          :data-source="items"
          :pagination="false"
          :row-key="(record) => record._key"
          size="small"
          bordered
          :scroll="{ x: 1300 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'currencyCode'">
              <Tag v-if="record.currencyCode">{{ record.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-if="column.dataIndex === 'settledAmount'">
              <InputNumber
                v-if="!record.id && !isReadonly"
                :value="record.settledAmount"
                :min="0"
                :max="record.remainingAmount"
                :precision="2"
                style="width: 130px"
                @change="(value) => updateItemAmount(record._key, value)"
              />
              <span v-else>{{ formatAmount(record.settledAmount) }}</span>
            </template>
            <template v-if="column.dataIndex === 'remark'">
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
            <template v-if="column.key === 'action'">
              <Button
                v-if="!isReadonly && (!isEdit || canEditItems)"
                type="link"
                danger
                size="small"
                @click="handleDeleteItem(record)"
              >
                删除
              </Button>
              <span v-else>-</span>
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
  padding: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-item {
  min-width: 0;
}

.form-item--wide {
  grid-column: span 3;
}

.form-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: #666;
}

.inline-picker {
  display: flex;
  width: 100%;
}

.inline-picker :deep(.ant-input) {
  flex: 1;
}
</style>
