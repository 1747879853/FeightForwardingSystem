import type { TextInAdminApi } from '#/api/common/text-in-admin';

import { toEnglishUpperCase } from '#/utils/english-upper-case';

import { toDayjs } from './sea-import-detail-mapper';

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export const AI_EXTRACT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp,.doc,.docx,.xls,.xlsx,.ofd,application/pdf,image/png,image/jpeg,image/bmp,image/tiff,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/ofd';

export const AI_EXTRACT_IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'bmp',
  'tiff',
  'tif',
  'webp',
]);

export const AI_EXTRACT_OFFICE_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ofd',
]);

/** 表单字段 -> citations 中文字段名（可多 key） */
export const FORM_FIELD_CITATION_KEYS: Record<string, string[]> = {
  vessel: ['船名'],
  innerVoyno: ['航次'],
  terminalVoyno: ['码头航次'],
  carrierId: ['船公司简称', '船公司'],
  polId: ['起运港名称', '起运港代码'],
  podId: ['目的港名称', '目的港代码'],
  mblNum: ['主提单号'],
  clientId: ['委托单位'],
  consigneeContent: ['收货人'],
  shipperContent: ['发货人'],
  notifierContent: ['通知人'],
  marks: ['唛头'],
  goodsDes: ['货物描述'],
  pkgs: ['件数'],
  kgs: ['毛重kgs'],
  cbm: ['体积cbm'],
  /** 进口界面「到港日期」对应 eTD */
  etd: ['到港日期'],
  codePackageId: ['包装'],
  codeServiceId: ['运输条款'],
  orderCodeGoodss: ['品名'],
  orderCtns: ['集装箱信息', '箱型箱量'],
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
  if (AI_EXTRACT_IMAGE_EXTENSIONS.has(ext)) return true;
  return AI_EXTRACT_OFFICE_EXTENSIONS.has(ext);
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

/**
 * 兼容 Newtonsoft camelCase（pOLId / pKGS / eTD）与常见 polId / pkgs / etd。
 */
function pickProp<T = unknown>(
  source: Record<string, unknown> | null | undefined,
  ...keys: string[]
): T | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key] as T;
    }
  }
  return undefined;
}

export interface AiExtractFormPayload {
  formValues: Record<string, unknown>;
  orderCtns: TextInAdminApi.SeaImportOrderCtnExtractAddDto[];
  orderCodeGoodss: Array<number | string>;
  filledFields: string[];
  /** 箱型 id 未匹配（ctnCodeId=0）但仍带回识别原文的行数 */
  unmatchedCtnCount: number;
}

function normalizeExtractOrderCtn(
  item: TextInAdminApi.SeaImportOrderCtnExtractAddDto,
): TextInAdminApi.SeaImportOrderCtnExtractAddDto {
  const raw = item as Record<string, unknown>;
  const ctnCodeIdRaw = pickProp(raw, 'ctnCodeId');
  const ctnCodeId = isEmptyRecognizedValue(ctnCodeIdRaw)
    ? undefined
    : (ctnCodeIdRaw as TextInAdminApi.SeaImportOrderCtnExtractAddDto['ctnCodeId']);

  const codePackageIdRaw = pickProp(raw, 'codePackageId');
  const codePackageId = isEmptyRecognizedValue(codePackageIdRaw)
    ? undefined
    : (codePackageIdRaw as TextInAdminApi.SeaImportOrderCtnExtractAddDto['codePackageId']);

  const pkgs = pickProp<number>(raw, 'pkgs', 'pKGS');
  const grossWeight = pickProp<number>(raw, 'grossWeight');
  const tareWeight = pickProp<number>(raw, 'tareWeight');
  const netWeight = pickProp<number>(raw, 'netWeight');

  return {
    ...item,
    ctnCodeId,
    ctnCodeName:
      (pickProp<string>(raw, 'ctnCodeName') ?? '').trim() || undefined,
    codePackageId,
    codePackageName:
      (pickProp<string>(raw, 'codePackageName') ?? '').trim() || undefined,
    ctnNo: pickProp<string>(raw, 'ctnNo'),
    sealNo: pickProp<string>(raw, 'sealNo'),
    pkgs: isEmptyRecognizedValue(pkgs) ? undefined : pkgs,
    grossWeight: isEmptyRecognizedValue(grossWeight) ? undefined : grossWeight,
    tareWeight: isEmptyRecognizedValue(tareWeight) ? undefined : tareWeight,
    netWeight: isEmptyRecognizedValue(netWeight) ? undefined : netWeight,
    volume: (() => {
      const volume = pickProp<number>(raw, 'volume');
      return isEmptyRecognizedValue(volume) ? undefined : volume;
    })(),
    codeGoodsId: undefined,
    codeGoodsSpecId: undefined,
    codeGoodsModelId: undefined,
    bookingNo: undefined,
    remark: undefined,
  };
}

