<script lang="ts" setup>
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { Empty, Spin, Tag } from 'ant-design-vue';

import {
  getWorkFlowInstanceDetail,
  TaskStatus,
  TaskType,
  WorkFlowInstanceStatus,
  WorkFlowPassMethod,
} from '#/api/audit-approval/payment-review-admin';

defineOptions({ name: 'WorkflowTimeline' });

interface Props {
  applicantName?: string;
  applicationTime?: string;
  entityId?: string;
  /** 延迟拉取毫秒数（如新增刚创建工作流实例尚未就绪） */
  loadDelayMs?: number;
  showHeader?: boolean;
  taskType?: TaskType;
}

const props = withDefaults(defineProps<Props>(), {
  applicantName: '',
  applicationTime: '',
  entityId: undefined,
  loadDelayMs: 0,
  showHeader: true,
  taskType: TaskType.PaymentApplication,
});

const loading = ref(false);
const instanceData =
  ref<PaymentReviewAdminApi.WorkFlowInstanceDetailDto | null>(null);
const errorMsg = ref('');
let loadDelayTimer: ReturnType<typeof setTimeout> | undefined;

function clearLoadDelayTimer() {
  if (loadDelayTimer) {
    clearTimeout(loadDelayTimer);
    loadDelayTimer = undefined;
  }
}

const levelGroups = computed(() => {
  const groups = instanceData.value?.levelGroup;
  if (!groups || groups.length === 0) return [];
  return [...groups].sort((a, b) => a.level - b.level);
});

const instanceStatus = computed(() => instanceData.value?.status);

function resolveWorkflowErrorMessage(error: unknown): string {
  const requestError = error as {
    message?: string;
    response?: { data?: { error?: { details?: string; message?: string } } };
  };
  const abpMessage =
    requestError?.response?.data?.error?.message ||
    requestError?.response?.data?.error?.details ||
    requestError?.message ||
    '';

  if (
    !abpMessage ||
    abpMessage.includes('服务器内部错误') ||
    abpMessage.includes('Internal Server Error') ||
    /Sequence contains no elements/i.test(abpMessage)
  ) {
    return '暂无审批流程数据';
  }
  return abpMessage;
}

