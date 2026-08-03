# 2026-08-02 业务联系单按箱型一键生成应收海运费

## 背景意图

销售在「货物与箱型」里已经把箱型、箱量、卖价录全了，再到费用区手工敲一遍应收海运费属于重复劳动，且容易漏箱型或把单价填错。业务要求直接按箱型箱量表铺费用：收付固定应收、费用代码固定海运费、单位就是箱型、数量取箱量、含税单价取卖价。

## 核心逻辑变更

- 箱型箱量表工具栏新增「生成海运费」按钮（`ctn-table.vue` emit `generateFee`），未选任何箱型时禁用；编辑页转调费用表暴露的 `generateOceanFreightFees()`。
- 费用单位从「仅四项固定枚举」放宽为「四项 + 本单箱型名」：
  - `coercePreOrderFeeUnit(unit, ctnNames)` / `checkPreOrderFees(rows, ctnNames)` 新增箱型名白名单参数，命中时保留箱型字典写法。
  - 单位下拉 `unitOptions` 改为 computed，追加本单出现过的箱型名。
  - `fillQuantityByUnit` 增加箱型分支：数量 = 该箱型的箱量合计（同箱型多行会累加）。
- 生成规则：按箱型分组（同箱型合并箱量、卖价取首个非空），每组一行 `paySide=0`、`feeCodeId=海运费`、`unit=箱型名`、`quantity=箱量`、`unitPrice=卖价`；结算对象类别/结算对象/税率/币别/汇率沿用手工选费用代码的同一套逻辑（`applyFeeCodeByPaySide` + `applyExchangeRate`）。
- 海运费费用代码通过 `getFeeCodeListAsync({ isSea: true })` 按 `cnName='海运费'` → `code∈{OF,O/F,OCEANFREIGHT,OCEAN FREIGHT}` → `cnName` 包含「海运费」三级兜底匹配，命中后进程内缓存；找不到时报错不生成。
- 重复点击按「应收 + 海运费 + 同箱型」覆盖旧行，不会累积重复费用。
- 详情回显与提交 payload 的 `coercePreOrderFeeUnit` 都改为带上本单箱型名，历史箱型名单位不再被静默改成「票」。

## 避坑指南

1. 这条改动**推翻了** `change-log-2026-07-25-pre-order-fee-unit-no-ctn.md` 的「不要把箱型名加回下拉」结论。当时的顾虑是详情回显只有字符串、没有箱型字典；现在成立是因为箱型与费用同属一份详情 DTO，`preOrderCtns[].ctnCode.ctnName` 一定同时到手，`unitOptions` 由 `props.ctns` 派生。**前提是费用表必须能拿到 ctns**，别在别处复用费用表时漏传 `:ctns`。
2. 删掉某个箱型行后，引用该箱型的费用行单位会在 `syncDerivedRows` 里落回「票」、数量变 1，这是刻意行为（单位已不存在），但对用户是静默的。
3. 卖价为空的箱型仍会生成费用行，含税单价按 0，并额外弹一条 warning；数量为 0 的行在提交审核前只警告不拦截。
4. 费用代码维护的默认单位若是泛称「箱型 / CTN」，仍落到「票」——泛称定位不到具体箱量；只有默认单位**恰好等于**本单某个箱型名时才保留。
5. 匹配海运费依赖基础数据里费用代码的中文名/代码，改名后需同步 `OCEAN_FREIGHT_CN_NAME` / `OCEAN_FREIGHT_CODES`。
