<script setup lang="ts">
import type { BillTask } from '#/api/bill-of-lading';

import { computed } from 'vue';

import { Popover, Tag } from 'ant-design-vue';

const props = defineProps<{ row: BillTask }>();

const batchOptions = [
  { value: 0, label: '审核中', color: 'orange' },
  { value: 1, label: '全部驳回', color: 'red' },
  { value: 2, label: '全部通过', color: 'green' },
  { value: 3, label: '部分通过', color: 'blue' },
];
const mineOptions = [
  { value: 0, label: '待我审核' },
  { value: 1, label: '我已驳回' },
  { value: 2, label: '我已通过' },
];
const passMethods = ['直接通过', '或签', '会签'];
const personStates = ['待审核', '已驳回', '已通过'];
const personTones = ['is-wait', 'is-reject', 'is-pass'];

const batch = computed(() =>
  batchOptions.find((item) => item.value === props.row.taskStatus),
);
const mineLabel = computed(() => {
  const status = props.row.myTaskStatus;
  if (status == null) return '未到当前步骤';
  return mineOptions.find((item) => item.value === status)?.label ?? '-';
});
const levels = computed(() => props.row.workFlowInstance?.levelGroup ?? []);

function dateTime(value?: null | string) {
  if (!value) return '';
  return value.replace('T', ' ').slice(0, 19);
}

function levelTone(items?: { taskStatus?: null | number }[]) {
  const list = items ?? [];
  if (list.some((item) => item.taskStatus === 1)) return 'is-reject';
  if (list.length > 0 && list.every((item) => item.taskStatus === 2)) {
    return 'is-pass';
  }
  if (list.some((item) => item.taskStatus === 0)) return 'is-wait';
  return 'is-idle';
}
</script>

<template>
  <Popover trigger="hover" placement="rightTop" :mouse-enter-delay="0.2">
    <template #content>
      <div class="status-pop">
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
                      item.taskStatus == null
                        ? 'is-idle'
                        : personTones[item.taskStatus]
                    "
                    >{{
                      item.taskStatus == null
                        ? '未到当前步骤'
                        : personStates[item.taskStatus]
                    }}</em
                  >
                </div>
                <time v-if="item.auditTime">{{
                  dateTime(item.auditTime)
                }}</time>
                <p v-if="item.comment">{{ item.comment }}</p>
              </div>
            </div>
          </li>
        </ol>
        <p v-else class="status-pop__empty">暂无审批流程</p>
      </div>
    </template>
    <Tag :color="batch?.color" class="!mr-0">
      {{ batch?.label ?? '-' }}
    </Tag>
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
