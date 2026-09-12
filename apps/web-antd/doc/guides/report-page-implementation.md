# 报表页面实现与经验培训

> 面向前端同学的跨模块开发指南。讲清利润报表 / 欠费报表的架构、数据流、扩展方式，以及踩过的性能与易用性坑。
>
> 业务字段与卡点见：[利润报表](../modules/report/profit-report.md)、[欠费报表](../modules/report/arrears-report.md)。  
> 模块文档索引（文件地图 / 新增摘要）：[报表模块](../modules/report/README.md)。

---

## 1. 为什么要「配置驱动」

两张报表 UI 高度同构：查询表单 + 分组工具条 + Handsontable + 合计 + 导出 + 双击跳转。差异只在：

| 差异点 | 利润报表 | 欠费报表 |
| :-- | :-- | :-- |
| 接口 | `GetProfitReportListAsync` | `GetArrearsReportListAsync` |
| 权限 | `Admin.Report.Profit.Get` | 应收 / 应付两套码 |
| 筛选项 | 公共字段 | + 收付类型、结算对象、结算/开票/对账/锁定 |
| 币别明细列 | 应收 / 应付 / 利润 | 应收/应付 · 已收/已付 · 未收/未付 |
| 合计列 | 合计应收/应付/利润 + 利润率 | 合计应收/应付 · 已收/已付 · 未收/未付 |
| 特有列 | TEU、装运方式等 | 超期天数着色、发票号、费用锁定 |

若每张报表复制一套页面，分组树、本位币聚合、高度适配、字段权限都会分叉。当前做法是：

**一份 `_shared` 基座 + 每张报表一份 `config.ts`。**

入口页只负责挂配置：

```vue
<!-- profit-report/index.vue -->
<script lang="ts" setup>
import ReportPage from '../_shared/report-page.vue';
import { profitReportConfig } from './config';

defineOptions({ name: 'ProfitReport' }); // 必须与路由 name 一致，keepAlive 靠它匹配
</script>

<template>
  <ReportPage :config="profitReportConfig" />
</template>
```

---

## 2. 目录与职责分层

```
views/report/
├─ _shared/                         # 基座（新增报表尽量只读这里）
│  ├─ types.ts                      # ReportPageConfig 契约
│  ├─ use-report-page.ts            # 表单 / 查询 / 动态列 / 跳转
│  ├─ use-report-table-layout.ts    # 表格高度（keepAlive 安全启停）
│  ├─ aggregate.ts                  # 分组/合计/导出共用的纯函数
│  ├─ report-page.vue               # Page 壳 + 查询卡 + 表格编排
│  ├─ report-hot-table.vue          # Handsontable：分组、排序、导出、合计钉底
│  ├─ transform.ts                  # DTO → 扁平行
│  ├─ hot-columns.ts                # renderer 工厂、币别列、本位币列
│  ├─ formatters.ts                 # 日期/业务类型/箱型、港口类型参数
│  ├─ options.ts                    # 公共筛选项工厂 + 默认日期区间
│  ├─ field-permission.ts           # PropMask：整列隐藏 / 逐行 ***
│  └─ smart-port-select.vue         # 按 bizType 切海港/空港
├─ profit-report/config.ts + index.vue
└─ arrears-report/config.ts + index.vue

api/system/report.ts                # ABP 接口与 DTO
router/routes/modules/report.ts     # 路由 + authority + keepAlive
```

**分层原则：**

1. **配置层**（`config.ts`）：只描述差异，不写 DOM、不碰 Handsontable。
2. **编排层**（`use-report-page` + `report-page.vue`）：查数、转行、动态列、权限。
3. **展示层**（`report-hot-table.vue`）：表格交互；聚合算法下沉到 `aggregate.ts`。
4. **布局层**（`use-report-table-layout.ts`）：高度观察与清理，和表格逻辑解耦。

---

## 3. 运行时数据流

```
用户点查询 / 打开页自动查
        │
        ▼
useReportPage.handleQuery
  ├─ ensureFieldPermission()          # 加载 PropMask，移除无权筛选项
  ├─ beforeQuery(values, ctx)         # 权限拦截 / 补 polIsSeaPort 等
  ├─ config.fetchApi(params)          # 全量不分页
  ├─ transformReportData(...)         # 扁平行 + 币别展开 + 行级 ***
  ├─ allCurrencyCodes = 结果币别集合  # 触发动态列重建
  └─ originalData = rows              # shallowRef 整体替换
        │
        ▼
ReportHotTable watch([originalData, columnConfigs])
  ├─ dataSource = 排序后的原始行
  ├─ applyGrouping → tableData（含分组行 + 合计行）
  └─ hotInstance.loadData(rows)       # 行变更不整表 updateSettings
```

关键约定：

- **行数据键**与列 `data` 一一对应；币别明细键规则为 `` `${code}_${field.key}` ``，例如 `USD_receivable`。
- **`_originalData`** 挂在扁平行上，双击跳转时带回后端 DTO（含 `transportOrderId`、`bizType`）。
- **分组 / 合计 / 导出**共用 `aggregate.ts`，避免三处口径漂移。