function hasUsefulOrderCtn(
  item: TextInAdminApi.SeaImportOrderCtnExtractAddDto,
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
  dto: TextInAdminApi.SeaImportExtractAddDto,
  options: {
    allowedFields: Set<string>;
    normalizeValue: (field: string, value: unknown) => unknown;
  },
): AiExtractFormPayload {
  const seaImportRaw = (dto.seaImport ?? {}) as Record<string, unknown>;
  const transportOrderRaw = (seaImportRaw.transportOrder ?? {}) as Record<
    string,
    unknown
  >;
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

  assignScalar(formValues, 'vessel', pickProp(seaImportRaw, 'vessel'));
  assignScalar(formValues, 'innerVoyno', pickProp(seaImportRaw, 'innerVoyno'));
  assignScalar(
    formValues,
    'terminalVoyno',
    pickProp(seaImportRaw, 'terminalVoyno'),
  );
  assignScalar(formValues, 'carrierId', pickProp(seaImportRaw, 'carrierId'));
  assignScalar(formValues, 'polId', pickProp(seaImportRaw, 'polId', 'pOLId'));
  assignScalar(
    formValues,
    'polRemark',
    pickProp(seaImportRaw, 'polRemark', 'pOLRemark'),
  );
  assignScalar(formValues, 'podId', pickProp(seaImportRaw, 'podId', 'pODId'));
  assignScalar(
    formValues,
    'podRemark',
    pickProp(seaImportRaw, 'podRemark', 'pODRemark'),
  );

  assignScalar(formValues, 'mblNum', pickProp(transportOrderRaw, 'mblNum'));
  assignScalar(formValues, 'clientId', pickProp(transportOrderRaw, 'clientId'));
  assignScalar(
    formValues,
    'consigneeContent',
    pickProp(transportOrderRaw, 'consigneeContent'),
  );
  assignScalar(
    formValues,
    'shipperContent',
    pickProp(transportOrderRaw, 'shipperContent'),
  );
  assignScalar(
    formValues,
    'notifierContent',
    pickProp(transportOrderRaw, 'notifierContent'),
  );
  assignScalar(formValues, 'marks', pickProp(transportOrderRaw, 'marks'));
  assignScalar(formValues, 'goodsDes', pickProp(transportOrderRaw, 'goodsDes'));
  assignScalar(formValues, 'pkgs', pickProp(transportOrderRaw, 'pkgs', 'pKGS'));
  assignScalar(formValues, 'kgs', pickProp(transportOrderRaw, 'kgs'));
  assignScalar(formValues, 'cbm', pickProp(transportOrderRaw, 'cbm'));
  assignScalar(formValues, 'etd', pickProp(transportOrderRaw, 'etd', 'eTD'));
  assignScalar(
    formValues,
    'codePackageId',
    pickProp(transportOrderRaw, 'codePackageId'),
  );
  assignScalar(
    formValues,
    'codeServiceId',
    pickProp(transportOrderRaw, 'codeServiceId'),
  );

  const rawOrderCtns = (pickProp<
    TextInAdminApi.SeaImportOrderCtnExtractAddDto[]
  >(seaImportRaw, 'orderCtns') ??
    []) as TextInAdminApi.SeaImportOrderCtnExtractAddDto[];

  let unmatchedCtnCount = 0;
  const orderCtns = rawOrderCtns
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

  const orderCodeGoodss = (
    (pickProp<Array<{ codeGoodsId?: number | string }>>(
      transportOrderRaw,
      'orderCodeGoodss',
    ) ?? []) as Array<{ codeGoodsId?: number | string }>
  )
    .map((item) => item?.codeGoodsId)
    .filter((id): id is number | string => !isEmptyRecognizedValue(id));
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

/** AI 识别允许回填的表单字段白名单（仅进口表单已有字段） */
export const AI_RECOGNIZE_ALLOWED_FIELDS = new Set([
  'vessel',
  'innerVoyno',
  'terminalVoyno',
  'carrierId',
  'polId',
  'polRemark',
  'podId',
  'podRemark',
  'mblNum',
  'etd',
  'clientId',
  'consigneeContent',
  'shipperContent',
  'notifierContent',
  'marks',
  'pkgs',
  'codePackageId',
  'goodsDes',
  'kgs',
  'cbm',
  'codeServiceId',
]);

const AI_RECOGNIZE_DATE_FIELDS = new Set(['etd']);

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
  'polRemark',
  'podRemark',
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
  return value;
};
