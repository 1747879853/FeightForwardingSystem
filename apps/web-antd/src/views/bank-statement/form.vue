<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  DatePicker,
  DropdownButton,
  Input,
  InputNumber,
  Menu,
  MenuItem,
  message,
  Modal,
  Progress,
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
  BankStatementAdminApi,
  addBankStatement,
  editBankStatement,
  getBankStatementDetail,
  getBankStatementReceiveSettlementPagedList,
} from '#/api/settlement-management/bank-statement-admin';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import OperatorTitleBar from './components/operator-title-bar.vue';
import ReceiveSettlementPanel from './components/receive-settlement-panel.vue';
import SettlementWorkbenchDrawer from './components/settlement-workbench-drawer.vue';
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
const creatorUserName = ref('');

let rowKeyCounter = 0;
const makeRowKey = () => `op_${++rowKeyCounter}_${Date.now()}`;
const operatorRows = ref<BankStatementOperatorRow[]>([]);

const settlementPanelRef = ref<InstanceType<typeof ReceiveSettlementPanel>>();
const settlementDrawerRef =
  ref<InstanceType<typeof SettlementWorkbenchDrawer>>();
const settlementSectionRef = ref<HTMLElement>();
const basicInfoExpanded = ref(true);
const counterpartyBankNotice = ref(false);
const savedFormFingerprint = ref('');

const writeOffStatusInfo = computed(() =>
  getBankStatementWriteOffStatusInfo(writeOffStatus.value),
);

const otherSettledAmount = computed(() => settledAmount.value || 0);
const remainingAmount = computed(
  () => savedAmount.value - otherSettledAmount.value,
);
const isPendingWriteOff = computed(
  () =>
    writeOffStatus.value ===
    BankStatementAdminApi.BankStatementWriteOffStatus.PendingWriteOff,
);
const canEditStatement = computed(
  () => !isEdit.value || (canEdit.value && isPendingWriteOff.value),
);
const canCreateSettlement = computed(
  () =>
    isEdit.value && canAddReceiveSettlement.value && remainingAmount.value > 0,
);
const canEditReceiveSettlement = computed(() =>
  hasAccessByCodes([receiveSettlementPerm.edit]),
);
const isOverSettled = computed(() => remainingAmount.value < 0);
const writeOffProgress = computed(() => {
  if (savedAmount.value <= 0) return otherSettledAmount.value > 0 ? 100 : 0;
  return (otherSettledAmount.value / savedAmount.value) * 100;
});
const progressPercent = computed(() =>
  Math.min(100, Math.max(0, Number(writeOffProgress.value.toFixed(1)))),
);
const progressLabel = computed(() => {
  const value = writeOffProgress.value;
  return `${value.toFixed(Number.isInteger(value) ? 0 : 1)}%`;
});
const progressStrokeColor = computed(() => {
  if (isOverSettled.value) return '#cf1322';
  if (remainingAmount.value === 0 && savedAmount.value > 0) return '#389e0d';
  return '#1677ff';
});
const statementDateText = computed(() =>
  statementTime.value ? statementTime.value.format('YYYY-MM-DD') : '-',
);

const formFingerprint = computed(() =>
  JSON.stringify({
    amount: amount.value ?? null,
    clientInvoiceBankId: clientInvoiceBankId.value ?? null,
    currencyId: currencyId.value ?? null,
    message: messageText.value,
    operatorRows: operatorRows.value
      .filter((row) => row.operationId)
      .map((row) => ({
        operationId: row.operationId,
        remark: row.remark || '',
      })),
    orgBankAccountId: orgBankAccountId.value ?? null,
    remark: remark.value,
    settlementId: settlementId.value,
    statementRemark: statementRemark.value,
    statementTime: statementTime.value?.toISOString() ?? null,
    transactionFee: transactionFee.value ?? null,
  }),
);

const hasUnsavedChanges = computed(
  () =>
    canEditStatement.value &&
    Boolean(savedFormFingerprint.value) &&
    formFingerprint.value !== savedFormFingerprint.value,
);

function formatMoney(value: number) {
  const text = value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return savedCurrencyCode.value ? `${text} ${savedCurrencyCode.value}` : text;
}

