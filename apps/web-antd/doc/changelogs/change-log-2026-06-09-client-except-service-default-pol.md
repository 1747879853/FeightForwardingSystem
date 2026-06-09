# 客户海运出口服务项目支持默认港口配置展示

## 背景意图

基础资料已支持 `polId` 为空的默认港口配置。客户编辑页「海运出口服务项目」Tab 的数据来自全局 `SeServiceConfig` 与客户 `ClientExceptService` 合并，需同步识别并展示默认配置分组。

## 核心逻辑变更

1. **分组标题**：`polId` 为空时 Card 标题显示「默认港口配置」。
2. **分组 key**：默认分组使用稳定 key `__default_pol__`，避免 `String(null)` 冲突。
3. **保存 payload**：默认分组排除项提交 `polId: null`，不再被 `buildEditPayload` 过滤丢弃。
4. **类型定义**：`ClientExceptServicePolGroupDto` / `PolEditDto` 的 `polId` 改为可选可空。

## 避坑指南

- 默认分组与具体港口分组并存时，保存须分别提交各自的 `polId`（默认为 `null`）。
- 展示文案复用 `system.basicData.seServiceConfig.defaultPolConfig`，与基础资料页口径一致。
