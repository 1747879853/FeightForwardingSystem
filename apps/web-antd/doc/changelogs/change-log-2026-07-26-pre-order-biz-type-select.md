# 2026-07-26 业务联系单标题栏增加业务类型下拉

## 背景意图

`bizType` 此前在新建/编辑提交时写死为海运出口，标题栏不可见、不可选。需要在「装运方式」前露出业务类型选择，为后续扩展其他业务类型留口，本期仅开放海运出口一项。

## 核心逻辑变更

1. 基础信息标题 meta 区在「装运方式」前增加「业务类型」`Select`，绑定独立 `headerBizType`（默认 `PreOrderBizType.SeaExport`）。
2. 选项来自 `getPreOrderBizTypeOptions()`，当前文案表仅含「海运出口」；后续加类型只需补 `PRE_ORDER_BIZ_TYPE_TEXT`。
3. 详情回填读 `dto.bizType`；提交 payload 改为 `bizType: headerBizType`，不再硬编码。

## 避坑指南

- 枚举里虽有 `SeaImport = 1`，但本期未写入选项表，下拉不会出现；不要误以为前端已支持海运进口。
- meta 区字段与归属组织、装运方式一样脱离 vben form，保存时需并入 payload。
