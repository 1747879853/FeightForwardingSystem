<script lang="ts" setup>
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { FeeDetailRow } from '#/views/fee-management/payment-application/form-data';

import { computed, onUnmounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import dayjs from 'dayjs';

import { Card, Empty, Spin, Tag, Tooltip } from 'ant-design-vue';

import { getPaymentApplicationDetail } from '#/api/settlement-management/payment-application-admin';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { NestedDataTable } from '#/components/nested-data-table';
import { $t } from '#/locales';
import {
  resolvePodPortDisplayName,
  resolvePolPortDisplayName,
} from '#/views/fee-management/add-fee-modal/data';
import {
  buildAppliedAmountCurrencyColumns,
  calcAppliedAmountConverted,
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
import { sumInvoiceAmounts } from '#/views/fee-management/payment-application/invoice-rows';

import { formatSettlementReceivableItems } from './data';

const props = defineProps<{
  paymentApplicationId?: string;
  settlementReceivableGroup?: PaymentReviewAdminApi.SettlementReceivableGroupDto[];
}>();

const t = (key: string, args?: any[]) =>
  $t(`seaExport.export.paymentApplication.${key}`, args as any);

const settlementReceivableItems = computed(() =>
  formatSettlementReceivableItems(props.settlementReceivableGroup),
);

const loading = ref(false);
const loaded = ref(false);
/** 当前详情对应的申请单号（多选时便于对照正在看哪一单） */
const applicationNo = ref('');

const settlementCurrencyId = ref<null | number>(null);
const settlementCurrencyName = ref('');
const feeDetailRows = ref<FeeDetailRow[]>([]);
/** 申请自身附件（按类型分组） */
const attachmentGroups = ref<PaymentApplicationAdminApi.AttachmentGroupDto[]>(
  [],
);
/** 发票子表（每张票带自己的单个附件） */
const paymentApplicationInvoices = ref<
  PaymentApplicationAdminApi.PaymentApplicationInvoiceDto[]
>([]);
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
    settlementAttachments.value.length > 0 ||
    paymentApplicationInvoices.value.length > 0,
);

const invoiceAmountTotal = computed(() =>
  sumInvoiceAmounts(paymentApplicationInvoices.value),
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
  const settlementShortName = detail.settlement?.name ?? '';
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
        clientName: order?.client?.name,
        accountDate: order?.accountDate,
        etd: order?.etd,
        polName: order ? resolvePolPortDisplayName(order) : '',
        podName: order ? resolvePodPortDisplayName(order) : '',
        saleUserNames: order?.saleNames?.join('、'),
        operationUserNames: order?.operatorNames?.join('、'),
        customerServiceUserNames: order?.customerServiceNames?.join('、'),
        paySide: fee?.paySide ?? 0,
        feeCodeId: fee?.feeCodeId ?? 0,
        feeCodeName: fee?.feeCode?.cnName,
        currencyId: fee?.currencyId ?? 0,
        currencyCode: resolveFeeCurrencyCode(fee, group.currencyGroup),
        currencyName: fee?.currency?.cnName,
        settlementId: fee?.settlementId ?? '',
        settlementName: settlementShortName || fee?.settlement?.name || '',
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
  applicationNo.value = '';
  settlementCurrencyId.value = null;
  settlementCurrencyName.value = '';
  feeDetailRows.value = [];
  attachmentGroups.value = [];
  paymentApplicationInvoices.value = [];
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
    applicationNo.value = detail.applicationNo ?? '';
    settlementCurrencyId.value = detail.currencyId ?? null;
    settlementCurrencyName.value = detail.currency?.code ?? '';
    feeDetailRows.value = mapDetailToFeeRows(detail);
    restoreBanksFromDetail(detail);
    attachmentGroups.value = detail.attachmentGroup ?? [];
    paymentApplicationInvoices.value = detail.paymentApplicationInvoices ?? [];
    settlementAttachments.value = (detail.paymentSettlements ?? []).flatMap(
      (ps) => ps.attachments ?? [],
    );
    expandedGroupKeys.value = [];
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
  openAttachmentViewer(item);
}

function formatInvoiceDate(val: null | string | undefined): string {
  return formatDate(val) || '-';
}

const SPLIT_STORAGE_KEY = 'payment-review-layout-split';
const layoutRef = ref<HTMLElement | null>(null);
const topPaneRef = ref<HTMLElement | null>(null);
const topHeight = ref(52);
const asideWidth = ref(360);
const isDragging = ref(false);
const dragDirection = ref<'horizontal' | 'vertical'>('vertical');

try {
  const saved = localStorage.getItem(SPLIT_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved) as {
      asideWidth?: number;
      topHeight?: number;
    };
    if (typeof parsed.topHeight === 'number') {
      topHeight.value = Math.max(22, Math.min(78, parsed.topHeight));
    }
    if (typeof parsed.asideWidth === 'number') {
      asideWidth.value = Math.max(240, parsed.asideWidth);
    }
  }
} catch {
  // 本地缓存损坏时回退默认比例
}

