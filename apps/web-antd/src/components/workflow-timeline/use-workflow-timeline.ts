import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { ref } from 'vue';

import {
  getWorkFlowInstanceDetail,
  TaskType,
} from '#/api/audit-approval/payment-review-admin';

const visible = ref(false);
const loading = ref(false);
const instanceData =
  ref<PaymentReviewAdminApi.WorkFlowInstanceDetailDto | null>(null);
const errorMsg = ref('');

export interface WorkflowTimelineOpenParams {
  entityId: string;
  taskType?: TaskType;
}

async function open(params: WorkflowTimelineOpenParams) {
  visible.value = true;
  loading.value = true;
  errorMsg.value = '';
  instanceData.value = null;

  try {
    const result = await getWorkFlowInstanceDetail({
      EntityId: params.entityId,
      TaskType: params.taskType ?? TaskType.PaymentApplication,
    });
    instanceData.value = result;
  } catch (e: any) {
    errorMsg.value = e?.message || '获取审批流程失败';
  } finally {
    loading.value = false;
  }
}

function close() {
  visible.value = false;
  instanceData.value = null;
  errorMsg.value = '';
}

export function useWorkflowTimeline() {
  return {
    visible,
    loading,
    instanceData,
    errorMsg,
    open,
    close,
  };
}
