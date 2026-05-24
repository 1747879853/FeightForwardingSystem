# 海运出口港口服务项配置 — 列表与编辑弹窗服务项类型对齐

**日期：** 2026-05-24  
**变更类型：** Fix  
**影响模块：** 基础资料 / 海运出口港口服务项配置

---

## 背景意图

编辑弹窗中配置的服务项类型与列表「服务项类型」列展示不一致。根因是列表仅依赖主配置上的 `serviceTypes` 汇总字段做前端枚举映射，而编辑弹窗读取 `seServiceConfigItems` 明细；当汇总字段与明细不同步时，两处展示会分叉。

---

## 核心逻辑变更

### 1. 统一文案解析（`data.ts`）

| 变更项 | 内容 |
| --- | --- |
| 新增 `resolveServiceTypeLabel` | 优先使用后端文案字段（`serviceTypeDisplayName` / `serviceTypeName` / `serviceTypeText`），再回退枚举 Map |
| 新增 `formatRowServiceTypes` | 列表展示优先从 `seServiceConfigItems`（按 `sortId` 排序）推导，无子项时再回退 `serviceTypes` |
| 新增 `loadSeServiceTypeOptions` | 列表与弹窗共用枚举加载：先 `ServiceType`，再 `serviceType` |

### 2. 列表页 / 弹窗

- 列表列 `formatter` 改为调用 `formatRowServiceTypes`
- 弹窗标题与概览区的服务项类型文案改为复用 `resolveServiceTypeLabel`

---

## 影响范围

- 列表「服务项类型」列与编辑弹窗明细、标题、用户属性概览将保持一致
- 枚举加载顺序调整为优先后端标准名 `ServiceType`，降低误命中其他同名枚举的风险

---

## 避坑指南

1. 列表展示不要只读 `serviceTypes` 汇总字段；有 `seServiceConfigItems` 时应以明细为准。
2. 列表与弹窗的服务项类型文案应共用同一解析函数，避免两处各自维护映射逻辑。
