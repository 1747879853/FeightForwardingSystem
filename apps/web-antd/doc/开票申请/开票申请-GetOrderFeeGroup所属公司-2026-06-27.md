---
title: GetOrderFeeGroupAsync 返回业务所属公司
module: 开票申请
author: auto-doc-sync
last_updated: 2026-06-27
---

# 1. 背景意图 (Background)

开票申请加费用时调用 `InvoiceApplicationAdminAppService.GetOrderFeeGroupAsync`，返回分组内的 `TransportOrderSimpleDto` 此前缺少**所属公司**信息，前端无法展示业务归属公司。本次通过既有 `SetDataPermissionPropsAsync` 机制，按 `TransportOrder.UserId` 解析并回填 `companys`（及 `organizationUnits`）。

# 2. 核心逻辑变更 (Core Logic)

涉及文件：

- `src/CsprojBuilder.Application/App/TransportOrder/Dto/TransportOrderDto.cs`
- `src/CsprojBuilder.Application/App/InvoiceApplication/InvoiceApplicationAdminAppService.cs`
- `文档/开票申请/开票申请.md`

## 2.1 DTO 基类调整

`TransportOrderSimpleDto` 基类由 `AuditedEntityDto<Guid>` 改为 `DataPermissionFullAuditedEntityDto<Guid>`，继承：

- `userId`：业务所属用户
- `organizationUnits`：所属组织
- `companys`：所属公司（取第一个即可）

## 2.2 接口赋值逻辑

`GetOrderFeeGroupAsync` 组装 `TransportOrderSimpleDto` 时：

1. 手动赋值 `UserId = to.UserId`
2. 分页结果组装完成后，批量调用 `SetDataPermissionPropsAsync<TransportOrderSimpleDto, Guid>(...)` 填充组织与公司

# 3. 避坑指南 (Pitfalls)

- **`companys` 为列表**：与系统其它数据权限 DTO 一致，前端展示所属公司时取 `companys[0]` 即可。
- **依赖用户组织缓存**：`SetDataPermissionPropsAsync` 走 `GetAllUsersWithOrganizationInfoAsync` 缓存，用户组织变更后需确保缓存已刷新。
- **仅本接口显式调用**：其它仍手动 new `TransportOrderSimpleDto` 的接口若也需要所属公司，需同样赋值 `UserId` 并调用 `SetDataPermissionPropsAsync`。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-06-27 | `Feature` | `GetOrderFeeGroupAsync` 的 `transportOrder` 新增返回 `companys`（所属公司） | `TransportOrderSimpleDto` 改继承 `DataPermissionFullAuditedEntityDto`；接口内赋值 `UserId` 后批量 `SetDataPermissionPropsAsync` |
