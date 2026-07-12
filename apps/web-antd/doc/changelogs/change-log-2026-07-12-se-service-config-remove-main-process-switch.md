---
title: 港口服务项配置移除是否主流程开关
module: 基础资料
author: auto-doc-sync
last_updated: 2026-07-12
---

# 背景意图

「是否主流程」属于全局 `ServiceType` 枚举标记（`extra1`），放在港口服务项配置弹窗容易误认为港口级配置。主流程维护入口收敛到枚举管理即可。

# 核心逻辑变更

- 港口服务项配置弹窗移除「是否主流程（全局）」开关及相关草稿态。
- 保存港口配置时不再顺带调用枚举 `EditAsync` 更新 `extra1`。
- 海运出口「配置服务项目」仍按 `ServiceType.extra1` 分为主流程 / 非主流程；标记改在「系统管理 → 枚举管理」的 `ServiceType` 维护。

# 避坑指南

- 不要再把 `extra1` 写进 `SeServiceConfig` 明细 DTO；它只属于枚举子项。
- 港口配置页只维护 `sortId`、角色、锁定/必填等港口级规则，与流程分组语义分离。
