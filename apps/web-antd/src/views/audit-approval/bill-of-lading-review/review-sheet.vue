<script setup lang="ts">
import type { BillAttachment, BillTask } from '#/api/bill-of-lading';

import { computed } from 'vue';

import { Button, Table } from 'ant-design-vue';
import {
  TableSummary,
  TableSummaryCell,
  TableSummaryRow,
} from 'ant-design-vue/es/table';

import { openAttachmentViewer } from '#/components/attachment-viewer';
import CopyBillNo from '#/views/bill-of-lading/copy-bill-no.vue';
import { formatLocalMoney } from '#/views/bill-of-lading/money';
import { billStatusOptions } from '#/views/bill-of-lading/rules';

import OriginMoneyTip from './origin-money-tip.vue';
import StatusFlowPop from './status-flow-pop.vue';

const props = defineProps<{
  columns: any[];
  dataSource?: null | readonly any[];
  /** 本批审批流程，申请放单状态悬浮与列表状态列共用 */
  flow?: BillTask['workFlowInstance'];
  /** 按本位币合计应收、已收、未收，用于应收欠费 */
  moneyTotal?: boolean;
  rowKey: any;
  rowSelection?: any;
  scrollX: number;
}>();

interface OriginLine {
  code: string;
  name: string;
  receivable: number;
  received: number;
  unReceived: number;
}

function originLines(currencies: unknown): OriginLine[] {
  if (!Array.isArray(currencies)) return [];
  return currencies.flatMap((item) => {
    const code = item?.currency?.code ?? item?.code;
    if (!code) return [];
    return [
      {
        code: String(code),
        name: String(item.currency?.cnName ?? item?.name ?? ''),
        receivable: Number(item.receivable) || 0,
        received: Number(item.received) || 0,
        unReceived: Number(item.unReceived) || 0,
      },
    ];
  });
}

const totals = computed(() => {
  if (!props.moneyTotal) return [];
  const rows = props.dataSource ?? [];
  const grouped = new Map<
    string,
    { code: string; receivable: number; received: number; unreceived: number }
  >();
  for (const row of rows) {
    const code = String(row.localCurrencyCode ?? '');
    const current = grouped.get(code) ?? {
      code,
      receivable: 0,
      received: 0,
      unreceived: 0,
    };
    current.receivable += Number(row.totalReceivable) || 0;
    current.received += Number(row.totalReceived) || 0;
    current.unreceived += Number(row.totalUnReceived) || 0;
    grouped.set(code, current);
  }
  return [...grouped.values()];
});

const summaryOrigins = computed(() => {
  const grouped = new Map<string, Map<string, OriginLine>>();
  if (!props.moneyTotal) return grouped;
  for (const row of props.dataSource ?? []) {
    const localCode = String(row.localCurrencyCode ?? '');
    const bucket = grouped.get(localCode) ?? new Map<string, OriginLine>();
    for (const line of originLines(row.currencies)) {
      const current = bucket.get(line.code) ?? {
        code: line.code,
        name: line.name,
        receivable: 0,
        received: 0,
        unReceived: 0,
      };
      current.receivable += line.receivable;
      current.received += line.received;
      current.unReceived += line.unReceived;
      if (!current.name && line.name) current.name = line.name;
      bucket.set(line.code, current);
    }
    grouped.set(localCode, bucket);
  }
  return grouped;
});

function summaryOriginLines(localCode: string) {
  return [...(summaryOrigins.value.get(localCode)?.values() ?? [])];
}

const statusTone = [
  'pending',
  'signed',
  'rejected',
  'auditing',
  'ready',
  'done',
  'held',
];
const dateFields = new Set([
  'etd',
  'settlementDate',
  'promisePayDate',
  'finalSettlementTime',
]);
const moneyFields = new Set([
  'unReceivedAmount',
  'totalReceivable',
  'totalReceived',
  'totalUnReceived',
]);
const clipFields = new Set(['overdueRemark', 'remark']);

function fieldKey(dataIndex: unknown) {
  if (Array.isArray(dataIndex)) {
    return String(dataIndex[dataIndex.length - 1] ?? '');
  }
  return String(dataIndex ?? '');
}

