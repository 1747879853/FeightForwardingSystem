---
title: 浩瀚远洋顶栏改为整图 logo-text
date: 2026-09-11
module: shared
---

# 背景意图

浩瀚远洋（hhyy）顶栏左上角原先拼「方形 `logo.png` + 站点名文本」，与品牌横版 `logo-text.png`（图标 + 浩瀚远洋 + 国际物流）重复。需要直接展示整张横版 Logo。

# 核心逻辑变更

1. **`LogoPreferences.fullSource`**：有值且未收起时，`VbenLogo` 只渲染该横版图，不再拼方形图标 + 文本。
2. **仅 hhyy 赋值**：`brandLayoutLogoFull` 为 public 稳定路径 `/logo-text.png`；其他品牌保持原「方标 + 站点名」。
3. **`initPreferences`** 合并缓存后强制回写 `fullSource`，避免 localStorage 粘住旧拼法。

# 避坑指南

- 验收需用 `pnpm dev:antd:hhyy` / hhyy 包，默认 `dev` 是佳越测试，不会走整图。
- 请求应为 `http://<站点>/logo-text.png`，不要改成 vite hash 路径。
- 侧栏折叠收起标题时仍回退方形 `logo.source`；`header-sidebar-nav` 顶栏 Logo 不会收起。
