# 付费申请添加费用抽屉新增主提单号与箱型箱量列

## 背景意图

编辑/新建付费申请时，添加费用抽屉外层业务列表需展示主提单号与箱型箱量，便于用户在选费阶段核对业务信息。

## 核心逻辑变更

- `PayAppFeeGroupDto` 补充 `orderCtns` 类型定义；`mblNum` 直接作为列字段展示。
- `add-fee-modal/data.ts` 新增 `formatOrderCtnsDisplay`，按 `ctnCodeName` 汇总箱量，格式为 `20GP*2，40HQ*1`。
- 外层固定列在「委托编号」后增加「主提单号」「箱型箱量」两列；长文本使用 Tooltip 展示完整内容。

## 避坑指南

- 箱型展示依赖接口返回 `orderCtns[].ctnCodeName`；若仅有 `ctnCodeId` 需后端补全名称或前端另行字典映射。
- 编辑页与新建页共用 `add-fee-modal`，改列定义会同时生效。