---

## 4. `ReportPageConfig` 怎么写

类型定义在 `_shared/types.ts`。新增报表时按下面填齐：

```ts
export const myReportConfig: ReportPageConfig<ReportApi.XxxDto> = {
  name: '某某报表', // 导出文件名 / sheet 名
  fetchApi: getXxxReportList,

  formSchema: [
    // 优先复用 options.ts 工厂；折叠后仍要可见的字段放前面
    ...getCommonReportFormFields(currentMonthDateRange()),
  ],

  beforeQuery: (values, ctx) => {
    if (!ctx.hasAccessByCodes(['Admin.Report.Xxx.Get'])) {
      message.warning('无权限');
      return false; // 中止请求
    }
    return setPortTypeByBizType(values);
  },

  baseHotColumns: [
    /* 静态列，可用 textRenderer() */
  ],

  currencyFields: [{ key: 'receivable', title: (code) => `${code}应收` }],

  totalHotColumns: [
    localCurrencyColumn(), // 合计列前必须有「本位币」
    {
      data: 'totalReceivable',
      title: '合计应收',
      className: 'htRight',
      renderer: textRenderer(''),
    },
  ],

  mapExtraRow: (item) => ({
    totalReceivable: item.totalReceivable?.toFixed(2) || '',
  }),

  // 参与累加 / 右对齐的键；利润率不要放进来（需按 利润÷应付 重算）
  numericColumnKeys: ['totalReceivable'],
};
```

**权限钩子为什么用 `ctx`：** `config.ts` 是普通模块，不能在顶层调用 `useAccess()`。由 `useReportPage` 注入 `hasAccessByCodes`。

**默认日期：** 接口是全量不分页。利润报表默认当月，欠费报表默认近 12 个月，避免打开页就拖垮浏览器。清空日期仍可查全部。

---

## 5. 表格能力拆解（Handsontable）

### 5.1 为什么用 Handsontable 而不是 VXE

报表需要：多级分组树、右键隐藏列、大宽表横向滚动、Excel 式只读浏览。列表页的 `useVbenVxeGrid` 更适合分页 CRUD；报表走 Handsontable（与订单费用、更改单同一技术栈）。

### 5.2 分组

- 右键列头「添加到分组」；合计列（`total*`）与 `_groupDisplay` 不可分组。
- 分组标签可拖拽调序、关闭移除；支持全部展开 / 全部收起。
- 展开状态用 `Set<string>`，key 形如 `client|宜必思酒业|0`。
- 分组行文本列显示 `值(次数)`；数值列累加；利润率按组内合计重算。

### 5.3 合计行与本位币

- 合计行追加在数据末尾，并用 `fixedRowsBottom: 1` 钉底，滚动明细时仍可见。
- **合计金额 = 本行主单所属公司本位币**，列标题禁止写死 `(CNY)`，前面跟「本位币」列。
- 下辖行出现多种本位币时：本位币显示「多币别」，`total*` 置 `-`（利润率置 `null`），**不做跨币别加总**。币别明细列按原币分列，不受影响。

### 5.4 排序 / 导出 / 跳转

- 列头单击：升序 → 降序 → 取消；合计行不参与排序。
- 导出时 `await import('xlsx')`，避免首包打进 SheetJS；有分组时导出完整展开树。
- 双击数据行：按 `bizType` 跳转海出 / 海进 / 空出编辑页。

### 5.5 行变更与 settings 变更要分开

Handsontable Vue 包装对 `settings` 做 deep watch；每次展开分组若重建整份 settings（含回调），会卡顿。

经验做法：

- **列 / 隐藏列 / 钉底** 等结构性变化 → 走 `hotSettings` computed。
- **行数据变化** → 只 `hotInstance.loadData(rows)`。
- `colHeaders` / `cells` 回调内读 `sortState.value`、`tableData.value`，不要闭包捕获旧值（包装器用 `toString` 比函数相等，捕获了也不会更新）。

---

## 6. 高度适配与 keepAlive（必读）

报表路由 `meta.keepAlive: true`。在本项目里：

- 切走标签页 → **只触发 `onDeactivated`，不触发 `onUnmounted`**。
- 写在 `onUnmounted` 里的 `removeEventListener` / `observer.disconnect()` 是死代码，直到关标签才执行。
- VueUse 的 `useEventListener` / `useResizeObserver` 默认也只在 unmount 清理，**报表页不要直接用它们挂全局监听**。

正确模式（见 `use-report-table-layout.ts`）：

```
onMounted / onActivated  → startLayoutWatchers()
onDeactivated / onUnmounted → stopLayoutWatchers()
```

高度算法用 **「视口底 − 容器顶」**，不要信未定高 flex 下的 `clientHeight`（它会等于 Handsontable 已设像素高，折叠检索后表格再也长不上去）。

