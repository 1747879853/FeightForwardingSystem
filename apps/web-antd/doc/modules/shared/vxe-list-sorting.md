---
title: vxe 分页列表列头排序
module: 共享能力
author: auto-doc-sync
last_updated: 2026-06-26
---

# 1. 业务背景说明 (Background)

**白话解释：** 全站服务端分页的 vxe 表格支持点击列头远程排序，排序参数统一为后端 `sorting`（如 `CreationTime DESC, Code ASC`）。用户可在同 tab 内离开再返回时保留排序；刷新页面后重置。

# 2. 功能与操作说明 (Features & Operations)

- **单列循环：** 点击列头 → 升序 → 降序 → 取消该列。
- **箭头直达：** 点击上/下箭头直接切换为升序/降序；再次点击已激活的箭头可取消该列排序。
- **多列叠加：** 直接点击不同列头追加排序链，无需 Shift。
- **默认排序：** 页面可配置 `defaultSort`；全部取消后回退默认；未配置则不传 `sorting`。用户首次点击 **非 defaultSort 字段** 的列头时 **替换** 默认排序（不会把 `CreationTime DESC` 等默认项叠进排序链）；已有会话后再点其他列仍可多列叠加。
- **排除列：** 无 `field`、序号/勾选列、`operation`/`actions` 不可排；特殊列可 `sortable: false`。

# 3. 开发接入

```ts
import { createPagedListQuery } from '#/utils/paged-list-query';

proxyConfig: {
  ajax: {
    query: createPagedListQuery(getXxxPagedList, {
      defaultSort: 'CreationTime DESC', // 可选
      mapParams: (form) => ({ ...form }), // 可选
      afterFetch: async (result) => result, // 可选
    }),
  },
},
```

列级覆盖：`sortField: 'TransportOrder.MblNum'` 或 `sortable: false`。

# 4. 核心字段说明 (Field Definitions)

| 字段/参数        | 说明                                                 |
| :--------------- | :--------------------------------------------------- |
| `sorting`        | 请求参数，PascalCase 字段 + ASC/DESC，多字段逗号分隔 |
| `defaultSort`    | 未点击列头时的默认排序字符串                         |
| `sortSessionMap` | 内存 Map，key 为路由 tableId，刷新清空               |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **聚合/计算列不可排** 如海运出口组合费用状态，必须 `sortable: false`，否则后端 Dynamic LINQ 可能 500。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-07 | Fix | 修复有 defaultSort 时点击其他列仍叠加默认排序 | `resolveEffectiveSortList` 识别 proxy 中相对 default 新增的字段并单独替换，保留已有 session 后的多列叠加 |
| 2026-06-26 | Fix | 修复再次点击已激活箭头无法取消排序 | vxe clearSort 后 proxy 为空，须清空 session 而非沿用旧值 |
| 2026-06-26 | Fix | 修复点击降序箭头却变为升序的排序 bug | `applySortClick` 读取 vxe proxy 目标 order，替代盲目 `toggleSortList` 循环 |
| 2026-06-21 | Feature | 全站分页列表支持列头远程多列排序 | `useVbenVxeGrid` 包装层集中处理 session 与 sort-change，页面仅需 `createPagedListQuery` |
