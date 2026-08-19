# 海运出口台账航线列改为读目的港对象

## 背景意图

- 列表「航线」列绑顶层 `laneName`，分页接口并不返回该扁平字段，有目的港航线的单据也显示为空。
- 详情映射与接口注释均约定航线取自目的港：`pod.lane.laneName`；海运进口列表已用同类 formatter。

## 核心逻辑变更

- `sea-export-admin/data.ts` 航线列增加 `formatter`：`row.pod?.lane?.laneName`。
- 列 `field` 仍为 `laneName`，列头排序继续走 `fieldMap` 的 `POD.Lane.LaneName`。

## 避坑指南

- 海运出口航线/国家取目的港，海运进口取起运港，不要抄错导航。
- 列表 DTO 对象化后，展示列应走 `formatter` 读嵌套对象，不要假设仍有顶层 `*Name`。
