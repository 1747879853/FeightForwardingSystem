import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { formatDate, formatDateTime } from '@vben/utils';

import { FrightModule } from '#/api/system/permission';
import {
  hasMaskRule,
  isAlwaysMasked,
  isMaskedFieldsLoaded,
} from '#/composables/use-masked-fields';

/**
 * 海运出口字段级权限（PropMask）
 *
 * - 条件屏蔽（alwaysMasked=false）：列表/基础信息表单显示 `***`
 * - 非条件屏蔽（alwaysMasked=true）：列表隐藏整列；基础信息表单仍显示 `***`
 *
 * 后端序列化时剔除被屏蔽字段的 key（不是 null）。判定用 `'prop' in obj`，
 * 不能用值是否为空。
 *
 * @see doc/权限/用户或角色字段级别权限逻辑.md
 */

export const MASKED_TEXT = '***';

const SE = FrightModule.SeaExport;
const TO = FrightModule.TransportOrder;

type FieldSource = {
  module: FrightModule;
  /** 后端 PropName（PascalCase） */
  propName: string;
  /** 相对列表行 / 详情 DTO 的 JSON 路径 */
  jsonPath: string[];
};

function se(propName: string, jsonKey: string): FieldSource {
  return { module: SE, propName, jsonPath: [jsonKey] };
}

function to(propName: string, jsonKey: string): FieldSource {
  return { module: TO, propName, jsonPath: ['transportOrder', jsonKey] };
}

function seFk(
  idProp: string,
  idKey: string,
  objProp: string,
  objKey: string,
): FieldSource[] {
  return [se(idProp, idKey), se(objProp, objKey)];
}

function toFk(
  idProp: string,
  idKey: string,
  objProp: string,
  objKey: string,
): FieldSource[] {
  return [to(idProp, idKey), to(objProp, objKey)];
}

function asSources(source: FieldSource | FieldSource[]): FieldSource[] {
  return Array.isArray(source) ? source : [source];
}

/**
 * 列表列 field → 屏蔽数据源。未声明的列（业务状态、费用状态、运踪、录入人等）
 * 不参与 PropMask。
 */
