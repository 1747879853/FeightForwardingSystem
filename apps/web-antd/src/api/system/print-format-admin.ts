import { requestClient } from '#/api/request';

import {
  PrintExportFormat,
  PrintJsonType,
} from '#/components/print-format/types';

export namespace PrintFormatAdminApi {
  /** 签单方式简易对象 */
  export interface CodeIssueTypeSimpleDto {
    id: number;
    billType?: string | null;
    enName?: string | null;
  }

  /** 船公司简易对象 */
  export interface CarrierSimpleDto {
    id: number;
    code?: string | null;
    cnName?: string | null;
    enName?: string | null;
  }

  /** 组织简易对象 */
  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string | null;
  }

  export interface PrintFormatDto {
    id: string;
    name?: string | null;
    printJsonId: string;
    printJsonPrintJsonType: PrintJsonType;
    sortId: number;
    remark?: string | null;
    /** 签单方式 id（弱外键） */
    codeIssueTypeId?: number | null;
    /** 船公司 id（弱外键） */
    carrierId?: number | null;
    /** 组织 id（弱外键） */
    orgId?: number | null;
    /** 打印文件名 */
    fileName?: string | null;
    /** 签单方式简易对象（列表接口返回） */
    codeIssueType?: CodeIssueTypeSimpleDto | null;
    /** 船公司简易对象（列表接口返回） */
    carrier?: CarrierSimpleDto | null;
    /** 组织简易对象（列表接口返回） */
    org?: OrganizationUnitSimpleDto | null;
    creationTime?: string;
    creatorUserId?: number | null;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
  }

  export interface PrintFormatQueryDto {
    keyword?: string;
    printJsonId?: string;
    printJsonType?: PrintJsonType;
    /** 签单方式 id */
    codeIssueTypeId?: number | null;
    /** 船公司 id */
    carrierId?: number | null;
    /** 组织 id */
    orgId?: number | null;
    /** 打印文件名（模糊匹配） */
    fileName?: string;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  export interface PagedList<T> {
    items: T[];
    totalCount: number;
    skipCount?: number;
    maxResultCount?: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 兼容旧版：前端拼接 json 的打印入参 */
  export interface GetPrintFileDto {
    printFormatId: string;
    json: string;
    /** 导出格式，缺省为 PDF（0）；1=Excel，2=Word */
    format?: PrintExportFormat;
  }

  /** GuidIdDto：详情类/更改单类取数入参 */
  export interface GuidIdDto {
    id?: string;
    ids?: string[];
  }

  /** 费用列表取数入参（等价 OrderFeeAdmin/GetPagedListAsync 入参） */
  export interface OrderFeeQueryDto {
    /** 业务(TransportOrder) id */
    transportOrderId?: string;
    /** 指定费用 id 列表：传值时仅取这些费用，不传则取该业务全部费用 */
    ids?: string[];
    /** 收付类型（由后端按类型覆盖，前端无需填写） */
    paySide?: number;
    feeStatus?: number;
    settlementStatus?: number;
    invoiceStatus?: number;
    feeCodeId?: number;
    industryCategory?: number;
    settlementId?: string;
    currencyId?: number;
    isConfidential?: boolean;
    keyword?: string;
    pageIndex?: number;
    pageSize?: number;
    sorting?: string;
  }

  /** 后端自动取数打印入参 */
  export interface GetPrintDto {
    printFormatId: string;
    printJsonType: PrintJsonType;
    /** 详情类/更改单类入参 */
    detailInput?: GuidIdDto;
    /** 费用列表类入参 */
    orderFeeListInput?: OrderFeeQueryDto;
    /** 是否更改单打印（仅费用列表类有效） */
    isChangeOrderPrint?: boolean;
    /** 导出格式，缺省为 PDF（0）；1=Excel，2=Word */
    format?: PrintExportFormat;
  }
}

const API_PREFIX = '/services/app/PrintFormatAdmin';
/** 非管理端打印格式接口（登录即可访问，签单方式/船公司/组织"相等或为空"匹配） */
const PRINT_FORMAT_PREFIX = '/services/app/PrintFormat';

/** 组装打印格式列表查询参数（管理端与非管理端共用） */
function buildPrintFormatQueryParams(
  params: PrintFormatAdminApi.PrintFormatQueryDto,
) {
  return {
    Keyword: params.keyword,
    PrintJsonId: params.printJsonId,
    PrintJsonType: params.printJsonType,
    CodeIssueTypeId: params.codeIssueTypeId,
    CarrierId: params.carrierId,
    OrgId: params.orgId,
    FileName: params.fileName,
    PageIndex: params.pageIndex,
    PageSize: params.pageSize,
    Sorting: params.sorting,
  };
}

/** 管理端打印格式分页列表 */
export function getPrintFormatPagedList(
  params: PrintFormatAdminApi.PrintFormatQueryDto,
) {
  return requestClient.get<
    PrintFormatAdminApi.PagedList<PrintFormatAdminApi.PrintFormatDto>
  >(`${API_PREFIX}/GetPagedListAsync`, {
    params: buildPrintFormatQueryParams(params),
  });
}

/**
 * 非管理端打印格式列表（登录即可访问）。
 * 与管理端入参一致，区别在于 codeIssueTypeId/carrierId/orgId 按"相等或为空"匹配，
 * 用于业务打印时按当票的签单方式/船公司/分公司筛选可用模板。
 */
export function getPrintFormatList(
  params: PrintFormatAdminApi.PrintFormatQueryDto,
) {
  return requestClient.get<
    PrintFormatAdminApi.PagedList<PrintFormatAdminApi.PrintFormatDto>
  >(`${PRINT_FORMAT_PREFIX}/GetPagedListAsync`, {
    params: buildPrintFormatQueryParams(params),
  });
}

/** 兼容旧版：前端拼接 json 执行打印，返回生成的文件名 */
export function printFormatAsync(data: PrintFormatAdminApi.GetPrintFileDto) {
  return requestClient.post<string>(`${API_PREFIX}/PrintAsync`, data);
}

/**
 * 按数据源类型由后端自动取数打印，返回生成的文件名。
 * 前端无需拼接业务 json，仅按 printJsonType 传对应业务接口的真实入参。
 */
export function getPrintAsync(data: PrintFormatAdminApi.GetPrintDto) {
  return requestClient.post<string>(`${API_PREFIX}/GetPrintAsync`, data);
}
