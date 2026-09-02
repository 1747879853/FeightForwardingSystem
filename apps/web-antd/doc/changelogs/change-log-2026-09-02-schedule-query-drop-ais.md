# 船期查询暂时去掉船舶定位

## 背景意图

详情弹窗右侧嵌 AIS iframe 还不稳，先从页面拿掉，只留船期完整字段。拼装函数仍留在 `data.ts`，方便以后接回。

## 核心逻辑变更

- 点船名或「详情」只打开船期字段弹窗，不再左右分栏、不再加载 AIS iframe。
- 删除 `vessel-ais-panel.vue`。`getAisQuery` / `buildAisIframeUrl` 和单测保留。

## 避坑指南

- 环境变量 `VITE_GLOB_FREIGHTOWER_AIS_*` 先不要删。接回时 iframe 仍按 `#/ais/vessel?key=&clientId=&mmsi=`，船名去空格。
