# 客户通用 API 使用示例

## 导入方式

```typescript
import { getClientPagedList, ClientAppApi } from '#/api/common/client';
```

## 基本用法

### 1. 获取客户分页列表

```typescript
// 基本查询
const result = await getClientPagedList({
  pageIndex: 1,
  pageSize: 10,
});

// 带关键字搜索
const result = await getClientPagedList({
  keyword: '上海',
  pageIndex: 1,
  pageSize: 10,
});

// 带合作状态筛选
const result = await getClientPagedList({
  clientCoopStatus: [ClientAppApi.CoopStatus.Formal],
  pageIndex: 1,
  pageSize: 10,
});

// 带行业类别和数据权限过滤
const result = await getClientPagedList({
  industryCategory: 'p', // 启用干系人数据权限过滤
  pageIndex: 1,
  pageSize: 10,
});

// 完整参数示例
const result = await getClientPagedList({
  keyword: '物流',
  industryCategory: 'p',
  codeSourceId: 1,
  clientCoopStatus: [
    ClientAppApi.CoopStatus.Formal,
    ClientAppApi.CoopStatus.Potential,
  ],
  supplierCoopStatus: [ClientAppApi.CoopStatus.Formal],
  pageIndex: 1,
  pageSize: 20,
  sorting: 'CreationTime DESC',
});
```

### 2. 处理响应数据

```typescript
const response = await getClientPagedList({
  pageIndex: 1,
  pageSize: 10,
});

// 访问分页信息
console.log('总记录数:', response.totalCount);
console.log('当前页:', response.currentPage);
console.log('总页数:', response.totalPages);

// 访问客户列表
response.items.forEach((client) => {
  console.log('客户ID:', client.id);
  console.log('客户简称:', client.name);
  console.log('客户代码:', client.code);
  console.log('客户全称:', client.fullName);
  console.log('客户英文名:', client.enName);
});
```

### 3. 在下拉选择器中使用

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { getClientPagedList, type ClientAppApi } from '#/api/common/client';

const clientOptions = ref<ClientAppApi.ClientSimpleDto[]>([]);
const loading = ref(false);

// 加载客户列表
async function loadClients(keyword?: string) {
  loading.value = true;
  try {
    const result = await getClientPagedList({
      keyword,
      pageIndex: 1,
      pageSize: 100,
      clientCoopStatus: [ClientAppApi.CoopStatus.Formal], // 只加载正式客户
    });
    clientOptions.value = result.items;
  } finally {
    loading.value = false;
  }
}

// 初始化加载
loadClients();
</script>

<template>
  <a-select
    v-model:value="selectedClientId"
    :loading="loading"
    show-search
    placeholder="请选择客户"
    @search="loadClients"
  >
    <a-select-option
      v-for="client in clientOptions"
      :key="client.id"
      :value="client.id"
    >
      {{ client.name }} ({{ client.code }})
    </a-select-option>
  </a-select>
</template>
```

## 注意事项

### 1. 分页参数规范

- ✅ **正确**：使用 `pageIndex` 和 `pageSize`
- ❌ **禁止**：不要使用 `skipCount` 和 `maxResultCount`

```typescript
// ✅ 正确
getClientPagedList({
  pageIndex: 1,
  pageSize: 10,
});

// ❌ 错误 - 不要传这些参数
getClientPagedList({
  skipCount: 0, // 禁止
  maxResultCount: 10, // 禁止
});
```

### 2. 权限说明

- 本接口仅需登录即可调用，**不需要** `Admin.Client.Get` 后台权限
- 适用于业务页面中选择客户的场景
- 当 `industryCategory='p'` 时，会启用干系人数据权限过滤

### 3. 返回字段说明

`ClientSimpleDto` 仅包含以下5个字段：

- `id`: 客户主键
- `name`: 客户简称
- `code`: 客户代码
- `fullName`: 客户全称
- `enName`: 客户英文名

**不包含**创建人、修改人、币别、对账人等管理字段。如需完整信息，请调用 `ClientAdmin` 相关接口。

### 4. 枚举值使用

```typescript
import { ClientAppApi } from '#/api/common/client';

// 合作状态枚举值
ClientAppApi.CoopStatus.Potential; // 0 - 潜在
ClientAppApi.CoopStatus.Formal; // 1 - 正式
ClientAppApi.CoopStatus.Suspended; // 2 - 暂停合作
ClientAppApi.CoopStatus.Blacklist; // 3 - 黑名单
```

## 与 ClientAdmin 接口的区别

| 对比项   | ClientAppService             | ClientAdminAppService   |
| -------- | ---------------------------- | ----------------------- |
| 权限要求 | 仅需登录                     | 需要 `Admin.Client.Get` |
| 返回类型 | `ClientSimpleDto`（5个字段） | `ClientDto`（完整字段） |
| 适用场景 | 业务页面选人/选客户          | 后台客户管理            |
| 数据权限 | `industryCategory=p` 时启用  | 相同                    |

## 常见场景

### 场景1：费用录入选择结算对象

```typescript
// 只查询正式合作的客户
const clients = await getClientPagedList({
  clientCoopStatus: [ClientAppApi.CoopStatus.Formal],
  pageIndex: 1,
  pageSize: 50,
});
```

### 场景2：业务联系单选择委托单位

```typescript
// 根据关键字搜索，支持数据权限过滤
const clients = await getClientPagedList({
  keyword: searchKeyword,
  industryCategory: 'p', // 启用干系人过滤
  pageIndex: 1,
  pageSize: 20,
});
```

### 场景3：多条件筛选

```typescript
// 组合多个筛选条件
const clients = await getClientPagedList({
  keyword: '上海',
  codeSourceId: 1,
  clientCoopStatus: [
    ClientAppApi.CoopStatus.Formal,
    ClientAppApi.CoopStatus.Potential,
  ],
  pageIndex: 1,
  pageSize: 10,
  sorting: 'Name ASC',
});
```
