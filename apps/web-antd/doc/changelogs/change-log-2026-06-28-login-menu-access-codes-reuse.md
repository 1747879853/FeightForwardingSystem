# 登录后左侧菜单偶发只剩概览

## 背景意图

token 过期重定向登录后，偶发出现左侧菜单仅渲染「概览 / 海运 3D 地球看板」，刷新页面后恢复正常。排查确认：401 登出后，失效前未完成的 `ensureAccessInitialized` 会在登录页用无效 token 请求 `UserConfiguration/GetAll` 并返回空权限；该 stale 流程随后把空菜单写入 store 并将 `isAccessChecked` 锁死。登录后虽能正常拉取权限，但守卫因 `isAccessChecked=true` 直接放行，不再重建菜单。

## 核心逻辑变更

1. **路由守卫复用登录已写入的 `accessCodes`**
   - `authLogin` 已通过 `Promise.all` 拉取并写入 `accessStore.accessCodes`。
   - `ensureAccessInitialized` 优先复用内存中的非空权限码，仅在刷新等场景（内存为空）时再请求 `GetAll`。
   - 避免登录后立即二次拉取或与 store 状态不同步导致 `generateAccess` 使用空 `roles` 过滤菜单。

2. **权限码为空时不锁定 `isAccessChecked`**
   - 若初始化后 `accessCodes` 仍为空，不设置 `isAccessChecked = true`。
   - 后续导航可重新初始化菜单，避免本会话被锁死、必须手动刷新。

3. **登录时复位 `isAccessChecked`**
   - `authLogin` 写入新 token 后立即 `setIsAccessChecked(false)`。
   - 确保登录后的首页导航一定触发菜单重建，不被 stale 流程遗留的 `isAccessChecked=true` 跳过。

4. **会话纪元（token）校验，丢弃 stale 初始化写入**
   - `ensureAccessInitialized` 进入时记录当前 `accessToken`，在 `await` 拉取权限 / 生成菜单后再次比对。
   - 若 token 已变化（已登出或已重新登录），放弃写入 `accessCodes`、`accessMenus` 与 `isAccessChecked`，避免旧会话空权限污染新会话。

5. **`getAccessCodesApi` 空安全**
   - 使用 `config?.auth?.grantedPermissions ?? {}`，避免响应结构异常时抛错。

## 避坑指南

- 菜单由路由守卫 `ensureAccessInitialized` → `generateAccess` 生成，不是登录 API 返回后直接渲染。
- 「概览」路由无 `meta.authority`，当 `roles` 为空时会被保留，其余业务菜单会被前端权限过滤移除。
- `accessCodes` 不做持久化；刷新后内存为空，守卫会自动重新请求 `GetAll`。
- 401 登出不会取消已在途的守卫初始化；必须用 token 纪元或登录复位 `isAccessChecked` 防止 stale 写入锁死菜单。
