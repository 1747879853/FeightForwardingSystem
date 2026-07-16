# 船期查询并入航线管理菜单

## 背景意图

侧边栏「船期管理」与「航线管理」同属航线业务域，需将「运价查询」「船期查询」统一收纳到「航线管理」分组下，避免两个并列顶级菜单。

## 核心逻辑变更

1. **`freight-rate.ts`**：父级「航线管理」`authority` 聚合 `Admin.SeFreiPrice` + `Admin.Schedule`；新增子路由「船期查询」（绝对 path `/schedule`，权限 `Admin.Schedule`）。
2. **删除 `schedule.ts`**：去掉独立「船期管理」顶级菜单，避免重复注册。
3. **URL 不变**：运价仍为 `/freight-rate`，船期仍为 `/schedule`。

## 避坑指南

- 父级菜单权限必须覆盖全部子项，否则仅有船期权限的用户看不到「航线管理」分组。
- 船期子路由使用绝对 path `/schedule`，与 `operation-management` 内海出/海进写法一致。
