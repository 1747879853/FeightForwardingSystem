<script lang="ts" setup>
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { FeeDetailRow } from '#/views/fee-management/payment-application/form-data';

import { computed, onUnmounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Card, Empty, Spin, Table, Tag, Tooltip } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getPaymentApplicationDetail } from '#/api/settlement-management/payment-application-admin';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { NestedDataTable } from '#/components/nested-data-table';
import { $t } from '#/locales';
import { compareAttachmentTypeSortIdDesc } from '#/utils';
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
  useFeeInnerColumns,
  useOrderGroupColumns,
} from '#/views/fee-management/payment-application/form-data';
import { sumInvoiceAmounts } from '#/views/fee-management/payment-application/invoice-rows';

import { formatSettlementReceivableItems } from './data';

interface ReviewFeeDetailRow extends FeeDetailRow {
  unSettledAmount: number;
}

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
const settlementName = ref('');
const transportOrders = ref<
  PaymentApplicationAdminApi.TransportOrderSimpleDto[]
>([]);

const invoiceColumns = [
  {
    title: '发票抬头',
    dataIndex: 'sellerHeader',
    key: 'sellerHeader',
    width: 140,
    ellipsis: true,
  },
  {
    title: '发票号',
    dataIndex: 'invoiceNo',
    key: 'invoiceNo',
    width: 150,
    ellipsis: true,
  },
  {
    title: '开票日期',
    dataIndex: 'invoiceDate',
    key: 'invoiceDate',
    width: 100,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right' as const,
  },
  { title: '附件', key: 'attachment', width: 150 },
];
const receivableHint =
  '当前该结算对象在系统中已提交的应收未结算金额，可用于判断是否需要进行费用互抵';
const settlementStatuses: Record<number, { color: string; label: string }> = {
  0: { label: '未结算', color: 'default' },
  1: { label: '部分结算', color: 'purple' },
  2: { label: '结算完毕', color: 'green' },
};

const settlementCurrencyId = ref<null | number>(null);
const feeDetailRows = ref<ReviewFeeDetailRow[]>([]);
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
        group.attachmentDtlTypeId === null ||
        group.attachmentDtlTypeId === undefined
          ? 'untyped'
          : String(group.attachmentDtlTypeId),
      name:
        group.attachmentDtlType?.name ||
        (group.attachmentDtlTypeId === null ||
        group.attachmentDtlTypeId === undefined
          ? '未分类'
          : String(group.attachmentDtlTypeId)),
      items: group.items ?? [],
      sortId: group.attachmentDtlType?.sortId ?? 0,
    }))
    .filter((group) => group.items.length > 0)
    .toSorted((a, b) => compareAttachmentTypeSortIdDesc(a.sortId, b.sortId)),
);

const hasAttachments = computed(
  () =>
    visibleAttachmentGroups.value.length > 0 ||
    settlementAttachments.value.length > 0,
);

const invoiceAmountTotal = computed(() =>
  sumInvoiceAmounts(paymentApplicationInvoices.value),
);

const orderGroupColumns = useOrderGroupColumns().flatMap((column) =>
  column.key === 'accountDate'
    ? [
        column,
        {
          title: '应收结算状态',
          dataIndex: 'transportOrder.recSettlementStatus',
          key: 'recSettlementStatus',
          width: 120,
        },
      ]
    : [column],
);
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
  groupFeesByOrder(feeDetailRows.value, appliedCurrencies.value).map(
    (group) => ({
      ...group,
      transportOrder: transportOrders.value.find(
        (order) => order.id === group.transportOrderId,
      ),
    }),
  ),
);
const expandedGroupKeys = ref<string[]>([]);

const currencySummaries = computed(() =>
  summarizeByCurrency(feeDetailRows.value),
);
function mapDetailToFeeRows(
  detail: PaymentApplicationAdminApi.PaymentApplicationDetailDto,
): ReviewFeeDetailRow[] {
  const settlementShortName = detail.settlement?.name ?? '';
  const rows: ReviewFeeDetailRow[] = [];
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
        unRqstPaymentAmount: fee?.unRqstPaymentAmount ?? 0,
        appliedAmount: item.appliedAmount,
        exchangeRate: fee?.exchangeRate,
        itemRemark: item.remark ?? '',
        rate: item.rate ?? undefined,
      });
    }
  }
  return rows;
}

function resetState() {
  applicationNo.value = '';
  settlementName.value = '';
  transportOrders.value = [];
  settlementCurrencyId.value = null;
  feeDetailRows.value = [];
  attachmentGroups.value = [];
  paymentApplicationInvoices.value = [];
  settlementAttachments.value = [];
  expandedGroupKeys.value = [];
  loaded.value = false;
}

let detailRequestId = 0;

