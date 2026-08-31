# 变更记录：站点健康检查脚本入库 scripts

## 背景意图

发布后探测原先调用 `.cursor/skills/site-health-check/scripts/check-sites.ps1`。`.cursor` 被 gitignore，其他人没有该 skill，发布成功后探测会直接报脚本不存在。

## 核心逻辑变更

- 将 `check-sites.ps1` 与对照表 `sites.json` 放到仓库 `scripts/`，随代码一起提供。
- `invoke-site-health-check.ps1` 改为调用同目录的 `check-sites.ps1`，不再引用 skill 路径。
- 单独探测可直接执行 `.\scripts\check-sites.ps1`（可加 `-Name`）。

## 避坑指南

- 改品牌 Web / API / 标题时同步改 `scripts/sites.json`，否则会误报 FAIL。
- `.cursor/skills` 仅给本机 Agent 看怎么跑，不能当发布依赖。
