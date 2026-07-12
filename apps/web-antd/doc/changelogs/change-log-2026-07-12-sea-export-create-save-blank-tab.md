# 海运出口新建保存后顶部残留空白标签页

## 背景意图

新建海运出口保存成功后，顶部多标签栏会多出一个空白（或无有效标题的）标签。根因是新增成功后使用 `router.push` 打开编辑页，新建页对应标签未被关闭；路由切换时标签栏按 `fullPath` 再挂一个编辑页标签，于是出现残留。

## 核心逻辑变更

1. `use-sea-export-submit.ts`：新增成功后的导航由 `router.push` 改为 `router.replace`（有 ID 进编辑页，否则回列表）。
2. 跳转前记录当前新建页 `fullPath` 作为 Tab key，跳转后调用 `closeTabByKey` 关闭原新建页标签。
3. `form.vue`：注入 `useTabs().closeTabByKey` 与 `getCurrentTabKey`，供提交编排使用。

与同模块「复制委托」成功后的 `router.replace` 策略对齐。

## 避坑指南

- 仅 `replace` 不够：标签栏按 path/fullPath 识别 Tab，`/create` 与 `/:id/edit` 是两个 key，replace 后旧 Tab 仍可能留在列表中，需显式 `closeTabByKey`。
- 关闭 Tab 时必须用**跳转前**缓存的 create 页 key；若用跳转后的 `route.fullPath`，会关错当前编辑页。
