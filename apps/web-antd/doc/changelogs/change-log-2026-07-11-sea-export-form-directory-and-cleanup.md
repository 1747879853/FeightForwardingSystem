# 海运出口基础信息表单目录化收敛 + 死代码清理

> 日期：2026-07-11范围：`apps/web-antd/src/views/sea-export-admin/`（基础信息表单及其私有拆分文件）类型：Refactor（纯代码组织调整，运行行为不变）

## 背景意图

海运出口「基础信息表单」（`form.vue`）在前序 6 个批次拆分后，主组件与其私有拆分文件（映射层、服务项纯逻辑、干系人/AI 识别/保存提交 composable、外链样式等）平铺在 `sea-export-admin/` 目录下，与列表、编辑器、orderFee、changeOrder 等其它视图文件混杂，不利于按域维护。本次将其收敛进独立目录并补充导航文档，同时清理遗留的未使用声明。

## 核心逻辑变更

1. 新建目录 `sea-export-admin/basic-info-form/`，用 `git mv` 迁入 8 个表单私有文件（保留历史）：
   - `form.vue`、`form.css`
   - `sea-export-detail-mapper.ts`（详情⇆表单纯映射）
   - `service-type-nodes.ts`（服务项纯逻辑）
   - `ai-extract-utils.ts`（AI 识别规范化，原在 `modules/`）
   - `use-order-users.ts`、`use-sea-export-ai-recognize.ts`、`use-sea-export-submit.ts`
2. 相对路径修正：
   - 目录内互引保持 `./`（mapper/service-type-nodes/ai-extract-utils）。
   - 对上级共享模块改用 `../`：`../data`、`../service-type`、`../modules/order-ctn-table.vue`、 `../use-sea-export-tab-title`、`../use-sea-export-copy`、`../use-yard-real-query`、 `../use-sync-shipment-dates`、`../use-yundang-ocean-subscribe`。
3. 外部引用同步：
   - 路由 `SeaExportCreate` → `#/views/sea-export-admin/basic-info-form/form.vue`。
   - `editor.vue` → `./basic-info-form/form.vue`。
4. 新增 `basic-info-form/README.md`：梳理入口/使用方、目录内各文件职责、依赖关系图，以及仍留在上级目录的共享依赖清单。
5. 死代码清理（`form.vue`）：移除 5 处未使用声明——`ArrowLeft`、`Users`（未用图标导入）、 `pageTitle`（computed）、`isServiceTypeNodeDone`、`handleBack`。

## 避坑指南

- **共享文件未移动**：`data.ts`、`service-type.ts`、`use-sea-export-copy.ts`、 `use-yundang-ocean-subscribe.ts` 被 `list.vue` 等其它视图引用，移动会破坏它们，故保留原位。
- **范围克制**：`use-sea-export-tab-title` / `use-yard-real-query` / `use-sync-shipment-dates` / `modules/order-ctn-table.vue` 虽仅本表单使用，但非本次拆出，暂留上级目录（README 已注明）。
- **验证口径**：`vue-tsc` 迁移前后对比无「找不到模块」错误，5 处 `TS6133 未使用` 报错已消除，未引入新错误；剩余报错均为迁移前既有的历史类型问题（如 AI 载荷 `{}` 类型、Select 回调签名），与本次改动无关。
