# 报表模块 API

本模块提供报表相关的API接口，包括利润报表、欠费报表和海空港口查询。

## 接口列表

### 1. 利润报表

**接口地址**: `POST /api/services/app/ReportAdmin/GetProfitReportListAsync`

**权限**: `Admin.Report.Profit.Get`

**特点**:

- 不分页，直接返回数组
- 支持合并更改单模式
- 金额字段包含原币和本位币

**使用示例**:

```typescript
import { getProfitReportList } from '#/api/system/report';

const result = await getProfitReportList({
  isMergeChangeOrder: true,
  bizType: 0, // 海运出口
  bizDateStart: '2024-01-01',
  bizDateEnd: '2024-01-31',
});
```

### 2. 欠费报表

**接口地址**: `POST /api/services/app/ReportAdmin/GetArrearsReportListAsync`

**权限**:

- 收: `Admin.Report.Arrears.Receive.Get`
- 付: `Admin.Report.Arrears.Pay.Get`

**特点**:

- 不分页，直接返回数组
- 必须指定 `paySide` (0=收, 1=付)
- 包含超期天数、发票号等欠费相关信息

**使用示例**:

```typescript
import { getArrearsReportList } from '#/api/system/report';

const result = await getArrearsReportList({
  paySide: 0, // 应收
  isMergeChangeOrder: false,
  settlementStatus: 0, // 未结算
});
```

### 3. 海空港口分页列表

**接口地址**: `GET /api/services/app/PortCodeAdmin/GetSeaAirPortPagedListAsync`

**权限**: 无特殊权限要求

**特点**:

- 支持分页
- 可筛选海运港或空运港
- 固定排序：先海运港后空运港，按中文名升序

**使用示例**:

```typescript
import { getSeaAirPortPagedList } from '#/api/system/report';

const result = await getSeaAirPortPagedList({
  pageIndex: 1,
  pageSize: 20,
  keyword: '上海',
  isSeaPort: true, // 只查海运港
});
```

## 重要说明

### 港口参数必须成对传递

海运港和空运港是独立的表，主键会重复，因此起运港/目的港必须同时传递两个字段：

```typescript
{
  polId: 123,
  polIsSeaPort: true,  // 必须与 polId 同时传递
  podId: 456,
  podIsSeaPort: false, // 必须与 podId 同时传递
}
```

### 业务类型与字段的对应关系

某些字段在特定业务类型下不存在，填写后会排除对应的业务类型：

| 字段                                        | 会排除的业务类型   |
| ------------------------------------------- | ------------------ |
| `carrierId` (船公司)                        | 空运出口           |
| `bookingAgentId` (订舱代理)                 | 海运进口           |
| `yardId` (场站)                             | 海运进口、空运出口 |
| `blType` (装运方式)                         | 海运进口、空运出口 |
| `vessel` / `innerVoyno` (船名/航次)         | 空运出口           |
| `polIsSeaPort=true` / `podIsSeaPort=true`   | 空运出口           |
| `polIsSeaPort=false` / `podIsSeaPort=false` | 海运出口、海运进口 |

### 人员筛选逻辑

- 同类人员多选之间是"或"关系
- 不同类人员之间是"且"关系

例如：选择销售A和销售B，再选择操作C，结果是：(销售=A OR 销售=B) AND 操作=C

## 类型定义

所有类型都定义在 `ReportApi` 命名空间下：

- `ProfitReportQueryDto` - 利润报表查询参数
- `ProfitReportDto` - 利润报表数据项
- `ArrearsReportQueryDto` - 欠费报表查询参数
- `ArrearsReportDto` - 欠费报表数据项
- `SeaAirPortQueryDto` - 海空港口查询参数
- `PagedListSeaAirPortSimpleDto` - 海空港口分页响应

以及多个公共基础类型（ClientSimpleDto、CarrierSimpleDto等）。
