---
title: 收费结算 PRD（测试版）
module: 结算管理
route: /settlement-management/receive-settlement
version: v1.0
last_updated: 2026-06-14
audience: QA
reference: apps/web-antd/doc/modules/settlement-management/receive-settlement.md
---

# 收费结算 PRD（测试版）

> **模块名称：** 收费结算  
> **页面路径：** `/settlement-management/receive-settlement`（列表）、`/add`（新建）、`/edit/:id`（编辑/只读）  
> **菜单入口：** 结算管理 → 收费结算  
> **权限标识：** `Admin.ReceiveSettlement`  
> **文档版本：** v1.0  
> **更新日期：** 2026-06-14  
> **参考文档：** [收费结算模块活文档](../modules/settlement-management/receive-settlement.md)、[银行流水 PRD](./bank-statement-prd.md)

---

## 1. 产品概述

### 1.1 业务背景

收费结算把**银行流水**（实际到账）与**应收费用**（「收」类型、仍有剩余额度）关联起来。财务选定流水 → 勾选费用并录入本次结算金额 → 生成收费结算单。单据可**锁定**；锁定后仅可查看或解锁，不可改主表、增删明细或删除。

### 1.2 核心价值

| 维度     | 说明                                                 |
| -------- | ---------------------------------------------------- |
| 操作粒度 | 一张收费结算单 = 一次对某条流水的费用分摊            |
| 使用场景 | 财务收款核销、多笔费用合并结算                       |
| 下游影响 | 占用费用剩余额度、占用流水可结算余额；锁定后冻结编辑 |

### 1.3 不在本功能范围内

- 不包含 `status` 的前端审核流转（仅 Tag 展示，后端驱动）
- 不支持编辑已保存明细的「本次结算金额」（只能删后重加）
- 选费抽屉**不支持**费用代码、ETD、组织等筛选（接口无此参数）
- 付费结算（`/payment-settlement`）不在本文范围

---

## 2. 目标用户与权限

### 2.1 角色

| 角色       | 典型操作                                   |
| ---------- | ------------------------------------------ |
| 财务       | 新建/编辑收费结算、添加删除明细、锁定/解锁 |
| 无权限用户 | 不可见菜单                                 |

### 2.2 权限点（ABP）

| 权限                             | 说明                    |
| -------------------------------- | ----------------------- |
| `Admin.ReceiveSettlement.Get`    | 列表、编辑/只读页访问   |
| `Admin.ReceiveSettlement.Add`    | 新建、保存新建          |
| `Admin.ReceiveSettlement.Edit`   | 编辑保存、添加/删除明细 |
| `Admin.ReceiveSettlement.Delete` | 单条删除、列表批量删除  |
| `Admin.ReceiveSettlement.Lock`   | 锁定                    |
| `Admin.ReceiveSettlement.Unlock` | 解锁                    |

**测试前置：** 准备全权限账号；另备无 Lock/Unlock、无 Edit 账号验证按钮显隐。

---

## 3. 功能清单

| #   | 功能                 | 入口                       | 优先级 |
| --- | -------------------- | -------------------------- | ------ |
| F1  | 列表查询与分页       | 列表页                     | P0     |
| F2  | 按银行流水筛选       | 查询区 BankStatementSelect | P0     |
| F3  | 新建收费结算         | 工具栏「新建」             | P0     |
| F4  | 编辑/查看            | 双击行（锁定→只读）        | P0     |
| F5  | 银行流水信息 Card    | 表单页顶部                 | P0     |
| F6  | 添加结算明细         | 选费抽屉                   | P0     |
| F7  | 删除结算明细         | 勾选 + 工具栏「删除」      | P0     |
| F8  | 锁定 / 解锁          | 编辑页顶部                 | P0     |
| F9  | 删除结算单           | 编辑页 / 列表批量          | P1     |
| F10 | 从银行流水页联动进入 | query `bankStatementId`    | P0     |

---

## 4. 页面结构

### 4.1 列表页

- **布局：** 查询区（默认折叠，一行六列，`labelWidth=64`）+ 表格 + 分页。
- **交互：** 勾选 + 工具栏；**双击行**进入编辑页（锁定单据同样进入，页面只读）。

**查询字段：**

