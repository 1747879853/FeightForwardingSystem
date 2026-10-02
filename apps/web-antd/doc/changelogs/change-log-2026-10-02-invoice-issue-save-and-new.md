# 发票开出「保存并新建」

## 背景意图

财务连续开票时，每次保存后还要再点列表「新建」效率低；需在新建/编辑页提供「保存并新建」，落库后直接进入空白新建页。

## 核心逻辑变更

- 表单右上角在「保存/创建」旁增加「保存并新建」，共用校验与提交；`editLocked` 时禁用。
- 新建成功且选「保存并新建」：不跳转编辑页，同路由 `refreshTab` 重挂载空白新建（并自动打开选申请抽屉）。
- 编辑保存且选「保存并新建」：`push` 新建路由后 `closeTabByKey` 关闭当前编辑 tab；若复用已开新建 tab 再 `refreshTab` 清草稿。
- 普通「保存/创建」行为不变：新建成功仍 replace 到编辑并关掉原新建 tab。

## 涉及文件

- `views/settlement-management/invoice-issue/form.vue`
- `views/settlement-management/invoice-issue/composables/use-submit.ts`
- `doc/modules/settlement-management/invoice-issue.md`
