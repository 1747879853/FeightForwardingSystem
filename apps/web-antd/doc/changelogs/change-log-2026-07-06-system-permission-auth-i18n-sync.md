# 模块权限文案与后端接口 displayName 对齐

## 背景意图

- `/system/permission`「模块权限」Tab 通过 `auth.json` 展示权限树节点名称（权限码 `.` 转 `_` 后查找 `auth.${key}`）。
- 前端历史文案与后端权限定义接口返回的 `displayName` 长期不一致，导致授权配置时树节点名称与后台定义不符。
- 本次以后端权限列表接口返回的 `displayName` 为唯一基准，批量同步 `zh-CN/auth.json`。

## 核心技术决策 / 逻辑变更

- 更新 `zh-CN/auth.json` 中 **99** 处已有键的文案，使其与接口 `displayName` 完全一致。
- 新增 **16** 个接口已有但前端缺失的权限键：`Admin.OrderFeeTemplate`、`Admin.ExternalApi`（含 `Use`）、`Admin.Schedule` 及其 CRUD 子键。
- 同步在 `en-US/auth.json` 补充上述 16 个缺失键的英文占位翻译（英文仍以现有 convention 为准，未批量改已有英文文案）。
- 典型修正：部门/角色/用户节点去「管理」后缀；CRUD 子权限统一为「添加/查看/编辑/删除」；模块名如「客户对账」「海运出口运价」「打印数据源」「业务港口服务项」等与后端一致。

## 避坑指南（Gotchas & Constraints）

- 后端 `Admin.PersonalSetting` 当前返回 `[Admin.Personal setting]`，属后端本地化缺失，前端已按接口原样同步，待后端修复后可再次对齐。
- 接口未返回的历史权限键（如 `Admin.SeaImport`、`Admin.Log` 等）仍保留在 `auth.json`，避免旧环境权限树缺文案。
- 新增后端权限时，需同步：`auth.json` 双语键 ↔ 权限接口 `displayName`；若需与菜单一致，再单独核对路由 `meta.title`。
