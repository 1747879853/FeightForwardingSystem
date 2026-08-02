# 付费申请添加费用「排除」模式生效

## 背景意图

- TAPD #0631：添加费用抽屉「费用匹配 → 排除」查询未生效，选中排除后结果仍含对应费用。

## 核心逻辑变更

- `payment-application-admin.getOrderFeeGroupAsync`、`statement-admin.getOrderFeeGroup`：GET 数组参数改为 `paramsSerializer: 'repeat'`，使 ASP.NET Core 能绑定 `ExceptFeeCodeIds` / `FeeCodeIds`。
- `add-fee-modal` / `add-fee-statement-modal`：排除模式未选费用名称时阻断查询并提示；空数组不再当作费用条件上传。

## 避坑指南

- ASP.NET Core `[FromQuery] List` 需 `key=1&key=2`（repeat），勿用默认 brackets（`key[]=1`）。
- 「排除」未选费用名称时结果与无过滤相同，易被误判为按钮失效；前端已拦截并提示。
