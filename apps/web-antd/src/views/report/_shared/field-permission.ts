import type { VbenFormSchema } from '#/adapter/form';

import type { HotColumnDef } from './types';

import { FrightModule } from '#/api/system/permission';
import {
  hasMaskRule,
  isAlwaysMasked,
  isMaskedFieldsLoaded,
} from '#/composables/use-masked-fields';

/**
 * 报表页字段级权限（PropMask）应用
 *
 * 报表本身没有独立模块，列数据来自 ReportTransportOrderDto（TransportOrder 模块）
 * 及其下的业务线子对象（SeaExport / SeaImport / AirExport 模块）。
 * 报表自身的字段（合计金额、币别明细、会计期间、超期天数、发票号、结算对象等）
 * 后端未标注 [PropMaskModule]，不支持屏蔽，本文件不涉及。
 *
 * 两种表现手段：
 * - 整列隐藏：仅当该列**所有**数据来源都被无条件屏蔽（alwaysMasked）时才隐藏，
 *   条件规则绝不能整列隐藏（见字段权限设计文档坑点 F8）
 * - 逐行 `***`：后端序列化时直接剔除被屏蔽字段的 key（不是 null），
 *   因此用 `'propName' in obj` 判定该行是否无权限，不能用「值是否为空」
 *
 * @see doc/权限/用户或角色字段级别权限.md
 * @see doc/权限/用户或角色字段级别权限逻辑.md
 */

/** 无权限单元格的占位文本 */
export const MASKED_TEXT = '***';

/** 业务线子对象在 ReportTransportOrderDto 上的 JSON 键 */
type BizLineKey = 'airExport' | 'seaExport' | 'seaImport';

/** 业务类型 → 业务线（0 海运出口 / 1 海运进口 / 2 空运出口） */
const BIZ_TYPE_LINE: Record<number, BizLineKey> = {
  0: 'seaExport',
  1: 'seaImport',
  2: 'airExport',
};

/** 业务线 → 所属权限模块 */
const BIZ_LINE_MODULE: Record<BizLineKey, FrightModule> = {
  airExport: FrightModule.AirExport,
  seaExport: FrightModule.SeaExport,
  seaImport: FrightModule.SeaImport,
};

/** 业务线子对象在 TransportOrder 模块下的容器属性名（可被整体屏蔽） */
const BIZ_LINE_CONTAINER_PROP: Record<BizLineKey, string> = {
  airExport: 'AirExport',
  seaExport: 'SeaExport',
  seaImport: 'SeaImport',
};

/** 与 transform.ts 的 extractBizLineFields 保持同一取值优先级 */
const BIZ_LINE_PRIORITY: BizLineKey[] = ['seaExport', 'seaImport', 'airExport'];

/** 报表列的数据来源声明 */
interface ReportFieldSource {
  /** 来自主单（TransportOrder 模块）的属性名，PascalCase */
  orderProp?: string;
  /**
   * 来自业务线子对象的属性名，PascalCase。
   * 只声明该字段**真实存在**的业务线，避免把「业务线本就没有该字段」误判为被屏蔽
   */
  bizLineProps?: Partial<Record<BizLineKey, string>>;
}

/** 箱型数量与 TEU 同源于主单 Ctns */
const CTNS_SOURCE: ReportFieldSource = { orderProp: 'Ctns' };

/**
 * 报表行数据键（即列定义的 data 值）→ 后端字段来源
 *
 * 注意：client / carrier / pol / pod / bookingAgent / yard 在报表 DTO 里都是
 * 共享简易对象（ClientSimpleDto 等），其内部字段屏不掉，只能整对象屏蔽，
 * 所以 PropName 用对象名而不是 ClientId 之类的 id 属性名
 */
