# 暂停拉取未落地的 SeaImportUserAttribute 枚举

## 背景意图

后端尚未配置 `SeaImportUserAttribute`，应用启动预热枚举时会报「枚举【SeaImportUserAttribute】不存在」。海运进口干系人角色暂未使用，应停止对该枚举的请求。

## 核心逻辑变更

- `init-enum.ts`：预热列表移除 `SeaImportUserAttribute`。
- `use-order-user-roles.ts`：`ORDER_USER_ROLE_ENUM_NAMES` 去掉 `bizType = 1` 映射；无映射时仅用固定角色兜底。
- 枚举详情页 `extra1` 标签文案同步去掉该枚举。

## 避坑指南

- 日后落地海运进口干系人角色时：先在枚举管理创建 `SeaImportUserAttribute`，再恢复映射与预热。
- 业务联系单本期仅开放海运出口业务类型，不受影响。
