import type { SystemPermissionApi } from '#/api/system/permission';

import { ref } from 'vue';

import { getCurrentUserMaskedFields } from '#/api/system/permission';

/** 单个字段的屏蔽规则明细（按字段聚合） */
export type MaskedFieldDto =
  SystemPermissionApi.PropPermissionModuleFieldsDto['fields'][number];

/**
 * 模块号 -> (小写 PropName -> 屏蔽规则明细)
 * PropName 采用小写键索引，与后端 StringComparer.OrdinalIgnoreCase 的
 * 大小写不敏感匹配口径保持一致
 */
type MaskedFieldIndex = Map<string, Map<string, MaskedFieldDto>>;

/** 当前用户不可见字段索引（模块级缓存，跨组件共享） */
const maskedFieldIndex = ref<MaskedFieldIndex>(new Map());
/** 是否已完成一次加载 */
const loaded = ref(false);
/** 是否正在加载 */
const loading = ref(false);
/** 进行中的请求（并发合并为一次网络调用） */
let inflight: Promise<void> | null = null;

/**
 * 加载并缓存「当前用户不可见字段」。
 * 默认命中缓存直接返回；force=true 时强制刷新。
 *
 * 拉取失败时不抛错（fail-open）：后端已在 JSON 序列化阶段剔除被屏蔽字段，
 * 前端拿不到规则的最坏表现是列未隐藏、单元格显示为空而非 `***`，不会泄露数据。
 * 失败时保持 loaded=false，以便下次调用重试。
 */
export async function loadMaskedFields(force = false): Promise<void> {
  if (loaded.value && !force) return;
  if (inflight) return inflight;

  loading.value = true;
  inflight = (async () => {
    try {
      const list = await getCurrentUserMaskedFields();
      maskedFieldIndex.value = buildIndex(list ?? []);
      loaded.value = true;
    } catch (error) {
      console.error('[字段权限] 获取当前用户不可见字段失败:', error);
    } finally {
      loading.value = false;
      inflight = null;
    }
  })();

  return inflight;
}

/** 按模块号与小写 PropName 建立索引 */
function buildIndex(
  list: SystemPermissionApi.PropPermissionModuleFieldsDto[],
): MaskedFieldIndex {
  const index: MaskedFieldIndex = new Map();
  list.forEach((module) => {
    const fields = new Map<string, MaskedFieldDto>();
    (module.fields ?? []).forEach((field) => {
      if (!field?.propName) return;
      fields.set(field.propName.toLowerCase(), field);
    });
    index.set(String(module.frightModule), fields);
  });
  return index;
}

/** 读取指定模块下某个字段的屏蔽规则（不存在时返回 undefined） */
export function getMaskedField(
  module: number,
  propName: string,
): MaskedFieldDto | undefined {
  if (!loaded.value || !propName) return undefined;
  return maskedFieldIndex.value
    .get(String(module))
    ?.get(propName.toLowerCase());
}

/**
 * 该字段是否存在无条件屏蔽规则。
 * 只有 true 才可以整列隐藏；false 表示仅有条件规则，必须逐行判定（设计文档坑点 F8）
 */
export function isAlwaysMasked(module: number, propName: string): boolean {
  return getMaskedField(module, propName)?.alwaysMasked === true;
}

/**
 * 该字段是否配置了任意屏蔽规则（无条件或条件）。
 * 用于逐行判定前的守卫：没有任何规则时直接放行，避免把
 * 「业务线本身不含该字段」误判为「字段被屏蔽」
 */
export function hasMaskRule(module: number, propName: string): boolean {
  return getMaskedField(module, propName) !== undefined;
}

/** 读取某模块下全部无条件屏蔽的 PropName（PascalCase 原样返回） */
export function getAlwaysMaskedProps(module: number): string[] {
  if (!loaded.value) return [];
  const fields = maskedFieldIndex.value.get(String(module));
  if (!fields) return [];
  return [...fields.values()]
    .filter((field) => field.alwaysMasked)
    .map((field) => field.propName);
}

/**
 * 字段级权限（PropMask）规则是否已加载完成。
 * 未加载时所有查询函数都返回「未屏蔽」，调用方据此跳过过滤，避免误隐藏
 */
export function isMaskedFieldsLoaded(): boolean {
  return loaded.value;
}

/** 组合式入口：暴露加载方法与响应式加载状态 */
export function useMaskedFields() {
  return {
    maskedFieldIndex,
    loaded,
    loading,
    loadMaskedFields,
    getMaskedField,
    isAlwaysMasked,
    hasMaskRule,
    getAlwaysMaskedProps,
  };
}
