import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/PaymentApplicationAdmin';

export enum PaymentApplicationStatus {
  Entering = 0,
  Auditing = 1,
  Rejected = 1,
  Passed = 2,
}

export namespace PaymentApplicationAdminApi {
  export enum UserAttribute {
    None = 0,
    Operation = 1,
    CustomerService = 2,
    Documentation = 4,
    Business = 8,
    Sale = 16,
    Finance = 32,
    OverseasCustomerService = 64,
    HR = 128,
  }

  /** 业务相关用户 */
  export interface OrderUserDto {
    transportOrderId: string;
    userId: number;
    userNickName?: string;
    userAttribute: UserAttribute;
    sortId: number;
    remark?: string;
    id: number;
  }

  /** 付费申请列表查询参数 */
  export interface PaymentApplicationQueryParams {
    Keyword?: string;
    ApplicationNo?: string;
    Status?: number;
    SettlementId?: string;
    CurrencyId?: number;
    SubmitTimeStart?: string;
    SubmitTimeEnd?: string;
    EndTimeStart?: string;
    EndTimeEnd?: string;
    CreatorUserId?: number;
    OrgId?: number;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  /** 币别分组 */
  export interface CurrencyGroupDto {
    id: number;
    code?: string;
    receiveAmount: number;
    receivePrice?: number;
    payAmount: number;
    payPrice?: number;
  }

  /** 组织简要信息 */
  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string;
    localCurrencyId?: number;
  }

  /** 付费申请列表 DTO */
  export interface PaymentApplicationDto {
    id: string;
    applicationNo?: string;
    status: number;
    submitTime?: string;
    endTime?: string;
    settlementId: string;
    currencyId?: number;
    require?: string;
    remark?: string;
    tenantId: number;
    clientName?: string;
    currencyCode?: string;
    creatorUserName?: string;
    currencyGroup?: CurrencyGroupDto[];
    totalPayPrice?: number;
    totalReceivePrice?: number;
    userId: number;
    organizationUnits?: OrganizationUnitSimpleDto[];
    companys?: OrganizationUnitSimpleDto[];
    isDeleted: boolean;
    creationTime: string;
    creatorUserId?: number;
  }

