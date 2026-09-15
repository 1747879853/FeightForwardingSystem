# 列表列对象路径 — 待二次扫描清单

> 生成日期：2026-09-15  
> 本轮已改 field 绑真实路径；下列为故意保留或待对照 API 再改的项。

## 本轮已改文件

| 模块 | 文件 |
| :-- | :-- |
| 海运出口 | `sea-export-admin/data.ts`、`list.vue`（fieldMap）、`list-column-defaults.ts` |
| 海运进口 | `sea-import-admin/data.ts`（`SEA_IMPORT_SORT_FIELD_MAP`） |
| 空运出口 | `air-export-admin/data.ts`（`AIR_EXPORT_SORT_FIELD_MAP`） |
| 业务联系单 | `pre-order/data.ts` |
| 联系单审核 | `audit-approval/pre-order-review/data.ts` |
| 监装 | `loading-order-admin/data.ts` |
| 付费结算 | `settlement-management/payment-settlement/data.ts` |
| 费用模板 | `system/basic-data/OrderFeeTemplateAdmin/data.ts` |
| 费用锁定 | `fee-management/fee-lock/fee-lock-data.ts` |
| 港口资料 | `system/basic-data/PortCodeAdmin/data.ts` |
| 空港资料 | `system/basic-data/AirPortAdmin/data.ts` |

## 故意保留的例外

- **港口备注列（海出/业务联系单）：** `field` 仍为 `polName` 等，单元格 `formatter` 读 `*Remark`；排序仍按港。
- **干系人：** `getRoleName`、`orgs[0].name` 等集合派生列。
- **日期 / 枚举 / 金额 / Tag：** `formatDate`、`CellTag` 等。
- **船公司 Logo：** `carrierWithLogo` 插槽列 `field: carrierCode`。
- **费用审核 POL/POD：** 按 `bizType` 三套对象派生，无单一路径。
- **收发通：** `field` 已改 `transportOrder.*.name`，保留 `getPartyName`（姓名空时用 Content）。
- **空港展示：** `field` 改 `pol.iataCode` 等，保留 `formatAirPortLabel`。
- **费用模板港名：** `pol.portName` / `pod.portName` 保留 cnName 兜底 formatter。

## 建议 grep（下一轮整仓扫）

```bash
# 旧 *Name 键旁仍有 formatter 拐对象字段
rg "field: '.*Name'" apps/web-antd/src/views -g 'data.ts' -A3

# formatter 读 .name 但 field 可能仍是旧键
rg "formatter:.*row\.\w+\?\.(name|cnName)" apps/web-antd/src/views -B5
```

## 待核简易 DTO（可能仍平铺 clientName）

- `add-fee-modal`、`add-fee-statement-modal`（付款申请添加费用抽屉）
- 付费申请列表部分列
- 费用审核列表 POL/POD 列
- 海出 `changeOrder/index.vue` 更改单对比仍用 `clientName` 等展示键（非 vxe 列表列）

## 验证要点

- 海运出口列表：有 `yard.name` 的票场站列应直接出字；委托单位、订舱代理同理。
- 硬刷新后复测，排除 vxe label 缓存。
