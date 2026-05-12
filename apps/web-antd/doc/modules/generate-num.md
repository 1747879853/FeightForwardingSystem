# GenerateNum（编号生成）模块活文档

## 模块定位

- 模块名称：编号生成（GenerateNumAdmin）。
- 业务作用：为业务单据配置可组合编号规则，支持按组织、按用户或全局默认生效。
- 路由入口：`/basic-data/generate-num`
- 权限：`Admin.GenerateNum`

## 页面与代码位置

- 列表页：`apps/web-antd/src/views/system/basic-data/GenerateNumAdmin/list.vue`
- 表单与规则明细：`apps/web-antd/src/views/system/basic-data/GenerateNumAdmin/modules/form.vue`
- 表格/表单 schema：`apps/web-antd/src/views/system/basic-data/GenerateNumAdmin/data.ts`
- API：`apps/web-antd/src/api/system/base-data/generate-num-admin.ts`

## 核心数据结构

- 主表字段：
  - `name`：规则名称（必填）
  - `tableName`：目标表（或表+字段）名称（必填）
  - `orgId`：适用组织（与适用用户互斥）
  - `generateNumUsers[]`：适用用户数组（与组织互斥）
- 子表规则 `generateNumRules[]`：
  - `generateEnum`：规则类型（0=AutoNum, 1=Text, 2=UserName, 3=yyyyMMdd, 4=yyMMdd）
  - `text`：固定文本（仅 `generateEnum=1` 使用）
  - `length`：该段长度
  - `reset`：规则文本变化后是否重置流水号
  - `sortId`：拼接顺序（小到大）

## 前端已实现的关键校验

- 适用范围采用“二选一独立录入”：
  - 先选 `applyScope`（不限制 / 指定组织 / 指定用户）。
  - 组织与用户输入控件按范围单独显示，不再并行录入。
- 组织与适用用户互斥：不能同时设置。
- 子表规则不能为空。
- `AutoNum` 类型数量不可超过 1 条。
- 每条规则必须有 `generateEnum` 且 `length > 0`。
- `Text` 类型规则要求 `text` 非空。

## 后端匹配优先级（前端认知）

1. 用户精确匹配（命中 `generateNumUsers`）。
2. 组织逐级回溯匹配（从直属组织向上）。
3. 全局默认规则（`orgId` 为空且无适用用户）。

## 注意事项

- 编辑时子表和适用用户都按 `id > 0` 视为更新，未回传项由后端删除。
- `reset=true` 常用于日期段变化触发重置，例如按天流水号。
- 查询分页参数使用 `skipCount/maxResultCount`，页面内部已做页码换算。
- 适用用户下拉复用公共分页组件，已兼容 `totalCount` 返回格式，加载完全部数据后不会继续触发滚动分页请求。
