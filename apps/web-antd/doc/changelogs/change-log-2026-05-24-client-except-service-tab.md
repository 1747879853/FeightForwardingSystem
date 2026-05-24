# 客户编辑页对接委托单位排除服务项目

## 背景意图

后端提供 `ClientExceptServiceAdmin` 接口，用于委托单位客户按起运港排除海运出口服务项。客户编辑页需新增 Tab，便于在维护客户资料时同步配置排除项。

## 核心逻辑变更

1. 新增 `client-except-service-admin.ts`，封装 `GetClientExceptServicesAsync` 与 `EditClientExceptServicesAsync`。
2. 客户编辑页 `/clients/:id/edit` 增加「海运出口服务项目」Tab，组件路径 `views/client/except-service`。
3. 进入 Tab 时校验客户 `industryCategories` 是否含 `p`（委托单位）；不满足时展示提示，不请求配置接口。
4. 按起运港分组展示全局服务项配置，开关表示是否启用（`isChecked`）；保存时仅提交 `isChecked=false` 的 `serviceType` 至 `poLs`。
5. 补充 `seaExport.client.exceptService` 中英文文案。

## 避坑指南

- `isChecked=true` 表示启用，`false` 表示排除；保存 payload 中的 `serviceTypes` 是**排除**列表，勿与启用状态混淆。
- `industryCategories` 为字符拼接串（如 `ap`），判断委托单位用 `includes('p')`，与基础信息表单拆分逻辑一致。
- 若某港口无需排除任何服务项，保存时不传该港口；传空 `poLs` 会清空该客户全部排除记录。
