# 海运出口/进口菜单船图标朝向区分

## 背景意图

操作管理下「海运出口」与「海运进口」原共用 `mdi:ferry`，侧栏难以一眼区分。

## 核心逻辑变更

- 两端均改用 `fluent-emoji-high-contrast:ship`。
- 出口保持默认（船头朝右）；进口通过 Iconify `hFlip` 水平翻转（船头朝左）。
- `createIconifyIcon` 支持传入额外 Iconify 属性（如 `hFlip`）；新增 `SeaExportShipIcon` / `SeaImportShipIcon` 供路由 `meta.icon` 使用。

## 避坑指南

- 菜单 `meta.icon` 需传组件（非纯字符串）才能带上 `hFlip`；仅写 `fluent-emoji-high-contrast:ship` 无法区分朝向。
- 勿与无关的 `favicon.png` 等资源改动混在同一提交。
