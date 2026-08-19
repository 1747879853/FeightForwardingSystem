import { requestClient } from '#/api/request';

export namespace SeServiceConfigAdminApi {
  /** 费用代码简易对象 */
  export interface FeeCodeSimpleDto {
    id?: number | string;
    code?: string;
    cnName?: string;
    enName?: string;
  }

  export interface SeaExportPropRefDto {
    id?: string;
    seaExportPropEnum: number;
    /** 扩展类型的具体值；附件类型(10001)为 `"1|2"`，普通字段为 null */
    requireValues?: string | null;
  }

  /** 必填费用-新增输入；paySide：0=应收，1=应付 */
  export interface SeServiceRequireFeeAddDto {
    paySide: number;
    feeCodeId: number | string;
  }

  /** 必填费用-编辑输入；有 id 表示修改，无 id 表示新增 */
  export interface SeServiceRequireFeeEditDto {
    id?: string;
    paySide: number;
    feeCodeId: number | string;
  }

  /** 必填费用-输出 */
  export interface SeServiceRequireFeeDto {
    id?: string;
    paySide: number;
    feeCodeId: number | string;
    /** 费用代码对象（替代 feeCodeName，名称读 cnName） */
    feeCode?: FeeCodeSimpleDto | null;
  }

  export interface SeServiceConfigItemAddDto {
    serviceType: number;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    requireFee?: boolean;
    sortId?: number;
    remark?: string;
    seServiceShows?: SeaExportPropRefDto[];
    seServiceLocks?: SeaExportPropRefDto[];
    seServiceRequires?: SeaExportPropRefDto[];
    seServiceRequireFees?: SeServiceRequireFeeAddDto[];
  }

  export interface SeServiceConfigItemEditDto {
    id?: string;
    serviceType: number;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    requireFee?: boolean;
    sortId?: number;
    remark?: string;
    seServiceShows?: SeaExportPropRefDto[];
    seServiceLocks?: SeaExportPropRefDto[];
    seServiceRequires?: SeaExportPropRefDto[];
    seServiceRequireFees?: SeServiceRequireFeeEditDto[];
  }

  export interface SeServiceConfigAddDto {
    /** 起运港 ID；为空表示默认港口配置 */
    polId?: number | string | null;
    sortId?: number;
    remark?: string;
    seServiceConfigItems?: SeServiceConfigItemAddDto[];
  }

  export interface SeServiceConfigEditDto {
    id: string;
    /** 起运港 ID；为空表示默认港口配置 */
    polId?: number | string | null;
    sortId?: number;
    remark?: string;
    seServiceConfigItems?: SeServiceConfigItemEditDto[];
  }

  export interface PortSimpleDto {
    id: number | string;
    portName?: string;
    cnName?: string;
  }

  export interface SeServiceConfigItemListDto {
    id: string;
    seServiceConfigId: string;
    serviceType: number;
    serviceTypeText?: string;
    serviceTypeName?: string;
    serviceTypeDisplayName?: string;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    requireFee?: boolean;
    sortId?: number;
    remark?: string;
  }

  export interface SeServiceConfigListDto {
    id: string;
    polId?: number | string | null;
    pol?: PortSimpleDto;
    sortId?: number;
    remark?: string;
    serviceItemCount: number;
    serviceTypes?: number[];
    seServiceConfigItems?: SeServiceConfigItemListDto[];
    creationTime?: string;
    creatorUserId?: number;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
  }

  export interface UserAttributeServiceTypesDto {
    userAttribute: number;
    serviceTypes: number[];
  }

  export interface SeServiceConfigItemDetailDto {
    id?: string;
    seServiceConfigId?: string;
    serviceType: number;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    requireFee?: boolean;
    sortId?: number;
    remark?: string;
    seServiceShows?: SeaExportPropRefDto[];
    seServiceLocks?: SeaExportPropRefDto[];
    seServiceRequires?: SeaExportPropRefDto[];
    seServiceRequireFees?: SeServiceRequireFeeDto[];
  }

  export interface SeServiceConfigDetailDto {
    id: string;
    polId?: number | string | null;
    pol?: PortSimpleDto;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    creatorUserId?: number;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
    seServiceConfigItems?: SeServiceConfigItemDetailDto[];
    userAttributeServiceTypes?: UserAttributeServiceTypesDto[];
  }

  export interface PagedListOfSeServiceConfigListDto {
    items: SeServiceConfigListDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface GetPagedListParams {
    polId?: number | string;
    serviceType?: number;
    pageIndex?: number;
    pageSize?: number;
    sorting?: string;
  }

  export interface DeleteDto {
    id?: string;
    ids?: string[];
  }
}

const API_PREFIX = '/services/app/SeServiceConfigAdmin';

export const getSeServiceConfigPagedList = (
  params: SeServiceConfigAdminApi.GetPagedListParams,
) => {
  return requestClient.get<SeServiceConfigAdminApi.PagedListOfSeServiceConfigListDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getSeServiceConfigDetail = (id: string) => {
  return requestClient.get<SeServiceConfigAdminApi.SeServiceConfigDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    {
      params: { id },
    },
  );
};

export const addSeServiceConfig = (
  data: SeServiceConfigAdminApi.SeServiceConfigAddDto,
) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

export const editSeServiceConfig = (
  data: SeServiceConfigAdminApi.SeServiceConfigEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteSeServiceConfig = (
  data: SeServiceConfigAdminApi.DeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, { data });
};
