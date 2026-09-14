---
title: 组织英文名输入上限对齐后端 128
date: 2026-09-14
module: system / dept
---

# 背景意图

后端 `OrganizationUnit.EnName` 已由 64 扩到 128（Freight `126090ba`）。组织管理表单仍按 64 截断，超过 64 的英文名无法录入。

# 核心逻辑变更

- `dept/data.ts` 中 `enName` 的 `Input.maxLength` 由 64 改为 128，与 `Create` / `Update` 入参 `[StringLength(128)]` 一致。
- 该字段仍非必填，仅输入框限制长度，未另加 Zod `.max()`。

# 避坑指南

- 不要只改前端不核对库列：后端迁移 `20260914030909_orgenmane` 把 `Sys_OrganizationUnits.EnName` 改为 `nvarchar(128)`，未跑迁移时超长仍会失败。
- 简称、电话、邮箱、办公地址仍是 64，不要一并放宽。
