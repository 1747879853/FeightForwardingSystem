# 海运出口台账补日期列并修复对象化名称展示

## 背景意图

- 台账需要展示货好、实际开船、预抵、截港、截关五个日期。
- 业务来源、付费方式、包装、签单方式与航线同类：接口已改为嵌套对象，列仍绑废弃 `*Name`，有资料也显示为空。空运出口列表业务来源/运输条款/包装同样问题。

## 核心逻辑变更

- 海出列表在开船日期后增加：`transportOrder.goodsCompleteTime`、`transportOrder.atd`、`transportOrder.eta`、`closeVgmTime`、`closingTime`，均 `formatDate` 只显示年月日。
- 海出四列补 `formatter`：来源 `codeSource.cnName`、付费 `codeFrt.cnName`、包装 `codePackage.name`、签单 `codeIssueType.billType`；无对象时回退旧 `*Name`。
- 空出列表对业务来源、运输条款、包装做同样 formatter。列 `field` 不变，排序 `fieldMap` 仍走实体导航。

## 避坑指南

- 货好/实际开船/预抵在 `transportOrder`，截港/截关在海出根级，不要都挂运输单。
- 对象化列展示走 `formatter`，不要改 `field`，否则用户列配置和排序映射会丢。
