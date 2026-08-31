---
title: 毛重体积皮重改为最多 4 位小数且不展示末尾 0
date: 2026-08-31
module: sea-exports / sea-imports / air-exports
---

# 背景意图

TAPD `#1161580498001000905`：海运出口毛重、皮重、体积改为最多 4 位小数，集装箱明细和分单同步；位数不够时末尾多余的 0 不要展示。海运进口、空运出口主单与对应明细按后端同一精度一起改。

后端第一轮把 `TransportOrder.Kgs/Cbm`、`OrderCtn.GrossWeight/TareWeight/Volume`、`SeaExportSeparate.Kgs/Cbm`、`AirExportOrderCtn.KGS/CBM` 改为 4 位小数；同日后续提交统一写成 `decimal(20,4)`（整数 16 位），并覆盖派车/联系单/费用数量，见 `change-log-2026-08-31-dispatch-preorder-fee-qty-4-decimal.md`。

# 核心逻辑变更

- 共用 `weight-volume-precision.ts`：`precision=4` + formatter，失焦后四舍五入到 4 位并去掉末尾 0（`1.2000` 显示 `1.2`）。
- 海出：主单 kgs/cbm、集装箱毛重/皮重/体积、分单 kgs/cbm 及分单装箱。
- 海进：主单 kgs/cbm/净重合计、集装箱毛重/皮重/净重/体积。
- 空出：主单 kgs/cbm、货物明细单件重量/体积；长宽高、体积重、计费重、泡比仍 6 位。体积按长×宽×高÷1000000 后按 4 位入库。

# 避坑指南

- 只设 `precision=4` 会把 `1.2` 显示成 `1.2000`，必须带 formatter；输入过程中 `userTyping` 时不要改写，否则小数点打不进去。
- 空运长宽高/体积重/计费重/泡比不要改成 4 位，后端仍是 `decimal(18,6)`。
- 派车、业务联系单箱货重、正式费用数量已在同日后续提交改为 4 位，前端补齐见 `change-log-2026-08-31-dispatch-preorder-fee-qty-4-decimal.md`。
