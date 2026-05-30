# 列表页 keepAlive 与刷新约定

> 跨模块开发指南。说明业务列表如何开启路由缓存，以及在增删改后如何保证数据新鲜。

## 1. 何时开启缓存

在路由模块的**列表页**（非 create/edit 表单）`meta` 中设置：

```typescript
meta: {
  keepAlive: true,
  title: $t('...'),
  // ...
}
```

全局开关：`preferences.tabbar.enable` 与 `preferences.tabbar.keepAlive` 均为 true 时，Layout 才会用 `<KeepAlive :include="getCachedTabs">` 包裹页面（见 `packages/effects/layouts/src/basic/content/content.vue`）。

## 2. 两类列表与刷新写法

### 2.1 弹窗型列表（推荐模板）

适用：列表页内通过 Modal/Drawer 完成新增、编辑、删除。

```vue
<script lang="ts" setup>
const handleRefresh = () => {
  gridApi.query();
};

async function handleDelete(row) {
  await deleteXxx(row.id);
  handleRefresh();
}
</script>

<template>
  <FormModal @success="handleRefresh" />
  <Grid />
</template>
```

基础资料模块 18 个列表、用户/角色/枚举/运价等均属此类。

### 2.2 独立表单页列表

适用：列表 → `router.push('/xxx/create')` 或 `/:id/edit` → 保存后返回列表。

列表侧使用 `useRefreshListOnFormReturn`（内部 `onActivated` + sessionStorage 标记），**仅在表单保存成功后**才刷新；`#/clients` ↔ `#/sea-exports` 等标签切换不会重复请求。

```typescript
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

useRefreshListOnFormReturn('ClientList', handleRefresh);
```

表单保存成功时打标记：

```typescript
import {
  markListShouldRefresh,
  returnToListWithRefresh,
} from '#/utils/list-refresh-flag';

// 保存后仍停留在表单页
markListShouldRefresh('ClientList');

// 保存后直接返回列表
returnToListWithRefresh('ClientList', () => {
  router.push('/clients');
});
```

已接入页面：

| 路由 | 组件 |
| :-- | :-- |
| `/clients` | `views/client/list.vue` |
| `/sea-exports` | `views/sea-export-admin/list.vue` |
| `/sea-imports` | `views/sea-import-admin/list.vue` |
| `/system/workflow` | `views/system/workflow/list.vue` |
| `/fee-management/payment-application` | `views/fee-management/payment-application/list.vue` |
| `/fee-management/statement` | `views/fee-management/statement/index.vue` |
| `/settlement-management/payment-settlement` | `views/settlement-management/payment-settlement/list.vue` |

## 3. 刷新行为对照表

| 场景 | 是否自动刷新 |
| :-- | :-- |
| 当前页弹窗新增/编辑成功 | ✅ `@success` |
| 当前页删除成功 | ✅ `handleRefresh()` |
| 跳转表单页保存后返回 | ✅ `markListShouldRefresh` + `useRefreshListOnFormReturn` |
| 切换到其他菜单再回来 | ❌ 使用缓存，不请求 |
| 关闭标签页后重新打开 | ✅ 重新挂载 |
| 其他用户修改数据 | ❌ 需手动刷新 |

## 4. 新增列表页检查清单

- [ ] 路由 `meta.keepAlive: true`（仅列表，非表单）
- [ ] 删除成功后调用 `gridApi.query()` / `handleRefresh()`
- [ ] 弹窗 `@success` 绑定刷新
- [ ] 若跳转独立表单页：表单 `markListShouldRefresh` + 列表 `useRefreshListOnFormReturn`
- [ ] 行内开关/批量操作成功后是否也需刷新（参考 user/role 列表）

## 5. 变更记录

| 日期 | 说明 |
| :-- | :-- |
| 2026-05-30 | 独立表单页列表改为 sessionStorage 标记 + 条件刷新，标签切换不再重复请求 |
| 2026-05-30 | 全站业务列表路由统一 keepAlive；独立表单页列表补齐返回刷新；用户/角色/付费结算刷新修复 |
