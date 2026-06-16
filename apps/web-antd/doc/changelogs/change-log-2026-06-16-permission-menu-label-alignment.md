# 模块权限文案与左侧菜单对齐

## 背景意图

- `/system/permission`「模块权限」Tab 通过 `auth.json` 展示权限树文案（权限码 `.` 转 `_` 后查找 `auth.*`）。
- 左侧菜单标题来自路由 `meta.title`（多为 `system.json` / `seaExport.json` 等 i18n）。
- 两处文案长期各自维护，出现「权限树叫 A、菜单叫 B」的混淆，影响授权配置体验。

## 核心技术决策 / 逻辑变更

- 以**左侧菜单可见标题**为对齐基准，批量更新 `zh-CN/auth.json` 与 `en-US/auth.json` 中 22 处模块级权限键（含新增 `Admin.SeaImport` 及其 CRUD 子键）。
- 典型修正：用户/角色/组织、工作流、缓存、客户、运价、付费申请/结算、对账单、审核审批、基础资料港口/航线/集装箱/国家、港口服务项配置等。
- 子操作权限（Get/Add/Edit/Delete）文案未改，仅调整与菜单同级的模块节点名称。

## 避坑指南（Gotchas & Constraints）

- 新增带菜单的后端权限时，需同步：`router meta.title` ↔ `auth.json` 双语键 ↔ 父级菜单 `authority` 数组。
- 部分路由仍硬编码中文标题（如结算管理、银行流水、运价管理），后续若改 i18n 需再次核对 `auth.json`。
- 「数据/表级/字段权限」Tab 使用 `FrightModuleOptions`，与「模块权限」Tab 的 `auth.json` 是两套文案，勿混为一谈。
- 海运进口菜单当前路由仍绑定 `Admin.SeaExport` 权限，与 `Admin.SeaImport` 文案并存，属路由权限口径待独立治理项。
