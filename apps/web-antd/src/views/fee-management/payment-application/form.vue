<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { Attachment } from '#/api/common/upload';
import type { SelectedFeeItem } from '../add-fee-modal/data';
import type {
  CurrencyConversionSummary,
  CurrencySummary,
  FeeDetailRow,
  OrderGroupRow,
} from './form-data';

import { computed, nextTick, onMounted, ref } from 'vue';
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
  Space,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import { $t } from '#/locales';
import { ClientSelect, CurrencySelect } from '#/adapter/component';
import {
  addPaymentApplication,
  getPaymentApplicationDetail,
  PaymentApplicationStatus,
} from '#/api/settlement-management/payment-application-admin';
import FileUploadInput from '../../../adapter/component/file-upload/file-upload-input.vue';

import AddFeeDrawer from '../add-fee-modal/index.vue';
import {
  calcConvertedApplied,
  calcConvertedTotal,
  formatAmount,
  groupFeesByOrder,
  summarizeByCurrency,
  summarizeByCurrencyWithConversion,
  useFeeInnerColumns,
  useOrderGroupColumns,
} from './form-data';

const t = (key: string, args?: any[]) =>
  $t(`seaExport.export.paymentApplication.${key}`, args as any);

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

const applicantName = computed(
  () => userStore.userInfo?.realName ?? userStore.userInfo?.username ?? '',
);
const submitTime = ref(dayjs().format('YYYY-MM-DD HH:mm'));
const endTime = ref<string | undefined>(undefined);
const companyName = ref('-');
const applicationNo = ref('');
const displayApplicationNo = computed(() =>
  isEdit.value ? applicationNo.value : t('autoGenerate'),
);

const currencySelectRef = ref<InstanceType<typeof CurrencySelect> | null>(null);
const settlementId = ref<string>('');
const settlementName = ref('');

/** null = 按原票币, number = 指定币别 */
const settlementCurrencyId = ref<null | number>(null);
const settlementCurrencyName = ref('');

const paymentRequire = ref('');
const remark = ref('');
const attachments = ref<Attachment[]>([]);

const feeDetailRows = ref<FeeDetailRow[]>([]);
const selectedRowKeys = ref<string[]>([]);

const orderGroupColumns = useOrderGroupColumns();
const feeInnerColumns = computed(() =>
  useFeeInnerColumns(settlementCurrencyId.value !== null),
);

const orderGroups = computed(() => groupFeesByOrder(feeDetailRows.value));
const expandedGroupKeys = ref<string[]>([]);

const currencySummaries = computed<CurrencySummary[]>(() =>
  summarizeByCurrency(feeDetailRows.value),
);

const convertedTotal = computed(() => calcConvertedTotal(feeDetailRows.value));

const currencyConversionSummaries = computed<CurrencyConversionSummary[]>(() =>
  summarizeByCurrencyWithConversion(feeDetailRows.value),
);

const grandConvertedTotal = computed(() =>
  currencyConversionSummaries.value.reduce(
    (sum, cs) => sum + cs.convertedTotal,
    0,
  ),
);

const payableSummaryText = computed(() => {
  const total = feeDetailRows.value.reduce(
    (sum, f) => sum + (f.appliedAmount ?? 0),
    0,
  );
  return formatAmount(total);
});

const isSettlementLocked = computed(() => feeDetailRows.value.length > 0);

const isSettlementCurrencyLocked = computed(
  () => feeDetailRows.value.length > 0,
);

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
    settlementId: settlementId.value || undefined,
    settlementCurrencyId: settlementCurrencyId.value,
    selectedFeeIds: feeDetailRows.value.map((r) => r.feeId),
    paymentApplicationId: editId.value,
  });
}

function handleFeeConfirm(fees: SelectedFeeItem[]) {
  const existingIds = new Set(feeDetailRows.value.map((r) => r.feeId));
  const newRows: FeeDetailRow[] = fees
    .filter((fee) => !existingIds.has(fee.feeId))
    .map((fee) => ({
      ...fee,
      itemRemark: '',
      rate: fee.exchangeRate ?? 1,
    }));
  feeDetailRows.value = [...feeDetailRows.value, ...newRows];
  nextTick(() => {
    expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
  });
}

function handleDeleteSelected() {
  const toRemove = new Set(selectedRowKeys.value);
  feeDetailRows.value = feeDetailRows.value.filter(
    (r) => !toRemove.has(r.feeId),
  );
  selectedRowKeys.value = [];
}

// --- Editable cells ---

