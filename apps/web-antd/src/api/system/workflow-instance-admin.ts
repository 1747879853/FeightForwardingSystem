import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/WorkFlowInstanceAdmin';

/** 工作流转交入参（费用/客户/提成等通用） */
export interface WorkFlowInstanceTransferDto {
  /** 当前登录人待审核的那条工作流明细 id */
  workFlowInstanceItemId: string;
  /** 被转交人用户 id */
  toUserId: number;
}

/**
 * 转交待审名额给另一人。
 * 登录即可，不要额外判业务审核权限。
 */
export const transferWorkFlowInstance = (data: WorkFlowInstanceTransferDto) => {
  return requestClient.post(`${API_PREFIX}/TransferAsync`, data);
};
