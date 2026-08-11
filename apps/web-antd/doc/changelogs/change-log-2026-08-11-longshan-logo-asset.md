---
title: 更新龙山品牌 Logo 资源
date: 2026-08-11
module: shared
---

# 背景意图

替换龙山品牌侧栏/顶栏使用的 Logo 位图资源，与最新品牌视觉对齐。

# 核心逻辑变更

- 更新 `apps/web-antd/src/assets/img/longshan/logo.png`（二进制资源，7330 → 6073 bytes）
- 无代码逻辑变更；由既有 `brand-assets` / 偏好 Logo 配置按 `VITE_APP_BRAND=longshan` 加载

# 避坑指南

- 仅替换该路径文件即可生效；无需改引用代码
- 本地若有静态资源缓存，刷新或硬刷新后再验收