async function load() {
  if (!props.entityId) {
    instanceData.value = null;
    errorMsg.value = '';
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  instanceData.value = null;

  try {
    instanceData.value = await getWorkFlowInstanceDetail(
      {
        EntityId: props.entityId,
        TaskType: props.taskType,
      },
      { silent: true },
    );
  } catch (error) {
    errorMsg.value = resolveWorkflowErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

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

function getStatusLabel(status: number, passMethod?: number): string {
  switch (status) {
    case TaskStatus.Passed:
      return '已通过';
    case TaskStatus.Rejected:
      return '已驳回';
    case TaskStatus.Auditing:
      return passMethod === WorkFlowPassMethod.Or ? '待处理' : '待审批';
    default:
      return '待处理';
  }
}

function getVisibleItems(
  group: PaymentReviewAdminApi.WorkFlowInstanceItemGroupDto,
) {
  const items = group.itemList ?? [];
  if (group.passMethod !== WorkFlowPassMethod.Or) return items;

  const passedItems = items.filter(
    (item) => item.taskStatus === TaskStatus.Passed,
  );
  return passedItems.length > 0 ? passedItems : items;
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

function getGroupState(
  group: PaymentReviewAdminApi.WorkFlowInstanceItemGroupDto,
): 'active' | 'passed' | 'rejected' | 'waiting' {
  const items = getVisibleItems(group);
  if (items.some((item) => item.taskStatus === TaskStatus.Rejected)) {
    return 'rejected';
  }
  if (
    items.length > 0 &&
    (group.passMethod === WorkFlowPassMethod.Or
      ? items.some((item) => item.taskStatus === TaskStatus.Passed)
      : items.every((item) => item.taskStatus === TaskStatus.Passed))
  ) {
    return 'passed';
  }
  if (items.some((item) => item.taskStatus === TaskStatus.Auditing)) {
    return 'active';
  }
  return 'waiting';
}

function getNodeMarker(
  group: PaymentReviewAdminApi.WorkFlowInstanceItemGroupDto,
): string {
  const state = getGroupState(group);
  if (state === 'passed') return '✓';
  if (state === 'rejected') return '×';
  return String(group.level);
}

function getGroupTitle(
  group: PaymentReviewAdminApi.WorkFlowInstanceItemGroupDto,
): string {
  return `第 ${group.level} 级审批`;
}

function formatTime(value: string | undefined): string {
  if (!value) return '';
  return dayjs(value).isValid()
    ? dayjs(value).format('YYYY-MM-DD HH:mm:ss')
    : '';
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

function scheduleLoad(delayMs = props.loadDelayMs) {
  clearLoadDelayTimer();

  if (!props.entityId) {
    loading.value = false;
    instanceData.value = null;
    errorMsg.value = '';
    return;
  }

  const ms = delayMs > 0 ? delayMs : 0;
  if (ms <= 0) {
    void load();
    return;
  }

  // 等待工作流实例创建/状态变更完成后再拉取
  loading.value = true;
  errorMsg.value = '';
  instanceData.value = null;
  loadDelayTimer = setTimeout(() => {
    loadDelayTimer = undefined;
    void load();
  }, ms);
}

watch(
  () => [props.entityId, props.taskType, props.loadDelayMs],
  () => {
    scheduleLoad();
  },
  {
    immediate: true,
  },
);

onBeforeUnmount(() => {
  clearLoadDelayTimer();
});

/** 手动刷新；可传 delayMs 等待后端审核流落库后再拉取 */
function reload(options?: { delayMs?: number }) {
  scheduleLoad(options?.delayMs ?? 0);
}

defineExpose({ reload });
</script>

<template>
  <Spin :spinning="loading">
    <div class="workflow-timeline">
      <div v-if="errorMsg" class="workflow-timeline__state">
        {{ errorMsg }}
      </div>

      <div v-else-if="loading" class="workflow-timeline__state">
        正在加载审批流程…
      </div>

      <div
        v-else-if="!entityId || !instanceData"
        class="workflow-timeline__state"
      >
        <Empty description="暂无审批流程数据" />
      </div>

      <template v-else>
        <div v-if="showHeader" class="workflow-timeline__header">
          <span>审批流程</span>
          <Tag :color="getInstanceStatusTag().color">
            {{ getInstanceStatusTag().text }}
          </Tag>
        </div>

        <div class="workflow-timeline__nodes">
          <div class="workflow-timeline__node workflow-timeline__node--passed">
            <span class="workflow-timeline__dot">✓</span>
            <span class="workflow-timeline__line"></span>
            <div class="workflow-timeline__content">
              <div class="workflow-timeline__title">发起申请</div>
              <div
                v-if="applicantName || applicationTime"
                class="workflow-timeline__detail"
              >
                {{ applicantName || '-' }}
                <template v-if="applicationTime">
                  · {{ formatTime(applicationTime) }}
                </template>
              </div>
              <div v-else class="workflow-timeline__detail">流程已发起</div>
            </div>
          </div>

          <div
            v-for="group in levelGroups"
            :key="group.level"
            class="workflow-timeline__node"
            :class="`workflow-timeline__node--${getGroupState(group)}`"
          >
            <span class="workflow-timeline__dot">{{
              getNodeMarker(group)
            }}</span>
            <span class="workflow-timeline__line"></span>
            <div class="workflow-timeline__content">
              <div class="workflow-timeline__title-row">
                <span class="workflow-timeline__title">{{
                  getGroupTitle(group)
                }}</span>
                <span
                  v-if="group.passMethod !== WorkFlowPassMethod.Pass"
                  class="workflow-timeline__pass-method"
                  :class="{
                    'is-or': group.passMethod === WorkFlowPassMethod.Or,
                    'is-and': group.passMethod === WorkFlowPassMethod.And,
                  }"
                >
                  {{ getPassMethodLabel(group.passMethod) }}
                </span>
              </div>
              <div
                v-for="item in getVisibleItems(group)"
                :key="item.id"
                class="workflow-timeline__item"
              >
                <div class="workflow-timeline__detail">
                  <span>{{ item.userNickName || `用户 ${item.userId}` }}</span>
                  <span
                    :class="`workflow-timeline__status is-${getStatusColor(item.taskStatus)}`"
                  >
                    {{ getStatusLabel(item.taskStatus, group.passMethod) }}
                  </span>
                  <span v-if="item.auditTime"
                    >· {{ formatTime(item.auditTime) }}</span
                  >
                  <span
                    v-if="
                      item.comment && item.taskStatus !== TaskStatus.Rejected
                    "
                    class="workflow-timeline__comment"
                    :title="item.comment"
                  >
                    · {{ item.comment }}
                  </span>
                </div>
                <div
                  v-if="item.comment && item.taskStatus === TaskStatus.Rejected"
                  class="workflow-timeline__reject-reason"
                >
                  <div>驳回原因：</div>
                  <div>{{ item.comment }}</div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="workflow-timeline__node workflow-timeline__node--end"
            :class="{
              'workflow-timeline__node--passed':
                instanceStatus === WorkFlowInstanceStatus.Pass,
              'workflow-timeline__node--rejected':
                instanceStatus === WorkFlowInstanceStatus.Reject,
            }"
          >
            <span class="workflow-timeline__dot">
              {{
                instanceStatus === WorkFlowInstanceStatus.Pass
                  ? '✓'
                  : instanceStatus === WorkFlowInstanceStatus.Reject
                    ? '×'
                    : levelGroups.length + 1
              }}
            </span>
            <div class="workflow-timeline__content">
              <div class="workflow-timeline__title">
                {{
                  instanceStatus === WorkFlowInstanceStatus.Pass
                    ? '审批完成'
                    : instanceStatus === WorkFlowInstanceStatus.Reject
                      ? '已驳回'
                      : '等待审批完成'
                }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </Spin>
</template>

<style scoped>
.workflow-timeline {
  min-height: 160px;
  padding: 8px 0;
}

.workflow-timeline__state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  font-size: 13px;
  color: #8c8c8c;
}

.workflow-timeline__header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 16px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  border-bottom: 1px solid #f0f0f0;
}

.workflow-timeline__nodes {
  padding-top: 4px;
}

.workflow-timeline__node {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 8px;
  min-height: 51px;
}

.workflow-timeline__dot {
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 3px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: #94a3b8;
  background: #fff;
  border: 2px solid #d1d5db;
  border-radius: 50%;
}

.workflow-timeline__line {
  position: absolute;
  top: 20px;
  bottom: 0;
  left: 12px;
  width: 1px;
  background: #d8dee7;
}

.workflow-timeline__node--end {
  min-height: 20px;
}

.workflow-timeline__node--passed .workflow-timeline__dot {
  color: #fff;
  background: #22c55e;
  border-color: #22c55e;
}

.workflow-timeline__node--active .workflow-timeline__dot {
  color: #fff;
  background: #3b82f6;
  border-color: #3b82f6;
}

.workflow-timeline__node--rejected .workflow-timeline__dot {
  color: #fff;
  background: #ef4444;
  border-color: #ef4444;
}

.workflow-timeline__content {
  min-width: 0;
  padding-top: 1px;
}

.workflow-timeline__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.workflow-timeline__title {
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: #172033;
}

.workflow-timeline__pass-method {
  padding: 1px 6px;
  font-size: 11px;
  line-height: 18px;
  border: 1px solid currentcolor;
  border-radius: 4px;
}

.workflow-timeline__pass-method.is-or {
  color: #f59e0b;
}

.workflow-timeline__pass-method.is-and {
  color: #8b5cf6;
}

.workflow-timeline__item {
  min-width: 0;
}

.workflow-timeline__detail {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  line-height: 17px;
  color: #94a3b8;
  white-space: nowrap;
}

.workflow-timeline__status {
  flex: none;
}

.workflow-timeline__status.is-green {
  color: #22a06b;
}

.workflow-timeline__status.is-red {
  color: #dc2626;
}

.workflow-timeline__status.is-blue {
  color: #2563eb;
}

.workflow-timeline__comment {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workflow-timeline__reject-reason {
  margin-top: 2px;
  font-size: 11px;
  line-height: 17px;
  color: #ff3b30;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
