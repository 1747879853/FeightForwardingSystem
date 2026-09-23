<script setup lang="ts">
import { computed, ref } from 'vue';

import { Empty, Popover, Tag, Tooltip } from 'ant-design-vue';

import { ClientAdminApi } from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import { getClientStatusOptions } from '#/views/client/base/client-status';

import { getMyTaskStatusLabel } from './data';
import ApprovalPath from './modules/approval-path.vue';

defineOptions({ name: 'ClientReviewStatusCell' });

const props = defineProps<{ row: ClientAdminApi.ClientTaskDto }>();

const { ClientTaskStatus } = ClientAdminApi;

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

/** 整单已通过时只展示标签；未通过时用行上挂的审批路径（含转交历史） */
const canViewWorkflow = computed(
  () => props.row.taskStatus !== ClientTaskStatus.Passed,
);

const workFlowInstance = computed(() => props.row.workFlowInstance);
</script>

<template>
  <Popover
    v-if="canViewWorkflow"
    v-model:open="open"
    trigger="click"
    placement="rightTop"
    title="审核流程"
  >
    <template #content>
      <div class="max-h-96 w-80 overflow-y-auto">
        <div class="mb-2 text-xs">{{ myStatusTitle }}</div>
        <ApprovalPath v-if="workFlowInstance" :instance="workFlowInstance" />
        <Empty
          v-else
          :image-style="{ height: '36px' }"
          description="无审批节点（工作流直接通过）"
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
