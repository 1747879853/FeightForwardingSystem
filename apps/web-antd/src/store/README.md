# Store 模块说明

本目录包含应用的状态管理模块（基于 Pinia）。

## 📁 模块列表

### 1. [useBaseStore](./base-store-guide.md) - 基础数据缓存

**文件**: [`base.ts`](./base.ts)  
**文档**: [`base-store-guide.md`](./base-store-guide.md)

用于缓存全局常用的基础数据，包括：

- ✅ 客户基础信息（`clients`）
- ✅ 公司组织信息（`companyOrganizations`）

**主要用途**:

- 下拉选择器数据源
- 跨组件共享基础数据
- 减少重复 API 调用

**快速开始**:

```typescript
import { useBaseStore } from '#/store/base';

const baseStore = useBaseStore();

// 加载数据
await baseStore.fetchClients();
await baseStore.fetchCompanyOrganizations();

// 使用数据
const clients = baseStore.clients;
const companies = baseStore.companyOrganizations;
```

📖 **详细文档**: [查看 useBaseStore 使用说明](./base-store-guide.md)

---

### 2. useAuthStore - 认证状态管理

**文件**: [`auth.ts`](./auth.ts)

管理用户认证相关的状态，包括：

- 登录/登出
- Token 管理
- 权限验证

---

### 3. useTableConfigStore - 表格配置管理

**文件**: [`table-config.ts`](./table-config.ts)

管理表格相关的配置状态，包括：

- 列显示/隐藏
- 排序规则
- 分页设置

---

### 4. useSortSessionStore - 排序会话管理

**文件**: [`sort-session.ts`](./sort-session.ts)

管理排序会话相关的临时状态。

---

## 🎯 使用规范

### 导入方式

```typescript
// 推荐：从具体文件导入
import { useBaseStore } from '#/store/base';
import { useAuthStore } from '#/store/auth';

// 或者从 index 统一导入
import { useBaseStore, useAuthStore } from '#/store';
```

### 命名规范

- Store 文件名使用 `kebab-case`（如 `base.ts`, `table-config.ts`）
- Store 函数名使用 `camelCase` 并以 `use` 开头（如 `useBaseStore`）
- Store ID 使用 `core-xxx` 格式（如 `core-base`, `core-user`）

### 代码结构

每个 Store 文件应包含：

1. TypeScript 类型定义
2. State 定义
3. Actions 方法
4. 详细的中文注释（包括取值和赋值方式）
5. HMR 热更新支持

---

## 📚 相关文档

- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vue 3 组合式 API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)
- [项目 Store 规范](../../doc/modules/STORE_SPECIFICATION.md)

---

**最后更新**: 2026-07-26
