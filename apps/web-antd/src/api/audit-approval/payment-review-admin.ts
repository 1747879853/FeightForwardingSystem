import { requestClient } from '#/api/request';

export namespace PaymentReviewAdminApi {
  export interface PayAppTaskQueryParams {
    Keyword?: string;
    ApplicationNo?: string;
    SettlementId?: string;
    CurrencyId?: number;
    SubmitTimeStart?: string;
    SubmitTimeEnd?: string;
    EndTimeStart?: string;
    EndTimeEnd?: string;
    CreatorUserId?: number;
    OrgId?: number;
    TaskType?: number;
    TaskStatus?: number;
    MyStatus?: number;
    FrightModule?: number;
    AuditUserId?: number;
    AuditTimeStart?: string;
    AuditTimeEnd?: string;
    Remark?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string;
    localCurrencyId?: number;
  }

  export interface CurrencyGroupDto {
    id: number;
    code?: string;
    receiveAmount: number;
    receivePrice?: number;
    payAmount: number;
    payPrice?: number;
  }

  export interface WorkFlowInstanceItemDetailDto {
    userId: number;
    userNickName?: string;
    taskStatus: number;
    comment?: string;
    auditTime?: string;
    id: string;
  }

  export interface WorkFlowInstanceItemGroupDto {
    level: number;
    passMethod: number;
    itemList?: WorkFlowInstanceItemDetailDto[];
  }

  export interface WorkFlowInstanceDetailDto {
    status: number;
    levelGroup?: WorkFlowInstanceItemGroupDto[];
    id: string;
  }

  export interface PayAppTaskItemDto {
    paymentApplicationId: string;
    applicationNo?: string;
    settlementName?: string;
    submitTime?: string;
    endTime?: string;
    currencyId?: number;
    currencyCode?: string;
    orgId?: number;
    companys?: OrganizationUnitSimpleDto[];
    currencyGroup?: CurrencyGroupDto[];
    totalPayPrice?: number;
    totalReceivePrice?: number;
    id: string;
    taskBaseId?: string;
    taskType: number;
    taskStatus: number;
    myStatus: number;
    taskItemWorkFlowInstance?: WorkFlowInstanceDetailDto;
    frightModule: number;
    entityId: string;
    originalInfo?: string;
    info?: string;
    auditUserId?: number;
    auditUserName?: string;
    auditTime?: string;
    remark?: string;
    creatorUserName?: string;
  }

  export interface PagedListOfPayAppTaskItemDto {
    skipCount: number;
    maxResultCount: number;
    items?: PayAppTaskItemDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  export interface TaskItemAuditDto {
    success: boolean;
    remark?: string;
    ids?: string[];
  }

  export interface TaskItemRejectAuditDto {
    remark?: string;
    ids?: string[];
  }
}

const API_PREFIX = '/services/app/PaymentApplicationAdmin';

/** 付费审核任务 分页列表 */
export async function getPayAppTaskList(
  params: PaymentReviewAdminApi.PayAppTaskQueryParams,
) {
  const response =
    await requestClient.get<PaymentReviewAdminApi.PagedListOfPayAppTaskItemDto>(
      `${API_PREFIX}/PayAppTaskListAsync`,
      { params },
    );

  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/** 审核 */
export async function payAppAudit(
  data: PaymentReviewAdminApi.TaskItemAuditDto,
) {
  return requestClient.post(`${API_PREFIX}/AuditAsync`, data);
}

/** 审核通过后驳回 */
export async function payAppReject(
  data: PaymentReviewAdminApi.TaskItemRejectAuditDto,
) {
  return requestClient.post(`${API_PREFIX}/RejectAsync`, data);
}