let dragMove: ((event: MouseEvent) => void) | null = null;
let dragUp: (() => void) | null = null;

function persistSplit() {
  localStorage.setItem(
    SPLIT_STORAGE_KEY,
    JSON.stringify({
      topHeight: topHeight.value,
      asideWidth: asideWidth.value,
    }),
  );
}

function notifyPanesResized() {
  window.dispatchEvent(new Event('resize'));
}

function stopDrag() {
  const wasDragging = isDragging.value;
  isDragging.value = false;
  if (dragMove) document.removeEventListener('mousemove', dragMove);
  if (dragUp) document.removeEventListener('mouseup', dragUp);
  dragMove = null;
  dragUp = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  if (wasDragging) {
    persistSplit();
    notifyPanesResized();
  }
}

function startVerticalDrag(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  const container = layoutRef.value;
  if (!container) return;

  isDragging.value = true;
  dragDirection.value = 'vertical';
  const startY = event.clientY;
  const startHeight = topHeight.value;

  dragMove = (moveEvent: MouseEvent) => {
    moveEvent.preventDefault();
    const height = container.getBoundingClientRect().height;
    if (height === 0) return;
    const next = startHeight + ((moveEvent.clientY - startY) / height) * 100;
    topHeight.value = Math.max(22, Math.min(78, next));
  };
  dragUp = stopDrag;
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragUp);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
}

function startHorizontalDrag(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  const pane = topPaneRef.value;
  if (!pane) return;

  isDragging.value = true;
  dragDirection.value = 'horizontal';
  const startX = event.clientX;
  const startWidth = asideWidth.value;

  dragMove = (moveEvent: MouseEvent) => {
    moveEvent.preventDefault();
    const width = pane.getBoundingClientRect().width;
    if (width === 0) return;
    const maxWidth = Math.max(240, width - 360);
    const next = startWidth + (startX - moveEvent.clientX);
    asideWidth.value = Math.max(240, Math.min(maxWidth, next));
  };
  dragUp = stopDrag;
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragUp);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

onUnmounted(stopDrag);
</script>

