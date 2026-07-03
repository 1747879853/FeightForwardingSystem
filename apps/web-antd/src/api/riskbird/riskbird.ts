import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace RiskbirdApi {
  // ==================== DTO 定义 ====================

  /** 企业搜索入参DTO */
  export interface RiskbirdCompanySearchDto {
    /** 关键字（企业名称，模糊查询） */
    Keyword?: string;
    /** 客户ID（传入时使用客户的FullName作为查询关键字） */
    ClientId?: string;
  }

  /** 企业详情入参DTO */
  export interface RiskbirdCompanyDetailInputDto {
    /** 风鸟返回的企业ID */
    entId: string;
    /** 客户ID（传入时将工商信息回写到客户表） */
    ClientId?: string;
  }

  /** 企业搜索结果项DTO */
  export interface RiskbirdCompanySearchResultDto {
    /** 企业ID */
    id: string;
    /** 企业名称 */
    name: string;
    /** 统一社会信用代码 */
    uniscid?: string;
    /** 法人 */
    personName?: string;
    /** 注册资本 */
    regConcat?: string;
    /** 成立日期 */
    esDate?: string;
    /** 地址 */
    dom?: string;
    /** 状态 */
    status?: string;
    [key: string]: any;
  }

  /** 企业详细信息DTO */
  export interface RiskbirdCompanyDetailDto {
    /** 企业ID */
    entId: string;
    /** 企业名称 */
    entName?: string;
    /** 统一社会信用代码 */
    uniscid?: string;
    /** 法人 */
    personName?: string;
    /** 注册资本 */
    regConcat?: string;
    /** 实收资本 */
    recCap?: string;
    /** 成立日期 */
    esDate?: string;
    /** 营业期限起 */
    opFrom?: number;
    /** 营业期限止 */
    opTo?: number;
    /** 地址 */
    dom?: string;
    /** 经营范围 */
    scope?: string;
    /** 英文名称 */
    enName?: string;
    /** 官网网址 */
    website?: string;
    /** 电话 */
    tel?: string;
    /** 邮箱 */
    email?: string;
    /** 企业类型 */
    type?: string;
    /** 行业 */
    industry?: string;
    /** 登记机关 */
    belongOrg?: string;
    /** 核准日期 */
    approvedDate?: string;
    /** 工商注册号 */
    regNum?: string;
    /** 组织机构代码 */
    orgNumber?: string;
    /** 纳税人资质 */
    taxpayerType?: string;
    /** 参保人数 */
    insuredCount?: number;
    /** 曾用名 */
    historyNames?: string;
    /** 英文名 */
    enterpriseNameEng?: string;
    /** 注册地址 */
    regAddr?: string;
    /** 最新年报年份 */
    latestReportYear?: string;
    /** 是否上市 */
    isListed?: boolean;
    /** 上市类型 */
    listedType?: string;
    /** 企业标签 */
    tags?: string[];
    /** 风险信息 */
    riskInfo?: any;
    /** 基本信息JSON（原始数据） */
    jbxxInfo?: Recordable<any>;
    [key: string]: any;
  }

  /** 风鸟账号列表项DTO */
  export interface RiskbirdAccountDto {
    /** 账号ID */
    id: number;
    /** 别名 */
    name?: string;
    /** 用户名 */
    userName: string;
    /** 是否启用 */
    isEnabled: boolean;
    /** 登录态是否有效 */
    isLogged: boolean;
    /** 最后登录时间 */
    lastLoginTime?: string;
    /** Token过期时间 */
    tokenExpireTime?: string;
    /** 备注 */
    remark?: string;
    /** 租户ID */
    tenantId: number;
    /** 创建时间 */
    creationTime: string;
    /** 最后修改时间 */
    lastModificationTime?: string;
  }

  /** 风鸟账号保存DTO（新增/编辑） */
  export interface RiskbirdAccountSaveDto {
    /** 账号ID（编辑时传入） */
    id?: number;
    /** 别名 */
    name?: string;
    /** 用户名 */
    userName: string;
    /** 密码（新增时必填，编辑时留空表示不修改） */
    password?: string;
    /** 是否启用 */
    isEnabled: boolean;
    /** 备注 */
    remark?: string;
  }

  /** 分页列表响应 */
  export interface PagedList<T> {
    skipCount: number;
    maxResultCount: number;
    items: T[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** API响应包装器 */
  export interface ApiResponse<T> {
    result: T;
    targetUrl: string | null;
    success: boolean;
    error: string | null;
    unAuthorizedRequest: boolean;
    __abp: boolean;
  }

  // ==================== API 方法定义 ====================

  /**
   * 搜索企业信息
   * POST services/app/RiskbirdAdmin/SearchCompanyAsync
   * @param data 搜索条件
   */
  export const searchCompanyAsync = (data: RiskbirdCompanySearchDto) => {
    return requestClient.post<PagedList<RiskbirdCompanySearchResultDto>>(
      'services/app/RiskbirdAdmin/SearchCompanyAsync',
      data,
    );
  };

  /**
   * 获取企业详细信息
   * POST services/app/RiskbirdAdmin/GetCompanyDetailAsync
   * @param data 查询条件（含CompanyId和可选的ClientId用于回写）
   */
  export const getCompanyDetailAsync = (
    data: RiskbirdCompanyDetailInputDto,
  ) => {
    return requestClient.post<RiskbirdCompanyDetailDto>(
      'services/app/RiskbirdAdmin/GetCompanyDetailAsync',
      data,
    );
  };

  /**
   * 获取风鸟账号列表
   * GET services/app/RiskbirdAdmin/GetAccountListAsync
   */
  export const getAccountListAsync = () => {
    return requestClient.get<PagedList<RiskbirdAccountDto>>(
      'services/app/RiskbirdAdmin/GetAccountListAsync',
    );
  };

  /**
   * 保存风鸟账号（新增或编辑）
   * POST services/app/RiskbirdAdmin/SaveAccountAsync
   * @param data 账号信息
   */
  export const saveAccountAsync = (data: RiskbirdAccountSaveDto) => {
    return requestClient.post<boolean>(
      'services/app/RiskbirdAdmin/SaveAccountAsync',
      data,
    );
  };

  /**
   * 删除风鸟账号
   * DELETE services/app/RiskbirdAdmin/DeleteAccountAsync
   * @param id 账号ID
   */
  export const deleteAccountAsync = (id: number) => {
    return requestClient.delete<boolean>(
      'services/app/RiskbirdAdmin/DeleteAccountAsync',
      { params: { id } },
    );
  };
}

// 导出常用函数，方便直接导入使用
export const {
  searchCompanyAsync,
  getCompanyDetailAsync,
  getAccountListAsync,
  saveAccountAsync,
  deleteAccountAsync,
} = RiskbirdApi;
