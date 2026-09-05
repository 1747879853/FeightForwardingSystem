<script lang="ts" setup>
import type { ClientAppApi } from '#/api/common/client';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';
import { useTabs } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  ClientSelect,
  CurrencySelect,
  MyOrgSelect,
  OrgBankAccountSelect,
  ClientBankAccountSelect,
} from '#/adapter/component';
import { getMyDefaultOrgId } from '#/composables/use-my-org';
import { formatOrgPathLabel } from '#/composables/use-all-user-org';
import { getClientDishonestStakeholders } from '#/api/common/client';
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
import {
  type BankStatementOperatorRow,
  buildOperatorRows,
  buildOperatorRowsFromClientOperations,
} from './utils';

const perm = createAbpPermission('Admin.BankStatement');
const receiveSettlementPerm = createAbpPermission('Admin.ReceiveSettlement');
const route = useRoute();
const router = useRouter();
const { closeTabByKey } = useTabs();
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
const orgId = ref<number | undefined>(getMyDefaultOrgId());
const settlementId = ref<string>('');
/** ClientSelect 编辑回显（详情 settlement） */
const settlementSelectedItems = ref<ClientAppApi.ClientSimpleDto[]>([]);
const clientInvoiceBankId = ref<string | undefined>(undefined);
/** 已落库的流水快照，供底部选费区使用（不随未保存的表单编辑变化） */
const savedSettlementId = ref<string>('');
const savedSettlementName = ref('');
const savedCurrencyId = ref<number | undefined>(undefined);
const savedCurrencyCode = ref('');
const savedAmount = ref(0);
const savedOrgId = ref<number | undefined>(undefined);
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
const counterpartyBankNotice = ref(false);
const savedFormFingerprint = ref('');

/** 锁定态只读文案（来自详情对象） */
const orgDisplayName = ref('-');
const orgBankAccountDisplay = ref('-');
const clientInvoiceBankDisplay = ref('-');

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
    orgId: orgId.value ?? null,
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

