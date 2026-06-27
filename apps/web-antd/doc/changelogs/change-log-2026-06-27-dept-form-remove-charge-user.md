# 组织管理弹窗移除负责人字段

## 背景意图

组织新增/编辑弹窗不再维护「负责人」，负责人改由成员列表中的「负责人」标识管理，避免两处维护口径不一致。

## 核心逻辑变更

- `src/views/system/dept/data.ts`：从 `useSchema()` 中移除 `chargeUserId`（`UserSelect`）表单项。
- `src/views/system/dept/modules/form.vue`：`mapDtoToFormValues` 与 `collectSubmitData` 不再读写 `chargeUserId`。
- `src/views/system/dept/list.vue`：组织详情移除「负责人」展示；成员列表移除「负责人」列。

## 避坑指南

- 接口 DTO 中 `chargeUserId`、`chargeUserNickName`、`isBoss` 字段仍可能存在，仅前端不再展示。
- 编辑保存时不会主动清空后端已有负责人数据。
