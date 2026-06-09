# 工作台海运出口服务切换 Count + PagedList 接口

**日期：** 2026-06-09  
**变更类型：** Refactor  
**影响模块：** 驾驶舱 / 工作台（海运出口服务）

---

## 背景意图

后端将工作台海运出口任务查询拆为两层接口：`GetWorkbenchCountAsync`（起运港 + 服务项数量统计）与 `GetWorkbenchPagedListAsync`（指定起运港与服务项下的分页任务列表）。原 `GetPagedListAsync` 一次返回全量嵌套数据，在任务量增大时性能与可维护性不足。

---

## 核心逻辑变更

### 1) SeServiceTaskAdmin API 层

- 删除 `getSeServiceTaskPagedList`、`getSeServiceTaskWorkbenchList` 及旧嵌套 DTO
- 新增 `getSeServiceTaskWorkbenchCount`、`getSeServiceTaskWorkbenchPagedList`
- 筛选参数统一 PascalCase（`ETDStart`/`ETDEnd`/`ServiceTaskStatus` 等），ETD 传 ISO 闭区间

### 2) 工作台页面两层加载

- 进入 / 查询 / 切换处理状态：先 Count 渲染港口 Tab 与服务项 Chevron，再 PagedList 拉当前节点任务
- 切换起运港：额外拉 `SeServiceConfigAdmin` 详情获取 `seServiceShows` 与 `sortId`（按 `polId` 缓存）
- 切换服务项 / 翻页：仅调 PagedList
- 服务端分页：默认 20 条，可选 10/20/50
- 移除前端 `filterGroups` / `matchTask` 二次过滤

### 3) 服务项节点规则

- 配置项按 `sortId` 排序，`count = 0` 隐藏
- 指派任务（`serviceType = null`）追加末尾，动态列关闭，仅固定列
- 转交/完成/编辑页返回：刷新 Count + 当前页，保持选中上下文；空页自动回退

### 4) 编辑页返回刷新

- `sea-export-admin/form.vue` 保存时 `markListShouldRefresh('Workspace')`
- 工作台接入 `useRefreshListOnFormReturn('Workspace', ...)`

---

## 避坑指南

- Count 与 PagedList 必须共用同一套筛选参数，不可再在前端二次过滤
- 指派任务查 PagedList 时**不传** `ServiceType`
- 动态列依赖港口服务配置详情，非 Count/PagedList 响应字段