function applySavedBankStatementSnapshot(
  detail: BankStatementAdminApi.BankStatementDetailDto,
) {
  savedSettlementId.value = detail.settlementId;
  savedSettlementName.value = detail.settlementName || '';
  savedCurrencyId.value = detail.currencyId;
  savedCurrencyCode.value = detail.currencyCode || '';
  savedAmount.value = detail.amount ?? 0;
}

watch(settlementId, (value, previousValue) => {
  if (
    pageLoading.value ||
    !previousValue ||
    previousValue === value ||
    !clientInvoiceBankId.value
  ) {
    return;
  }

  clientInvoiceBankId.value = undefined;
  counterpartyBankNotice.value = true;
  message.info('付款方已变更，对方银行已清空，请重新选择');
});

watch(clientInvoiceBankId, (value) => {
  if (value) counterpartyBankNotice.value = false;
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
    basicInfoExpanded.value =
      detail.writeOffStatus ===
      BankStatementAdminApi.BankStatementWriteOffStatus.PendingWriteOff;
    settledAmount.value = detail.settledAmount ?? 0;
    creatorUserName.value = detail.creatorUserName || '';
    applySavedBankStatementSnapshot(detail);

    operatorRows.value = await buildOperatorRows(
      detail.bankStatementUsers,
      makeRowKey,
    );

    await loadOtherSettledAmount();
    await settlementPanelRef.value?.refresh();
    await nextTick();
    savedFormFingerprint.value = formFingerprint.value;
  } finally {
    pageLoading.value = false;
  }
}

async function handleSettlementCreated() {
  await loadEditData();
}

function openCreateSettlement(mode: 'fee' | 'invoice') {
  settlementDrawerRef.value?.openCreate(mode);
}

function requestCreateSettlement(mode: 'fee' | 'invoice') {
  if (isOverSettled.value) {
    message.warning('当前流水已发生超核销，请先检查并调整已有核销单');
    settlementSectionRef.value?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    return;
  }

  if (!hasUnsavedChanges.value) {
    openCreateSettlement(mode);
    return;
  }

  Modal.confirm({
    title: '先保存流水信息',
    content:
      '当前流水信息尚未保存。核销将使用已保存的付款方、币别和金额，请先保存后再继续。',
    okText: '保存并继续核销',
    cancelText: '继续编辑',
    async onOk() {
      const saved = await handleSave();
      if (!saved)
        return Promise.reject(new Error('BANK_STATEMENT_SAVE_FAILED'));
      openCreateSettlement(mode);
    },
  });
}

function scrollToSettlementList() {
  settlementSectionRef.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function handleCreateMenu({ key }: { key: string | number }) {
  requestCreateSettlement(String(key) === 'invoice' ? 'invoice' : 'fee');
}

function openEditSettlement(
  row: BankStatementAdminApi.ReceiveSettlementListDto,
) {
  settlementDrawerRef.value?.openEdit(row);
}

async function handleSave(): Promise<boolean> {
  if (!canEditStatement.value) {
    message.warning('仅待核销状态的银行流水可以编辑');
    return false;
  }
  if (!amount.value && amount.value !== 0) {
    message.warning('请输入总金额');
    return false;
  }
  if (!currencyId.value) {
    message.warning('请选择币别');
    return false;
  }
  if (!statementTime.value) {
    message.warning('请选择交易时间');
    return false;
  }
  if (!settlementId.value) {
    message.warning('请选择付款方');
    return false;
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
      savedFormFingerprint.value = formFingerprint.value;
      await router.replace(`/bank-statement/edit/${newId}`);
    }
    return true;
  } catch {
    return false;
  } finally {
    submitting.value = false;
  }
}

function handleBack() {
  router.push('/bank-statement');
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = '';
}

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) return true;
  return new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '离开当前页面？',
      content: '流水信息仍有未保存的修改，离开后这些修改将丢失。',
      okText: '放弃修改并离开',
      cancelText: '继续编辑',
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
});

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  if (isEdit.value) {
    await loadEditData();
  } else {
    await nextTick();
    savedFormFingerprint.value = formFingerprint.value;
  }
});

