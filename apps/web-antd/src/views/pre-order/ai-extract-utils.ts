import type { TextInAdminApi } from '#/api/common/text-in-admin';

import dayjs from 'dayjs';

import { toEnglishUpperCase } from '#/utils/english-upper-case';

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
  carrierId: ['船公司简称', '船公司'],
  receivePortId: ['收货地名称', '收货地代码'],
  polId: ['起运港名称', '起运港代码'],
  podId: ['目的港名称', '目的港代码'],
  deliverPortId: ['交货地名称', '交货港代码'],
  mblNum: ['主提单号'],
  clientId: ['委托单位'],
  consigneeContent: ['收货人'],
  shipperContent: ['发货人'],
  notifierContent: ['通知人'],
  pkgs: ['件数'],
  kgs: ['毛重kgs'],
  cbm: ['体积cbm'],
  goodsCompleteTime: ['货好日期'],
  etd: ['开船日期'],
  codePackageId: ['包装'],
  codeServiceId: ['运输条款'],
  codeFrtId: ['付费方式'],
  tradeTermsType: ['贸易条款'],
  preOrderCodeGoodss: ['品名'],
  preOrderCtns: ['集装箱信息', '箱型箱量'],
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
  preOrderCtns: TextInAdminApi.PreOrderCtnExtractAddDto[];
  preOrderCodeGoodss: Array<number | string>;
  filledFields: string[];
  /** 箱型 id 未匹配（ctnCodeId=0）但仍带回识别原文的行数 */
  unmatchedCtnCount: number;
}

function normalizeExtractPreOrderCtn(
  item: TextInAdminApi.PreOrderCtnExtractAddDto,
): TextInAdminApi.PreOrderCtnExtractAddDto {
  const raw = item as Record<string, unknown>;
  const ctnCodeIdRaw = pickProp(raw, 'ctnCodeId');
  const ctnCodeId = isEmptyRecognizedValue(ctnCodeIdRaw)
    ? undefined
    : (ctnCodeIdRaw as TextInAdminApi.PreOrderCtnExtractAddDto['ctnCodeId']);
  const countRaw = pickProp<number>(raw, 'count');
  const count =
    typeof countRaw === 'number' && Number.isFinite(countRaw) && countRaw > 0
      ? countRaw
      : 1;

  return {
    ctnCodeId,
    ctnCodeName:
      (pickProp<string>(raw, 'ctnCodeName') ?? '').trim() || undefined,
    count,
    sugPrice: undefined,
    price: undefined,
    weight: undefined,
    remark: undefined,
  };
}

function hasUsefulPreOrderCtn(
  item: TextInAdminApi.PreOrderCtnExtractAddDto,
): boolean {
  return (
    !isEmptyRecognizedValue(item.ctnCodeId) ||
    !!(item.ctnCodeName && item.ctnCodeName.trim())
  );
}

