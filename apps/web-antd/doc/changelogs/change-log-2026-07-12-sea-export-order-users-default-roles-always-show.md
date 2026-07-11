---
title: 海运出口编辑态干系人默认五岗位始终显示
date: 2026-07-12
type: Fix
module: 海运出口
route: /sea-exports/:id/edit
author: auto-doc-sync
---

# 背景意图

海运出口订单「干系人」面板要求：销售、商务、操作、客服、单证五个默认岗位**始终显示**，海外客服保持「有值才显示」。

新建态本已满足（`defaultOrderUsers` 五个角色、无海外客服）。但**编辑态**存在缺卡问题：`createOrderUserRows` 编辑分支只按订单已保存的 `orderUsers` 渲染，若某订单未保存某默认角色（例如历史单未填「商务」），编辑时对应卡片就会消失。

实测复现（客户「青岛佳越」`0728d16b-...` 关联订单）：

- 订单 #85（数据仅含销售/操作/客服/单证）编辑时只显示 4 张卡，**缺「商务」**。
- 订单 #84（数据含全部 6 类，含海外客服有值）编辑时正常显示 6 张卡。

# 核心逻辑变更

文件：`apps/web-antd/src/views/sea-export-admin/basic-info-form/use-order-users.ts` → `createOrderUserRows` 编辑分支。

1. 保留原有「映射 items → 行」与「海外客服无有效 `userId` 则过滤」逻辑，抽为 `mappedRows`。
2. 用 `presentRoles`（`mappedRows` 已含的 `userAttribute` 集合）算出缺失的默认角色，按 `defaultOrderUsers` 补空行 `missingDefaultRows`（仅含角色，无 `userId`）。
3. 合并后按 `defaultOrderUsers` 顺序排序：默认五岗位在前，其余角色（海外客服、手动新增角色）保持相对顺序排其后。

新建态分支（`!items?.length`）不变。

# 效果验证（浏览器实测）

| 场景 | 结果 |
| --- | --- |
| 新建 `/sea-exports/create` | 销售、商务、操作、客服、单证（无海外客服） |
| 编辑 #85（原缺商务） | 销售、**商务(空)**、操作、客服、单证（无海外客服） |
| 编辑 #84（有海外客服） | 6 张卡含海外客服（在末位） |

# 避坑指南

- 补出的默认空卡**无 `userId`**，保存时会被 `sea-export-detail-mapper.ts` 的 `sanitizeOrderUsers`（`filter(hasValidUserId)`）过滤，**不会把空「商务」写库**，因此不改变实际保存数据，仅影响展示。
- 排序依据是 `defaultOrderUsers` 的下标；非默认角色统一取 `defaultOrderUsers.length` 作为排序键，靠 `Array.prototype.sort` 的稳定性保持其相对顺序（海外客服因此稳定排在末位）。
- 客户（`/clients/:id/edit`）后端仅支持销售/客服/操作/单证四类干系人，无「商务」「海外客服」字段，本次变更不涉及客户页。
