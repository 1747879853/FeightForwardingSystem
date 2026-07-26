# useBaseStore 使用说明

## 📋 概述

`useBaseStore` 是一个基于 Pinia 的基础数据缓存 Store，用于管理全局常用的基础数据，包括客户信息和公司组织信息。通过缓存这些数据，可以减少重复的 API 调用，提升应用性能。

**文件位置**: `apps/web-antd/src/store/base.ts`

---

## 🎯 核心功能

### 1. 客户基础信息缓存

- **数据来源**: [`getClientPagedList`](#/api/common/client) API
- **参数说明**: `industryCategory` 传空字符串 `''`，获取全部类型的客户
- **数据结构**: `ClientSimpleDto[]`
- **包含字段**: `id`, `name`, `code`, `fullName`, `enName`, `isDishonest`, `enterpriseType`, `isShared`, `orgId`, `orgs` 等

### 2. 客户公司信息缓存

- **数据来源**: [`getOrganizationUnits`](#/api/system/organization-unit) API
- **参数说明**: `isCompany: true`，只获取公司类型的组织
- **数据结构**: `OrganizationUnitDto[]`
- **包含字段**: `id`, `displayName`, `isCompany`, `localCurrencyId`, `shortName`, `enName`, `chargeUserId`, `contactPhone`, `email`, `address` 等

---

## 🚀 快速开始

### 基本导入

```typescript
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();
```

---

## 📖 使用指南

### 一、取值方式

#### 1. 直接访问状态

```typescript
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();

// 获取客户列表
const clients = baseStore.clients;

// 获取公司组织列表
const companies = baseStore.companyOrganizations;

// 获取加载状态
const isLoadingClients = baseStore.clientsLoading;
const isLoadingCompanies = baseStore.companyOrganizationsLoading;
```

#### 2. 解构访问

```typescript
import { useBaseStore } from '#/store/base';

const {
  clients,
  companyOrganizations,
  clientsLoading,
  companyOrganizationsLoading,
} = useBaseStore();
```

#### 3. 在 Vue 组件中使用

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();

// 计算属性示例
const clientOptions = computed(() =>
  baseStore.clients.map((client) => ({
    label: client.name,
    value: client.id,
  })),
);

const companyOptions = computed(() =>
  baseStore.companyOrganizations.map((org) => ({
    label: org.displayName,
    value: org.id,
  })),
);
</script>

<template>
  <a-select v-model:value="selectedClientId" :options="clientOptions" />
  <a-select v-model:value="selectedCompanyId" :options="companyOptions" />
</template>
```

---

### 二、赋值方式

#### 1. 从 API 加载数据（推荐）

##### 加载客户数据

```typescript
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();

// 基本用法 - 使用默认参数
await baseStore.fetchClients();

// 自定义参数
await baseStore.fetchClients({
  keyword: '测试', // 关键字搜索
  pageIndex: 1, // 页码
  pageSize: 1000, // 每页数量（默认1000）
  sorting: 'CreationTime DESC', // 排序
});

// 加载完成后使用数据
console.log('客户总数:', baseStore.clients.length);
```

##### 加载公司组织数据

```typescript
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();

// 基本用法 - 获取所有启用的公司
await baseStore.fetchCompanyOrganizations();

// 自定义参数
await baseStore.fetchCompanyOrganizations({
  isDisabled: false, // 只获取启用的公司
});

// 加载完成后使用数据
console.log('公司总数:', baseStore.companyOrganizations.length);
```

#### 2. 手动设置数据

```typescript
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();

// 手动设置客户数据
const customClients = [
  { id: '1', name: '客户A', code: 'C001' },
  { id: '2', name: '客户B', code: 'C002' },
];
baseStore.setClients(customClients);

// 手动设置公司数据
const customCompanies = [
  { id: 1, displayName: '上海分公司', isCompany: true },
  { id: 2, displayName: '北京分公司', isCompany: true },
];
baseStore.setCompanyOrganizations(customCompanies);
```

---

## 💡 实际应用示例

### 示例 1: 组件初始化时加载数据

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();

onMounted(async () => {
  try {
    // 并行加载客户和公司数据
    await Promise.all([
      baseStore.fetchClients(),
      baseStore.fetchCompanyOrganizations(),
    ]);

    console.log('✅ 基础数据加载完成');
  } catch (error) {
    console.error('❌ 基础数据加载失败:', error);
  }
});
</script>
```

### 示例 2: 下拉选择器数据源

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBaseStore } from '#/store/base';
import { message } from 'ant-design-vue';

const baseStore = useBaseStore();
const selectedClientId = ref<string>();
const selectedCompanyId = ref<number>();

// 客户选项
const clientOptions = computed(() =>
  baseStore.clients.map((client) => ({
    label: `${client.name} (${client.code})`,
    value: client.id,
  })),
);

// 公司选项
const companyOptions = computed(() =>
  baseStore.companyOrganizations.map((org) => ({
    label: org.displayName,
    value: org.id,
  })),
);

onMounted(async () => {
  if (baseStore.clients.length === 0) {
    await baseStore.fetchClients();
  }
  if (baseStore.companyOrganizations.length === 0) {
    await baseStore.fetchCompanyOrganizations();
  }
});
</script>

<template>
  <a-form>
    <a-form-item label="选择客户">
      <a-select
        v-model:value="selectedClientId"
        :options="clientOptions"
        placeholder="请选择客户"
        show-search
        :loading="baseStore.clientsLoading"
      />
    </a-form-item>

    <a-form-item label="选择公司">
      <a-select
        v-model:value="selectedCompanyId"
        :options="companyOptions"
        placeholder="请选择公司"
        :loading="baseStore.companyOrganizationsLoading"
      />
    </a-form-item>
  </a-form>
</template>
```

### 示例 3: Composable 中封装业务逻辑

```typescript
// composables/use-client-selector.ts
import { computed } from 'vue';
import { useBaseStore } from '#/store/base';

export function useClientSelector() {
  const baseStore = useBaseStore();

  // 确保客户数据已加载
  async function ensureClientsLoaded() {
    if (baseStore.clients.length === 0 && !baseStore.clientsLoading) {
      await baseStore.fetchClients();
    }
    return baseStore.clients;
  }

  // 根据 ID 查找客户
  function getClientById(id: string) {
    return baseStore.clients.find((client) => client.id === id);
  }

  // 获取客户名称
  function getClientName(id: string): string {
    const client = getClientById(id);
    return client?.name || '';
  }

  // 获取客户选项列表
  const clientOptions = computed(() =>
    baseStore.clients.map((client) => ({
      label: `${client.name} (${client.code})`,
      value: client.id,
    })),
  );

  return {
    clients: baseStore.clients,
    clientOptions,
    ensureClientsLoaded,
    getClientById,
    getClientName,
    isLoading: baseStore.clientsLoading,
  };
}
```

### 示例 4: 用户登出时清空缓存

```typescript
import { useBaseStore } from '#/store/base';
import { useAuthStore } from '#/store/auth';

const baseStore = useBaseStore();
const authStore = useAuthStore();

async function handleLogout() {
  // 清空基础数据缓存
  baseStore.clearAllCache();

  // 执行登出逻辑
  await authStore.logout();
}
```

---

## 🔧 API 参考

### State

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `clients` | `ClientSimpleDto[]` | 客户基础信息列表 |
| `companyOrganizations` | `OrganizationUnitDto[]` | 公司组织列表 |
| `clientsLoading` | `boolean` | 客户数据加载状态 |
| `companyOrganizationsLoading` | `boolean` | 公司组织数据加载状态 |

### Actions

#### setClients(clients)

手动设置客户数据

**参数:**

- `clients`: `ClientSimpleDto[]` - 客户列表数据

**示例:**

```typescript
baseStore.setClients(clientList);
```

#### fetchClients(params?)

从 API 获取并设置客户数据

**参数:**

- `params?`: 可选参数对象
  - `keyword?`: `string` - 关键字搜索
  - `pageIndex?`: `number` - 页码（默认 1）
  - `pageSize?`: `number` - 每页数量（默认 1000）
  - `sorting?`: `string` - 排序规则

**返回:**

- `Promise<ClientSimpleDto[]>` - 客户列表数据

**示例:**

```typescript
await baseStore.fetchClients({
  pageIndex: 1,
  pageSize: 1000,
});
```

#### setCompanyOrganizations(companies)

手动设置公司组织数据

**参数:**

- `companies`: `OrganizationUnitDto[]` - 公司组织列表数据

**示例:**

```typescript
baseStore.setCompanyOrganizations(companyList);
```

#### fetchCompanyOrganizations(params?)

从 API 获取并设置公司组织数据

**参数:**

- `params?`: 可选参数对象
  - `isDisabled?`: `boolean` - 是否禁用（默认 undefined，获取所有状态）

**返回:**

- `Promise<OrganizationUnitDto[]>` - 公司组织列表数据

**示例:**

```typescript
await baseStore.fetchCompanyOrganizations({
  isDisabled: false,
});
```

#### clearAllCache()

清空所有缓存数据

**示例:**

```typescript
baseStore.clearAllCache();
```

---

## ⚠️ 注意事项

### 1. 数据持久性

- ❌ **缓存数据存储在 Pinia 中，页面刷新后会丢失**
- ✅ **建议在应用初始化时重新加载常用数据**
- ✅ **可以在路由守卫或 App.vue 的 onMounted 中预加载**

### 2. 性能优化

- ✅ **避免频繁调用 `fetch` 方法，优先使用缓存数据**
- ✅ **使用 `loading` 状态避免重复请求**
- ✅ **对于大数据量场景，合理设置 `pageSize` 参数**

```typescript
// ✅ 好的做法：先检查缓存
if (baseStore.clients.length === 0) {
  await baseStore.fetchClients();
}

// ❌ 不好的做法：每次都重新加载
await baseStore.fetchClients(); // 可能导致不必要的 API 调用
```

### 3. 错误处理

- ✅ **`fetch` 方法内置了错误捕获和日志输出**
- ✅ **外部可根据需要添加额外的错误处理逻辑**

```typescript
try {
  await baseStore.fetchClients();
} catch (error) {
  message.error('客户数据加载失败');
  // 可以显示重试按钮或其他提示
}
```

### 4. 数据类型

- `clients`: [`ClientSimpleDto[]`](#/api/common/client) - 包含 `id`, `name`, `code`, `fullName`, `enName`, `isDishonest`, `enterpriseType`, `isShared`, `orgId`, `orgs` 等字段
- `companyOrganizations`: [`OrganizationUnitDto[]`](#/api/system/organization-unit) - 包含 `id`, `displayName`, `isCompany`, `localCurrencyId`, `shortName`, `enName`, `chargeUserId`, `contactPhone`, `email`, `address` 等字段

### 5. 应用场景

- ✅ 下拉选择器数据源
- ✅ 数据字典缓存
- ✅ 跨组件共享基础数据
- ✅ 减少重复 API 调用
- ✅ 表单中的客户/公司选择

---

## 🎓 最佳实践

### 1. 应用启动时预加载

```typescript
// apps/web-antd/src/app.vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();

onMounted(async () => {
  // 预加载常用基础数据
  await Promise.allSettled([
    baseStore.fetchClients(),
    baseStore.fetchCompanyOrganizations(),
  ]);
});
</script>
```

### 2. 懒加载策略

```typescript
// 只在需要时才加载数据
async function loadClientDataIfNeeded() {
  if (baseStore.clients.length === 0 && !baseStore.clientsLoading) {
    await baseStore.fetchClients();
  }
  return baseStore.clients;
}
```

### 3. 数据刷新

```typescript
// 数据更新后重新加载
async function handleDataUpdate() {
  // 执行业务操作...

  // 刷新缓存
  await baseStore.fetchClients();
  await baseStore.fetchCompanyOrganizations();
}
```

### 4. 组合使用多个 Store

```typescript
import { useBaseStore } from '#/store/base';
import { useUserStore } from '#/store/user';

const baseStore = useBaseStore();
const userStore = useUserStore();

// 根据当前用户所属公司过滤公司列表
const currentUserCompany = computed(() =>
  baseStore.companyOrganizations.find(
    (org) => org.id === userStore.userInfo?.companyId,
  ),
);
```

---

## 🐛 常见问题

### Q1: 为什么数据是空的？

**A:** 缓存数据不会自动加载，需要手动调用 `fetch` 方法。

```typescript
// 需要先加载数据
await baseStore.fetchClients();
// 然后才能使用
console.log(baseStore.clients);
```

### Q2: 如何判断数据是否正在加载？

**A:** 使用 `loading` 状态。

```typescript
if (baseStore.clientsLoading) {
  // 显示加载动画
}
```

### Q3: 页面刷新后数据丢失怎么办？

**A:** 在应用初始化时重新加载。

```typescript
// app.vue 或路由守卫中
onMounted(async () => {
  await baseStore.fetchClients();
});
```

### Q4: 如何只获取特定类型的客户？

**A:** 目前 `fetchClients` 不支持筛选行业类别，如需筛选请在获取后自行过滤。

```typescript
await baseStore.fetchClients();
const potentialClients = baseStore.clients.filter(
  (client) => client.enterpriseType === 1,
);
```

---

## 📝 更新日志

### 2026-07-26

- ✨ 新增 `useBaseStore` 基础数据缓存
- ✨ 支持客户基础信息缓存
- ✨ 支持公司组织信息缓存
- ✨ 提供完整的 TypeScript 类型支持
- ✨ 添加详细的中文注释和使用示例

---

## 🔗 相关资源

- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vue 3 组合式 API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)
- [项目 Store 规范](../../doc/modules/STORE_SPECIFICATION.md)

---

**最后更新**: 2026-07-26
