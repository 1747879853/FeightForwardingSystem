# 监装列表 Tab 未选中底色改为 #E3ECFF

## 背景意图

未选中分段底色按要求用 `#E3ECFF`，不再用上一轮的 `#FAFBFD`。

## 核心逻辑变更

- `skew-tabs` 轨道色与 `$tab-track` 改回 `#e3ecff`。选中态仍是白色滑块。

## 避坑指南

- 无。只改 canvas 填充色。
