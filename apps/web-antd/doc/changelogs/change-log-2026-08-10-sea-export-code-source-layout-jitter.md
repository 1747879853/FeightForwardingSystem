# 海运出口 - 业务来源头部展示消除布局抖动

## 背景意图

头部「业务来源」在带出/回显时会抖动：一端是禁用 `CodeSourceSelect` 与纯文本「-」互切导致标题行挤动；另一端编辑回填仍读已删除的 `codeSourceName`，Select 异步拉详情补 label 再次重绘。

## 核心逻辑变更

- 头部改为固定 120px 只读文案槽位，不再挂载 `CodeSourceSelect`。
- 展示优先级：有来源显示 `cnName` → 已选委托单位无来源显示「-」→ 未选委托单位显示「按委托单位自动带出」。
- 编辑回填改读 `transportOrder.codeSource?.cnName`（兼容 `codeSourceId`），与 SimpleDto 对象化对齐。

## 避坑指南

- 业务来源只读，值仍由 `applyClientCodeSource` / 详情写入隐藏字段 `codeSourceId`。
- 勿再为「省宽」在「-」与下拉间 `v-if` 切换；槽位宽度需恒定。
- 名称必须随 id 同步写入 `headerCodeSourceSelectedItems`，禁止依赖 Select 自拉取详情。
