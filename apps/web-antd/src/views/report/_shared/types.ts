import type { VbenFormSchema } from '#/adapter/form';

/** Handsontable 列定义（宽松类型，兼容 handsontable 原生配置） */
export type HotColumnDef = Record<string, any>;

/**
 * 币别明细列定义
 * 每个币别（如 CNY/USD）会按此定义展开出多列，
 * 行数据的键规则为 `${币别代码}_${key}`，如 `USD_receivable`
 */
export interface CurrencyFieldDef {
  /** 币别明细中的金额字段名，如 'receivable' / 'payable' / 'received' */
  key: string;
  /** 列标题，接收币别代码返回标题，如 (code) => `${code}应收` */
  title: (code: string) => string;
}

/**
 * 查询钩子上下文
 * 由 useReportPage 注入，供配置中的钩子使用（避免在配置文件顶层调用依赖注入的 API）
 */
export interface ReportQueryContext {
  /** 基于权限码判断是否有权限 */
  hasAccessByCodes: (codes: string[]) => boolean;
}

/**
 * 报表页面配置
 * 新增报表时只需提供一个该配置对象，即可驱动整个报表页面渲染
 */
export interface ReportPageConfig<TRaw = any> {
  /** 报表名称（用于导出文件名与工作表名） */
  name: string;
  /** 列表查询接口（当前后端为不分页全量查询） */
  fetchApi: (params: any) => Promise<TRaw[]>;
  /** 查询表单配置 */
  formSchema: VbenFormSchema[];
  /**
   * 查询前参数加工钩子（可选）
   * - 返回加工后的参数对象继续查询
   * - 返回 false 中止本次查询（可用于权限提示等场景）
   * - 不配置时默认执行 setPortTypeByBizType
   */
  beforeQuery?: (
    values: Record<string, any>,
    ctx: ReportQueryContext,
  ) => false | Promise<false | Record<string, any>> | Record<string, any>;
  /** 查询成功后的钩子（可选），接收转换后的行数据 */
  afterQuery?: (rows: Record<string, any>[]) => void;
  /** 基础列配置（不含币别动态列） */
  baseHotColumns: HotColumnDef[];
  /** 合计列配置 */
  totalHotColumns: HotColumnDef[];
  /** 币别明细列定义（利润报表为应收/应付/利润，欠费报表为应收/已收/未收） */
  currencyFields: CurrencyFieldDef[];
  /**
   * 报表特有的行字段映射（可选）
   * 公共行字段由共享转换逻辑生成，此处仅补充本报表特有字段（如合计金额、超期天数等）
   */
  mapExtraRow?: (item: TRaw) => Record<string, any>;
  /** 数值列键集合（用于合计行累加、分组聚合与右对齐） */
  numericColumnKeys?: string[];
}
