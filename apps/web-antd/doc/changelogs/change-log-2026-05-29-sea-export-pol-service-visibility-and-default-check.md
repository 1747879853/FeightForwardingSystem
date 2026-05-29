# 海运出口服务项目按起运港隐藏卡片并分离默认勾选查询

## 背景意图

海运出口新建/编辑页的服务项目此前只按一次接口结果做勾选同步，导致“可用服务范围”和“客户默认勾选”语义混在一起。业务要求是：

- 仅传 `polId`：用于判断起运港配置了哪些服务（决定卡片是否显示）；
- 传 `polId + clientId`：用于计算当前委托单位默认勾选哪些服务；
- 起运港未配置的服务卡片应直接隐藏，避免误选和无效录入。

## 核心逻辑变更

1. **联动查询拆分为双请求（同轮并发）**
   - 文件：`apps/web-antd/src/views/sea-export-admin/form.vue`
   - `syncServiceTypesByPol` 改为并发请求：
     - `getServiceTypesByPOL({ polId })`：提取可见服务集合；
     - `getServiceTypesByPOL({ polId, clientId })`：提取默认勾选集合。
   - 二者分别映射到 `visible` 与 `checked` 状态，不再混用 `checked` 语义。

2. **服务卡片按起运港配置动态隐藏**
   - 新增 `serviceItemVisibleValues` 与 `visibleServiceItemFields`。
   - 模板层 `v-for` 改为遍历 `visibleServiceItemFields`，未配置服务不渲染卡片。
   - 栅格列数改为按可见卡片数量动态计算，避免空列占位。

3. **编辑页回填时强制按当前组合重算**
   - 详情加载完成后，执行 `syncServiceTypesByPol({ polId, clientId, force: true })`。
   - 保证编辑态进入页面即与“当前起运港配置 + 客户默认规则”一致。

4. **无起运港时状态兜底**
   - `polId` 为空时清空服务勾选与已选服务商，避免残留旧状态。
   - 代收支仍保持现有开关策略，不影响当前隐藏逻辑。

## 避坑指南

- **不要把两种查询混为一谈**：`polId` 查询结果用于“显示范围”，`polId+clientId` 查询结果用于“默认勾选”。
- **编辑回填不要只信详情里的旧勾选**：必须以当前起运港配置重算一次，否则会出现历史脏状态。
- **隐藏即不可编辑**：服务卡片被隐藏时应同步清空对应服务商选择，避免提交无效字段。
- **接口命名注意 Async 后缀**：前端实际调用路径为 `GetServiceTypesByPOLAsync`。
