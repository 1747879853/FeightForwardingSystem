# 海运出口基础信息 form.vue 模块化拆分（批次 1–6）

- 日期：2026-07-11
- 范围：`apps/web-antd/src/views/sea-export-admin/`
- 类型：Refactor（行为不变，仅代码组织调整）

## 背景意图

海运出口新建/编辑共用的 `form.vue` 长期膨胀到 6500+ 行，脚本区混杂了纯数据映射、服务项目纯计算、干系人面板状态、AI 识别编排等多个关注点，阅读与维护成本高。本次以「渐进式 composable/纯函数抽取」为主线（穿插子模块与样式分层），按批次小步提交、每批保证类型检查零新增错误，逐步把可独立的逻辑域迁出 `form.vue`。

## 核心逻辑变更

按批次抽出以下模块（均为纯迁移，调用点等价替换）：

| 批次 | 抽出文件 | 内容 |
| :-- | :-- | :-- |
| 1 | `sea-export-detail-mapper.ts` | 纯数据映射/清洗层：`flattenDetail`、`toDayjs`/`toDateString`、`sanitizeOrderCtns`/`sanitizeOrderUsers`、`toSelectedItems`/`toPortSelectedItems`、`normalizeOrderCtnsWithRowKey` 等，不依赖 Vue 响应式。 |
| 2 | `service-type-nodes.ts` | 服务项目纯逻辑层：类型/常量、节点构建 `buildServiceTypeNodes`、按 `sortId` 分组排序、必填/锁定字段映射、`getServicePipelineActiveSortId` 等无副作用计算。 |
| 3 | `use-order-users.ts` | 干系人（orderUsers）面板 composable：行状态、角色增删、用户详情懒加载、头像/状态展示、三套保存校验；模板面板仍在 `form.vue` 通过返回值渲染。 |
| 4 | `modules/ai-extract-utils.ts`（扩充）+ `use-sea-export-ai-recognize.ts`（新增） | AI 识别：字段白名单 `AI_RECOGNIZE_ALLOWED_FIELDS` 与规范化策略 `normalizeAiFieldValue` 下沉到纯工具层；识别→规范化→多表单回填/箱表/Select 回显/服务项联动的编排抽为 composable。 |
| 5 | `use-sea-export-submit.ts`（新增） | 保存提交域：`buildDto` 抽为纯函数 `buildSeaExportDto`（表单值→Add/Edit DTO，与 `flattenDetail` 反向映射）；`submitting`/多表单校验/编辑重建二次确认/新增编辑接口/脏检查快照（`syncFormSnapshot`/`isFormDirty`）抽为 `useSeaExportSubmit` composable。 |
| 6 | `form.css`（新增）+ `@vben/stylelint-config`（放宽） | 样式分层：近 1978 行 `<style scoped>` 原样外链为同目录 `form.css`，改用 `<style scoped src="./form.css">`（纯 CSS、无 `v-bind`，Vite `plugin-vue` 仍按 scoped 转换 `:deep()`）。同步为共享 stylelint 配置的 `.css`/`.scss` 补齐 `:deep`/`:global` 伪类放宽，避免外链样式误报。 |

批次 4 细节：`use-sea-export-ai-recognize` 通过 `deps` 接收 10 个子表单 API（`party/basic/shipment/port/cargoTypeInline/cargoMain/cargoMetrics/cargoRemark/cargoDg/cargoReefer`）与 `orderCtns`、`entrustReadonlyInfo`、`refreshEntrustReadonlyInfo`、`syncTabTitleFromValues`、`syncBasicInfoHeaderFields`、`isEdit`、`syncServiceTypesByPol`，返回 `{ aiRecognizing, handleAiFileChange }`。

批次 5 细节：`useSeaExportSubmit` 返回 `{ submitting, buildDto, handleSubmit, syncFormSnapshot, isFormDirty }`，供模板保存按钮与 `useSeaExportCopy`/`useYardRealQuery`/`useYundangOceanSubscribe` 复用。`handleSubmit` 改用 `collectCurrentFormValues()` 复用取值逻辑（与原内联 `getValues` 聚合等价），顺带消除原内联 `values` 对象的 `polId` 类型报错（`Record<string, any>`）。DTO 组装上下文（`orderCtns`/`serviceTypes`/`isEdit`/`editId`/`transportOrderId`）作为 `ctx` 传入纯函数。

`form.vue` 累计从 6581 行降至约 3191 行（脚本 + 模板；样式移至 `form.css`）。

## 避坑指南

- **DOM 触发留在页面**：隐藏 `<input type="file">` 的引用 `aiExtractFileInputRef` 与 `handleAiRecognize`（点击触发）保留在 `form.vue`。原因：Volar 会把 `@click`/`:loading`/`@change` 绑定计为「读取」，但模板 `ref="x"` 不计为读取——若把该 ref 放进 composable 且脚本内不再引用，会被 `noUnusedLocals` 误报未使用。composable 只负责「选中文件之后」的识别管线。
- **`AI_EXTRACT_ACCEPT` 仍由 `form.vue` 导入**：它只在模板 `:accept` 上使用，未随编排迁出。
- **`normalizeAiFieldValue` 依赖**：其位于 `ai-extract-utils.ts`，内部依赖 `toDayjs`（`../sea-export-detail-mapper`）与 `toEnglishUpperCase`（`#/utils/english-upper-case`），改动映射层时注意联动。
- **预存在类型错误**：`ai-extract-utils.ts` 中 `buildAiExtractFormPayload` 因 `dto.seaExport ?? {}` 回退产生的 `Property ... does not exist on type '{}'` 属历史遗留，非本次引入；已用 `git stash` 基线对比确认 form.vue/ai-extract-utils 错误集与批次前完全一致（15 + 21 条），无新增。
- **纯迁移不改行为**：所有抽取均保持调用语义等价，未修改 DTO 结构、校验规则与提交链路；`buildDto` 上下文以 `ctx` 显式传入纯函数，`handleSubmit` 复用 `collectCurrentFormValues`。
- **外链 scoped 样式的 lint 约束**：该仓库 stylelint 原先仅对 `.vue`/`.html` 放宽 `:deep`/`:global`，独立 `.css`/`.scss` 会报 `selector-pseudo-*-no-unknown`；批次 6 已为共享配置补齐 `.css`/`.scss` 放宽。若后续新增外链 scoped 样式文件（含 `:deep()`），无需再改配置。
- **收尾待续**：打印/Tab/布局同步/导航等零散小块可按需继续抽取，非阻塞。
- **提交域跨 composable 依赖**：`useSeaExportSubmit` 返回的 `handleSubmit`/`isFormDirty` 被 `applyServiceTypeModalDraftAndSave` 与复制/场站/运踪等 composable 消费；调用点位于这些 composable 之前，运行时（用户交互）取值不受声明顺序影响。
