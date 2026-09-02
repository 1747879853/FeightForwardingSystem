# 船期查询全宽布局并合并详情与船舶定位

## 背景意图

方案列表被 `max-width: 1600px` 卡住，宽屏两侧空一截。卡片班次表走 Ant Table，展开后不能跟着卡片拉满。延误只打「延误」，看不到晚了几天。详情抽屉和 AIS 弹窗分开，AIS 还靠 Vben `setData` 传 MMSI，iframe 经常空着没船。

## 核心逻辑变更

- 结果区去掉 1600 上限，工具栏港口对和方案卡跟内容区同宽。
- 方案卡内班次表改成原生 `table`，列宽按百分比铺满卡片。
- 延误文案改为「延误 N 天」，准点仍不打标。
- 点船名或「详情」打开同一弹窗：左船期完整字段，右 AIS iframe。iframe 直接吃当前班次的 `mmsi`（空则船名），不再走独立 `useVbenModal.setData`。
- AIS 地址按飞驼文档拼：`#/ais/vessel?key=秘钥&clientId=客户账号&mmsi=MMSI号或船名&lang=zh`。有数字 MMSI 用 MMSI；否则用船名并去掉空格（文档示例 `WANHAIA19`，不是 `WAN HAI A19`）。

## 避坑指南

- hash 路由的查询串必须在 `#/ais/vessel?` 之后，顺序为 `key`、`clientId`、`mmsi`、`lang`。不要用 `URLSearchParams`（空格会变成 `+`），也不要把船名空格编成 `%20`；飞驼示例是无空格船名。
- 有数字 MMSI 用 MMSI，没有再退回去空格后的船名。`key` 和 `clientId` 都缺一则不加载 iframe。
- 分组键、`groupName`、清洗去重未改。
