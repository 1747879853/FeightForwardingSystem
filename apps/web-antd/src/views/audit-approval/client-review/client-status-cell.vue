<script setup lang="ts">
import { computed, ref } from 'vue';

import { Popover, Tag, Tooltip } from 'ant-design-vue';

import { TaskType } from '#/api/audit-approval/payment-review-admin';
import { ClientAdminApi } from '#/api/sea-export/client-admin';
import { WorkflowTimeline } from '#/components/workflow-timeline';
import { $t } from '#/locales';
import { getClientStatusOptions } from '#/views/client/base/client-status';

import { getMyTaskStatusLabel } from './data';

const props = defineProps<{ row: ClientAdminApi.ClientTaskDto }>();

const { ClientTaskStatus, ClientTaskType } = ClientAdminApi;

const open = ref(false);

const status = computed(() =>
  getClientStatusOptions().find(
    (item) => item.value === props.row.client?.clientStatus,
  ),
);

const myStatusTitle = computed(
  () =>
    `${$t('auditApproval.clientReview.myStatus')}：${getMyTaskStatusLabel(props.row.myTaskStatus)}`,
);

/** 与行上 taskType 对齐，拉对应客户工作流实例 */
const workflowTaskType = computed(() =>
  props.row.taskType === ClientTaskType.ModifyClient
    ? TaskType.ModifyClient
    : TaskType.SubmitClient,
);

/** 整单已通过时只展示标签（与付费申请任务状态列一致） */
const canViewWorkflow = computed(
  () => props.row.taskStatus !== ClientTaskStatus.Passed,
);

const entityId = computed(() => props.row.client?.id);
</script>

<template>
  <Popover
    v-if="canViewWorkflow && entityId"
    v-model:open="open"
    trigger="click"
    placement="rightTop"
    title="审核流程"
  >
    <template #content>
      <div class="max-h-96 w-72 overflow-y-auto">
        <div class="mb-2 text-xs">{{ myStatusTitle }}</div>
        <WorkflowTimeline
          v-if="open"
          :key="`${entityId}-${workflowTaskType}`"
          :entity-id="entityId"
          :task-type="workflowTaskType"
          :applicant-name="row.submitUserName"
          :application-time="row.submitTime"
          :show-header="false"
        />
      </div>
    </template>
    <button
      type="button"
      class="cursor-pointer"
      :aria-label="`${status?.label ?? '-'}，查看审核流程`"
      :aria-expanded="open"
      :title="myStatusTitle"
      @click.stop
      @dblclick.stop
      @keydown.stop
    >
      <Tag :color="status?.color" class="!mr-0">
        {{ status?.label ?? '-' }}
      </Tag>
    </button>
  </Popover>
  <Tooltip v-else :title="myStatusTitle">
    <Tag :color="status?.color" class="!mr-0">
      {{ status?.label ?? '-' }}
    </Tag>
  </Tooltip>
</template>
