import { ref } from 'vue';

import { TaskType } from '#/api/audit-approval/payment-review-admin';

const visible = ref(false);
const params = ref<null | WorkflowTimelineOpenParams>(null);

export interface WorkflowTimelineOpenParams {
  entityId: string;
  taskType?: TaskType;
}

function open(nextParams: WorkflowTimelineOpenParams) {
  params.value = nextParams;
  visible.value = true;
}

function close() {
  visible.value = false;
  params.value = null;
}

export function useWorkflowTimeline() {
  return {
    visible,
    params,
    open,
    close,
  };
}
