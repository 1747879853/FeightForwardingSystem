<script setup lang="ts">
import type { BillTask } from '#/api/bill-of-lading';

import { computed } from 'vue';

import { Tag } from 'ant-design-vue';

import StatusFlowPop from './status-flow-pop.vue';

const props = defineProps<{ row: BillTask }>();

const batchOptions = [
  { value: 0, label: '审核中', color: 'orange' },
  { value: 1, label: '全部驳回', color: 'red' },
  { value: 2, label: '全部通过', color: 'green' },
  { value: 3, label: '部分通过', color: 'blue' },
];

const batch = computed(() =>
  batchOptions.find((item) => item.value === props.row.taskStatus),
);
</script>

<template>
  <StatusFlowPop
    :my-task-status="row.myTaskStatus"
    :work-flow-instance="row.workFlowInstance"
  >
    <Tag :color="batch?.color" class="!mr-0">
      {{ batch?.label ?? '-' }}
    </Tag>
  </StatusFlowPop>
</template>
