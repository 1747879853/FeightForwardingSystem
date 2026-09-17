# 空运出口列表默认布局与起飞日期排序

## 背景意图

空运出口列表此前默认带会计期间筛选，首屏数据按创建时间倒序，列顺序也没有与海运出口台账保持一致。测试希望移除会计期间检索，并让空运出口按起飞日期展示最新航班，同时保留清晰的默认列布局。

## 核心逻辑变更

- 搜索区移除会计期间，不再向分页接口提交 `AccountDateStart` / `AccountDateEnd`。
- 首屏默认按 `transportOrder.etd DESC` 排序；列头显示倒序高亮，请求层通过字段映射发送 `TransportOrder.ETD DESC`。
- 新增空运出口默认列配置：状态、单号、起飞日期、委托单位、港口、航班、货量、干系人依次展示，次要字段默认隐藏。
- 已保存的个人列设置继续优先；无个人设置或执行“恢复默认”时采用代码默认配置。

## 避坑指南

- `defaultSort` 必须填写前端列字段 `transportOrder.etd`，否则接口虽能倒序，VXE 列头无法匹配并高亮。
- 后端排序字段仍由 `AIR_EXPORT_SORT_FIELD_MAP` 转换为 `TransportOrder.ETD`，不要直接把后端路径作为列字段。
- 默认列配置必须绑定真实对象路径，例如 `transportOrder.client.name`，不要重新使用已废弃的平铺 `clientName`。