watch(editId, async (value, previousValue) => {
  if (value && value !== previousValue) await loadEditData();
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <Page content-class="!p-3">
    <template #title>
      <div class="page-identity">
        <div class="page-identity__title">
          <span>
            {{ isEdit ? `银行流水 ${bankStatementNo || '-'}` : '新建银行流水' }}
          </span>
          <Tag v-if="isEdit" :color="writeOffStatusInfo.color">
            {{ writeOffStatusInfo.label }}
          </Tag>
        </div>
        <div v-if="isEdit" class="page-identity__meta">
          {{ savedSettlementName || '未指定付款方' }}
          <span>·</span>
          {{ statementDateText }}
          <span>·</span>
          {{ savedCurrencyCode || '未指定币别' }}
        </div>
      </div>
    </template>

    <template #extra>
      <Space>
        <Button @click="handleBack">返回</Button>
        <Button
          v-if="canEditStatement"
          type="primary"
          :loading="submitting"
          :disabled="!hasUnsavedChanges"
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
      <Card v-if="isEdit" size="small" class="statement-overview-card">
        <div class="statement-overview">
          <div class="statement-overview__access">
            <div class="statement-creator">
              <IconifyIcon icon="mdi:account-circle-outline" class="size-4" />
              <span>创建人：{{ creatorUserName || '-' }}</span>
            </div>
            <OperatorTitleBar
              v-model:rows="operatorRows"
              :disabled="!canEditStatement"
            />
          </div>

          <div class="statement-overview__metrics">
            <div class="statement-metric">
              <span>流水金额</span>
              <strong>{{ formatMoney(savedAmount) }}</strong>
            </div>
            <div class="statement-metric statement-metric--settled">
              <span>已核销</span>
              <strong>{{ formatMoney(otherSettledAmount) }}</strong>
            </div>
            <div
              class="statement-metric"
              :class="{ 'statement-metric--danger': remainingAmount < 0 }"
            >
              <span>剩余可核销</span>
              <strong>{{ formatMoney(remainingAmount) }}</strong>
            </div>
          </div>

          <DropdownButton
            v-if="canCreateSettlement"
            type="primary"
            class="statement-overview__actions"
            @click="requestCreateSettlement('fee')"
          >
            新建核销
            <template #overlay>
              <Menu @click="handleCreateMenu">
                <MenuItem key="fee">按费用核销</MenuItem>
                <MenuItem key="invoice">按开票申请核销</MenuItem>
              </Menu>
            </template>
          </DropdownButton>
        </div>

        <div class="write-off-progress">
          <div class="write-off-progress__label">
            <span>核销进度</span>
            <strong>{{ progressLabel }}</strong>
          </div>
          <Progress
            :percent="progressPercent"
            :show-info="false"
            :stroke-color="progressStrokeColor"
            size="small"
          />
        </div>

        <div v-if="isOverSettled" class="statement-risk-notice">
          <div>
            <strong>已发生超核销</strong>
            <span>请先检查或调整已有核销单，暂不建议继续新建核销。</span>
          </div>
          <Button
            type="link"
            danger
            size="small"
            @click="scrollToSettlementList"
          >
            查看异常核销单
          </Button>
        </div>
      </Card>

      <Card size="small" class="form-panel-card">
        <template #title>
          <div class="form-panel-card__title">
            <span>流水基础信息</span>
            <span v-if="isEdit && !canEditStatement" class="locked-state">
              <IconifyIcon icon="mdi:lock-outline" class="size-4" />
              已锁定
            </span>
          </div>
        </template>
        <template #extra>
          <div class="form-panel-card__extra">
            <OperatorTitleBar
              v-if="!isEdit"
              v-model:rows="operatorRows"
              :disabled="false"
            />
            <Button
              type="text"
              size="small"
              @click="basicInfoExpanded = !basicInfoExpanded"
            >
              {{ basicInfoExpanded ? '收起' : '展开' }}
              <IconifyIcon
                :icon="
                  basicInfoExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'
                "
                class="ml-1 size-4"
              />
            </Button>
          </div>
        </template>

        <div v-show="basicInfoExpanded" class="bank-statement-form">
          <section class="form-group">
            <h3>核心到账信息</h3>
            <div class="core-fields-grid">
              <div class="form-field">
                <div class="form-label">
                  交易时间 <span class="text-red-500">*</span>
                </div>
                <DatePicker
                  v-model:value="statementTime"
                  :show-time="false"
                  format="YYYY-MM-DD"
                  :disabled="!canEditStatement"
                  class="w-full"
                />
              </div>

              <div class="form-field form-field--payer">
                <div class="form-label">
                  付款方 <span class="text-red-500">*</span>
                </div>
                <ClientSelect
                  v-model="settlementId"
                  :disabled="!canEditStatement"
                  placeholder="请选择付款方"
                  allow-clear
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <div class="form-label">
                  币别 <span class="text-red-500">*</span>
                </div>
                <CurrencySelect
                  v-model="currencyId"
                  :disabled="!canEditStatement"
                  placeholder="请选择币别"
                  allow-clear
                  class="w-full"
                />
              </div>

              <div class="form-field form-field--money">
                <div class="form-label">
                  总金额 <span class="text-red-500">*</span>
                </div>
                <InputNumber
                  v-model:value="amount"
                  :min="0"
                  :precision="2"
                  :disabled="!canEditStatement"
                  class="money-input w-full"
                  placeholder="请输入金额"
                />
              </div>

              <div class="form-field">
                <div class="form-label">手续费</div>
                <InputNumber
                  v-model:value="transactionFee"
                  :min="0"
                  :precision="2"
                  :disabled="!canEditStatement"
                  class="money-input w-full"
                  placeholder="请输入手续费"
                />
              </div>
            </div>
          </section>

          <section class="form-group form-group--divided">
            <h3>银行信息</h3>
            <div class="bank-fields-grid">
              <div class="form-field">
                <div class="form-label">我司银行</div>
                <OrgBankAccountSelect
                  :value="orgBankAccountId"
                  :disabled="!canEditStatement"
                  placeholder="请选择我司银行"
                  allow-clear
                  class="w-full"
                  @update:value="(v) => (orgBankAccountId = v)"
                />
              </div>

              <div class="form-field">
                <div class="form-label">对方银行</div>
                <ClientBankAccountSelect
                  :value="clientInvoiceBankId"
                  :client-id="settlementId"
                  :disabled="!canEditStatement || !settlementId"
                  placeholder="请先选择付款方"
                  allow-clear
                  class="w-full"
                  @update:value="(v) => (clientInvoiceBankId = v)"
                />
                <div v-if="counterpartyBankNotice" class="field-notice">
                  付款方已变更，请重新选择对方银行。
                </div>
              </div>
            </div>
          </section>

          <details class="supplementary-details">
            <summary>补充信息</summary>
            <div class="supplementary-fields-grid">
              <div class="form-field">
                <div class="form-label">银行交易摘要</div>
                <Input
                  v-model:value="statementRemark"
                  :disabled="!canEditStatement"
                  placeholder="银行回单或交易摘要"
                  allow-clear
                />
              </div>

              <div class="form-field">
                <div class="form-label">付款方留言</div>
                <Input
                  v-model:value="messageText"
                  :disabled="!canEditStatement"
                  placeholder="付款方随交易附带的留言"
                  allow-clear
                />
              </div>

              <div class="form-field">
                <div class="form-label">内部备注</div>
                <Input
                  v-model:value="remark"
                  :disabled="!canEditStatement"
                  placeholder="仅供内部协作查看"
                  allow-clear
                />
              </div>
            </div>
          </details>
        </div>
      </Card>

      <section
        v-if="isEdit"
        ref="settlementSectionRef"
        class="settlement-section"
      >
        <ReceiveSettlementPanel
          ref="settlementPanelRef"
          :bank-statement-id="editId || ''"
          :can-create-settlement="canCreateSettlement"
          :can-edit-settlement="canEditReceiveSettlement"
          :currency-code="savedCurrencyCode"
          :remaining-amount="remainingAmount"
          @create="requestCreateSettlement"
          @edit="openEditSettlement"
        />
      </section>

      <SettlementWorkbenchDrawer
        v-if="isEdit && editId"
        ref="settlementDrawerRef"
        :bank-statement-id="editId"
        :bank-statement-amount="savedAmount"
        :other-settled-amount="otherSettledAmount"
        :settlement-id="savedSettlementId"
        :settlement-name="savedSettlementName"
        :currency-id="savedCurrencyId"
        :currency-code="savedCurrencyCode"
        @changed="handleSettlementCreated"
      />
    </div>
  </Page>
</template>

<style scoped lang="scss">
.page-identity {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.page-identity__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: #202936;
}

.page-identity__meta {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  font-weight: 400;
  color: #748194;
}

.statement-overview-card {
  border-color: #e3e8ef;

  :deep(.ant-card-body) {
    padding: 18px 20px 14px;
  }
}

.statement-overview {
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) minmax(500px, 1.8fr) auto;
  gap: 24px;
  align-items: center;
}

.statement-overview__access {
  display: flex;
  flex-direction: column;
  gap: 7px;
  align-items: flex-start;
}

.statement-creator {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: #748194;
}

.statement-overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 0;
}

