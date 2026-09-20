import type { FrightModule } from '#/api/system/permission';
import {
  hasAnyMaskRules,
  hasMaskRule,
  isAlwaysMasked,
} from './use-masked-fields';

/** JSON 路径必须指向原始 DTO；共享 SimpleDto 的子属性归属于整个对象。 */
export interface FieldPermissionProfile {
  module: FrightModule;
  nested?: Record<string, FrightModule>;
  formDependencies?: Record<string, string[]>;
  prefixes?: Record<string, string[]>;
  search?: Record<string, string[]>;
  aliases?: Record<string, string[]>;
}

export const RAW_PERMISSION_ROW = Symbol('rawPermissionRow');
/** 只保存 JSON 的键结构，避免表单赋默认值改变权限判定依据。 */
export function capturePermissionRow(input: any): any {
  if (input?.[RAW_PERMISSION_ROW]) return input[RAW_PERMISSION_ROW];
  if (Array.isArray(input)) return input.map(capturePermissionRow);
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        capturePermissionRow(value),
      ]),
    );
  }
  return null;
}
export function rememberPermissionRow<T extends object>(row: T): T {
  return {
    ...row,
    [RAW_PERMISSION_ROW]: capturePermissionRow(row),
  };
}

export function createFieldPermission(profile: FieldPermissionProfile) {
  const aliases = new Map(
    Object.entries(profile.aliases ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );
  /** 行对象字段名小写集合，避免 masked 每格 Object.keys */
  const rowKeyCache = new WeakMap<object, Set<string>>();

  function rowHasKey(object: object, key: string): boolean {
    let set = rowKeyCache.get(object);
    if (!set) {
      set = new Set(Object.keys(object).map((name) => name.toLowerCase()));
      rowKeyCache.set(object, set);
    }
    return set.has(key.toLowerCase());
  }

  function paths(field: string): string[] {
    return (
      aliases.get(field.toLowerCase()) ??
      Object.entries(profile.prefixes ?? {}).find(([prefix]) =>
        field.startsWith(prefix),
      )?.[1] ?? [field]
    );
  }
  function checks(path: string) {
    const keys = path.split('.');
    const nestedModule = profile.nested?.[keys[0]!];
    return nestedModule === undefined || keys.length < 2
      ? [{ module: profile.module, key: keys[0]!, parent: '' }]
      : [
          { module: profile.module, key: keys[0]!, parent: '' },
          { module: nestedModule, key: keys[1]!, parent: keys[0]! },
        ];
  }
  function always(field: string): boolean {
    return paths(field).some((path) =>
      checks(path).some(({ module, key }) => isAlwaysMasked(module, key)),
    );
  }
  function masked(field: string, input: any): boolean {
    // 无任何屏蔽规则时整表短路，滚动路径上每格可省掉路径解析与键扫描
    if (!hasAnyMaskRules()) return false;
    if (always(field)) return true;
    const row = input?.[RAW_PERMISSION_ROW] ?? input;
    if (!row) return always(field);
    return paths(field).some((path) =>
      checks(path).some(({ module, key, parent }) => {
        const object = parent ? row[parent] : row;
        if (!object || typeof object !== 'object') return false;
        return (
          isAlwaysMasked(module, key) ||
          (hasMaskRule(module, key) && !rowHasKey(object, key))
        );
      }),
    );
  }
  function searchAlways(field: string): boolean {
    const sources = Object.entries(profile.search ?? {}).find(
      ([key]) => key.toLowerCase() === field.toLowerCase(),
    )?.[1];
    return sources
      ? sources.length > 0 && sources.every(always)
      : always(field) || always(field.replace(/(range|start|end)$/i, ''));
  }
  function formMasked(field: string, row: any): boolean {
    return (
      masked(field, row) ||
      (profile.formDependencies?.[field] ?? []).some((source) =>
        masked(source, row),
      )
    );
  }
  return { always, masked, formMasked, searchAlways };
}
