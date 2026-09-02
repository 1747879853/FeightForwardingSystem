# 船期查询日期与关键词输入对齐港口框样式

## 背景意图

查询条上预计离港日期、关键词搜索相对起运/目的港框更突兀：日期用了查询按钮同款投影和白底，关键词则落到 Ant Design 默认描边（佳越主色在 hover/focus 时更明显）。

## 核心逻辑变更

- 日期框去掉投影，背景改成与港口对相同的浅底，边框仍用 `--sq-line`；内部 DatePicker hover/focus 不再套主色描边。
- 关键词外包一层 `.keyword-field` 并 `:bordered="false"`，边框、圆角与「按周班」下拉对齐；hover/focus 不再出现品牌主色描边。

## 避坑指南

- 不要把 `class` 只挂在 `Input` 上指望打到 `.ant-input-affix-wrapper`：有 prefix 时 class 可能落到内部 `input`，外层默认描边还在。
- 查询按钮可以保留投影；日期、关键词不要再抄按钮的 `box-shadow`。
