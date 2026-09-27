<script setup lang="ts">
import type { BillTask } from '#/api/bill-of-lading';

import { computed } from 'vue';

import { Popover } from 'ant-design-vue';

const props = defineProps<{
  /** 这张提单的审核人。有提单结论时，用来对齐主流程里的同一个人 */
  auditUserName?: null | string;
  /** 这张提单自己的审核时间 */
  auditTime?: null | string;
  /** 这张提单的审核结论：1 驳回，2 通过。有值时覆盖主流程上的整批状态 */
  billTaskStatus?: null | number;
  myTaskStatus?: null | number;
  /** 这张提单自己的审核意见 */
  remark?: null | string;
  workFlowInstance?: BillTask['workFlowInstance'];
}>();

const mineOptions = [
  { value: 0, label: '待我审核' },
  { value: 1, label: '我已驳回' },
  { value: 2, label: '我已通过' },
];
const passMethods = ['直接通过', '或签', '会签'];
const personStates = ['待审核', '已驳回', '已通过'];
const personTones = ['is-wait', 'is-reject', 'is-pass'];

const mineLabel = computed(() => {
  const status = props.myTaskStatus;
  if (status == null) return '未到当前步骤';
  return mineOptions.find((item) => item.value === status)?.label ?? '-';
});
const levels = computed(() => props.workFlowInstance?.levelGroup ?? []);
const billSettled = computed(
  () => props.billTaskStatus === 1 || props.billTaskStatus === 2,
);
const people = computed(() =>
  levels.value.flatMap((level) => level.itemList ?? []),
);

function usesBillResult(userName?: null | string) {
  if (!billSettled.value) return false;
  if (people.value.length === 1) return true;
  const name = props.auditUserName?.trim();
  return !!name && name === (userName ?? '').trim();
}

function shownStatus(item: {
  taskStatus?: null | number;
  userNickName?: null | string;
}) {
  if (usesBillResult(item.userNickName)) return props.billTaskStatus;
  return item.taskStatus;
}

function shownTime(item: {
  auditTime?: null | string;
  userNickName?: null | string;
}) {
  if (usesBillResult(item.userNickName)) return props.auditTime;
  return item.auditTime;
}

function shownComment(item: {
  comment?: null | string;
  userNickName?: null | string;
}) {
  if (usesBillResult(item.userNickName)) return props.remark;
  return item.comment;
}

function dateTime(value?: null | string) {
  if (!value) return '';
  return value.replace('T', ' ').slice(0, 19);
}

const billRejectReason = computed(() =>
  props.billTaskStatus === 1 ? props.remark?.trim() || '未填写' : '',
);

function personComment(item: {
  comment?: null | string;
  userNickName?: null | string;
}) {
  const comment = shownComment(item)?.trim();
  if (!comment || shownStatus(item) === 1) return '';
  return comment;
}

function personReject(item: {
  comment?: null | string;
  userNickName?: null | string;
}) {
  if (shownStatus(item) !== 1) return '';
  const comment = shownComment(item)?.trim() ?? '';
  if (!comment) return '';
  if (props.billTaskStatus === 1 && comment === (props.remark?.trim() ?? '')) {
    return '';
  }
  return comment;
}

function popupContainer() {
  return document.body;
}

function levelTone(
  items?: { taskStatus?: null | number; userNickName?: null | string }[],
) {
  const list = (items ?? []).map((item) => ({
    taskStatus: shownStatus(item),
  }));
  if (list.some((item) => item.taskStatus === 1)) return 'is-reject';
  if (list.length > 0 && list.every((item) => item.taskStatus === 2)) {
    return 'is-pass';
  }
  if (list.some((item) => item.taskStatus === 0)) return 'is-wait';
  return 'is-idle';
}
</script>

<template>
  <Popover
    trigger="hover"
    placement="rightTop"
    :mouse-enter-delay="0.2"
    :get-popup-container="popupContainer"
    :overlay-style="{ zIndex: 2100 }"
  >
    <template #content>
      <div class="status-pop">
        <div v-if="billRejectReason" class="reject-reason">
          <div>驳回原因：</div>
          <div>{{ billRejectReason }}</div>
        </div>
        <div class="status-pop__mine">我的审核状态：{{ mineLabel }}</div>
        <div class="status-pop__title">审批流程</div>
        <ol v-if="levels.length" class="timeline">
          <li v-for="level in levels" :key="level.level" class="timeline-item">
            <i class="timeline-item__dot" :class="levelTone(level.itemList)" />
            <div class="node">
              <div class="node__head">
                <strong>第 {{ level.level }} 级</strong>
                <span v-if="passMethods[level.passMethod]" class="method">{{
                  passMethods[level.passMethod]
                }}</span>
              </div>
              <div
                v-for="item in level.itemList ?? []"
                :key="item.id"
                class="person"
              >
                <div class="person__line">
                  <span>{{ item.userNickName || '未指定' }}</span>
                  <em
                    class="pill"
                    :class="
                      shownStatus(item) == null
                        ? 'is-idle'
                        : personTones[shownStatus(item)!]
                    "
                    >{{
                      shownStatus(item) == null
                        ? '未到当前步骤'
                        : personStates[shownStatus(item)!]
                    }}</em
                  >
                </div>
                <time v-if="shownTime(item)">{{
                  dateTime(shownTime(item))
                }}</time>
                <div v-if="personReject(item)" class="reject-reason">
                  <div>驳回原因：</div>
                  <div>{{ personReject(item) }}</div>
                </div>
                <p v-else-if="personComment(item)">{{ personComment(item) }}</p>
              </div>
            </div>
          </li>
        </ol>
        <p v-else class="status-pop__empty">暂无审批流程</p>
      </div>
    </template>
    <slot></slot>
  </Popover>
</template>

<style scoped>
.status-pop {
  width: 280px;
  max-height: 384px;
  overflow-y: auto;
}

.status-pop__mine {
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 20px;
  color: #3d4450;
}

.reject-reason {
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 18px;
  color: #cf1322;
  word-break: break-all;
  white-space: pre-wrap;
}

.person .reject-reason {
  margin-top: 4px;
  margin-bottom: 0;
}

.status-pop__title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
}

.status-pop__empty {
  margin: 0;
  font-size: 12px;
  line-height: 20px;
  color: #8c95a3;
}

.timeline {
  position: relative;
  padding: 0 0 4px 14px;
  margin: 0;
  list-style: none;
}

.timeline::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 3px;
  width: 1px;
  content: '';
  background: #eceef1;
}

.timeline-item {
  position: relative;
  padding-bottom: 12px;
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
  background: #c5cad3;
  border-radius: 50%;
  box-shadow: 0 0 0 3px #fff;
}

.timeline-item__dot.is-wait {
  background: #d48806;
}

.timeline-item__dot.is-reject {
  background: #cf1322;
}

.timeline-item__dot.is-pass {
  background: #389e0d;
}

.node__head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.node__head strong {
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
}

.method {
  padding: 0 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: #5b6472;
  background: #f2f4f7;
  border-radius: 4px;
}

.person + .person {
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid #f2f3f5;
}

.person__line {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.person__line > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #1f2329;
  white-space: nowrap;
}

.person time {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #8c95a3;
}

.person p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #3d4450;
  word-break: break-all;
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

.pill.is-idle {
  color: #5b6472;
  background: #f4f5f7;
}
</style>
