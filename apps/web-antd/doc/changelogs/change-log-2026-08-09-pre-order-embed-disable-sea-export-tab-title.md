# 2026-08-09 业务联系单内嵌海出禁用页签标题改写

## 背景意图

业务联系单审核通过后会挂载内嵌 `SeaExportEditor`，海出基础表单的 `useSeaExportTabTitle` 立即 `setTabTitle`，把当前路由页签从「业务联系单」改成「海运出口-{主提单号}」。页内仍是联系单，页签却像进了海出，观感混乱。对应 TAPD：[#0722](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000722) 问题（2）。

## 核心逻辑变更

- `useSeaExportTabTitle` 增加 `enabled` 选项；关闭时不改写、不复位页签标题
- 海出 `Form` / `editor` 增加 `disableTabTitle`，透传给 composable；KeepAlive 用不同 key 隔离内嵌实例
- 业务联系单：`<SeaExportEditor :disable-tab-title="true" />`；且仅在 `activeTab === 'seaExport'` 时挂载
- **宿主主动写回页签**：`editor.vue` 在 `onMounted` / `onActivated` / 回到 basic Tab 时 `setTabTitle('业务联系单')`——tabbar 的 `addTab` 合并时会保留旧 `newTabTitle`，仅禁用海出改写无法清掉历史脏标题

## 避坑指南

- `embedded` 只表示不用 `Page` 包一层（海出编辑工作台本身也是 `embedded`），**不能**用它关页签标题，否则独立海出编辑页也会丢动态标题
- 独立打开海运出口路由时勿传 `disableTabTitle`
- 勿用 `v-show` 藏内嵌海出：组件仍会 mount，`useSeaExportTabTitle` 的 `immediate` 仍会跑
- 不要在 composable 里按路由 path 特判业务联系单，由宿主显式传 `disableTabTitle` + 自行 `setTabTitle`
- 验证时若页签仍是旧「海运出口-xxx」，先关掉该页签再进，或依赖本次进页写回