async function loadDetail(id: string | undefined) {
  const requestId = ++detailRequestId;
  resetState();
  if (!id) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const detail = await getPaymentApplicationDetail(id);
    if (requestId !== detailRequestId) return;
    applicationNo.value = detail.applicationNo ?? '';
    settlementCurrencyId.value = detail.currencyId ?? null;
    settlementName.value =
      detail.settlement?.name || detail.settlement?.fullName || '-';
    transportOrders.value = (detail.payAppFeeBySeaExportGroup ?? []).flatMap(
      (group) => (group.transportOrder ? [group.transportOrder] : []),
    );
    feeDetailRows.value = mapDetailToFeeRows(detail);
    attachmentGroups.value = detail.attachmentGroup ?? [];
    paymentApplicationInvoices.value = detail.paymentApplicationInvoices ?? [];
    settlementAttachments.value = (detail.paymentSettlements ?? []).flatMap(
      (ps) => ps.attachments ?? [],
    );
    expandedGroupKeys.value = [];
    loaded.value = true;
  } finally {
    if (requestId === detailRequestId) loading.value = false;
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
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

function getCellText(record: any, dataIndex: any): string {
  if (!dataIndex) return '';
  const value = record?.[String(dataIndex)];
  return value === null || value === undefined ? '' : String(value);
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
    <!-- 上方两栏：左列表 + 右(应收未结算 / 发票 / 附件) -->
    <div
      ref="topPaneRef"
      class="review-layout__top"
      :style="{ flex: `${topHeight} 1 0%` }"
    >
      <!-- 左：列表 -->
      <div class="review-layout__list">
        <slot name="list"></slot>
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

      <!-- 右：结算对象应收未结算、发票、附件 -->
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
            <Card size="small" class="summary-card">
              <template #title>
                <div class="receivable-title">
                  <span class="truncate" :title="settlementName">
                    {{
                      $t(
                        'auditApproval.paymentReview.settlementReceivableGroup',
                      )
                    }}：{{ settlementName }}
                  </span>
                  <Tooltip
                    :title="receivableHint"
                    :trigger="['hover', 'focus']"
                  >
                    <button
                      type="button"
                      class="receivable-help"
                      :aria-label="receivableHint"
                    >
                      <IconifyIcon icon="ant-design:question-circle-outlined" />
                    </button>
                  </Tooltip>
                </div>
              </template>
              <div class="receivable-block">
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

            <Card size="small" class="invoice-card" title="发票">
              <Table
                :columns="invoiceColumns"
                :data-source="paymentApplicationInvoices"
                :pagination="false"
                :scroll="{ x: 640 }"
                size="small"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'invoiceDate'">
                    {{ formatInvoiceDate(record.invoiceDate) }}
                  </template>
                  <template v-else-if="column.key === 'amount'">
                    {{
                      record.amount == null ? '-' : formatAmount(record.amount)
                    }}
                  </template>
                  <template v-else-if="column.key === 'attachment'">
                    <button
                      v-if="record.attachment"
                      type="button"
                      class="review-attachment-file"
                      :title="getAttachmentFileName(record.attachment)"
                      @click="openAttachment(record.attachment)"
                    >
                      <IconifyIcon icon="mdi:file-outline" />
                      <span>{{
                        getAttachmentFileName(record.attachment)
                      }}</span>
                    </button>
                    <span v-else class="text-gray-400">无附件</span>
                  </template>
                  <template v-else>
                    {{ getCellText(record, column.dataIndex) || '-' }}
                  </template>
                </template>
              </Table>
              <div
                v-if="invoiceAmountTotal != null"
                class="review-invoice-total"
              >
                <span>总额</span>
                <strong>{{ formatAmount(invoiceAmountTotal) }}</strong>
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
                  <template v-else-if="column.key === 'recSettlementStatus'">
                    <Tag
                      v-if="
                        settlementStatuses[
                          record.transportOrder?.recSettlementStatus
                        ]
                      "
                      :color="
                        settlementStatuses[
                          record.transportOrder.recSettlementStatus
                        ]?.color
                      "
                    >
                      {{
                        settlementStatuses[
                          record.transportOrder.recSettlementStatus
                        ]?.label
                      }}
                    </Tag>
                    <span v-else>—</span>
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
  background-color: hsl(var(--primary));
  box-shadow: 0 0 6px hsl(var(--primary) / 30%);
}

.drag-handle.dragging .drag-line {
  box-shadow: 0 0 8px hsl(var(--primary) / 40%);
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
  overflow-y: auto;
}

.summary-card {
  display: flex;
  flex: 0 0 auto;
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

.receivable-title {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.receivable-help {
  flex-shrink: 0;
  color: #8c8c8c;
  cursor: help;
}

.receivable-block__empty {
  font-size: 12px;
  color: #bfbfbf;
}

.receivable-block__list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 4px;
  overflow: hidden;
  background: #fffaf3;
  border: 1px solid #f3e8d8;
  border-radius: 6px;
}

.receivable-block__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  background: #fffaf3;
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

.invoice-card,
.attachment-card {
  flex-shrink: 0;
}

.invoice-card :deep(.ant-card-body),
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
