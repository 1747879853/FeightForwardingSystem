# 海运出口对接危险品与冻柜扩展字段

**日期：** 2026-07-07

**关联后端变更：** `TransportOrder` 业务表新增危险品 11 项、冻柜 7 项字段（2026-07-06）

## 背景意图

后端在 `TransportOrder` 上按 `CargoId`（`S/R/D/O`）扩展危险品申报与冷藏控制字段，海运出口接口通过嵌套 `transportOrder` DTO 自动复用。前端需在编辑页货物信息区对接录入、回显与保存。

## 核心逻辑变更

1. **类型定义**：`TransportOrderAddDto` 补齐 18 个 camelCase 字段（`dgLevel`、`reeferTemperature` 等）。
2. **表单 UI**：货物信息 Card 内、`cargoId` 下方条件展示：
   - `cargoId = 2`（危险品）→「危险品申报」区块（11 项，`grid-cols-4`）
   - `cargoId = 1`（冻柜）→「冷藏控制」区块（7 项，`grid-cols-4`）
3. **数据路径**：表单顶层拍平；`flattenDetail` / `buildDto` 与 `transportOrder` 互转。
4. **切换清空**：`cargoId` 离开 D/R 时 `watch` 清空对应扩展字段；提交时仅当前类型字段写入 DTO。
5. **枚举**：`reeferTemperatureUnit` 前端维护 `0=℃`、`1=℉`；`dgMarinePollution`、`reeferVentOpen` 三态 Select。
6. **范围**：仅编辑/新建表单（共用 `form.vue`），列表与详情摘要不改动；复制随单由后端 + 详情映射自动生效。

## 避坑指南

1. 字段放在 `transportOrder` 下提交，勿挂到 `SeaExport` 顶层。
2. `cargoId` 非 D/R 时即使表单残留值也不应提交扩展字段（`buildDto` 按类型分支）。
3. 新建页与编辑页共用 `form.vue`，改一处即两处生效。
4. 全部字段可选，与后端可空契约一致；字符串 `maxlength: 32`。

## 涉及文件

- `src/api/sea-export/sea-export-admin.ts`
- `src/views/sea-export-admin/data.ts`
- `src/views/sea-export-admin/form.vue`
- `src/locales/langs/zh-CN/seaExport.json`
- `src/locales/langs/en-US/seaExport.json`
