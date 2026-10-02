# TAPD #1000200 发票开出列表增加提单号列

## 背景意图

[TAPD #1000200](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000200)：发票开出列表看不出关联业务主提单号，审核/对账需点进详情。后端列表已返回 `mblNums`（`List<string>`）。

## 核心逻辑变更

- `InvoiceIssueListDto` 增加 `mblNums?: string[]`。
- 列表在「发票号」后增加「提单号」列：空格/顿号拼接展示，空为 `-`；`showOverflow` 悬停看全文。

## 涉及文件

- `api/Invoice/InvoiceIssue.ts`
- `views/settlement-management/invoice-issue/data.ts`
- `doc/发票开出/发票开出接口文档.md`（同步后端）
