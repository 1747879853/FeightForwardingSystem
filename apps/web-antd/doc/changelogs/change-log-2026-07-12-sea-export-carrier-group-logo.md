# 海运出口列表船公司分组 Tab 展示船司 Logo

## 背景意图

海运出口列表启用「船公司」分组后，分组 Tab 仅展示船公司名称与条数，与列表船公司列已升级为「Logo + 名称」的视觉不一致。需求要求：当分组维度为船公司时，分组 Tab 也在名称前展示对应船司 Logo，其他分组维度不受影响。

后端 `GetGroupedListAsync` 在船公司分组时会为每个分组项返回 `logo` 附件对象（含相对路径 `url`），其他分组维度该字段为空。

## 核心逻辑变更

### 通用分组类型 `components/list-grouping/types.ts`

`GroupItem` 新增可选字段 `logoUrl?: string`：**已解析为可直接访问的完整地址**，由调用方在 `fetchGroups` 中按需注入；无值则分组项不展示 Logo。保持通用组件与业务附件地址规则解耦。

### 通用分组 Tab `components/list-grouping/grouping-tabs.vue`

分组项渲染时，若 `item.logoUrl` 有值则在名称前展示 `<img>`（`h-5 w-5`、`object-contain`、圆角）；文案与条数结构不变。无 Logo 的分组项（如「未填写」或非船公司维度）照常仅显示文字。

### 海运出口列表 `views/sea-export-admin/list.vue`

`fetchGroups` 由同步改为异步：拉取 `GetGroupedListAsync` 后 `map` 每一项，用全局附件地址方法 `buildAttachmentUrl(item.logo?.url)` 解析为 `logoUrl` 注入。因只有船公司分组返回 `logo`，其他维度自然无 Logo，无需按分组类型做额外判断。

### 接口类型 `api/sea-export/sea-export-admin.ts`

`SeaExportGroupDto` 新增 `logo?: AttachmentItemDto | null`，对齐后端船公司分组返回。

## 避坑指南

1. **URL 必须解析**：接口返回的是相对路径（如 `/Uploads/document/...`），直接作为 `src` 在独立 API 网关下会失败，必须经 `buildAttachmentUrl` 拼接；解析逻辑放在业务侧（`list.vue`），通用组件只消费已解析的 `logoUrl`。
2. **通用组件保持无业务耦合**：不要在 `grouping-tabs.vue` 内直接 import 附件工具或按「船公司」判断；Logo 展示能力对所有接入分组的列表通用，谁需要谁在 `fetchGroups` 注入 `logoUrl`。
3. **无 Logo 项不留空位**：`v-if="item.logoUrl"` 控制图片渲染，其他维度/「未填写」项不会出现空白占位。
