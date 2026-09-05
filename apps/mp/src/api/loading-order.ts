import { request } from './request';

/** 监装工单状态。师傅端只能查 1/2/3 */
export enum LoadingOrderStatus {
  Unsubmitted = 0,
  /** 待认领：公共池，所有监装师傅可见 */
  Pending = 1,
  /** 已认领：只看自己的 */
  Claimed = 2,
  /** 已完成：只看自己的 */
  Completed = 3,
}

/** 设计稿的分段文案与后端状态的映射 */
export const STATUS_TABS = [
  { label: '新派', status: LoadingOrderStatus.Pending },
  { label: '进行中', status: LoadingOrderStatus.Claimed },
  { label: '已完成', status: LoadingOrderStatus.Completed },
] as const;

export const STATUS_TEXT: Record<number, string> = {
  [LoadingOrderStatus.Unsubmitted]: '未提交',
  [LoadingOrderStatus.Pending]: '待接单',
  [LoadingOrderStatus.Claimed]: '进行中',
  [LoadingOrderStatus.Completed]: '已完成',
};

export interface SimpleNamedDto {
  id: number | string;
  name?: string;
}

export interface AttachmentItemDto {
  attachmentDtlTypeId?: null | number | string;
  attachmentId: number | string;
  clientVisible?: boolean;
  displayOrder?: number;
  friendlyFileName?: string;
  id?: number | string;
  url?: string;
}

export interface AttachmentGroupDto {
  attachmentDtlType?: null | {
    id: number | string;
    name?: string;
    sortId?: number;
    /** 兼容误字段；后端 SimpleDto 是 name */
    typeName?: string;
  };
  attachmentDtlTypeId?: null | number | string;
  items?: AttachmentItemDto[];
}

/** 箱型（监装口径，只有这五个字段可改） */
export interface LoadingOrderCtnDto {
  attachmentGroups?: AttachmentGroupDto[] | null;
  ctnCode?: null | { ctnName?: string; id: number | string; name?: string };
  ctnCodeId?: number | string;
  id: number | string;
  ctnNo?: null | string;
  isLoadingCompleted?: boolean;
  sealNo?: null | string;
}

export interface LoadingOrderRequirementItemDto {
  id: string;
  isChecked?: boolean;
  name?: string;
  remark?: null | string;
  sortId?: number;
}

export interface LoadingOrderRequirementDto {
  id: string;
  loadingRequirementItems?: LoadingOrderRequirementItemDto[] | null;
  name?: string;
  sortId?: number;
}

export interface LoadingOrderUserDto {
  id: string;
  sortId?: number;
  user?: null | {
    avatar?: null | string;
    employeeID?: string;
    enName?: string;
    id: number | string;
    nickName?: string;
  };
  userId: number | string;
}

export interface LoadingOrderSeaExportSimpleDto {
  carrier?: null | {
    cnName?: string;
    cnShortName?: string;
    id: number | string;
  };
  codeGoodss?: SimpleNamedDto[] | null;
  codePackage?: null | { id: number | string; name?: string };
  id: string;
  innerVoyno?: null | string;
  kgs?: null | number;
  mblNum?: null | string;
  pkgs?: null | number;
  vessel?: null | string;
}

export interface LoadingOrderListItemDto {
  carrierYard?: null | { id: string; name?: string };
  codePackageItem?: null | SimpleNamedDto;
  creationTime?: string;
  estimatedArrivalTime?: null | string;
  id: string;
  loadingOrderNum?: string;
  loadingOrderUsers?: LoadingOrderUserDto[] | null;
  pkgs?: null | number;
  remark?: null | string;
  seaExport?: null | LoadingOrderSeaExportSimpleDto;
  seaExportId: string;
  status: number;
}

export interface LoadingOrderDetailDto extends LoadingOrderListItemDto {
  claimTime?: null | string;
  completeTime?: null | string;
  /** 师傅端只返回勾选了的明细，isChecked 恒为 true */
  loadingRequirements?: LoadingOrderRequirementDto[] | null;
  orderCtns?: LoadingOrderCtnDto[] | null;
  rejectReason?: null | string;
  rejectTime?: null | string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
}

export interface LoadingOrderQuery {
  carrierId?: number | string;
  carrierYardId?: string;
  codeGoodsId?: number | string;
  estimatedArrivalDate?: string;
  loadingOrderNum?: string;
  mblNum?: string;
  pageIndex?: number;
  pageSize?: number;
  polId?: number | string;
  sorting?: string;
  status: number;
}

/** 师傅端箱型编辑入参。attachmentGroups 是整箱全量替换，漏传等于清空 */
export interface LoadingOrderCtnEditItem {
  attachmentGroups?: {
    attachmentDtlTypeId?: null | number | string;
    items: {
      attachmentDtlTypeId?: null | number | string;
      attachmentId: number | string;
      clientVisible?: boolean;
      displayOrder?: number;
    }[];
  }[];
  ctnCodeId: number | string;
  ctnNo?: null | string;
  id: number | string;
  isLoadingCompleted?: boolean;
  sealNo?: null | string;
}

const PREFIX = '/services/app/LoadingOrder';

/**
 * 分页查询。status 必填：1 看公共池，2/3 只看自己的。
 */
export function getMyLoadingOrders(query: LoadingOrderQuery) {
  return request<PagedResult<LoadingOrderListItemDto>>({
    url: `${PREFIX}/GetMyPagedListAsync`,
    params: {
      pageIndex: 1,
      pageSize: 10,
      ...query,
    },
  });
}

export function getLoadingOrderDetail(id: string) {
  return request<LoadingOrderDetailDto>({
    url: `${PREFIX}/DetailAsync`,
    params: { id },
  });
}

/** 认领公共池工单。已被别人抢走时后端报「该工单已被【xx】认领」 */
export function claimLoadingOrder(id: string) {
  return request<boolean>({
    url: `${PREFIX}/ClaimAsync`,
    method: 'POST',
    data: { id },
  });
}

/** 拒接。列表还剩人则状态不变，空了退回公共池 */
export function rejectLoadingOrder(id: string, rejectReason?: string) {
  return request<boolean>({
    url: `${PREFIX}/RejectAsync`,
    method: 'POST',
    data: { id, rejectReason },
  });
}

/** 保存箱号/封号/完成勾选/附件。全部箱完成后工单自动变已完成 */
export function editLoadingOrderCtns(
  id: string,
  orderCtns: LoadingOrderCtnEditItem[],
) {
  return request<boolean>({
    url: `${PREFIX}/EditOrderCtnsAsync`,
    method: 'PUT',
    data: { id, orderCtns },
  });
}

/**
 * 取消完成。不会重置各箱的 isLoadingCompleted，
 * 若不手动取消至少一个箱的勾选，下次保存会立刻再次自动完成。
 */
export function cancelLoadingOrderComplete(id: string) {
  return request<boolean>({
    url: `${PREFIX}/CancelCompleteAsync`,
    method: 'POST',
    data: { id },
  });
}

/** 后端在师傅端六个接口上统一抛的属性校验文案 */
export const NO_SUPERVISION_ATTRIBUTE = '用户属性不包含监装';

export function isNoSupervisionError(error: unknown) {
  return (
    error instanceof Error && error.message.includes(NO_SUPERVISION_ATTRIBUTE)
  );
}
