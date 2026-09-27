<script setup lang="ts">
import type { BillAttachment } from '#/api/bill-of-lading';

import { computed } from 'vue';

import { Button, Table } from 'ant-design-vue';
import {
  TableSummary,
  TableSummaryCell,
  TableSummaryRow,
} from 'ant-design-vue/es/table';

import { openAttachmentViewer } from '#/components/attachment-viewer';
import { billStatusOptions } from '#/views/bill-of-lading/rules';

const props = defineProps<{
  columns: any[];
  dataSource?: null | readonly any[];
  /** 按本位币合计应收、已收、未收，用于应收欠费 */
  moneyTotal?: boolean;
  rowKey: any;
  rowSelection?: any;
  scrollX: number;
}>();

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

const statusTone = [
  'pending',
  'signed',
  'rejected',
  'auditing',
  'ready',
  'done',
  'held',
];
const myStates = ['待审核', '已驳回', '已通过'];
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

function isDateColumn(column: { dataIndex?: unknown }) {
  return dateFields.has(fieldKey(column.dataIndex));
}

function isClipColumn(column: { dataIndex?: unknown }) {
  return clipFields.has(fieldKey(column.dataIndex));
}

function formatMoney(value?: null | number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '—';
  }
  return `¥ ${Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function displayCell(column: { dataIndex?: unknown }, text: unknown) {
  if (isDateColumn(column)) {
    if (text == null || text === '') return '—';
    return String(text).replace('T', ' ').slice(0, 10);
  }
  if (isMoneyColumn(column)) {
    if (text == null || text === '') return '—';
    return formatMoney(Number(text));
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

function myStatusClass(status: unknown) {
  if (status == null) return 'is-idle';
  return ['is-auditing', 'is-rejected', 'is-done'][Number(status)] ?? 'is-idle';
}

function myStatusLabel(status: unknown) {
  if (typeof status !== 'number') return '未到当前步骤';
  return myStates[status] ?? '—';
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
</script>

<template>
  <Table
    class="sheet"
    size="small"
    :columns="columns"
    :data-source="dataSource ?? []"
    :pagination="false"
    :row-key="rowKey"
    :row-selection="rowSelection"
    :scroll="{ x: scrollX }"
    :locale="{ emptyText: '暂无数据' }"
  >
    <template #bodyCell="{ column, record, text }">
      <span
        v-if="column.key === 'status'"
        class="pill"
        :class="billStatusClass(text)"
        >{{ billStatusLabel(text) }}</span
      >
      <template v-else-if="column.key === 'held'">
        <span v-if="text == null" class="muted">—</span>
        <span v-else class="pill" :class="text ? 'is-held' : 'is-idle'">{{
          text ? '是' : '否'
        }}</span>
      </template>
      <span
        v-else-if="column.key === 'mine'"
        class="pill"
        :class="myStatusClass(text)"
        >{{ myStatusLabel(text) }}</span
      >
      <template v-else-if="column.key === 'blNums'">
        {{ Array.isArray(text) && text.length ? text.join('、') : '—' }}
      </template>
      <span
        v-else-if="column.key === 'arrearsDays'"
        class="days"
        :class="daysTone(text)"
        >{{ text == null || text === '' ? '—' : text }}</span
      >
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
        :title="isClipColumn(column) ? displayCell(column, text) : undefined"
        >{{ displayCell(column, text) }}</span
      >
    </template>
    <template v-if="totals.length" #summary>
      <TableSummary>
        <TableSummaryRow v-for="line in totals" :key="line.code || 'local'">
          <TableSummaryCell :index="0" :col-span="3">合计</TableSummaryCell>
          <TableSummaryCell :index="3">{{ line.code || '—' }}</TableSummaryCell>
          <TableSummaryCell :index="4" align="right">
            <span class="cell amount">{{ formatMoney(line.receivable) }}</span>
          </TableSummaryCell>
          <TableSummaryCell :index="5" align="right">
            <span class="cell amount">{{ formatMoney(line.received) }}</span>
          </TableSummaryCell>
          <TableSummaryCell :index="6" align="right">
            <span class="cell amount">{{ formatMoney(line.unreceived) }}</span>
          </TableSummaryCell>
        </TableSummaryRow>
      </TableSummary>
    </template>
  </Table>
</template>

<style scoped>
.sheet :deep(.ant-table) {
  color: #1f2329;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.sheet :deep(.ant-table-container) {
  border-start-start-radius: 8px;
  border-start-end-radius: 8px;
}

.sheet :deep(.ant-table-thead > tr > th) {
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

.sheet :deep(.ant-table-summary > tr > td) {
  font-size: 13px;
  font-weight: 600;
  background: #f7f8fa;
  border-bottom: 0;
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
