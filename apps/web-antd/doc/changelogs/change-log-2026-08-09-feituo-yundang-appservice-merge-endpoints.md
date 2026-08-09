# 2026-08-09 飞驼/云当外部对接服务合并导致接口地址变更

## 背景意图

后端把飞驼分散在 6 个 AppService、云当分散在 4 个 AppService 的对外接口，分别合并进 `FeituoAdminAppService` 与 `YundangAdminAppService`。ABP 动态 WebApi 的路由按 AppService 类名生成，**类名合并即地址变更**；方法名、入参、出参、权限点一个字都没改，前端只需要换地址前缀。

## 核心逻辑变更

- `api/schedule/feituo-schedule-admin.ts`：`API_PREFIX` 由 `/services/app/FeituoScheduleAdmin` 改为 `/services/app/FeituoAdmin`，`QueryScheduleAsync` 随之落到新地址。这是飞驼唯一已上线在用的接口。
- `api/yundang/yundang-air-admin.ts`：`BatchSubscribeAirBillAsync`、`GetAirPushInfoAsync` 两个地址由 `services/app/YundangAirAdmin/...` 改为 `services/app/YundangAdmin/...`。
- `api/yundang/yundang-admin.ts`：**未改动**。云当海运合并后类名仍是 `YundangAdminAppService`，`BatchSubscribeOceanBillAsync` / `GetOceanPushInfoAsync` 地址原样保留。

## 避坑指南

- **文件名与地址不再对应**：`yundang-air-admin.ts` 里请求的是 `YundangAdmin`（不带 Air），`feituo-schedule-admin.ts` 里请求的是 `FeituoAdmin`（不带 Schedule）。前端文件、命名空间 `YundangAirAdminApi` / `FeituoScheduleAdminApi` 均按业务域保留未改名，别照着文件名去反推后端服务名。
- 云当海运与空运现在同属一个后端服务但仍是两个前端 API 文件，改地址时注意别把海运的三个地址一起「顺手」改成不存在的 `YundangOceanAdmin`。
- 飞驼另外 5 个接口（集装箱订阅/查询、空运运单订阅/重订、港口拥堵）与云当 `ResubscribeAirBillAsync` / `ResubscribeOceanBillAsync` 前端尚未对接，后续新增时直接用合并后的 `FeituoAdmin` / `YundangAdmin` 前缀。
- 推送回调走的是 MVC Controller（`/api/feituo/increment-push`、`/api/yundang/air/push` 等）与中转站 `/relay/**`，地址不受本次合并影响，无需重新向服务商提交回调配置。
- 后端 `ProcessPushAsync` 拆成 `ProcessOceanPushAsync` / `ProcessAirPushAsync` 属内部方法改名，不对前端开放。
