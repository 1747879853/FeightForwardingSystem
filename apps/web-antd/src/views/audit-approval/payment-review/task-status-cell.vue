<script setup lang="ts">
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { computed, ref } from 'vue';

import { Popover, Tag, Tooltip } from 'ant-design-vue';

import {
  TaskStatus,
  TaskType,
} from '#/api/audit-approval/payment-review-admin';
import { WorkflowTimeline } from '#/components/workflow-timeline';
import { $t } from '#/locales';
import { getTaskStatusOptions } from '#/views/audit-approval/data';

const props = defineProps<{ row: PaymentReviewAdminApi.PayAppTaskItemDto }>();
const open = ref(false);
const status = computed(() =>
  getTaskStatusOptions().find((item) => item.value === props.row.taskStatus),
);
const myStatus = computed(() =>
  getTaskStatusOptions().find((item) => item.value === props.row.myStatus),
);
const myStatusTitle = computed(
  () =>
    `${$t('auditApproval.paymentReview.myStatus')}：${myStatus.value?.label ?? '-'}`,
);
</script>

<template>
  <Popover
    v-if="row.taskStatus !== TaskStatus.Passed"
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
          :key="row.id"
          :entity-id="row.paymentApplicationId"
          :task-type="TaskType.PaymentApplication"
          :applicant-name="row.creatorUserName"
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
