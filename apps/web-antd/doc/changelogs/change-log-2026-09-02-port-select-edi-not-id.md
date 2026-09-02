# PortSelect 按 EDI 回填时不再把五字码当港口 Id

## 背景意图

船期查询把起运/目的港记在本机，刷新后回填五字码。`PortSelect` 只要 `modelValue` 有值就会打 `PortCode/DetailAsync`，而该接口的 `Id` 只认港口 GUID。五字码（如 `BRPHE`）会被后端拒绝：`The value 'BRPHE' is not valid for Id.`

## 核心逻辑变更

- `valueKey !== 'id'`（船期查询、港口拥堵都是 `ediCode`）时，不再用当前值去调详情。关闭态 label 靠 `selectedItems`。
- `valueKey === 'id'` 时仍按 GUID 拉详情补全两行展示字段。
- 船期查询缓存回填不再把五字码写进 `selectedItems.id`。

## 避坑指南

- `DetailAsync` 的 `Id` 不是 EDI。按五字码选港时必须带 `selectedItems` 回显，不能指望详情接口。
