<script lang="ts" setup>
import { Modal } from 'ant-design-vue';

import WorkflowTimeline from './workflow-timeline.vue';
import { useWorkflowTimeline } from './use-workflow-timeline';

const { visible, params, close } = useWorkflowTimeline();
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
    <WorkflowTimeline
      v-if="visible"
      :entity-id="params?.entityId"
      :task-type="params?.taskType"
    />
  </Modal>
</template>
