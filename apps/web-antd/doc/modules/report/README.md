# 报表模块文档索引

> **文档位置约定：** 本模块及后续所有说明一律写在 `apps/web-antd/doc/` 下，按模块分组；**不要**在 `src/views/**`、`src/api/**` 等代码目录放置 README / 说明文档。

| 文档 | 说明 |
| :-- | :-- |
| [利润报表](./profit-report.md) | 业务背景、操作、字段、本位币卡点 |
| [欠费报表](./arrears-report.md) | 业务背景、收付类型权限、超期天数 |
| [报表页面实现与经验培训](../../guides/report-page-implementation.md) | 配置驱动架构、数据流、扩展步骤、性能/易用性踩坑 |

---

## 代码目录（仅索引，文档不放这里）

```
src/views/report/
├─ _shared/                        # 报表通用基座
│  ├─ types.ts                     # ReportPageConfig / CurrencyFieldDef
│  ├─ use-report-page.ts           # 表单、查询、重置、动态列
│  ├─ use-report-table-layout.ts   # 表格高度（keepAlive 启停）
│  ├─ aggregate.ts                 # 分组/合计/导出聚合纯函数
│  ├─ report-page.vue              # 模板组件
│  ├─ report-hot-table.vue         # Handsontable
│  ├─ transform.ts / hot-columns.ts / formatters.ts / options.ts
│  └─ field-permission.ts / smart-port-select.vue
├─ profit-report/config.ts + index.vue
└─ arrears-report/config.ts + index.vue
```

## 新增报表（摘要）

完整步骤与自检清单见 [培训指南 §9](../../guides/report-page-implementation.md#9-新增一张报表的标准步骤)。摘要：

1. `api/system/report.ts` 补接口与 DTO
2. `views/report/<name>/config.ts` 提供 `ReportPageConfig`
3. `views/report/<name>/index.vue` 挂 `<ReportPage :config="..." />`
4. `router/routes/modules/report.ts` 注册路由
5. **本文档目录**下新增 `doc/modules/report/<name>.md`，并在 `MODULE_INDEX.md` 登记

## 注意事项

- 港口参数成对：`polId`/`polIsSeaPort`、`podId`/`podIsSeaPort`（`setPortTypeByBizType`）。
- 合计列以本行本位币计价，标题不写死币种；多本位币时显示「多币别」且 `total*` 不加总。
- `numericColumnKeys` 不含需重算的比率列（如利润率）。
- 双击数据行按 `bizType` 跳转业务编辑页。
