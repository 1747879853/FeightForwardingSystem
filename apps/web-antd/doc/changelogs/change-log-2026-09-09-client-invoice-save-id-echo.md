# 客户开票信息首次保存后仍走新增且标题不回显税号

## 背景意图

客户编辑「开票信息」首次填完保存应调用 `AddAsync`，成功后标题行回显税号/抬头；再点保存应走 `EditAsync`。此前第二次仍走新增，标题也不更新。

## 根因

- 列表用临时 id（`new_invoice_*`）区分新增；`isNew = invoiceId.startsWith('new_')`。
- 保存成功后原先依赖 `loadInvoiceList()` 换成真实 id，但该调用被注释掉，临时 id 一直留在列表。
- 标题区读的是列表项 `invoice.taxNum` / `header`，未用表单值回写，所以保存后仍显示占位文案。

## 核心逻辑变更

`client/invoice/list.vue`：

1. 新增成功取 `AddAsync` 返回的 id，就地替换临时 id，并回写抬头/税号等标题字段。
2. 同步 `activeKey`，清理旧 `formRefs`；面板因 `:key` 变化重建后以真实 id 进入编辑态。
3. 编辑成功同样回写标题字段，并 `syncSnapshot` 清脏。

## 避坑指南

- 不要只注释掉整表重载又不回写 id：其它未保存卡片的草稿会丢，但本卡必须换成真实 id。
- `AddAsync` 返回空 id 时应判失败，勿假装成功。
