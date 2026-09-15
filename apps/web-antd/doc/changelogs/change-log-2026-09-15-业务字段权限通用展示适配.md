# 业务字段权限通用展示适配

## 背景意图

后端以模块 DTO 为单位移除响应字段，业务页面此前主要显示空值。本次只改前端，补齐海出、海进、空出、费用／更改单、运价的展示控制；客户、空进、业务联系单和付费申请的后端能力不在本次范围内。

## 核心逻辑变更

- `composables/field-permission.ts`：统一按原始 JSON 键结构判断屏蔽，支持嵌套模块、字段别名、组合筛选、组合表单控件与动态列前缀。
- `field-permission-profiles.ts`：集中声明页面字段到 DTO 的路径。委托编号属于 `transportOrder.commissionNum`，共享对象内部字段归属整个对象；选择器同时考虑 ID 和展示对象。
- `use-field-permission.ts`：显式选择配置后取得 Vben 表单、VXE 表格包装函数。无条件规则过滤列和筛选；条件规则依据原始键缺失显示 `***` 或移除表单项；保留可见单元格的具名插槽、格式化和自定义渲染器。
- 动态 `setGridOptions` 更新再次过滤，保持原始列集合以便权限解除后恢复。费用 Handsontable 同步过滤无条件列、屏蔽格只读、拦截粘贴和拖填，保存时跳过屏蔽字段。
- 原始权限快照只保存键结构，与可编辑模型分离，避免默认值补齐导致误判；使用 Symbol 携带的费用快照不进入 JSON。
- 基础信息中的箱量、业务人员、委托编号等独立区域补充显隐；隐藏集合不参加对应的前端必填校验。船名／航次、件数／包装等合并控件任一来源受限时隐藏整个控件。
- 运价列表统一复用共享规则缓存，补充条件单元格、筛选和编辑表单控制；批量新增列也过滤无条件规则。
- 权限配置保存／删除后刷新共享缓存；退出登录清理规则，并拒绝旧会话异步请求写回。

## 扩展方式

1. 增加 `FieldPermissionProfile`，声明根模块、直接嵌套 DTO 模块和字段来源。
2. 页面调用 `useFieldPermission(profile)`，用其 `usePermissionForm`／`usePermissionGrid` 替换本地同类入口。
3. 编辑详情返回后，在任何扁平化或默认值补齐之前设置 `rawDetail.value = capturePermissionRow(detail)`；新建或切换记录时清空。
4. 非 schema 区域用 `masked(field, rawDetail)` 控制。其他表格组件使用同一核心判断器，在原始数据进入转换前保存键结构，并处理编辑／粘贴／提交入口。
5. 新模块后端必须已有输出屏蔽和编辑防覆盖；仅增加前端配置不能替代后端支持。

## 避坑指南

- 不依据值是否为空判断权限；`null`、空串、零值及已有的 `undefined` key 均与缺 key 不同。
- 条件规则不隐藏整列和筛选项；组合关键词所有来源都无条件受限时才隐藏。
- `***` 只用于渲染，不写入表单值或提交 DTO。
- API 字段 PascalCase 与 JSON camelCase 不同，按不区分大小写的规则索引匹配；JSON 路径仍按实际对象层次声明。
- 批量编辑的服务端跳过规则继续由后端执行；前端不会自行求值后端条件树。
- 原有报表多业务线聚合规则保持独立，继续处理所有来源都受限才隐藏整列的情形。
- `usePermissionGrid` 不可在 setup 立刻调用 `gridApi.formApi.setState`：`formApi` 要等表格 `onMounted` 才挂上。应改 `formOptions.schema`，并对 `formApi.setState` 做可选调用。见 [列表字段权限不再在挂载前调用空 formApi](./change-log-2026-09-15-field-permission-grid-form-api.md)。

## 验证

- 命令：`pnpm exec vitest run --config apps/web-antd/vitest.field-permission.config.ts`，15 项通过。
- 修改的 14 个 Vue 文件通过 Vue 脚本与模板编译。
- 全项目类型检查仍报告既有错误，不能宣称整仓类型检查通过；本次新增权限文件已单独核对诊断。
- 未进行登录后的浏览器端到端验收，需使用实际条件规则验证列表、编辑保存与批量场景。
