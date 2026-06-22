# 海运出口表单布局：左侧委托栏并入基础信息

## 背景意图

海运出口新建/编辑页左侧委托信息与备注卡片占用固定宽度，中间基础信息区域偏窄。业务希望将委托相关字段收敛到中间「基础信息」区块，释放横向空间。

## 核心逻辑变更

1. 移除左侧 `委托信息` / `备注信息` 卡片，中间 `center-column` 占据除右侧干系人外的剩余宽度。
2. 「基础信息」标题行左对齐展示：委托编号、会计期间、应结日期、所属公司（只读）；装运方式、订单类型（标题行小型 Select，值写入隐藏表单项）。
3. 业务来源、付费方式/付费地点（`FrtPrepareInput` 双输入）、运输条款、贸易条款追加到基础信息表单「提单/副本份数」之后。
4. 备注信息、外部备注各占 6 列栅格中的 2 列，置于收发通「通知人」区块下方同一行。

## 避坑指南

- `codeFrtId` 与 `prepareAtId` 仍为两个独立 DTO 字段，仅 UI 合并；详情回填须同时更新 `FrtPrepareInput` 的 `frtProps.selectedItems` 与 `prepareProps.selectedItems`。
- `blType`/`billType` 通过 `basicInfoFormApi` 隐藏字段保存，标题行 Select 变更后须 `setFieldValue`，加载详情后须 `syncBasicInfoHeaderFields`。
