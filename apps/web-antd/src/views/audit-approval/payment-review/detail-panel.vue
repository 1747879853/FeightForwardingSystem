<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { FeeDetailRow } from '#/views/fee-management/payment-application/form-data';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import dayjs from 'dayjs';

import { Card, Empty, Spin, Table, Tag, Tooltip } from 'ant-design-vue';

import { getPaymentApplicationDetail } from '#/api/settlement-management/payment-application-admin';
import { $t } from '#/locales';
import { buildAttachmentUrl } from '#/utils';
import {
  resolvePodPortDisplayName,
  resolvePolPortDisplayName,
} from '#/views/fee-management/add-fee-modal/data';
import {
  buildAppliedAmountCurrencyColumns,
  calcConvertedApplied,
  collectAppliedCurrencies,
  formatAmount,
  groupFeesByOrder,
  isAppliedAmountColumnKey,
  isUserRoleColumnKey,
  resolveFeeCurrencyCode,
  summarizeByCurrency,
  summarizeByCurrencyWithConversion,
  useFeeInnerColumns,
  useOrderGroupColumns,
} from '#/views/fee-management/payment-application/form-data';

const props = defineProps<{ paymentApplicationId?: string }>();

const t = (key: string, args?: any[]) =>
  $t(`seaExport.export.paymentApplication.${key}`, args as any);

const loading = ref(false);
const loaded = ref(false);

const settlementCurrencyId = ref<null | number>(null);
const settlementCurrencyName = ref('');
const feeDetailRows = ref<FeeDetailRow[]>([]);
/** 发票附件（按类型分组，保留类型名） */
const attachmentGroups = ref<PaymentApplicationAdminApi.AttachmentGroupDto[]>(
  [],
);
/** 关联结算附件（只读） */
const settlementAttachments = ref<
  PaymentApplicationAdminApi.AttachmentItemDto[]
>([]);

