import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/InvoiceApplicationAdmin';

/** 开票申请状态枚举 */
export enum InvoiceApplicationStatus {
  /** 录入状态/未提交 */
  Entering = 0,
  /** 已提交/待审核（已提交即可开票，审核只驳回有问题的） */
  Auditing = 1,
  /** 审核驳回 */
  Rejected = 2,
  /** 已开票（由后续开票操作设置，非审核设置） */
  Invoiced = 3,
}

/** 发票类型枚举 */
export enum InvoiceType {
  /** 普通发票(电票)（默认） */
  NormalElectronic = 'p',
  /** 普通发票(纸票) */
  NormalPaper = 'c',
  /** 专用发票 */
  Special = 's',
}

export namespace InvoiceApplicationAdminApi {
  /** 业务类别枚举 */
  export enum BizType {
    SeaExport = 0,
    SeaImport = 1,
    AirExport = 2,
    AirImport = 3,
    RoadExport = 4,
    RoadImport = 5,
  }

  /** 费用状态枚举 */
  export enum FeeStatus {
    Draft = 0,
    Auditing = 1,
    Passed = 2,
    Rejected = 3,
  }

  /** 收付方向枚举 */
  export enum PaySide {
    Receive = 0,
    Pay = 1,
  }

  /** 运输单简要信息 */
  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    /** 委托单位对象（替代 clientName） */
    client?: ClientSimpleDto | null;
    etd?: string;
    /** 海运出口信息（根据文档，现在挂在此处） */
    seaExport?: SeaExportSimpleDto;

