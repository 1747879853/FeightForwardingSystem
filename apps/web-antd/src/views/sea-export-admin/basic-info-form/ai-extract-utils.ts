import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { TextInAdminApi } from '#/api/common/text-in-admin';

import { toEnglishUpperCase } from '#/utils/english-upper-case';

import { toDayjs } from './sea-export-detail-mapper';

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export const AI_EXTRACT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp,application/pdf,image/png,image/jpeg,image/bmp,image/tiff,image/webp';

export const AI_EXTRACT_IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'bmp',
  'tiff',
  'tif',
  'webp',
]);

/** 表单字段 -> citations 中文字段名（可多 key） */
export const FORM_FIELD_CITATION_KEYS: Record<string, string[]> = {
  vessel: ['船名'],
  innerVoyno: ['航次'],
  carrierId: ['船公司简称', '船公司'],
  shipAgentId: ['船代'],
  codeIssueTypeId: ['签单方式'],
  signingPortId: ['签单地点'],
  signingTime: ['签单日期'],
  polId: ['起运港名称', '起运港代码'],
  podId: ['目的港名称', '目的港代码'],
  deliverPortId: ['交货地名称', '交货港代码'],
  mblNum: ['主提单号'],
  bookingNum: ['订舱编号'],
  clientId: ['委托单位'],
  consigneeContent: ['收货人'],
  shipperContent: ['发货人'],
  notifierContent: ['通知人'],
  marks: ['唛头'],
  goodsDes: ['货物描述'],
  pkgs: ['件数'],
  kgs: ['毛重kgs'],
  cbm: ['体积cbm'],
  goodsCompleteTime: ['货好日期'],
  etd: ['开船日期'],
  codePackageId: ['包装'],
  codeServiceId: ['运输条款'],
  tradeTermsType: ['贸易条款'],
  orderCodeGoodss: ['品名'],
  orderCtns: ['箱型箱量'],
};

export function isEmptyRecognizedValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && value === 0) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.toLowerCase() === EMPTY_GUID.toLowerCase()) return true;
  }
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function isAiExtractSupportedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return true;
  return AI_EXTRACT_IMAGE_EXTENSIONS.has(ext);
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

export function resolveCitationKeys(fieldName: string): string[] {
  return FORM_FIELD_CITATION_KEYS[fieldName] ?? [];
}

export function resolveCitationForField(
  fieldName: string,
  citations?: Record<string, TextInAdminApi.TextInFieldCitationDto>,
): TextInAdminApi.TextInFieldCitationDto | undefined {
  if (!citations) return undefined;
  for (const key of resolveCitationKeys(fieldName)) {
    const citation = citations[key];
    if (citation) return citation;
  }
  return undefined;
}

export interface AiExtractFormPayload {
  formValues: Record<string, unknown>;
  orderCtns: SeaExportAdminApi.OrderCtnAddDto[];
  orderCodeGoodss: number[];
  filledFields: string[];
}

export function buildAiExtractFormPayload(
  dto: TextInAdminApi.SeaExportExtractAddDto,
  options: {
    allowedFields: Set<string>;
    normalizeValue: (field: string, value: unknown) => unknown;
  },
): AiExtractFormPayload {
  const seaExport = dto.seaExport ?? {};
  const transportOrder = seaExport.transportOrder ?? {};
  const filledFields: string[] = [];

  const assignScalar = (
    target: Record<string, unknown>,
    field: string,
    value: unknown,
  ) => {
    if (!options.allowedFields.has(field)) return;
    if (isEmptyRecognizedValue(value)) return;
    const normalized = options.normalizeValue(field, value);
    if (isEmptyRecognizedValue(normalized)) return;
    target[field] = normalized;
    filledFields.push(field);
  };

  const formValues: Record<string, unknown> = {};

  assignScalar(formValues, 'blType', seaExport.blType);
  assignScalar(formValues, 'billType', seaExport.billType);
  assignScalar(
    formValues,
    'codeIssueTypeId',
    seaExport.codeIssueTypeId ?? seaExport.issueType,
  );
  assignScalar(formValues, 'vessel', seaExport.vessel);
  assignScalar(formValues, 'innerVoyno', seaExport.innerVoyno);
  assignScalar(formValues, 'carrierId', seaExport.carrierId);
  assignScalar(formValues, 'shipAgentId', seaExport.shipAgentId);
  assignScalar(formValues, 'signingTime', seaExport.signingTime);
  assignScalar(formValues, 'signingPortId', seaExport.signingPortId);
  assignScalar(formValues, 'polId', seaExport.polId);
  assignScalar(formValues, 'podId', seaExport.podId);
  assignScalar(formValues, 'deliverPortId', seaExport.deliverPortId);
  assignScalar(formValues, 'remark', seaExport.remark);

  assignScalar(formValues, 'mblNum', transportOrder.mblNum);
  assignScalar(formValues, 'bookingNum', transportOrder.bookingNum);
  assignScalar(formValues, 'clientId', transportOrder.clientId);
  assignScalar(formValues, 'consigneeContent', transportOrder.consigneeContent);
  assignScalar(formValues, 'shipperContent', transportOrder.shipperContent);
  assignScalar(formValues, 'notifierContent', transportOrder.notifierContent);
  assignScalar(formValues, 'marks', transportOrder.marks);
  assignScalar(formValues, 'goodsDes', transportOrder.goodsDes);
  assignScalar(formValues, 'pkgs', transportOrder.pkgs);
  assignScalar(formValues, 'kgs', transportOrder.kgs);
  assignScalar(formValues, 'cbm', transportOrder.cbm);
  assignScalar(
    formValues,
    'goodsCompleteTime',
    transportOrder.goodsCompleteTime,
  );
  assignScalar(formValues, 'etd', transportOrder.etd);
  assignScalar(formValues, 'codePackageId', transportOrder.codePackageId);
  assignScalar(formValues, 'codeServiceId', transportOrder.codeServiceId);
  assignScalar(formValues, 'tradeTermsType', transportOrder.tradeTermsType);
  assignScalar(formValues, 'internalRemark', transportOrder.internalRemark);

  const orderCtns = (transportOrder.orderCtns ?? []).filter(
    (item) => !isEmptyRecognizedValue(item?.ctnCodeId),
  );
  if (orderCtns.length > 0) {
    filledFields.push('orderCtns');
  }

  const orderCodeGoodss = (transportOrder.orderCodeGoodss ?? [])
    .map((item) => item?.codeGoodsId)
    .filter((id): id is number => !isEmptyRecognizedValue(id));
  if (orderCodeGoodss.length > 0) {
    filledFields.push('orderCodeGoodss');
  }

  return {
    formValues,
    orderCtns,
    orderCodeGoodss,
    filledFields,
  };
}