const FIELD_SOURCES: Record<string, ReportFieldSource> = {
  bizDate: { orderProp: 'BizDate' },
  bizType: { orderProp: 'BizType' },
  blType: {
    bizLineProps: {
      airExport: 'BlType',
      seaExport: 'BlType',
      seaImport: 'BlType',
    },
  },
  bookingAgent: {
    bizLineProps: { airExport: 'BookingAgent', seaExport: 'BookingAgent' },
  },
  cargoId: { orderProp: 'CargoId' },
  carrier: {
    bizLineProps: { seaExport: 'Carrier', seaImport: 'Carrier' },
  },
  cbm: { orderProp: 'Cbm' },
  client: { orderProp: 'Client' },
  commissionNum: { orderProp: 'CommissionNum' },
  ctns: CTNS_SOURCE,
  innerVoyno: {
    bizLineProps: { seaExport: 'InnerVoyno', seaImport: 'InnerVoyno' },
  },
  kgs: { orderProp: 'Kgs' },
  mblNum: { orderProp: 'MblNum' },
  operations: { orderProp: 'Operations' },
  org: { orderProp: 'Orgs' },
  pkgs: { orderProp: 'Pkgs' },
  pod: {
    bizLineProps: { airExport: 'Pod', seaExport: 'Pod', seaImport: 'Pod' },
  },
  podRemark: {
    bizLineProps: {
      airExport: 'PodRemark',
      seaExport: 'PodRemark',
      seaImport: 'PodRemark',
    },
  },
  pol: {
    bizLineProps: { airExport: 'Pol', seaExport: 'Pol', seaImport: 'Pol' },
  },
  polRemark: {
    bizLineProps: {
      airExport: 'PolRemark',
      seaExport: 'PolRemark',
      seaImport: 'PolRemark',
    },
  },
  sales: { orderProp: 'Sales' },
  settlementDate: { orderProp: 'SettlementDate' },
  settlementType: { orderProp: 'SettlementType' },
  teu: CTNS_SOURCE,
  vessel: { bizLineProps: { seaExport: 'Vessel', seaImport: 'Vessel' } },
  yard: { bizLineProps: { seaExport: 'Yard' } },
};

/**
 * 查询表单 fieldName → 对应的报表行数据键（FIELD_SOURCES 的键）
 * 数组内**全部**字段都被无条件屏蔽时才移除该筛选项；
 * 条件屏蔽的字段保留筛选项（用户在部分行上仍可见，移除属于过度限制）
 */
const FORM_FIELD_SOURCES: Record<string, string[]> = {
  bizDateEnd: ['bizDate'],
  bizDateStart: ['bizDate'],
  bizType: ['bizType'],
  blType: ['blType'],
  bookingAgentId: ['bookingAgent'],
  cargoId: ['cargoId'],
  carrierId: ['carrier'],
  clientId: ['client'],
  innerVoyno: ['innerVoyno'],
  // 关键词同时检索主提单号与委托编号，两者都被屏蔽才移除
  keyword: ['mblNum', 'commissionNum'],
  operationUserIds: ['operations'],
  podId: ['pod'],
  polId: ['pol'],
  saleUserIds: ['sales'],
  settlementType: ['settlementType'],
  vessel: ['vessel'],
  yardId: ['yard'],
};

/** PascalCase 属性名 → camelCase JSON 键 */
function toJsonKey(propName: string): string {
  return propName.charAt(0).toLowerCase() + propName.slice(1);
}

/**
 * 主单属性在该行是否被屏蔽：
 * 先确认存在屏蔽规则，再看 key 是否被后端剔除（坑点 F1：字段消失而非 null）
 */
function isOrderPropMasked(order: any, propName: string): boolean {
  if (!order || !hasMaskRule(FrightModule.TransportOrder, propName)) {
    return false;
  }
  return !(toJsonKey(propName) in order);
}

/** 业务线解析结果 */
interface BizLineResolution {
  key: BizLineKey;
  /** 业务线子对象，容器被屏蔽或数据缺失时为 null */
  data: null | Record<string, any>;
  /** 容器对象（TransportOrder.SeaExport 等）本身被屏蔽 */
  containerMasked: boolean;
}

/** 该业务线是否是当前行业务类型所期望的那条（bizType 被屏蔽时不做限制） */
function isExpectedLine(order: any, key: BizLineKey): boolean {
  const bizType = order?.bizType;
  if (typeof bizType !== 'number') return true;
  return BIZ_TYPE_LINE[bizType] === key;
}

/**
 * 定位当前行实际提供业务线字段的那条业务线。
 * 取值优先级与 transform.ts 的 extractBizLineFields 完全一致，
 * 保证「判定所依据的业务线」就是「页面实际展示的业务线」
 */
function resolveBizLine(order: any): BizLineResolution | null {
  if (!order) return null;

  for (const key of BIZ_LINE_PRIORITY) {
    const data = order[key];
    if (data) return { key, data, containerMasked: false };
    // 期望的业务线整体消失且配置了容器屏蔽规则 → 该线全部字段不可见
    if (
      isExpectedLine(order, key) &&
      isOrderPropMasked(order, BIZ_LINE_CONTAINER_PROP[key])
    ) {
      return { key, data: null, containerMasked: true };
    }
  }

  return null;
}

/** 业务线属性在该行是否被屏蔽 */
function isBizLinePropMasked(
  line: BizLineResolution,
  propName: string,
): boolean {
  // 容器被屏蔽 → 该业务线全部字段不可见
  if (line.containerMasked) return true;
  // 期望的业务线整体缺失且容器无屏蔽规则 → 数据问题，不判定为无权限
  if (!line.data) return false;

  const lineModule = BIZ_LINE_MODULE[line.key];
  // 没有任何规则时直接放行，避免把「该业务线 DTO 本就不含此字段」误判为被屏蔽
  if (!hasMaskRule(lineModule, propName)) return false;
  return !(toJsonKey(propName) in line.data);
}

