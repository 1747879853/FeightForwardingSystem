# 海运出口新建：委托单位已选仍提示必选

## 背景意图

新建页 `/sea-exports/create` 中，用户已在「基础信息」区选择委托单位后点击保存，表单项仍提示「请选择委托单位」，导致无法提交。界面显示有选中值，但 `basicInfoFormApi.validate()` 判定 `clientId` 为空。

## 核心逻辑变更

1. **根因**（`src/views/sea-export-admin/form.vue`）
   - `bindServiceTypeLinkageEvents()` 曾为 `clientId`、`polId` 在 `componentProps` 上绑定 `onUpdate:modelValue` 做服务项目联动。
   - 该写法与 Vben Form 内部对 `ClientSelect` / `PortSelect` 的 `v-model`（`baseModelPropName: value`）更新链冲突，可能拦截或覆盖字段写入，表单模型未同步选中值。

2. **修复**
   - 联动监听改为 Ant Design Vue `Select` 的 `onChange`，仅触发 `queueSyncServiceTypesByPol`，不再占用 `update:modelValue`。
   - 委托单位必填校验（`data.ts` 中 `rules: 'selectRequired'`）可正常读到用户选择。

3. **关联能力（同批提交）**
   - 委托单位 + 起运港调用 `GetServiceTypesByPOLAsync` 自动勾选服务项目，见 [海运出口表单委托客户与起运港联动服务项目](./change-log-2026-05-25-sea-export-service-types-by-pol-linkage.md)。

## 避坑指南

- **自定义业务组件联动**：在 `useVbenForm` 的 `updateSchema` 里追加监听时，优先用 `onChange` / `onBlur` 等组件原生事件，避免再绑 `onUpdate:modelValue`。
- **排查方式**：保存前在控制台执行 `basicInfoFormApi.getValues()`，若 `clientId` 为空而 UI 有回显，即属模型未同步而非校验规则写错。
- **客户 ID 类型**：`ClientSelect` 的 `id` 为字符串，大数场景勿 `Number()` 转换；`selectRequired` 仅判 `undefined`/`null`，空字符串 `''` 仍可能失败，清空时用 `allowClear` 即可。
