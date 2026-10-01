# 客户管理 / 编辑页逻辑加固

## 背景意图

审计发现编辑页 Tab 切换后未保存守卫失效、审核锁定只挡基础信息、列表删除/失信门禁偏松、地址本地编辑串改、开票空列表强制草稿等问题，按 Critical/High 落地修复。

## 核心逻辑变更

### 编辑页脏检查与审核边界

- Tab 由 `v-if`+`KeepAlive` 改为 `v-show`，各子 Tab 常驻，未保存守卫可汇总基础信息 / 联系人 / 开票 / 排除服务脏状态。
- `formLocked` 经 editor provide 的可写 ref 同步到兄弟 Tab；审核模式与「已通过等不可直改」时联系人、开票、附件、排除服务一并只读；点「申请修改」解锁后子 Tab 同步放开。
- 「提交审核」走编辑页聚合脏检查，子 Tab 未保存也会拦截。

### 列表

- 启用客户审核时：仅未提交 / 已驳回可删除。
- 失信加入/取消需 `Admin.Client.Edit`。

### 基础信息

- 地址引入 `_localKey`，修复多条未落库地址编辑互相覆盖。
- 保存前对简称/全称/英文全称调用 `CheckDuplicateAsync`；新建路径 `name`/`fullName`/`enFullName` 统一 trim。

### 开票信息

- 空列表不再自动插入草稿；`new_*` 草稿可本地删除。
- 保存 loading 按卡片 id 分锁；只读态隐藏新增/保存/AI/银行编辑。

## 涉及文件（摘要）

- `views/client/editor.vue`
- `views/client/base/client-editor-context.ts`（新增）
- `views/client/base/form.vue` / `address-modal.vue`
- `views/client/list.vue`
- `views/client/contact/**` / `invoice/**` / `attachments/list.vue` / `except-service/index.vue`
