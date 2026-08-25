---
title: 枚举在业务页面中的使用指南
module: 系统管理 / 跨模块
author: auto-doc-sync
last_updated: 2026-05-18
---

# 枚举在业务页面中的使用指南

本文说明：在 **枚举管理**（`/system/enumeration`）配置好枚举后，业务页面如何读取并用于下拉框、筛选、表格展示等场景。

> **相关源码**
>
> | 类型                 | 路径                            |
> | :------------------- | :------------------------------ |
> | 枚举管理页面         | `src/views/system/enumeration/` |
> | 后台 API             | `src/api/system/enum-admin.ts`  |
> | 前端工具（推荐入口） | `src/utils/init-enum.ts`        |
> | 应用启动预加载       | `src/bootstrap.ts`              |
> | 补充示例（英文）     | `src/utils/ENUM-CACHE-USAGE.md` |

---

## 1. 后台配置与代码的对应关系

在枚举管理页新建或编辑时，需关注以下字段：

| 后台字段 | 含义 | 在代码中的用法 |
| :-- | :-- | :-- |
| **枚举名称**（`name`，英文、唯一） | 全局字典 key，如 `InvoiceStatus` | `getEnumItems('InvoiceStatus')` 的参数，**大小写须完全一致** |
| **枚举值**（`value`，数字） | 存库、提交接口用的值 | 表单/接口字段绑定 `value` |
| **展示文本**（`displayName`） | 界面显示文案 | 映射为 Select 的 `label` |
| **是否启用**（`enable`） | 是否作为有效选项 | 可按需 `.filter(item => item.enable)` |
| **描述 / 备注** | 辅助说明 | 可选用于 tooltip、标签颜色（如 `remark` 作颜色） |

**示例：**

| 后台枚举名称              | 代码调用                                  |
| :------------------------ | :---------------------------------------- |
| `InvoiceStatus`           | `getEnumItems('InvoiceStatus')`           |
| `FeeStatus`               | `getEnumItems('FeeStatus')`               |
| `TradeMode`               | `getEnumItems('TradeMode')`               |
| `freightConditionItem`    | `getEnumItems('freightConditionItem')`    |
| `ConditionComparisonType` | `getEnumItems('ConditionComparisonType')` |

---

## 2. 前端机制概览

### 2.1 应用启动

`bootstrap.ts` 中会调用 `initEnumCache()`，将 **预配置列表** 中的枚举批量拉取并写入 `localStorage`（key：`enum_cache_v1`）。

预加载名单在 `init-enum.ts` 的 `getAllEnumNames()` 中维护，当前主要包括：

- `InvoiceStatus`
- `FeeStatus`
- `TradeMode`

其余枚举名称 **不必** 加入该列表也可在页面使用（见下文按需加载）。

### 2.2 核心 API

| 函数 | 作用 | 典型场景 |
| :-- | :-- | :-- |
| `getEnumItems(enumName, autoLoad?)` | 按名称取枚举项数组 | 下拉、筛选、表格 formatter |
| `initEnumCache(forceRefresh?)` | 批量预加载并写缓存 | 应用启动、手动全量刷新 |
| `clearEnumCache()` | 清空 localStorage 缓存 | 退出登录、后台改枚举后 |

**接口：** `GET /services/app/EnumerationAdmin/GetItemsByNameAsync?name={枚举名称}`

**返回项类型**（`EnumerationItemDto`）主要字段：

```typescript
{
  value: number;           // 提交给后端的值
  displayName?: string;    // 展示文案
  enable: boolean;
  description?: string;
  remark?: string;
}
```

### 2.3 加载策略

1. `getEnumItems` 先查 `localStorage` 缓存；
2. 未命中且 `autoLoad === true`（默认）时，调用 `getItemsByName` 并回写缓存；
3. 失败时返回空数组 `[]`，不阻塞页面渲染。

---

## 3. 在页面中的用法

### 3.1 Vue 组件 + Ant Design Select（最常见）

```vue
<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { getEnumItems } from '#/utils/init-enum';

const statusOptions = ref<{ label: string; value: number }[]>([]);
const selectedStatus = ref<number>();

onMounted(async () => {
  const items = await getEnumItems('InvoiceStatus'); // 替换为后台配置的 name
  statusOptions.value = items
    .filter((item) => item.enable)
    .map((item) => ({
      label: item.displayName || '',
      value: item.value,
    }));
});
</script>

<template>
  <a-select
    v-model:value="selectedStatus"
    :options="statusOptions"
    placeholder="请选择"
    allow-clear
  />
</template>
```

