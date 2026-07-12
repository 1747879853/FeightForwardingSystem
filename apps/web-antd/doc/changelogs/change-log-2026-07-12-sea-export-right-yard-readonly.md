---
title: 海运出口详情右侧拆分干系人与场站只读信息
date: 2026-07-12
type: Feature
module: 海运出口
route: /sea-exports/create、/sea-exports/:id/edit
author: auto-doc-sync
---

# 背景意图

海运出口基础信息页右侧原先仅有「干系人」卡片。业务需要在同一侧栏下方再展示场站联系信息（联系人、邮箱、手机、电话），且这些字段来自详情 DTO、只读不可改，便于操作查看堆场对接人而不必翻到中间表单。

# 核心逻辑变更

涉及文件：

- `apps/web-antd/src/api/sea-export/sea-export-admin.ts`：`SeaExportDto` 补充 `yardContact` / `yardEmail` / `yardMobile` / `yardTel`
- `apps/web-antd/src/views/sea-export-admin/basic-info-form/sea-export-detail-mapper.ts`：`flattenDetail` 扁平化上述四字段
- `apps/web-antd/src/views/sea-export-admin/basic-info-form/form.vue`：右侧由单 Card 改为纵向容器；上为干系人，下为「场站信息」只读卡；值写入 `entrustReadonlyInfo` 并随详情回填
- `apps/web-antd/src/views/sea-export-admin/basic-info-form/form.css`：`.right-column` 改为 flex 列布局；新增 `.yard-readonly-panel*` 样式

行为要点：

1. 新建态四字段为空，展示 `-`
2. 编辑态由 `DetailAsync` → `flattenDetail` → `refreshEntrustReadonlyInfo` 回填
3. 场站信息**不参与**保存提交，仅展示

# 避坑指南

- 场站联系信息挂在海出根 `SeaExportDto`，不是 `ClientDto` 的通用联系人；勿从 `yard` 嵌套对象或客户详情二次拉取覆盖
- 选择/变更 `yardId` 不会自动刷新这四字段（当前仅详情回填）；若后端在保存时按场站主数据覆盖，需保存后重新拉详情才能看到最新值
- 右侧宽度仍为 180px，长邮箱/电话靠 `text-overflow: ellipsis` + `title` 悬浮完整显示
