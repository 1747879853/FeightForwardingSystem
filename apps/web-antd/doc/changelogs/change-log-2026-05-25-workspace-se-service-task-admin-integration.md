# 工作台海运出口服务任务对接 SeServiceTaskAdmin

**日期：** 2026-05-25  
**变更类型：** Feature  
**影响模块：** 驾驶舱 / 工作台（海运出口服务）

---

## 背景意图

工作台页面原先仅使用本地 mock 数据展示，无法承载真实任务流转。为满足海运出口服务工作台的实际操作需求，本次将页面与 `SeServiceTaskAdmin` 接口对接，打通以下核心闭环：

1. 工作台查询（按待处理/已处理与筛选条件联动）
2. 按起运港与服务项分组展示任务
3. 批量转交任务
4. 任务完成（单条与批量）

同时按业务确认保留“紧急处理任务”和“异常业务”两个区块的 mock 展示，不纳入本次接口改造范围。

---

## 核心逻辑变更

### 1) 新增 SeServiceTaskAdmin API 封装

新增文件：`src/api/sea-export/se-service-task-admin.ts`

- 对接接口：
  - `GetPagedListAsync`
  - `GetWorkbenchListAsync`
  - `TransferAsync`
  - `CompleteAsync`
- 新增完整 DTO 定义（任务、任务处理人、配置分组、工作台分组）
- `serviceTaskStatus`、`assigneeUserId`、`seaExport` 等关键字段已在类型层落地

### 2) 工作台页面从 mock 改为真实数据驱动

变更文件：`src/views/dashboard/workspace/index.vue`

- 通过 `GetWorkbenchListAsync` 拉取“指派 + 非指派”合并任务
- 按 `SeServiceConfig` 组装起运港切换头部（Badge 显示任务数）
- 按 `SeServiceConfigItem` 组装服务项流程节点，并在节点下展示任务明细
- 筛选条件联动接口参数：
  - ETD 区间
  - 客户
  - 船公司
  - MBL
  - POD
  - 处理状态（待处理/已处理）
- 新增转交弹窗，使用 `UserSelect` 全量用户作为被转交人
- 新增完成确认逻辑，支持单条与批量完成（内部逐条调用 `CompleteAsync`）

### 3) 服务项枚举映射与数据结构升级

变更文件：`src/views/dashboard/workspace/workbench-data.ts`

- 新增 `ServiceType` 文本映射（依据 Swagger 枚举）：
  - 0=订舱，1=拖车，2=报关，3=仓库，4=保险，5=代收支
- 增加 `serviceTypeLabel`、`toPortTab` 等映射工具
- 扩展 `BusinessRow` 与 `FilterModel`，承载真实任务字段与筛选参数
- 顶部 Tab 调整为三大入口：
  - 海运出口服务
  - 应收应付审核
  - 付费申请审核

### 4) 筛选栏与任务列表组件改造

变更文件：

- `src/views/dashboard/workspace/workbench/components/workbench-filter-bar.vue`
- `src/views/dashboard/workspace/workbench/components/workbench-business-table.vue`

关键点：

- 筛选栏改为业务下拉组件（`ClientSelect`/`CarrierSelect`/`PortSelect`）+ ETD 区间
- 任务列表新增“批量转交 / 批量完成 / 刷新”操作
- 行内新增“完成 / 转交”操作按钮
- 列表展示补充“处理人 / 被转交人”信息
- 空数据态与 loading 状态补齐

---

## 避坑指南

1. `GetWorkbenchListAsync` 返回的“指派任务汇总项”其 `serviceType` 可能为空，前端必须做空值分支处理（当前映射为“指派任务”）。
2. `CompleteAsync` 为单条接口，批量完成需要前端逐条调用。
3. ETD 过滤在页面中允许 `[string, string]` 与 `[Dayjs, Dayjs]` 两种结构，发请求前统一转 ISO 字符串。
4. `UserSelect` 当前按“全量用户”选择转交人，未叠加服务项属性过滤（符合本次业务确认）。
