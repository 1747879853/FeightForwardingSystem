import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace InvoiceApplicationApi {
  /** 业务类别枚举 */
  export enum BizType {
    /** 海运出口 */
    SeaExport = 0,
    /** 海运进口 */
    SeaImport = 1,
    /** 空运出口 */
    AirExport = 2,
    /** 空运进口 */
    AirImport = 3,
    /** 陆运 */
    LandTransport = 4,
    /** 仓储 */
    Warehouse = 5,
  }

  /** 费用状态枚举 */
  export enum FeeStatus {
    /** 草稿 */
    Draft = 0,
    /** 待审核 */
    Auditing = 1,
    /** 审核通过 */
    Passed = 2,
    /** 审核驳回 */
    Rejected = 3,
  }

  /** 收付方向枚举 */
  export enum PaySide {
    /** 应收 */
    Receivable = 0,
    /** 应付 */
    Payable = 1,
  }

  /** 开票申请状态枚举 */
  export enum InvoiceApplicationStatus {
    /** 录入状态/未提交 */
    Entering = 0,
    /** 已提交/待审核 */
    Auditing = 1,
    /** 审核驳回 */
    Rejected = 2,
    /** 已开票 */
    Invoiced = 3,
  }

  /** 发票类型 */
  export enum InvoiceType {
    /** 普通发票(电票) */
    NormalElectric = 'p',
    /** 普通发票(纸票) */
    NormalPaper = 'c',
    /** 专用发票 */
    Special = 's',
  }

  // ==================== DTO 定义 ====================

  /** 运输订单简易信息 */
  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum: string;
    mblNum?: string;
    bookingNum?: string;
    clientName: string;
    etd?: string;
    [key: string]: any;
  }

  /** 海运出口简易信息 */
  export interface SeaExportSimpleDto {
    id: string;
    vessel?: string;
    innerVoyno?: string;
    polId?: number;
    polName?: string;
    podId?: number;
    podName?: string;
    carrierId?: number;
    carrierName?: string;
    [key: string]: any;
  }

  /** 订单费用简易信息 */
  export interface OrderFeeSimpleDto {
    id: string;
    feeCodeName: string;
    currencyId: number;
    currencyCode: string;
    amount: number;
    invoicedAmount: number;
    remainingInvoiceAmount: number;
    settlementName: string;
    settlementId: string;
    feeStatus: FeeStatus;
    paySide: PaySide;
    taxRate: number;
    creatorUserId?: number;
    accountDate?: string;
    [key: string]: any;
  }

  /** 开票申请费用分组输出DTO */
  export interface InvoiceApplicationFeeGroupOutputDto {
    transportOrder: TransportOrderSimpleDto;
    seaExport?: SeaExportSimpleDto;
    orderFees: OrderFeeSimpleDto[];
  }

  /** 分页列表响应 */
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
  }

  /** 开票申请费用查询DTO */
  export interface InvoiceApplicationFeeQueryDto {
    /** 关键字（可输入委托编号、主提单号、订舱编号、结算单位、业务类别、船公司、委托单位、开船日期、销售、会计期间、操作人、起运港、目的港、船名、航次、组织） */
    keyWord?: string;
    /** 开票申请ID（编辑时传入，排除此申请已关联的费用） */
    invoiceApplicationId?: string;
    /** 委托编号（模糊） */
    commissionNum?: string;
    /** 主提单号（模糊） */
    mblNum?: string;
    /** 订舱编号（模糊） */
    bookingNum?: string;
    /** 结算单位ID（费用的） */
    settlementId?: string;
    /** 币别ID */
    currencyId?: number;
    /** 业务类别 */
    bizType?: BizType;
    /** 船公司ID */
    carrierId?: number;
    /** 委托单位ID（TransportOrder的） */
    clientId?: string;
    /** 开船日期起 */
    etdStart?: string;
    /** 开船日期止 */
    etdEnd?: string;
    /** 销售ID */
    saleId?: number;
    /** 会计期间起 */
    accountDateStart?: string;
    /** 会计期间止 */
    accountDateEnd?: string;
    /** 操作ID */
    operationId?: number;
    /** 录入人ID（费用的CreatorUserId） */
    feeCreatorUserId?: number;
    /** 起运港ID */
    polId?: number;
    /** 目的港ID */
    podId?: number;
    /** 船名（模糊） */
    vessel?: string;
    /** 航次（模糊） */
    innerVoyno?: string;
    /** 组织ID（通过TransportOrder的UserId查询） */
    orgId?: number;
    /** 当前页码（从1开始） */
    pageIndex: number;
    /** 每页条数 */
    pageSize: number;
    /** 排序字段 */
    sorting?: string;
  }

  /** 开票申请商品明细添加DTO */
  export interface InvoiceApplicationGoodsDtlAddDto {
    /** 发票商品编码ID */
    codeInvoiceId: number;
    /** 规格型号 */
    specification?: string;
    /** 发票单位 */
    unit?: string;
    /** 数量 */
    quantity: number;
    /** 含税单价 */
    unitPrice: number;
    /** 金额 */
    amount: number;
    /** 不含税金额 */
    noTaxAmount: number;
    /** 税率(%) */
    taxRate: number;
    /** 税额 */
    taxAmount: number;
    /** 备注 */
    remark?: string;
  }

  /** 开票申请商品明细编辑DTO */
  export interface InvoiceApplicationGoodsDtlEditDto extends InvoiceApplicationGoodsDtlAddDto {
    /** ID（编辑时需要） */
    id?: string;
  }

  /** 开票申请商品明细详情DTO */
  export interface InvoiceApplicationGoodsDtlDetailDto extends InvoiceApplicationGoodsDtlAddDto {
    id: string;
    invoiceApplicationId: string;
    codeInvoiceName: string;
  }

  /** 开票申请费用明细添加DTO */
  export interface InvoiceApplicationItemAddDto {
    /** 费用ID */
    orderFeeId: string;
    /** 本次申请金额（可为负数，用于冲红） */
    appliedAmount: number;
    /** 备注 */
    remark?: string;
  }

  /** 开票申请费用明细详情DTO */
  export interface InvoiceApplicationItemDetailDto extends InvoiceApplicationItemAddDto {
    id: string;
    invoiceApplicationId: string;
    orderFee: OrderFeeSimpleDto;
    remainingInvoiceAmount: number;
  }

  /** 开票申请币别分组DTO */
  export interface InvoiceApplicationCurrencyGroupDto {
    /** 币别ID */
    currencyId: number;
    /** 发票类型（p=普通发票(电票)(默认)，c=普通发票(纸票)，s=专用发票） */
    invoiceType?: InvoiceType;
    /** 本币别下的费用明细列表 */
    invoiceApplicationItems: InvoiceApplicationItemAddDto[];
    /** 本币别下的商品明细列表 */
    invoiceApplicationGoodsDtls?: InvoiceApplicationGoodsDtlAddDto[];
    /** 我司银行ID，不传则取对应币别的默认银行 */
    orgBankAccountId?: string;
    /** 客户银行ID，不传则取对应币别的默认开票银行 */
    clientInvoiceBankId?: string;
  }

  /** 开票申请批量添加DTO */
  export interface InvoiceApplicationBatchAddDto {
    /** 结算对象ID（Client表） */
    settlementId: string;
    /** 所属公司（OrganizationUnit的Id，需验证IsCompany=true） */
    companyId: number;
    /** 开票要求 */
    require?: string;
    /** 备注 */
    remark?: string;
    /** 按币别分组的子表数据，每组生成一个InvoiceApplication */
    currencyGroups: InvoiceApplicationCurrencyGroupDto[];
  }

  /** 开票申请编辑DTO */
  export interface InvoiceApplicationEditDto {
    /** 主键ID */
    id: string;
    /** 结算对象ID */
    settlementId: string;
    /** 所属公司 */
    companyId: number;
    /** 我司银行ID */
    orgBankAccountId: string;
    /** 客户银行ID */
    clientInvoiceBankId: string;
    /** 发票类型（p=普通发票(电票)，c=普通发票(纸票)，s=专用发票） */
    invoiceType?: InvoiceType;
    /** 开票要求 */
    require?: string;
    /** 备注 */
    remark?: string;
    /** 费用明细列表（全量替换） */
    invoiceApplicationItems: InvoiceApplicationItemAddDto[];
    /** 商品明细列表（全量替换） */
    invoiceApplicationGoodsDtls?: InvoiceApplicationGoodsDtlEditDto[];
  }

  /** 开票申请删除DTO */
  export interface InvoiceApplicationDeleteDto {
    /** 主键ID */
    id: string;
  }

  /** 开票申请审核DTO */
  export interface InvoiceApplicationAuditDto {
    /** 主键ID */
    id: string;
    /** 驳回原因（必填） */
    rejectReason: string;
  }

  /** 开票申请提交DTO */
  export interface InvoiceApplicationSubmitDto {
    /** 主键ID */
    id: string;
  }

  /** 开票申请费用分组详情DTO */
  export interface InvoiceApplicationFeeGroupDetailDto {
    transportOrder: TransportOrderSimpleDto;
    seaExport?: SeaExportSimpleDto;
    items: InvoiceApplicationItemDetailDto[];
  }

  /** 开票申请详情DTO */
  export interface InvoiceApplicationDetailDto {
    id: string;
    applicationNo: string;
    invoiceNo?: string;
    settlementId: string;
    status: InvoiceApplicationStatus;
    currencyId: number;
    invoiceType?: InvoiceType;
    clientInvoiceBankId: string;
    companyId: number;
    orgBankAccountId: string;
    applyUserId: number;
    applyTime: string;
    require?: string;
    rejectUserId?: number;
    rejectTime?: string;
    rejectReason?: string;
    remark?: string;
    creatorUserName: string;
    settlementName: string;
    currencyCode: string;
    applyUserName: string;
    rejectUserNickName?: string;
    invoiceExchangeRate?: number;
    feeGroups: InvoiceApplicationFeeGroupDetailDto[];
    invoiceApplicationGoodsDtls: InvoiceApplicationGoodsDtlDetailDto[];
  }

  /** 开票申请查询DTO */
  export interface InvoiceApplicationQueryDto {
    /** 申请单号（模糊） */
    applicationNo?: string;
    /** 发票号（模糊） */
    invoiceNo?: string;
    /** 结算对象ID */
    settlementId?: string;
    /** 币别ID */
    currencyId?: number;
    /** 状态 */
    status?: InvoiceApplicationStatus;
    /** 申请时间起 */
    applyTimeStart?: string;
    /** 申请时间止 */
    applyTimeEnd?: string;
    /** 创建人ID */
    creatorUserId?: number;
    /** 组织ID（通过UserId查询） */
    orgId?: number;
    /** 当前页码（从1开始） */
    pageIndex: number;
    /** 每页条数 */
    pageSize: number;
    /** 排序字段 */
    sorting?: string;
  }

  /** 开票申请列表DTO */
  export interface InvoiceApplicationListDto {
    id: string;
    applicationNo: string;
    invoiceNo?: string;
    settlementId: string;
    status: InvoiceApplicationStatus;
    currencyId: number;
    invoiceType?: InvoiceType;
    applyUserId: number;
    applyTime: string;
    rejectUserId?: number;
    rejectTime?: string;
    rejectReason?: string;
    creatorUserName: string;
    settlementName: string;
    currencyCode: string;
    applyUserName: string;
    rejectUserNickName?: string;
    totalAppliedAmount: number;
    itemCount: number;
    invoiceExchangeRate?: number;
  }

  // ==================== API 方法定义 ====================

  /**
   * 拉取剩余未开票金额>0的费用（按业务分组）
   * GET services/app/InvoiceApplicationAdmin/GetOrderFeeGroupAsync
   */
  export function getOrderFeeGroupAsync(params: InvoiceApplicationFeeQueryDto) {
    return requestClient.get<PagedList<InvoiceApplicationFeeGroupOutputDto>>(
      'services/app/InvoiceApplicationAdmin/GetOrderFeeGroupAsync',
      { params },
    );
  }

  /**
   * 新增开票申请（批量-按币别分组）
   * POST services/app/InvoiceApplicationAdmin/AddAsync
   */
  export function addAsync(data: InvoiceApplicationBatchAddDto) {
    return requestClient.post<string[]>(
      'services/app/InvoiceApplicationAdmin/AddAsync',
      data,
    );
  }

  /**
   * 修改开票申请（单条）
   * PUT services/app/InvoiceApplicationAdmin/EditAsync
   */
  export function editAsync(data: InvoiceApplicationEditDto) {
    return requestClient.put<boolean>(
      'services/app/InvoiceApplicationAdmin/EditAsync',
      data,
    );
  }

  /**
   * 删除开票申请
   * DELETE services/app/InvoiceApplicationAdmin/DeleteAsync
   */
  export function deleteAsync(data: InvoiceApplicationDeleteDto) {
    return requestClient.delete<boolean>(
      'services/app/InvoiceApplicationAdmin/DeleteAsync',
      { data },
    );
  }

  /**
   * 开票申请详情
   * GET services/app/InvoiceApplicationAdmin/DetailAsync
   */
  export function detailAsync(id: string) {
    return requestClient.get<InvoiceApplicationDetailDto>(
      'services/app/InvoiceApplicationAdmin/DetailAsync',
      { params: { id } },
    );
  }

  /**
   * 开票申请列表
   * GET services/app/InvoiceApplicationAdmin/GetPagedListAsync
   */
  export function getPagedListAsync(params: InvoiceApplicationQueryDto) {
    return requestClient.get<PagedList<InvoiceApplicationListDto>>(
      'services/app/InvoiceApplicationAdmin/GetPagedListAsync',
      { params },
    );
  }

  /**
   * 审核开票申请（仅驳回）
   * PUT services/app/InvoiceApplicationAdmin/AuditAsync
   */
  export function auditAsync(data: InvoiceApplicationAuditDto) {
    return requestClient.put<boolean>(
      'services/app/InvoiceApplicationAdmin/AuditAsync',
      data,
    );
  }

  /**
   * 提交审核
   * PUT services/app/InvoiceApplicationAdmin/SubmitAsync
   */
  export function submitAsync(data: InvoiceApplicationSubmitDto) {
    return requestClient.put<boolean>(
      'services/app/InvoiceApplicationAdmin/SubmitAsync',
      data,
    );
  }

  /**
   * 撤回审核
   * PUT services/app/InvoiceApplicationAdmin/WithdrawAsync
   */
  export function withdrawAsync(data: InvoiceApplicationSubmitDto) {
    return requestClient.put<boolean>(
      'services/app/InvoiceApplicationAdmin/WithdrawAsync',
      data,
    );
  }
}
