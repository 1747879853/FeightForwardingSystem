# 解析日志：海运出口服务项目枚举驱动 + 执行方独立改造

> 日期：2026-06-07  
> 范围：`apps/web-antd/src/views/sea-export-admin/form.vue` + `service-type.ts`  
> 方法：grill-with-docs 逐层追问，共 11 个决策点

---

## 背景问题

### 当前桥接层（字段驱动）痛点

| 问题 | 代码位置 |
| --- | --- |
| `SERVICE_TYPE_LABEL_ALIASES` 用中文 label 模糊匹配枚举 value | form.vue:257–267 |
| `serviceTypeValueByField`（field→value）+ `serviceTypeToFieldMap`（value→field）双向桥接 | form.vue:268–333 |
| `serviceTypes` 提交值通过桥接从 `*Enabled` 字段推算，枚举改名即失效 | form.vue:401–419 |
| `extractServiceTypesFromDetail()` 需从多路径捞 serviceType 数字 | form.vue:420–454 |
| `SeaExportDto.serviceTypes` 在 TypeScript 类型里存在，但实际接口不返回该字段 | sea-export-admin.ts:330 |

---

## 11 个决策点

| # | 问题 | 决策 |
| --- | --- | --- |
| 1 | 节点如何知道对应哪个执行方字段 | **C2：完全解耦**，节点只是勾选框，执行方字段独立区块 |
| 2 | 执行方区块可见性与勾选是否联动 | **完全不联动**，5 个执行方字段始终全量显示 |
| 3a | 可见节点来源 | `getServiceTypesByPOL()` 返回结果，API 返回什么渲染什么 |
| 3b | 节点 label 来源 | `getEnumItems('ServiceType')` → `displayName`，按 value 映射 |
| 4 | 勾选状态数据模型 | **C**：`serviceTypeNodes: ServiceTypeNode[]`，一个数组承载节点+勾选+任务状态 |
| 5 | 详情回填勾选状态来源 | `detail.seaExportServices[].serviceType`（**不是** `detail.serviceTypes`） |
| 6 | 任务状态保留 | **保留**，合并进 `ServiceTypeNode.taskStatus` |
| 7 | show/lock/require 逻辑 | **范围外不动** |
| 8 | 代收支节点 | **完全纳入普通节点**，删除 `SHOW_COLLECTION_PAYMENT_FIELD` 所有特判 |
| 9 | `organizationUnits` 提交 | **删除**，连同部门选择 UI 一起清理 |
| 10 | sortId 权威来源 | 始终用 `ServiceTypeByPolDto.sortId`（POL 配置实时顺序） |
| 11 | AI 识别中的 serviceTypes | **不处理 serviceTypes**，仅写执行方字段，节点勾选由 POL 配置决定 |

---

## 新节点类型定义

```typescript
type ServiceTypeNode = {
  serviceType: number; // 枚举 value
  label: string; // 枚举 displayName
  sortId: number; // 来自 ServiceTypeByPolDto.sortId
  checked: boolean; // 是否勾选（用户操作 or 回填）
  taskStatus?: 0 | 1 | null;
  // undefined = 未出现在 seaExportServices（新单 or 该节点从未启动）
  // null      = 在 seaExportServices 但 seServiceTask 为 null（未生成任务）
  // 0         = 待处理（Pending）
  // 1         = 已处理（Processed）
};
```

---

## 接口数据流映射

### 读（回填）

```
detail.seaExportServices[].serviceType  →  checkedServiceTypes: Set<number>
detail.seaExportServices[].seServiceTask  →  Map<serviceType, taskStatus>

getServiceTypesByPOL() → [{ serviceType, sortId, checked }]
  → 按 sortId 排序
  → 每个节点: checked = checkedServiceTypes.has(serviceType)
  → 每个节点: taskStatus = taskMap.get(serviceType)
  → 合并成 serviceTypeNodes[]
```

### 写（提交）

