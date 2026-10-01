<script setup lang="ts">
import type { CommissionReviewRow } from './data';

import { computed, ref } from 'vue';

import { Popover, Tag, Tooltip } from 'ant-design-vue';

import {
  TaskStatus,
  TaskType,
} from '#/api/audit-approval/payment-review-admin';
import { WorkflowTimeline } from '#/components/workflow-timeline';
import { $t } from '#/locales';
import { getStatusOptions } from '#/views/commission/data';
import { getTaskStatusOptions } from '#/views/audit-approval/data';

defineOptions({ name: 'CommissionReviewStatusCell' });

const props = defineProps<{ row: CommissionReviewRow }>();

const open = ref(false);

const status = computed(() =>
  getStatusOptions().find((item) => item.value === props.row.status),
);

const myStatus = computed(() =>
  getTaskStatusOptions().find((item) => item.value === props.row.myStatus),
);

const myStatusTitle = computed(() => {
  const label =
    props.row.myStatus == null ? '未轮到我' : (myStatus.value?.label ?? '-');
  return `${$t('auditApproval.commissionReview.myStatus')}：${label}`;
});

/** 整单任务已通过时只展示标签；未通过时可悬停看审批流程（对齐客户审核） */
const canViewWorkflow = computed(
  () => props.row.taskStatus !== TaskStatus.Passed,
);

function popupContainer() {
  return document.body;
}
</script>

<template>
  <Popover
    v-if="canViewWorkflow"
    v-model:open="open"
    trigger="hover"
    placement="rightTop"
    :mouse-enter-delay="0.2"
    :get-popup-container="popupContainer"
    :overlay-style="{ zIndex: 2100 }"
    title="审核流程"
  >
    <template #content>
      <div class="max-h-96 w-72 overflow-y-auto">
        <div class="mb-2 text-xs">{{ myStatusTitle }}</div>
        <WorkflowTimeline
          v-if="open"
          :key="row.id"
          :entity-id="row.id"
          :task-type="TaskType.CommissionOrder"
          :applicant-name="row.creatorUserName"
          :application-time="row.creationTime"
          :show-header="false"
        />
      </div>
    </template>
    <span
      class="commission-status-trigger"
      :aria-label="`${status?.label ?? '-'}，查看审核流程`"
      :title="myStatusTitle"
      @click.stop
      @dblclick.stop
    >
      <Tag :color="status?.color" class="!mr-0">
        {{ status?.label ?? '-' }}
      </Tag>
    </span>
  </Popover>
  <Tooltip v-else :title="myStatusTitle">
    <Tag :color="status?.color" class="!mr-0">
      {{ status?.label ?? '-' }}
    </Tag>
  </Tooltip>
</template>

<style scoped>
.commission-status-trigger {
  display: inline-flex;
  cursor: pointer;
}
</style>
