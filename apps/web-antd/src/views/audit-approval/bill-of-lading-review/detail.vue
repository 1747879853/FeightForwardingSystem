<script setup lang="ts">
import type { BillTaskDetail, BillTaskItem } from '#/api/bill-of-lading';

import { computed, ref } from 'vue';

import {
  Button,
  Drawer,
  Empty,
  Input,
  Modal,
  Spin,
  TabPane,
  Tabs,
  message,
} from 'ant-design-vue';

import { auditBills, getBillTask } from '#/api/bill-of-lading';
import { canAudit } from '#/views/bill-of-lading/rules';

import ReviewSheet from './review-sheet.vue';

const emit = defineEmits<{ success: [] }>();

const visible = ref(false);
const loading = ref(false);
const saving = ref(false);
const detail = ref<BillTaskDetail>();
const selectedKeys = ref<string[]>([]);
const confirmVisible = ref(false);
const success = ref(true);
const remark = ref('');

const states = ['审核中', '全部驳回', '全部通过', '部分通过'];
const taskTones = ['wait', 'reject', 'pass', 'partial'];
const moneyFields = new Set([
  'unReceivedAmount',
  'totalReceivable',
  'totalReceived',
  'totalUnReceived',
]);
const countFields = new Set([
  'historyOverdueDays',
  'overdueDays',
  'promiseOverdueDays',
]);

const selected = computed(
  () =>
    detail.value?.billOfLadingTasks.filter((item) =>
      selectedKeys.value.includes(item.billOfLading.id),
    ) ?? [],
);
const allowed = (pass: boolean) =>
  selected.value.length > 0 &&
  selected.value.every((item) => canAudit(item, pass));
const selection = computed(() => ({
  fixed: true,
  selectedRowKeys: selectedKeys.value,
  onChange: (keys: (number | string)[]) => {
    selectedKeys.value = keys.map(String);
  },
  getCheckboxProps: (row: BillTaskItem) => ({
    disabled: saving.value || !(canAudit(row, true) || canAudit(row, false)),
  }),
}));
const taskStatusLabel = computed(() => {
  const status = detail.value?.taskStatus;
  return status == null ? '' : (states[status] ?? '');
});
const taskStatusClass = computed(() => {
  const status = detail.value?.taskStatus;
  if (status == null) return 'is-idle';
  return `is-${taskTones[status] ?? 'idle'}`;
});
const clientFields = computed(() => {
  const client = detail.value?.clientDetail;
  if (!client) return [];
  const fields: {
    amount?: boolean;
    full?: boolean;
    label: string;
    value: string;
  }[] = [
    { label: '简称', value: text(client.name) },
    { label: '全称', value: text(client.fullName) },
    { label: '电话', value: text(client.phone) },
    { label: '邮箱', value: text(client.email) },
    {
      label: '信用额度',
      value: moneyText(client.clientAllowAmount),
      amount: true,
    },
    { label: '结算币种', value: text(client.clientCurrency?.code) },
    { label: '首次合作', value: day(client.clientCoopSince, '未维护') },
    {
      label: '最近交易',
      value: dateTime(client.clientLastTxnTime, '未维护'),
    },
    { label: '年票数', value: text(client.clientYearTicketCount) },
    { label: '年 TEU', value: text(client.clientYearTeu) },
    { label: '地址', value: text(client.address), full: true },
    { label: '备注', value: text(client.remark), full: true },
  ];
  return fields;
});

function fieldKey(dataIndex: unknown) {
  if (Array.isArray(dataIndex)) {
    return String(dataIndex[dataIndex.length - 1] ?? '');
  }
  return String(dataIndex ?? '');
}

function tune(column: any) {
  const key = fieldKey(column.dataIndex);
  if (moneyFields.has(key) || countFields.has(key)) {
    return { ...column, align: 'right' };
  }
  return column;
}

