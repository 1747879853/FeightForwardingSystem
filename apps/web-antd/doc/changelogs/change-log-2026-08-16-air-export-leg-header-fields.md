# 空运出口航班与订舱代理移到航段标题右侧

## 背景意图

- 航段区块主体只保留起运地 / 中转地 / 目的地；航班与订舱代理原先跟在流程条下方，占一整行，和港口选择挤在一起。
- 希望这两个字段贴在「航段信息」标题右边，港口流程更干净，录入时也能一眼看到航班和订舱代理。

## 核心逻辑变更

- `useAirLegFormSchema` 仍是字段源；`flightNo`、`bookingAgentId` 用 `AIR_LEG_HEADER_FIELD_NAMES` 拆到独立的标题栏表单 `AirLegHeaderForm`。
- 保存、脏检查、详情回填（含订舱代理 `selectedItems`）改走 `airLegHeaderFormApi`，取值仍合并进 `collectCurrentFormValues`，DTO 口径不变。

## 避坑指南

- 订舱代理回显必须在 header 表单上 `updateSchema`，不要再写回航段主体表单，否则下拉没有 `selectedItems`。
- 标题栏控件在浅色主色底上，输入框/选择器需要白底，否则和标题条融在一起。
