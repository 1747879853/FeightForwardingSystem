<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  ClientSelect,
  CurrencySelect,
  OrgBankAccountSelect,
  ClientBankAccountSelect,
} from '#/adapter/component';
import {
  addBankStatement,
  editBankStatement,
  getBankStatementDetail,
  getBankStatementReceiveSettlementPagedList,
} from '#/api/settlement-management/bank-statement-admin';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import CreateSettlementFeePanel from './components/create-settlement-fee-panel.vue';
import OperatorTitleBar from './components/operator-title-bar.vue';
import ReceiveSettlementPanel from './components/receive-settlement-panel.vue';
import { getBankStatementWriteOffStatusInfo } from './data';
import { type BankStatementOperatorRow, buildOperatorRows } from './utils';

const perm = createAbpPermission('Admin.BankStatement');
const receiveSettlementPerm = createAbpPermission('Admin.ReceiveSettlement');
const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();

const canEdit = computed(() => hasAccessByCodes([perm.edit]));
const canAddReceiveSettlement = computed(() =>
  hasAccessByCodes([receiveSettlementPerm.add]),
);

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const isEdit = computed(() => !!editId.value);

const pageLoading = ref(false);
const submitting = ref(false);

const bankStatementNo = ref<string>('');
const statementTime = ref(dayjs());
const amount = ref<number | undefined>(undefined);
const currencyId = ref<number | undefined>(undefined);
const transactionFee = ref<number | undefined>(undefined);
const statementRemark = ref('');
const remark = ref('');
const messageText = ref('');
const orgBankAccountId = ref<string | undefined>(undefined);
const settlementId = ref<string>('');
const clientInvoiceBankId = ref<string | undefined>(undefined);
/** 已落库的流水快照，供底部选费区使用（不随未保存的表单编辑变化） */
const savedSettlementId = ref<string>('');
const savedSettlementName = ref('');
const savedCurrencyId = ref<number | undefined>(undefined);
const savedCurrencyCode = ref('');
const savedAmount = ref(0);
const writeOffStatus = ref<
  BankStatementAdminApi.BankStatementWriteOffStatus | undefined
>(undefined);
const settledAmount = ref(0);

let rowKeyCounter = 0;
const makeRowKey = () => `op_${++rowKeyCounter}_${Date.now()}`;
const operatorRows = ref<BankStatementOperatorRow[]>([]);

const settlementPanelRef = ref<InstanceType<typeof ReceiveSettlementPanel>>();
const createFeePanelRef = ref<InstanceType<typeof CreateSettlementFeePanel>>();
const leftPanelRef = ref<HTMLElement>();
const rightPanelMaxHeight = ref<number>();

const rightPanelStyle = computed(() =>
  rightPanelMaxHeight.value
    ? { maxHeight: `${rightPanelMaxHeight.value}px` }
    : undefined,
);

let leftPanelResizeObserver: ResizeObserver | undefined;

function syncRightPanelHeight() {
  rightPanelMaxHeight.value = leftPanelRef.value?.offsetHeight ?? 0;
}

function setupLeftPanelResizeObserver() {
  leftPanelResizeObserver?.disconnect();
  if (!leftPanelRef.value) return;
  leftPanelResizeObserver = new ResizeObserver(() => {
    syncRightPanelHeight();
  });
  leftPanelResizeObserver.observe(leftPanelRef.value);
  syncRightPanelHeight();
}

const writeOffStatusInfo = computed(() =>
  getBankStatementWriteOffStatusInfo(writeOffStatus.value),
);

const otherSettledAmount = computed(() => settledAmount.value || 0);

function applySavedBankStatementSnapshot(
  detail: BankStatementAdminApi.BankStatementDetailDto,
) {
  savedSettlementId.value = detail.settlementId;
  savedSettlementName.value = detail.settlementName || '';
  savedCurrencyId.value = detail.currencyId;
  savedCurrencyCode.value = detail.currencyCode || '';
  savedAmount.value = detail.amount ?? 0;
}

watch(settlementId, () => {
  clientInvoiceBankId.value = undefined;
});

async function loadOtherSettledAmount() {
  if (!editId.value) {
    settledAmount.value = 0;
    return;
  }

  const res = await getBankStatementReceiveSettlementPagedList({
    bankStatementId: editId.value,
    pageIndex: 1,
    pageSize: 500,
  });
  settledAmount.value = (res.items ?? []).reduce(
    (sum, item) => sum + (item.totalSettledAmount || 0),
    0,
  );
}

async function loadEditData() {
  if (!editId.value) return;
  pageLoading.value = true;
  try {
    const detail = await getBankStatementDetail(editId.value);
    bankStatementNo.value = detail.bankStatementNo || '';
    statementTime.value = detail.statementTime
      ? dayjs(detail.statementTime)
      : dayjs();
    amount.value = detail.amount;
    currencyId.value = detail.currencyId;
    transactionFee.value = detail.transactionFee;
    statementRemark.value = detail.statementRemark || '';
    remark.value = detail.remark || '';
    messageText.value = detail.message || '';
    orgBankAccountId.value = detail.orgBankAccountId;
    settlementId.value = detail.settlementId;
    clientInvoiceBankId.value = detail.clientInvoiceBankId;
    writeOffStatus.value = detail.writeOffStatus;
    settledAmount.value = detail.settledAmount ?? 0;
    applySavedBankStatementSnapshot(detail);

    operatorRows.value = await buildOperatorRows(
      detail.bankStatementUsers,
      makeRowKey,
    );

    await loadOtherSettledAmount();
    await settlementPanelRef.value?.refresh();
    await createFeePanelRef.value?.reload();
  } finally {
    pageLoading.value = false;
  }
}

