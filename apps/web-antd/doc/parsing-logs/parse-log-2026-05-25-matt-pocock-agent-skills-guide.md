---
title: 解析日志 — Matt Pocock Agent Skills 指南沉淀
date: 2026-05-25
---

# 解析日志：Matt Pocock Agent Skills 指南

## 解析目标

- 将仓库已安装的 `mattpocock/skills`（14 个，位于 `.agents/skills/`）整理为团队可读的中文指南。
- 说明与本项目 `apps/web-antd/doc/` 文档体系的分工关系。

## 核心结论

| 维度 | 说明 |
| :-- | :-- |
| 安装来源 | `npx skills add mattpocock/skills`，锁定于根目录 `skills-lock.json` |
| 首次必跑 | `setup-matt-pocock-skills` → `docs/agents/*.md` |
| 与活文档 | `CONTEXT.md`/ADR 由 grill 系维护；`doc/modules/` 仍由业务开发与 `auto-doc-sync` 维护 |
| 交付物 | `doc/guides/matt-pocock-agent-skills-guide.md`、`doc/guides/GUIDES_INDEX.md` |

## 架构洞察

- 工程类 Skill 依赖统一 issue tracker 与 triage 标签，避免 Agent 在 GitHub/本地 markdown 之间行为不一致。
- `tdd` 与 `diagnose` 都强调**纵向/可运行反馈环**，与本项目 Vitest + 页面 E2E 能力可组合，但 UI 纯样式类任务应优先 `prototype` 而非 `tdd`。

## 文档偏差

- 此前 `doc/guides/` 仅有枚举指南，缺少 Agent 协作类指南；已通过 `GUIDES_INDEX.md` 建立索引入口。