function isMoneyColumn(column: { dataIndex?: unknown }) {
  return moneyFields.has(fieldKey(column.dataIndex));
}

const convertedMoneyFields = new Set([
  'totalReceivable',
  'totalReceived',
  'totalUnReceived',
]);

function isConvertedMoneyColumn(column: { dataIndex?: unknown }) {
  return (
    !!props.moneyTotal && convertedMoneyFields.has(fieldKey(column.dataIndex))
  );
}

function originFocus(column: { dataIndex?: unknown }) {
  const key = fieldKey(column.dataIndex);
  if (key === 'totalReceived') return 'received';
  if (key === 'totalUnReceived' || key === 'unReceivedAmount')
    return 'unReceived';
  return 'receivable';
}

function rowOriginLines(record: {
  billOfLading?: { currencies?: unknown };
  currencies?: unknown;
}) {
  return originLines(record?.billOfLading?.currencies ?? record?.currencies);
}

function tipLines(column: { dataIndex?: unknown }, record: any) {
  if (isConvertedMoneyColumn(column)) return originLines(record?.currencies);
  if (fieldKey(column.dataIndex) === 'unReceivedAmount') {
    return rowOriginLines(record);
  }
  return [];
}

function isDateColumn(column: { dataIndex?: unknown }) {
  return dateFields.has(fieldKey(column.dataIndex));
}

function isClipColumn(column: { dataIndex?: unknown }) {
  return clipFields.has(fieldKey(column.dataIndex));
}

const billNumberFields = new Set(['blNum', 'blNums', 'mblNum']);

function isBillNumberColumn(column: { dataIndex?: unknown; key?: unknown }) {
  if (column.key != null && billNumberFields.has(String(column.key))) {
    return true;
  }
  return billNumberFields.has(fieldKey(column.dataIndex));
}

function moneyCode(record?: {
  billOfLading?: { localCurrencyCode?: null | string };
  localCurrencyCode?: null | string;
}) {
  return record?.billOfLading?.localCurrencyCode ?? record?.localCurrencyCode;
}

function formatMoney(value?: null | number, code?: null | string) {
  return formatLocalMoney(value, code);
}

function displayCell(
  column: { dataIndex?: unknown },
  text: unknown,
  record?: {
    billOfLading?: { localCurrencyCode?: null | string };
    localCurrencyCode?: null | string;
  },
) {
  if (isDateColumn(column)) {
    if (text == null || text === '') return '—';
    return String(text).replace('T', ' ').slice(0, 10);
  }
  if (fieldKey(column.dataIndex) === 'localCurrencyCode') {
    if (text == null || text === '') return '—';
    return String(text);
  }
  if (isMoneyColumn(column)) {
    if (text == null || text === '') return '—';
    return formatMoney(Number(text), moneyCode(record));
  }
  if (text == null || text === '') return '';
  return String(text);
}

function isPlaceholder(column: { dataIndex?: unknown }, text: unknown) {
  return displayCell(column, text) === '—';
}

function billStatusClass(status: unknown) {
  if (typeof status !== 'number') return 'is-idle';
  return `is-${statusTone[status] || 'idle'}`;
}

function billStatusLabel(status: unknown) {
  if (typeof status !== 'number') return '—';
  return billStatusOptions[status]?.label ?? '—';
}

function isAuditItem(record: { taskItemId?: string }) {
  return !!record?.taskItemId;
}

function proofFiles(record: {
  billOfLading?: null | { overdueAttachments?: BillAttachment[] | null };
  overdueAttachments?: BillAttachment[] | null;
}) {
  return (
    record.billOfLading?.overdueAttachments ?? record.overdueAttachments ?? []
  );
}

function proofName(file: BillAttachment) {
  return file.friendlyFileName || file.fileName || '查看';
}

function daysTone(value: unknown) {
  const days = Number(value);
  if (!Number.isFinite(days)) return '';
  if (days < 0) return 'is-early';
  if (days === 0) return 'is-due';
  return 'is-overdue';
}

function heldRowClass(record: {
  billOfLading?: { isHeldUp?: boolean | null };
  taskItemId?: string;
}) {
  if (!record?.taskItemId || !record.billOfLading?.isHeldUp) return '';
  return 'is-held-row';
}
</script>

