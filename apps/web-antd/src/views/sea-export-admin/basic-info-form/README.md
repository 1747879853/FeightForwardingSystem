# 海运出口 · 基础信息表单（basic-info-form）

本目录收敛「海运出口基础信息表单」的主组件及其**私有**拆分文件（仅本表单使用），便于按域维护。跨视图共享的模块仍保留在上级目录 `sea-export-admin/`，本表单以 `../` 方式引用。

## 入口与使用方

| 使用方 | 引用方式 |
| --- | --- |
| 路由 `SeaExportCreate`（`/sea-exports/create`） | `#/views/sea-export-admin/basic-info-form/form.vue` |
| 编辑页 `editor.vue`（`/sea-exports/:id/edit` 内嵌 Tab） | `./basic-info-form/form.vue` |

## 目录内文件职责

| 文件 | 类型 | 职责 |
| --- | --- | --- |
| `form.vue` | 主组件 | 基础信息表单（新增/编辑）模板与编排入口：装配各子表单 schema、服务项流水线、干系人面板、AI 识别、保存提交。 |
| `form.css` | 样式 | `form.vue` 的外链 `<style scoped>`，含 `:deep()` 深度选择器（stylelint 已放宽 `.css` 规则）。 |
| `party-contact.ts` | 纯函数 | 委托单位/订舱代理联系人：默认联系人挑选、拉列表、提交 Id 规范化。 |
| `party-contact-field-label.ts` | UI 工厂 | 场站同款标签：姓名在右、悬停邮箱/手机/电话。 |
| `service-type-nodes.ts` | 纯逻辑 | 服务项目纯逻辑层：类型/常量、节点构建、分组排序、必填与锁定字段映射、任务状态判定。**无状态、无副作用**。 |
| `ai-extract-utils.ts` | 纯逻辑 | AI 识别规范化层：字段白名单/日期字段、`normalizeAiFieldValue`、`buildAiExtractFormPayload`、文件类型判断、citation 解析、`AI_EXTRACT_ACCEPT` 常量。 |
| `ai-extract-upload-modal.vue` | UI | AI 识别上传弹窗：`UploadDragger` 拖拽/点击选文件，选中后立刻交给父组件识别；识别中锁定关闭。 |
| `use-order-users.ts` | composable | 干系人（orderUsers）面板：角色增删、用户详情懒加载、头像/状态展示、三套保存校验、按委托单位绑定干系人默认回填（缺操作/单证/客服兜底当前账号）。默认展示销售/商务/操作/客服/单证；海外客服不默认展示，仅编辑态有值时显示。模板仍在 `form.vue` 中按返回值渲染。 |
| `use-sea-export-ai-recognize.ts` | composable | AI 识别回填编排：`recognizeAiFile(File)` → 调用识别接口 → 规范化 → 回填多子表单 / 箱表 / Select 回显 / 只读信息 / 服务项联动。上传弹窗交互在 `ai-extract-upload-modal.vue` / `form.vue`。 |
| `use-sea-export-submit.ts` | composable + 纯函数 | 保存提交域：`buildSeaExportDto`（表单值 → Add/Edit DTO，纯函数，与 mapper 的 `flattenDetail` 互为反向映射）+ `useSeaExportSubmit`（多表单校验、编辑重建二次确认、接口调用、脏检查快照）。 |

## 目录内依赖关系

```
form.vue
├─ sea-export-detail-mapper.ts        （详情 ⇆ 表单映射）
├─ party-contact.ts                   （往来单位默认联系人）
├─ party-contact-field-label.ts       （标签旁联系人浮层）
├─ service-type-nodes.ts              （服务项纯逻辑）
├─ ai-extract-utils.ts                （AI 规范化常量/工具）
├─ ai-extract-upload-modal.vue        （AI 拖拽上传弹窗）
├─ use-order-users.ts                 → sea-export-detail-mapper, service-type-nodes
├─ use-sea-export-ai-recognize.ts     → sea-export-detail-mapper, ai-extract-utils
└─ use-sea-export-submit.ts           → sea-export-detail-mapper, ../data

ai-extract-utils.ts → sea-export-detail-mapper.ts（toDayjs）
ai-extract-upload-modal.vue → ai-extract-utils.ts（accept / 文件类型）
```

`sea-export-detail-mapper.ts` 为最底层纯函数，被多数文件复用；上层 composable 只做编排与状态管理。

## 上级目录共享依赖（未移动，`form.vue` 以 `../` 引用）

| 文件 | 说明 | 是否被其它视图共享 |
| --- | --- | --- |
| `../data.ts` | 各子表单 schema 与常量（`CARGO_TYPE` 等） | 是（`list.vue`/`editor.vue`/`orderFee` 等） |
| `../service-type.ts` | 服务项枚举加载与 label 映射 | 是 |
| `../modules/order-ctn-table.vue` | 箱信息（orderCtns）表格组件 | 否（本表单私有，但保留在 `modules/`） |
| `../use-sea-export-tab-title.ts` | 页签标题同步 | 否 |
| `../use-yard-real-query.ts` | 场站实时查询 | 否 |
| `../use-sync-shipment-dates.ts` | 船期日期联动同步 | 否 |
| `../use-sea-export-copy.ts` | 单据「复制」+ 未保存警告 | 是（`list.vue`） |
| `../use-yundang-ocean-subscribe.ts` | 海运运踪订阅 | 是（`list.vue` 及订阅结果弹窗） |
| `../use-yundang-ocean-track.ts` | 运踪详情查询与弹窗 | 是（`list.vue`） |

> 说明：`use-sea-export-tab-title` / `use-yard-real-query` / `use-sync-shipment-dates` / `order-ctn-table.vue` 目前仅本表单使用，为控制本次改动范围暂留上级目录；如需进一步内聚可后续一并迁入本目录。
