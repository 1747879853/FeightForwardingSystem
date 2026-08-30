# 监装列表 Tab 底色改为 #FAFBFD

## 背景意图

未选中分段底色原先是 `#e3ecff`，按要求改成 `#FAFBFD`。

## 核心逻辑变更

- `skew-tabs` 的 canvas 轨道色改为 `#fafbfd`。
- `uni.scss` 的 `$tab-track` 同步为同一色。

## 避坑指南

- 选中态仍是白色滑块，改的是未选中段底色。