<template>
  <div class="sheet-host">
    <Table
      class="sheet"
      size="small"
      :columns="columns"
      :data-source="dataSource ?? []"
      :pagination="false"
      :row-class-name="heldRowClass"
      :row-key="rowKey"
      :row-selection="rowSelection"
      :scroll="{ x: scrollX }"
      :locale="{ emptyText: '暂无数据' }"
    >
      <template #bodyCell="{ column, record, text }">
        <StatusFlowPop
          v-if="column.key === 'status' && isAuditItem(record)"
          :my-task-status="record.myTaskStatus"
          :bill-task-status="record.taskStatus"
          :audit-user-name="record.auditUserName"
          :audit-time="record.auditTime"
          :remark="record.remark"
          :work-flow-instance="flow"
        >
          <span class="pill" :class="billStatusClass(text)">{{
            billStatusLabel(text)
          }}</span>
        </StatusFlowPop>
        <span
          v-else-if="column.key === 'status'"
          class="pill"
          :class="billStatusClass(text)"
          >{{ billStatusLabel(text) }}</span
        >
        <template v-else-if="column.key === 'held'">
          <span v-if="text" class="pill is-alert">压单</span>
          <span v-else class="muted">—</span>
        </template>
        <CopyBillNo
          v-else-if="isBillNumberColumn(column)"
          :text="typeof text === 'string' ? text : undefined"
          :texts="Array.isArray(text) ? text : undefined"
          :placeholder="column.key === 'blNums' ? '—' : undefined"
        />
        <span
          v-else-if="column.key === 'arrearsDays'"
          class="days"
          :class="daysTone(text)"
          >{{ text == null || text === '' ? '—' : text }}</span
        >
        <OriginMoneyTip
          v-else-if="tipLines(column, record).length"
          :lines="tipLines(column, record)"
          :focus="originFocus(column)"
          title="折算前原币"
        >
          <span class="cell amount is-tip">{{
            displayCell(column, text, record)
          }}</span>
        </OriginMoneyTip>
        <template v-else-if="column.key === 'proof'">
          <div v-if="proofFiles(record).length" class="files">
            <Button
              v-for="file in proofFiles(record)"
              :key="String(file.attachmentId)"
              type="link"
              class="file-link"
              :title="proofName(file)"
              @click.stop="openAttachmentViewer(file)"
              >{{ proofName(file) }}</Button
            >
          </div>
          <span v-else class="muted">—</span>
        </template>
        <span
          v-else
          class="cell"
          :class="{
            amount: isMoneyColumn(column) && !isPlaceholder(column, text),
            clip: isClipColumn(column),
            muted: isPlaceholder(column, text),
          }"
          :title="
            isClipColumn(column) ? displayCell(column, text, record) : undefined
          "
          >{{ displayCell(column, text, record) }}</span
        >
      </template>
      <template v-if="totals.length" #summary>
        <TableSummary>
          <TableSummaryRow v-for="line in totals" :key="line.code || 'local'">
            <TableSummaryCell :index="0" :col-span="3">合计</TableSummaryCell>
            <TableSummaryCell :index="3">{{
              line.code || '—'
            }}</TableSummaryCell>
            <TableSummaryCell :index="4" align="right">
              <OriginMoneyTip
                v-if="summaryOriginLines(line.code).length"
                :lines="summaryOriginLines(line.code)"
                focus="receivable"
                title="折算前原币合计"
              >
                <span class="cell amount is-tip">{{
                  formatMoney(line.receivable, line.code)
                }}</span>
              </OriginMoneyTip>
              <span v-else class="cell amount">{{
                formatMoney(line.receivable, line.code)
              }}</span>
            </TableSummaryCell>
            <TableSummaryCell :index="5" align="right">
              <OriginMoneyTip
                v-if="summaryOriginLines(line.code).length"
                :lines="summaryOriginLines(line.code)"
                focus="received"
                title="折算前原币合计"
              >
                <span class="cell amount is-tip">{{
                  formatMoney(line.received, line.code)
                }}</span>
              </OriginMoneyTip>
              <span v-else class="cell amount">{{
                formatMoney(line.received, line.code)
              }}</span>
            </TableSummaryCell>
            <TableSummaryCell :index="6" align="right">
              <OriginMoneyTip
                v-if="summaryOriginLines(line.code).length"
                :lines="summaryOriginLines(line.code)"
                focus="unReceived"
                title="折算前原币合计"
              >
                <span class="cell amount is-tip">{{
                  formatMoney(line.unreceived, line.code)
                }}</span>
              </OriginMoneyTip>
              <span v-else class="cell amount">{{
                formatMoney(line.unreceived, line.code)
              }}</span>
            </TableSummaryCell>
          </TableSummaryRow>
        </TableSummary>
      </template>
    </Table>
  </div>