function onAppliedAmountChange(feeId: string, val: number | null) {
  const row = feeDetailRows.value.find((r) => r.feeId === feeId);
  if (row) row.appliedAmount = val ?? 0;
}

function onRateChange(feeId: string, val: number | null) {
  const row = feeDetailRows.value.find((r) => r.feeId === feeId);
  if (row) row.rate = val ?? undefined;
}

function onItemRemarkChange(feeId: string, val: string) {
  const row = feeDetailRows.value.find((r) => r.feeId === feeId);
  if (row) row.itemRemark = val;
}

function onEndTimeChange(_date: any, dateStr: string | string[]) {
  endTime.value = Array.isArray(dateStr) ? dateStr[0] : dateStr || undefined;
}

function onSettlementChange(val: string | null | undefined) {
  settlementId.value = val ? String(val) : '';
  settlementName.value = '';
}

function onSettlementIdSync(val: string) {
  settlementId.value = val;
}

function ensureSettlementSelected() {
  if (!settlementId.value) {
    message.warning(t('noSettlementWarning'));
    return false;
  }
  return true;
}

// --- Settlement currency ---

function onSettlementCurrencyChange(val: number | string | null) {
  if (val === 'original' || val === null || val === undefined) {
    settlementCurrencyId.value = null;
    settlementCurrencyName.value = '';
  } else {
    settlementCurrencyId.value = Number(val);
    nextTick(() => {
      const options = currencySelectRef.value?.getOptions?.() ?? [];
      const opt = options.find((o: any) => String(o.value) === String(val));
      settlementCurrencyName.value = opt?.label ?? '';
    });
  }
}

// --- Load detail for edit mode ---

function mapDetailToFeeRows(
  detail: PaymentApplicationAdminApi.PaymentApplicationDetailDto,
): FeeDetailRow[] {
  const rows: FeeDetailRow[] = [];
  for (const group of detail.payAppFeeBySeaExportGroup ?? []) {
    const order = group.transportOrder;
    for (const item of group.paymentApplicationItems ?? []) {
      const fee = item.orderFee;
      rows.push({
        feeId: item.orderFeeId,
        transportOrderId: fee?.transportOrderId ?? order?.id ?? '',
        commissionNum: order?.commissionNum,
        mblNum: order?.mblNum,
        clientName: order?.clientName,
        accountDate: order?.accountDate,
        etd: order?.etd,
        polName: order?.seaExportPOLCnName,
        podName: order?.seaExportPODCnName,
        saleUserNames: order?.saleNames?.join('、'),
        operationUserNames: order?.operatorNames?.join('、'),
        customerServiceUserNames: order?.customerServiceNames?.join('、'),
        paySide: fee?.paySide ?? 0,
        feeCodeId: fee?.feeCodeId ?? 0,
        feeCodeName: item.feeCodeName ?? fee?.feeCodeName,
        currencyId: fee?.currencyId ?? 0,
        currencyName: item.feeCurrencyName ?? fee?.currencyName,
        settlementId: fee?.settlementId ?? '',
        settlementName: item.feeSettlementName ?? fee?.settlementName,
        amount: fee?.amount ?? item.feeAmount ?? 0,
        settledAmount: fee?.settledAmount ?? 0,
        unSettledAmount: fee?.unSettledAmount ?? 0,
        appliedAmount: item.appliedAmount,
        exchangeRate: fee?.exchangeRate,
        itemRemark: item.remark ?? '',
        rate: item.rate ?? undefined,
      });
    }
  }
  return rows;
}

