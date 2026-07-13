# 海运出口编辑页服务项目：重接 POL 联动 + 已完成锁定字段 + 保存重建确认

**修改时间：** 2026-07-11

## 背景意图

上一轮（2026-07-10）将编辑页服务项目与 POL 配置完全解耦，编辑态仅只读详情 `seaExportServices`，导致：

1. 改起运港 / 委托单位后，勾选仍是旧港服务项，保存易触发后端「服务项目包含未配置的项」；
2. 配置弹窗只能取消勾选、无法新增当前港新出现的服务项；
3. 拿不到港口配置的 `seServiceLocks`，已完成任务锁定的字段前端仍可编辑，保存被后端静默覆盖，用户误以为改成功；
4. 编辑态缺少服务项对应 `userAttribute` 的责任角色预校验。

本轮按对接文档重新对齐后端「何时重建服务任务」的语义（`polId` 变或 `serviceType` 集合变即重建），并补齐锁定字段只读与保存前预校验。

## 核心逻辑变更（`src/views/sea-export-admin/form.vue`）

1. **重接 POL 联动（进页仅作元数据）**：
   - 移除 `syncServiceTypesByPol` / `queueSyncServiceTypesByPol` 的 `isEdit` 短路；改用 `suppressServiceTypeLinkage` 标志，仅在 `loadEditData` 回填期间抑制联动，避免 `setValues` 误触发重写。
   - 新增 `applyServiceTypeStateForEditInitial`：编辑首屏拉取 `GetServiceTypesByPOLAsync`（按 `polId`）作为**元数据**（`sortId` / `userAttribute` / `seServiceLocks` / `seServiceRequires`），**勾选与任务进度仍以详情为准**；港口配置缺失的历史服务项照常保留。
   - 删除已废弃的 `applyServiceTypeStateFromDetail` / `buildServiceTypeNodesFromDetail`。
2. **改起运港 / 改委托单位 → 按新配置重写勾选**：
   - 编辑态改 `polId` 或 `clientId` 走与新建一致的 `applyServiceTypeStateByPol`：勾选按 `polId(+clientId)` 的 `checked` 默认重写（客户排除项默认不勾，可手动勾回），**丢弃任务进度**，流水线回到「新建态」仅展示服务项、不展示待处理/已完成任务。
3. **已完成任务锁定字段只读**：
   - 新增 `getServiceLockedFieldNames`（取所有**已处理**任务对应服务项的 `seServiceLocks` 并集）与 `applyServiceLockedFields`（按 `SeaExportPropEnum → 字段名` 映射，广播 `disabled` 到基础/船期/港口三表单；`updateSchema` 深合并且对非本表单字段无操作）。
4. **保存时重建二次确认（唯一确认时机）**：
   - `handleSubmit` 编辑分支：当 `polId` 相对详情变、或勾选 `serviceType` 集合相对详情变，**且详情已存在任意服务任务**时，弹 `confirmServiceTaskRebuild`（清空进度并重新生成），取消则中止保存。
   - 配置弹窗 `handleServiceTypeModalConfirm` 编辑态确定后直接应用勾选并调 `handleSubmit`，重建确认统一由保存流程处理（移除弹窗内旧的自带确认）。
5. **OrderUser 预校验**：编辑态 `latestAvailableServiceTypes` 现为 POL 配置（带 `userAttribute`），复用既有 `validateServiceBoundOrderUsers`，保存前即按勾选服务项校验责任角色。

## 避坑指南

- **重建判定只看 `polId` 与 `serviceType` 集合**，与顺序、前端 `sortId` 无关；`sortId` 仍以港口配置为准，前端传了后端忽略。
- 锁定字段虽 `disabled`，`getValues` 仍返回其值并进 DTO，后端会用库值覆盖；前端只读只为避免误操作。
- 改港/改客户后未保存时流水线是「预览态」，无任务信息、不可点完成；保存成功 `loadEditData` 后才恢复真实任务态。
- 复制（`CopyAsync`）不特判：复制的是已保存且已校验数据，走后端既有生成逻辑。
- 新建页逻辑本轮不变；工作台完成/取消完成链路本轮不改。
