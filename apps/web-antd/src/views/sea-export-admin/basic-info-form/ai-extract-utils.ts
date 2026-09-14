import type { TextInAdminApi } from '#/api/common/text-in-admin';

import { toEnglishUpperCase } from '#/utils/english-upper-case';

import { toDayjs } from './sea-export-detail-mapper';

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export const AI_EXTRACT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp,.doc,.docx,.xls,.xlsx,.rtf,application/pdf,image/png,image/jpeg,image/bmp,image/tiff,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/rtf,text/rtf';

export const AI_EXTRACT_IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'bmp',
  'tiff',
  'tif',
  'webp',
]);

/** Word / Excel / RTF 扩展名（随 File input accept 一并放开） */
export const AI_EXTRACT_OFFICE_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'rtf',
]);

/** 解析港口备注「PortName, CountryEnName」 */
export function splitPortRemark(remark?: null | string): {
  countryEnName?: string;
  portName: string;
} {
  const raw = (remark ?? '').trim();
  if (!raw) return { portName: '' };
  const commaIdx = raw.indexOf(',');
  if (commaIdx < 0) return { portName: raw };
  return {
    portName: raw.slice(0, commaIdx).trim(),
    countryEnName: raw.slice(commaIdx + 1).trim() || undefined,
  };
}

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
  if (AI_EXTRACT_IMAGE_EXTENSIONS.has(ext)) return true;
  return AI_EXTRACT_OFFICE_EXTENSIONS.has(ext);
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

export interface AiExtractFormPayload {
  formValues: Record<string, unknown>;
  orderCtns: TextInAdminApi.OrderCtnExtractAddDto[];
  orderCodeGoodss: number[];
  filledFields: string[];
  unmatchedCtnCount: number;
}

function normalizeExtractOrderCtn(
  item: TextInAdminApi.OrderCtnExtractAddDto,
): TextInAdminApi.OrderCtnExtractAddDto {
  const ctnCodeId = isEmptyRecognizedValue(item.ctnCodeId)
    ? undefined
    : item.ctnCodeId;
  const codePackageId = isEmptyRecognizedValue(item.codePackageId)
    ? undefined
    : item.codePackageId;

  return {
    ...item,
    ctnCodeId,
    ctnCodeName: (item.ctnCodeName ?? '').trim() || undefined,
    codePackageId,
    codePackageName: (item.codePackageName ?? '').trim() || undefined,
  };
}

function hasUsefulOrderCtn(
  item: TextInAdminApi.OrderCtnExtractAddDto,
): boolean {
  return (
    !isEmptyRecognizedValue(item.ctnCodeId) ||
    !!(item.ctnCodeName && item.ctnCodeName.trim()) ||
    !!(item.ctnNo && item.ctnNo.trim()) ||
    !!(item.sealNo && item.sealNo.trim()) ||
    !isEmptyRecognizedValue(item.pkgs) ||
    !isEmptyRecognizedValue(item.grossWeight) ||
    !isEmptyRecognizedValue(item.volume)
  );
}

export function buildAiExtractFormPayload(
  dto: TextInAdminApi.SeaExportExtractFormDto,
  options: {
    allowedFields: Set<string>;
    normalizeValue: (field: string, value: unknown) => unknown;
  },
): AiExtractFormPayload {
  const seaExport = dto;
  const transportOrder =
    seaExport.transportOrder ??
    ({} as TextInAdminApi.TransportOrderExtractAddDto);
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
  assignScalar(formValues, 'terminalVoyno', seaExport.terminalVoyno);
  assignScalar(formValues, 'carrierId', seaExport.carrierId);
  assignScalar(formValues, 'shipAgentId', seaExport.shipAgentId);
  assignScalar(formValues, 'signingTime', seaExport.signingTime);
  assignScalar(formValues, 'signingPortId', seaExport.signingPortId);
  assignScalar(formValues, 'receivePortId', seaExport.receivePortId);
  assignScalar(formValues, 'receivePortRemark', seaExport.receivePortRemark);
  assignScalar(formValues, 'polId', seaExport.polId);
  assignScalar(formValues, 'polRemark', seaExport.polRemark);
  assignScalar(formValues, 'poT1Id', seaExport.poT1Id);
  assignScalar(formValues, 'poT1Remark', seaExport.poT1Remark);
  assignScalar(formValues, 'poT2Id', seaExport.poT2Id);
  assignScalar(formValues, 'poT2Remark', seaExport.poT2Remark);
  assignScalar(formValues, 'podId', seaExport.podId);
  assignScalar(formValues, 'podRemark', seaExport.podRemark);
  assignScalar(formValues, 'deliverPortId', seaExport.deliverPortId);
  assignScalar(formValues, 'deliverPortRemark', seaExport.deliverPortRemark);

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
  assignScalar(formValues, 'remark', transportOrder.remark);

  let unmatchedCtnCount = 0;
  const orderCtns = (transportOrder.orderCtns ?? [])
    .map((item) => normalizeExtractOrderCtn(item))
    .filter(hasUsefulOrderCtn);

  for (const item of orderCtns) {
    if (
      isEmptyRecognizedValue(item.ctnCodeId) &&
      item.ctnCodeName &&
      item.ctnCodeName.trim()
    ) {
      unmatchedCtnCount += 1;
    }
  }

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
    unmatchedCtnCount,
  };
}

/** AI 识别允许回填的表单字段白名单 */
export const AI_RECOGNIZE_ALLOWED_FIELDS = new Set([
  'blType',
  'billType',
  'codeIssueTypeId',
  'issueType',
  'vessel',
  'innerVoyno',
  'terminalVoyno',
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
  'terminalVoyno',
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
