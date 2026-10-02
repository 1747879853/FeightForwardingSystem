# 发票开出列表与编辑页去除发票状态展示

## 背景意图

列表「发票状态」列/筛选与编辑页基础信息区的状态 Tag 对日常开票操作干扰大，按产品要求去掉展示。

## 核心逻辑变更

- 列表：删除 `combinedStatus` 列与「发票状态」筛选；顺带去掉仅由状态 Tag 打开的详情弹窗入口。
- 编辑页：基础信息区不再展示「发票状态」Tag。
- 接口字段与按钮门禁（如税局开票看 `issueStatus`）不变；`invoice-status.ts` 仍保留给冲红等逻辑。

## 涉及文件

- `views/settlement-management/invoice-issue/data.ts`
- `views/settlement-management/invoice-issue/list.vue`
- `views/settlement-management/invoice-issue/form.vue`
- `views/settlement-management/invoice-issue/invoice-detail-modal.vue`
