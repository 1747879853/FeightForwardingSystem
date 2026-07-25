---
title: 海运出口编辑工作台移除表单滚动与顶部 Tab 联动
date: 2026-07-25
type: Fix
module: 海运出口
route: /sea-exports/:id/edit
author: auto-doc-sync
---

# 背景意图

顶部「服务详情 / 单证信息」等分区 Tab 隐藏后，基础信息表单内滚动仍通过 `sectionChange` → `onSectionChange` 改写工作台 `activeTab`。`shipment` / `port` 等 key 已无对应面板，会导致中间空白、顶部无选中 Tab；滚动到收发通还会误切到「更改单」。

# 核心逻辑变更

涉及文件：

- `views/sea-export-admin/editor.vue`：删除 `onSectionChange` 与 `@section-change`；`VALID_TAB_KEYS` 仅保留当前可见且有面板的 key；「更改单」去掉误用的 `sectionKey: 'party'`
- `views/sea-export-admin/basic-info-form/form.vue`：删除 `sectionChange` 事件、滚动分区检测与 `window` scroll 监听；`scrollToSection` 仅保留点击定位能力

行为要点：

1. 基础信息内滚动不再改写工作台顶部 Tab
2. 旧 `sessionStorage` 中的隐藏 Tab key 恢复时回退到「基础信息」，避免空白页

# 避坑指南

- 若日后恢复「服务详情 / 单证信息」为顶部 Tab，不要再把滚动分区 key 直接赋给独立子页 `activeTab`；分区高亮应与子页 Tab 解耦，或仅在仍挂载基础信息表单时做滚动定位
- 海运进口 / 客户编辑若仍保留同类联动，需单独评估是否同样有隐藏 Tab 后的空白风险