/** 仅展示有文件的分组，并带上类型名称 */
const visibleAttachmentGroups = computed(() =>
  attachmentGroups.value
    .map((group) => ({
      key:
        group.attachmentDtlTypeId == null
          ? 'untyped'
          : String(group.attachmentDtlTypeId),
      name:
        group.attachmentDtlType?.name ||
        (group.attachmentDtlTypeId == null
          ? '未分类'
          : String(group.attachmentDtlTypeId)),
      items: group.items ?? [],
      sortId: group.attachmentDtlType?.sortId ?? 9999,
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => a.sortId - b.sortId),
);

const hasAttachments = computed(
  () =>
    visibleAttachmentGroups.value.length > 0 ||
    settlementAttachments.value.length > 0,
);

/** 币别 -> 已选结算银行（只读展示） */
const bankByCurrency = ref<
  Record<
    number,
    PaymentApplicationAdminApi.ClientInvoiceBankSimpleDto | undefined
  >
>({});

const orderGroupColumns = useOrderGroupColumns();
const feeInnerColumns = computed(() =>
  useFeeInnerColumns(settlementCurrencyId.value !== null).filter(
    (col) => col.key !== 'checkbox',
  ),
);

/** 嵌套子表横向滚动宽度 = 列宽合计 + 100px */
const feeInnerTableScrollX = computed(
  () =>
    feeInnerColumns.value.reduce(
      (sum, col) => sum + (Number(col.width) || 0),
      0,
    ) + 100,
);

const appliedCurrencies = computed(() =>
  collectAppliedCurrencies(feeDetailRows.value),
);
const appliedAmountDynamicColumns = computed(() =>
  buildAppliedAmountCurrencyColumns(appliedCurrencies.value),
);
const allOrderGroupColumns = computed(() => [
  ...orderGroupColumns,
  ...appliedAmountDynamicColumns.value,
]);

const orderGroups = computed(() =>
  groupFeesByOrder(feeDetailRows.value, appliedCurrencies.value),
);
const expandedGroupKeys = ref<string[]>([]);

const currencySummaries = computed(() =>
  summarizeByCurrency(feeDetailRows.value),
);
const currencyConversionSummaries = computed(() =>
  summarizeByCurrencyWithConversion(feeDetailRows.value),
);
const grandConvertedTotal = computed(() =>
  currencyConversionSummaries.value.reduce(
    (sum, cs) => sum + cs.convertedTotal,
    0,
  ),
);

function getSelectedBank(currencyId: number) {
  return bankByCurrency.value[currencyId];
}

const settlementSelectedBank = computed(() =>
  settlementCurrencyId.value === null
    ? undefined
    : bankByCurrency.value[settlementCurrencyId.value],
);

function mapDetailToFeeRows(
  detail: PaymentApplicationAdminApi.PaymentApplicationDetailDto,
): FeeDetailRow[] {
  const settlementShortName = detail.clientName ?? '';
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
        polName: order ? resolvePolPortDisplayName(order) : '',
        podName: order ? resolvePodPortDisplayName(order) : '',
        saleUserNames: order?.saleNames?.join('、'),
        operationUserNames: order?.operatorNames?.join('、'),
        customerServiceUserNames: order?.customerServiceNames?.join('、'),
        paySide: fee?.paySide ?? 0,
        feeCodeId: fee?.feeCodeId ?? 0,
        feeCodeName: item.feeCodeName ?? fee?.feeCodeName,
        currencyId: fee?.currencyId ?? 0,
        currencyCode: resolveFeeCurrencyCode(fee, group.currencyGroup),
        currencyName: item.feeCurrencyName ?? fee?.currencyName,
        settlementId: fee?.settlementId ?? '',
        settlementName:
          settlementShortName ||
          item.feeSettlementName ||
          fee?.settlementName ||
          '',
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

/** 从详情的 currencyGroup.paymentApplicationBank 还原已选银行（只读展示） */
function restoreBanksFromDetail(
  detail: PaymentApplicationAdminApi.PaymentApplicationDetailDto,
) {
  const groups = detail.currencyGroup ?? [];
  const next: Record<
    number,
    PaymentApplicationAdminApi.ClientInvoiceBankSimpleDto | undefined
  > = {};

  const pickBank = (
    rel:
      | PaymentApplicationAdminApi.PaymentApplicationBankDto
      | null
      | undefined,
  ) => {
    if (!rel) return undefined;
    const banks = rel.clientInvoiceBanks ?? [];
    return banks.find((b) => b.id === rel.clientInvoiceBankId) ?? banks[0];
  };

  if (settlementCurrencyId.value === null) {
    for (const g of groups) {
      const sel = pickBank(g.paymentApplicationBank);
      if (sel) next[g.id] = sel;
    }
  } else {
    const rel = groups.map((g) => g.paymentApplicationBank).find(Boolean);
    const sel = pickBank(rel);
    if (sel) next[settlementCurrencyId.value] = sel;
  }
  bankByCurrency.value = next;
}

function resetState() {
  settlementCurrencyId.value = null;
  settlementCurrencyName.value = '';
  feeDetailRows.value = [];
  attachmentGroups.value = [];
  settlementAttachments.value = [];
  bankByCurrency.value = {};
  expandedGroupKeys.value = [];
  loaded.value = false;
}

async function loadDetail(id: string | undefined) {
  if (!id) {
    resetState();
    return;
  }
  loading.value = true;
  try {
    const detail = await getPaymentApplicationDetail(id);
    settlementCurrencyId.value = detail.currencyId ?? null;
    settlementCurrencyName.value = detail.currencyCode ?? '';
    feeDetailRows.value = mapDetailToFeeRows(detail);
    restoreBanksFromDetail(detail);
    attachmentGroups.value = detail.attachmentGroup ?? [];
    settlementAttachments.value = [
      ...(detail.paymentSettlementAttachments ?? []),
    ];
    expandedGroupKeys.value = orderGroups.value.map((g) => g.key);
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.paymentApplicationId,
  (id) => loadDetail(id),
  { immediate: true },
);

function getGroupAppliedAmountDisplay(record: any, columnKey: any): string {
  if (!isAppliedAmountColumnKey(String(columnKey))) return '';
  const val = record?.[String(columnKey)];
  return formatAmount(val ?? 0);
}

function getUserRoleCellTextFromRecord(record: any, dataIndex: any): string {
  if (!dataIndex) return '';
  const value = record?.[String(dataIndex)];
  if (value == null || value === '') return '';
  return String(value);
}

function getCellText(record: any, dataIndex: any): string {
  if (!dataIndex) return '';
  const value = record?.[String(dataIndex)];
  return value == null ? '' : String(value);
}

function getPaySideLabel(val: number) {
  return val === 0 ? '收' : '付';
}

function formatDate(val: null | string | undefined): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : '';
}

function formatMonth(val: null | string | undefined): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM') : '';
}

function getAttachmentFileName(
  item: PaymentApplicationAdminApi.AttachmentItemDto,
) {
  return item.friendlyFileName || item.url?.split('/').pop() || '附件';
}

function openAttachment(item: PaymentApplicationAdminApi.AttachmentItemDto) {
  if (item.url) window.open(buildAttachmentUrl(item.url), '_blank');
}
</script>

<template>
  <div class="review-layout">
    <!-- 上方两栏：左列表 + 右(费用合计 / 附件) -->
    <div class="review-layout__top">
      <!-- 左：列表 -->
      <div class="review-layout__list">
        <slot name="list" />
      </div>

      <!-- 右：费用合计 + 附件（上下排列） -->
      <div class="review-layout__aside">
        <Spin
          :spinning="loading"
          wrapper-class-name="review-layout__aside-spin"
        >
          <div v-if="!loaded && !loading" class="review-layout__empty">
            <Empty :description="$t('common.noData')" />
          </div>
          <div v-else class="review-layout__aside-body">
            <!-- 费用合计 -->
            <Card size="small" class="summary-card">
              <template #title>
                <div class="flex items-center gap-3">
                  <span class="font-semibold">{{ t('feeSummary') }}</span>
                  <span class="text-xs text-gray-500">
                    {{ t('settlementCurrency') }}：
                    <Tag color="blue">
                      {{
                        settlementCurrencyId === null
                          ? t('originalCurrency')
                          : settlementCurrencyName
                      }}
                    </Tag>
                  </span>
                </div>
              </template>

              <!-- 按票原币模式 -->
              <template v-if="settlementCurrencyId === null">
                <div
                  v-if="currencySummaries.length === 0"
                  class="py-3 text-center text-gray-400"
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
                      <Tag color="blue">
                        {{ cs.currencyCode || cs.currencyName }}
                      </Tag>
                      <span class="currency-card__amount">
                        {{ formatAmount(cs.totalAmount) }}
                      </span>
                    </div>
                    <Tooltip
                      v-if="getSelectedBank(cs.currencyId)"
                      :title="
                        [
                          `开户行 ${getSelectedBank(cs.currencyId)?.bankName || '-'}`,
                          `账号 ${getSelectedBank(cs.currencyId)?.bankAccount || '-'}`,
                          `SWIFT ${getSelectedBank(cs.currencyId)?.swiftCode || '-'}`,
                        ].join(' · ')
                      "
                    >
                      <div class="bank-meta">
                        <span class="bank-meta__item">
                          <em>开户行</em>
                          {{ getSelectedBank(cs.currencyId)?.bankName || '-' }}
                        </span>
                        <span class="bank-meta__item">
                          <em>账号</em>
                          {{
                            getSelectedBank(cs.currencyId)?.bankAccount || '-'
                          }}
                        </span>
                        <span class="bank-meta__item">
                          <em>SWIFT</em>
                          {{ getSelectedBank(cs.currencyId)?.swiftCode || '-' }}
                        </span>
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </template>

              <!-- 指定币别模式 -->
              <template v-else>
                <div
                  v-if="currencyConversionSummaries.length === 0"
                  class="py-3 text-center text-gray-400"
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
                        <Tag color="blue">
                          {{ cs.currencyCode || cs.currencyName }}
                        </Tag>
                        <span class="conversion-card__amount">
                          {{ formatAmount(cs.originalTotal) }}
                        </span>
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
                  <Tooltip
                    v-if="settlementSelectedBank"
                    :title="
                      [
                        `开户行 ${settlementSelectedBank?.bankName || '-'}`,
                        `账号 ${settlementSelectedBank?.bankAccount || '-'}`,
                        `SWIFT ${settlementSelectedBank?.swiftCode || '-'}`,
                      ].join(' · ')
                    "
                  >
                    <div class="bank-meta bank-meta--block">
                      <span class="bank-meta__item">
                        <em>开户行</em>
                        {{ settlementSelectedBank?.bankName || '-' }}
                      </span>
                      <span class="bank-meta__item">
                        <em>账号</em>
                        {{ settlementSelectedBank?.bankAccount || '-' }}
                      </span>
                      <span class="bank-meta__item">
                        <em>SWIFT</em>
                        {{ settlementSelectedBank?.swiftCode || '-' }}
                      </span>
                    </div>
                  </Tooltip>
                </template>
              </template>
            </Card>

            <!-- 附件信息（按类型分组） -->
            <Card size="small" class="attachment-card">
              <template #title>
                <span class="font-semibold">{{ t('attachment') }}</span>
              </template>
              <div
                v-if="!hasAttachments"
                class="py-2 text-center text-gray-400"
              >
                {{ $t('common.noData') }}
              </div>
              <div v-else class="review-attachments">
                <section
                  v-for="group in visibleAttachmentGroups"
                  :key="group.key"
                  class="review-attachment-group"
                >
                  <div class="review-attachment-group__title">
                    {{ group.name }}
                  </div>
                  <div class="review-attachment-group__files">
                    <button
                      v-for="(item, index) in group.items"
                      :key="`${item.attachmentId}-${index}`"
                      type="button"
                      class="review-attachment-file"
                      :title="getAttachmentFileName(item)"
                      @click="openAttachment(item)"
                    >
                      <IconifyIcon icon="mdi:file-outline" />
                      <span>{{ getAttachmentFileName(item) }}</span>
                    </button>
                  </div>
                </section>
                <section
                  v-if="settlementAttachments.length > 0"
                  class="review-attachment-group"
                >
                  <div class="review-attachment-group__title">结算附件</div>
                  <div class="review-attachment-group__files">
                    <button
                      v-for="item in settlementAttachments"
                      :key="item.id || item.attachmentId"
                      type="button"
                      class="review-attachment-file"
                      :title="getAttachmentFileName(item)"
                      @click="openAttachment(item)"
                    >
                      <IconifyIcon icon="mdi:file-outline" />
                      <span>{{ getAttachmentFileName(item) }}</span>
                    </button>
                  </div>
                </section>
              </div>
            </Card>
          </div>
        </Spin>
      </div>
    </div>

    <!-- 下方一栏：通铺费用明细 -->
    <div class="review-layout__bottom">
      <Card size="small" class="fee-detail-card">
        <template #title>
          <span class="font-semibold">{{ t('feeDetail') }}</span>
        </template>

        <Spin
          :spinning="loading"
          wrapper-class-name="review-layout__bottom-spin"
        >
          <div v-if="!loaded && !loading" class="review-layout__empty">
            <Empty :description="$t('common.noData')" />
          </div>
          <template v-else>
            <div class="fee-group-table">
              <Table
                :columns="allOrderGroupColumns"
                :data-source="orderGroups"
                :pagination="false"
                :scroll="{ x: 'max-content', y: 300 }"
                :children-column-name="'_none'"
                row-key="key"
                size="small"
                :expanded-row-keys="expandedGroupKeys"
                @expanded-rows-change="
                  (keys) => (expandedGroupKeys = keys.map(String))
                "
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
                  <template
                    v-else-if="isAppliedAmountColumnKey(String(column.key))"
                  >
                    {{ getGroupAppliedAmountDisplay(record, column.key) }}
                  </template>
                  <template v-else-if="isUserRoleColumnKey(column.key)">
                    <Tooltip
                      v-if="
                        getUserRoleCellTextFromRecord(record, column.dataIndex)
                      "
                      :title="
                        getUserRoleCellTextFromRecord(record, column.dataIndex)
                      "
                    >
                      <span class="ellipsis-cell">
                        {{
                          getUserRoleCellTextFromRecord(
                            record,
                            column.dataIndex,
                          )
                        }}
                      </span>
                    </Tooltip>
                  </template>
                  <template v-else>
                    {{ getCellText(record, column.dataIndex) }}
                  </template>
                </template>

                <template #expandedRowRender="{ record: group }">
                  <div class="expanded-fee-table p-2">
                    <Table
                      :columns="feeInnerColumns"
                      :data-source="group.children"
                      :pagination="false"
                      :scroll="{ x: feeInnerTableScrollX }"
                      row-key="feeId"
                      size="small"
                    >
                      <template #bodyCell="{ column, record, index }">
                        <template v-if="column.key === 'seq'">
                          {{ index + 1 }}
                        </template>
                        <template v-else-if="column.key === 'paySide'">
                          <Tag
                            :color="record.paySide === 0 ? 'blue' : 'orange'"
                          >
                            {{ getPaySideLabel(record.paySide) }}
                          </Tag>
                        </template>
                        <template v-else-if="column.key === 'currencyCode'">
                          {{ record.currencyCode || record.currencyName }}
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
                          <span class="fee-applied-amount-value">
                            {{ formatAmount(record.appliedAmount) }}
                          </span>
                        </template>
                        <template v-else-if="column.key === 'rate'">
                          {{ record.rate }}
                        </template>
                        <template v-else>
                          {{ getCellText(record, column.dataIndex) }}
                        </template>
                      </template>
                    </Table>
                  </div>
                </template>
              </Table>
            </div>

            <div class="fee-footer">
              <span>{{ t('groupCount', [orderGroups.length]) }}</span>
              <div class="flex items-center gap-4">
                <span
                  v-for="cs in currencySummaries"
                  :key="cs.currencyId"
                  class="flex items-center gap-1"
                >
                  <Tag color="blue">{{
                    cs.currencyCode || cs.currencyName
                  }}</Tag>
                  <strong>{{ formatAmount(cs.totalAmount) }}</strong>
                </span>
              </div>
            </div>
          </template>
        </Spin>
      </Card>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 1280px) {
  .review-layout__aside {
    flex-basis: 300px;
  }
}

.review-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

/* 上方两栏 */
.review-layout__top {
  display: flex;
  flex: 1 1 52%;
  gap: 12px;
  min-height: 0;
}

.review-layout__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.review-layout__aside {
  flex: 0 0 360px;
  min-width: 280px;
  height: 100%;
  overflow: hidden;
}

.review-layout :deep(.review-layout__aside-spin),
.review-layout__aside :deep(.ant-spin-container) {
  height: 100%;
}

.review-layout__aside-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.summary-card {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.summary-card :deep(.ant-card-head) {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 12px;
}

.summary-card :deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
  overflow-y: auto;
}

.attachment-card {
  flex-shrink: 0;
}

.attachment-card :deep(.ant-card-body) {
  max-height: 180px;
  padding: 10px 12px;
  overflow-y: auto;
}

.review-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-attachment-group__title {
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #595959;
}

.review-attachment-group__files {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
}

.review-attachment-file {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  max-width: 100%;
  padding: 2px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #1677ff;
  white-space: nowrap;
  cursor: pointer;
  background: #f5f8ff;
  border: 1px solid #e8eef6;
  border-radius: 4px;
}

.review-attachment-file:hover {
  background: #eef4ff;
  border-color: #c9dcff;
}

/* 下方通铺费用明细 */
.review-layout__bottom {
  flex: 1 1 48%;
  min-height: 0;
  overflow: hidden;
}

.review-layout__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
}