```
serviceTypeNodes.filter(n => n.checked).map(n => n.serviceType)
  → serviceTypes: number[]  （AddDto / EditDto 字段不变）

bookingAgentId / teamId / custBrokerId / warehouseId / insuranceId
  → 独立字段，直接提交，与 serviceTypes 无关联
```

---

## 需要删除的代码（form.vue）

| 常量/变量/函数 | 原因 |
| --- | --- |
| `SERVICE_ITEM_FIELD_NAMES` | 用枚举节点替代固定字段列表 |
| `ServiceItemFieldName` type | 同上 |
| `SERVICE_ITEM_META` | 执行方字段的 meta 可以保留用于执行方区块，但不再用于节点渲染 |
| `SERVICE_ITEM_CHECK_FIELD_NAMES` | 勾选状态改为 `node.checked` |
| `SERVICE_TYPE_LABEL_ALIASES` | label 来自枚举，不再需要别名映射 |
| `serviceTypeValueByField` ref | 桥接层删除 |
| `collectionPaymentServiceTypeValue` ref | 代收支纳入普通节点 |
| `SHOW_COLLECTION_PAYMENT_FIELD` | 代收支不再特判 |
| `serviceTypeToFieldMap` ref | 桥接层删除 |
| `SERVICE_ITEM_DEFAULT_ORDER_MAP` | sortId 统一来自 API |
| `serviceItemLabelMap` ref | label 合并进 `ServiceTypeNode.label` |
| `serviceItemSortOrderMap` ref | sortId 合并进 `ServiceTypeNode.sortId` |
| `serviceItemVisibleValues` ref | 执行方字段始终可见 |
| `serviceItemEnabledValues` ref | 勾选改为 `node.checked` |
| `ServiceItemCheckFieldName` type | 同上 |
| `getServiceTypeValue()` | 桥接层 |
| `getCollectionPaymentServiceTypeValue()` | 代收支特判 |
| `hasServiceTypeSelected()` | 桥接层 |
| `hasCollectionPaymentTypeSelected()` | 代收支特判 |
| `getServiceItemLabel()` | 改为 `node.label` |
| `loadServiceItemLabelMap()` | 改为 `loadSeServiceTypeOptions()` + map |
| `getServiceItemCheckFieldName()` | 不再需要 check field |
| `collectionPaymentEnabled` ref | 代收支特判 |
| `collectionPaymentDeptId` ref | organizationUnits 提交删除 |
| `collectionPaymentConfigured` ref | 代收支特判 |
| `extractServiceTypesFromDetail()` | 替换为 `seaExportServices` 直接读取 |
| `getServiceTypesFromEnabledValues()` | 替换为节点 filter |
| `extractServiceFieldSet()` | 桥接层 |
| `buildServiceItemSortOrderMap()` | sortId 来自 API |
| AI recognize: `serviceTypes` 处理段 | 不处理 serviceTypes |
| buildDto: `organizationUnits` | 删除 |

---

## 需要新增/替换的代码（form.vue）

