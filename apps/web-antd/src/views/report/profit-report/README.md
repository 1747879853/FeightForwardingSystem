# 利润报表功能说明

## 📁 文件结构

```
apps/web-antd/src/
├── api/system/
│   ├── report.ts                    # 报表API接口定义
│   └── README-report.md             # API使用说明
├── views/report/
│   └── profit-report/
│       ├── index.vue                # 利润报表主页面
│       └── data.ts                  # 表单和表格配置
└── router/routes/modules/
    └── report.ts                    # 报表路由配置
```

## ✨ 功能特性

### 1. 查询条件区域

- **合并更改单**：开关控制是否合并原票和更改单
- **业务类型**：海运出口/海运进口/空运出口
- **委托单位**：支持搜索和选择
- **主提单号/委托编号**：模糊匹配
- **业务日期范围**：起止日期选择
- **货物类型**：普通货/冻柜/危险品/超限箱
- **结算方式**：票结/月结/约定天数
- **所属组织**：树形选择，包含子组织
- **起运港/目的港**：自动识别海运港/空运港

### 2. 数据表格

- **不分页显示**：一次性加载所有数据
- **虚拟滚动**：优化大数据量性能（vxe-table）
- **固定列**：委托编号（左）、操作（右）
- **自定义渲染**：
  - 业务类型标签
  - 委托单位全称提示
  - 港口代码显示
  - 箱型箱量标签组
  - 币别明细多标签展示
  - 金额右对齐格式化

### 3. 统计汇总

- **本位币统计**：
  - 合计应收（CNY）
  - 合计应付（CNY）
  - 合计利润（CNY）
  - 利润率（%）
- **原币统计**：按币别分组显示应收/应付/利润

## 🔌 API接口

### 主要接口

```typescript
// 获取利润报表列表
POST / api / services / app / ReportAdmin / GetProfitReportListAsync;

// 获取海空港口列表（用于下拉选择）
GET / api / services / app / PortCodeAdmin / GetSeaAirPortPagedListAsync;
```

### 权限要求

- `Admin.Report.Profit.Get`：查看利润报表权限

## 📊 数据类型

### 查询参数 (ProfitReportQueryDto)

```typescript
interface ProfitReportQueryDto {
  isMergeChangeOrder: boolean; // 是否合并更改单
  bizType?: number; // 业务类型
  clientId?: string; // 委托单位ID
  mblNum?: string; // 主提单号
  commissionNum?: string; // 委托编号
  bizDateStart?: string; // 业务日期起
  bizDateEnd?: string; // 业务日期止
  cargoId?: number; // 货物类型
  settlementType?: number; // 结算方式
  orgId?: number; // 组织ID
  polId?: number; // 起运港ID
  polIsSeaPort?: boolean; // 起运港是否海运港
  podId?: number; // 目的港ID
  podIsSeaPort?: boolean; // 目的港是否海运港
  // ... 更多干系人字段
}
```

### 返回数据 (ProfitReportDto)

```typescript
interface ProfitReportDto {
  transportOrderId: string; // 业务ID
  commissionNum: string; // 委托编号
  mblNum: string; // 主提单号
  bizType: number; // 业务类型
  client: ClientSimpleDto; // 委托单位
  pol: SeaAirPortSimpleDto; // 起运港
  pod: SeaAirPortSimpleDto; // 目的港
  ctns: ReportCtnSimpleDto[]; // 箱型箱量
  currencies: ProfitCurrencyDto[]; // 币别明细
  totalReceivable: number; // 合计应收
  totalPayable: number; // 合计应付
  totalProfit: number; // 合计利润
  totalProfitRate?: number; // 利润率
  // ... 更多字段
}
```

## 🎯 关键实现

### 1. 港口选择自动设置 IsSeaPort

```typescript
// 在港口选择器的 onChange 回调中自动设置隐藏字段
onChange: (value, option) => {
  if (option) {
    formActions.setFieldValue('polIsSeaPort', option.isSeaPort);
  }
};
```

### 2. 虚拟滚动优化性能

```typescript
virtualXConfig: {
  enabled: true,
},
virtualYConfig: {
  enabled: true,
  gt: 0, // 始终启用
}
```

### 3. 统计计算

```typescript
function calculateStatistics(data: ProfitReportDto[]) {
  // 遍历所有记录，累加金额
  // 按币别分组统计原币金额
  // 计算利润率（应付为0时返回'-'）
}
```

## 🚀 使用方式

### 访问页面

```
/report/profit-report
```

### 查询数据

1. 设置查询条件
2. 点击"查询"按钮
3. 表格显示结果，底部显示统计

### 查看详情

点击表格行中的"查看详情"按钮，跳转到对应的业务详情页。

## ⚠️ 注意事项

### 1. 港口参数必须成对传递

- `polId` 和 `polIsSeaPort` 必须同时存在
- `podId` 和 `podIsSeaPort` 必须同时存在
- 只传ID不传IsSeaPort会导致接口报错

### 2. 业务类型与字段的对应关系

某些字段在特定业务类型下不存在：

- **空运出口**：无船公司、场站、装运方式、船名、航次
- **海运进口**：无订舱代理、场站、装运方式
- 填写这些字段会排除对应的业务类型

### 3. 性能优化

- 表格使用虚拟滚动，可流畅显示大量数据
- 港口和客户下拉列表限制为1000条
- 统计计算在前端进行，避免重复请求

### 4. 权限控制

- 无权限用户无法查看报表
- 查询前会检查权限并给出提示

## 📝 扩展建议

### 1. 导出功能

目前导出按钮仅显示提示，可实现Excel导出：

```typescript
import * as XLSX from 'xlsx';

function handleExport() {
  const worksheet = XLSX.utils.json_to_sheet(tableData.value);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '利润报表');
  XLSX.writeFile(workbook, '利润报表.xlsx');
}
```

### 2. 缓存优化

对于频繁查询的条件，可以考虑缓存：

```typescript
import { useStorage } from '@vueuse/core';

const cachedQuery = useStorage('profit-report-query', {});
```

### 3. 图表展示

可以添加ECharts图表展示利润趋势：

```typescript
import { useEcharts } from '@/composables/useEcharts';

const { chartRef } = useEcharts(() => ({
  title: { text: '利润趋势' },
  xAxis: { type: 'category', data: dates },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: profits }],
}));
```

## 🔗 相关文档

- [报表模块接口文档](../../../../doc/报表/报表模块接口文档.md)
- [API使用说明](../../api/system/README-report.md)
