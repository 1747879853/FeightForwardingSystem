import type { InjectionKey } from 'vue';

/**
 * 订单信息展示字段配置
 */
export interface DisplayFieldConfig {
  key: string;
  label: string;
  visible: boolean;
}

/** 费用分页结果（三模块共用最小结构） */
export interface OrderFeePagedResult {
  items: any[];
}

/** 更改单详情（三模块共用最小结构） */
export interface ChangeOrderDetailResult {
  orderFees: any[];
}

/** 费用数量统计结果 */
export interface OrderFeeCountResult {
  receivableCount: number;
  payableCount: number;
}

/**
 * 订单费用录入模块适配器。
 *
 * 海运出口 / 海运进口 / 空运出口三个页面的费用录入功能结构完全一致，
 * 差异仅为：调用接口、订单信息展示字段、i18n 前缀、业务类型（bizType）。
 * 所有差异收敛到该接口，共享组件不 import 任何具体模块的 API。
 */
export interface OrderFeeModuleAdapter {
  /** 模块标识：sea-export / sea-import / air-export */
  module: string;
  /** 业务类型：0=海运出口 1=海运进口 2=空运出口（批量导入费用、打印模板用） */
  bizType: number;
  /** i18n 前缀：seaExport.export / seaImport.import / airExport.export（页面级文案） */
  i18nPrefix: string;
  /** data.ts 费用列等选项文案前缀（AE 现状复用 seaExport.export 的 40 键文案） */
  dataI18nPrefix: string;
  /** 行业类别文案模块：seaExport / seaImport（client.industryCategories） */
  clientI18nModule: string;
  /** 订单信息展示字段配置（订单信息卡片） */
  displayFields: DisplayFieldConfig[];
  /** 按字段 key 取订单信息展示值；detail=模块详情，to=transportOrder */
  getDisplayValue: (fieldKey: string, detail: any, to: any) => any;
  /** 打印模板业务类型（PrintFormatBizType 枚举值） */
  printBizType: number;
  /** 模块差异 API（签名三模块同构） */
  api: {
    /** 订单详情 */
    getDetail(id: string, isPrint?: boolean): Promise<any>;
    /** 更改单详情 */
    getChangeOrderDetail(id: string): Promise<ChangeOrderDetailResult>;
    /** 费用分页列表 */
    getOrderFeePagedList(params: any): Promise<OrderFeePagedResult>;
    /** 费用数量统计 */
    getOrderFeeCount(params: any): Promise<OrderFeeCountResult>;
    /** 运输单费用 */
    getTransportOrderFees(params: any): Promise<any>;
    /** 批量导入费用到运输单 */
    importOrderFeesToTransportOrder(params: any): Promise<any>;
    /** 批量编辑费用 */
    batchEditOrderFee(params: any): Promise<any>;
    /** 批量删除费用 */
    batchDeleteOrderFee(ids: any[]): Promise<any>;
    /** 收付互生费用 */
    generateOppositeOrderFees(params: any): Promise<any>;
    /** 获取完结状态 */
    getIsFinishedAsync(id: string): Promise<boolean>;
    /** 切换完结状态 */
    changeIsUnfinishedAsync(id: string): Promise<any>;
  };
}

/**
 * 适配器注入 key：由 OrderFeePage 或兼容层包装组件 provide
 */
export const ORDER_FEE_ADAPTER_KEY: InjectionKey<OrderFeeModuleAdapter> =
  Symbol('order-fee-adapter');