async function handleSettlementCreated() {
  await loadEditData();
  await createFeePanelRef.value?.reload();
}

async function handleSettlementDeleted() {
  await loadEditData();
  await createFeePanelRef.value?.reload();
}

async function handleSave() {
  if (!amount.value && amount.value !== 0) {
    message.warning('请输入总金额');
    return;
  }
  if (!currencyId.value) {
    message.warning('请选择币别');
    return;
  }
  if (!statementTime.value) {
    message.warning('请选择交易时间');
    return;
  }
  if (!settlementId.value) {
    message.warning('请选择付款方');
    return;
  }

  const bankStatementUsers = operatorRows.value
    .filter((row) => row.operationId)
    .map((row) => ({
      operationId: row.operationId!,
      remark: row.remark || '',
    }));

  submitting.value = true;
  try {
    if (isEdit.value) {
      await editBankStatement({
        id: editId.value!,
        amount: amount.value!,
        currencyId: currencyId.value!,
        statementTime: statementTime.value.toISOString(),
        transactionFee: transactionFee.value,
        statementRemark: statementRemark.value || undefined,
        remark: remark.value || undefined,
        orgBankAccountId: orgBankAccountId.value,
        settlementId: settlementId.value,
        clientInvoiceBankId: clientInvoiceBankId.value,
        message: messageText.value || undefined,
        bankStatementUsers,
      });
      message.success('保存成功');
      markListShouldRefresh('BankStatementList');
      await loadEditData();
    } else {
      const newId = await addBankStatement({
        amount: amount.value!,
        currencyId: currencyId.value!,
        statementTime: statementTime.value.toISOString(),
        transactionFee: transactionFee.value,
        statementRemark: statementRemark.value || undefined,
        remark: remark.value || undefined,
        orgBankAccountId: orgBankAccountId.value,
        settlementId: settlementId.value,
        clientInvoiceBankId: clientInvoiceBankId.value,
        message: messageText.value || undefined,
        bankStatementUsers,
      });
      message.success('创建成功');
      markListShouldRefresh('BankStatementList');
      router.replace(`/bank-statement/edit/${newId}`);
    }
  } finally {
    submitting.value = false;
  }
}

function handleBack() {
  router.push('/bank-statement');
}

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  }
});

watch(
  () => [isEdit.value, pageLoading.value] as const,
  async ([editMode, loading]) => {
    if (!editMode || loading) return;
    await nextTick();
    setupLeftPanelResizeObserver();
  },
);

onUnmounted(() => {
  leftPanelResizeObserver?.disconnect();
});
</script>

