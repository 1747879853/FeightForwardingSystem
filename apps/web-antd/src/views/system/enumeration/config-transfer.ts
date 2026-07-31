import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import {
  addEnumeration,
  editEnumeration,
  getEnumerationDetail,
  getEnumerationPagedList,
} from '#/api/system/enum-admin';

/**
 * 枚举配置的跨系统迁移格式。
 *
 * 文件里刻意不保留 Id、租户、审计字段：目标系统的主键与源系统无关，
 * 导入时一律按 `name` 匹配、按 `value` 对齐子项。
 */
export const ENUM_CONFIG_VERSION = 1;

export interface EnumConfigItem {
  value: number;
  displayName?: string;
  description?: string;
  remark?: string;
  enable: boolean;
  extra1?: boolean;
}

export interface EnumConfigEntry {
  name: string;
  description?: string;
  remark?: string;
  items: EnumConfigItem[];
}

export interface EnumConfigFile {
  version: number;
  exportedAt: string;
  enumerations: EnumConfigEntry[];
}

/** 同名枚举已存在时的处理方式 */
export type ImportConflictStrategy = 'overwrite' | 'skip';

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  failures: { name: string; reason: string }[];
}

const PAGE_SIZE = 200;
const DETAIL_CONCURRENCY = 5;

/** 有限并发地跑完任务，避免一次性打出几十个详情请求 */
async function runWithConcurrency<T>(
  source: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>,
) {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, source.length) },
    async () => {
      while (cursor < source.length) {
        const item = source[cursor++]!;
        await handler(item);
      }
    },
  );
  await Promise.all(workers);
}

/** 拉全量枚举列表（不含子表），供导出勾选与导入冲突检测使用 */
export async function fetchAllEnumerations(): Promise<
  EnumerationAdminApi.EnumerationListDto[]