| 字段 | 接口参数 | 说明 |
| --- | --- | --- |
| 结算单号 | `settlementNo` | 模糊 |
| 结算时间 | `settlementTimeStart` / `settlementTimeEnd` | 范围，占两列，含时分 |
| 创建人 | `creatorUserId` |  |
| 银行流水 | `bankStatementId` | 下拉搜索，关键字映射 `bankStatementNo` |

**URL 预填：** 访问 `/receive-settlement?bankStatementId=xxx` 时，查询区自动选中该流水并触发查询。

**列表列：** 结算单号、结算状态、结算时间、银行流水号、明细总金额、明细条数、锁定状态、锁定时间、创建人、创建时间、备注。

**结算状态枚举（只读展示）：**

| 值  | 文案     |
| --- | -------- |
| 0   | 录入中   |
| 1   | 审核中   |
| 2   | 已驳回   |
| 3   | 审核通过 |
| 4   | 部分结算 |
| 5   | 已结算   |

### 4.2 新建/编辑/只读页

#### 4.2.1 银行流水信息 Card（选中流水后展示）

**基础字段（来自 `BankStatementAdmin/DetailAsync`）：** 流水号、交易时间、总金额、币别、付款方、交易备注、我司银行。

**结算进度汇总：**

| 指标 | 计算方式 |
| --- | --- |
| 已结算（不含本单） | 该流水下其他收费结算单 `totalSettledAmount` 之和（编辑时排除当前单 ID） |
| 剩余可结算 | 流水 `amount` − 已结算（不含本单）− 本单明细 `settledAmount` 合计 |
| 本单本次合计 | 当前明细 `settledAmount` 实时求和 |

- 数据来源：并行请求 `DetailAsync` + `GetReceiveSettlementPagedListAsync`（`pageSize=500`）。
- **剩余可结算 ≤ 0** 时数值与警告文案标红；保存时若剩余 < 0 前端阻断。

#### 4.2.2 结算信息 Card

| 字段     | 新建            | 编辑       | 只读       | 说明                 |
| -------- | --------------- | ---------- | ---------- | -------------------- |
| 银行流水 | 点击打开 Picker | 只读       | 只读       | 有明细后不可更换     |
| 结算单号 | —               | 文本       | 文本       | 后端生成             |
| 创建人   | —               | 文本       | 文本       |                      |
| 结算时间 | 可编辑          | 可编辑     | 只读       | 默认当前时间，含时分 |
| 结算状态 | —               | Tag        | Tag        |                      |
| 锁定状态 | —               | Tag + 时间 | Tag + 时间 |                      |
| 备注     | 可编辑          | 可编辑     | 只读       |                      |

#### 4.2.3 结算明细表格

| 列                  | 说明                           |
| ------------------- | ------------------------------ |
| 委托编号 / 主提单号 |                                |
| 费用名称 / 币别     |                                |
| 费用总额 / 剩余额度 | 只读                           |
| 本次结算金额        | 新建态可改；**已保存明细只读** |
| 结算对象 / 备注     | 新建态备注可改；已保存只读     |

- 无操作列；通过**勾选行 + 工具栏「删除」**批量删明细。
- 「添加明细」：打开右侧选费抽屉。

#### 4.2.4 选费抽屉

**筛选（仅以下三项有效）：**

| 字段     | 说明                               |
| -------- | ---------------------------------- |
| 结算对象 | **只读**，随银行流水付款方自动带出 |
| 委托编号 | `commissionNum`                    |
| 主提单号 | `mblNum`                           |

**交互：**

- 按业务（委托）分组展示，可展开查看费用行。
- 勾选费用并录入「本次结算金额」；输入金额时自动勾选该行。
- 默认金额为该费用「剩余额度」；`max` 绑定剩余额度。
- 已在主表明细中的费用不可重复选（disabled）。
- 确认后：新建态追加到本地明细；编辑态即时调用 `AddItemsAsync` 并刷新。

**顶部按钮（编辑页）：** 返回、保存、锁定、解锁、删除——按权限与锁定状态显隐。

---

## 5. 业务规则（测试重点）