.fee-detail-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.fee-detail-card :deep(.ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.review-layout :deep(.review-layout__bottom-spin),
.fee-detail-card :deep(.ant-card-body .ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.fee-group-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.currency-cards,
.conversion-cards {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e8eef6;
  border-radius: 6px;
}

.currency-card,
.conversion-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  background: #f6f9ff;
  border-bottom: 1px solid #e8eef6;
}

.currency-card:last-child,
.conversion-card:last-child {
  border-bottom: 0;
}

.currency-card__header,
.conversion-card__head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
}

.currency-card__amount {
  font-size: 15px;
  font-weight: 700;
  color: #1890ff;
  word-break: keep-all;
}

.conversion-card__amount {
  font-size: 14px;
  font-weight: 700;
  color: #262626;
}

.conversion-card__rate {
  font-size: 12px;
  color: #8c8c8c;
}

.conversion-card__converted {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: #1890ff;
}

.bank-meta {
  display: flex;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  color: #595959;
}

.bank-meta--block {
  padding: 6px 8px;
  margin-top: 8px;
  background: #f6f9ff;
  border: 1px dashed #d9e2ec;
  border-radius: 4px;
}

.bank-meta__item {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bank-meta__item em {
  margin-right: 4px;
  font-style: normal;
  color: #8c8c8c;
}

.conversion-total-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid #e8eef6;
}

.conversion-total-bar__label {
  font-size: 12px;
  color: #8c8c8c;
}

.conversion-total-bar__amount {
  font-size: 18px;
  font-weight: 700;
  color: #1890ff;
}

.fee-group-table :deep(.ant-table-container::before),
.fee-group-table :deep(.ant-table-container::after) {
  box-shadow: none !important;
}

.fee-group-table :deep(.ant-table-expanded-row > td) {
  padding: 4px 8px;
  background: #fff;
}

.fee-group-table :deep(.user-role-column) {
  max-width: 72px;
}

.fee-group-table .ellipsis-cell {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expanded-fee-table {
  overflow-x: auto;
}

.expanded-fee-table :deep(.ant-table-wrapper) {
  width: max-content;
  max-width: none;
}

.expanded-fee-table :deep(.ant-table-container::before),
.expanded-fee-table :deep(.ant-table-container::after) {
  box-shadow: none !important;
}

.expanded-fee-table :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}

.fee-applied-amount-value {
  font-weight: 600;
  color: #1677ff;
}

.fee-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 0;
  margin-top: 8px;
  font-size: 13px;
  color: #8c8c8c;
  border-top: 1px solid #f0f0f0;
}
</style>