    // === 整票结算状态字段（客户对账接口使用） ===
    /** 应收整票结算状态（按该业务下全部应收费用汇总） */
    recSettlementStatus?: number | null;
    /** 应付整票结算状态（本次不赋值，恒为 null，预留字段） */
    paySettlementStatus?: number | null;

    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
  }

  /** 港口简易对象（PortCodeSimpleDto） */
  export interface PortCodeSimpleDto {
    id: number;
    /** 英文名称 */
    portName?: string;
    /** 中文名称 */
    cnName?: string;
  }

  /** 船公司简易对象（CarrierSimpleDto） */
  export interface CarrierSimpleDto {
    id: number;
    /** 中文名称 */
    cnName?: string;
    /** 中文简称 */
    cnShortName?: string;
    /** 英文名称 */
    enName?: string;
    /** 英文简称 */
    code?: string;
    /** EDI 代码 */
    ediCode?: string;
  }

  /** 海运出口信息 */
  export interface SeaExportSimpleDto {
    id: string;
    vessel?: string;
    innerVoyno?: string;
    polId?: number;
    /** 起运港（简易对象，无则为 null） */
    pol?: PortCodeSimpleDto | null;
    podId?: number;
    /** 目的港（简易对象，无则为 null） */
    pod?: PortCodeSimpleDto | null;
    carrierId?: number;
    /** 船公司（简易对象，无则为 null） */
    carrier?: CarrierSimpleDto | null;
  }

  /** 费用代码简要对象 */
  export interface FeeCodeSimpleDto {
    id?: number;
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 币别简要对象 */
  export interface CurrencySimpleDto {
    id?: number;
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 客户简要对象 */
  export interface ClientSimpleDto {
    id?: string;
    name?: string;
    code?: string;
    fullName?: string;
    enName?: string;
  }

  /** 组织（公司）简要对象 */
  export interface CompanySimpleDto {
    id?: number | string;
    name?: string;
  }

  /** 开票商品简要对象 */
  export interface CodeInvoiceSimpleDto {
    id?: number | string;
    code?: string;
    name?: string;
    enName?: string;
  }

  /** 订单费用信息 */
  export interface OrderFeeDto {
    id: string;
    /** 费用代码对象（替代 feeCodeName / feeCodeCode） */
    feeCode?: FeeCodeSimpleDto | null;
    currencyId: number;
    /** 币别对象（替代 currencyName / currencyCode） */
    currency?: CurrencySimpleDto | null;
    amount: number;
    invoicedAmount: number;
    remainingInvoiceAmount: number;
    /** 结算对象（替代 settlementName / settlementCode） */
    settlement?: ClientSimpleDto | null;
    settlementId: string;
    feeStatus: FeeStatus;
    paySide: PaySide;
    taxRate?: number;
    creatorUserId?: number;
    accountDate?: string;

    /** 组合费用状态（计算字段，非数据库列） */
    combinedFeeStatus?: number;
  }

  /** 费用分组输出DTO（按业务分组） */
  export interface InvoiceApplicationFeeGroupOutputDto {
    transportOrder: TransportOrderSimpleDto;
    orderFees: OrderFeeDto[];
  }

  /** 拉取剩余未开票金额>0的费用查询参数 */
  export interface InvoiceApplicationFeeQueryDto {
    invoiceApplicationId?: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    settlementId?: string;
    currencyId?: number;
    bizType?: BizType;
    carrierId?: number;
    clientId?: string;
    etdStart?: string;
    etdEnd?: string;
    saleId?: number;
    accountDateStart?: string;
    accountDateEnd?: string;
    operationId?: number;
    feeCreatorUserId?: number;
    polId?: number;
    podId?: number;
    vessel?: string;
    innerVoyno?: string;
    orgId?: number;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  /** 分页列表结果 */
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
  }

  /** 开票申请商品明细新增DTO */
  export interface InvoiceApplicationGoodsDtlAddDto {
    codeInvoiceId: number;
    specification?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    noTaxAmount: number;
    taxRate: number;
    taxAmount: number;
    remark?: string;
  }

  /** 开票申请商品明细编辑DTO */
  export interface InvoiceApplicationGoodsDtlEditDto {
    id?: string;
    codeInvoiceId: number;
    specification?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    noTaxAmount: number;
    taxRate: number;
    taxAmount: number;
    remark?: string;
  }

  /** 开票申请商品明细输出DTO */
  export interface InvoiceApplicationGoodsDtlOutputDto {
    id: string;
    invoiceApplicationId: string;
    codeInvoiceId: number;
    /** 开票商品对象（替代 codeInvoiceName） */
    codeInvoice?: CodeInvoiceSimpleDto | null;
    specification?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    noTaxAmount: number;
    taxRate: number;
    taxAmount: number;
    remark?: string;
  }

  /** 开票申请费用明细新增DTO */
  export interface InvoiceApplicationItemAddDto {
    orderFeeId: string;
    appliedAmount: number;
    remark?: string;
  }

  /** 开票申请费用明细输出DTO */
  export interface InvoiceApplicationItemOutputDto {
    id: string;
    invoiceApplicationId: string;
    orderFeeId: string;
    appliedAmount: number;
    remark?: string;
    orderFee?: OrderFeeDto;
    remainingInvoiceAmount: number;
  }

  /** 按币别分组的子表数据DTO */
  export interface InvoiceApplicationCurrencyGroupDto {
    currencyId: number;
    invoiceType?: InvoiceType;
    invoiceApplicationItems: InvoiceApplicationItemAddDto[];
    invoiceApplicationGoodsDtls?: InvoiceApplicationGoodsDtlAddDto[];
    orgBankAccountId?: string;
    clientInvoiceBankId?: string;
    remark?: string;
  }

  /** 批量新增开票申请DTO */
  export interface InvoiceApplicationBatchAddDto {
    settlementId: string;
    /** 归属组织id */
    orgId: number;
    require?: string;
    currencyGroups: InvoiceApplicationCurrencyGroupDto[];
  }

  /** 修改开票申请DTO */
  export interface InvoiceApplicationEditDto {
    id: string;
    settlementId: string;
    /** 归属组织id */
    orgId: number;
    orgBankAccountId: string;
    clientInvoiceBankId: string;
    invoiceType?: InvoiceType;
    require?: string;
    remark?: string;
    invoiceApplicationItems: InvoiceApplicationItemAddDto[];
    invoiceApplicationGoodsDtls?: InvoiceApplicationGoodsDtlEditDto[];
  }

  /** 删除开票申请DTO */
  export interface InvoiceApplicationDeleteDto {
    ids: string[];
  }

  /** 仅编辑主表DTO（不改动费用/商品明细） */
  export interface InvoiceApplicationEditMainDto {
    id: string;
    settlementId: string;
    /** 归属组织id */
    orgId: number;
    orgBankAccountId: string;
    clientInvoiceBankId: string;
    invoiceType?: InvoiceType;
    require?: string;
    remark?: string;
  }

  /** 新增多条费用明细DTO */
  export interface InvoiceApplicationAddItemsDto {
    id: string;
    /** 本次新增的费用明细；可空 */
    invoiceApplicationItems?: InvoiceApplicationItemAddDto[];
    /**
     * 商品明细处理逻辑：
     * - null = 不改商品
     * - [] = 清空商品
     * - 有值 = 全量替换
     */
    invoiceApplicationGoodsDtls?: InvoiceApplicationGoodsDtlAddDto[] | null;
  }

  /** 移除多条费用明细DTO */
  export interface InvoiceApplicationRemoveItemsDto {
    id: string;
    /** 明细主键，至少一条；允许删光 */
    invoiceApplicationItemIds: string[];
    /**
     * 商品明细处理逻辑：
     * - null = 不改商品
     * - [] = 清空商品
     * - 有值 = 全量替换
     */
    invoiceApplicationGoodsDtls?: InvoiceApplicationGoodsDtlAddDto[] | null;
  }

  /** 费用分组详情DTO */
  export interface InvoiceApplicationFeeGroupDetailDto {
    transportOrder: TransportOrderSimpleDto;
    items: InvoiceApplicationItemOutputDto[];
  }

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
    /** 是否公司节点 */
    isCompany?: boolean;
  }

  /** 开票申请详情DTO */
  export interface InvoiceApplicationDetailDto {
    id: string;
    applicationNo?: string;
    invoiceNo?: string;
    settlementId: string;
    status: InvoiceApplicationStatus;
    currencyId: number;
    invoiceType?: InvoiceType;
    clientInvoiceBankId: string;
    /** 归属组织id */
    orgId: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
    /** 组织（公司）对象（替代 companyName） */
    company?: CompanySimpleDto | null;
    orgBankAccountId: string;
    applyUserId?: number;
    applyTime?: string;
    require?: string;
    rejectUserId?: number;
    rejectTime?: string;
    rejectReason?: string;
    remark?: string;
    creatorUserName?: string;
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    applyUserName?: string;
    rejectUserNickName?: string;
    feeGroups: InvoiceApplicationFeeGroupDetailDto[];
    invoiceApplicationGoodsDtls: InvoiceApplicationGoodsDtlOutputDto[];
    invoiceExchangeRate?: number;
    /**
     * ✅ 新增：发票附件列表
     * **这条开票申请所挂那张发票开出下的发票文件**
     * - 开票申请自己没有附件，这里是后端从发票开出那边取过来的
     * - 不分组，拉平成一个数组
     * - 申请还没挂发票开出（未开票）时为空
     * - 冲红完成后挂靠会被解除，附件也随之消失
     */
    attachments?: AttachmentItemDto[];
  }

  /** 开票申请列表查询参数 */
  export interface InvoiceApplicationQueryDto {
    keyword?: string;
    applicationNo?: string;
    invoiceNo?: string;
    settlementId?: string;
    currencyId?: number;
    status?: InvoiceApplicationStatus;
    applyTimeStart?: string;
    applyTimeEnd?: string;
    creatorUserId?: number;
    orgId?: number;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  /** 开票申请列表项DTO */
  export interface InvoiceApplicationListDto {
    id: string;
    applicationNo?: string;
    invoiceNo?: string;
    settlementId: string;
    status: InvoiceApplicationStatus;
    currencyId: number;
    invoiceType?: InvoiceType;
    applyUserId?: number;
    applyTime?: string;
    rejectUserId?: number;
    rejectTime?: string;
    rejectReason?: string;
    creatorUserName?: string;
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    applyUserName?: string;
    rejectUserNickName?: string;
    totalAppliedAmount: number;
    itemCount: number;
    invoiceExchangeRate?: number;
    commissionNums?: string;
    mblNums?: string;
    /**
     * ✅ 新增：发票附件列表
     * **这条开票申请所挂那张发票开出下的发票文件**
     * - 结构与详情完全一致
     * - 申请还没挂发票开出（未开票）时为空
     * - 冲红完成后挂靠会被解除，附件也随之消失
     */
    attachments?: AttachmentItemDto[];
  }

  /** 审核开票申请DTO */
  export interface InvoiceApplicationAuditDto {
    id: string;
    rejectReason: string;
  }

  /** 提交/撤回开票申请DTO */
  export interface InvoiceApplicationSubmitDto {
    id: string;
  }

  /** 按对账单新增开票申请DTO */
  export interface InvoiceApplicationAddByStatementDto {
    /** 对账单ID */
    statementId: string;
  }

  /** 附件项DTO（与发票开出模块保持一致） */
  export interface AttachmentItemDto {
    url: string;
    friendlyFileName: string;
    mediaType?: string;
    [key: string]: any;
  }

  // ==================== API方法 ====================

  /**
   * 拉取剩余未开票金额>0的费用（按业务分组）
   * @param params 查询参数
   */
  export function getOrderFeeGroup(params: InvoiceApplicationFeeQueryDto) {
    return requestClient.get<PagedList<InvoiceApplicationFeeGroupOutputDto>>(
      `${API_PREFIX}/GetOrderFeeGroupAsync`,
      { params },
    );
  }

  /**
   * 新增开票申请（批量-按币别分组）
   * @param data 批量新增DTO
   * @returns 返回生成的所有InvoiceApplication的ID列表
   */
  export function add(data: InvoiceApplicationBatchAddDto) {
    return requestClient.post<string[]>(`${API_PREFIX}/AddAsync`, data);
  }

  /**
   * 修改开票申请（单条）- 全量替换（保留不变，建议使用拆分接口）
   * @param data 修改DTO
   */
  export function edit(data: InvoiceApplicationEditDto) {
    return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
  }

  /**
   * 仅编辑主表（不改动费用/商品明细）
   * @param data 编辑主表DTO
   */
  export function editMain(data: InvoiceApplicationEditMainDto) {
    return requestClient.put<boolean>(`${API_PREFIX}/EditMainAsync`, data);
  }

  /**
   * 新增多条费用明细
   * @param data 新增明细DTO
   */
  export function addItems(data: InvoiceApplicationAddItemsDto) {
    return requestClient.post<boolean>(`${API_PREFIX}/AddItemsAsync`, data);
  }

  /**
   * 移除多条费用明细
   * @param data 移除明细DTO
   */
  export function removeItems(data: InvoiceApplicationRemoveItemsDto) {
    return requestClient.put<boolean>(`${API_PREFIX}/RemoveItemsAsync`, data);
  }

  /**
   * 删除开票申请
   * @param data 删除DTO
   */
  export function remove(data: InvoiceApplicationDeleteDto) {
    return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, { data });
  }

  /**
   * 开票申请详情
   * @param id 主键ID
   */
  export function detail(id: string) {
    return requestClient.get<InvoiceApplicationDetailDto>(
      `${API_PREFIX}/DetailAsync`,
      { params: { id } },
    );
  }

  /**
   * 开票申请列表
   * @param params 查询参数
   */
  export function getPagedList(params: InvoiceApplicationQueryDto) {
    return requestClient.get<PagedList<InvoiceApplicationListDto>>(
      `${API_PREFIX}/GetPagedListAsync`,
      { params },
    );
  }

  /**
   * 审核开票申请（仅驳回）
   * @param data 审核DTO
   */
  export function audit(data: InvoiceApplicationAuditDto) {
    return requestClient.put<boolean>(`${API_PREFIX}/AuditAsync`, data);
  }

  /**
   * 提交审核
   * @param data 提交DTO
   */
  export function submit(data: InvoiceApplicationSubmitDto) {
    return requestClient.put<boolean>(`${API_PREFIX}/SubmitAsync`, data);
  }

  /**
   * 撤回审核
   * @param data 撤回DTO
   */
  export function withdraw(data: InvoiceApplicationSubmitDto) {
    return requestClient.put<boolean>(`${API_PREFIX}/WithdrawAsync`, data);
  }

  /**
   * 按对账单新增开票申请
   * @param data 按对账单新增DTO
   * @returns 返回生成的所有InvoiceApplication的ID列表（可能多个，因为会按币别拆分）
   */
  export function addByStatement(data: InvoiceApplicationAddByStatementDto) {
    return requestClient.post<string[]>(
      `${API_PREFIX}/AddByStatementAsync`,
      data,
    );
  }
}