export function buildAiExtractFormPayload(
  dto: TextInAdminApi.PreOrderExtractAddDto,
  options: {
    allowedFields: Set<string>;
    normalizeValue: (field: string, value: unknown) => unknown;
  },
): AiExtractFormPayload {
  const preOrderRaw = (dto.preOrder ?? {}) as Record<string, unknown>;
  const filledFields: string[] = [];

  const assignScalar = (
    target: Record<string, unknown>,
    field: string,
    value: unknown,
  ) => {
    if (!options.allowedFields.has(field)) return;
    // tradeTermsType=0 为 CIF，不能按「数值 0 即空」过滤
    const empty =
      field === 'tradeTermsType'
        ? value === null || value === undefined || value === ''
        : isEmptyRecognizedValue(value);
    if (empty) return;
    const normalized = options.normalizeValue(field, value);
    const normalizedEmpty =
      field === 'tradeTermsType'
        ? normalized === null || normalized === undefined || normalized === ''
        : isEmptyRecognizedValue(normalized);
    if (normalizedEmpty) return;
    target[field] = normalized;
    filledFields.push(field);
  };

  const formValues: Record<string, unknown> = {};

  assignScalar(formValues, 'bizType', pickProp(preOrderRaw, 'bizType'));
  assignScalar(formValues, 'clientId', pickProp(preOrderRaw, 'clientId'));
  assignScalar(formValues, 'mblNum', pickProp(preOrderRaw, 'mblNum'));
  assignScalar(
    formValues,
    'goodsCompleteTime',
    pickProp(preOrderRaw, 'goodsCompleteTime'),
  );
  assignScalar(formValues, 'etd', pickProp(preOrderRaw, 'etd', 'eTD'));
  assignScalar(formValues, 'carrierId', pickProp(preOrderRaw, 'carrierId'));
  assignScalar(
    formValues,
    'receivePortId',
    pickProp(preOrderRaw, 'receivePortId'),
  );
  assignScalar(
    formValues,
    'receivePortRemark',
    pickProp(preOrderRaw, 'receivePortRemark'),
  );
  assignScalar(formValues, 'polId', pickProp(preOrderRaw, 'polId', 'pOLId'));
  assignScalar(
    formValues,
    'polRemark',
    pickProp(preOrderRaw, 'polRemark', 'pOLRemark'),
  );
  assignScalar(formValues, 'podId', pickProp(preOrderRaw, 'podId', 'pODId'));
  assignScalar(
    formValues,
    'podRemark',
    pickProp(preOrderRaw, 'podRemark', 'pODRemark'),
  );
  assignScalar(
    formValues,
    'deliverPortId',
    pickProp(preOrderRaw, 'deliverPortId'),
  );
  assignScalar(
    formValues,
    'deliverPortRemark',
    pickProp(preOrderRaw, 'deliverPortRemark'),
  );
  assignScalar(formValues, 'codeFrtId', pickProp(preOrderRaw, 'codeFrtId'));
  assignScalar(
    formValues,
    'codeServiceId',
    pickProp(preOrderRaw, 'codeServiceId'),
  );
  assignScalar(
    formValues,
    'tradeTermsType',
    pickProp(preOrderRaw, 'tradeTermsType'),
  );
  assignScalar(
    formValues,
    'consigneeContent',
    pickProp(preOrderRaw, 'consigneeContent'),
  );
  assignScalar(
    formValues,
    'shipperContent',
    pickProp(preOrderRaw, 'shipperContent'),
  );
  assignScalar(
    formValues,
    'notifierContent',
    pickProp(preOrderRaw, 'notifierContent'),
  );
  assignScalar(formValues, 'pkgs', pickProp(preOrderRaw, 'pkgs', 'pKGS'));
  assignScalar(
    formValues,
    'codePackageId',
    pickProp(preOrderRaw, 'codePackageId'),
  );
  assignScalar(formValues, 'kgs', pickProp(preOrderRaw, 'kgs'));
  assignScalar(formValues, 'cbm', pickProp(preOrderRaw, 'cbm'));

  const rawCtns = (pickProp<TextInAdminApi.PreOrderCtnExtractAddDto[]>(
    preOrderRaw,
    'preOrderCtns',
  ) ?? []) as TextInAdminApi.PreOrderCtnExtractAddDto[];

  let unmatchedCtnCount = 0;
  const preOrderCtns = rawCtns
    .map((item) => {
      const hadUnmatchedId = isEmptyRecognizedValue(
        pickProp(item as Record<string, unknown>, 'ctnCodeId'),
      );
      const normalized = normalizeExtractPreOrderCtn(item);
      if (
        hadUnmatchedId &&
        normalized.ctnCodeName &&
        normalized.ctnCodeName.trim()
      ) {
        unmatchedCtnCount += 1;
      }
      return normalized;
    })
    .filter(hasUsefulPreOrderCtn);

  if (preOrderCtns.length > 0) {
    filledFields.push('preOrderCtns');
  }

  const preOrderCodeGoodss = (
    (pickProp<Array<{ codeGoodsId?: number | string }>>(
      preOrderRaw,
      'preOrderCodeGoodss',
    ) ?? []) as Array<{ codeGoodsId?: number | string }>
  )
    .map((item) => item?.codeGoodsId)
    .filter((id): id is number | string => !isEmptyRecognizedValue(id));
  if (preOrderCodeGoodss.length > 0) {
    filledFields.push('preOrderCodeGoodss');
  }

  return {
    formValues,
    preOrderCtns,
    preOrderCodeGoodss,
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

/** AI 识别允许回填的表单字段白名单（仅接口会回填且表单已有的字段） */
export const AI_RECOGNIZE_ALLOWED_FIELDS = new Set([
  'bizType',
  'clientId',
  'mblNum',
  'goodsCompleteTime',
  'etd',
  'carrierId',
  'receivePortId',
  'receivePortRemark',
  'polId',
  'polRemark',
  'podId',
  'podRemark',
  'deliverPortId',
  'deliverPortRemark',
  'codeFrtId',
  'codeServiceId',
  'tradeTermsType',
  'consigneeContent',
  'shipperContent',
  'notifierContent',
  'pkgs',
  'codePackageId',
  'kgs',
  'cbm',
]);

const AI_RECOGNIZE_DATE_FIELDS = new Set(['goodsCompleteTime', 'etd']);

const parseNumberFromText = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const matched = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!matched) return undefined;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const ENGLISH_UPPER_CASE_FIELDS = new Set([
  'shipperContent',
  'consigneeContent',
  'notifierContent',
  'receivePortRemark',
  'polRemark',
  'podRemark',
  'deliverPortRemark',
  'mblNum',
]);

/** 日期字段对齐业务联系单 DatePicker 的 valueFormat */
function toDateTimeString(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  const d = dayjs(value as string);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : undefined;
}

/** 按字段类型规范化 AI 识别值 */
export const normalizeAiFieldValue = (field: string, value: unknown) => {
  if (AI_RECOGNIZE_DATE_FIELDS.has(field)) {
    return toDateTimeString(value);
  }
  if (field === 'pkgs' || field === 'kgs' || field === 'cbm') {
    return parseNumberFromText(value);
  }
  if (ENGLISH_UPPER_CASE_FIELDS.has(field) && typeof value === 'string') {
    return toEnglishUpperCase(value.trim());
  }
  return value;
};
