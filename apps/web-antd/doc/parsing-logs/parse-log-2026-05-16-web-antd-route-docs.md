# web-antd 路由与页面文档重构解析日志

## 解析目标

- 按 `auto-doc-sync` 规范扫描 `apps/web-antd` 前端项目的动态路由、页面组件、`data.ts` 与 API 契约。
- 将旧的 `doc/modules/*.md` 扁平文档替换为 `doc/modules/<module-name>/<page-route-name>.md` 页面级活文档。
- 覆盖所有 `src/router/routes/modules/*.ts` 中可见页面路由，并刷新 `MODULE_INDEX.md`。

## 核心逻辑梳理/发现的文档偏差

- 原 `doc/modules` 目录以 `sea-export.md`、`client.md` 等扁平模块文档为主，不符合当前技能要求的“模块 -> 页面”层级。
- 动态业务路由由 `src/router/routes/index.ts` 通过 `import.meta.glob('./modules/**/*.ts', { eager: true })` 合并，初始路由只注册核心路由和 404。
- 权限守卫在首次进入受控页面时拉取 ABP 权限码，通过 `generateAccess` 将 `accessRoutes` 转成可访问菜单和路由。
- 页面组件由 `src/router/access.ts` 中的 `pageMap = import.meta.glob('../views/**/*.vue')` 提供，路由权限主要通过 `abpPageAuthority` 映射。

## 架构洞察

- 文档应以路由为最小页面单元，而不是以历史业务主题为单元；否则会遗漏隐藏编辑页、新增页、详情页等真实用户路径。
- 客户、海运出口、海运进口、费用管理、审核审批之间通过客户主数据、订单费用、付款申请、对账单和工作流任务串联。
- 基础资料页面同质性高，但它们是业务表单字段、下拉字典和费用口径的来源，仍需保留页面级索引。
- 系统管理中的工作流、权限、枚举和缓存会影响业务页面的可访问性、状态展示和审批链路，应纳入全局文档索引。