const baseColumns = [
  {
    title: '主提单号',
    dataIndex: ['seaExport', 'transportOrder', 'mblNum'],
    width: 170,
  },
  { title: '分提单号', dataIndex: ['seaExportSeparate', 'blNum'], width: 150 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 108 },
  { title: '签单方式', dataIndex: ['codeIssueType', 'billType'], width: 100 },
  {
    title: '结算对象',
    dataIndex: ['settlement', 'name'],
    width: 160,
    ellipsis: true,
  },
  {
    title: '开船日期',
    dataIndex: ['seaExport', 'transportOrder', 'etd'],
    width: 110,
  },
  { title: '未收金额', dataIndex: 'unReceivedAmount', width: 128 },
  { title: '应结日期', dataIndex: 'settlementDate', width: 110 },
  { title: '承诺付款日期', dataIndex: 'promisePayDate', width: 120 },
  {
    title: '超期备注',
    dataIndex: 'overdueRemark',
    width: 180,
    ellipsis: true,
  },
];
const overdueProofColumn = {
  title: '超期证明',
  key: 'proof',
  width: 180,
};
const billColumns = [...baseColumns, overdueProofColumn].map(tune);
const applyColumns = [
  ...baseColumns.map((column) => ({
    ...column,
    dataIndex: [
      'billOfLading',
      ...(Array.isArray(column.dataIndex)
        ? column.dataIndex
        : [column.dataIndex]),
    ],
  })),
  {
    title: '是否压单',
    key: 'held',
    dataIndex: ['billOfLading', 'isHeldUp'],
    width: 88,
  },
  {
    title: '我的审核状态',
    key: 'mine',
    dataIndex: 'myTaskStatus',
    width: 128,
  },
  { title: '审核人', dataIndex: 'auditUserName', width: 100 },
  { title: '审核意见', dataIndex: 'remark', width: 160, ellipsis: true },
  overdueProofColumn,
].map(tune);
const overdueColumns = [
  {
    title: '主提单号',
    dataIndex: ['seaExport', 'transportOrder', 'mblNum'],
    width: 160,
  },
  { title: '分提单号', key: 'blNums', dataIndex: 'blNums', width: 150 },
  ...[
    ['settlementDate', '应结日期'],
    ['historyOverdueDays', '历史超期天数'],
    ['overdueDays', '当前超期天数'],
    ['promiseOverdueDays', '承诺超期天数'],
    ['unReceivedAmount', '未结金额'],
    ['promisePayDate', '承诺付款日期'],
    ['finalSettlementTime', '实际结算日期'],
    ['overdueRemark', '超期备注'],
  ].map(([dataIndex, title]) => ({
    dataIndex,
    title,
    width: dataIndex === 'overdueRemark' ? 180 : 124,
    ellipsis: dataIndex === 'overdueRemark',
  })),
  { title: '证明文件', key: 'proof', width: 160 },
].map(tune);
const arrearsColumns = [
  { title: '主提单号', dataIndex: ['transportOrder', 'mblNum'], width: 170 },
  {
    title: '结算对象',
    dataIndex: ['settlement', 'name'],
    width: 160,
    ellipsis: true,
  },
  {
    title: '超期天数',
    key: 'arrearsDays',
    dataIndex: 'overdueDays',
    width: 120,
  },
  ...[
    ['localCurrencyCode', '本位币'],
    ['totalReceivable', '应收金额'],
    ['totalReceived', '已收金额'],
    ['totalUnReceived', '未收金额'],
  ].map(([dataIndex, title]) => ({ dataIndex, title, width: 120 })),
].map(tune);

let request = 0;

function taskRowKey(row: BillTaskItem) {
  return row.billOfLading.id;
}

function arrearsRowKey(row: {
  changeOrderId?: string;
  transportOrderId: string;
}) {
  return `${row.transportOrderId}-${row.changeOrderId ?? ''}`;
}

function blank(value?: null | number | string) {
  return value === undefined || value === null || value === '';
}

function text(value?: null | number | string, fallback = '未维护') {
  return blank(value) ? fallback : String(value);
}

function dateTime(value?: null | string, fallback = '—') {
  if (!value) return fallback;
  const text = value.replace('T', ' ').slice(0, 19);
  return text.endsWith(' 00:00:00') ? text.slice(0, 10) : text;
}

