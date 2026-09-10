# 开票申请查看页禁用控件文字对比度

## 背景意图

已提交单据进入查看页后，表单用 `disabled` 锁定。Ant Design 默认禁用字色过浅，发票信息难辨认。

## 核心逻辑变更

- 根 `Card` 增加 `invoice-application-form--readonly`。
- 覆盖 Input / Select / InputNumber / TextArea / 表内嵌控件的禁用字色为近正文色，保留浅底表示不可改。
- 查看页标题改为「查看开票申请」；发票类型标题保持红色，隐藏下拉箭头。

## 避坑指南

- 不要为了可读性改成去掉 `disabled`，否则查看页仍可误改。
- WebKit 下禁用 Input 需同时设 `-webkit-text-fill-color`。
