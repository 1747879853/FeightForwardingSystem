import {
  addUserSetting,
  deleteUserSetting,
  editUserSetting,
  getUserSettingPagedList,
} from '#/api/system/user-setting-admin';

/** 个人配置名：运价新增默认值（UserSettingAdmin.name） */
export const DEFAULT_FREIGHT_RATE_CONFIG_NAME = 'DefaultFreightRate';

/**
 * 运价新增默认值（存个人配置 setting 的 JSON）。
 * 仅覆盖「新增」时的主表常用字段；箱型仍走基础资料默认箱型。
 * *Label 供批量新增 Handsontable 直接回显，避免进页再按 id 请求详情。
 */
export interface DefaultFreightRateValue {
  recommend?: boolean;
  isDirect?: boolean;
  currencyId?: null | number;
  currencyLabel?: null | string;
  carrierId?: null | number;
  carrierLabel?: null | string;
  polId?: null | number;
  polLabel?: null | string;
  bookingAgentId?: null | string;
  bookingAgentLabel?: null | string;
  polFreeDays?: null | number;
  podFreeDays?: null | number;
  poddem?: null | number;
  poddet?: null | number;
  voyage?: null | string;
  contractNo?: null | string;
  remark?: null | string;
}

function normalizeId(value: unknown): null | number {
  if (value === undefined || value === null || value === '' || value === 0) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeStringId(value: unknown): null | string {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function normalizeLabel(value: unknown): null | string {
  const text = String(value ?? '').trim();
  return text || null;
}

/** 清洗表单值，去掉空字段，便于存 JSON */
export function sanitizeDefaultFreightRateValue(
  input: Partial<DefaultFreightRateValue> | null | undefined,
): DefaultFreightRateValue {
  const raw = input ?? {};
  const next: DefaultFreightRateValue = {};

  if (typeof raw.recommend === 'boolean') next.recommend = raw.recommend;
  if (typeof raw.isDirect === 'boolean') next.isDirect = raw.isDirect;

  const currencyId = normalizeId(raw.currencyId);
  if (currencyId != null) next.currencyId = currencyId;
  const currencyLabel = normalizeLabel(raw.currencyLabel);
  if (currencyLabel) next.currencyLabel = currencyLabel;

  const carrierId = normalizeId(raw.carrierId);
  if (carrierId != null) next.carrierId = carrierId;
  const carrierLabel = normalizeLabel(raw.carrierLabel);
  if (carrierLabel) next.carrierLabel = carrierLabel;

  const polId = normalizeId(raw.polId);
  if (polId != null) next.polId = polId;
  const polLabel = normalizeLabel(raw.polLabel);
  if (polLabel) next.polLabel = polLabel;

  const bookingAgentId = normalizeStringId(raw.bookingAgentId);
  if (bookingAgentId) next.bookingAgentId = bookingAgentId;
  const bookingAgentLabel = normalizeLabel(raw.bookingAgentLabel);
  if (bookingAgentLabel) next.bookingAgentLabel = bookingAgentLabel;

  for (const key of [
    'polFreeDays',
    'podFreeDays',
    'poddem',
    'poddet',
  ] as const) {
    const n = normalizeId(raw[key]);
    if (n != null) next[key] = n;
  }

  for (const key of ['voyage', 'contractNo', 'remark'] as const) {
    const text = String(raw[key] ?? '').trim();
    if (text) next[key] = text;
  }

  return next;
}

export function parseDefaultFreightRateValue(
  value?: null | string,
): DefaultFreightRateValue {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value) as DefaultFreightRateValue;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return sanitizeDefaultFreightRateValue(parsed);
  } catch {
    return {};
  }
}

export function serializeDefaultFreightRateValue(
  input: Partial<DefaultFreightRateValue> | null | undefined,
): string {
  return JSON.stringify(sanitizeDefaultFreightRateValue(input));
}

/** 是否有任何可应用的默认字段 */
export function hasDefaultFreightRateValue(
  value: DefaultFreightRateValue,
): boolean {
  return Object.keys(value).length > 0;
}

/**
 * 按配置名取当前用户的个人设置（精确匹配 name）。
 */
async function findUserSettingByName(name: string) {
  const result = await getUserSettingPagedList({
    Keyword: name,
    PageIndex: 1,
    PageSize: 20,
  });
  const items = result.items ?? [];
  return items.find((item) => String(item.name ?? '').trim() === name) ?? null;
}

/**
 * 读取个人运价新增默认值。未配置返回空对象。
 */
export async function loadDefaultFreightRateConfig(): Promise<{
  exists: boolean;
  id?: number;
  value: DefaultFreightRateValue;
}> {
  try {
    const item = await findUserSettingByName(DEFAULT_FREIGHT_RATE_CONFIG_NAME);
    if (!item?.name) {
      return { exists: false, value: {} };
    }
    return {
      exists: true,
      id: item.id,
      value: parseDefaultFreightRateValue(item.setting),
    };
  } catch {
    return { exists: false, value: {} };
  }
}

/**
 * 保存运价新增默认值：已存在则 Edit（按 name），否则 Add。
 * value 为空对象时仍保存 `{}`（表示明确清空字段但仍保留配置项）。
 */
