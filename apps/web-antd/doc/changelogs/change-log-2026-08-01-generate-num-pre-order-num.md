# 编号规则新增业务联系单编号

## 背景意图

业务联系单（PreOrder）新增后需支持独立编号策略。编号规则配置页的表名下拉需增加 `PreOrder.PreOrderNum`，以便按组织/用户范围配置业务联系单编号生成规则。

## 核心逻辑变更

- `GenerateNumAdmin/data.ts`：`TABLE_NAME_VALUES` 新增 `PreOrder.PreOrderNum`。
- `locales/zh-CN/system.json`：新增文案「业务联系单编号」。
- `locales/en-US/system.json`：新增文案 `Business Contact Form No.`。

## 避坑指南

- 表名值格式必须为 `Entity.Field`，与后端 `GenerateNumAsync` 约定一致。
- 前端仅提供可选项；后端需已注册 `PreOrder.PreOrderNum` 后，业务联系单创建时生成编号才会生效。
