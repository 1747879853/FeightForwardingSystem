import { requestClient } from '#/api/request';

export namespace SeaExportAdminApi {
  export interface TransportOrderAddDto {
    commissionNum?: string;
    accountDate?: string;
    settlementDate?: string;
    codeSourceId?: number;
    isBusinessLocking?: boolean;
    isFeeLocking?: boolean;
    mblNum?: string;
    bookingNum?: string;
    codeFrtId?: number;
    codeServiceId?: number;
    tradeTermsType?: number;
    internalRemark?: string;
    marks?: string;
    noPkgs?: string;
    goodsDes?: string;
    kgs?: string;
    cbm?: string;
    signingPortId?: number;
    podId?: number;
    polId?: number;
    poT1Id?: number;
    poT2Id?: number;
    receivePortId?: number;
    deliverPortId?: number;
    clientId: number;
    teamId?: number;
    custBrokerId?: number;
    warehouseId?: number;
    insuranceId?: number;
    consigneeId?: number;
    consigneeContent?: string;
    shipperId?: number;
    shipperContent?: string;
    notifierId?: number;
    notifierContent?: string;
    sortId?: number;
    remark?: string;
  }

  export interface TransportOrderEditDto extends TransportOrderAddDto {
    id: number;
  }

  export interface TransportOrderDto extends TransportOrderAddDto {
    id: number;
    bizType?: number;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
  }

  export interface SeaExportAddDto {
    blType?: number;
    billType?: number;
    secondNotifierId?: number;
    secondNotifierContent?: string;
    podAgentId?: number;
    podAgentContent?: string;
    bookingAgentId?: number;
    shipAgentId?: number;
    yardId?: number;
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    goodsCompleteTime?: string;
    etd?: string;
    eta?: string;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    sortId?: number;
    remark?: string;
    transportOrder?: TransportOrderAddDto;
  }

  export interface SeaExportEditDto {
    id: number;
    blType?: number;
    billType?: number;
    secondNotifierId?: number;
    secondNotifierContent?: string;
    podAgentId?: number;
    podAgentContent?: string;
    bookingAgentId?: number;
    shipAgentId?: number;
    yardId?: number;
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    goodsCompleteTime?: string;
    etd?: string;
    eta?: string;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    sortId?: number;
    remark?: string;
    transportOrder?: TransportOrderEditDto;
  }

  export interface SeaExportDto {
    id: number;
    blType?: number;
    billType?: number;
    secondNotifierId?: number;
    secondNotifierContent?: string;
    podAgentId?: number;
    podAgentContent?: string;
    bookingAgentId?: number;
    shipAgentId?: number;
    yardId?: number;
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    goodsCompleteTime?: string;
    etd?: string;
    eta?: string;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    sortId?: number;
    remark?: string;
    transportOrder?: TransportOrderDto;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
  }

  export interface PagedListOfSeaExportDto {
    skipCount?: number;
    maxResultCount?: number;
    items: SeaExportDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface GetPagedListParams {
    Keyword?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/SeaExportAdmin';

export const getSeaExportPagedList = (
  params: SeaExportAdminApi.GetPagedListParams,
) => {
  return requestClient.get<SeaExportAdminApi.PagedListOfSeaExportDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getSeaExportDetail = (id: number) => {
  return requestClient.get<SeaExportAdminApi.SeaExportDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

export const addSeaExport = (data: SeaExportAdminApi.SeaExportAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

export const editSeaExport = (data: SeaExportAdminApi.SeaExportEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteSeaExport = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
