---
title: 海运出口文档代码解析
module: 海运出口
author: auto-doc-sync
last_updated: 2026-05-16
---

# 1. 解析目标

本次解析目标是结合 `apps/web-antd/src/views/sea-export-admin` 与 `apps/web-antd/src/api/sea-export` 的实际代码，完善 `apps/web-antd/doc/modules/sea-exports` 下的海运出口列表、新建、编辑工作台三份页面级活文档。

# 2. 核心逻辑梳理

| 页面 | 关键代码 | 解析结论 |
| :-- | :-- | :-- |
| 海运出口列表 | `list.vue`、`data.ts`、`sea-export-admin.ts` | 列表通过 `useVbenVxeGrid` 代理查询 `GetPagedListAsync`，查询区会把 ETD 和截单时间区间拆成接口需要的开始/结束字段；操作模式为单选行 + 顶部按钮 + 双击编辑。 |
| 海运出口新建 | `form.vue`、`data.ts`、`SeaExportAddDto` | 新建页由多个 `useVbenForm` 分区组成，保存时并行校验并构造双层 DTO：海出专属字段放根节点，运输单公共字段放 `transportOrder`。 |
| 海运出口编辑工作台 | `editor.vue`、`form.vue`、`orderFee`、`changeOrder`、`dispatch`、`separate-bill` | 编辑工作台以海出 ID 作为路由上下文，基础信息复用嵌入式表单；费用和更改单依赖 `transportOrder.id`，派车和分单依赖 `seaExportId`。 |

# 3. 发现的文档偏差

- 原文档对列表查询字段、日期区间转换、删除确认和单选行操作描述过于简略，未体现实际列表规范。
- 原文档未说明新建页多表单分区、服务项目勾选、港口备注联动、AI PDF 识别、订单人员清洗和创建后跳转规则。
- 原文档把编辑工作台概括为“基础信息、费用、更改单及相关执行子模块”，但未区分海出 ID 与运输单 ID，也未说明费用数量轮询、锁定状态展示、费用状态和派车/分单子模块边界。

# 4. 架构洞察

- 海运出口前端模型是“海出主表 + 运输单公共表”的双层结构，列表、表单和编辑工作台都需要明确字段属于 `SeaExportDto` 还是 `transportOrder`。
- `form.vue` 同时承担新建页和编辑工作台嵌入页，任何字段调整都要同步检查新建默认值、编辑详情回填、表单合并和 DTO 构造。
- 编辑工作台的子模块上下文并不统一：费用、更改单使用运输单 ID，派车、分单使用海出 ID，这是后续扩展问题记录、修改历史等模块时最容易出错的地方。

# 5. 同步结果

| 文档 | 同步内容 |
| :-- | :-- |
| `modules/sea-exports/index.md` | 补全列表查询、字段来源、操作模式、状态流转和业务卡点。 |
| `modules/sea-exports/create.md` | 补全新建页分区、核心字段、DTO 映射、校验保存和创建后跳转。 |
| `modules/sea-exports/id-edit.md` | 补全工作台标签、费用/更改单/派车/分单子模块、ID 上下文、锁定状态和费用状态流转。 |