<template>
  <div
    ref="layoutRef"
    class="review-layout"
    :class="{ 'is-resizing': isDragging }"
  >
    <!-- 上方两栏：左列表 + 右(费用合计 / 附件) -->
    <div
      ref="topPaneRef"
      class="review-layout__top"
      :style="{ flex: `${topHeight} 1 0%` }"
    >
      <!-- 左：列表 -->
      <div class="review-layout__list">
        <slot name="list" />
      </div>

      <div
        class="drag-handle drag-handle-horizontal"
        :class="{
          dragging: isDragging && dragDirection === 'horizontal',
        }"
        title="拖动调整左右宽度"
        @mousedown="startHorizontalDrag"
      >
        <div class="drag-line"></div>
      </div>

      <!-- 右：费用合计 + 附件（上下排列） -->
      <div
        class="review-layout__aside"
        :style="{ flex: `0 0 ${asideWidth}px`, width: `${asideWidth}px` }"
      >
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

              <div class="receivable-block">
                <div class="receivable-block__title">
                  {{
                    $t('auditApproval.paymentReview.settlementReceivableGroup')
                  }}
                </div>
                <div
                  v-if="settlementReceivableItems.length === 0"
                  class="receivable-block__empty"
                >
                  {{
                    $t('auditApproval.paymentReview.settlementReceivableEmpty')
                  }}
                </div>
                <div v-else class="receivable-block__list">
                  <div
                    v-for="item in settlementReceivableItems"
                    :key="item.key"
                    class="receivable-block__item"
                  >
                    <Tag color="orange">
                      {{ item.currencyCode || '-' }}
                    </Tag>
                    <span class="receivable-block__amount">
                      {{ item.amountText }}
                    </span>
                  </div>
                </div>
              </div>
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
                  v-if="paymentApplicationInvoices.length > 0"
                  class="review-attachment-group"
                >
                  <div class="review-attachment-group__title">发票</div>
                  <div class="review-invoice-list">
                    <div
                      v-for="invoice in paymentApplicationInvoices"
                      :key="invoice.id"
                      class="review-invoice-row"
                    >
                      <span class="review-invoice-row__no">
                        {{ invoice.invoiceNo || '-' }}
                      </span>
                      <span class="review-invoice-row__header">
                        {{ invoice.sellerHeader || '-' }}
                      </span>
                      <span class="review-invoice-row__date">
                        {{ formatInvoiceDate(invoice.invoiceDate) }}
                      </span>
                      <span class="review-invoice-row__amount">
                        {{
                          invoice.amount == null
                            ? '-'
                            : formatAmount(invoice.amount)
                        }}
                      </span>
                      <button
                        v-if="invoice.attachment"
                        type="button"
                        class="review-attachment-file"
                        :title="getAttachmentFileName(invoice.attachment)"
                        @click="openAttachment(invoice.attachment)"
                      >
                        <IconifyIcon icon="mdi:file-outline" />
                        <span>{{
                          getAttachmentFileName(invoice.attachment)
                        }}</span>
                      </button>
                      <span v-else class="review-invoice-row__empty">
                        无附件
                      </span>
                    </div>
                    <div
                      v-if="invoiceAmountTotal != null"
                      class="review-invoice-total"
                    >
                      <span>总额</span>
                      <strong>{{ formatAmount(invoiceAmountTotal) }}</strong>
                    </div>
                  </div>
                </section>
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

    <div
      class="drag-handle drag-handle-vertical"
      :class="{ dragging: isDragging && dragDirection === 'vertical' }"
      title="拖动调整上下高度"
      @mousedown="startVerticalDrag"
    >
      <div class="drag-line"></div>
    </div>

    <!-- 下方一栏：通铺费用明细 -->
    <div
      class="review-layout__bottom"
      :style="{ flex: `${100 - topHeight} 1 0%` }"
    >
      <Card size="small" class="fee-detail-card">
        <template #title>
          <div class="flex items-center gap-3">
            <span class="font-semibold">{{ t('feeDetail') }}</span>
            <span v-if="applicationNo" class="text-xs text-gray-500">
              {{ t('applicationNo') }}：
              <Tag color="blue">{{ applicationNo }}</Tag>
            </span>
          </div>
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
              <NestedDataTable
                :columns="allOrderGroupColumns"
                :data-source="orderGroups"
                fill-height
                :inner-columns="feeInnerColumns"
                inner-data-key="children"
                inner-row-key="feeId"
                row-key="key"
                :expanded-row-keys="expandedGroupKeys"
                @update:expanded-row-keys="
                  (keys) => (expandedGroupKeys = keys.map(String))
                "
              >
                <template #outerBodyCell="{ column, record, index }">
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

                <template #expandColumnTitle></template>
                <template #expandIcon="{ expanded, record, onExpand }">
                  <span
                    class="expand-toggle"
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
                  <template v-if="column.key === 'seq'">
                    {{ index + 1 }}
                  </template>
                  <template v-else-if="column.key === 'paySide'">
                    <Tag :color="record.paySide === 0 ? 'blue' : 'orange'">
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
                  <template v-else-if="column.key === 'appliedAmountConverted'">
                    {{
                      formatAmount(
                        calcAppliedAmountConverted(
                          record.appliedAmount,
                          record.rate,
                        ),
                      )
                    }}
                  </template>
                  <template v-else-if="column.key === 'rate'">
                    {{ record.rate }}
                  </template>
                  <template v-else>
                    {{ getCellText(record, column.dataIndex) }}
                  </template>
                </template>
              </NestedDataTable>
            </div>

            <div class="fee-detail-bottom">
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
            </div>
          </template>
        </Spin>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.review-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.review-layout.is-resizing {
  user-select: none;
}

