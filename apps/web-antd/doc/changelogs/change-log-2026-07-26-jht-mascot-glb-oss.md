# 津海通桌宠 GLB 改走 OSS 直链-2026-07-26

## 背景意图

桌宠 3D 模型 `fantasy_creature_desktop_pet.glb` 原放在 `public/models/jht/`，会随前端静态资源打包与部署。改为与全局字体一致的固定 OSS 直链，减小仓库与构建产物体积。

## 核心逻辑变更

1. `jht-mascot.vue` 的 `modelUrl` 改为 `https://oss.jiayuebetter.com/fantasy_creature_desktop_pet.glb`。
2. 删除本地 `apps/web-antd/public/models/jht/fantasy_creature_desktop_pet.glb` 及空目录 `public/models`。

## 避坑指南

- GLTFLoader 走跨域加载，OSS 桶需对站点来源开放 CORS（含 `GET`）。
- 模型文件名/路径变更时需同步改 `modelUrl` 常量，勿再放回 `public/`。