查询表单折叠：`collapseTriggerResize: true` + 再补一帧 `window.dispatchEvent(new Event('resize'))`，与布局 composable 里的 `resize` 监听对接。

历史上曾监听整个 `document.body` 的 `MutationObserver(subtree + class/style)`，打开过报表后全站 class 变化都会进回调，表现为「一直慢」。现已收窄为容器 + 查询卡的 `ResizeObserver`。

---

## 7. 性能与易用性清单（踩坑沉淀）

| 项 | 做法 | 原因 |
| :-- | :-- | :-- |
| 大数据用 `shallowRef` | `originalData` / `tableData` / `columnConfigs` | 上千行深度代理成本高，报表只整体替换 |
| 默认日期区间 | 利润当月、欠费近 12 月 | 接口不分页，空条件 = 拉全库 |
| 查询成功不 toast | 工具栏显示「共 N 条」；0 条再 info | 每次查询弹成功打扰 |
| Spin + Empty | loading 盖表；无数据空态 | 避免「白屏像坏了」 |
| xlsx 动态 import | 仅导出路径加载 | 减小报表首包 |
| 合并 watch | `originalData` 与 `columnConfigs` 同次查询一起变 | 避免 `applyGrouping` 跑两遍 |
| 去掉表单 class MutationObserver | 只 ResizeObserver | class 变化太频繁 |
| 主题色 | `hsl(var(--primary) / …%)` | 禁止写死 `#1890ff` |
| 合计行双线 | 去掉 `.ht_clone_bottom` 首行 `border-top` | `fixedRowsBottom` 克隆层与主表底边叠线 |

---

## 8. 字段级权限（PropMask）

报表没有独立业务模块，列数据来自主单 `TransportOrder` 与业务线子对象。逻辑集中在 `field-permission.ts`：

1. **整列隐藏**：仅当该列所有数据来源都被**无条件**屏蔽。
2. **逐行 `\***`**：条件屏蔽或按行剔除字段时，在 `transform`阶段覆盖显示值；分组/合计/导出自然带上`\*\*\*`。
3. **筛选项**：无条件屏蔽对应字段时，从 `formSchema` 移除。

判定用 `'propName' in obj`，不能用「值是否为空」——后端是**删 key** 而不是置 `null`。

---

## 9. 新增一张报表的标准步骤

1. **`api/system/report.ts`**：DTO + `getXxxReportList`（雪花 ID 保持 string）。
2. **`views/report/<name>/config.ts`**：填 `ReportPageConfig`（见第 4 节）。
3. **`views/report/<name>/index.vue`**：`<ReportPage :config="..." />`，`defineOptions({ name })` 与路由 `name` 一致。
4. **`router/routes/modules/report.ts`**：注册 path / authority / `keepAlive`。
5. **文档**：`doc/modules/report/<name>.md` + `MODULE_INDEX.md` 一行；有特殊 UI 再用 `report-page` 插槽（`form-extra` / `toolbar` / `table-extra`）。

**自检：**

- [ ] 合计列前有「本位币」，标题未写死币种
- [ ] `numericColumnKeys` 不含需重算的比率列
- [ ] `beforeQuery` 做了权限拦截；港口成对补了 `*IsSeaPort`
- [ ] 默认日期合理，折叠后关键筛选项仍可见
- [ ] 路由 `name` = 组件 `defineOptions.name`，且 `keepAlive: true` 时布局观察在 `onDeactivated` 停掉
- [ ] 无新的 `document.body` MutationObserver / 顶层 `window.addEventListener` 泄漏

---

## 10. 和列表页的对比（避免混用模式）

|        | 业务列表（VXE）                 | 报表（Handsontable）       |
| :----- | :------------------------------ | :------------------------- |
| 分页   | `createPagedListQuery`          | 当前全量                   |
| 列配置 | `useTableConfigStore` 持久化    | 当次会话列显隐（右键隐藏） |
| 分组   | `list-grouping` Tabs            | 表格内多级树               |
| 表单   | `useVbenVxeGrid` 内置 form      | 独立 `useVbenForm`         |
| 刷新   | `useRefreshListOnFormReturn` 等 | 打开页 / 点查询 / 重置再查 |

不要把报表硬套成 VXE 列表，也不要在列表页复制一套 Handsontable 分组树。

---

## 11. 推荐阅读顺序

1. 本文（架构与经验）
2. [`doc/modules/report/README.md`](../modules/report/README.md)（文件地图）
3. `profit-report/config.ts` → `arrears-report/config.ts`（对照差异）
4. `use-report-page.ts` → `transform.ts` → `report-hot-table.vue`（主链路）
5. `use-report-table-layout.ts` + 仓库根目录《前端性能优化方案》P0-1（keepAlive 监听器）
6. 业务卡点：`doc/modules/report/*.md`

---

## 12. Changelog（培训文档）

| 日期 | 说明 |
| :-- | :-- |
| 2026-09-12 | 初版：配置驱动架构、数据流、扩展步骤、性能/易用性踩坑与 keepAlive 布局约定 |
