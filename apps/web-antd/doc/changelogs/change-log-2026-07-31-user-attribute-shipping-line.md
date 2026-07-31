# 用户属性新增「航线」并将「商务(航线)」更名为「商务」

## 背景意图

业务将原「商务(航线)」角色拆分：商务独立为「商务」，新增独立用户属性「航线」（位标志 `256`），便于用户管理按角色勾选与筛选。

## 核心逻辑变更

- `UserAttribute` 枚举新增 `ShippingLine = 256`（主定义在 `user-admin.ts`，其它 API 内联枚举同步）。
- 用户管理选项 `getUserAttributeOptions()` / `userAttributeValues` 纳入「航线」。
- 中文文案：`business` 由「商务(航线)」改为「商务」；新增 `shippingLine: 航线`。

## 避坑指南

- 系统用户管理为全量用户属性（现 9 项）；海运出口单据角色仍为 6 项，勿把 `ShippingLine` 误加进 `getSeaExportOrderUserRoleOptions()`。
- 「航线」位值为 `256`，勿与费用模板等处的顺序枚举索引混淆。
