import { requestClient } from '#/api/request';

export namespace FeeLockAdminApi {
  export interface GetFeeLockPagedListParams {
    FeeLocked?: boolean;
    AccountDateStart?: string;
    AccountDateEnd?: string;
    ETDStart?: string;
    ETDEnd?: string;
    Keyword?: string;
    ClientId?: number;
    BizType?: number;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  export interface TransportOrderFeeLockItem {
    transportOrderId: number;
    changeOrderId?: number;
  }

  export interface TransportOrderFeeLockInput {
    items?: TransportOrderFeeLockItem[];
  }

  export interface ChangeOrderDto {
    id: number;
    transportOrderId: number;
    accountDate?: string;
    reason?: string;
    feeLocked?: boolean;
    feeLockedUserId?: number;
    feeLockedTime?: string;
    feeUnLockedUserId?: number;
    feeUnLockedTime?: string;
    sortId?: number;
    remark?: string;
  }

  export interface TransportOrderFeeLockDto {
    id: number;
    showTransportOrder?: boolean;
    changeOrders?: ChangeOrderDto[];
    bizType?: number;
    commissionNum?: string;
    accountDate?: string;
    settlementDate?: string;
    isBusinessLocking?: boolean;
    mblNum?: string;
    bookingNum?: string;
    internalRemark?: string;
    clientId?: number;
    clientName?: string;
    etd?: string;
    eta?: string;
    feeLocked?: boolean;
    feeLockedUserId?: number;
    feeLockedTime?: string;
    feeUnLockedUserId?: number;
    feeUnLockedTime?: string;
    sortId?: number;
    remark?: string;
    creationTime?: string;
  }

  export interface PagedListOfTransportOrderFeeLockDto {
    skipCount?: number;
    maxResultCount?: number;
    items?: TransportOrderFeeLockDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }
}

const API_PREFIX = '/services/app/TransportOrderAdmin';

/** 费用锁定分页列表 */
export const getFeeLockPagedList = (
  params: FeeLockAdminApi.GetFeeLockPagedListParams,
) => {
  return requestClient.get<FeeLockAdminApi.PagedListOfTransportOrderFeeLockDto>(
    `${API_PREFIX}/GetFeeLockPagedListAsync`,
    { params },
  );
};

/** 批量费用锁定 */
export const feeLockAsync = (
  data: FeeLockAdminApi.TransportOrderFeeLockInput,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/FeeLockAsync`, data);
};

/** 批量费用解锁 */
export const feeUnLockAsync = (
  data: FeeLockAdminApi.TransportOrderFeeLockInput,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/FeeUnLockAsync`, data);
};
