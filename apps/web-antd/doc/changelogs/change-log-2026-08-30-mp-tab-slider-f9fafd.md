# 监装列表 Tab 选中色改为 #F9FAFD

## 背景意图

选中分段滑块原先是纯白，按要求改成 `#F9FAFD`。

## 核心逻辑变更

- `skew-tabs` 的 `SLIDER_COLOR` 改为 `#f9fafd`。未选中底色仍是 `#E3ECFF`。

## 避坑指南

- 无。只改 canvas 滑块填充色。