const LIST_COLUMN_SOURCES: Record<string, FieldSource | FieldSource[]> = {
  bookingAgentName: seFk(
    'BookingAgentId',
    'bookingAgentId',
    'BookingAgent',
    'bookingAgent',
  ),
  carrierCode: seFk('CarrierId', 'carrierId', 'Carrier', 'carrier'),
  closeDocTime: se('CloseDocTime', 'closeDocTime'),
  closeVgmTime: se('CloseVgmTime', 'closeVgmTime'),
  closingTime: se('ClosingTime', 'closingTime'),
  codeIssueTypeName: seFk(
    'CodeIssueTypeId',
    'codeIssueTypeId',
    'CodeIssueType',
    'codeIssueType',
  ),
  deliverPortName: [
    se('DeliverPortId', 'deliverPortId'),
    se('DeliverPort', 'deliverPort'),
    se('DeliverPortRemark', 'deliverPortRemark'),
  ],
  innerVoyno: se('InnerVoyno', 'innerVoyno'),
  laneName: [se('PODId', 'podId'), se('POD', 'pod')],
  orgs: [se('OrgId', 'orgId'), se('Orgs', 'orgs')],
  poT1Name: [
    se('POT1Id', 'poT1Id'),
    se('POT1', 'pot1'),
    se('POT1Remark', 'poT1Remark'),
  ],
  poT2Name: [
    se('POT2Id', 'poT2Id'),
    se('POT2', 'pot2'),
    se('POT2Remark', 'poT2Remark'),
  ],
  podName: [
    se('PODId', 'podId'),
    se('POD', 'pod'),
    se('PODRemark', 'podRemark'),
  ],
  polName: [
    se('POLId', 'polId'),
    se('POL', 'pol'),
    se('POLRemark', 'polRemark'),
  ],
  receivePortName: [
    se('ReceivePortId', 'receivePortId'),
    se('ReceivePort', 'receivePort'),
    se('ReceivePortRemark', 'receivePortRemark'),
  ],
  'transportOrder.accountDate': to('AccountDate', 'accountDate'),
  'transportOrder.atd': to('ATD', 'atd'),
  'transportOrder.cbm': to('Cbm', 'cbm'),
  'transportOrder.clientName': toFk('ClientId', 'clientId', 'Client', 'client'),
  'transportOrder.codeFrtName': toFk(
    'CodeFrtId',
    'codeFrtId',
    'CodeFrt',
    'codeFrt',
  ),
  'transportOrder.codePackageName': toFk(
    'CodePackageId',
    'codePackageId',
    'CodePackage',
    'codePackage',
  ),
  'transportOrder.codeSourceName': toFk(
    'CodeSourceId',
    'codeSourceId',
    'CodeSource',
    'codeSource',
  ),
  'transportOrder.commissionNum': to('CommissionNum', 'commissionNum'),
  'transportOrder.consigneeName': toFk(
    'ConsigneeId',
    'consigneeId',
    'Consignee',
    'consignee',
  ),
  'transportOrder.contractNum': to('ContractNum', 'contractNum'),
  'transportOrder.eta': to('ETA', 'eta'),
  'transportOrder.etd': to('ETD', 'etd'),
  'transportOrder.feeLocked': to('FeeLocked', 'feeLocked'),
  'transportOrder.goodsCompleteTime': to(
    'GoodsCompleteTime',
    'goodsCompleteTime',
  ),
  'transportOrder.goodsDes': to('GoodsDes', 'goodsDes'),
  'transportOrder.internalRemark': to('InternalRemark', 'internalRemark'),
  'transportOrder.isBusinessLocking': to(
    'IsBusinessLocking',
    'isBusinessLocking',
  ),
  'transportOrder.isUnfinished': to('IsUnfinished', 'isUnfinished'),
  'transportOrder.kgs': to('Kgs', 'kgs'),
  'transportOrder.marks': to('Marks', 'marks'),
  'transportOrder.mblNum': to('MblNum', 'mblNum'),
  'transportOrder.notifierName': toFk(
    'NotifierId',
    'notifierId',
    'Notifier',
    'notifier',
  ),
  'transportOrder.pkgs': to('Pkgs', 'pkgs'),
  'transportOrder.remark': to('Remark', 'remark'),
  'transportOrder.shipperName': toFk(
    'ShipperId',
    'shipperId',
    'Shipper',
    'shipper',
  ),
  'transportOrder.teu': [to('Teu', 'teu'), to('OrderCtns', 'orderCtns')],
  'transportOrder.totalCtn': [
    to('TotalCtn', 'totalCtn'),
    to('OrderCtns', 'orderCtns'),
  ],
  billType: se('BillType', 'billType'),
  blType: se('BLType', 'blType'),
  businessUserName: to('OrderUsers', 'orderUsers'),
  customerServiceUserName: to('OrderUsers', 'orderUsers'),
  documentationUserName: to('OrderUsers', 'orderUsers'),
  operationUserName: to('OrderUsers', 'orderUsers'),
  saleUserName: to('OrderUsers', 'orderUsers'),
  vessel: se('Vessel', 'vessel'),
  yardName: seFk('YardId', 'yardId', 'Yard', 'yard'),
};

/**
 * 基础信息表单 fieldName → 屏蔽数据源。
 * 路径相对详情 DTO（与 flattenDetail 同源）。
 */
