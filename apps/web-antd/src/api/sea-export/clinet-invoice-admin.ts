import { requestClient } from '#/api/request';

export namespace ClientInvoiceInfoAdminApi {
  /** GUID ID DTO */
  export interface GuidIdDto {
    id: string;
    /** 批量删除用这个 */
    ids?: string[];
  }

  /** 客户开票银行 新增输入 */
  export interface ClientInvoiceBankAddDto {
    /** 主键 新增不传 */
    id?: string;
    /** 开户银行 */
    bankName?: string;
    /** 银行账号 */
    bankAccount?: string;
    /** 账户名称 */
    accountName?: string;
    /** 币别id */
    currencyId: number;
    /** SwiftCode */
    swiftCode?: string;
    /** 是否默认 每个币种都至多有一个默认银行账户 */
    isDefault: boolean;
    /** 排序id */
    sortId: number;
  }

  /** 客户开票银行 新增或修改输入 */
  export interface ClientInvoiceBankAddOrEditDto {
    /** 主键 新增不传 */
    id?: string;
    /** 客户开票信息表id */
    clientInvoiceInfoId: string;
    /** 开户银行 */
    bankName?: string;
    /** 银行账号 */
    bankAccount?: string;
    /** 账户名称 */
    accountName?: string;
    /** 币别id */
    currencyId: number;
    /** SwiftCode */
    swiftCode?: string;
    /** 是否默认 每个币种都至多有一个默认银行账户 */
    isDefault: boolean;
    /** 排序id */
    sortId: number;
  }

  /** 客户开票信息 新建输入 */
  export interface ClientInvoiceInfoAddDto {
    /** 客户id */
    clientId: string;
    /** 抬头 */
    header?: string;
    /** 是否默认 */
    isDefault: boolean;
    /** 排序id */
    sortId: number;
    /** 纳税人识别号 */
    taxNum?: string;
    /** 开票地址 */
    address?: string;
    /** 开票电话 */
    tel?: string;
    /** 手机 */
    mobile?: string;
    /** 银行信息列表 */
    clientInvoiceBanks?: ClientInvoiceBankAddDto[];
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id?: number;
  }

  /** 客户开票信息 编辑输入 */
  export interface ClientInvoiceInfoEditDto {
    /** 主键 */
    id: string;
    /** 客户id */
    clientId: string;
    /** 抬头 */
    header?: string;
    /** 是否默认 */
    isDefault: boolean;
    /** 排序id */
    sortId: number;
    /** 纳税人识别号 */
    taxNum?: string;
    /** 开票地址 */
    address?: string;
    /** 开票电话 */
    tel?: string;
    /** 手机 */
    mobile?: string;
    /** 银行信息列表 */
    clientInvoiceBanks?: ClientInvoiceBankAddOrEditDto[];
  }

  /** 客户开票信息 批量修改输入 */
  export interface ClientInvoiceInfoBatchEditDto {
    /** 客户id */
    clientId: string;
    /** 客户开票信息列表 */
    clientInvoiceInfos?: ClientInvoiceInfoEditDto[];
  }

  /** 客户开票银行 列表和详情输出 */
  export interface ClientInvoiceBankDto {
    /** 客户开票信息表id */
    clientInvoiceInfoId: string;
    /** 开户银行 */
    bankName?: string;
    /** 银行账号 */
    bankAccount?: string;
    /** 账户名称 */
    accountName?: string;
    /** 币别id */
    currencyId: number;
    /** SwiftCode */
    swiftCode?: string;
    /** 是否默认 每个币种都至多有一个默认银行账户 */
    isDefault: boolean;
    /** 排序id */
    sortId: number;
    /** 币别代码 */
    currencyCode?: string;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: string;
  }

  /** 客户开票信息 列表和详情输出 */
  export interface ClientInvoiceInfoDto {
    /** 客户id */
    clientId: string;
    /** 抬头 */
    header?: string;
    /** 是否默认 */
    isDefault: boolean;
    /** 排序id */
    sortId: number;
    /** 纳税人识别号 */
    taxNum?: string;
    /** 开票地址 */
    address?: string;
    /** 开票电话 */
    tel?: string;
    /** 手机 */
    mobile?: string;
    /** 银行信息列表 */
    clientInvoiceBanks?: ClientInvoiceBankDto[];
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: string;
  }

  /** 获取列表参数 */
  export interface GetListParams {
    /** 客户id 必填 */
    ClientId: string;
  }
}

const API_PREFIX = '/services/app/ClientInvoiceInfoAdmin';

/**
 * 新增客户开票信息
 */
export const addClientInvoiceInfo = (
  data: ClientInvoiceInfoAdminApi.ClientInvoiceInfoAddDto,
) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 删除客户开票信息
 */
export const deleteClientInvoiceInfo = (
  data: ClientInvoiceInfoAdminApi.GuidIdDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data,
  });
};

/**
 * 编辑客户开票信息
 */
export const editClientInvoiceInfo = (
  data: ClientInvoiceInfoAdminApi.ClientInvoiceInfoEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 批量修改客户开票信息
 */
export const batchEditClientInvoiceInfo = (
  data: ClientInvoiceInfoAdminApi.ClientInvoiceInfoBatchEditDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/BatchEditAsync`, data);
};

/**
 * 客户的开票信息列表不分页
 */
export const getClientInvoiceInfoList = (
  params: ClientInvoiceInfoAdminApi.GetListParams,
) => {
  return requestClient.get<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto[]>(
    `${API_PREFIX}/GetListAsync`,
    { params },
  );
};

/**
 * 客户开票信息详情
 */
export const getClientInvoiceInfoDetail = (id: string) => {
  return requestClient.get<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};
