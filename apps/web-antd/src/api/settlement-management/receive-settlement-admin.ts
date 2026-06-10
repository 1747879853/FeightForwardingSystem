import { requestClient } from '#/api/request';

const API_ADMIN_PREFIX = '/services/app/ReceiveSettlementAdmin';

export namespace ReceiveSettlementAdminApi {
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
  }

  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    clientName?: string;
  }

  export interface ReceiveSettlementFeeDto {
    id: string;
    feeCodeName?: string;
    currencyCode?: string;
    amount: number;
    remainingAmount: number;
    settlementName?: string;
  }

  export interface ReceiveSettlementFeeGroupDto {
    transportOrder: TransportOrderSimpleDto;
    orderFees: ReceiveSettlementFeeDto[];
  }

  export interface ReceiveSettlementFeeGroupQueryDto {
    receiveSettlementId?: string;
    settlementId?: string;
    commissionNum?: string;
    mblNum?: string;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  export interface ReceiveSettlementItemAddDto {
    orderFeeId: string;
    settledAmount: number;
    remark?: string;
  }

  export interface ReceiveSettlementAddDto {
    bankStatementId: string;
    settlementTime: string;
    remark?: string;
    receiveSettlementItems: ReceiveSettlementItemAddDto[];
  }

  export interface ReceiveSettlementAddItemsDto {
    id: string;
    receiveSettlementItems: ReceiveSettlementItemAddDto[];
  }

  export interface ReceiveSettlementDeleteItemsDto {
    id: string;
    receiveSettlementItemIds: string[];
  }

  export interface ReceiveSettlementEditDto {
    id: string;
    settlementTime: string;
    remark?: string;
  }

  export interface ReceiveSettlementDeleteDto {
    id: string;
  }

  export interface ReceiveSettlementLockDto {
    id: string;
  }

  export interface OrderFeeDto {
    id: string;
    feeCodeName?: string;
    currencyCode?: string;
    amount?: number;
    remainingAmount?: number;
    settlementName?: string;
    remark?: string;
  }

  export interface ReceiveSettlementItemDetailDto {
    id: string;
    receiveSettlementId: string;
    orderFeeId: string;
    settledAmount: number;
    remark?: string;
    orderFee?: OrderFeeDto;
    transportOrder?: TransportOrderSimpleDto;
  }

  export interface ReceiveSettlementDetailDto {
    id: string;
    bankStatementId: string;
    settlementNo?: string;
    status: number;
    settlementTime: string;
    locked: boolean;
    lockeTime?: string;
    remark?: string;
    creatorUserName?: string;
    bankStatementNo?: string;
    receiveSettlementItems: ReceiveSettlementItemDetailDto[];
  }

  export interface ReceiveSettlementListDto {
    id: string;
    bankStatementId: string;
    settlementNo?: string;
    status: number;
    settlementTime: string;
    locked: boolean;
    lockeTime?: string;
    remark?: string;
    creatorUserName?: string;
    bankStatementNo?: string;
    totalSettledAmount: number;
    itemCount: number;
    creationTime?: string;
  }

  export interface ReceiveSettlementQueryDto {
    bankStatementId?: string;
    settlementNo?: string;
    settlementTimeStart?: string;
    settlementTimeEnd?: string;
    creatorUserId?: number;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }
}

export const getOrderFeeGroupForReceiveSettlement = (
  params: ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupQueryDto,
) => {
  return requestClient.get<
    ReceiveSettlementAdminApi.PagedList<ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto>
  >(`${API_ADMIN_PREFIX}/GetOrderFeeGroupAsync`, { params });
};

export const addReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementAddDto,
) => {
  return requestClient.post<string>(`${API_ADMIN_PREFIX}/AddAsync`, data);
};

export const addReceiveSettlementItems = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementAddItemsDto,
) => {
  return requestClient.post<boolean>(`${API_ADMIN_PREFIX}/AddItemsAsync`, data);
};

export const deleteReceiveSettlementItems = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementDeleteItemsDto,
) => {
  return requestClient.post<boolean>(
    `${API_ADMIN_PREFIX}/DeleteItemsAsync`,
    data,
  );
};

export const editReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementEditDto,
) => {
  return requestClient.put<boolean>(`${API_ADMIN_PREFIX}/EditAsync`, data);
};

export const deleteReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_ADMIN_PREFIX}/DeleteAsync`, {
    data,
  });
};

export const getReceiveSettlementDetail = (id: string) => {
  return requestClient.get<ReceiveSettlementAdminApi.ReceiveSettlementDetailDto>(
    `${API_ADMIN_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

export const getReceiveSettlementPagedList = (
  params: ReceiveSettlementAdminApi.ReceiveSettlementQueryDto,
) => {
  return requestClient.get<
    ReceiveSettlementAdminApi.PagedList<ReceiveSettlementAdminApi.ReceiveSettlementListDto>
  >(`${API_ADMIN_PREFIX}/GetPagedListAsync`, { params });
};

export const lockReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementLockDto,
) => {
  return requestClient.put<boolean>(`${API_ADMIN_PREFIX}/LockAsync`, data);
};

export const unlockReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementLockDto,
) => {
  return requestClient.put<boolean>(`${API_ADMIN_PREFIX}/UnLockAsync`, data);
};