const FORM_FIELD_SOURCES: Record<string, FieldSource | FieldSource[]> = {
  accountDate: to('AccountDate', 'accountDate'),
  atd: to('ATD', 'atd'),
  billType: se('BillType', 'billType'),
  blType: se('BLType', 'blType'),
  bookingAgentId: seFk(
    'BookingAgentId',
    'bookingAgentId',
    'BookingAgent',
    'bookingAgent',
  ),
  bookingNum: to('BookingNum', 'bookingNum'),
  cargoId: to('CargoId', 'cargoId'),
  carrierId: seFk('CarrierId', 'carrierId', 'Carrier', 'carrier'),
  cbm: to('Cbm', 'cbm'),
  clientId: toFk('ClientId', 'clientId', 'Client', 'client'),
  closeDocTime: se('CloseDocTime', 'closeDocTime'),
  closeManifestTime: se('CloseManifestTime', 'closeManifestTime'),
  closeVgmTime: se('CloseVgmTime', 'closeVgmTime'),
  closingTime: se('ClosingTime', 'closingTime'),
  codeFrtId: toFk('CodeFrtId', 'codeFrtId', 'CodeFrt', 'codeFrt'),
  codeIssueTypeId: seFk(
    'CodeIssueTypeId',
    'codeIssueTypeId',
    'CodeIssueType',
    'codeIssueType',
  ),
  codePackageId: toFk(
    'CodePackageId',
    'codePackageId',
    'CodePackage',
    'codePackage',
  ),
  codeServiceId: toFk(
    'CodeServiceId',
    'codeServiceId',
    'CodeService',
    'codeService',
  ),
  codeSourceId: toFk(
    'CodeSourceId',
    'codeSourceId',
    'CodeSource',
    'codeSource',
  ),
  commissionNum: to('CommissionNum', 'commissionNum'),
  consigneeContent: to('ConsigneeContent', 'consigneeContent'),
  consigneeId: toFk('ConsigneeId', 'consigneeId', 'Consignee', 'consignee'),
  contractNum: to('ContractNum', 'contractNum'),
  copyNoBillEnum: se('CopyNoBillEnum', 'copyNoBillEnum'),
  countryName: [se('PODId', 'podId'), se('POD', 'pod')],
  custBrokerId: toFk(
    'CustBrokerId',
    'custBrokerId',
    'CustBroker',
    'custBroker',
  ),
  deliverPortId: seFk(
    'DeliverPortId',
    'deliverPortId',
    'DeliverPort',
    'deliverPort',
  ),
  deliverPortRemark: se('DeliverPortRemark', 'deliverPortRemark'),
  dgContact: to('DgContact', 'dgContact'),
  dgFlashPoint: to('DgFlashPoint', 'dgFlashPoint'),
  dgLabel: to('DgLabel', 'dgLabel'),
  dgLevel: to('DgLevel', 'dgLevel'),
  dgMarinePollution: to('DgMarinePollution', 'dgMarinePollution'),
  dgNetWeight: to('DgNetWeight', 'dgNetWeight'),
  dgNo: to('DgNo', 'dgNo'),
  dgPackingCategory: to('DgPackingCategory', 'dgPackingCategory'),
  dgPackingNo: to('DgPackingNo', 'dgPackingNo'),
  dgPageNo: to('DgPageNo', 'dgPageNo'),
  dgTel: to('DgTel', 'dgTel'),
  eta: to('ETA', 'eta'),
  etd: to('ETD', 'etd'),
  feeLocked: to('FeeLocked', 'feeLocked'),
  goodsCompleteTime: to('GoodsCompleteTime', 'goodsCompleteTime'),
  goodsDes: to('GoodsDes', 'goodsDes'),
  innerVoyno: se('InnerVoyno', 'innerVoyno'),
  insuranceId: toFk('InsuranceId', 'insuranceId', 'Insurance', 'insurance'),
  internalRemark: to('InternalRemark', 'internalRemark'),
  isBusinessLocking: to('IsBusinessLocking', 'isBusinessLocking'),
  kgs: to('Kgs', 'kgs'),
  laneName: [se('PODId', 'podId'), se('POD', 'pod')],
  marks: to('Marks', 'marks'),
  mblNum: to('MblNum', 'mblNum'),
  noBillEnum: se('NoBillEnum', 'noBillEnum'),
  notifierContent: to('NotifierContent', 'notifierContent'),
  notifierId: toFk('NotifierId', 'notifierId', 'Notifier', 'notifier'),
  orderCodeGoodss: to('OrderCodeGoodss', 'orderCodeGoodss'),
  orderUsers: to('OrderUsers', 'orderUsers'),
  orgId: [se('OrgId', 'orgId'), se('Orgs', 'orgs')],
  pkgs: to('Pkgs', 'pkgs'),
  poT1Id: seFk('POT1Id', 'poT1Id', 'POT1', 'pot1'),
  poT1Remark: se('POT1Remark', 'poT1Remark'),
  poT2Id: seFk('POT2Id', 'poT2Id', 'POT2', 'pot2'),
  poT2Remark: se('POT2Remark', 'poT2Remark'),
  podAgentContent: se('PodAgentContent', 'podAgentContent'),
  podAgentId: seFk('PodAgentId', 'podAgentId', 'PodAgent', 'podAgent'),
  podId: seFk('PODId', 'podId', 'POD', 'pod'),
  podRemark: se('PODRemark', 'podRemark'),
  polId: seFk('POLId', 'polId', 'POL', 'pol'),
  polRemark: se('POLRemark', 'polRemark'),
  prepareAtId: toFk('PrepareAtId', 'prepareAtId', 'PrepareAt', 'prepareAt'),
  receivePortId: seFk(
    'ReceivePortId',
    'receivePortId',
    'ReceivePort',
    'receivePort',
  ),
  receivePortRemark: se('ReceivePortRemark', 'receivePortRemark'),
  reeferHumidity: to('ReeferHumidity', 'reeferHumidity'),
  reeferMaxTemperature: to('ReeferMaxTemperature', 'reeferMaxTemperature'),
  reeferMinTemperature: to('ReeferMinTemperature', 'reeferMinTemperature'),
  reeferTemperature: to('ReeferTemperature', 'reeferTemperature'),
  reeferTemperatureUnit: to('ReeferTemperatureUnit', 'reeferTemperatureUnit'),
  reeferVentOpen: to('ReeferVentOpen', 'reeferVentOpen'),
  reeferVentilation: to('ReeferVentilation', 'reeferVentilation'),
  remark: to('Remark', 'remark'),
  secondNotifierContent: se('SecondNotifierContent', 'secondNotifierContent'),
  secondNotifierId: seFk(
    'SecondNotifierId',
    'secondNotifierId',
    'SecondNotifier',
    'secondNotifier',
  ),
  settlementDate: to('SettlementDate', 'settlementDate'),
  shipAgentId: seFk('ShipAgentId', 'shipAgentId', 'ShipAgent', 'shipAgent'),
  shipperContent: to('ShipperContent', 'shipperContent'),
  shipperId: toFk('ShipperId', 'shipperId', 'Shipper', 'shipper'),
  signingPortId: seFk(
    'SigningPortId',
    'signingPortId',
    'SigningPort',
    'signingPort',
  ),
  signingTime: se('SigningTime', 'signingTime'),
  teamId: toFk('TeamId', 'teamId', 'Team', 'team'),
  terminalVoyno: se('TerminalVoyno', 'terminalVoyno'),
  tradeTermsType: to('TradeTermsType', 'tradeTermsType'),
  vessel: se('Vessel', 'vessel'),
  warehouseId: toFk('WarehouseId', 'warehouseId', 'Warehouse', 'warehouse'),
  yardContact: se('YardContact', 'yardContact'),
  yardEmail: se('YardEmail', 'yardEmail'),
  yardId: seFk('YardId', 'yardId', 'Yard', 'yard'),
  yardMobile: se('YardMobile', 'yardMobile'),
  yardTel: se('YardTel', 'yardTel'),
};