export function pickExtractedLabel(
  schema: Record<string, unknown> | undefined,
  keys: string[],
): string {
  if (!schema) return '';
  for (const key of keys) {
    const value = schema[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** AI 识别允许回填的表单字段白名单 */
export const AI_RECOGNIZE_ALLOWED_FIELDS = new Set([
  'blType',
  'billType',
  'codeIssueTypeId',
  'issueType',
  'vessel',
  'innerVoyno',
  'carrierId',
  'secondNotifierId',
  'secondNotifierContent',
  'podAgentId',
  'podAgentContent',
  'bookingAgentId',
  'shipAgentId',
  'yardId',
  'noBillEnum',
  'copyNoBillEnum',
  'prepareAtId',
  'closingTime',
  'closeVgmTime',
  'closeDocTime',
  'closeManifestTime',
  'signingTime',
  'signingPortId',
  'podId',
  'podRemark',
  'polId',
  'polRemark',
  'poT1Id',
  'poT1Remark',
  'poT2Id',
  'poT2Remark',
  'receivePortId',
  'receivePortRemark',
  'deliverPortId',
  'deliverPortRemark',
  'remark',
  'commissionNum',
  'mblNum',
  'bookingNum',
  'accountDate',
  'settlementDate',
  'codeSourceId',
  'codeFrtId',
  'codeServiceId',
  'cargoId',
  'tradeTermsType',
  'goodsCompleteTime',
  'etd',
  'atd',
  'eta',
  'clientId',
  'teamId',
  'custBrokerId',
  'warehouseId',
  'insuranceId',
  'consigneeId',
  'consigneeContent',
  'shipperId',
  'shipperContent',
  'notifierId',
  'notifierContent',
  'marks',
  'pkgs',
  'codePackageId',
  'goodsDes',
  'kgs',
  'cbm',
  'internalRemark',
]);
const AI_RECOGNIZE_DATE_FIELDS = new Set([
  'goodsCompleteTime',
  'etd',
  'atd',
  'eta',
  'closingTime',
  'closeVgmTime',
  'closeDocTime',
  'closeManifestTime',
  'signingTime',
  'accountDate',
  'settlementDate',
]);
const parseNumberFromText = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const matched = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!matched) return undefined;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const ENGLISH_UPPER_CASE_FIELDS = new Set([
  'marks',
  'goodsDes',
  'shipperContent',
  'consigneeContent',
  'notifierContent',
  'secondNotifierContent',
  'podAgentContent',
  'receivePortRemark',
  'polRemark',
  'poT1Remark',
  'poT2Remark',
  'podRemark',
  'deliverPortRemark',
  'vessel',
  'innerVoyno',
  'mblNum',
]);
/** 按字段类型规范化 AI 识别值（日期→dayjs、数值→number、英文字段→大写） */
export const normalizeAiFieldValue = (field: string, value: unknown) => {
  if (AI_RECOGNIZE_DATE_FIELDS.has(field)) {
    return toDayjs(value as string | undefined);
  }
  if (field === 'pkgs' || field === 'kgs' || field === 'cbm') {
    return parseNumberFromText(value);
  }
  if (ENGLISH_UPPER_CASE_FIELDS.has(field) && typeof value === 'string') {
    return toEnglishUpperCase(value.trim());
  }
  if (field === 'bookingNum') {
    return typeof value === 'string' ? value.trim() : value;
  }
  return value;
};