<template>
  <Page content-class="!p-3">
    <template #title>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span class="text-lg font-semibold">
          {{ isEdit ? '编辑银行流水' : '新建银行流水' }}
        </span>
        <OperatorTitleBar
          v-model:rows="operatorRows"
          :disabled="!canEdit && isEdit"
        />
      </div>
    </template>

    <template #extra>
      <Space>
        <Button @click="handleBack">返回</Button>
        <Button
          v-if="canEdit || !isEdit"
          type="primary"
          :loading="submitting"
          @click="handleSave"
        >
          保存
        </Button>
      </Space>
    </template>

    <div
      v-loading="pageLoading"
      class="bank-statement-page flex flex-col gap-3"
    >
      <div
        class="form-main-layout"
        :class="{ 'form-main-layout--create': !isEdit }"
      >
        <div ref="leftPanelRef" class="form-main-layout__left">
          <Card title="流水信息" size="small" class="form-panel-card">
            <div class="bank-statement-form grid grid-cols-2 gap-x-4 gap-y-3">
              <template v-if="isEdit">
                <div>
                  <div class="mb-1 text-xs text-gray-500">流水号</div>
                  <div
                    class="flex h-8 items-center gap-2 text-sm text-gray-600"
                  >
                    <span>{{ bankStatementNo || '-' }}</span>
                    <Tag :color="writeOffStatusInfo.color">
                      {{ writeOffStatusInfo.label }}
                    </Tag>
                  </div>
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    交易时间 <span class="text-red-500">*</span>
                  </div>
                  <DatePicker
                    v-model:value="statementTime"
                    :show-time="false"
                    format="YYYY-MM-DD"
                    :disabled="!canEdit && isEdit"
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    币别 <span class="text-red-500">*</span>
                  </div>
                  <CurrencySelect
                    v-model="currencyId"
                    :disabled="!canEdit && isEdit"
                    placeholder="请选择币别"
                    allow-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    总金额 <span class="text-red-500">*</span>
                  </div>
                  <InputNumber
                    v-model:value="amount"
                    :min="0"
                    :precision="2"
                    :disabled="!canEdit && isEdit"
                    class="w-full"
                    placeholder="请输入金额"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    付款方 <span class="text-red-500">*</span>
                  </div>
                  <ClientSelect
                    v-model="settlementId"
                    :disabled="!canEdit && isEdit"
                    placeholder="请选择付款方"
                    allow-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">手续费</div>
                  <InputNumber
                    v-model:value="transactionFee"
                    :min="0"
                    :precision="2"
                    :disabled="!canEdit && isEdit"
                    class="w-full"
                    placeholder="请输入手续费"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">我司银行</div>
                  <OrgBankAccountSelect
                    :value="orgBankAccountId"
                    :disabled="!canEdit && isEdit"
                    placeholder="请选择我司银行"
                    allow-clear
                    class="w-full"
                    @update:value="(v) => (orgBankAccountId = v)"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">对方银行</div>
                  <ClientBankAccountSelect
                    :value="clientInvoiceBankId"
                    :client-id="settlementId"
                    :disabled="(!canEdit && isEdit) || !settlementId"
                    placeholder="请先选择付款方"
                    allow-clear
                    class="w-full"
                    @update:value="(v) => (clientInvoiceBankId = v)"
                  />
                </div>
              </template>

              <template v-else>
                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    交易时间 <span class="text-red-500">*</span>
                  </div>
                  <DatePicker
                    v-model:value="statementTime"
                    :show-time="false"
                    format="YYYY-MM-DD"
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    币别 <span class="text-red-500">*</span>
                  </div>
                  <CurrencySelect
                    v-model="currencyId"
                    placeholder="请选择币别"
                    allow-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    付款方 <span class="text-red-500">*</span>
                  </div>
                  <ClientSelect
                    v-model="settlementId"
                    placeholder="请选择付款方"
                    allow-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    总金额 <span class="text-red-500">*</span>
                  </div>
                  <InputNumber
                    v-model:value="amount"
                    :min="0"
                    :precision="2"
                    class="w-full"
                    placeholder="请输入金额"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">手续费</div>
                  <InputNumber
                    v-model:value="transactionFee"
                    :min="0"
                    :precision="2"
                    class="w-full"
                    placeholder="请输入手续费"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">我司银行</div>
                  <OrgBankAccountSelect
                    :value="orgBankAccountId"
                    placeholder="请选择我司银行"
                    allow-clear
                    class="w-full"
                    @update:value="(v) => (orgBankAccountId = v)"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">对方银行</div>
                  <ClientBankAccountSelect
                    :value="clientInvoiceBankId"
                    :client-id="settlementId"
                    :disabled="!settlementId"
                    placeholder="请先选择付款方"
                    allow-clear
                    class="w-full"
                    @update:value="(v) => (clientInvoiceBankId = v)"
                  />
                </div>
              </template>

              <div>
                <div class="mb-1 text-xs text-gray-500">交易备注</div>
                <Input
                  v-model:value="statementRemark"
                  :disabled="!canEdit && isEdit"
                  placeholder="请输入交易备注"
                  allow-clear
                />
              </div>

              <div>
                <div class="mb-1 text-xs text-gray-500">留言</div>
                <Input
                  v-model:value="messageText"
                  :disabled="!canEdit && isEdit"
                  placeholder="请输入留言"
                  allow-clear
                />
              </div>

              <div>
                <div class="mb-1 text-xs text-gray-500">备注</div>
                <Input
                  v-model:value="remark"
                  :disabled="!canEdit && isEdit"
                  placeholder="请输入备注"
                  allow-clear
                />
              </div>
            </div>
          </Card>
        </div>

        <div
          v-if="isEdit"
          class="form-main-layout__right"
          :style="rightPanelStyle"
        >
          <ReceiveSettlementPanel
            ref="settlementPanelRef"
            :bank-statement-id="editId || ''"
            @deleted="handleSettlementDeleted"
          />
        </div>
      </div>

      <CreateSettlementFeePanel
        v-if="isEdit && canAddReceiveSettlement && editId"
        ref="createFeePanelRef"
        :bank-statement-id="editId"
        :bank-statement-amount="savedAmount"
        :other-settled-amount="otherSettledAmount"
        :settlement-id="savedSettlementId"
        :settlement-name="savedSettlementName"
        :currency-id="savedCurrencyId"
        :currency-code="savedCurrencyCode"
        @created="handleSettlementCreated"
      />
    </div>
  </Page>
</template>

<style scoped lang="scss">
.form-main-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 7fr);
  gap: 12px;
  align-items: stretch;
}

.form-main-layout--create {
  grid-template-columns: 1fr;
}

.form-main-layout__left {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.form-main-layout__right {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.form-main-layout__right > * {
  flex: 1;
  min-height: 0;
}

.form-panel-card {
  display: flex;
  flex: 1;
  flex-direction: column;

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
}

.bank-statement-form {
  :deep(.ant-picker),
  :deep(.ant-input-number),
  :deep(.ant-select) {
    width: 100%;
  }
}

@media (max-width: 1280px) {
  .form-main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
