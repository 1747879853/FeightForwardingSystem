import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';
import type { TextInAdminApi } from '#/api/common/text-in-admin';

import { toEnglishUpperCase } from '#/utils/english-upper-case';

import { toAirPortSelectedItems, toDayjs } from './air-export-detail-mapper';

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
  flightNo: ['航班'],
  polId: ['起运地名称', '起运地代码'],
  potId: ['中转地名称', '中转地代码'],
  podId: ['目的地名称', '目的地代码'],
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
  etd: ['起飞日期'],
  eta: ['预抵日期'],
  codePackageId: ['包装'],
  codeServiceId: ['运输条款'],
  orderCodeGoodss: ['品名'],
  airExportOrderCtns: ['货物明细'],
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

const parseNumberFromText = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const matched = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!matched) return undefined;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function pickOptionalNumber(
  source: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  const raw = pickProp(source, ...keys);
  if (isEmptyRecognizedValue(raw)) return undefined;
  return parseNumberFromText(raw);
}

export interface AiExtractFormPayload {
  formValues: Record<string, unknown>;
  orderCtns: AirExportAdminApi.AirExportOrderCtnAddDto[];
  orderCodeGoodss: Array<number | string>;
  filledFields: string[];
  unmatchedLabels: string[];
  airlineLabel: string;
}

function hasUsefulOrderCtn(
  item: AirExportAdminApi.AirExportOrderCtnAddDto,
): boolean {
  return (
    !isEmptyRecognizedValue(item.pkgs) ||
    !isEmptyRecognizedValue(item.kgs) ||
    !isEmptyRecognizedValue(item.length) ||
    !isEmptyRecognizedValue(item.width) ||
    !isEmptyRecognizedValue(item.height) ||
    !isEmptyRecognizedValue(item.cbm) ||
    !isEmptyRecognizedValue(item.volumeWeight) ||
    !isEmptyRecognizedValue(item.chargeWeight)
  );
}

function normalizeExtractOrderCtn(
  item: AirExportAdminApi.AirExportOrderCtnAddDto,
): AirExportAdminApi.AirExportOrderCtnAddDto {
  const raw = item as Record<string, unknown>;
  const sortIdRaw = pickProp<number>(raw, 'sortId');
  return {
    pkgs: pickOptionalNumber(raw, 'pkgs', 'pKGS'),
    kgs: pickOptionalNumber(raw, 'kgs'),
    length: pickOptionalNumber(raw, 'length'),
    width: pickOptionalNumber(raw, 'width'),
    height: pickOptionalNumber(raw, 'height'),
    cbm: pickOptionalNumber(raw, 'cbm'),
    volumeWeight: pickOptionalNumber(raw, 'volumeWeight'),
    chargeWeight: pickOptionalNumber(raw, 'chargeWeight'),
    sortId:
      typeof sortIdRaw === 'number' && Number.isFinite(sortIdRaw)
        ? sortIdRaw
        : undefined,
  };
}

