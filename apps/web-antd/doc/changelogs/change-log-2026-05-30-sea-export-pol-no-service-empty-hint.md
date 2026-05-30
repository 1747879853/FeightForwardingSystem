# 海运出口起运港未配置服务项目空态提示

## 背景意图

海运出口新建/编辑页在选择起运港后，若该港口在「港口服务项配置」中未维护任何服务项，服务项目区域此前会渲染为空白，用户无法感知是「尚未加载」还是「确实未配置」。需在联动查询完成后给出明确提示，引导管理员维护基础资料。

## 核心逻辑变更

1. **新增空态判定**
   - 文件：`apps/web-antd/src/views/sea-export-admin/form.vue`
   - 新增 `polHasNoServiceConfig` 计算属性：起运港已选、联动查询已完成、且可见服务卡片（含代收支）均为空时成立。

2. **联动加载态**
   - 新增 `serviceTypeSyncLoading`，在 `syncServiceTypesByPol` 请求期间展示 Spin，避免查询未完成时误显示空态。

3. **UI 表现**
   - 空态时使用一行紧凑文案（12px 灰色提示），替代 `Empty` 大组件。
   - 未选起运港时提示「请先选择起运港」，不渲染任何服务节点。
   - 有配置时保持原有服务节点管道与服务商卡片渲染逻辑不变。

4. **可见性口径收紧**
   - 初始态与起运港清空时，所有服务卡片 `visible=false`，不再默认展示全部服务项。
   - `getServiceItemVisible` 改为仅 `=== true` 时可见，确保新建页展示内容与顺序完全来自起运港配置回显。

## 避坑指南

- **空态仅在查询成功后判定**：须等 `polServiceConfigLoaded` 为 true，避免与 loading 态冲突。
- **未选起运港不展示空态**：`linkedPolId` 为空时提示「请先选择起运港」，且不渲染服务节点。
- **可见性仅来自起运港配置**：禁止默认展示全部服务卡片；清空起运港后同步隐藏。
- **代收支纳入判定**：若后续开启 `SHOW_COLLECTION_PAYMENT_FIELD`，需同时检查 `collectionPaymentConfigured`。
