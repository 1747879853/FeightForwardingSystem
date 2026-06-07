# 船公司中文简称字段对接（CarrierCnShortName）

## 背景意图

后端在海运出口、服务项任务等接口新增 `carrierCnShortName` 字段；`CarrierSelect` 默认 `labelKey` 已改为 `cnShortName`。前端需同步类型定义、`selectedItems` 回显拼接及列表展示口径。

## 核心逻辑变更

1. **API 类型**
   - `SeaExportDto` / 海运进口 DTO 新增 `carrierCnShortName?: string`。

2. **CarrierSelect 回显（selectedItems）**
   - 海运出口/进口编辑页：`carrierId` 回填由 `cnName + carrierName` 改为 `cnShortName + (carrierCnShortName || carrierName)`，并附带 `code`（若有）与 `logo`。
   - 运价编辑弹窗：详情加载后若存在嵌套 `carrier` 对象，直接注入 `selectedItems`，避免二次请求且保证简称回显。

3. **列表展示**
   - 海运出口列表、工作台动态列（prop 1001）、运价列表：优先展示 `carrierCnShortName` / `carrier.cnShortName`，空值回退全称或英文名；运价列表标签格式与下拉一致 `CODE(简称)`。

## 避坑指南

- **不要把 PortSelect 的 `cnName` 与 CarrierSelect 混用**：船公司默认 labelKey 为 `cnShortName`。
- **selectedItems 需尽量带 `code`**：否则选中态可能只显示 `(简称)` 而缺少 CODE 前缀。
- **详情/费用摘要页仍用 `carrierName` 全称**：列表与工作台用简称，详情展示保持全称语义。