  /** 分页数据封装 */
  export interface PagedListOfPaymentApplicationDto {
    skipCount: number;
    maxResultCount: number;
    items?: PaymentApplicationDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  export interface GetOrderFeeGroupParams {
    /** 当前付费申请id，排除已选费用 */
    Id?: string;
    /** 结算对象(客户id) 必填 */
    SettlementId?: string;
    /** 会计期间起 */
    AccountDateStart?: string;
    /** 会计期间止 */
    AccountDateEnd?: string;
    /** 费用名称 */
    FeeCodeIds?: number[];
    /** 要排除的费用名称 */
    ExceptFeeCodeIds?: number[];
    /** 收付类型 */
    PaySide?: number;
    /** 费用状态 */
    FeeStatus?: number;
    /** 结算状态 */
    SettlementStatus?: number;
    /** 开票状态 */
    InvoiceStatus?: number;
    /** 币别id */
    CurrencyId?: number;
    /** 对账编号 */
    StatementNum?: string;
    /** 编号 模糊匹配 */
    Keyword?: string;
    /** 委托单位id */
    ClientId?: string;
    /** 业务类型 */
    BizType?: number;
    /** 开船日期起 */
    ETDStart?: string;
    /** 开船日期止 */
    ETDEnd?: string;
    /** 起运港id */
    POLId?: number;
    /** 目的港id */
    PODId?: number;
    /** 组织id */
    OrgId?: number;
    /** 销售id */
    SaleId?: number;
    /** 操作id */
    OperatorId?: number;
    /** 客服id */
    CustomerServiceId?: number;
    /** 排序 */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  /** 费用 DTO */
  export interface OrderFeeDto {
    id: string;
    transportOrderId: string;
    changeOrderId?: string;
    paySide: number;
    feeStatus: number;
    settlementStatus: number;
    invoiceStatus: number;
    feeCodeId: number;
    settlementId: string;
    currencyId: number;
    exchangeRate: number;
    unitPrice: number;
    amount: number;
    unitEmum: number;
    quantity: number;
    taxRate: number;
    invoicedAmount: number;
    orderInvoiceAmount: number;
    settledAmount: number;
    canInvoice: boolean;
    isConfidential: boolean;
    dataEntryMethod: number;
    remark?: string;
    localCurrencyCode?: string;
    rqstPaymentAmount: number;
    unRqstPaymentAmount: number;
    unSettledAmount: number;
    feeCodeName?: string;
    currencyName?: string;
    settlementName?: string;
    unInvoicedAmount: number;
    noTaxUnitPrice: number;
    noTaxAmount: number;
    isDeleted: boolean;
    creationTime: string;
    creatorUserId?: number;
  }

  /** 业务分组 DTO */
  export interface PayAppFeeGroupDto {
    id: string;
    bizType: number;
    commissionNum?: string;
    accountDate: string;
    settlementDate: string;
    mblNum?: string;
    bookingNum?: string;
    clientId: string;
    clientName?: string;
    polId?: number;
    polName?: string;
    podId?: number;
    podName?: string;
    etd?: string;
    eta?: string;
    orderUsers?: OrderUserDto[];
    orderFees?: OrderFeeDto[];
    isDeleted: boolean;
    creationTime: string;
  }

  /** 分页数据封装 */
  export interface PagedListOfPayAppFeeGroupDto {
    skipCount: number;
    maxResultCount: number;
    items?: PayAppFeeGroupDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 附件项 DTO（输入） */
  export interface AttachmentItemForItemInputDto {
    attachmentId?: number;
    displayOrder?: number;
    itemId?: string;
    url?: string;
    id?: number;
  }

  /** 附件项 DTO（详情输出） */
  export interface AttachmentItemDto {
    attachmentId: number;
    itemId?: string;
    moduleTypeId?: string;
    isFirstShow: boolean;
    displayOrder: number;
    url?: string;
    mediaType?: number;
    friendlyFileName?: string;
    id: number;
  }

  /** 运输单简要信息 */
  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    accountDate: string;
    settlementDate: string;
    etd?: string;
    eta?: string;
    goodsCompleteTime?: string;
    seaExportPOLId?: number;
    seaExportPOLCnName?: string;
    seaExportPODId?: number;
    seaExportPODCnName?: string;
    seaExportVessel?: string;
    seaExportInnerVoyno?: string;
    bizType: number;
    clientId: string;
    clientName?: string;
    saleNames?: string[];
    operatorNames?: string[];
    customerServiceNames?: string[];
    isBusinessLocking: boolean;
    pkgs?: number;
    grossWeight?: number;
    remark?: string;
    isDeleted: boolean;
    creationTime: string;
  }

  /** 付费申请明细 DTO（详情输出） */
  export interface PaymentApplicationItemDto {
    id: number;
    paymentApplicationId: string;
    orderFeeId: string;
    rate?: number;
    appliedAmount: number;
    remark?: string;
    feeCodeName?: string;
    feeCurrencyName?: string;
    feeAmount: number;
    feeSettlementName?: string;
    orderFee?: OrderFeeDto;
    isDeleted: boolean;
    creationTime: string;
    creatorUserId?: number;
  }

  /** 费用和业务分组 DTO（详情输出） */
  export interface PayAppFeeAndSeaExportDto {
    currencyGroup?: CurrencyGroupDto[];
    totalPayPrice?: number;
    totalReceivePrice?: number;
    paymentApplicationItems?: PaymentApplicationItemDto[];
    transportOrder?: TransportOrderSimpleDto;
  }

  /** 付费申请详情 DTO */
  export interface PaymentApplicationDetailDto extends PaymentApplicationDto {
    payAppFeeBySeaExportGroup?: PayAppFeeAndSeaExportDto[];
    attachments?: AttachmentItemDto[];
  }

  /** 付费申请明细新增 DTO */
  export interface PaymentApplicationItemAddDto {
    orderFeeId: string;
    rate?: number | null;
    appliedAmount: number;
    remark?: string;
  }

  /** 付费申请新增 DTO */
  export interface PaymentApplicationAddDto {
    id?: string;
    status?: PaymentApplicationStatus;
    submitTime?: string | null;
    endTime?: string | null;
    settlementId: string;
    currencyId?: number | null;
    require?: string;
    remark?: string;
    paymentApplicationItems?: PaymentApplicationItemAddDto[];
    attachments?: AttachmentItemForItemInputDto[];
  }
}

/** 获取付费申请列表 */
export async function getPaymentApplicationPagedList(params: Recordable<any>) {
  const queryParams: PaymentApplicationAdminApi.PaymentApplicationQueryParams =
    {
      Keyword: params.Keyword || params.keyword,
      ApplicationNo: params.ApplicationNo || params.applicationNo,
      Status: params.Status ?? params.status,
      SettlementId: params.SettlementId || params.settlementId,
      CurrencyId: params.CurrencyId ?? params.currencyId,
      SubmitTimeStart: params.SubmitTimeStart || params.submitTimeStart,
      SubmitTimeEnd: params.SubmitTimeEnd || params.submitTimeEnd,
      EndTimeStart: params.EndTimeStart || params.endTimeStart,
      EndTimeEnd: params.EndTimeEnd || params.endTimeEnd,
      CreatorUserId: params.CreatorUserId ?? params.creatorUserId,
      OrgId: params.OrgId ?? params.orgId,
      Sorting: params.Sorting || 'Id desc',
      PageIndex: params.PageIndex || params.pageIndex || 1,
      PageSize: params.PageSize || params.pageSize || 10,
    };

  const response =
    await requestClient.get<PaymentApplicationAdminApi.PagedListOfPaymentApplicationDto>(
      `${API_PREFIX}/GetPagedListAsync`,
      { params: queryParams },
    );

  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/** 获取可进行付费申请的费用按业务分组列表 */
export async function getOrderFeeGroupAsync(
  params: PaymentApplicationAdminApi.GetOrderFeeGroupParams,
) {
  return requestClient.get<PaymentApplicationAdminApi.PagedListOfPayAppFeeGroupDto>(
    `${API_PREFIX}/GetOrderFeeGroupAsync`,
    { params },
  );
}

/** 获取付费申请详情 */
export async function getPaymentApplicationDetail(id: string) {
  return requestClient.get<PaymentApplicationAdminApi.PaymentApplicationDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
}

/** 新增付费申请 */
export async function addPaymentApplication(
  data: PaymentApplicationAdminApi.PaymentApplicationAddDto,
) {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
}
