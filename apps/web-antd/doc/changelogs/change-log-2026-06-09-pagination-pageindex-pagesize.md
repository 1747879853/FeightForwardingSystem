# 分页请求参数改为 pageIndex / pageSize

**日期：** 2026-06-09  
**变更类型：** Fix  
**影响模块：** 工作台、系统权限（字段权限）

---

## 背景意图

后端分页接口统一由偏移量模式（`skipCount` + `maxResultCount`）改为页码模式（`pageIndex` + `pageSize`），`pageIndex` 从 1 开始，前端需同步对接。

---

## 核心逻辑变更

### 1) 工作台海运出口 PagedList

- `GetWorkbenchPagedListAsync` 请求参数：`SkipCount`/`MaxResultCount` → `PageIndex`/`PageSize`
- 分页器 `current` 直接作为 `PageIndex` 传递，不再计算偏移量
- 响应 `currentPage` 回写分页器当前页

### 2) 字段权限列表

- `UserPropPermissionAdmin/GetPagedListAsync`：`skipCount`/`maxResultCount` → `pageIndex`/`pageSize`

### 3) 已确认无需改动

- 枚举 `EnumerationAdmin/GetPagedListAsync`：已使用 `PageIndex`/`PageSize`
- 港口 `PortCodeAdmin/GetPagedListAsync`：已使用 `PageIndex`/`PageSize`（含 `port-select`）

---

## 避坑指南

- 勿再传 `skipCount = (current - 1) * pageSize`，直接传 `pageIndex = current`
- 响应中 `skipCount`/`maxResultCount` 仍可能返回，一般无需读取；优先用 `currentPage`/`totalCount`
