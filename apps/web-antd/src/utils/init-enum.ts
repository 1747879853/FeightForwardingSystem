import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { getItemsByName } from '#/api/system/enum-admin';

/**
 * 枚举缓存的 Storage Key
 */
const ENUM_CACHE_KEY = 'enum_cache_v1';

/**
 * 枚举缓存数据结构
 */
interface EnumCacheData {
  /** 缓存时间戳 */
  timestamp: number;
  /** 枚举数据映射：key为枚举名称，value为枚举项数组 */
  data: Record<string, EnumerationAdminApi.EnumerationItemDto[]>;
}

/**
 * 获取全部枚举及其枚举值，并缓存到 localStorage 中
 * @param forceRefresh 是否强制刷新（忽略缓存）
 * @returns 所有枚举数据
 *
 * @example
 * ```typescript
 * // 在应用启动时初始化枚举缓存
 * import { initEnumCache } from '#/utils/init-enum';
 *
 * // 方式1：使用缓存（推荐）
 * const enums = await initEnumCache();
 * console.log(enums); // { OrderStatus: [...], PaymentMethod: [...] }
 *
 * // 方式2：强制刷新缓存
 * const enums = await initEnumCache(true);
 * ```
 */
export async function initEnumCache(
  forceRefresh = false,
): Promise<Record<string, EnumerationAdminApi.EnumerationItemDto[]>> {
  // 如果不是强制刷新，先尝试从缓存读取
  if (!forceRefresh) {
    const cached = getEnumCache();
    if (cached && Object.keys(cached).length > 0) {
      console.log('[Enum Cache] 使用缓存数据');
      return cached;
    }
  }

  console.log('[Enum Cache] 开始加载枚举数据...');

  try {
    // 这里需要获取所有枚举的名称
    // 由于 API 没有直接提供获取所有枚举名称的接口
    // 实际使用时需要根据业务需求维护一个枚举名称列表
    // 或者调用 getEnumerationPagedList 获取所有枚举

    // 示例：假设我们有一些常用的枚举名称
    // 实际项目中应该从配置或接口获取
    const enumNames = await getAllEnumNames();

    const enumData: Record<string, EnumerationAdminApi.EnumerationItemDto[]> =
      {};

    // 并行获取所有枚举的值
    const promises = enumNames.map(async (name) => {
      try {
        const items = await getItemsByName(name);
        enumData[name] = items;
      } catch (error) {
        console.warn(`[Enum Cache] 获取枚举 ${name} 失败:`, error);
        enumData[name] = [];
      }
    });

    await Promise.all(promises);

    // 保存到缓存
    saveEnumCache(enumData);

    console.log(
      '[Enum Cache] 枚举数据加载完成，共',
      Object.keys(enumData).length,
      '个枚举',
    );

    return enumData;
  } catch (error) {
    console.error('[Enum Cache] 加载枚举数据失败:', error);
    return {};
  }
}

/**
 * 根据枚举名称从缓存中获取枚举项（主要用于下拉框内容）
 * @param enumName 枚举名称
 * @param autoLoad 如果缓存不存在是否自动加载（默认true）
 * @returns 枚举项数组
 *
 * @example
 * ```typescript
 * import { getEnumItems } from '#/utils/init-enum';
 *
 * // 方式1：从缓存获取，如果不存在则自动加载
 * const items = await getEnumItems('OrderStatus');
 * // 返回: [{ value: 1, displayName: '待处理', enable: true }, ...]
 *
 * // 方式2：仅从缓存获取，不自动加载
 * const items = await getEnumItems('OrderStatus', false);
 *
 * // 在 Vue 组件中使用（用于下拉框）
 * <script setup>
 * import { ref, onMounted } from 'vue';
 * import { getEnumItems } from '#/utils/init-enum';
 *
 * const statusOptions = ref([]);
 * const selectedStatus = ref();
 *
 * onMounted(async () => {
 *   statusOptions.value = await getEnumItems('OrderStatus');
 * });
 * </script>
 *
 * <template>
 *   <a-select v-model:value="selectedStatus" :options="statusOptions" />
 * </template>
 * ```
 */
export async function getEnumItems(
  enumName: string,
  autoLoad = true,
): Promise<EnumerationAdminApi.EnumerationItemDto[]> {
  // 先从缓存中查找
  const cached = getEnumCache();

  if (cached && cached[enumName]) {
    console.log(`[Enum Cache] 从缓存获取枚举: ${enumName}`);
    return cached[enumName];
  }

  // 如果缓存中没有且允许自动加载
  if (autoLoad) {
    console.log(`[Enum Cache] 缓存未命中，加载枚举: ${enumName}`);
    try {
      const items = await getItemsByName(enumName);

      // 更新缓存
      const newCache = cached || {};
      newCache[enumName] = items;
      saveEnumCache(newCache);

      return items;
    } catch (error) {
      console.error(`[Enum Cache] 加载枚举 ${enumName} 失败:`, error);
      return [];
    }
  }

  return [];
}

/**
 * 清除全部 cookie 中缓存的枚举
 *
 * @example
 * ```typescript
 * import { clearEnumCache } from '#/utils/init-enum';
 *
 * // 在用户退出登录时清除缓存
 * async function handleLogout() {
 *   clearEnumCache();
 *   // 其他退出逻辑...
 * }
 *
 * // 在需要刷新枚举数据时
 * async function refreshEnums() {
 *   clearEnumCache();
 *   await initEnumCache(true); // 强制重新加载
 * }
 * ```
 */
export function clearEnumCache(): void {
  try {
    localStorage.removeItem(ENUM_CACHE_KEY);
    console.log('[Enum Cache] 缓存已清除');
  } catch (error) {
    console.error('[Enum Cache] 清除缓存失败:', error);
  }
}

/**
 * 从 localStorage 获取枚举缓存
 * @private
 */
function getEnumCache(): Record<
  string,
  EnumerationAdminApi.EnumerationItemDto[]
> | null {
  try {
    const cacheStr = localStorage.getItem(ENUM_CACHE_KEY);
    if (!cacheStr) {
      return null;
    }

    const cache: EnumCacheData = JSON.parse(cacheStr);

    // 可选：检查缓存是否过期（例如24小时）
    // const isExpired = Date.now() - cache.timestamp > 24 * 60 * 60 * 1000;
    // if (isExpired) {
    //   clearEnumCache();
    //   return null;
    // }

    return cache.data;
  } catch (error) {
    console.error('[Enum Cache] 读取缓存失败:', error);
    return null;
  }
}

/**
 * 保存枚举缓存到 localStorage
 * @private
 */
function saveEnumCache(
  data: Record<string, EnumerationAdminApi.EnumerationItemDto[]>,
): void {
  try {
    const cache: EnumCacheData = {
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(ENUM_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('[Enum Cache] 保存缓存失败:', error);
  }
}

/**
 * 获取所有枚举名称列表
 * 实际项目中应该从配置或接口获取
 * @private
 */
async function getAllEnumNames(): Promise<string[]> {
  // TODO: 实际项目中应该从以下途径之一获取：
  // 1. 从配置文件读取
  // 2. 调用后端接口获取所有枚举名称
  // 3. 从 getEnumerationPagedList 获取

  // 示例：这里返回一些常见的枚举名称
  // 请根据实际业务需求修改此列表
  return [
    // 'OrderStatus',
    // 'PaymentMethod',
    // 'ShippingType',
    // 添加更多枚举名称...
  ];
}
