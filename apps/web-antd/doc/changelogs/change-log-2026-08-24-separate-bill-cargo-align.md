# 2026-08-24 分单货物明细唛头/货描底边与右侧对齐

## 背景意图

货物明细三列里，唛头和货描文本框是固定高度，比右侧件数/包装/毛重/体积矮，底边对不齐。拉高时不能把标签到输入框的间距撑开。

## 核心逻辑变更

- 唛头、货描两列用 `grid-template-rows: auto 1fr`：标签行高度不变，`stack-label` 仍是 `margin-bottom: 6px`，只让文本框向下长到与右侧四项底边齐平。
- 右侧件数/包装/毛重/体积 `flex: none`，不跟栅格把字段内间距拉开。
- 取消文本框 `min-height: 166px` 和 affix 的纵向 flex，避免标签下方空出一截。

## 避坑指南

- 标签到控件的距离只认 `stack-label` 的 `margin-bottom: 6px`，不要用 `flex: 1` 去撑标签和文本框之间的空隙。
- Ant Design `TextArea` 的 affix 不要改成 `flex-direction: column`，清除按钮会变成单独一行或把框顶下去。