function day(value?: null | string, fallback = '—') {
  if (!value) return fallback;
  return String(value).replace('T', ' ').slice(0, 10);
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

function moneyText(value?: null | number) {
  if (value == null || Number.isNaN(Number(value))) return '未维护';
  return formatMoney(value);
}

async function open(id: string) {
  const token = ++request;
  visible.value = true;
  loading.value = true;
  detail.value = undefined;
  selectedKeys.value = [];
  try {
    const value = await getBillTask(id);
    if (token === request) detail.value = value;
  } finally {
    if (token === request) loading.value = false;
  }
}

function confirm(pass: boolean) {
  if (!allowed(pass)) {
    message.warning('所选提单中包含当前不能执行此审核操作的记录');
    return;
  }
  success.value = pass;
  remark.value = '';
  confirmVisible.value = true;
}

async function submit() {
  if (saving.value || !allowed(success.value) || !detail.value) return;
  const taskId = detail.value.id;
  saving.value = true;
  try {
    await auditBills(
      selected.value.map((item) => item.billOfLading.id),
      success.value,
      remark.value.trim(),
    );
    message.success('审核成功');
    confirmVisible.value = false;
    emit('success');
    await open(taskId);
  } finally {
    saving.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    width="92vw"
    :closable="!saving"
    :mask-closable="!saving"
    :body-style="{ padding: '16px', background: '#f5f6f8' }"
    :header-style="{ borderBottom: '1px solid #eef0f3' }"
  >
    <template #title>
      <div class="drawer-title">
        <span>提单签出审核详情</span>
        <template v-if="detail?.settlement?.name">
          <span class="drawer-title__dot">·</span>
          <span class="drawer-title__name" :title="detail.settlement.name">{{
            detail.settlement.name
          }}</span>
        </template>
        <span v-if="taskStatusLabel" class="pill" :class="taskStatusClass">{{
          taskStatusLabel
        }}</span>
      </div>
    </template>
    <Spin :spinning="loading">
      <div v-if="detail" class="review">
        <section class="summary">
          <div class="summary__item">
            <span>申请人</span>
            <strong>{{ detail.creatorUserName || '—' }}</strong>
          </div>
          <div class="summary__item">
            <span>申请时间</span>
            <strong>{{ dateTime(detail.creationTime) }}</strong>
          </div>
          <div class="summary__item">
            <span>提单 / 未完成</span>
            <strong>
              {{ detail.itemCount }}
              <em>/</em>
              <b :class="{ 'is-hot': detail.pendingItemCount > 0 }">{{
                detail.pendingItemCount
              }}</b>
            </strong>
          </div>
          <div class="summary__item">
            <span>未收金额（本位币）</span>
            <strong
              class="amount"
              :class="{
                'is-hot': (detail.totalUnReceivedAmount ?? 0) > 0,
                'is-empty': detail.totalUnReceivedAmount == null,
              }"
              >{{ formatMoney(detail.totalUnReceivedAmount) }}</strong
            >
          </div>
        </section>
        <section class="panel">
          <Tabs class="review-tabs">
            <TabPane key="application">
              <template #tab>
                申请放单
                <span class="tab-count">{{
                  detail.billOfLadingTasks.length
                }}</span>
              </template>
              <div class="toolbar">
                <div class="toolbar__actions">
                  <Button
                    v-access:code="'Admin.BillOfLading.Audit'"
                    type="primary"
                    :disabled="!allowed(true) || saving"
                    @click="confirm(true)"
                    >通过所选提单</Button
                  >
                  <Button
                    v-access:code="'Admin.BillOfLading.Audit'"
                    danger
                    :disabled="!allowed(false) || saving"
                    @click="confirm(false)"
                    >驳回 / 通过后驳回</Button
                  >
                </div>
                <span
                  class="toolbar__count"
                  :class="{ 'is-on': selected.length > 0 }"
                  >已选 <strong>{{ selected.length }}</strong> 张</span
                >
              </div>
              <ReviewSheet
                :columns="applyColumns"
                :data-source="detail.billOfLadingTasks"
                :row-key="taskRowKey"
                :row-selection="selection"
                :scroll-x="2100"
              />
            </TabPane>
            <TabPane key="held">
              <template #tab>
                压单业务
                <span class="tab-count">{{
                  detail.heldUpBillOfLadings.length
                }}</span>
              </template>
              <ReviewSheet
                :columns="billColumns"
                :data-source="detail.heldUpBillOfLadings"
                row-key="id"
                :scroll-x="1560"
              />
            </TabPane>
            <TabPane key="following">
              <template #tab>
                后续新单
                <span class="tab-count">{{
                  detail.followingBillOfLadings.length
                }}</span>
              </template>
              <ReviewSheet
                :columns="billColumns"
                :data-source="detail.followingBillOfLadings"
                row-key="id"
                :scroll-x="1560"
              />
            </TabPane>
            <TabPane key="client" tab="客户信息">
              <div v-if="detail.clientDetail" class="client">
                <div
                  v-for="field in clientFields"
                  :key="field.label"
                  class="field"
                  :class="{ 'field--full': field.full }"
                >
                  <span class="field__label">{{ field.label }}</span>
                  <span
                    class="field__value"
                    :class="{
                      'is-empty': field.value === '未维护',
                      amount: field.amount && field.value !== '未维护',
                    }"
                    >{{ field.value }}</span
                  >
                </div>
              </div>
              <div v-else class="empty-box">
                <Empty
                  :image="Empty.PRESENTED_IMAGE_SIMPLE"
                  description="客户详情不可查看或暂无数据"
                />
              </div>
            </TabPane>
            <TabPane key="arrears">
              <template #tab>
                应收欠费
                <span v-if="detail.arrearsReports" class="tab-count">{{
                  detail.arrearsReports.length
                }}</span>
              </template>
              <ReviewSheet
                v-if="detail.arrearsReports"
                money-total
                :columns="arrearsColumns"
                :data-source="detail.arrearsReports"
                :row-key="arrearsRowKey"
                :scroll-x="1000"
              />
              <div v-else class="empty-box">
                <Empty
                  :image="Empty.PRESENTED_IMAGE_SIMPLE"
                  description="无欠费报表查看权限或暂无数据"
                />
              </div>
            </TabPane>
            <TabPane key="overdues">
              <template #tab>
                客户历史异常
                <span class="tab-count">{{
                  detail.clientOverdues.length
                }}</span>
              </template>
              <p class="hint">
                按本批结算对象汇总历史超期、当前超期、历史承诺超期及超承诺时间未结，金额为本位币。
              </p>
              <ReviewSheet
                :columns="overdueColumns"
                :data-source="detail.clientOverdues"
                row-key="transportOrderId"
                :scroll-x="1650"
              />
            </TabPane>
          </Tabs>
        </section>
      </div>
      <div v-else class="review-placeholder" />
    </Spin>
  </Drawer>
  <Modal
    v-model:open="confirmVisible"
    :title="success ? '确认通过所选提单' : '确认驳回所选提单'"
    :confirm-loading="saving"
    :mask-closable="false"
    :closable="!saving"
    :ok-text="success ? '确认通过' : '确认驳回'"
    :ok-button-props="{ danger: !success, disabled: saving }"
    :cancel-button-props="{ disabled: saving }"
    @ok="submit"
  >
    <p class="confirm-copy">
      本次处理 {{ selected.length }} 张提单，其余提单保持原状。
    </p>
    <Input.TextArea
      v-model:value="remark"
      placeholder="审核意见（选填）"
      :maxlength="1024"
      :rows="4"
      :disabled="saving"
    />
  </Modal>
</template>

<style scoped>
.drawer-title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.drawer-title__dot {
  font-weight: 400;
  color: #c0c4cc;
}

.drawer-title__name {
  max-width: min(520px, 46vw);
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  white-space: nowrap;
}

.review {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-placeholder {
  min-height: 320px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 10px;
}

.summary__item {
  min-width: 0;
  padding: 14px 18px;
}

.summary__item + .summary__item {
  border-left: 1px solid #f0f1f3;
}

.summary__item > span {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #8c95a3;
}

.summary__item strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: #1f2329;
  white-space: nowrap;
}

.summary__item em {
  margin: 0 6px;
  font-style: normal;
  font-weight: 400;
  color: #c0c4cc;
}

.summary__item b {
  font-weight: 600;
}

.summary__item .is-hot {
  color: #d48806;
}

.summary__item .amount.is-hot {
  color: #cf1322;
}

.summary__item .is-empty {
  font-weight: 500;
  color: #c0c4cc;
}

.amount {
  font-family:
    'Roboto Mono', 'DIN Alternate', ui-monospace, SFMono-Regular, Menlo,
    Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.panel {
  min-width: 0;
  padding: 4px 16px 16px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 10px;
}

.review-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 12px;
}

.tab-count {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: #8c95a3;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: #f7f8fa;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toolbar__count {
  flex: none;
  font-size: 12px;
  color: #8c95a3;
}

.toolbar__count strong {
  margin: 0 2px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: #1f2329;
}

.toolbar__count.is-on strong {
  color: hsl(var(--primary));
}

.hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 20px;
  color: #8c95a3;
}