/** 列表搜索项 fieldName → 屏蔽数据源（仅 alwaysMasked 时隐藏筛选项） */
const SEARCH_FIELD_SOURCES: Record<string, FieldSource | FieldSource[]> = {
  BLType: se('BLType', 'blType'),
  BillType: se('BillType', 'billType'),
  BookingAgentId: se('BookingAgentId', 'bookingAgentId'),
  CargoId: to('CargoId', 'cargoId'),
  CarrierId: se('CarrierId', 'carrierId'),
  ClientId: to('ClientId', 'clientId'),
  CloseDocTimeRange: se('CloseDocTime', 'closeDocTime'),
  CodeIssueTypeId: se('CodeIssueTypeId', 'codeIssueTypeId'),
  CodeSourceId: to('CodeSourceId', 'codeSourceId'),
  ContractNum: to('ContractNum', 'contractNum'),
  ETDRange: to('ETD', 'etd'),
  AccountDateRange: to('AccountDate', 'accountDate'),
  FeeLocked: to('FeeLocked', 'feeLocked'),
  GoodsDes: to('GoodsDes', 'goodsDes'),
  InnerVoyno: se('InnerVoyno', 'innerVoyno'),
  InternalRemark: to('InternalRemark', 'internalRemark'),
  IsBusinessLocking: to('IsBusinessLocking', 'isBusinessLocking'),
  PODId: se('PODId', 'podId'),
  POLId: se('POLId', 'polId'),
  Remark: to('Remark', 'remark'),
  TerminalVoyno: se('TerminalVoyno', 'terminalVoyno'),
  TradeTermsType: to('TradeTermsType', 'tradeTermsType'),
  Vessel: se('Vessel', 'vessel'),
  YardId: se('YardId', 'yardId'),
  OrgId: se('OrgId', 'orgId'),
  TeamId: to('TeamId', 'teamId'),
  CustBrokerId: to('CustBrokerId', 'custBrokerId'),
  SaleId: to('OrderUsers', 'orderUsers'),
  OperationId: to('OrderUsers', 'orderUsers'),
  BusinessId: to('OrderUsers', 'orderUsers'),
  CustomerServiceId: to('OrderUsers', 'orderUsers'),
  DocumentationId: to('OrderUsers', 'orderUsers'),
};

