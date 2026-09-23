<script setup lang="ts">
import type {
  BillAction,
  BillHistory,
  BillOfLading,
} from '#/api/bill-of-lading';
import { computed, ref } from 'vue';
import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';
import { Button, Modal, Spin, Tag, message } from 'ant-design-vue';
import { getBill, getBillHistory } from '#/api/bill-of-lading';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import {
  actionLabels,
  actionPermission,
  billNumber,
  billStatusOptions,
  canAct,
  signOutOptions,
} from './rules';

const emit = defineEmits<{
  action: [payload: { action: BillAction; bill: BillOfLading }];
}>();

const historyLabels = [
  '签入',
  '取消签入',
  '签出',
  '取消签出',
  '换签',
  '取消换签',
  '扣单',
  '取消扣单',
];
const actionDot = [
  '#1677ff',
  '#8c95a3',
  '#389e0d',
  '#8c95a3',
  '#722ed1',
  '#8c95a3',
  '#cf1322',
  '#8c95a3',
];
const statusTone = [
  'pending',
  'signed',
  'rejected',
  'auditing',
  'ready',
  'done',
  'held',
];
const dangerActions = new Set<BillAction>(['Deduct']);
const shortcutOrder: BillAction[] = [
  'SignIn',
  'SignOut',
  'Submit',
  'UnSubmit',
  'Swap',
  'Deduct',
  'CancelDeduct',
  'CancelSignIn',
  'CancelSignOut',
  'CancelSwap',
];

const { hasAccessByCodes } = useAccess();
const visible = ref(false);
const loading = ref(false);
const bill = ref<BillOfLading>();
const history = ref<BillHistory[]>([]);
let request = 0;

const number = computed(() => (bill.value ? billNumber(bill.value) : ''));
const canCopy = computed(() => !!number.value && number.value !== '未填提单号');
const status = computed(() =>
  bill.value ? billStatusOptions[bill.value.status] : undefined,
);
const issueType = computed(
  () =>
    bill.value?.codeIssueType?.billType ||
    (bill.value?.isOriginal ? '正本' : ''),
);
const order = computed(() => bill.value?.seaExport.transportOrder);
const voyage = computed(() => {
  const vessel = bill.value?.seaExport.vessel?.trim();
  const voyno = bill.value?.seaExport.innerVoyno?.trim();
  return [vessel, voyno].filter(Boolean).join(' / ');
});
const staff = computed(() =>
  (order.value?.orderUsers ?? [])
    .filter((user) => (user.userAttribute & 17) !== 0)
    .map(
      (user) =>
        `${user.userNickName || '未维护'}（${(user.userAttribute & 16) !== 0 ? '销售' : '操作'}）`,
    )
    .join('、'),
);
const polPort = computed(() => port('pol'));
const podPort = computed(() => port('pod'));
const shortcuts = computed(() => {
  if (!bill.value) return [];
  return shortcutOrder.filter(
    (action) =>
      canAct(bill.value!, action) &&
      hasAccessByCodes([actionPermission(action)]),
  );
});
const primaryAction = computed(
  () =>
    shortcuts.value.find(
      (action) =>
        !dangerActions.has(action) &&
        ['SignIn', 'SignOut', 'Submit', 'UnSubmit', 'CancelDeduct'].includes(
          action,
        ),
    ) ?? shortcuts.value.find((action) => !dangerActions.has(action)),
);
const mainShortcuts = computed(() =>
  shortcuts.value.filter((action) => !dangerActions.has(action)),
);
const riskShortcuts = computed(() =>
  shortcuts.value.filter((action) => dangerActions.has(action)),
);

async function open(row: BillOfLading) {
  const token = ++request;
  visible.value = true;
  loading.value = true;
  bill.value = undefined;
  history.value = [];
  try {
    const [detail, items] = await Promise.all([
      getBill(row.id),
      getBillHistory(row.id),
    ]);
    if (token !== request) return;
    bill.value = detail;
    history.value = items;
  } finally {
    if (token === request) loading.value = false;
  }
}

function port(side: 'pol' | 'pod') {
  const item = bill.value?.seaExport[side];
  const name = item?.portName || item?.cnName || '';
  const code = item?.ediCode?.trim();
  return {
    name,
    code: code && code !== name ? code : '',
  };
}

function empty(value?: string | number | null) {
  return value === undefined || value === null || value === '';
}