async function loadEditData() {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getPaymentApplicationDetail(editId.value);

    applicationNo.value = detail.applicationNo ?? '';
    settlementId.value = detail.settlementId ?? '';
    settlementName.value = detail.clientName ?? '';
    settlementCurrencyId.value = detail.currencyId ?? null;
    settlementCurrencyName.value = detail.currencyCode ?? '';
    submitTime.value = detail.submitTime
      ? dayjs(detail.submitTime).format('YYYY-MM-DD HH:mm')
      : dayjs().format('YYYY-MM-DD HH:mm');
    endTime.value = detail.endTime
      ? dayjs(detail.endTime).format('YYYY-MM-DD')
      : undefined;
    paymentRequire.value = detail.require ?? '';
    remark.value = detail.remark ?? '';

    if (detail.companys && detail.companys.length > 0) {
      companyName.value = detail.companys[0]!.name ?? '-';
    }

    feeDetailRows.value = mapDetailToFeeRows(detail);

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

function buildSubmitData(
  status: PaymentApplicationStatus,
): PaymentApplicationAdminApi.PaymentApplicationAddDto {
  const items: PaymentApplicationAdminApi.PaymentApplicationItemAddDto[] =
    feeDetailRows.value.map((row) => ({
      orderFeeId: row.feeId,
      rate: settlementCurrencyId.value === null ? null : (row.rate ?? null),
      appliedAmount: row.appliedAmount,
      remark: row.itemRemark,
    }));

  const attachmentItems: PaymentApplicationAdminApi.AttachmentItemForItemInputDto[] =
    attachments.value.map((a, idx) => ({
      attachmentId: Number(a.attachmentId),
      displayOrder: idx,
      url: a.url,
    }));

  return {
    id: editId.value || undefined,
    status,
    submitTime: dayjs().toISOString(),
    endTime: endTime.value ? dayjs(endTime.value).toISOString() : null,
    settlementId: settlementId.value,
    currencyId: settlementCurrencyId.value,
    require: paymentRequire.value || undefined,
    remark: remark.value || undefined,
    paymentApplicationItems: items,
    attachments: attachmentItems.length > 0 ? attachmentItems : undefined,
  };
}

async function handleSave() {
  if (!ensureSettlementSelected()) {
    return;
  }
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    await addPaymentApplication(
      buildSubmitData(PaymentApplicationStatus.Entering),
    );
    message.success(t('addSuccess'));
    router.push('/fee-management/payment-application');
  } finally {
    submitting.value = false;
  }
}

async function handleSubmit() {
  if (!ensureSettlementSelected()) {
    return;
  }
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    await addPaymentApplication(
      buildSubmitData(PaymentApplicationStatus.Auditing),
    );
    message.success(t('submitSuccess'));
    router.push('/fee-management/payment-application');
  } finally {
    submitting.value = false;
  }
}