| 规则 ID | 规则描述 |
| --- | --- |
| R-01 | 新建必填：银行流水、结算时间、至少 1 条明细 |
| R-02 | 每条明细「本次结算金额」必须 **> 0** |
| R-03 | 新建态明细金额不得超过该费用「剩余额度」 |
| R-04 | 本单明细合计不得超过流水「剩余可结算」（含其他结算单已占金额） |
| R-05 | **已有明细后不可更换银行流水**（前端拦截） |
| R-06 | **已保存明细不可改金额**，只能删除后重新添加 |
| R-07 | 编辑保存主表仅提交 `settlementTime`、`remark`（`EditAsync`） |
| R-08 | 编辑态增删明细分别即时调用 `AddItemsAsync` / `DeleteItemsAsync` |
| R-09 | 锁定后：隐藏保存、删除、添加明细、明细勾选与删除；页面标题为「查看收费结算」 |
| R-10 | 锁定单据仍可从列表/银行流水子表双击进入（只读，非 404） |
| R-11 | 列表批量删除：含已锁定行时整批拦截 |
| R-12 | 新建成功 → 跳转编辑页（`replace`） |
| R-13 | 列表点「新建」时，若查询区已选银行流水，通过 query 带入新建页 |
| R-14 | `status` 无前端变更入口，勿测「页面上能否改状态」 |

---

## 6. 接口清单

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `ReceiveSettlementAdmin/GetPagedListAsync` | GET | 列表 |
| `ReceiveSettlementAdmin/DetailAsync` | GET | 详情 |
| `ReceiveSettlementAdmin/AddAsync` | POST | 新建（含明细） |
| `ReceiveSettlementAdmin/EditAsync` | PUT | 改主表 |
| `ReceiveSettlementAdmin/AddItemsAsync` | POST | 编辑态加明细 |
| `ReceiveSettlementAdmin/DeleteItemsAsync` | POST | 编辑态删明细 |
| `ReceiveSettlementAdmin/DeleteAsync` | DELETE | 删单 |
| `ReceiveSettlementAdmin/LockAsync` | PUT | 锁定 |
| `ReceiveSettlementAdmin/UnLockAsync` | PUT | 解锁 |
| `ReceiveSettlementAdmin/GetOrderFeeGroupAsync` | GET | 选费抽屉 |
| `BankStatementAdmin/DetailAsync` | GET | 流水摘要 Card |
| `BankStatementAdmin/GetReceiveSettlementPagedListAsync` | GET | 流水下其他结算单汇总 |

### 6.1 新建请求体示例

```json
{
  "bankStatementId": "guid",
  "settlementTime": "2026-06-14T08:00:00.000Z",
  "remark": "",
  "receiveSettlementItems": [
    {
      "orderFeeId": "guid",
      "settledAmount": 1000.0,
      "remark": ""
    }
  ]
}
```

### 6.2 GetOrderFeeGroupAsync 查询参数

| 参数                     | 说明                     |
| ------------------------ | ------------------------ |
| `receiveSettlementId`    | 编辑态传入，排除本单已选 |
| `settlementId`           | 银行流水关联付款方 ID    |
| `commissionNum`          | 可选                     |
| `mblNum`                 | 可选                     |
| `pageIndex` / `pageSize` | 分页                     |

---

## 7. 测试用例（建议）

### 7.1 入口与权限

| 用例 ID | 步骤                | 期望结果                              |
| ------- | ------------------- | ------------------------------------- |
| TC-001  | 无 Get 权限访问列表 | 无菜单或 403                          |
| TC-002  | 有 Get 无 Add       | 「新建」隐藏                          |
| TC-003  | 锁定单双击进入      | 标题「查看收费结算」，无保存/添加明细 |
| TC-004  | 有 Get 无 Lock      | 锁定按钮隐藏                          |

### 7.2 主流程（P0）

| 用例 ID | 步骤 | 期望结果 |
| --- | --- | --- |
| TC-101 | 列表选银行流水 → 新建 | 新建页流水已预填，摘要 Card 展示 |
| TC-102 | 选流水 → 添加明细 → 保存 | 成功跳转编辑页，结算单号有值 |
| TC-103 | 编辑：改结算时间、备注 → 保存 | `EditAsync` 成功 |
| TC-104 | 编辑：添加明细 | 即时保存，明细增加，汇总刷新 |
| TC-105 | 编辑：勾选明细删除 | 即时删除，汇总刷新 |
| TC-106 | 锁定 → 刷新 | 只读；列表锁定 Tag 为红 |
| TC-107 | 解锁 → 再编辑 | 恢复可编辑 |
| TC-108 | 从银行流水编辑页「新建收费结算」 | 流水预填，流程同 TC-101 |

