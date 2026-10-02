# TAPD #1000202 客户审核通过后联系人/开票信息可直接改

## 背景意图

联系人、开票信息会随时增补；审核通过后若跟主表一起锁住，每次改都要走「申请修改」，成本过高。

## 核心逻辑变更

- 编辑页：联系人 / 开票仅在审核查看模式（`mode=audit`）只读；主表 `formLocked` 不再锁这两 Tab。
- 附件、排除服务仍跟随主表审核锁定（需申请修改后才能改）。
- `contact/list`、`invoice/list` 去掉对 `CLIENT_FORM_LOCKED_KEY` 的二次叠加，只认父级传入的 `readonly`。

## 涉及文件

- `views/client/editor.vue`
- `views/client/contact/list.vue`
- `views/client/invoice/list.vue`
