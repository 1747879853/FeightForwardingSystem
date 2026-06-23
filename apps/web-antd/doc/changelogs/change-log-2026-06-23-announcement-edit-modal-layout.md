# 公告编辑弹窗化与表单布局优化

## 背景意图

公告新建/编辑由侧滑抽屉改为居中弹窗；修复弹窗内出现三条垂直滚动条；精简表单字段排布。

## 核心逻辑变更

- `list.vue` / `form.vue`：`useVbenDrawer` → `useVbenModal`，列表 `destroyOnClose: true`。
- `rich-text-editor.vue`：新增 `autoHeight` 模式（`scroll: false`），公告表单启用后由弹窗统一滚动。
- `data.ts`：排序与备注并排一行，备注 `rows` 改为 1。

## 避坑指南

- Vben Modal 内容区自带 `overflow-y-auto`，勿再套 `max-h + overflow-y-auto` 容器。
- 富文本在弹窗内建议 `auto-height`，避免与 Modal 滚动条叠加。