.statement-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 20px;
  border-left: 1px solid #e3e8ef;

  span {
    font-size: 12px;
    color: #748194;
  }

  strong {
    font-size: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
    color: #202936;
  }
}

.statement-metric--settled strong {
  color: #0878c9;
}

.statement-metric:last-child {
  margin-left: 8px;
  background: #fff7e8;
  border-left: 0;
  border-radius: 8px;

  strong {
    color: #b75b06;
  }
}

.statement-metric--danger:last-child {
  background: #fff1f0;

  strong {
    color: #cf1322;
  }
}

.write-off-progress {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px;
  align-items: center;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid #edf0f4;
}

.write-off-progress__label {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #748194;

  strong {
    font-variant-numeric: tabular-nums;
    color: #344153;
  }
}

.statement-risk-notice {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  margin-top: 12px;
  font-size: 12px;
  color: #a61d24;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;

  div {
    display: flex;
    gap: 8px;
  }
}

.form-panel-card {
  display: flex;
  flex-direction: column;
  border-color: #e3e8ef;

  :deep(.ant-card-head) {
    min-height: 48px;
    padding-inline: 20px;
  }

  :deep(.ant-card-body) {
    padding: 18px 20px 20px;
  }
}

.form-panel-card__title,
.form-panel-card__extra,
.locked-state {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-panel-card__title {
  font-weight: 600;
  color: #202936;
}

.locked-state {
  font-size: 12px;
  font-weight: 400;
  color: #748194;
}

.form-group h3 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #465365;
}

