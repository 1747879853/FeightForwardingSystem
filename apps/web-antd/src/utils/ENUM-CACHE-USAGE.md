# 枚举缓存管理使用指南

## 📚 API 说明

### 1. initEnumCache(forceRefresh?) - 初始化枚举缓存

获取全部枚举及其枚举值，将内容缓存到 localStorage 中。

**参数：**

- `forceRefresh` (可选): 是否强制刷新，默认为 `false`

**返回值：** `Promise<Record<string, EnumerationItemDto[]>>`

**使用场景：**

- 应用启动时初始化
- 需要刷新所有枚举数据时

---

### 2. getEnumItems(enumName, autoLoad?) - 获取枚举项

根据枚举名称从缓存中获取此枚举的枚举项（主要用于下拉框内容）。

**参数：**

- `enumName`: 枚举名称
- `autoLoad` (可选): 如果缓存不存在是否自动加载，默认为 `true`

**返回值：** `Promise<EnumerationItemDto[]>`

**使用场景：**

- 表单下拉框选项
- 筛选条件选项
- 任何需要枚举值的场景

---

### 3. clearEnumCache() - 清除枚举缓存

清除 localStorage 中缓存的所有枚举数据。

**使用场景：**

- 用户退出登录时
- 需要重新加载枚举数据时
- 枚举数据更新后

---

## 💡 使用示例

### 示例 1：在应用启动时初始化枚举缓存

```typescript
// src/main.ts 或 src/bootstrap.ts
import { initEnumCache } from '#/utils/init-enum';

async function bootstrap() {
  // 其他初始化逻辑...

  // 初始化枚举缓存（使用缓存，不强制刷新）
  await initEnumCache();

  // 或者强制刷新
  // await initEnumCache(true);

  // 启动应用...
}
```

---

### 示例 2：在 Vue 组件中使用（下拉框）

```vue
<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { getEnumItems } from '#/utils/init-enum';

// 订单状态下拉框
const statusOptions = ref([]);
const selectedStatus = ref();

onMounted(async () => {
  // 从缓存获取枚举项（如果缓存不存在会自动加载）
  statusOptions.value = await getEnumItems('OrderStatus');
});

// 提交表单
async function handleSubmit() {
  const formData = {
    status: selectedStatus.value,
    // 其他字段...
  };
  // 提交逻辑...
}
</script>

<template>
  <a-form>
    <a-form-item label="订单状态">
      <a-select
        v-model:value="selectedStatus"
        :options="statusOptions"
        placeholder="请选择订单状态"
      />
    </a-form-item>
  </a-form>
</template>
```

---

### 示例 3：在表格筛选中使用

```vue
<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { getEnumItems } from '#/utils/init-enum';

const paymentMethodOptions = ref([]);
const filterForm = ref({
  paymentMethod: undefined,
});

onMounted(async () => {
  paymentMethodOptions.value = await getEnumItems('PaymentMethod');
});

// 使用筛选
function handleFilter() {
  console.log('筛选条件:', filterForm.value);
  // 执行筛选逻辑...
}
</script>

<template>
  <a-form layout="inline">
    <a-form-item label="支付方式">
      <a-select
        v-model:value="filterForm.paymentMethod"
        :options="paymentMethodOptions"
        placeholder="请选择"
        allow-clear
      />
    </a-form-item>
    <a-form-item>
      <a-button type="primary" @click="handleFilter">查询</a-button>
    </a-form-item>
  </a-form>
</template>
```

---

### 示例 4：格式化枚举值为显示文本

```typescript
import { getEnumItems } from '#/utils/init-enum';

/**
 * 根据枚举值获取显示名称
 */
async function getEnumDisplayName(
  enumName: string,
  value: number,
): Promise<string> {
  const items = await getEnumItems(enumName);
  const item = items.find((i) => i.value === value);
  return item?.displayName || String(value);
}

// 使用示例
const statusText = await getEnumDisplayName('OrderStatus', 1);
console.log(statusText); // "待处理"
```

---

### 示例 5：在用户退出时清除缓存

```typescript
// src/store/auth.ts 或退出登录的处理函数
import { clearEnumCache } from '#/utils/init-enum';

async function handleLogout() {
  // 清除枚举缓存
  clearEnumCache();

  // 清除其他缓存...
  // 跳转到登录页...
}
```

---

### 示例 6：批量获取多个枚举并转换为 Ant Design Vue 选项格式