**项目内参考：** `src/views/sea-export-admin/freight-rate/list.vue`、`modules/form.vue`。

### 3.2 表单 schema（`data.ts` 模块级预加载）

在 `data.ts` 顶部异步拉取并缓存为模块级变量，供列配置、格式化函数使用：

```typescript
import { getEnumItems } from '#/utils/init-enum';

let statusOptions: Array<{ label: string; value: number }> = [];

(async () => {
  const items = await getEnumItems('freightConditionItem');
  statusOptions = items.map((item) => ({
    label: item.displayName || '',
    value: item.value,
  }));
})();
```

**项目内参考：** `src/views/sea-export-admin/freight-rate/data.ts`。

### 3.3 表格列：value 转展示文案

```typescript
let statusMap: Record<number, string> = {};

onMounted(async () => {
  const items = await getEnumItems('InvoiceStatus');
  items.forEach((item) => {
    statusMap[item.value] = item.displayName || '';
  });
});

// Vxe 列 formatter 示例
formatter: ({ cellValue }) => statusMap[cellValue] ?? cellValue,
```

**项目内参考：** `src/views/sea-export-admin/orderFee/data.ts` 中的 `initOrderFeeEnumCache`、`getInvoiceStatusOptions`。

### 3.4 根据 value 反查 displayName

```typescript
import { getEnumItems } from '#/utils/init-enum';

export async function getEnumDisplayName(enumName: string, value: number) {
  const items = await getEnumItems(enumName);
  return items.find((i) => i.value === value)?.displayName ?? String(value);
}
```

### 3.5 并行加载多个枚举

```typescript
const [invoiceItems, feeItems] = await Promise.all([
  getEnumItems('InvoiceStatus'),
  getEnumItems('FeeStatus'),
]);
```

---

## 4. 新枚举接入 checklist

1. 在 `/system/enumeration` 创建枚举，记下 **枚举名称**（如 `OrderStatus`）及各 **value / displayName**。
2. 业务代码：`import { getEnumItems } from '#/utils/init-enum'`。
3. 在 `onMounted` 或模块 `data.ts` 中 `await getEnumItems('OrderStatus')`。
4. 转为 `{ label, value }` 绑定到 `a-select`、Vben 表单 `componentProps.options` 或表格 formatter。
5. **提交接口时使用 `value`（数字）**，不要使用 `displayName`。

可选：若希望应用启动即预加载，在 `init-enum.ts` 的 `getAllEnumNames()` 中追加枚举名称。

---

## 5. 缓存与刷新

| 场景 | 建议操作 |
| :-- | :-- |
| 后台修改枚举项后页面仍显示旧选项 | `clearEnumCache()` 后 `await initEnumCache(true)`，或硬刷新页面 |
| 用户退出登录 | 调用 `clearEnumCache()`（与鉴权清理一并处理） |
| 调试当前缓存 | 控制台：`JSON.parse(localStorage.getItem('enum_cache_v1'))` |

控制台日志前缀：`[Enum Cache]`，便于区分命中缓存还是走接口。

---

## 6. 最佳实践

1. **统一用 `getEnumItems`**，避免各页面直接调 `getItemsByName`（除非有特殊需求）。
2. **枚举名称与后台 `name` 严格一致**，建议从枚举管理页复制粘贴。
3. **只把高频、启动即用的枚举** 放进 `getAllEnumNames()`；低频枚举依赖 `autoLoad` 按需拉取即可。
4. 表格列若需同步访问选项，可参考 `orderFee/data.ts`：先 `initXxxEnumCache()`，再暴露 `getXxxOptions()` 同步 getter。
5. 展示层过滤 `enable === false` 的项，避免禁用值出现在下拉中。

---

## 7. 项目内已使用枚举（参考）

| 枚举名称                  | 使用位置（示例）  |
| :------------------------ | :---------------- |
| `InvoiceStatus`           | 海出/海进订单费用 |
| `FeeStatus`               | 海出订单费用      |
| `freightConditionItem`    | 海出运价管理      |
| `ConditionComparisonType` | 海出运价管理      |

新增业务枚举后，建议在本表或对应模块活文档中补充一行，便于检索。
