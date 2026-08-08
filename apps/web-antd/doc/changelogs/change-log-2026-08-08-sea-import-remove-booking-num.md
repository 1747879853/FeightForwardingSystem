---
title: 海运进口移除订舱编号展示
module: 海运进口
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 背景意图 (Background)

进口业务无订舱编号；页面仍沿用出口字段展示，测试要求从前端去掉（TAPD #0714）。

# 2. 核心逻辑变更 (Core Logic)

1. 列表筛选、列表列、基础信息表单 Schema / 字段顺序去掉 `bookingNum`。
2. 更改单左侧摘要、复制确认摘要与文案 placeholder 同步去掉订舱编号。
3. 接口 DTO / 提交映射仍保留字段，避免误清历史数据。

# 3. 避坑指南 (Pitfalls)

- 勿在提交时强行置空 `bookingNum`，除非产品明确要求清洗旧数据。
- 关键字模糊搜索后端若仍匹配订舱编号，属后端口径，前端 placeholder 已不再提示该字段。