async function handleSubmitAndNew() {
  if (!ensureSettlementSelected()) {
    return;
  }
  if (feeDetailRows.value.length === 0) {
    message.warning(t('noFeeWarning'));
    return;
  }
  submitting.value = true;
  try {
    await addPaymentApplication(
      buildSubmitData(PaymentApplicationStatus.Auditing),
    );
    message.success(t('submitSuccess'));
    resetForm();
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  endTime.value = undefined;
  paymentRequire.value = '';
  remark.value = '';
  feeDetailRows.value = [];
  selectedRowKeys.value = [];
  expandedGroupKeys.value = [];
  attachments.value = [];
  submitTime.value = dayjs().format('YYYY-MM-DD HH:mm');
}

function handleExportMenuClick({ key }: { key: string }) {
  message.info(`导出: ${key}`);
}

function handlePrint() {
  message.info('打印');
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
          </div>
          <div class="action-bar__right">
            <Space>
              <Button :loading="submitting" @click="handleSave">
                {{ t('save') }}
              </Button>
              <Button
                type="primary"
                :loading="submitting"
                @click="handleSubmit"
              >
                {{ t('submit') }}
              </Button>
              <Button :loading="submitting" @click="handleSubmitAndNew">
                {{ t('submitAndNew') }}
              </Button>
              <Dropdown>
                <Button>
                  {{ t('export') }}
                  <span class="ml-1">▾</span>
                </Button>
                <template #overlay>
                  <Menu @click="handleExportMenuClick">
                    <MenuItem key="feeDetail">
                      {{ t('exportFeeDetail') }}
                    </MenuItem>
                    <MenuItem key="summary">
                      {{ t('exportBySummary') }}
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

        <!-- 中间三栏布局 -->
        <div class="main-layout">
          <!-- 左侧：申请人信息 -->
          <div class="left-column">
            <Card size="small">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">{{ t('applicationNo') }}</span>
                  <Input
                    :value="displayApplicationNo"
                    :disabled="true"
                    size="small"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('clientName') }}</span>
                  <ClientSelect
                    :model-value="settlementId"
                    :placeholder="$t('ui.placeholder.select')"
                    :disabled="isSettlementLocked"
                    size="small"
                    @update:model-value="onSettlementChange"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('applicant') }}</span>
                  <span class="info-value">{{ applicantName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('submitTime') }}</span>
                  <span class="info-value">{{ submitTime }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('latestPaymentDate') }}</span>
                  <DatePicker
                    :value="endTime ? dayjs(endTime) : undefined"
                    class="w-full"
                    size="small"
                    @change="onEndTimeChange"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('company') }}</span>
                  <span class="info-value">{{ companyName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('require') }}</span>
                  <Input.TextArea
                    :value="paymentRequire"
                    :rows="2"
                    :placeholder="$t('ui.placeholder.input')"
                    size="small"
                    @update:value="(val) => (paymentRequire = val)"
                  />
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('remark') }}</span>
                  <Input.TextArea
                    :value="remark"
                    :rows="2"
                    :placeholder="$t('ui.placeholder.input')"
                    size="small"
                    @update:value="(val) => (remark = val)"
                  />
                </div>
              </div>
            </Card>
          </div>

          <!-- 中部：费用合计 -->
          <div class="center-column">
            <Card size="small" class="h-full">
              <template #title>
                <div class="flex items-center gap-3">
                  <span class="font-semibold">{{ t('feeSummary') }}</span>
                  <span class="text-sm text-gray-500">{{
                    t('settlementCurrency')
                  }}</span>
                  <CurrencySelect
                    ref="currencySelectRef"
                    :model-value="settlementCurrencyId"
                    :extra-options="[
                      { label: t('originalCurrency'), value: null },
                    ]"
                    :disabled="isSettlementCurrencyLocked"
                    size="small"
                    style="width: 160px"
                    @update:model-value="onSettlementCurrencyChange"
                  >
                  </CurrencySelect>
                </div>
              </template>

              <!-- 按票原币模式：显示各币别金额 -->
              <template v-if="settlementCurrencyId === null">
                <div
                  v-if="currencySummaries.length === 0"
                  class="py-4 text-center text-gray-400"
                >
                  {{ t('noFeeWarning') }}
                </div>
                <div v-else class="currency-cards">
                  <div
                    v-for="cs in currencySummaries"
                    :key="cs.currencyId"
                    class="currency-card"
                  >
                    <div class="currency-card__header">
                      <Tag color="blue">{{ cs.currencyName }}</Tag>
                      <span class="currency-card__amount">
                        {{ formatAmount(cs.totalAmount) }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 指定币别模式：展示各原始币别金额、汇率及折算汇总 -->
              <template v-else>
                <div
                  v-if="currencyConversionSummaries.length === 0"
                  class="py-4 text-center text-gray-400"
                >
                  {{ t('noFeeWarning') }}
                </div>
                <template v-else>
                  <div class="conversion-cards">
                    <div
                      v-for="cs in currencyConversionSummaries"
                      :key="`${cs.currencyId}_${cs.rate}`"
                      class="conversion-card"
                    >
                      <div class="conversion-card__head">
                        <Tag color="blue">{{ cs.currencyName }}</Tag>
                        <span class="conversion-card__amount">
                          {{ formatAmount(cs.originalTotal) }}
                        </span>
                      </div>
                      <div class="conversion-card__foot">
                        <span class="conversion-card__rate">
                          {{ t('exchangeRate') }} {{ cs.rate.toFixed(4) }}
                        </span>
                        <span class="conversion-card__converted">
                          ≈ {{ formatAmount(cs.convertedTotal) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="conversion-total-bar">
                    <span class="conversion-total-bar__label">
                      {{ t('convertedTotal') }}
                      <template v-if="settlementCurrencyName">
                        ({{ settlementCurrencyName }})
                      </template>
                    </span>
                    <span class="conversion-total-bar__amount">
                      {{ formatAmount(grandConvertedTotal) }}
                    </span>
                  </div>
                </template>
              </template>
            </Card>
          </div>

          <!-- 右侧：附件上传 -->
          <div class="right-column">
            <Card size="small" class="h-full">
              <template #title>
                <span class="font-semibold">{{ t('attachment') }}</span>
              </template>
              <div class="attachment-area">
                <FileUploadInput v-model="attachments" :max-count="20" />
              </div>
            </Card>
          </div>
        </div>

        <!-- 费用明细表格 -->
        <Card size="small" class="mt-3">
          <template #title>
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{ t('feeDetail') }}</span>
              <Space>
                <Button type="primary" size="small" @click="handleOpenAddFee">
                  {{ t('addFee') }}
                </Button>
                <Button
                  danger
                  size="small"
                  :disabled="selectedRowKeys.length === 0"
                  @click="handleDeleteSelected"
                >
                  {{ t('deleteFee') }}
                </Button>
              </Space>
            </div>
          </template>

          <div class="fee-group-table">
            <Table
              :columns="orderGroupColumns"
              :data-source="orderGroups"
              :pagination="false"
              :scroll="{ x: 'max-content', y: 500 }"
              :children-column-name="'_none'"
              row-key="key"
              size="small"
              :expanded-row-keys="expandedGroupKeys"
              @expanded-rows-change="(keys) => (expandedGroupKeys = [...keys])"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'seq'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'etd'">
                  {{ formatDate(record.etd) }}
                </template>
                <template v-else-if="column.key === 'accountDate'">
                  {{ formatMonth(record.accountDate) }}
                </template>
                <template v-else-if="column.key === 'currencySummaries'">
                  <div class="flex flex-wrap gap-x-3 gap-y-1">
                    <span
                      v-for="(cs, idx) in record.currencySummaries"
                      :key="idx"
                      class="inline-flex items-center gap-1"
                    >
                      <Tag color="blue" :bordered="false" size="small">
                        {{ cs.currencyName }}
                      </Tag>
                      <strong class="text-blue-600">
                        {{ formatAmount(cs.amount) }}
                      </strong>
                    </span>
                  </div>
                </template>
                <template v-else>
                  {{ column.dataIndex ? record[column.dataIndex] : '' }}
                </template>
              </template>

              <template #expandColumnTitle>
                <Checkbox
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="(e) => toggleAllSelection(e.target.checked)"
                />
              </template>
              <template #expandIcon="{ expanded, record, onExpand }">
                <div class="flex items-center gap-1">
                  <Checkbox
                    :checked="isGroupAllSelected(record.key)"
                    :indeterminate="isGroupIndeterminate(record.key)"
                    @change="
                      (e) => toggleGroupSelection(record, e.target.checked)
                    "
                  />
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
                </div>
              </template>

              <template #expandedRowRender="{ record: group }">
                <div class="expanded-fee-table bg-gray-50 p-2">
                  <Table
                    :columns="feeInnerColumns"
                    :data-source="group.children"
                    :pagination="false"
                    :scroll="{ x: 'max-content' }"
                    row-key="feeId"
                    size="small"
                  >
                    <template #bodyCell="{ column, record, index }">
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
                      <template v-else-if="column.key === 'convertedApplied'">
                        {{
                          formatAmount(
                            calcConvertedApplied(record.amount, record.rate),
                          )
                        }}
                      </template>
                      <template v-else-if="column.key === 'settledAmount'">
                        {{ formatAmount(record.settledAmount) }}
                      </template>
                      <template v-else-if="column.key === 'unSettledAmount'">
                        {{ formatAmount(record.unSettledAmount) }}
                      </template>
                      <template v-else-if="column.key === 'appliedAmount'">
                        <InputNumber
                          :value="record.appliedAmount"
                          :precision="2"
                          size="small"
                          class="w-full"
                          @change="
                            (val) => onAppliedAmountChange(record.feeId, val)
                          "
                        />
                      </template>
                      <template v-else-if="column.key === 'rate'">
                        <InputNumber
                          :value="record.rate"
                          :precision="6"
                          :step="0.01"
                          :min="0"
                          size="small"
                          class="w-full"
                          @change="(val) => onRateChange(record.feeId, val)"
                        />
                      </template>
                      <template v-else>
                        {{ column.dataIndex ? record[column.dataIndex] : '' }}
                      </template>
                    </template>
                  </Table>
                </div>
              </template>
            </Table>
          </div>

          <div class="fee-footer">
            <span>
              {{ t('orderCount', [orderGroups.length]) }}
            </span>
            <div class="flex items-center gap-4">
              <span
                v-for="cs in currencySummaries"
                :key="cs.currencyId"
                class="flex items-center gap-1"
              >
                <Tag color="blue" size="small">{{ cs.currencyName }}</Tag>
                <strong>{{ formatAmount(cs.totalAmount) }}</strong>
              </span>
            </div>
          </div>
        </Card>
      </div>

      <!-- 添加费用抽屉 -->
      <AddFeeDrawer
        ref="addFeeDrawerRef"
        @confirm="handleFeeConfirm"
        @update:settlement-currency-id="onSettlementCurrencyChange"
        @update:settlement-id="onSettlementIdSync"
      />
    </Spin>
  </Page>
</template>

<style scoped>
.payment-app-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.action-bar {
  display: flex;
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

.main-layout {
  display: flex;
  gap: 12px;
}

.left-column {
  flex-shrink: 0;
  width: 480px;
}

.center-column {
  flex: 1;
  min-width: 0;
}

.right-column {
  flex-shrink: 0;
  width: 240px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  color: #8c8c8c;
  white-space: nowrap;
}

.info-value {
  font-size: 13px;
  color: #262626;
}

.currency-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

.currency-card__amount {
  font-size: 18px;
  font-weight: 700;
  color: #1890ff;
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

.fee-group-table :deep(.ant-table-expanded-row > td) {
  padding: 4px 8px;
}

.expanded-fee-table {
  max-width: 100%;
  overflow-x: auto;
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
</style>
