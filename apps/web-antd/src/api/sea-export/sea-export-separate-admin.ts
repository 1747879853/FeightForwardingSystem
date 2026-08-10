import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { requestClient } from '#/api/request';

export namespace SeaExportSeparateAdminApi {
  export interface SeparateCtnAddDto {
    ctnCodeId?: number;
    ctnNo?: string;
    sealNo?: string;
    pkgs?: number;
    codePackageId?: number;
    grossWeight?: number;
    tareWeight?: number;
    overLength?: number;
    overWidth?: number;
    overHeight?: number;
    volume?: number;
    codeGoodsId?: number;
    bookingNo?: string;
    remark?: string;
  }

  export interface SeparateCtnEditDto extends SeparateCtnAddDto {
    id?: number | string | null;
  }

  export interface SeparateCtnDto extends SeparateCtnEditDto {
    seaExportSeparateId?: string;
    /** 箱型对象（替代 ctnCodeName） */
    ctnCode?: SeaExportAdminApi.CtnCodeSimpleDto | null;
    /** 包装对象（替代 codePackageName） */
    codePackage?: SeaExportAdminApi.CodePackageSimpleDto | null;
    /** 品名对象（替代 codeGoodsName / codeGoodsHSCode） */
    codeGoods?: SeaExportAdminApi.CodeGoodsSimpleDto | null;
  }

  export interface SeparateAddDto {
    seaExportId: string;
    consigneeId?: string;
    consigneeContent?: string;
    shipperId?: string;
    shipperContent?: string;
    notifierId?: string;
    notifierContent?: string;
    podAgentId?: string;
    podAgentContent?: string;
    blNum?: string;
    marks?: string;
    pkgs?: number;
    codePackageId?: number;
    kgs?: number;
    cbm?: number;
    goodsDes?: string;
    codeIssueTypeId?: number;
    signingPortId?: number;
    signingTime?: string;
    codeFrtId?: number;
    prepareAtId?: number;
    codeServiceId?: number;
    seaExportSeparateCtns?: SeparateCtnAddDto[];
  }

  export interface SeparateEditDto extends SeparateAddDto {
    id: string;
    seaExportSeparateCtns?: SeparateCtnEditDto[];
  }

  export interface SeparateDto {
    id: string;
    seaExportId: string;
    consigneeId?: string;
    consigneeContent?: string;
    /** 收货人对象（替代 consigneeName） */
    consignee?: ClientAdminApi.ClientDto | null;
    shipperId?: string;
    shipperContent?: string;
    /** 发货人对象（替代 shipperName） */
    shipper?: ClientAdminApi.ClientDto | null;
    notifierId?: string;
    notifierContent?: string;
    /** 通知人对象（替代 notifierName） */
    notifier?: ClientAdminApi.ClientDto | null;
    podAgentId?: string;
    podAgentContent?: string;
    /** 目的港代理对象（替代 podAgentName） */
    podAgent?: ClientAdminApi.ClientDto | null;
    blNum?: string;
    marks?: string;
    pkgs?: number;
    codePackageId?: number;
    /** 包装对象（替代 codePackageName） */
    codePackage?: SeaExportAdminApi.CodePackageSimpleDto | null;
    kgs?: number;
    cbm?: number;
    goodsDes?: string;
    codeIssueTypeId?: number;
    /** 签单方式对象（替代 codeIssueTypeName，名称读 billType） */
    codeIssueType?: SeaExportAdminApi.CodeIssueTypeSimpleDto | null;
    signingPortId?: number;
    /** 签单地点港口对象（替代 signingPortName / signingPortCountryEnName） */
    signingPort?: SeaExportAdminApi.PortCodeSimpleDtoForOrder | null;
    signingTime?: string;
    codeFrtId?: number;
    /** 付费方式对象（替代 codeFrtName） */
    codeFrt?: SeaExportAdminApi.CodeFrtSimpleDto | null;
    prepareAtId?: number;
    /** 付费地点港口对象（替代 prepareAtName / prepareAtCountryEnName） */
    prepareAt?: SeaExportAdminApi.PortCodeSimpleDtoForOrder | null;
    codeServiceId?: number;
    /** 运输条款对象（替代 codeServiceName） */
    codeService?: SeaExportAdminApi.CodeServiceSimpleDto | null;
    creationTime?: string;
    creatorUserId?: number;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    seaExportSeparateCtns?: SeparateCtnDto[];
  }

  export interface PagedListOfSeparateDto {
    items: SeparateDto[];
    totalCount: number;
    pageIndex?: number;
    pageSize?: number;
  }

  export interface GetPagedListParams {
    seaExportId: string;
    keyword?: string;
    pageIndex?: number;
    pageSize?: number;
    sorting?: string;
  }
}

const API_PREFIX = '/services/app/SeaExportSeparateAdmin';

export const getSeparatePagedList = (
  params: SeaExportSeparateAdminApi.GetPagedListParams,
) => {
  return requestClient.get<SeaExportSeparateAdminApi.PagedListOfSeparateDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getSeparateDetail = (id: string) => {
  return requestClient.get<SeaExportSeparateAdminApi.SeparateDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

export const addSeparate = (data: SeaExportSeparateAdminApi.SeparateAddDto) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

export const editSeparate = (
  data: SeaExportSeparateAdminApi.SeparateEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteSeparate = (params: { id?: string; ids?: string[] }) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: params,
  });
};