### 7.3 金额与额度

| 用例 ID | 步骤 | 期望结果 |
| --- | --- | --- |
| TC-201 | 本单合计 > 流水剩余 | 剩余标红；保存提示超限 |
| TC-202 | 明细金额 > 费用剩余额度 | 保存前 warning |
| TC-203 | 明细金额 = 0 或空 | 保存前 warning |
| TC-204 | 流水 10000，单 A 6000 + 单 B 4000 | 第二单剩余为 0，再建第三单应超限 |
| TC-205 | 编辑态修改已保存明细金额 | 输入框不可编辑 |

### 7.4 边界与回归

| 用例 ID | 步骤                        | 期望结果                   |
| ------- | --------------------------- | -------------------------- |
| TC-301  | 有明细后点击换流水          | 提示不可更换               |
| TC-302  | 选费抽屉重复选同一费用      | 不可选或确认提示已在明细中 |
| TC-303  | 批量删除含锁定行            | 提示无法删除               |
| TC-304  | 列表 URL 带 bankStatementId | 查询区预填并查询           |
| TC-305  | 选费仅填委托编号搜索        | 结果过滤正确               |
| TC-306  | 抽屉结算对象为只读          | 不可切换其他客户           |

### 7.5 跨模块联动

| 用例 ID | 步骤                                 | 期望结果           |
| ------- | ------------------------------------ | ------------------ |
| TC-401  | 银行流水编辑页子表与收费结算列表数据 | 同一流水下记录一致 |
| TC-402  | 收费结算保存后回银行流水页           | 子表出现新记录     |

---

## 8. 验收标准（Must Have）

1. 列表筛选（含银行流水）、新建、编辑、锁定/解锁主流程可用。
2. 流水摘要与三层金额校验（费用剩余、流水剩余、本单合计）行为正确。
3. 明细仅支持新增/删除，已保存金额不可改。
4. 与银行流水页双向跳转与 query 预填正常。
5. 权限与锁定态 UI 与接口一致。

---

## 9. 已知风险与测试关注点

| 风险点 | 说明 | 测试建议 |
| --- | --- | --- |
| 汇总 pageSize=500 | 单流水下结算单 >500 时「已结算」可能不准 | 大数据量环境抽测或标记待确认 |
| 明细级 vs 流水级校验 | 两层独立；单笔不超剩余 ≠ 合计不超流水 | 分别构造用例 |
| status 不可操作 | 后端驱动 | 勿报「无法改状态」缺陷 |
| 币别混合 | 流水与费用币别关系依赖后端 | 多币别费用 + 单币别流水场景需后端确认 |
| 2026-06-14 输入修复 | 抽屉/明细金额 InputNumber 曾不渲染 | 回归输入与自动勾选 |

---

## 10. 测试数据建议

| 数据项   | 建议                                     |
| -------- | ---------------------------------------- |
| 银行流水 | 至少 2 条：一条无结算、一条已部分结算    |
| 应收费用 | 同一付款方下多条「收」费用，剩余额度 > 0 |
| 委托数据 | 含委托编号、主提单号，便于抽屉筛选       |
| 锁定场景 | 1 张已锁定 + 1 张未锁定                  |
| 账号     | 全权限 / 无 Lock / 无 Edit               |

---

## 11. 附录：关键源码索引

| 文件 | 职责 |
| --- | --- |
| `src/router/routes/modules/settlement-management.ts` | 路由与权限 |
| `src/views/settlement-management/receive-settlement/list.vue` | 列表、批量删除、query 预填 |
| `src/views/settlement-management/receive-settlement/form.vue` | 表单、汇总、锁定、校验 |
| `src/views/settlement-management/receive-settlement/add-fee-drawer/` | 选费抽屉 |
| `src/views/settlement-management/receive-settlement/bank-statement-picker/` | 流水选择 |
| `src/adapter/component/biz-select/bank-statement-select.vue` | 列表筛选下拉 |
| `src/api/settlement-management/receive-settlement-admin.ts` | API |
| `doc/modules/settlement-management/receive-settlement.md` | 模块活文档 |
