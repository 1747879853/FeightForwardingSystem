# 2026-09-11 客户税率与费用录入税率联动

## 变更说明

1. **客户管理**新增可空字段「税率」`taxRate`（0~100，百分数）：表单录入、列表展示、新增/编辑提交。
2. **费用录入**生成税率规则调整为：
   - 优先取**结算对象**客户税率；
   - 结算对象未设置税率时，再取**费用名称（费用代码）**默认税率。
3. 覆盖路径：Handsontable 费用表联动、费用编辑弹窗、VXE `CellFeeCodeSelect`/`CellClientSelect`、AI 账单费用确认弹窗；订单详情往来单位与客户缓存透出 `taxRate`。
4. 费用模板无结算对象，仍仅按费用代码税率带出（行为不变）。

## 涉及文件

- `src/views/client/base/data.ts` / `form.vue`
- `src/api/sea-export/client-admin.ts`、`src/api/common/client.ts` 等 `ClientSimpleDto`
- `src/views/_shared/order-fee/modules/composables/useOrderFeeLinkage.ts`
- `src/views/_shared/order-fee/modules/utils/helpers.ts`（`resolveFeeTaxRate`）
- `src/views/_shared/order-fee/modules/order-fee-editor-modal.vue`
- `src/views/_shared/order-fee/modules/ai-bill-fee-result-modal.vue`
- `src/adapter/vxe-table.ts`、`src/adapter/component/biz-select/client-select.vue`