```typescript
// 新增：核心状态
const serviceTypeNodes = ref<ServiceTypeNode[]>([]);

// 新增：节点构建
function buildServiceTypeNodes(
  polNodes: ServiceTypeByPolDto[],
  enumLabelMap: Map<number, string>,
  savedServiceTypeSet?: Set<number>,
  taskMap?: Map<number, SeaExportServiceTaskDto | null>,
): ServiceTypeNode[] {
  return polNodes
    .slice()
    .sort((a, b) => a.sortId - b.sortId)
    .map((node) => ({
      serviceType: node.serviceType,
      label: enumLabelMap.get(node.serviceType) ?? `${node.serviceType}`,
      sortId: node.sortId,
      checked: savedServiceTypeSet
        ? savedServiceTypeSet.has(node.serviceType)
        : node.checked,
      taskStatus: taskMap?.get(node.serviceType), // undefined if not in taskMap
    }));
}

// 简化后的 applyServiceTypeStateByPol
function applyServiceTypeStateByPol(
  availableNodes: ServiceTypeByPolDto[],
  savedServiceTypeSet?: Set<number>,
  taskMap?: Map<number, SeaExportServiceTaskDto | null>,
) {
  serviceTypeNodes.value = buildServiceTypeNodes(
    availableNodes,
    serviceTypeLabelMap.value, // 枚举 displayName map
    savedServiceTypeSet,
    taskMap,
  );
  polServiceConfigLoaded.value = true;
  collectionPaymentConfigured.value = false; // 删除特判后可移除此行
}

// 简化后的 resetServiceTypeStateWhenPolEmpty
function resetServiceTypeStateWhenPolEmpty() {
  serviceTypeNodes.value = [];
  polServiceConfigLoaded.value = false;
}

// 提交时
const getCheckedServiceTypes = () =>
  serviceTypeNodes.value.filter((n) => n.checked).map((n) => n.serviceType);

// 回填时解析 seaExportServices
function parseDetailServiceTypes(detail: SeaExportAdminApi.SeaExportDto) {
  const services = detail.seaExportServices ?? [];
  const savedSet = new Set(services.map((s) => s.serviceType));
  const taskMap = new Map<number, SeaExportServiceTaskDto | null>(
    services.map((s) => [s.serviceType, s.seServiceTask ?? null]),
  );
  return { savedSet, taskMap };
}
```

---

## service-type.ts 变化

### 删除

- `ServiceTypeSemanticKey` type
- `SERVICE_TYPE_SEMANTIC_LABEL_HINTS`
- `resolveServiceTypeSemanticKeyByLabel()`
- `buildServiceTypeSemanticMap()`

### 保留

- `ServiceTypeOption`
- `buildServiceTypeOptionsFromEnum()`
- `loadSeServiceTypeEnumItems()`
- `loadSeServiceTypeOptions()`
- `buildServiceTypeLabelMap()`
- `resolveServiceTypeLabelByMap()`

---

## TypeScript 类型修正（sea-export-admin.ts）

```typescript
// 新增（对齐 OpenAPI）
export interface SeaExportServiceDto {
  id: number;
  seaExportId: string;
  serviceType: number;
  sortId: number;
  seServiceTask?: SeaExportServiceTaskDto | null;
}

export interface SeaExportServiceTaskDto {
  id: string;
  serviceTaskStatus: 0 | 1; // 0=Pending, 1=Processed
  completionUserId?: number | null;
  completionUserNickName?: string | null;
  completionTime?: string | null;
}

export interface SeaExportDto {
  // ... 保留现有字段 ...
  seaExportServices?: SeaExportServiceDto[]; // 新增
  // serviceTypes?: number[];  // 删除（接口实际不返回此字段）
}
```

---

## 模板改动要点（form.vue template）

### 流水线节点区域

```html
<!-- 旧：循环 SERVICE_ITEM_FIELD_NAMES，每个节点绑定执行方输入 -->

<!-- 新：循环 serviceTypeNodes，节点只有图标+label+勾选+任务状态 -->
<div v-for="node in serviceTypeNodes" :key="node.serviceType">
  <checkbox v-model="node.checked" />
  <span>{{ node.label }}</span>
  <tag v-if="node.taskStatus === 0">待处理</tag>
  <tag v-else-if="node.taskStatus === 1">已处理</tag>
  <!-- taskStatus null/undefined = 未生成任务，不显示标签 -->
</div>
```

### 执行方区块（始终全量显示）

```html
<!-- 旧：v-if="serviceItemVisibleValues[field]" 控制显示 -->

<!-- 新：不加任何条件，始终渲染 -->
<booking-agent-select v-model="serviceItemValues.bookingAgentId" />
<team-select v-model="serviceItemValues.teamId" />
<cust-broker-select v-model="serviceItemValues.custBrokerId" />
<warehouse-select v-model="serviceItemValues.warehouseId" />
<insurance-select v-model="serviceItemValues.insuranceId" />
```

---

## 不在本次改造范围内

- `seServiceShows` / `seServiceLocks` / `seServiceRequires` 联动逻辑
- `sea-import-admin/form.vue`
- AI 识别中的 `serviceTypes` 应用（保留不处理，仅写执行方字段）