function formatPlainAmount(value: number | undefined | null) {
  if (value === undefined || value === null) return '-';
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatBankLabel(
  bank?:
    | BankStatementAdminApi.ClientInvoiceBankSimpleDto
    | BankStatementAdminApi.OrgBankAccountSimpleDto
    | null,
) {
  if (!bank) return '-';
  const parts = [bank.bankName, bank.bankAccount].filter(Boolean);
  return parts.join(' ') || bank.accountName || '-';
}

const settlementDisplayName = computed(
  () =>
    savedSettlementName.value || settlementSelectedItems.value[0]?.name || '-',
);

const currencyDisplayName = computed(() => savedCurrencyCode.value || '-');

function applySavedBankStatementSnapshot(
  detail: BankStatementAdminApi.BankStatementDetailDto,
) {
  savedSettlementId.value = detail.settlementId;
  savedSettlementName.value = detail.settlement?.name || '';
  savedCurrencyId.value = detail.currencyId;
  savedCurrencyCode.value = detail.currency?.code || '';
  savedAmount.value = detail.amount ?? 0;
  savedOrgId.value = detail.orgId ?? undefined;
}

/** 付款方切换时异步带出操作人的序号，避免快速连选串数据 */
let settlementOperatorSeq = 0;

/**
 * 按付款方（客户）绑定的「操作」干系人默认填充可核销操作人。
 * - 编辑回填详情时 pageLoading=true，跳过，避免覆盖已保存操作人
 * - 用户主动选择/更换付款方时覆盖为该客户当前绑定的操作人员
 */
async function applyOperatorsFromSettlement(clientId: string) {
  const seq = ++settlementOperatorSeq;
  try {
    const client = await getClientDishonestStakeholders(String(clientId));
    if (seq !== settlementOperatorSeq) return;
    operatorRows.value = await buildOperatorRowsFromClientOperations(
      client.operations,
      makeRowKey,
    );
  } catch {
    // 干系人接口失败时保留当前操作人，不打断选付款方
  }
}

watch(settlementId, (value, previousValue) => {
  if (pageLoading.value || previousValue === value) return;

  if (previousValue && clientInvoiceBankId.value) {
    clientInvoiceBankId.value = undefined;
    counterpartyBankNotice.value = true;
    message.info('付款方已变更，对方银行已清空，请重新选择');
  }

  if (!canEditStatement.value || !value) return;
  void applyOperatorsFromSettlement(String(value));
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
    orgId.value = detail.orgId ?? undefined;
    settlementId.value = detail.settlementId;
    settlementSelectedItems.value = detail.settlement?.id
      ? [
          {
            fullName: detail.settlement.fullName,
            id: detail.settlement.id,
            name: detail.settlement.name ?? '',
          },
        ]
      : [];
    clientInvoiceBankId.value = detail.clientInvoiceBankId;
    writeOffStatus.value = detail.writeOffStatus;
    settledAmount.value = detail.settledAmount ?? 0;
    creatorUserName.value = detail.creatorUserName || '';
    orgDisplayName.value = formatOrgPathLabel(detail.orgs) || '-';
    orgBankAccountDisplay.value = formatBankLabel(detail.orgBankAccount);
    clientInvoiceBankDisplay.value = formatBankLabel(detail.clientInvoiceBank);
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
  if (!orgId.value) {
    message.warning('请选择归属组织');
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
        orgId: orgId.value!,
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
        orgId: orgId.value!,
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
      const createTabKey = route.fullPath;
      await router.replace(`/bank-statement/edit/${newId}`);
      await closeTabByKey(createTabKey);
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
  <Page auto-content-height content-class="!overflow-hidden !p-3">
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
      class="bank-statement-page"
      :class="{ 'bank-statement-page--edit': isEdit }"
    >
      <div class="top-panels" :class="{ 'top-panels--split': isEdit }">
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
          <template v-if="!isEdit" #extra>
            <OperatorTitleBar v-model:rows="operatorRows" :disabled="false" />
          </template>

          <div class="bank-statement-form">
            <div class="core-fields-grid">
              <div class="form-field">
                <div class="form-label">
                  交易时间
                  <span v-if="canEditStatement" class="text-red-500">*</span>
                </div>
                <DatePicker
                  v-if="canEditStatement"
                  v-model:value="statementTime"
                  :show-time="false"
                  format="YYYY-MM-DD"
                  class="w-full"
                />
                <span v-else class="form-text">{{ statementDateText }}</span>
              </div>

              <div class="form-field">
                <div class="form-label">
                  付款方
                  <span v-if="canEditStatement" class="text-red-500">*</span>
                </div>
                <ClientSelect
                  v-if="canEditStatement"
                  v-model="settlementId"
                  :selected-items="settlementSelectedItems"
                  placeholder="请选择付款方"
                  allow-clear
                  class="w-full"
                />
                <span v-else class="form-text">{{
                  settlementDisplayName
                }}</span>
              </div>

              <div class="form-field">
                <div class="form-label">
                  归属组织
                  <span v-if="canEditStatement" class="text-red-500">*</span>
                </div>
                <MyOrgSelect
                  v-if="canEditStatement"
                  v-model="orgId"
                  placeholder="请选择归属组织"
                  class="w-full"
                />
                <span v-else class="form-text">{{ orgDisplayName }}</span>
              </div>

              <div class="form-field">
                <div class="form-label">
                  币别
                  <span v-if="canEditStatement" class="text-red-500">*</span>
                </div>
                <CurrencySelect
                  v-if="canEditStatement"
                  v-model="currencyId"
                  placeholder="请选择币别"
                  allow-clear
                  class="w-full"
                />
                <span v-else class="form-text">{{ currencyDisplayName }}</span>
              </div>

              <div class="form-field form-field--money">
                <div class="form-label">
                  总金额
                  <span v-if="canEditStatement" class="text-red-500">*</span>
                </div>
                <InputNumber
                  v-if="canEditStatement"
                  v-model:value="amount"
                  :min="0"
                  :precision="2"
                  :controls="false"
                  class="money-input w-full"
                  placeholder="请输入金额"
                />
                <span v-else class="form-text form-text--money">{{
                  formatPlainAmount(amount)
                }}</span>
              </div>

              <div class="form-field">
                <div class="form-label">手续费</div>
                <InputNumber
                  v-if="canEditStatement"
                  v-model:value="transactionFee"
                  :min="0"
                  :precision="2"
                  :controls="false"
                  class="money-input w-full"
                  placeholder="请输入手续费"
                />
                <span v-else class="form-text form-text--money">{{
                  formatPlainAmount(transactionFee)
                }}</span>
              </div>

              <div class="form-field">
                <div class="form-label">我司银行</div>
                <OrgBankAccountSelect
                  v-if="canEditStatement"
                  :value="orgBankAccountId"
                  placeholder="请选择我司银行"
                  allow-clear
                  class="w-full"
                  @update:value="(v) => (orgBankAccountId = v)"
                />
                <span v-else class="form-text">{{
                  orgBankAccountDisplay
                }}</span>
              </div>

              <div class="form-field">
                <div class="form-label">对方银行</div>
                <ClientBankAccountSelect
                  v-if="canEditStatement"
                  :value="clientInvoiceBankId"
                  :client-id="settlementId"
                  :disabled="!settlementId"
                  placeholder="请先选择付款方"
                  allow-clear
                  class="w-full"
                  @update:value="(v) => (clientInvoiceBankId = v)"
                />
                <span v-else class="form-text">{{
                  clientInvoiceBankDisplay
                }}</span>
                <div
                  v-if="canEditStatement && counterpartyBankNotice"
                  class="field-notice"
                >
                  付款方已变更，请重新选择对方银行。
                </div>
              </div>

              <div class="form-field">
                <div class="form-label">银行交易摘要</div>
                <Input
                  v-if="canEditStatement"
                  v-model:value="statementRemark"
                  placeholder="银行回单或交易摘要"
                  allow-clear
                />
                <span v-else class="form-text">{{
                  statementRemark || '-'
                }}</span>
              </div>

              <div class="form-field">
                <div class="form-label">付款方留言</div>
                <Input
                  v-if="canEditStatement"
                  v-model:value="messageText"
                  placeholder="付款方随交易附带的留言"
                  allow-clear
                />
                <span v-else class="form-text">{{ messageText || '-' }}</span>
              </div>

              <div class="form-field form-field--span-2">
                <div class="form-label">内部备注</div>
                <Input
                  v-if="canEditStatement"
                  v-model:value="remark"
                  placeholder="仅供内部协作查看"
                  allow-clear
                />
                <span v-else class="form-text">{{ remark || '-' }}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card v-if="isEdit" size="small" class="statement-overview-card">
          <template #title>
            <div class="form-panel-card__title">
              <span>核销进度</span>
              <strong class="write-off-progress__percent">{{
                progressLabel
              }}</strong>
            </div>
          </template>

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

            <div class="write-off-progress">
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
          </div>
        </Card>
      </div>

      <section
        v-if="isEdit"
        ref="settlementSectionRef"
        class="settlement-section"
      >
        <ReceiveSettlementPanel
          ref="settlementPanelRef"
          :bank-statement-id="editId || ''"
          :can-create-settlement="canCreateSettlement"
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
        :org-id="savedOrgId"
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

.top-panels {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.top-panels--split {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.65fr);
  gap: 10px;
  align-items: stretch;
}

.statement-overview-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  border-color: #e3e8ef;

  :deep(.ant-card-head) {
    min-height: 36px;
    padding: 0 14px;
  }

  :deep(.ant-card-head-title) {
    padding: 8px 0;
  }

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 10px 14px 12px;
  }
}

.statement-overview {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.statement-overview__access {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
}

.statement-creator {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: #748194;
}

.statement-overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.statement-metric {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 8px;
  background: #f7f9fc;
  border-radius: 6px;

  span {
    font-size: 11px;
    line-height: 1.2;
    color: #748194;
  }

  strong {
    font-size: 14px;
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
  background: #fff7e8;

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
  padding-top: 2px;
  margin-top: auto;
}

.write-off-progress__percent {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #344153;
}

.statement-risk-notice {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  padding: 6px 8px;
  font-size: 12px;
  color: #a61d24;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :deep(.ant-btn) {
    height: auto;
    padding-inline: 0;
  }
}

.form-panel-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  border-color: #e3e8ef;

  :deep(.ant-card-head) {
    min-height: 36px;
    padding: 0 14px;
  }

  :deep(.ant-card-head-title),
  :deep(.ant-card-extra) {
    padding: 8px 0;
  }

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 10px 14px 12px;
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
  justify-content: space-between;
  width: 100%;
  font-size: 14px;
  font-weight: 600;
  color: #202936;
}

.locked-state {
  font-size: 12px;
  font-weight: 400;
  color: #748194;
}

.core-fields-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 12px;
}

.form-field--span-2 {
  grid-column: span 2;
}

.form-label {
  margin-bottom: 2px;
  font-size: 12px;
  line-height: 1.2;
  color: #667487;
}

.form-text {
  display: block;
  min-height: 32px;
  font-size: 14px;
  line-height: 32px;
  color: #202936;
  overflow-wrap: anywhere;
}

.form-text--money {
  font-variant-numeric: tabular-nums;
}

.field-notice {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.3;
  color: #d46b08;
}

.bank-statement-form {
  display: flex;
  flex: 1;
  flex-direction: column;

  :deep(.ant-picker),
  :deep(.ant-input-number),
  :deep(.ant-select),
  :deep(.ant-input) {
    width: 100%;
    height: 32px;
  }

  :deep(.ant-select-selector),
  :deep(.ant-picker),
  :deep(.ant-input-number),
  :deep(.ant-input) {
    min-height: 32px;
  }

  :deep(.ant-input-number-input),
  :deep(.ant-select-selection-item),
  :deep(.ant-select-selection-placeholder) {
    line-height: 30px;
  }

  :deep(.money-input input) {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
}

.bank-statement-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.bank-statement-page--edit {
  height: 100%;
  min-height: 0;
}

.settlement-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  scroll-margin-top: 12px;
}

@media (max-width: 1180px) {
  .top-panels--split {
    grid-template-columns: 1fr;
  }

  .form-panel-card,
  .statement-overview-card {
    height: auto;
  }

  .core-fields-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .statement-overview__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .core-fields-grid,
  .statement-overview__metrics {
    grid-template-columns: 1fr;
  }

  .form-field--span-2 {
    grid-column: auto;
  }
}
</style>
