<script lang="ts" setup>
import { computed, h, onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Card, message, Modal, Space, Tag } from 'ant-design-vue';
import { $t } from '#/locales';

defineOptions({
  name: 'CacheManagement',
});

// 定义缓存项接口
interface CacheItem {
  key: string;
  value: any;
  size: number;
  type: string;
  displayName?: string; // 中文显示名称
}

// 缓存项中文名称映射表（由开发人员维护）
const cacheDisplayNameMap: Record<string, string> = {
  order_fee_display_config: '订单信息显示配置',
  enum_cache_v1: '枚举数据缓存',
  user_preferences: '用户偏好设置',
  theme_config: '主题配置',
  language_config: '语言配置',
  // 在此处添加更多缓存项的中文名称映射
};

// 需要过滤掉的缓存键前缀
const excludedPrefixes = ['REMEMB', '_vben', 'vben', '__vue', '__VUE'];

// 所有缓存数据
const cacheList = ref<CacheItem[]>([]);

// 加载状态
const loading = ref(false);

// 搜索关键词
const searchKeyword = ref('');

// 判断是否需要过滤
const shouldExclude = (key: string): boolean => {
  return excludedPrefixes.some((prefix) => key.startsWith(prefix));
};

// 获取缓存项的中文显示名称
const getDisplayName = (key: string): string => {
  return cacheDisplayNameMap[key] || '';
};

// 过滤后的缓存列表
const filteredCacheList = computed(() => {
  let list = cacheList.value;

  // 按搜索关键词过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    list = list.filter(
      (item) =>
        item.key.toLowerCase().includes(keyword) ||
        item.type.toLowerCase().includes(keyword) ||
        (item.displayName && item.displayName.toLowerCase().includes(keyword)),
    );
  }

  return list;
});

// 获取所有 localStorage 数据
const loadCacheData = () => {
  loading.value = true;
  try {
    const items: CacheItem[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // 过滤掉不需要显示的缓存项
        if (shouldExclude(key)) {
          continue;
        }

        try {
          const value = localStorage.getItem(key);
          const size = value ? new Blob([value]).size : 0;

          // 尝试解析 JSON 以判断类型
          let type = 'string';
          let parsedValue = value;

          try {
            parsedValue = JSON.parse(value || '');
            type = Array.isArray(parsedValue) ? 'array' : typeof parsedValue;
          } catch {
            // 不是 JSON，保持 string 类型
          }

          // 获取中文显示名称
          const displayName = getDisplayName(key);

          items.push({
            key,
            value: parsedValue,
            size,
            type,
            displayName,
          });
        } catch (error) {
          console.error(`读取缓存失败 [${key}]:`, error);
        }
      }
    }

    // 按 key 排序
    items.sort((a, b) => a.key.localeCompare(b.key));
    cacheList.value = items;

    message.success($t('system.cache.loadSuccess'));
  } catch (error) {
    console.error('加载缓存数据失败:', error);
    message.error($t('system.cache.loadFailed'));
  } finally {
    loading.value = false;
  }
};

// 清空单个缓存
const clearSingleCache = (key: string) => {
  Modal.confirm({
    title: $t('system.cache.confirmClearTitle'),
    content: $t('system.cache.confirmClearContent', { key }),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onOk: () => {
      try {
        localStorage.removeItem(key);
        message.success($t('system.cache.clearSuccess'));
        loadCacheData(); // 重新加载

        // 如果是订单配置缓存，清除后需要刷新页面才能生效
        if (key === 'order_fee_display_config') {
          message.info($t('system.cache.refreshPageTip'));
        }
      } catch (error) {
        console.error('清除缓存失败:', error);
        message.error($t('system.cache.clearFailed'));
      }
    },
  });
};

