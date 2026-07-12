# 工作台编号检索、仅勾选选中与 TrimInput

## 背景意图

1. 工作台「海运出口服务」业务列表点击整行会切换选中，浏览/双击进编辑时易误勾选；期望与列表页一致，仅点击 checkbox 才选中。
2. 工作台统计/列表筛选原先只有 MBL，无法按订舱编号、委托编号统一检索；后端 `GetWorkbenchCountAsync` / `GetWorkbenchPagedListAsync` 已支持 `Keyword`，前端改为「编号」统一检索并去掉独立 MBL 条件。
3. 编号类检索常因粘贴带前后空格导致查不到；海运出口列表、费用审核、付费审批的 Vben 表单 `Input` 仅在参数层 trim 时，输入框内空格仍可见且用户感知为「未生效」。
4. 工作台筛选区下拉被 CSS 锁死 170px，与普通 Input 不等宽。

## 核心逻辑变更

1. **仅 checkbox 选中：** `workbench-business-table.vue` 移除行 `@click` 触发的 `handleRowClick`；双击进编辑、委托单号链接、checkbox 勾选保留。
2. **Keyword 替代 MblNum：**
   - `GetWorkbenchFilterParams` 删除 `MblNum`，新增 `Keyword`。
   - `FilterModel.mblNum` → `keyword`；筛选栏 label「编号」，placeholder「主提单号/订舱编号/委托编号」。
   - `buildSeaExportFilterParams` 传 `Keyword`。
3. **TrimInput：** 新增 `adapter/component/trim-input.vue`（仿 `EnglishUpperInput`），在 `update:value` 时 `.trim()` 回写；注册为表单组件 `TrimInput`。以下「编号」字段改用 `TrimInput`：
   - `/sea-exports`（`sea-export-admin/data.ts`）
   - `/audit-approval/expense-review`（`audit-approval/data.ts`）
   - `/audit-approval/payment-review`（`payment-review/data.ts`）
   - 工作台海运出口筛选栏对 `keyword` 直接 trim（非 Vben 表单）。
4. **文案对齐：** 费用审核、付费审批查询「单号」改为「编号」，placeholder 统一为「主提单号/订舱编号/委托编号」。
5. **筛选下拉宽度：** `workbench-filter-bar` / `workbench-review-filter-bar` 中 `.ant-select` 由固定 170px 改为 `width: 100%`，与 Input 同列宽。

## 避坑指南

- 参数层 `normalizeQuery` 对 Keyword trim 只能保证请求干净，**不能**清掉输入框可见空格；编号检索要用 `TrimInput`（或等价在 `update:value` 时 trim）。
- 工作台 Count 与 PagedList 共用 `GetWorkbenchFilterParams`，改 Keyword 两边需一起改，勿只改列表。
- TrimInput 是逐次 `update:value` 去首尾空格，中间空格保留；适合编号检索，不适合允许首尾空格的自由文本。
