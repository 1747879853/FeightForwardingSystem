# 分单只读字段去提示文案并改为纯文本展示

## 背景意图

「来自主单，只读」提示多余；禁用输入框展示只读信息发灰难看，也不适合信息展示。

## 核心逻辑变更

1. 去掉所有 `masterReadonlyHint` 文案（标签旁与船期分区标题）。
2. 主单只读字段由 `Input disabled` 改为 `div.readonly-text` 纯文本（多行用 `readonly-text--multiline`），单行底部分割线区分可编辑控件。

## 避坑指南

- 只读区勿再套 ant Input/禁用态；空值仍显示 `--`。