.review-layout.is-resizing * {
  pointer-events: none;
}

.review-layout.is-resizing .drag-handle,
.review-layout.is-resizing .drag-handle * {
  pointer-events: auto;
}

.drag-handle {
  position: relative;
  z-index: 10;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.drag-handle .drag-line {
  background-color: #e4e8ef;
  border-radius: 999px;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.drag-handle:hover .drag-line,
.drag-handle.dragging .drag-line {
  background-color: #1890ff;
  box-shadow: 0 0 6px rgb(24 144 255 / 30%);
}

.drag-handle.dragging .drag-line {
  box-shadow: 0 0 8px rgb(24 144 255 / 40%);
}

.drag-handle-vertical {
  height: 12px;
  cursor: row-resize;
}

.drag-handle-vertical .drag-line {
  width: 48px;
  height: 4px;
}

.drag-handle-horizontal {
  width: 12px;
  cursor: col-resize;
}

.drag-handle-horizontal .drag-line {
  width: 4px;
  height: 48px;
}

/* 上方两栏 */
.review-layout__top {
  display: flex;
  min-width: 0;
  min-height: 160px;
  overflow: hidden;
}

.review-layout__list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.review-layout__aside {
  min-width: 0;
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

.receivable-block {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px dashed #e8eef6;
}

.receivable-block__title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #595959;
}

.receivable-block__empty {
  font-size: 12px;
  color: #bfbfbf;
}

.receivable-block__list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #f3e8d8;
  border-radius: 6px;
}

.receivable-block__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  background: #fffaf3;
  border-bottom: 1px solid #f3e8d8;
}

.receivable-block__item:last-child {
  border-bottom: 0;
}

.receivable-block__amount {
  font-size: 15px;
  font-weight: 700;
  color: #d46b08;
  word-break: keep-all;
}

.attachment-card {
  flex-shrink: 0;
}

.attachment-card :deep(.ant-card-body) {
  max-height: 240px;
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

.review-invoice-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-invoice-row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
}

.review-invoice-row__no {
  flex: 1 1 80px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #262626;
  white-space: nowrap;
}

.review-invoice-row__header {
  flex: 1 1 100px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #595959;
  white-space: nowrap;
}

.review-invoice-row__date {
  flex-shrink: 0;
  color: #8c8c8c;
}

.review-invoice-row__amount {
  flex-shrink: 0;
  min-width: 72px;
  color: #262626;
  text-align: right;
}

.review-invoice-row__empty {
  flex-shrink: 0;
  color: #bfbfbf;
}

.review-invoice-total {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  padding-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.review-invoice-total strong {
  color: #262626;
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
  min-height: 160px;
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

.fee-group-table :deep(.nested-data-table) {
  height: 100%;
}

.fee-group-table :deep(.nested-data-table__scroll) {
  padding-bottom: 16px;
}

.fee-group-table :deep(.nested-data-table__inner) {
  max-width: none;
}

.fee-detail-bottom {
  flex-shrink: 0;
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

.expand-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  min-width: 14px;
  line-height: 1;
  cursor: pointer;
  transform-origin: center;
  transition: transform 0.15s ease;
}

.expand-toggle--expanded {
  transform: rotate(90deg);
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
