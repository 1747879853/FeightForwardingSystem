# Auth 模块活文档

## 模块定位

- 模块名称：权限与授权（Auth）。
- 业务作用：维护后台权限点在前端的可读名称映射，支撑菜单、按钮、权限标签等文案展示。
- 语言资源入口：`apps/web-antd/src/locales/langs/zh-CN/auth.json`、`apps/web-antd/src/locales/langs/en-US/auth.json`

## 当前架构与数据组织

- 权限键采用扁平命名：`Admin_*` / `Page_*`，与后端权限码通过命名约定对齐。
- 页面侧通常通过 `t('auth.<PermissionKey>')` 读取展示文案。
- 中英文资源文件应保持同键集合，避免在切换语言或默认回退时出现缺失告警。

## 本次更新要点（2026-05-16）

- 新增并补齐以下权限分组键：
- 打印格式：`Admin_PrintJson_Delete`、`Admin_PrintFormat*`
- 付款结算：`Admin_PaymentSettlement*`
- 付款申请：`Admin_PaymentApplication*`
- 工作流/工作台：`Admin_WorkFlow*`、`Admin_Workbench*`
- 公告：`Admin_Announcement*`
- 服务配置：`Admin_ServiceConfig*`

## 增补更新要点（2026-05-16）

- 打印 JSON：`Admin_PrintJson`、`Admin_PrintJson_Add`、`Admin_PrintJson_Get`、`Admin_PrintJson_Edit`
- 枚举管理：`Admin_Enumeration*`
- 海运运价：`Admin_SeFreiPrice*`

## 关键逻辑

- 权限键是否存在由运行时 i18n 直接校验，不存在时会输出 `Not found 'auth.xxx'` 告警。
- 权限键本身是“稳定标识”，允许调整显示文案，但不应随意变更键名，否则会导致历史角色配置与界面映射脱节。

## 注意事项

- 新增权限时必须同步更新 `zh-CN` 与 `en-US` 的 `auth.json`。
- 优先复用通用动作文案（如 Add/Get/Edit/Delete），保证权限列表表达一致。
- 遇到同名权限跨模块复用时，保持一个键对应一个语义，避免同键多义导致审核与配置误解。