</template>

<style scoped>
.sheet-host {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.sheet {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sheet :deep(.ant-spin-nested-loading),
.sheet :deep(.ant-spin-container) {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sheet :deep(.ant-table) {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #1f2329;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.sheet :deep(.ant-table-container) {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-start-start-radius: 8px;
  border-start-end-radius: 8px;
}

.sheet :deep(.ant-table-content) {
  flex: 1 1 0;
  height: 100%;
  min-height: 0;
  overflow: auto !important;
}

.sheet :deep(.ant-table-thead > tr > th) {
  position: sticky;
  top: 0;
  z-index: 3;
  font-size: 12px;
  font-weight: 600;
  color: #5b6472;
  background: #f7f8fa;
  border-bottom: 1px solid #eef0f3;
}

.sheet :deep(.ant-table-tbody > tr > td) {
  font-size: 13px;
  border-bottom-color: #f2f3f5;
}

.sheet :deep(.ant-table-tbody > tr.is-held-row > td) {
  background: #fff7f0;
}

.sheet :deep(.ant-table-tbody > tr.is-held-row:hover > td) {
  background: #ffefe3;
}

.sheet :deep(.ant-table-tbody > tr.is-held-row.ant-table-row-selected > td) {
  background: #ffe8d6;
}

.sheet :deep(th.is-num),
.sheet :deep(td.is-num) {
  text-align: right;
}

.sheet :deep(td.is-num .origin-money-anchor) {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.sheet :deep(.ant-table-tbody > tr:last-child > td) {
  border-bottom: 0;
}

.sheet :deep(.ant-table-placeholder .ant-empty) {
  margin: 16px 0;
}

.pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  white-space: nowrap;
  border-radius: 999px;
}

.pill.is-pending {
  color: #d46b08;
  background: #fff7e6;
}

.pill.is-signed {
  color: #0958d9;
  background: #e6f4ff;
}

.pill.is-rejected {
  color: #cf1322;
  background: #fff1f0;
}

.pill.is-held {
  color: #c41d7f;
  background: #fff0f6;
}

.pill.is-alert {
  color: #fff;
  background: #f5222d;
}

.pill.is-auditing {
  color: #ad6800;
  background: #fff7e6;
}

.pill.is-ready {
  color: #08979c;
  background: #e6fffb;
}

.pill.is-done {
  color: #389e0d;
  background: #f6ffed;
}

.pill.is-idle {
  color: #5b6472;
  background: #f4f5f7;
}

.days {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.days.is-early {
  color: #52c41a;
}

.days.is-due {
  color: #faad14;
}

.days.is-overdue {
  color: #f5222d;
}

.sheet :deep(.ant-table-summary) {
  position: sticky;
  bottom: 0;
  z-index: 3;
}

.sheet :deep(.ant-table-summary > tr > td) {
  position: sticky;
  bottom: 0;
  z-index: 3;
  font-size: 13px;
  font-weight: 600;
  background: #f7f8fa;
  border-bottom: 0;
}

.cell.amount.is-tip {
  display: inline-block;
  width: fit-content;
  max-width: 100%;
  border-bottom: 1px dotted #c0c4cc;
}

.cell.amount {
  font-family:
    'Roboto Mono', 'DIN Alternate', ui-monospace, SFMono-Regular, Menlo,
    Consolas, monospace;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cell.clip {
  display: block;
  max-width: 168px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: #c0c4cc;
}

.files {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.file-link {
  display: inline-flex;
  justify-content: flex-start;
  max-width: 168px;
  height: auto;
  padding: 0;
  line-height: 20px;
}

.file-link :deep(span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
