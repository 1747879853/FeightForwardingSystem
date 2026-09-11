---
title: 海运出口分单对接独立打印数据源
date: 2026-09-11
module: sea-exports
---

# 背景意图

分单 Tab 原先把打印挂在海出主单 `PrintJsonType=0`，打出来的是整票。9 月 9 日因此拿掉按钮。后端已有独立数据源 `SeaExportSeparateDetail=500`，需要前端按**分单 id** 走统一打印弹窗。

# 核心逻辑变更

- `PrintJsonType` 增加 `SeaExportSeparateDetail = 500`
- 分单顶栏恢复「打印」：`openPrint` 传 `printJsonType=500`、`detailInput.id=当前分单 id`、`bizType=0`
- 模板筛选用分单签单方式 + 主单船公司/组织；草稿（未保存）禁用打印
- 有未保存修改时提示将打已落库数据，与主单打印口径一致

# 避坑指南

- 不要再传海运出口 id，也不要复用 `PrintJsonType=0`
- 后台须有绑定数据源 500 的打印格式，否则弹窗会提示暂无可用模板
- 海运进口没有分单模块，不要照搬这套入口