function hasJsonPath(root: unknown, jsonPath: string[]): boolean {
  let current: unknown = root;
  for (const [index, key] of jsonPath.entries()) {
    if (current == null || typeof current !== 'object') {
      return false;
    }
    const record = current as Record<string, unknown>;
    if (!(key in record)) {
      return false;
    }
    current = record[key];
    const isLast = index === jsonPath.length - 1;
    if (!isLast && current == null) {
      return false;
    }
  }
  return true;
}

function isSourceAlwaysMasked(source: FieldSource): boolean {
  return isAlwaysMasked(source.module, source.propName);
}

function isSourceConditionallyRuled(source: FieldSource): boolean {
  return (
    hasMaskRule(source.module, source.propName) &&
    !isAlwaysMasked(source.module, source.propName)
  );
}

function isSourceMissingOnDto(dto: unknown, source: FieldSource): boolean {
  if (!hasMaskRule(source.module, source.propName)) {
    return false;
  }
  return !hasJsonPath(dto, source.jsonPath);
}

function sourcesOf(
  map: Record<string, FieldSource | FieldSource[]>,
  field: string,
): FieldSource[] {
  const source = map[field];
  return source ? asSources(source) : [];
}

/** 该列表列是否存在无条件屏蔽（应整列隐藏） */
export function isSeaExportListColumnAlwaysMasked(field: string): boolean {
  if (!isMaskedFieldsLoaded() || !field) return false;
  const sources = sourcesOf(LIST_COLUMN_SOURCES, field);
  return sources.some((source) => isSourceAlwaysMasked(source));
}

function getPathValue(root: unknown, path: string[]): unknown {
  let current: unknown = root;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    const record = current as Record<string, unknown>;
    if (!(key in record)) return undefined;
    current = record[key];
  }
  return current;
}

/** 该行该列是否应显示 `***`（仅条件屏蔽；无条件列已被隐藏） */
export function isSeaExportListCellMasked(
  row: unknown,
  field: string,
): boolean {
  if (!isMaskedFieldsLoaded() || !field || !row) return false;
  const sources = sourcesOf(LIST_COLUMN_SOURCES, field);
  if (sources.length === 0) return false;
  if (sources.some((source) => isSourceAlwaysMasked(source))) {
    return false;
  }
  const conditional = sources.some((source) =>
    isSourceConditionallyRuled(source),
  );
  if (!conditional) return false;
  // afterFetch 会把缺失 key 写成 ***，写回后仍要按打码显示（费用锁等自定义槽位）
  if (getPathValue(row, field.split('.')) === MASKED_TEXT) {
    return true;
  }
  return sources.some((source) => isSourceMissingOnDto(row, source));
}

