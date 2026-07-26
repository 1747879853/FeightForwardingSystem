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

function resolveWorkflowErrorMessage(error: unknown): string {
  const e = error as {
    message?: string;
    response?: { data?: { error?: { details?: string; message?: string } } };
  };
  const abpMessage =
    e?.response?.data?.error?.message ||
    e?.response?.data?.error?.details ||
    e?.message ||
    '';
  // 后端无实例时常 FirstAsync 抛 500，文案是通用内部错误，弹窗里改成可读提示
  if (
    !abpMessage ||
    abpMessage.includes('服务器内部错误') ||
    abpMessage.includes('Internal Server Error') ||
    /Sequence contains no elements/i.test(abpMessage)
  ) {
    return '暂无审批流程数据（可能尚未发起审批，或未配置对应任务类型的工作流）';
  }
  return abpMessage;
}

async function open(params: WorkflowTimelineOpenParams) {
  visible.value = true;
  loading.value = true;
  errorMsg.value = '';
  instanceData.value = null;

  try {
    const result = await getWorkFlowInstanceDetail(
      {
        EntityId: params.entityId,
        TaskType: params.taskType ?? TaskType.PaymentApplication,
      },
      { silent: true },
    );
    instanceData.value = result;
  } catch (error) {
    errorMsg.value = resolveWorkflowErrorMessage(error);
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