.form-group--divided {
  padding-top: 18px;
  margin-top: 18px;
  border-top: 1px solid #edf0f4;
}

.core-fields-grid {
  display: grid;
  grid-template-columns:
    minmax(150px, 1fr) minmax(280px, 2fr) minmax(120px, 0.75fr)
    minmax(170px, 1.1fr) minmax(150px, 1fr);
  gap: 16px;
}

.bank-fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 16px;
}

.form-label {
  margin-bottom: 5px;
  font-size: 12px;
  color: #667487;
}

.field-notice {
  margin-top: 4px;
  font-size: 12px;
  color: #d46b08;
}

.supplementary-details {
  padding-top: 14px;
  margin-top: 18px;
  border-top: 1px solid #edf0f4;

  summary {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    font-size: 13px;
    font-weight: 500;
    color: #526070;
    cursor: pointer;
  }
}

.supplementary-fields-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 16px;
  padding-top: 10px;
}

.bank-statement-form {
  :deep(.ant-picker),
  :deep(.ant-input-number),
  :deep(.ant-select) {
    width: 100%;
  }

  :deep(.money-input input) {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
}

.settlement-section {
  min-width: 0;
  scroll-margin-top: 12px;
}

@media (max-width: 1180px) {
  .statement-overview {
    grid-template-columns: 1fr auto;
    gap: 16px;
  }

  .statement-overview__metrics {
    grid-row: 2;
    grid-column: 1 / -1;
  }

  .core-fields-grid {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  .form-field--payer {
    grid-column: span 2;
  }
}

@media (max-width: 720px) {
  .statement-overview,
  .statement-overview__metrics,
  .core-fields-grid,
  .bank-fields-grid,
  .supplementary-fields-grid {
    grid-template-columns: 1fr;
  }

  .statement-overview__metrics {
    grid-row: auto;
    grid-column: auto;
  }

  .statement-overview__actions {
    justify-self: start;
  }

  .statement-metric,
  .statement-metric:last-child {
    padding: 10px 0;
    margin-left: 0;
    background: transparent;
    border-bottom: 1px solid #edf0f4;
    border-left: 0;
    border-radius: 0;
  }

  .form-field--payer {
    grid-column: auto;
  }

  .write-off-progress {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