> {
  const all: EnumerationAdminApi.EnumerationListDto[] = [];
  let page = 1;
  for (;;) {
    const res = await getEnumerationPagedList({ page, pageSize: PAGE_SIZE });
    const items = res.items ?? [];
    all.push(...items);
    if (items.length === 0 || all.length >= (res.totalCount ?? 0)) break;
    page += 1;
  }
  return all.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

function toConfigEntry(
  detail: EnumerationAdminApi.EnumerationDetailDto,
): EnumConfigEntry {
  return {
    name: detail.name ?? '',
    description: detail.description,
    remark: detail.remark,
    items: (detail.enumerationItems ?? [])
      .filter((item) => !item.isDeleted)
      .sort((a, b) => a.value - b.value)
      .map((item) => ({
        value: item.value,
        displayName: item.displayName,
        description: item.description,
        remark: item.remark,
        enable: item.enable ?? true,
        extra1: item.extra1 ?? false,
      })),
  };
}

/**
 * 按 Id 拉详情并组装配置文件
 * @param onProgress 已完成数量 / 总数
 */
export async function buildEnumConfigFile(
  ids: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<EnumConfigFile> {
  const entries: EnumConfigEntry[] = [];
  let done = 0;
  await runWithConcurrency(ids, DETAIL_CONCURRENCY, async (id) => {
    const detail = await getEnumerationDetail(id);
    entries.push(toConfigEntry(detail));
    done += 1;
    onProgress?.(done, ids.length);
  });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return {
    version: ENUM_CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    enumerations: entries,
  };
}

export function buildExportFileName(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `enumeration-config-${stamp}.json`;
}

function normalizeItem(raw: any, enumName: string): EnumConfigItem {
  const value = Number(raw?.value);
  if (!Number.isFinite(value)) {
    throw new TypeError(`枚举「${enumName}」存在无效的枚举值`);
  }
  return {
    value,
    displayName: raw?.displayName ?? undefined,
    description: raw?.description ?? undefined,
    remark: raw?.remark ?? undefined,
    enable: raw?.enable ?? true,
    extra1: raw?.extra1 ?? false,
  };
}

/**
 * 解析并校验配置文件文本，格式不合法时抛出可直接展示给用户的错误
 */
export function parseEnumConfigFile(text: string): EnumConfigFile {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SyntaxError('文件不是合法的 JSON');
  }

  const list = raw?.enumerations;
  if (!Array.isArray(list) || list.length === 0) {
    throw new TypeError('文件中未找到枚举配置（enumerations）');
  }
  if (raw?.version && Number(raw.version) > ENUM_CONFIG_VERSION) {
    throw new TypeError('配置文件版本高于当前系统，请升级后再导入');
  }

  const seen = new Set<string>();
  const enumerations: EnumConfigEntry[] = list.map((entry: any) => {
    const name = String(entry?.name ?? '').trim();
    if (!name) throw new TypeError('存在缺少枚举名称的配置项');
    if (seen.has(name))
      throw new TypeError(`文件中存在重复的枚举名称：${name}`);
    seen.add(name);
    return {
      name,
      description: entry?.description ?? undefined,
      remark: entry?.remark ?? undefined,
      items: (Array.isArray(entry?.items) ? entry.items : []).map((item: any) =>
        normalizeItem(item, name),
      ),
    };
  });

  return {
    version: Number(raw?.version) || ENUM_CONFIG_VERSION,
    exportedAt: String(raw?.exportedAt ?? ''),
    enumerations,
  };
}

/**
 * 覆盖已有枚举：按 `value` 复用目标系统的子项 Id，
 * 让同值枚举项走更新而不是先删后建，避免引用它的历史数据被打断。
 * 文件中没有的子项会被后端删除，这正是「同步为文件内容」的语义。
 */
async function overwriteEnumeration(
  existingId: string,
  entry: EnumConfigEntry,
) {
  const detail = await getEnumerationDetail(existingId);
  const idByValue = new Map<number, string>();
  for (const item of detail.enumerationItems ?? []) {
    if (!item.isDeleted && !idByValue.has(item.value)) {
      idByValue.set(item.value, item.id);
    }
  }

  await editEnumeration({
    id: existingId,
    name: entry.name,
    description: entry.description,
    remark: entry.remark,
    enumerationItems: entry.items.map((item) => ({
      id: idByValue.get(item.value),
      value: item.value,
      enable: item.enable ?? true,
      extra1: item.extra1 ?? false,
      displayName: item.displayName,
      description: item.description,
      remark: item.remark,
    })),
  });
}

/**
 * 逐个导入枚举配置。串行执行，保证失败项能被单独定位且不会互相影响。
 * @param existingIdByName 目标系统已有枚举的 名称 → Id 映射
 */
export async function importEnumConfig(
  entries: EnumConfigEntry[],
  existingIdByName: Map<string, string>,
  strategy: ImportConflictStrategy,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failures: [],
  };

  let done = 0;
  for (const entry of entries) {
    const existingId = existingIdByName.get(entry.name.toLowerCase());
    try {
      if (existingId && strategy === 'skip') {
        result.skipped += 1;
      } else if (existingId) {
        await overwriteEnumeration(existingId, entry);
        result.updated += 1;
      } else {
        await addEnumeration({
          name: entry.name,
          description: entry.description,
          remark: entry.remark,
          enumerationItems: entry.items.map((item) => ({
            value: item.value,
            enable: item.enable ?? true,
            extra1: item.extra1 ?? false,
            displayName: item.displayName,
            description: item.description,
            remark: item.remark,
          })),
        });
        result.created += 1;
      }
    } catch (error: any) {
      result.failures.push({
        name: entry.name,
        reason: error?.message || '未知错误',
      });
    }
    done += 1;
    onProgress?.(done, entries.length);
  }

  return result;
}

/** 名称 → Id 映射，键统一小写以容忍不同系统的大小写差异 */
export function buildExistingIdByName(
  list: EnumerationAdminApi.EnumerationListDto[],
) {
  const map = new Map<string, string>();
  for (const item of list) {
    const name = (item.name ?? '').trim().toLowerCase();
    if (name && !map.has(name)) map.set(name, item.id);
  }
  return map;
}
