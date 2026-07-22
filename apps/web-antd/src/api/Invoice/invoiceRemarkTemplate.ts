import { requestClient } from '#/api/request';

/**
 * 发票备注模板相关接口
 */
export namespace InvoiceRemarkTemplateApi {
  /**
   * 公司简易信息
   */
  export interface CompanySimpleDto {
    id: number;
    code: string;
    displayName: string;
    shortName: string;
    enName: string;
    isCompany: boolean;
    localCurrencyId: number;
    unifiedSocialCreditCode: string;
  }

  /**
   * 币别简易信息
   */
  export interface CurrencySimpleDto {
    code: string;
    cnName: string;
    enName: string;
    defaultRate: number;
  }

  /**
   * 发票备注模板详情DTO
   */
  /** 组织机构简易DTO（组织串 orgs 元素） */
  export interface OrganizationUnitSimpleDto {
    /** 组织id */
    id: number;
    /** 组织名 */
    name?: string;
    /** 本位币id，可空 */
    localCurrencyId?: null | number;
    /** 本位币编码，可空 */
    localCurrencyCode?: null | string;
  }

  export interface InvoiceRemarkTemDetailDto {
    id: string;
    name: string;
    /** 归属组织id（备注模板必填，恒为有效组织id） */
    orgId: number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    currencyId: number;
    template: string;
    default: boolean;
    creatorUserName: string;
    currency: CurrencySimpleDto;
  }

  /**
   * 发票备注模板列表DTO
   */
  export interface InvoiceRemarkTemListDto extends InvoiceRemarkTemDetailDto {}

  /**
   * 新增发票备注模板DTO
   */
  export interface InvoiceRemarkTemAddDto {
    name: string;
    /** 归属组织id */
    orgId: number;
    currencyId: number;
    template?: string;
    default: boolean;
  }

  /**
   * 修改发票备注模板DTO
   */
  export interface InvoiceRemarkTemEditDto extends InvoiceRemarkTemAddDto {
    id: string;
  }

  /**
   * 删除发票备注模板DTO
   */
  export interface InvoiceRemarkTemDeleteDto {
    id: string;
  }

  /**
   * 查询参数DTO
   */
  export interface InvoiceRemarkTemQueryDto {
    name?: string;
    currencyId?: number;
    default?: boolean;
    template?: string;
    creatorUserId?: number;
    orgId?: number;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  /**
   * 分页结果
   */
  export interface PagedList<T> {
    items: T[];
    totalCount: number;
    pageIndex: number;
    pageSize: number;
  }

  /**
   * 新增发票备注模板
   * @param data 新增数据
   * @returns 新建ID (Guid)
   */
  export function addAsync(data: InvoiceRemarkTemAddDto) {
    return requestClient.post<string>(
      '/services/app/InvoiceRemarkTemAdmin/AddAsync',
      data,
    );
  }

  /**
   * 修改发票备注模板
   * @param data 修改数据
   * @returns 是否成功
   */
  export function editAsync(data: InvoiceRemarkTemEditDto) {
    return requestClient.put<boolean>(
      '/services/app/InvoiceRemarkTemAdmin/EditAsync',
      data,
    );
  }

  /**
   * 删除发票备注模板
   * @param data 删除数据
   * @returns 是否成功
   */
  export function deleteAsync(data: InvoiceRemarkTemDeleteDto) {
    return requestClient.delete<boolean>(
      '/services/app/InvoiceRemarkTemAdmin/DeleteAsync',
      { data },
    );
  }

  /**
   * 获取发票备注模板详情
   * @param id 主键ID
   * @returns 详情数据
   */
  export function detailAsync(id: string) {
    return requestClient.get<InvoiceRemarkTemDetailDto>(
      '/services/app/InvoiceRemarkTemAdmin/DetailAsync',
      {
        params: { id },
      },
    );
  }

  /**
   * 获取发票备注模板分页列表
   * @param params 查询参数
   * @returns 分页数据
   */
  export function getPagedListAsync(params: InvoiceRemarkTemQueryDto) {
    return requestClient.get<PagedList<InvoiceRemarkTemListDto>>(
      '/services/app/InvoiceRemarkTemAdmin/GetPagedListAsync',
      { params },
    );
  }
}
