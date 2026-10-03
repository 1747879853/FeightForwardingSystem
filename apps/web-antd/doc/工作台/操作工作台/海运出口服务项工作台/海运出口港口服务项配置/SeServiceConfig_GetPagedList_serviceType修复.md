# SeServiceConfigAdmin/GetPagedListAsync — serviceType 筛选修复

**接口：** `GET /api/services/app/SeServiceConfigAdmin/GetPagedListAsync?serviceType=4`

**文件：** `App/SeServiceConfig/SeServiceConfigAdminAppService.cs` → `GetPagedListAsync`

---

## 问题

1. **筛选不准/不生效**：传 `serviceType` 后，命中主配置不对，或该命中的没返回。
2. **前端看起来像没筛**：主配置筛对了，但 `seServiceConfigItems` 仍返回该港口下全部服务项，列表仍显示其他 type。

## 根因（简述）

- `Include(SeServiceConfigItems)` 写在 `Where` 前，和 `SeServiceConfigItems.Any(...)` 筛选耦合，EF 翻译不稳定。
- 已有 `_seServiceConfigItemRepository` 却没用，靠导航 `Any` + 手写 `!item.IsDeleted`（与 ABP 全局软删重复）。
- 映射 DTO 时未按 `input.ServiceType` 过滤子项。

## 修复要求

1. 主表先 `Where`（含 serviceType），`Count`/`Skip`/`Take` 后再 `Include`。
2. `serviceType` 筛选改用 `_seServiceConfigItemRepository.GetAll().Where(ServiceType).Select(SeServiceConfigId)` + `Contains`。
3. 去掉筛选条件里的 `!item.IsDeleted`（交给全局过滤器）。
4. 传了 `serviceType` 时，`seServiceConfigItems` / `serviceTypes` / `serviceItemCount` 只返回匹配子项；未传时行为不变。

## 验收

- `serviceType=4` 只返回含未删除 type=4 子项的主配置。
- 返回的子项列表里只有 type=4，不出现其他 type。
- `totalCount` 仍按主配置计数。
