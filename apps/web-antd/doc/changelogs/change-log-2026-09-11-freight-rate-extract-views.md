# 运价查询视图从海运出口目录抽出为独立模块

## 背景意图

运价管理是独立业务能力（航线管理分组），原先放在 `views/sea-export-admin/freight-rate` 易与海出操作域混淆，也不利于按模块定位源码。

## 核心逻辑变更

- 目录迁至 `apps/web-antd/src/views/freight-rate/`
- 路由 `freight-rate.ts` 组件懒加载路径改为 `#/views/freight-rate/list.vue`
- 同步更新 `MODULE_INDEX`、`modules/freight-rate/index.md`、枚举用法指南中的源码路径
- API 仍为 `api/sea-export/freight-rate-admin.ts`（后端契约域未改）

## 避坑指南

- 历史 changelog / 外部 API 文档里可能仍写旧路径，以当前 `views/freight-rate` 为准
- 路由 path `/freight-rate`、权限 `Admin.SeFreiPrice` 不变，无需改菜单配置
