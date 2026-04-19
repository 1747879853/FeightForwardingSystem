<script lang="ts" setup>
import {
  TaskStatus,
  WorkFlowInstanceStatus,
  WorkFlowPassMethod,
} from '#/api/audit-approval/payment-review-admin';
import {
  Alert,
  Empty,
  Modal,
  Spin,
  Tag,
  Timeline,
  TimelineItem,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { computed } from 'vue';

import { useWorkflowTimeline } from './use-workflow-timeline';

const { visible, loading, instanceData, errorMsg, close } =
  useWorkflowTimeline();

const levelGroups = computed(() => {
  const groups = instanceData.value?.levelGroup;
  if (!groups || groups.length === 0) return [];
  return [...groups].sort((a, b) => a.level - b.level);
});

const instanceStatus = computed(() => instanceData.value?.status);

function getStatusColor(status: number): string {
  switch (status) {
    case TaskStatus.Passed:
      return 'green';
    case TaskStatus.Rejected:
      return 'red';
    case TaskStatus.Auditing:
      return 'blue';
    default:
      return 'default';
  }
}

function getStatusLabel(status: number): string {
  switch (status) {
    case TaskStatus.Passed:
      return '已通过';
    case TaskStatus.Rejected:
      return '已驳回';
    case TaskStatus.Auditing:
      return '待审批';
    default:
      return '未知';
  }
}

function getPassMethodLabel(method: number): string {
  switch (method) {
    case WorkFlowPassMethod.Or:
      return '或签';
    case WorkFlowPassMethod.And:
      return '会签';
    default:
      return '';
  }
}

function getTimelineColor(group: {
  passMethod: number;
  itemList?: { taskStatus: number }[];
}): string {
  const items = group.itemList ?? [];
  if (items.length === 0) return 'gray';

  const allPassed = items.every((a) => a.taskStatus === TaskStatus.Passed);
  const anyRejected = items.some((a) => a.taskStatus === TaskStatus.Rejected);

  if (allPassed) return 'green';
  if (anyRejected) return 'red';

  if (group.passMethod === WorkFlowPassMethod.Or) {
    const anyPassed = items.some((a) => a.taskStatus === TaskStatus.Passed);
    if (anyPassed) return 'green';
  }

  return 'blue';
}

function formatTime(val: string | undefined): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '';
}

function getInstanceStatusTag() {
  switch (instanceStatus.value) {
    case WorkFlowInstanceStatus.Pass:
      return { color: 'success', text: '已通过' };
    case WorkFlowInstanceStatus.Reject:
      return { color: 'error', text: '已驳回' };
    default:
      return { color: 'processing', text: '审批中' };
  }
}
</script>

<template>
  <Modal
    :open="visible"
    title="审批流程"
    :footer="null"
    :width="560"
    :destroy-on-close="true"
    @cancel="close"
  >
    <Spin :spinning="loading">
      <div v-if="errorMsg" class="py-4">
        <Alert :message="errorMsg" type="error" show-icon />
      </div>

      <div v-else-if="!loading && !instanceData" class="py-8">
        <Empty description="暂无审批流程数据" />
      </div>

      <div v-else-if="instanceData" class="workflow-timeline">
        <!-- 流程头部 -->
        <div class="workflow-header">
          <span class="workflow-header__title">审批流程</span>
          <Tag :color="getInstanceStatusTag().color">
            {{ getInstanceStatusTag().text }}
          </Tag>
        </div>

        <!-- 时间轴 -->
        <Timeline class="workflow-timeline__body">
          <!-- 发起节点 -->
          <TimelineItem color="green">
            <div class="timeline-node">
              <div class="timeline-node__title">发起申请</div>
              <div class="timeline-node__desc">流程已发起</div>
            </div>
          </TimelineItem>

          <!-- 审批节点（按 level 分组） -->
          <TimelineItem
            v-for="group in levelGroups"
            :key="group.level"
            :color="getTimelineColor(group)"
          >
            <div class="timeline-node">
              <div class="timeline-node__header">
                <span class="timeline-node__title">
                  第 {{ group.level }} 级审批
                </span>
                <Tag
                  v-if="group.passMethod !== WorkFlowPassMethod.Pass"
                  :color="
                    group.passMethod === WorkFlowPassMethod.Or
                      ? 'orange'
                      : 'purple'
                  "
                  size="small"
                >
                  {{ getPassMethodLabel(group.passMethod) }}
                </Tag>
              </div>

              <div class="timeline-node__auditors">
                <div
                  v-for="item in group.itemList"
                  :key="item.id"
                  class="auditor-item"
                >
                  <div class="auditor-item__main">
                    <span class="auditor-item__name">
                      {{ item.userNickName || `用户 ${item.userId}` }}
                    </span>
                    <Tag :color="getStatusColor(item.taskStatus)" size="small">
                      {{ getStatusLabel(item.taskStatus) }}
                    </Tag>
                  </div>
                  <div v-if="item.auditTime" class="auditor-item__time">
                    {{ formatTime(item.auditTime) }}
                  </div>
                  <Tooltip v-if="item.comment" :title="item.comment">
                    <div class="auditor-item__comment">
                      {{ item.comment }}
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>
          </TimelineItem>

          <!-- 结束节点 -->
          <TimelineItem
            :color="
              instanceStatus === WorkFlowInstanceStatus.Pass
                ? 'green'
                : instanceStatus === WorkFlowInstanceStatus.Reject
                  ? 'red'
                  : 'gray'
            "
          >
            <div class="timeline-node">
              <div class="timeline-node__title">
                {{
                  instanceStatus === WorkFlowInstanceStatus.Pass
                    ? '审批完成'
                    : instanceStatus === WorkFlowInstanceStatus.Reject
                      ? '已驳回'
                      : '等待审批完成'
                }}
              </div>
            </div>
          </TimelineItem>
        </Timeline>
      </div>
    </Spin>
  </Modal>
</template>

<style scoped>
.workflow-timeline {
  padding: 8px 0;
}

.workflow-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.workflow-header__title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.workflow-timeline__body {
  padding-top: 4px;
}

.timeline-node__header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-node__title {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.timeline-node__desc {
  font-size: 12px;
  color: #8c8c8c;
}

.timeline-node__auditors {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auditor-item {
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.auditor-item__main {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.auditor-item__name {
  font-size: 13px;
  font-weight: 500;
  color: #434343;
}

.auditor-item__time {
  margin-top: 2px;
  font-size: 12px;
  color: #8c8c8c;
}

.auditor-item__comment {
  max-width: 360px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #595959;
  white-space: nowrap;
}
</style>
