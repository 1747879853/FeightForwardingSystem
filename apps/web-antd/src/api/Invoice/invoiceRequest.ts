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

  /** 客户简易对象 */
  export interface ClientSimpleDto {
    id?: string;
    name?: string;
    code?: string;
    fullName?: string;
    enName?: string;
  }

  /** 币别简易对象 */
  export interface CurrencySimpleDto {
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 费用代码简易对象 */
  export interface FeeCodeSimpleDto {
    id?: number;
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 组织（公司）简易对象 */
  export interface CompanySimpleDto {
    id?: number | string;
    name?: string;
  }

  /** 开票商品简易对象 */
  export interface CodeInvoiceSimpleDto {
    id?: number | string;
    code?: string;
    name?: string;
    enName?: string;
  }

  /** 对账单简要信息 */
  export interface StatementSimpleDto {
    /** 对账 id */
    id: string;
    /** 对账单号 */
    statementNum: string;
  }

  /** 运输订单简易信息 */
  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum: string;
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

    [key: string]: any;
  }

  /** 海运出口简易信息 */
  export interface SeaExportSimpleDto {
    id: string;
    vessel?: string;
    innerVoyno?: string;
    polId?: number;
    /** 起运港（简易对象，无则为 null） */
    pol?: {
      id: number;
      portName?: string;
      cnName?: string;
    } | null;
    podId?: number;
    /** 目的港（简易对象，无则为 null） */
    pod?: {
      id: number;
      portName?: string;
      cnName?: string;
    } | null;
    carrierId?: number;
    /** 船公司（简易对象，无则为 null） */
    carrier?: {
      id: number;
      cnName?: string;
      cnShortName?: string;
      enName?: string;
      /** 英文简称 */
      code?: string;
      ediCode?: string;
    } | null;
    [key: string]: any;
  }

  /** 订单费用简易信息 */
  export interface OrderFeeSimpleDto {
    id: string;
    /** 费用代码对象（替代 feeCodeName，名称读 cnName） */
    feeCode?: FeeCodeSimpleDto | null;
    currencyId: number;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    amount: number;
    invoicedAmount: number;
    remainingInvoiceAmount: number;
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
    settlementId: string;
    feeStatus: FeeStatus;
    paySide: PaySide;
    taxRate: number;
    creatorUserId?: number;
    accountDate?: string;

    statements: StatementSimpleDto[];
    isStatemented: boolean;
    [key: string]: any;
  }

  /** 开票申请费用分组输出DTO */
  export interface InvoiceApplicationFeeGroupOutputDto {
    transportOrder: TransportOrderSimpleDto;
    orderFees: OrderFeeSimpleDto[];
  }

  /** 分页列表响应 */
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
  }

  /** 开票申请费用查询DTO */
  export interface InvoiceApplicationFeeQueryDto {
    /** 关键字（模糊匹配主提单号或委托编号） */
    keyword?: string;
    /** 开票申请ID（编辑时传入，排除此申请已关联的费用） */
    invoiceApplicationId?: string;
    /** 委托编号（模糊） */
    commissionNum?: string;
    /** 主提单号（模糊） */
    mblNum?: string;
    /** 订舱编号（模糊） */
    bookingNum?: string;
    /** 客户对账单号（模糊）；传入时只返回被命中对账单所包含的费用 */
    statementNum?: string;
    /** 结算单位ID（费用的） */
    settlementId?: string;
    /** 币别ID */
    currencyId?: number;
    /** 收付类型（收/付） */
    paySide?: PaySide;
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
    /** 开票商品对象（替代 codeInvoiceName） */
    codeInvoice?: CodeInvoiceSimpleDto | null;
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
    /** 备注 */
    remark?: string;
  }

  /** 开票申请批量添加DTO */
  export interface InvoiceApplicationBatchAddDto {
    /** 结算对象ID（Client表） */
    settlementId: string;
    /** 归属组织id */
    orgId: number;
    /** 开票要求 */
    require?: string;
    /** 按币别分组的子表数据，每组生成一个InvoiceApplication */
    currencyGroups: InvoiceApplicationCurrencyGroupDto[];
  }

  /** 开票申请编辑DTO */
  export interface InvoiceApplicationEditDto {
    /** 主键ID */
    id: string;
    /** 结算对象ID */
    settlementId: string;
    /** 归属组织id */
    orgId: number;
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
    id?: string;
    ids?: string[];
  }

  /** 仅编辑主表DTO（不改动费用/商品明细） */
  export interface InvoiceApplicationEditMainDto {
    /** 主键ID */
    id: string;
    /** 结算对象ID */
    settlementId: string;
    /** 归属组织id */
    orgId: number;
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
  }

  /** 新增多条费用明细DTO */
  export interface InvoiceApplicationAddItemsDto {
    /** 开票申请ID */
    id: string;
    /** 本次新增的费用明细；可空 */
    invoiceApplicationItems?: InvoiceApplicationItemAddDto[];
    /**
     * 商品明细处理逻辑：
     * - undefined/null = 不改商品
     * - [] = 清空商品
     * - 有值 = 全量替换
     */
    invoiceApplicationGoodsDtls?: InvoiceApplicationGoodsDtlAddDto[] | null;
  }

  /** 移除多条费用明细DTO */
  export interface InvoiceApplicationRemoveItemsDto {
    /** 开票申请ID */
    id: string;
    /** 明细主键，至少一条；允许删光 */
    invoiceApplicationItemIds: string[];
    /**
     * 商品明细处理逻辑：
     * - undefined/null = 不改商品
     * - [] = 清空商品
     * - 有值 = 全量替换
     */
    invoiceApplicationGoodsDtls?: InvoiceApplicationGoodsDtlAddDto[] | null;
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
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
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
    /** 开票要求 */
    require?: string;
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

  /** 开票申请详情DTO */
  export interface InvoiceApplicationDetailDto {
    id: string;
    applicationNo: string;
    invoiceNo?: string;
    settlementId: string;
    status: InvoiceApplicationStatus;
    currencyId: number;
    invoiceType?: InvoiceType;
    clientInvoiceInfo: ClientInvoiceInfoDto;
    clientInvoiceBankId: string;
    /** 归属组织id */
    orgId: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    /** 组织（公司）对象（替代 companyName） */
    company?: CompanySimpleDto | null;
    orgBankAccountId: string;
    applyUserId: number;
    applyTime: string;
    require?: string;
    rejectUserId?: number;
    rejectTime?: string;
    rejectReason?: string;
    remark?: string;
    creatorUserName: string;
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
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
    /** 归属组织id */
    orgId: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    /** 组织（公司）对象（替代 companyName） */
    company?: CompanySimpleDto | null;
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
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    applyUserName: string;
    rejectUserNickName?: string;
    totalAppliedAmount: number;
    itemCount: number;
    invoiceAmount: number;
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
   * 修改开票申请（单条）- 全量替换（保留不变，建议使用拆分接口）
   * PUT services/app/InvoiceApplicationAdmin/EditAsync
   */
  export function editAsync(data: InvoiceApplicationEditDto) {
    return requestClient.put<boolean>(
      'services/app/InvoiceApplicationAdmin/EditAsync',
      data,
    );
  }

  /**
   * 仅编辑主表（不改动费用/商品明细）
   * PUT services/app/InvoiceApplicationAdmin/EditMainAsync
   */
  export function editMainAsync(data: InvoiceApplicationEditMainDto) {
    return requestClient.put<boolean>(
      'services/app/InvoiceApplicationAdmin/EditMainAsync',
      data,
    );
  }

  /**
   * 新增多条费用明细
   * POST services/app/InvoiceApplicationAdmin/AddItemsAsync
   */
  export function addItemsAsync(data: InvoiceApplicationAddItemsDto) {
    return requestClient.post<boolean>(
      'services/app/InvoiceApplicationAdmin/AddItemsAsync',
      data,
    );
  }

  /**
   * 移除多条费用明细
   * PUT services/app/InvoiceApplicationAdmin/RemoveItemsAsync
   */
  export function removeItemsAsync(data: InvoiceApplicationRemoveItemsDto) {
    return requestClient.put<boolean>(
      'services/app/InvoiceApplicationAdmin/RemoveItemsAsync',
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
