# 报表模块说明（利润报表 / 欠费报表）

报表模块采用「配置驱动 + 模板组件」架构：所有报表共用同一套页面逻辑与视图，各报表的差异（接口、表单、列、数据转换）通过一份配置文件表达。

## 文件结构

```
views/report/
├─ _shared/                        # 报表通用基座
│  ├─ types.ts                     # ReportPageConfig / CurrencyFieldDef 等配置类型
│  ├─ use-report-page.ts           # 核心 Composable：表单、查询、重置、动态列、列配置
│  ├─ report-page.vue              # 报表模板组件（Page + 查询卡片 + 表格，支持插槽）
│  ├─ report-hot-table.vue         # Handsontable 表格（分组/合计/导出，列由 props 注入）
│  ├─ column-config-modal.vue      # 列配置弹窗
│  ├─ smart-port-select.vue        # 港口选择（按业务类型自动切换海港/空港）
│  ├─ transform.ts                 # 行数据转换：业务字段提取、公共行、币别金额展开
│  ├─ hot-columns.ts               # renderer 工厂 + 币别动态列生成
│  ├─ formatters.ts                # 日期/业务类型/箱型格式化、港口类型参数处理
│  └─ options.ts                   # 公共下拉选项 + 可复用表单字段工厂
├─ profit-report/
│  ├─ config.ts                    # 利润报表配置
│  └─ index.vue                    # <ReportPage :config="profitReportConfig" />
└─ arrears-report/
   ├─ config.ts                    # 欠费报表配置
   └─ index.vue                    # <ReportPage :config="arrearsReportConfig" />
```

## 新增报表的步骤

1. 在 `api/system/report.ts` 中补充接口与 DTO（遵循项目 API 约定）。
2. 新建 `views/report/<report-name>/config.ts`，提供 `ReportPageConfig`：
   - `fetchApi`：列表接口（当前为不分页全量查询）
   - `formSchema`：查询表单（用 `_shared/options` 的字段工厂组合公共字段 + 特有字段）
   - `baseHotColumns` / `totalHotColumns`：基础列与合计列（可用 `textRenderer` 工厂）
   - `currencyFields`：币别明细列定义（行数据键规则 `${币别代码}_${key}`）
   - `mapExtraRow`：本报表特有的行字段（合计金额等）
   - `numericColumnKeys`：数值列（合计行累加、分组聚合、右对齐）
   - `beforeQuery`（可选）：查询前参数加工/校验，返回 `false` 中止查询
3. 新建 `views/report/<report-name>/index.vue`：

```vue
<script lang="ts" setup>
import ReportPage from '../_shared/report-page.vue';
import { myReportConfig } from './config';

defineOptions({ name: 'MyReport' });
</script>

<template>
  <ReportPage :config="myReportConfig" />
</template>
```

4. 在 `router/routes/modules/report.ts` 中注册路由。

## 特殊 UI 扩展

`report-page.vue` 提供插槽：`form-extra`（查询卡片内）、`toolbar`（表格上方）、 `table-extra`（表格之后），用于个别报表的特殊按钮或展示需求。

## 注意事项

- 港口参数需成对传递：`polId`/`polIsSeaPort`、`podId`/`podIsSeaPort`；查询时由 `setPortTypeByBizType` 按业务类型自动补齐。
- 表格合计行、分组聚合基于 `numericColumnKeys` 声明的数值列计算；利润率列（`totalProfitRate`）在表格组件内有专门的聚合/合计逻辑。
- 双击数据行跳转对应业务编辑页（按 `bizType` 路由）。