export function getAlwaysMaskedListColumnFields(): string[] {
  if (!isMaskedFieldsLoaded()) return [];
  return Object.keys(LIST_COLUMN_SOURCES).filter((field) =>
    isSeaExportListColumnAlwaysMasked(field),
  );
}

export function getAlwaysMaskedSearchFieldNames(): string[] {
  if (!isMaskedFieldsLoaded()) return [];
  return Object.keys(SEARCH_FIELD_SOURCES).filter((fieldName) =>
    sourcesOf(SEARCH_FIELD_SOURCES, fieldName).some((source) =>
      isSourceAlwaysMasked(source),
    ),
  );
}

/**
 * 基础信息表单应显示 `***` 的 fieldName。
 * - 无条件屏蔽：始终打码（含新建、无详情）
 * - 条件屏蔽：仅当详情里对应 key 被剔除
 */
export function resolveMaskedFormFields(
  detail?: null | SeaExportAdminApi.SeaExportDto,
): Set<string> {
  const masked = new Set<string>();
  if (!isMaskedFieldsLoaded()) return masked;

  Object.keys(FORM_FIELD_SOURCES).forEach((fieldName) => {
    const sources = sourcesOf(FORM_FIELD_SOURCES, fieldName);
    const always = sources.some((source) => isSourceAlwaysMasked(source));
    if (always) {
      masked.add(fieldName);
      return;
    }
    if (!detail) return;
    const conditional = sources.some((source) =>
      isSourceConditionallyRuled(source),
    );
    if (!conditional) return;
    if (sources.some((source) => isSourceMissingOnDto(detail, source))) {
      masked.add(fieldName);
    }
  });
  return masked;
}

export function buildMaskedFormSchemaPatches(
  fieldNames: Iterable<string>,
): Partial<VbenFormSchema>[] {
  return [...fieldNames].map((fieldName) => ({
    fieldName,
    component: 'ReadonlyText',
    rules: '',
    componentProps: {
      emptyText: MASKED_TEXT,
    },
  }));
}

export function omitMaskedFormValues(
  values: Record<string, any>,
  maskedFields: Iterable<string>,
): Record<string, any> {
  const next = { ...values };
  for (const fieldName of maskedFields) {
    delete next[fieldName];
  }
  return next;
}

export function applySeaExportListRowMasks<T extends Record<string, any>>(
  row: T,
): T {
  if (!isMaskedFieldsLoaded() || !row) return row;
  Object.keys(LIST_COLUMN_SOURCES).forEach((field) => {
    if (!isSeaExportListCellMasked(row, field)) return;
    setExistingPath(row, field.split('.'), MASKED_TEXT);
  });
  return row;
}

export function applySeaExportListColumnFormatters<
  T extends NonNullable<VxeTableGridOptions['columns']>[number],
>(columns: T[]): T[] {
  return columns.map((col) => {
    if (!col || !('field' in col) || !col.field) return col;
    const field = String(col.field);
    const originalFormatter = (col as { formatter?: unknown }).formatter;
    return {
      ...col,
      formatter: (params: { cellValue: unknown; row: unknown }) => {
        if (isSeaExportListCellMasked(params.row, field)) {
          return MASKED_TEXT;
        }
        if (typeof originalFormatter === 'function') {
          return (originalFormatter as (value: typeof params) => unknown)(
            params,
          );
        }
        if (originalFormatter === 'formatDate') {
          return formatDate(params.cellValue as string);
        }
        if (originalFormatter === 'formatDateTime') {
          return formatDateTime(params.cellValue as string);
        }
        return params.cellValue ?? '';
      },
    };
  });
}

function setExistingPath(
  root: Record<string, any>,
  path: string[],
  value: string,
): void {
  if (path.length === 0) return;
  let current: Record<string, any> = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!key || current[key] == null || typeof current[key] !== 'object') {
      return;
    }
    current = current[key] as Record<string, any>;
  }
  const last = path[path.length - 1];
  if (last) current[last] = value;
}