export function buildAiExtractFormPayload(
  dto: TextInAdminApi.AirExportExtractAddDto,
  options: {
    allowedFields: Set<string>;
    normalizeValue: (field: string, value: unknown) => unknown;
  },
): AiExtractFormPayload {
  const airExportRaw = (dto.airExport ?? {}) as Record<string, unknown>;
  const transportOrderRaw = (airExportRaw.transportOrder ?? {}) as Record<
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

  assignScalar(formValues, 'flightNo', pickProp(airExportRaw, 'flightNo'));
  assignScalar(formValues, 'polId', pickProp(airExportRaw, 'polId', 'pOLId'));
  assignScalar(
    formValues,
    'polRemark',
    pickProp(airExportRaw, 'polRemark', 'pOLRemark'),
  );
  assignScalar(formValues, 'potId', pickProp(airExportRaw, 'potId', 'pOTId'));
  assignScalar(
    formValues,
    'potRemark',
    pickProp(airExportRaw, 'potRemark', 'pOTRemark'),
  );
  assignScalar(formValues, 'podId', pickProp(airExportRaw, 'podId', 'pODId'));
  assignScalar(
    formValues,
    'podRemark',
    pickProp(airExportRaw, 'podRemark', 'pODRemark'),
  );
  assignScalar(
    formValues,
    'bubbleRatio',
    pickProp(airExportRaw, 'bubbleRatio'),
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
  assignScalar(
    formValues,
    'goodsCompleteTime',
    pickProp(transportOrderRaw, 'goodsCompleteTime'),
  );
  assignScalar(formValues, 'etd', pickProp(transportOrderRaw, 'etd', 'eTD'));
  assignScalar(formValues, 'eta', pickProp(transportOrderRaw, 'eta', 'eTA'));
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

  const rawOrderCtns = (pickProp<AirExportAdminApi.AirExportOrderCtnAddDto[]>(
    airExportRaw,
    'airExportOrderCtns',
  ) ?? []) as AirExportAdminApi.AirExportOrderCtnAddDto[];

  const orderCtns = rawOrderCtns
    .map((item) => normalizeExtractOrderCtn(item))
    .filter(hasUsefulOrderCtn);

  if (orderCtns.length > 0) {
    filledFields.push('airExportOrderCtns');
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

  const schema = dto.extract?.extractedSchema ?? {};
  const unmatchedLabels: string[] = [];
  if (pickExtractedLabel(schema, ['委托单位']) && !formValues.clientId) {
    unmatchedLabels.push('委托单位');
  }
  if (
    pickExtractedLabel(schema, ['起运地名称', '起运地代码']) &&
    formValues.polId == null
  ) {
    unmatchedLabels.push('起运地');
  }
  if (
    pickExtractedLabel(schema, ['中转地名称', '中转地代码']) &&
    formValues.potId == null
  ) {
    unmatchedLabels.push('中转地');
  }
  if (
    pickExtractedLabel(schema, ['目的地名称', '目的地代码']) &&
    formValues.podId == null
  ) {
    unmatchedLabels.push('目的地');
  }
  if (
    pickExtractedLabel(schema, ['包装']) &&
    formValues.codePackageId == null
  ) {
    unmatchedLabels.push('包装');
  }
  if (
    pickExtractedLabel(schema, ['运输条款']) &&
    formValues.codeServiceId == null
  ) {
    unmatchedLabels.push('运输条款');
  }

  return {
    formValues,
    orderCtns,
    orderCodeGoodss,
    filledFields,
    unmatchedLabels,
    airlineLabel: pickExtractedLabel(schema, ['航空公司']),
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

/** 用抽取原文拼机场回显项；无 id 时返回空，禁止拿海港 PortCode 顶替 */
export function toExtractAirPortSelectedItems(
  id: unknown,
  iataCode: string,
  name: string,
) {
  if (id === null || id === undefined || id === '') return [];
  return toAirPortSelectedItems({
    id: id as AirExportAdminApi.LongId,
    iataCode: iataCode || undefined,
    enName: name || undefined,
    cnName: name || undefined,
  });
}

/** AI 识别允许回填的表单字段白名单（空运出口表单已有字段） */
export const AI_RECOGNIZE_ALLOWED_FIELDS = new Set([
  'flightNo',
  'polId',
  'polRemark',
  'potId',
  'potRemark',
  'podId',
  'podRemark',
  'bubbleRatio',
  'mblNum',
  'clientId',
  'consigneeContent',
  'shipperContent',
  'notifierContent',
  'marks',
  'goodsDes',
  'pkgs',
  'kgs',
  'cbm',
  'goodsCompleteTime',
  'etd',
  'eta',
  'codePackageId',
  'codeServiceId',
]);

const AI_RECOGNIZE_DATE_FIELDS = new Set(['goodsCompleteTime', 'etd', 'eta']);

const AI_RECOGNIZE_NUMBER_FIELDS = new Set([
  'pkgs',
  'kgs',
  'cbm',
  'bubbleRatio',
]);

const ENGLISH_UPPER_CASE_FIELDS = new Set([
  'flightNo',
  'mblNum',
  'marks',
  'goodsDes',
  'shipperContent',
  'consigneeContent',
  'notifierContent',
  'polRemark',
  'potRemark',
  'podRemark',
]);

/** 按字段类型规范化 AI 识别值（日期→dayjs、数值→number、英文字段→大写） */
export const normalizeAiFieldValue = (field: string, value: unknown) => {
  if (AI_RECOGNIZE_DATE_FIELDS.has(field)) {
    return toDayjs(value as string | undefined);
  }
  if (AI_RECOGNIZE_NUMBER_FIELDS.has(field)) {
    return parseNumberFromText(value);
  }
  if (ENGLISH_UPPER_CASE_FIELDS.has(field) && typeof value === 'string') {
    return toEnglishUpperCase(value.trim());
  }
  return value;
};
