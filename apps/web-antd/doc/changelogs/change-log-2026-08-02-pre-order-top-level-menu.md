# 业务联系单改为一级菜单

## 背景意图

业务联系单原挂在侧边栏「操作管理」分组下，与海运出口/进口同级。业务上它是独立前置单据入口，需提升为与「客户管理」类似的一级菜单，便于销售侧快速进入。

## 核心逻辑变更

- 从 `operation-management.ts` 抽出 PreOrder 路由树，新建独立模块 `router/routes/modules/pre-order.ts`。
- 顶层路由设置 `order: 194`、`hideChildrenInMenu: true`，侧边栏展示为一级「业务联系单」，位于「操作管理」(195) 之前。
- 页面路径不变：`/pre-order`、`/pre-order/add`、`/pre-order/:id/edit`、历史 `/detail` 重定向均保持原样。

## 避坑指南

- 模块文件会被 `import.meta.glob('./modules/**/*.ts')` 自动合并，无需改 `routes/index.ts`。
- 权限仍走 `Admin.PreOrder*`，与菜单层级无关；若后端菜单树另有配置，需同步调整后端菜单挂载点。