// 清空所有缓存
const clearAllCache = () => {
  Modal.confirm({
    title: $t('system.cache.confirmClearAllTitle'),
    content: $t('system.cache.confirmClearAllContent'),
    okText: $t('common.confirm'),
    okType: 'danger',
    cancelText: $t('common.cancel'),
    onOk: () => {
      try {
        localStorage.clear();
        message.success($t('system.cache.clearAllSuccess'));
        cacheList.value = [];

        // 提示用户刷新页面
        Modal.info({
          title: $t('system.cache.refreshPageTitle'),
          content: $t('system.cache.refreshPageContent'),
          okText: $t('common.refresh'),
          onOk: () => {
            window.location.reload();
          },
        });
      } catch (error) {
        console.error('清空所有缓存失败:', error);
        message.error($t('system.cache.clearAllFailed'));
      }
    },
  });
};

// 格式化字节大小
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 获取总缓存大小
const totalSize = computed(() => {
  return cacheList.value.reduce((sum, item) => sum + item.size, 0);
});

// 获取类型标签颜色
const getTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    object: 'blue',
    array: 'green',
    string: 'default',
    number: 'orange',
    boolean: 'purple',
  };
  return colorMap[type] || 'default';
};

// 查看缓存详情
const viewCacheDetail = (item: CacheItem) => {
  const content =
    typeof item.value === 'object'
      ? JSON.stringify(item.value, null, 2)
      : String(item.value);

  Modal.info({
    title: $t('system.cache.detailTitle'),
    width: 800,
    content: h('div', { style: 'max-height: 500px; overflow-y: auto;' }, [
      h(
        'pre',
        {
          style:
            'background: #f5f5f5; padding: 12px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;',
        },
        content,
      ),
    ]),
    okText: $t('common.close'),
  });
};

onMounted(() => {
  loadCacheData();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>{{ $t('system.cache.title') }}</span>
          <Space>
            <Tag color="blue">
              {{ $t('system.cache.totalCount') }}: {{ cacheList.length }}
            </Tag>
            <Tag color="green">
              {{ $t('system.cache.totalSize') }}: {{ formatSize(totalSize) }}
            </Tag>
          </Space>
        </div>
      </template>

      <template #extra>
        <Space>
          <Button @click="loadCacheData" :loading="loading">
            {{ $t('common.refresh') }}
          </Button>
          <Button
            danger
            @click="clearAllCache"
            :disabled="cacheList.length === 0"
          >
            {{ $t('system.cache.clearAll') }}
          </Button>
        </Space>
      </template>

      <!-- 搜索框 -->
      <div class="mb-4">
        <input
          v-model="searchKeyword"
          type="text"
          :placeholder="$t('system.cache.searchPlaceholder')"
          class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <!-- 缓存列表 -->
      <div class="space-y-2">
        <div
          v-for="item in filteredCacheList"
          :key="item.key"
          class="flex items-center justify-between rounded border border-gray-200 bg-white p-3 transition-all hover:border-blue-400 hover:bg-blue-50"
        >
          <div class="flex flex-1 items-center gap-3">
            <!-- 缓存键名 -->
            <div class="min-w-[200px] flex-1">
              <div class="font-medium text-gray-800">
                {{ item.key }}
                <span
                  v-if="item.displayName"
                  class="ml-2 text-sm text-blue-600"
                >
                  ({{ item.displayName }})
                </span>
              </div>
              <div class="mt-1 text-xs text-gray-500">
                {{ formatSize(item.size) }}
              </div>
            </div>

            <!-- 类型标签 -->
            <Tag :color="getTypeColor(item.type)">
              {{ item.type }}
            </Tag>
          </div>

          <div class="flex items-center gap-2">
            <!-- 查看详情按钮 -->
            <Button size="small" @click="viewCacheDetail(item)">
              {{ $t('system.cache.viewDetail') }}
            </Button>

            <!-- 删除按钮 -->
            <Button size="small" danger @click="clearSingleCache(item.key)">
              {{ $t('common.delete') }}
            </Button>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-if="filteredCacheList.length === 0"
          class="py-12 text-center text-gray-400"
        >
          {{
            searchKeyword
              ? $t('system.cache.noSearchResult')
              : $t('system.cache.noCache')
          }}
        </div>
      </div>
    </Card>
  </Page>
</template>

<style scoped lang="scss">
// 自定义样式
</style>
