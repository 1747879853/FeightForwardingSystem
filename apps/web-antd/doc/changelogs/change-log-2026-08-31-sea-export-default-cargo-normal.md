---
title: 海运出口新建货物类型默认普通货
date: 2026-08-31
module: sea-exports / create
---

# 背景意图

海运出口新建时货物类型是空的，多数业务是普通货，每次手选。要求新建默认「普通货」。

# 核心逻辑变更

- `useBasicInfoFormSchema` 的 `cargoId` 增加 `defaultValue: CARGO_TYPE.S`（0，普通货），与装运方式/订单类型默认值写法一致。
- 新建页 `currentCargoId` 初值同步为普通货，避免下拉已有值但内联状态仍是空。
- 编辑页仍由详情 `setValues` 覆盖；复制进新建也会被源单货物类型覆盖。

# 避坑指南

- `CARGO_TYPE.S` 的值是 `0`，提交用 `values.cargoId ?? undefined`，不要改成 `||`，否则普通货会被当成没选。
- 切换离开危险品/冻柜仍会清空扩展字段；默认普通货不会触发这段 watch。
