# 登录后左侧菜单偶发只剩概览

## 背景意图

token 过期重定向登录后，偶发出现左侧菜单仅渲染「概览 / 海运 3D 地球看板」，刷新页面后恢复正常。排查确认 `UserConfiguration/GetAll` 在登录流程中可正常返回权限数据，问题出在前端权限初始化时序。

## 核心逻辑变更

1. **路由守卫复用登录已写入的 `accessCodes`**
   - `authLogin` 已通过 `Promise.all` 拉取并写入 `accessStore.accessCodes`。
   - `ensureAccessInitialized` 优先复用内存中的非空权限码，仅在刷新等场景（内存为空）时再请求 `GetAll`。
   - 避免登录后立即二次拉取或与 store 状态不同步导致 `generateAccess` 使用空 `roles` 过滤菜单。

2. **权限码为空时不锁定 `isAccessChecked`**
   - 若初始化后 `accessCodes` 仍为空，不设置 `isAccessChecked = true`。
   - 后续导航可重新初始化菜单，避免本会话被锁死、必须手动刷新。

3. **`getAccessCodesApi` 空安全**
   - 使用 `config?.auth?.grantedPermissions ?? {}`，避免响应结构异常时抛错。

## 避坑指南

- 菜单由路由守卫 `ensureAccessInitialized` → `generateAccess` 生成，不是登录 API 返回后直接渲染。
- 「概览」路由无 `meta.authority`，当 `roles` 为空时会被保留，其余业务菜单会被前端权限过滤移除。
- `accessCodes` 不做持久化；刷新后内存为空，守卫会自动重新请求 `GetAll`。