function text(value?: string | number | null, fallback = '未维护') {
  return empty(value) ? fallback : String(value);
}

function day(value?: string | null, fallback = '未维护') {
  return value?.slice(0, 10) || fallback;
}

function dateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 19) : '';
}

function money(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value)))
    return '';
  return `¥ ${Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fileName(file: {
  friendlyFileName?: null | string;
  fileName?: null | string;
}) {
  return file.friendlyFileName || file.fileName || '查看附件';
}

function actionName(type?: number) {
  return type == null ? '操作' : (historyLabels[type] ?? '操作');
}

function statusName(value?: number) {
  return value == null
    ? '未记录'
    : (billStatusOptions[value]?.label ?? '未记录');
}

function shortcutLabel(action: BillAction) {
  if (action === 'SignIn') return '去签入';
  if (action === 'SignOut') return '去签出';
  return actionLabels[action];
}

async function copyNumber() {
  if (!canCopy.value) return;
  try {
    await navigator.clipboard.writeText(number.value);
    message.success('已复制提单号');
  } catch {
    message.warning('复制失败，请手动复制');
  }
}

function run(action: BillAction) {
  if (!bill.value) return;
  visible.value = false;
  emit('action', { action, bill: bill.value });
}

defineExpose({ open });
</script>
<template>
  <Modal
    v-model:open="visible"
    :width="1080"
    :footer="shortcuts.length ? undefined : null"
    destroy-on-close
    centered
    class="bill-detail-modal"
  >
    <template #title>
      <div class="modal-title">
        <span>提单详情</span>
        <template v-if="number">
          <span class="modal-title__dot">·</span>
          <span class="modal-title__num">{{ number }}</span>
          <button
            v-if="canCopy"
            type="button"
            class="copy-btn"
            title="复制提单号"
            @click="copyNumber"
          >
            <IconifyIcon icon="ant-design:copy-outlined" />
          </button>
        </template>
        <div v-if="bill" class="modal-title__tags">
          <Tag class="tag tag-kind">{{
            bill.isSeparate ? '分单' : '主单'
          }}</Tag>
          <Tag class="tag tag-issue">{{ issueType || '签单方式未维护' }}</Tag>
          <Tag
            class="tag tag-status"
            :class="`is-${statusTone[bill.status] || 'pending'}`"
            >{{ status?.label }}</Tag
          >
          <Tag v-if="bill.isOverdue" class="tag tag-alert">提交超期</Tag>
        </div>
      </div>
    </template>
    <Spin :spinning="loading">
      <div v-if="bill" class="layout">
        <section class="main">
          <div class="group">
            <h4 class="group__title"><i class="group__bar" />航程 / 物流</h4>
            <div class="fields">
              <div class="field field--full">
                <span class="field__label">港口流向</span>
                <span class="field__value route">
                  <span :class="{ 'is-empty': !polPort.name }">
                    {{ text(polPort.name) }}
                    <small v-if="polPort.code">{{ polPort.code }}</small>
                  </span>
                  <span class="route__arrow">➔</span>
                  <span :class="{ 'is-empty': !podPort.name }">
                    {{ text(podPort.name) }}
                    <small v-if="podPort.code">{{ podPort.code }}</small>
                  </span>
                </span>
              </div>
              <div class="field">
                <span class="field__label">船公司</span>
                <span
                  class="field__value"
                  :class="{
                    'is-empty': empty(
                      bill.seaExport.carrier?.cnShortName ||
                        bill.seaExport.carrier?.cnName,
                    ),
                  }"
                  >{{
                    text(
                      bill.seaExport.carrier?.cnShortName ||
                        bill.seaExport.carrier?.cnName,
                    )
                  }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">船名 / 航次</span>
                <span class="field__value" :class="{ 'is-empty': !voyage }">{{
                  voyage || '未排载'
                }}</span>
              </div>
              <div class="field">
                <span class="field__label">开船日期</span>
                <span
                  class="field__value"
                  :class="{ 'is-empty': !order?.etd }"
                  >{{ day(order?.etd) }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">箱型箱量</span>
                <span
                  class="field__value"
                  :class="{
                    'is-empty': empty(
                      bill.isSeparate
                        ? bill.seaExportSeparate?.totalCtn
                        : order?.totalCtn,
                    ),
                  }"
                  >{{
                    text(
                      bill.isSeparate
                        ? bill.seaExportSeparate?.totalCtn
                        : order?.totalCtn,
                    )
                  }}</span
                >
              </div>
            </div>
          </div>
          <div class="group">
            <h4 class="group__title"><i class="group__bar" />业务与负责人</h4>
            <div class="fields">
              <div class="field">
                <span class="field__label">委托编号</span>
                <span
                  class="field__value"
                  :class="{ 'is-empty': empty(order?.commissionNum) }"
                  >{{ text(order?.commissionNum) }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">委托单位</span>
                <span
                  class="field__value"
                  :class="{ 'is-empty': empty(order?.client?.name) }"
                  >{{ text(order?.client?.name) }}</span
                >
              </div>
              <div class="field field--full">
                <span class="field__label">销售 / 操作</span>
                <span class="field__value" :class="{ 'is-empty': !staff }">{{
                  staff || '未维护'
                }}</span>
              </div>
            </div>
          </div>
          <div class="group">
            <h4 class="group__title"><i class="group__bar" />结算与风控</h4>
            <div class="fields">
              <div class="field">
                <span class="field__label">结算对象</span>
                <span
                  class="field__value"
                  :class="{ 'is-empty': empty(bill.settlement?.name) }"
                  >{{ text(bill.settlement?.name) }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">未收金额</span>
                <span
                  class="field__value amount"
                  :class="{ 'is-empty': !money(bill.unReceivedAmount) }"
                  >{{ money(bill.unReceivedAmount) || '未维护' }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">应结日期</span>
                <span
                  class="field__value"
                  :class="{
                    'is-empty': empty(
                      bill.settlementDate || order?.settlementDate,
                    ),
                  }"
                  >{{ day(bill.settlementDate || order?.settlementDate) }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">超期天数</span>
                <span
                  class="field__value"
                  :class="{
                    'is-empty': !bill.overdueDays,
                    overdue: (bill.overdueDays ?? 0) > 0,
                  }"
                  >{{
                    bill.overdueDays ? `${bill.overdueDays} 天` : '未超期'
                  }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">承诺付款</span>
                <span
                  class="field__value"
                  :class="{ 'is-empty': !bill.promisePayDate }"
                  >{{ day(bill.promisePayDate) }}</span
                >
              </div>
            </div>
            <div
              v-if="bill.overdueRemark || bill.overdueAttachments?.length"
              class="note"
            >
              <span class="field__label">超期证明</span>
              <div>
                <p v-if="bill.overdueRemark" class="note__text">
                  {{ bill.overdueRemark }}
                </p>
                <div v-if="bill.overdueAttachments?.length" class="file-row">
                  <Button
                    v-for="file in bill.overdueAttachments"
                    :key="String(file.attachmentId)"
                    type="link"
                    class="file-link"
                    @click="openAttachmentViewer(file)"
                    >{{ fileName(file) }}</Button
                  >
                </div>
              </div>
            </div>
          </div>
          <div class="group">
            <h4 class="group__title"><i class="group__bar" />签单节点</h4>
            <div class="fields">
              <div class="field">
                <span class="field__label">签单方式</span>
                <span
                  class="field__value"
                  :class="{ 'is-empty': !issueType }"
                  >{{ issueType || '未维护' }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">签入日期</span>
                <span
                  class="field__value"
                  :class="{ 'is-empty': !bill.signIn?.actionDate }"
                  >{{ day(bill.signIn?.actionDate) }}</span
                >
              </div>
              <div class="field">
                <span class="field__label">签出日期</span>
                <span
                  class="field__value"
                  :class="{ 'is-empty': !bill.signOut?.actionDate }"
                  >{{ day(bill.signOut?.actionDate) }}</span
                >
              </div>
            </div>
          </div>
        </section>
        <aside class="aside">
          <header class="aside__head">
            操作历史
            <span>{{ history.length }} 条</span>
          </header>
          <ol v-if="history.length" class="timeline">
            <li v-for="item in history" :key="item.id" class="timeline-item">
              <i
                class="timeline-item__dot"
                :style="{
                  background: actionDot[item.actionType ?? -1] || '#8c95a3',
                }"
              />
              <div class="node">
                <div class="node__head">
                  <strong>{{ actionName(item.actionType) }}</strong>
                  <span>{{ item.creatorUserName || '系统' }}</span>
                </div>
                <time class="node__time">{{
                  dateTime(item.creationTime)
                }}</time>
                <p class="node__flow">
                  {{ statusName(item.beforeStatus) }}
                  <span>→</span>
                  {{ statusName(item.afterStatus) }}
                </p>
                <dl
                  v-if="
                    item.actionDate ||
                    item.codeIssueType ||
                    item.signOutType != null
                  "
                  class="node__facts"
                >
                  <div v-if="item.actionDate">
                    <dt>业务日期</dt>
                    <dd>{{ day(item.actionDate) }}</dd>
                  </div>
                  <div v-if="item.codeIssueType">
                    <dt>签单方式</dt>
                    <dd>{{ item.codeIssueType.billType }}</dd>
                  </div>
                  <div v-if="item.signOutType != null">
                    <dt>签出方式</dt>
                    <dd>{{ signOutOptions[item.signOutType]?.label }}</dd>
                  </div>
                </dl>
                <p v-if="item.remark" class="node__remark">{{ item.remark }}</p>
                <div v-if="item.attachments?.length" class="file-row">
                  <Button
                    v-for="file in item.attachments"
                    :key="String(file.attachmentId)"
                    type="link"
                    class="file-link"
                    @click="openAttachmentViewer(file)"
                    >{{ fileName(file) }}</Button
                  >
                </div>
              </div>
            </li>
          </ol>
          <div v-else class="timeline-empty">
            <div class="timeline-empty__item">
              <span class="timeline-empty__mark">
                <IconifyIcon icon="ant-design:history-outlined" />
              </span>
              <div class="timeline-empty__copy">
                <p>暂无流转记录</p>
                <span>签入、换签、扣单、签出会按时间出现在这里</span>
              </div>
            </div>
            <div class="timeline-empty__item">
              <span class="timeline-empty__mark is-hollow" />
              <div class="timeline-empty__copy">
                <p>待发生</p>
                <span>后续节点将按时间追加</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <div v-else-if="!loading" class="empty-detail">未找到提单详情</div>
    </Spin>
    <template v-if="shortcuts.length" #footer>
      <div class="modal-footer">
        <div class="modal-footer__main">
          <Button
            v-for="action in mainShortcuts"
            :key="action"
            :type="action === primaryAction ? 'primary' : 'default'"
            @click="run(action)"
            >{{ shortcutLabel(action) }}</Button
          >
        </div>
        <div v-if="riskShortcuts.length" class="modal-footer__danger">
          <Button
            v-for="action in riskShortcuts"
            :key="action"
            danger
            @click="run(action)"
            >{{ shortcutLabel(action) }}</Button
          >
        </div>
      </div>
    </template>
  </Modal>
</template>
<style scoped>
.modal-title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-right: 12px;
  font-size: 16px;
  font-weight: 600;
}

.modal-title__dot {
  font-weight: 400;
  color: #c0c4cc;
}

.modal-title__num {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: #8c95a3;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.copy-btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--accent));
}

.modal-title__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.tag.tag-kind {
  color: #5b6472;
  background: #f2f4f7;
  border-color: #e6e8ec;
}

.tag.tag-issue {
  color: #5b6472;
  background: #fff;
  border-color: #d9dde3;
}

.tag.tag-status {
  font-weight: 600;
  color: #fff;
  border-color: transparent;
}

.tag.tag-status.is-pending {
  background: #fa8c16;
}

.tag.tag-status.is-signed {
  background: #1677ff;
}

.tag.tag-status.is-rejected {
  background: #cf1322;
}

.tag.tag-status.is-auditing {
  background: #d48806;
}

.tag.tag-status.is-ready {
  background: #13a8a8;
}

.tag.tag-status.is-done {
  background: #389e0d;
}

.tag.tag-status.is-held {
  background: #c41d7f;
}

.tag.tag-alert {
  color: #fff;
  background: #cf1322;
  border-color: transparent;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  min-height: 420px;
}

.main {
  padding-right: 24px;
  border-right: 1px solid hsl(var(--border));
}

.aside {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-left: 20px;
}

.group + .group {
  margin-top: 20px;
}

.group__title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #1f2329;
}

.group__bar {
  display: inline-block;
  width: 3px;
  height: 12px;
  background: hsl(var(--primary));
  border-radius: 2px;
}

.fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px 24px;
}

.field,
.note {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  column-gap: 10px;
  align-items: baseline;
}

.field--full {
  grid-column: 1 / -1;
}

.field__label,
.note .field__label {
  width: 84px;
  font-size: 12px;
  line-height: 22px;
  color: #8c95a3;
  text-align: left;
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

.field__value.overdue {
  font-weight: 600;
  color: #d4380d;
}

.amount:not(.is-empty) {
  font-family:
    'Roboto Mono', 'DIN Alternate', ui-monospace, SFMono-Regular, Menlo,
    Consolas, monospace;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.route {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  font-size: 14px;
  font-weight: 600;
}

.route small {
  margin-left: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #8c95a3;
}

.route__arrow {
  font-weight: 500;
  color: hsl(var(--primary));
}

.note {
  margin-top: 8px;
}

.note__text {
  margin: 0;
  font-size: 13px;
  line-height: 22px;
}

.aside__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
}

.aside__head span {
  font-size: 12px;
  font-weight: 400;
  color: #8c95a3;
}

.timeline {
  position: relative;
  flex: 1;
  padding: 0 0 0 14px;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.timeline::before {
  position: absolute;
  top: 10px;
  bottom: 8px;
  left: 3px;
  width: 1px;
  content: '';
  background: #eceef1;
}

.timeline-item {
  position: relative;
  min-height: 28px;
  padding-bottom: 16px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-item__dot {
  position: absolute;
  top: 6px;
  left: -14px;
  z-index: 1;
  width: 7px;
  height: 7px;
  background: #1677ff;
  border-radius: 50%;
  box-shadow: 0 0 0 3px #fff;
}

.node__head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}

.node__head strong {
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
}

.node__head span,
.node__time,
.node__flow,
.node__facts dt {
  font-size: 12px;
  font-weight: 400;
  color: #8c95a3;
}

.node__time,
.node__flow,
.node__facts,
.node__remark {
  margin: 2px 0 0;
}

.node__flow span {
  margin: 0 4px;
  color: #c0c4cc;
}

.node__facts {
  display: grid;
  gap: 2px;
}

.node__facts div {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 6px;
}

.node__facts dd {
  margin: 0;
  font-size: 12px;
  color: #3d3d3d;
}

.node__remark {
  font-size: 12px;
  color: #1f2329;
}

.timeline-empty {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 0 4px;
}

.timeline-empty::before {
  position: absolute;
  top: 24px;
  bottom: 28px;
  left: 11px;
  width: 0;
  content: '';
  border-left: 1px dashed #d5dae1;
}

.timeline-empty__item {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  column-gap: 10px;
  align-items: start;
}

.timeline-empty__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #c0c4cc;
  background: #fff;
  border: 1px dashed #d5dae1;
  border-radius: 50%;
  box-shadow: 0 0 0 4px #fff;
}

.timeline-empty__mark :deep(svg) {
  font-size: 13px;
}

.timeline-empty__mark.is-hollow {
  width: 10px;
  height: 10px;
  margin: 7px;
}

.timeline-empty__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-top: 2px;
}

.timeline-empty__copy p {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: #8c95a3;
}

.timeline-empty__copy span {
  font-size: 12px;
  line-height: 18px;
  color: #b4b9c2;
}

.empty-detail {
  padding: 48px 0;
  font-size: 12px;
  color: #b4b9c2;
  text-align: center;
}

.file-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.file-link {
  height: auto;
  padding: 0;
}

.modal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
}

.modal-footer__main,
.modal-footer__danger {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-footer__danger {
  padding-left: 16px;
  margin-left: 8px;
  border-left: 1px solid hsl(var(--border));
}

@media (max-width: 767px) {
  .layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .main {
    padding-right: 0;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-right: 0;
    border-bottom: 1px solid hsl(var(--border));
  }

  .aside {
    padding-left: 0;
  }

  .fields {
    grid-template-columns: 1fr;
  }

  .modal-title__tags {
    margin-left: 0;
  }
}
</style>
<style>
.bill-detail-modal .ant-modal-body {
  max-height: min(72vh, 720px);
  padding-bottom: 20px;
  overflow: auto;
}

.bill-detail-modal .ant-modal-footer {
  padding: 12px 24px 16px;
  border-top: 1px solid #f0f0f0;
}

.bill-detail-modal .ant-modal-title {
  width: 100%;
}
</style>
