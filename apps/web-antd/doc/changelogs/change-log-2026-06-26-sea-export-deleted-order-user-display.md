# 海运出口编辑页：干系人引用已删除用户时的展示与静默请求

## 背景意图

用户管理删除已被海运出口订单引用的干系人后，打开编辑页会连续弹出 `GetUserAsync` 全局错误提示，且 `UserSelect` 回显为空或仅显示用户 ID。

## 核心逻辑变更

1. **请求层**（`src/api/request.ts`、`src/api/system/user-admin.ts`）
   - 支持请求配置 `skipErrorMessage: true`，跳过全局 `message.error`。
   - `getUser(id, { silent: true })` 用于用户可能不存在的场景。

2. **展示工具**（`src/utils/user-display.ts`）
   - `formatDeletedUserFallback`：返回 `用户{id}（已删除）`。
   - `resolveUserDisplayName` / `fetchUserDisplayName`：按缓存名、详情字段解析，失败时兜底。

3. **海运出口编辑页**（`src/views/sea-export-admin/form.vue`）
   - `loadOrderUserDetail` 使用静默 `getUser`；`catch` 分支写入兜底展示名并同步 `orderUserNameMap`。
   - `getOrderUserDisplayName` 在无名称时返回已删除兜底，避免 `UserSelect` 显示纯数字 ID。

4. **干系人按钮组件**（`src/adapter/component/biz-form/order-users-button.vue`）
   - 同步使用 `fetchUserDisplayName` 与兜底文案。

## 避坑指南

- **Remote Select 回显**：`selected-items` 的 `nickName`/`userName` 不得为空字符串，否则组件会回退显示 value（数字 ID）。
- **全局错误拦截器**：`try/catch` 无法阻止 `requestClient` 已弹出的 toast，须用 `skipErrorMessage` 或 `baseRequestClient`。
- **复用**：模式与银行流水 `resolveOperatorName`（`bank-statement/utils.ts`）一致，已抽到 `user-display.ts` 供多处复用。
