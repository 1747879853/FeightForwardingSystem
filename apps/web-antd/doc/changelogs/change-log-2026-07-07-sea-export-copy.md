# 海运出口复制功能前端对接

**修改时间：** 2026-07-07

**关联接口：** `POST /api/services/app/SeaExportAdmin/CopyAsync`

---

## 一、需求背景

海运出口需支持从已有委托快速复制生成新票。后端 `CopyAsync` 已封装完整复制逻辑；前端在列表页与编辑页提供统一入口，费用是否复制由用户勾选控制。

---

## 二、改动范围

| 文件 | 修改类型 |
| --- | --- |
| `src/api/sea-export/sea-export-admin.ts` | 新增 `SeaExportCopyDto`、`copySeaExport()` |
| `src/views/sea-export-admin/use-sea-export-copy.ts` | 新增 composable（确认弹窗、API、跳转） |
| `src/views/sea-export-admin/list.vue` | 列表「复制」按钮 + `Admin.SeaExport.Add` 权限 |
| `src/views/sea-export-admin/form.vue` | 编辑页「复制」按钮 + 未保存警告 |
| `src/locales/langs/zh-CN/seaExport.json` | 复制相关 i18n |
| `src/locales/langs/en-US/seaExport.json` | 复制相关 i18n |

---

## 三、核心逻辑

1. 列表/编辑页调用 `useSeaExportCopy().copyFrom({ id, commissionNum, mblNum })`。
2. 编辑页若表单 dirty，先警告「复制基于已保存内容」。
3. 确认弹窗展示复制范围说明，`copyOrderFees` 默认 `false`。
4. 调 `copySeaExport({ id, copyOrderFees })`，成功后 `markListShouldRefresh` 并 `router.replace` 至新票编辑页。

---

## 四、避坑指南

1. 请求字段必须为 `copyOrderFees`，不是 `copyFees`。
2. 复制不经过 `AddAsync`，勿复用运价列表的前端清 ID 模式。
3. 权限与新增一致：`Admin.SeaExport.Add`（`v-access:code="perm.add"`）。
