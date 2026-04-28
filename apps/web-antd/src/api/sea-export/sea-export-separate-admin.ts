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
    ctnCodeName?: string;
    codePackageName?: string;
    codeGoodsName?: string;
    codeGoodsHSCode?: string;
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
    consigneeName?: string;
    shipperId?: string;
    shipperContent?: string;
    shipperName?: string;
    notifierId?: string;
    notifierContent?: string;
    notifierName?: string;
    podAgentId?: string;
    podAgentContent?: string;
    podAgentName?: string;
    blNum?: string;
    marks?: string;
    pkgs?: number;
    codePackageId?: number;
    codePackageName?: string;
    kgs?: number;
    cbm?: number;
    goodsDes?: string;
    codeIssueTypeId?: number;
    codeIssueTypeName?: string;
    signingPortId?: number;
    signingPortName?: string;
    signingTime?: string;
    codeFrtId?: number;
    codeFrtName?: string;
    prepareAtId?: number;
    prepareAtName?: string;
    codeServiceId?: number;
    codeServiceName?: string;
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
