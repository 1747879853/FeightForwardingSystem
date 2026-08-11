# 商品信息移除法定计量单位字段

## 背景意图

商品信息（CodeGoods）维护表单中的 `ruleUnit1`（法定第一计量单位）、`ruleUnit2`（法定第二计量单位）已不再使用，需从前端类型、表单、提交/回填与文案中完整移除，仅保留 `ruleUnit`（申报计量单位）。

## 核心逻辑变更

1. **API 类型**：`CodeGoodsAddDto` / `CodeGoodsEditDto` / `CodeGoodsDto` 删除 `ruleUnit1`、`ruleUnit2`。
2. **表单**：`useFormSchema` 去掉两字段；`form.vue` 新增/编辑提交与详情回填不再读写这两项。
3. **国际化**：中英文 `system.basicData.codeGoods` 删除对应文案键。

## 避坑指南

- 列表列本身未展示这两字段，无需改 `useColumns`。
- 若后端仍返回旧字段可忽略；前端不应再提交，避免把空值覆盖后端历史数据（若后端仍持久化）。
