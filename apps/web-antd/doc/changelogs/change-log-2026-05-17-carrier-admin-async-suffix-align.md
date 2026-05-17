# 变更记录：CarrierAdmin 接口恢复 Async 后缀

## 背景意图

- 船公司模块后端实际路由仍采用 `Async` 后缀命名。
- 前端上一轮对接时将 `CarrierAdmin` 路径改为无后缀版本，会导致接口 404 或路由不匹配。

## 核心技术决策/逻辑变更

- 仅调整 `src/api/system/base-data/carrier-admin.ts` 的接口路径命名：
  - `GetPagedListAsync`
  - `DetailAsync`
  - `AddAsync`
  - `EditAsync`
  - `DeleteAsync`
- 保留本次 `logo` 字段及参数结构（`PageIndex/PageSize`、`logo.attachmentId`）不变，仅修正路由后缀。

## 避坑指南（Gotchas & Constraints）

- 该模块接口升级时，字段协议和路由命名是两个独立维度，不能因为 DTO 已更新而默认路由也去掉 `Async`。
- 若后续再调整后端路由命名，建议先以 Swagger 或网关实际路径为准，再统一修改前端 API 层。