```vue
<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { getEnumItems } from '#/utils/init-enum';

const orderTypeOptions = ref([]);
const shippingTypeOptions = ref([]);

onMounted(async () => {
  // 并行获取多个枚举
  const [orderTypes, shippingTypes] = await Promise.all([
    getEnumItems('OrderType'),
    getEnumItems('ShippingType'),
  ]);

  // 转换为 Ant Design Vue Select 需要的格式
  orderTypeOptions.value = orderTypes.map((item) => ({
    label: item.displayName,
    value: item.value,
  }));

  shippingTypeOptions.value = shippingTypes.map((item) => ({
    label: item.displayName,
    value: item.value,
  }));
});
</script>

<template>
  <a-form>
    <a-form-item label="订单类型">
      <a-select :options="orderTypeOptions" />
    </a-form-item>
    <a-form-item label="运输方式">
      <a-select :options="shippingTypeOptions" />
    </a-form-item>
  </a-form>
</template>
```

---

### 示例 7：配合表格列使用（显示枚举文本）

```vue
<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import { getEnumItems } from '#/utils/init-enum';

// 缓存枚举数据用于格式化
let statusMap: Record<number, string> = {};

onMounted(async () => {
  const items = await getEnumItems('OrderStatus');
  statusMap = {};
  items.forEach((item) => {
    statusMap[item.value] = item.displayName;
  });
});

const columns: VxeTableGridOptions['columns'] = [
  {
    field: 'status',
    title: '订单状态',
    formatter: ({ cellValue }) => {
      return statusMap[cellValue] || cellValue;
    },
  },
  // 其他列...
];
</script>
```

---

### 示例 8：在 Pinia Store 中使用

```typescript
// src/store/enum.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getEnumItems, initEnumCache } from '#/utils/init-enum';

export const useEnumStore = defineStore('enum', () => {
  const enumCache = ref<Record<string, any[]>>({});

  /**
   * 初始化所有枚举
   */
  async function initAllEnums() {
    enumCache.value = await initEnumCache();
  }

  /**
   * 获取指定枚举
   */
  async function getEnum(enumName: string) {
    if (!enumCache.value[enumName]) {
      enumCache.value[enumName] = await getEnumItems(enumName);
    }
    return enumCache.value[enumName];
  }

  /**
   * 清除缓存
   */
  function clearCache() {
    enumCache.value = {};
  }

  return {
    enumCache,
    initAllEnums,
    getEnum,
    clearCache,
  };
});
```

---

## ⚙️ 配置说明

### 修改需要缓存的枚举列表

编辑 `init-enum.ts` 中的 `getAllEnumNames()` 函数：

```typescript
async function getAllEnumNames(): Promise<string[]> {
  return [
    'OrderStatus',
    'PaymentMethod',
    'ShippingType',
    'OrderType',
    // 添加你需要的枚举名称...
  ];
}
```

### 设置缓存过期时间

如果需要设置缓存过期时间，可以修改 `getEnumCache()` 函数：

```typescript
function getEnumCache() {
  try {
    const cacheStr = localStorage.getItem(ENUM_CACHE_KEY);
    if (!cacheStr) {
      return null;
    }

    const cache: EnumCacheData = JSON.parse(cacheStr);

    // 检查缓存是否过期（24小时）
    const isExpired = Date.now() - cache.timestamp > 24 * 60 * 60 * 1000;
    if (isExpired) {
      clearEnumCache();
      return null;
    }

    return cache.data;
  } catch (error) {
    console.error('[Enum Cache] 读取缓存失败:', error);
    return null;
  }
}
```

---

## 🎯 最佳实践

1. **应用启动时初始化**：在 `main.ts` 或 `bootstrap.ts` 中调用 `initEnumCache()`
2. **优先使用缓存**：`getEnumItems()` 默认会先查缓存，性能更好
3. **及时清理缓存**：用户退出登录时调用 `clearEnumCache()`
4. **错误处理**：API 调用失败时会返回空数组，不会影响页面渲染
5. **并行加载**：使用 `Promise.all()` 同时加载多个枚举，提升性能

---

## 🔍 调试技巧

在浏览器控制台查看缓存数据：

```javascript
// 查看缓存的原始数据
JSON.parse(localStorage.getItem('enum_cache_v1'));

// 查看某个枚举
JSON.parse(localStorage.getItem('enum_cache_v1')).data.OrderStatus;
```

控制台日志输出：

- `[Enum Cache] 使用缓存数据` - 使用了缓存
- `[Enum Cache] 开始加载枚举数据...` - 正在从服务器加载
- `[Enum Cache] 枚举数据加载完成` - 加载完成
- `[Enum Cache] 从缓存获取枚举: xxx` - 从缓存读取
- `[Enum Cache] 缓存已清除` - 缓存已清除
