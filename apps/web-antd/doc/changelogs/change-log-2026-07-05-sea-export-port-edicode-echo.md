# 2026-07-05 海运出口详情港口下拉 EDI 回显补齐

## 背景意图

海运出口编辑页港口类 `PortSelect` 已统一使用 `labelKey: 'ediCode'` 展示选中项，但详情回填时 `selectedItems` 仅注入 `portName`，缺少 `ediCode`，导致编辑态打开时下拉框回显为港口英文名而非 EDI 代码（如 `CNTAO`）。

## 核心逻辑变更

1. `toPortSelectedItems` 增加可选 `ediCode` 参数，拼装回显对象时一并写入 `ediCode` 字段。
2. `loadEditData` 中六段港口（收货地/起运港/中转港1/2/目的港/交货地）、签单港、付费地点均从详情接口 `*EdiCode` 字段注入 `selectedItems`。
3. `SeaExportDto` 类型补齐各港口 `*EdiCode` 及 `prepareAtEdiCode` 字段，与 OpenAPI 响应对齐。

## 避坑指南

- 分页下拉 `labelKey` 与 `selectedItems` 字段必须一致：若展示依赖 `ediCode`，回显对象必须携带 `ediCode`，不能仅依赖 lazy load 详情补全（首屏仍可能闪烁或显示 fallback 文案）。
- 详情接口已扁平返回 `polEdiCode` 等字段时，优先直接使用，避免额外请求港口详情接口。
