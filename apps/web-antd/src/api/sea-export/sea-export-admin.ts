import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';
import type { UserAttribute } from '#/api/system/user-admin';

import { requestClient } from '#/api/request';

export namespace SeaExportAdminApi {
  /** 业务箱型新增输入 */
  export interface OrderCtnAddDto {
    /** 箱型id */
    ctnCodeId?: number;
    /** 箱号 */
    ctnNo?: string;
    /** 封号 */
    sealNo?: string;
    /** 件数 */
    pkgs?: number;
    /** 包装id */
    codePackageId?: number;
    /** 毛重 */
    grossWeight?: number;
    /** 皮重 */
    tareWeight?: number;
    /** 超长 */
    overLength?: number;
    /** 超宽 */
    overWidth?: number;
    /** 超高 */
    overHeight?: number;
    /** 体积 */
    volume?: number;
    /** 商品信息(品名)id */
    codeGoodsId?: number;
    /** 订舱号 */
    bookingNo?: string;
    /** 备注 */
    remark?: string;
  }

  /** 业务商品信息新增输入 */
  export interface OrderCodeGoodsAddDto {
    /** 商品信息id */
    codeGoodsId?: number;
  }

  /** 业务相关用户新增输入 */
  export interface OrderUserAddDto {
    /** 用户Id */
    userId?: number;
    /** 用户属性 */
    userAttribute?: UserAttribute;
    /** 排序id */
    sortId?: number;
    /** 备注 */
    remark?: string;
  }

  export interface TransportOrderAddDto {
    commissionNum?: string;
    accountDate?: string;
    settlementDate?: string;
    codeSourceId?: number;
    isBusinessLocking?: boolean;
    feeLocked?: boolean;
    mblNum?: string;
    bookingNum?: string;
    codeFrtId?: number;
    prepareAtId?: number;
    codeServiceId?: number;
    cargoId?: number;
    tradeTermsType?: number;
    internalRemark?: string;
    marks?: string;
    pkgs?: number;
    codePackageId?: number;
    goodsDes?: string;
    kgs?: number;
    cbm?: number;
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
    goodsCompleteTime?: string;
    etd?: string;
    eta?: string;
    /** 品名列表 */
    orderCodeGoodss?: OrderCodeGoodsAddDto[];
    /** 箱型箱量列表 */
    orderCtns?: OrderCtnAddDto[];
    /** 业务相关用户列表 */
    orderUsers?: OrderUserAddDto[];
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

  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string;
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
    /** 签单方式id（新版字段） */
    codeIssueTypeId?: number;
    /** 签单方式id（旧字段，兼容） */
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    signingPortId?: number;
    podId?: number;
    podRemark?: string;
    polId?: number;
    polRemark?: string;
    poT1Id?: number;
    poT1Remark?: string;
    poT2Id?: number;
    poT2Remark?: string;
    receivePortId?: number;
    receivePortRemark?: string;
    deliverPortId?: number;
    deliverPortRemark?: string;
    sortId?: number;
    remark?: string;
    serviceTypes?: number[];
    organizationUnits?: OrganizationUnitSimpleDto[];
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
    /** 签单方式id（新版字段） */
    codeIssueTypeId?: number;
    /** 签单方式id（旧字段，兼容） */
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    signingPortId?: number;
    podId?: number;
    podRemark?: string;
    polId?: number;
    polRemark?: string;
    poT1Id?: number;
    poT1Remark?: string;
    poT2Id?: number;
    poT2Remark?: string;
    receivePortId?: number;
    receivePortRemark?: string;
    deliverPortId?: number;
    deliverPortRemark?: string;
    sortId?: number;
    remark?: string;
    serviceTypes?: number[];
    organizationUnits?: OrganizationUnitSimpleDto[];
    transportOrder?: TransportOrderEditDto;
  }

  export interface SeaExportDto {
    id: number;
    blType?: number;
    billType?: number;
    secondNotifierId?: number;
    secondNotifierContent?: string;
    secondNotifier?: ClientAdminApi.ClientDto;
    secondNotifierName?: string;
    podAgentId?: number;
    podAgentContent?: string;
    podAgent?: ClientAdminApi.ClientDto;
    podAgentName?: string;
    bookingAgentId?: number;
    bookingAgent?: ClientAdminApi.ClientDto;
    bookingAgentName?: string;
    shipAgentId?: number;
    shipAgent?: ClientAdminApi.ClientDto;
    shipAgentName?: string;
    yardId?: number;
    yard?: ClientAdminApi.ClientDto;
    yardName?: string;
    /** 签单方式id（新版字段） */
    codeIssueTypeId?: number;
    /** 签单方式名称（新版字段） */
    codeIssueTypeName?: string;
    /** 签单方式id（旧字段，兼容） */
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    carrier?: CarrierAdminApi.CarrierDto;
    carrierName?: string;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    signingPortId?: number;
    signingPortName?: string;
    podId?: number;
    podName?: string;
    podRemark?: string;
    polId?: number;
    polName?: string;
    polRemark?: string;
    poT1Id?: number;
    poT1Name?: string;
    poT1Remark?: string;
    poT2Id?: number;
    poT2Name?: string;
    poT2Remark?: string;
    receivePortId?: number;
    receivePortName?: string;
    receivePortRemark?: string;
    deliverPortId?: number;
    deliverPortName?: string;
    deliverPortRemark?: string;
    sortId?: number;
    remark?: string;
    serviceTypes?: number[];
    organizationUnits?: OrganizationUnitSimpleDto[];
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