/** 某个报表字段在该行是否被屏蔽 */
function isRowFieldMasked(
  order: any,
  line: BizLineResolution | null,
  source: ReportFieldSource,
): boolean {
  if (source.orderProp && isOrderPropMasked(order, source.orderProp)) {
    return true;
  }
  const bizLineProps = source.bizLineProps;
  if (bizLineProps && line) {
    const propName = bizLineProps[line.key];
    // 展示所用的业务线不声明该字段时（如空运出口没有 Vessel），不做屏蔽判定
    if (propName && isBizLinePropMasked(line, propName)) return true;
  }
  return false;
}

/**
 * 计算某一行被屏蔽的报表字段键集合
 * @param item 后端返回的原始报表行 DTO
 */
export function resolveRowMaskedKeys(item: any): Set<string> {
  const masked = new Set<string>();
  if (!item) return masked;

  const order = item.transportOrder;
  if (!order) return masked;

  const line = resolveBizLine(order);
  Object.entries(FIELD_SOURCES).forEach(([rowKey, source]) => {
    if (isRowFieldMasked(order, line, source)) masked.add(rowKey);
  });
  return masked;
}

/**
 * 对一行数据应用字段级权限：被屏蔽的字段以 `***` 覆盖显示值。
 * 在行转换阶段落地（而非单元格渲染器），分组聚合、合计行、Excel 导出
 * 与单元格悬浮提示都会自动带上 `***`，无需改动表格组件。
 *
 * 只覆盖行上已存在的键，避免给该报表没有的列凭空造出数据
 *
 * @param row 已转换的扁平行数据
 * @param item 后端返回的原始报表行 DTO（保留 key 存在性信息，逐行判定的唯一依据）
 */
export function applyFieldMask(row: Record<string, any>, item: any): void {
  if (!isMaskedFieldsLoaded()) return;

  const maskedKeys = resolveRowMaskedKeys(item);
  maskedKeys.forEach((key) => {
    if (key in row) row[key] = MASKED_TEXT;
  });
}

/**
 * 整列隐藏判定：仅当该列**所有**数据来源都被无条件屏蔽时才隐藏。
 * 例如「船名」同时来自海运出口与海运进口，只配了 SeaExport.Vessel 时
 * 海运进口行仍应可见，因此不能整列隐藏，改为逐行 `***`
 */
function isSourceAlwaysMasked(source: ReportFieldSource): boolean {
  const checks: boolean[] = [];

  if (source.orderProp) {
    checks.push(isAlwaysMasked(FrightModule.TransportOrder, source.orderProp));
  }

  const bizLineProps = source.bizLineProps;
  if (bizLineProps) {
    const lines = Object.keys(bizLineProps) as BizLineKey[];
    // 业务线容器（TransportOrder.SeaExport 等）被无条件屏蔽，等同于该线字段被屏蔽
    checks.push(
      lines.every(
        (line) =>
          isAlwaysMasked(BIZ_LINE_MODULE[line], bizLineProps[line] ?? '') ||
          isAlwaysMasked(
            FrightModule.TransportOrder,
            BIZ_LINE_CONTAINER_PROP[line],
          ),
      ),
    );
  }

  return checks.length > 0 && checks.every(Boolean);
}

/**
 * 过滤掉当前用户无权查看的报表列。
 * 未在 FIELD_SOURCES 中声明的列（币别明细、合计金额、超期天数、发票号等
 * 报表自身字段）后端不支持屏蔽，原样保留
 */
export function filterMaskedColumns<T extends HotColumnDef>(columns: T[]): T[] {
  if (!isMaskedFieldsLoaded()) return columns;

  return columns.filter((column) => {
    const source = FIELD_SOURCES[String(column?.data ?? '')];
    if (!source) return true;
    return !isSourceAlwaysMasked(source);
  });
}

/**
 * 计算需要从查询表单中移除的筛选项 fieldName。
 * 只移除无条件屏蔽字段对应的筛选项（坑点 F5：列 / 表单 / 筛选三处都要处理）
 */
export function getMaskedFormFields(schema: VbenFormSchema[]): string[] {
  if (!isMaskedFieldsLoaded()) return [];

  return (schema ?? [])
    .map((item) => item.fieldName)
    .filter((fieldName) => {
      const rowKeys = FORM_FIELD_SOURCES[fieldName];
      if (!rowKeys) return false;
      return rowKeys.every((rowKey) => {
        const source = FIELD_SOURCES[rowKey];
        return source ? isSourceAlwaysMasked(source) : false;
      });
    });
}
