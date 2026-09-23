import type { AttachmentViewerTarget } from '#/components/attachment-viewer/use-attachment-viewer';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { ReportApi } from '#/api/system/report';

import { requestClient } from '#/api/request';

export interface BillParty {
  id: string;
  name?: string;
  fullName?: string;
}
export interface BillAttachment extends AttachmentViewerTarget {
  attachmentId: number | string;
  id?: number | string;
}
export interface BillAttachmentInput {
  attachmentId: number | string;
  displayOrder?: number;
  clientVisible?: boolean;
}
export interface BillHistory {
  id: string;
  actionType?: number;
  beforeStatus?: number;
  afterStatus?: number;
  actionDate?: string | null;
  creationTime: string;
  creatorUserName?: string;
  remark?: string;
  codeIssueType?: { id: number | string; billType?: string } | null;
  signOutType?: number | null;
  attachments?: BillAttachment[] | null;
}
export interface BillSeaExport {
  id: string;
  vessel?: string;
  innerVoyno?: string;
  terminalVoyno?: string;
  blType?: number;
  billType?: number;
  bookingAgent?: BillParty | null;
  carrier?: {
    id: number | string;
    cnShortName?: string;
    cnName?: string;
  } | null;
  pol?: {
    portName?: string;
    cnName?: string;
    ediCode?: string | null;
  } | null;
  pod?: {
    portName?: string;
    cnName?: string;
    ediCode?: string | null;
  } | null;
  transportOrder: {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    etd?: string;
    settlementDate?: string;
    client?: BillParty | null;
    totalCtn?: string;
    orderUsers?: {
      userId: number | string;
      userNickName?: string;
      userAttribute: number;
    }[];
  };
}
export interface BillOfLading {
  id: string;
  status: number;
  isSeparate: boolean;
  isOriginal: boolean;
  isOverdue: boolean;
  isHeldUp?: boolean | null;
  codeIssueType?: BillHistory['codeIssueType'];
  settlement?: BillParty | null;
  unReceivedAmount?: number;
  overdueDays?: number;
  settlementDate?: string | null;
  promisePayDate?: string | null;
  overdueRemark?: string;
  overdueAttachments?: BillAttachment[] | null;
  signIn?: BillHistory | null;
  signOut?: BillHistory | null;
  swap?: BillHistory | null;
  deduct?: BillHistory | null;
  taskBaseId?: string | null;
  seaExport: BillSeaExport;
  seaExportSeparate?: { id: string; blNum?: string; totalCtn?: string } | null;
}
export interface BillTaskItem {
  taskItemId: string;
  taskStatus: number;
  myTaskStatus?: number | null;
  remark?: string;
  auditTime?: string;
  auditUserName?: string;
  billOfLading: BillOfLading;
}
export interface BillTask {
  id: string;
  taskStatus?: number | null;
  myTaskStatus?: number | null;
  processed: boolean;
  creationTime: string;
  creatorUserName?: string;
  mblNums?: string[];
  blNums?: string[];
  client?: BillParty | null;
  settlement?: BillParty | null;
  sales?: { id: number | string; nickName?: string }[];
  operators?: { id: number | string; nickName?: string }[];
  totalUnReceivedAmount?: number;
  totalCtn?: string;
  itemCount: number;
  pendingItemCount: number;
  workFlowInstance?: {
    levelGroup?: {
      level: number;
      passMethod: number;
      itemList?: {
        id: string;
        userNickName?: string;
        taskStatus?: number | null;
        comment?: string;
        auditTime?: string;
      }[];
    }[];
  } | null;
}
export interface BillClientOverdue {
  transportOrderId: string;
  seaExport?: BillSeaExport | null;
  blNums?: string[];
  settlementDate?: string;
  historyOverdueDays: number;
  overdueDays: number;
  promiseOverdueDays: number;
  unReceivedAmount: number;
  promisePayDate?: string | null;
  finalSettlementTime?: string | null;
  overdueRemark?: string;
  overdueAttachments?: BillAttachment[] | null;
}
export interface BillTaskDetail extends BillTask {
  billOfLadingTasks: BillTaskItem[];
  heldUpBillOfLadings: BillOfLading[];
  followingBillOfLadings: BillOfLading[];
  clientDetail?: ClientAdminApi.ClientDto | null;
  arrearsReports?: ReportApi.ArrearsReportDto[] | null;
  clientOverdues: BillClientOverdue[];
}
export interface BillGroup {
  id: string | null;
  name: string | null;
  count: number;
  logo?: BillAttachment | null;
}
export interface BillCount {
  totalCount: number;
  pendingSignOutCount: number;
  overdueUnReceivedCount: number;
  pendingAuditCount: number;
}
export interface BillSubmitItem {
  id: string;
  promisePayDate?: string;
  overdueRemark?: string;
  overdueAttachments?: BillAttachmentInput[];
}
export type BillAction =
  | 'SignIn'
  | 'CancelSignIn'
  | 'Swap'
  | 'CancelSwap'
  | 'Deduct'
  | 'CancelDeduct'
  | 'SignOut'
  | 'CancelSignOut'
  | 'Submit'
  | 'UnSubmit';
export interface BillActionPayloads {
  SignIn: {
    id: string;
    signInDate: string;
    remark?: string;
    attachments: BillAttachmentInput[];
  };
  CancelSignIn: { id: string; remark?: string };
  Swap: { ids: string[]; swapDate: string; remark?: string };
  CancelSwap: { id: string; remark?: string };
  Deduct: { ids: string[]; deductDate: string; remark?: string };
  CancelDeduct: { id: string; remark?: string };
  SignOut: {
    ids: string[];
    signOutDate: string;
    codeIssueTypeId: number | string;
    signOutType: number;
    remark?: string;
  };
  CancelSignOut: { id: string; remark?: string };
  Submit: { items: BillSubmitItem[] };
  UnSubmit: { taskBaseId: string };
}
const prefix = '/services/app/BillOfLadingAdmin';
const get = <T>(action: string, params?: Record<string, unknown>) =>
  requestClient.get<T>(`${prefix}/${action}Async`, { params });
export const getBillList = (params: Record<string, unknown>) =>
  get<{ items: BillOfLading[]; totalCount: number }>('GetPagedList', params);
export const getBillGroups = (params: Record<string, unknown>) =>
  get<BillGroup[]>('GetGroupedList', params);
export const getBillCount = () => get<BillCount>('GetCount');
export const getBill = (id: string) => get<BillOfLading>('Get', { Id: id });
export const getBillHistory = (id: string) =>
  get<BillHistory[]>('GetHistoryList', { BillOfLadingId: id });
export const getBillTasks = (params: Record<string, unknown>) =>
  get<{ items: BillTask[]; totalCount: number }>('GetTaskPagedList', params);
export const getBillTask = (id: string) =>
  get<BillTaskDetail>('GetTask', { Id: id });
export const runBillAction = <A extends BillAction>(
  action: A,
  data: BillActionPayloads[A],
) =>
  requestClient.post<boolean | string | null>(`${prefix}/${action}Async`, data);
export const auditBills = (
  billOfLadingIds: string[],
  success: boolean,
  remark?: string,
) =>
  requestClient.post<boolean>(`${prefix}/AuditAsync`, {
    billOfLadingIds,
    success,
    remark,
  });