.client {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px 28px;
  padding: 4px 4px 8px;
}

.field {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  column-gap: 10px;
  align-items: baseline;
}

.field--full {
  grid-column: 1 / -1;
}

.field__label {
  font-size: 12px;
  line-height: 22px;
  color: #8c95a3;
}

.field__value {
  font-size: 13px;
  font-weight: 500;
  line-height: 22px;
  color: #1f2329;
  word-break: break-all;
}

.field__value.is-empty {
  font-weight: 400;
  color: #b4b9c2;
}

.empty-box {
  padding: 24px 0 32px;
}

.pill {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px;
  white-space: nowrap;
  border-radius: 999px;
}

.pill.is-wait {
  color: #ad6800;
  background: #fff7e6;
}

.pill.is-reject {
  color: #cf1322;
  background: #fff1f0;
}

.pill.is-pass {
  color: #389e0d;
  background: #f6ffed;
}

.pill.is-partial {
  color: #0958d9;
  background: #e6f4ff;
}

.pill.is-idle {
  color: #5b6472;
  background: #f4f5f7;
}

.confirm-copy {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 22px;
  color: #3d4450;
}

@media (max-width: 960px) {
  .summary {
    grid-template-columns: 1fr 1fr;
  }

  .summary__item:nth-child(odd) {
    border-left: 0;
  }

  .summary__item:nth-child(n + 3) {
    border-top: 1px solid #f0f1f3;
  }

  .client {
    grid-template-columns: 1fr;
  }
}
</style>