export async function saveDefaultFreightRateConfig(
  input: Partial<DefaultFreightRateValue>,
  exists: boolean,
): Promise<number | undefined> {
  const setting = serializeDefaultFreightRateValue(input);
  if (exists) {
    await editUserSetting({
      name: DEFAULT_FREIGHT_RATE_CONFIG_NAME,
      setting,
    });
    return undefined;
  }
  return addUserSetting({
    name: DEFAULT_FREIGHT_RATE_CONFIG_NAME,
    setting,
  });
}

/** 物理删除运价新增默认值配置（需个人设置 id） */
export async function removeDefaultFreightRateConfig(
  id?: null | number,
): Promise<void> {
  let targetId = id;
  if (targetId == null) {
    const item = await findUserSettingByName(DEFAULT_FREIGHT_RATE_CONFIG_NAME);
    targetId = item?.id;
  }
  if (targetId == null) return;
  await deleteUserSetting(targetId);
}

/**
 * 把默认值合并进新增草稿（不覆盖调用方已显式传入的非空值）。
 */
export function applyDefaultFreightRateValue<T extends Record<string, any>>(
  target: T,
  defaults: DefaultFreightRateValue,
): T {
  if (!hasDefaultFreightRateValue(defaults)) return target;

  const next = { ...target };

  const fill = (key: keyof DefaultFreightRateValue, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    if (!isEmptyFreightDefaultField(next[key as string])) return;
    (next as Record<string, unknown>)[key as string] = value;
  };

  if (
    defaults.recommend !== undefined &&
    isEmptyFreightDefaultField(next.recommend)
  ) {
    next.recommend = defaults.recommend;
  }
  if (
    defaults.isDirect !== undefined &&
    isEmptyFreightDefaultField(next.isDirect)
  ) {
    next.isDirect = defaults.isDirect;
  }

  fill('currencyId', defaults.currencyId);
  fill('carrierId', defaults.carrierId);
  fill('polId', defaults.polId);
  fill('bookingAgentId', defaults.bookingAgentId);

  fill('polFreeDays', defaults.polFreeDays);
  fill('podFreeDays', defaults.podFreeDays);
  fill('poddem', defaults.poddem);
  fill('poddet', defaults.poddet);

  fill('voyage', defaults.voyage);
  fill('contractNo', defaults.contractNo);
  fill('remark', defaults.remark);

  return next;
}

/** 空串 / null / undefined / 0 视为可被默认值补齐（表单占位 id 常用 0） */
export function isEmptyFreightDefaultField(value: unknown): boolean {
  return value === undefined || value === null || value === '' || value === 0;
}

/**
 * 保存前补齐显示名：批量新增进页可同步回显，不必再打详情接口。
 */
export async function enrichDefaultFreightRateLabels(
  input: Partial<DefaultFreightRateValue>,
): Promise<DefaultFreightRateValue> {
  const next = sanitizeDefaultFreightRateValue(input);

  const tasks: Array<Promise<void>> = [];

  if (next.carrierId != null && !next.carrierLabel) {
    tasks.push(
      (async () => {
        const { getCarrierDetail } =
          await import('#/api/system/base-data/carrier-admin');
        const { formatCarrierLabel } =
          await import('./useCarrierRemoteAutocomplete');
        try {
          const detail = await getCarrierDetail(next.carrierId!);
          const label = formatCarrierLabel(detail);
          if (label) next.carrierLabel = label;
        } catch {
          /* 保留 id，进页再兜底 */
        }
      })(),
    );
  }

  if (next.polId != null && !next.polLabel) {
    tasks.push(
      (async () => {
        const { getPortCodeDetail } =
          await import('#/api/system/base-data/port-code-admin');
        const { formatPortLabel } = await import('./usePortRemoteAutocomplete');
        try {
          const detail = await getPortCodeDetail(next.polId!);
          const label = formatPortLabel(detail);
          if (label) next.polLabel = label;
        } catch {
          /* ignore */
        }
      })(),
    );
  }

  if (next.bookingAgentId && !next.bookingAgentLabel) {
    tasks.push(
      (async () => {
        // 雪花 id 不能当 keyword 搜分页；按 id 拉详情才能稳定拿到中文名
        const { getClientDetail } =
          await import('#/api/sea-export/client-admin');
        const { formatBookingAgentLabel } =
          await import('./useBookingAgentRemoteAutocomplete');
        try {
          const detail = await getClientDetail(String(next.bookingAgentId));
          const label = formatBookingAgentLabel(detail);
          if (label) next.bookingAgentLabel = label;
        } catch {
          /* ignore */
        }
      })(),
    );
  }

  if (next.currencyId != null && !next.currencyLabel) {
    tasks.push(
      (async () => {
        const { getCurrencyDetail } =
          await import('#/api/system/base-data/currency-admin');
        try {
          const detail = await getCurrencyDetail(next.currencyId!);
          const label = String(
            detail?.code || detail?.cnName || detail?.enName || '',
          ).trim();
          if (label) next.currencyLabel = label;
        } catch {
          /* ignore */
        }
      })(),
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return sanitizeDefaultFreightRateValue(next);
}
