# 详情页 KeepAlive 缓存 + 未保存提示

## 背景意图

业务联系单、海出/海进/空运出口、客户、自动费用模板的新建/编辑，以及工作台「应收应付」，需要：离开前提示未保存；确认切走后页面仍缓存，回来草稿还在；点 X 关闭才销毁。刷新只走浏览器原生 `beforeunload`，不做 sessionStorage 草稿。

## 核心逻辑变更

1. **`useUnsavedGuard`**：切走用「可回来继续编辑」文案；点 X 用「关闭后将丢失」。按 tabKey 登记脏检查，后台缓存页关闭也能问。确认关标签后跳过紧随其后的 `beforeEach`，避免弹两次。激活页有脏数据时挂 `beforeunload`。
2. **`tabbar.closeTab`**：单个关闭（点 X / 右键关闭）先走 `setBeforeCloseTabHandler`，确认后再删 tab。关其它/左右/全部仍不查脏。
3. **路由**：上述新建/编辑加 `keepAlive`；组件 `name` 与路由名不一致时用 `meta.keepAliveName` 写入 include。
4. **脏检查**：海出/海进/空运工作台 = 基础信息 **或** 应收应付未落库。业务联系单仍看整单快照（含费用）。客户 = 基础信息 / 联系人 Handsontable / 开票表单。自动费用模板拆成 `/create` 与 `/:id/edit`，表头或明细任一未保存即脏；旧 `?mode=&id=` 地址重定向。
5. **客户编辑**：内部 Tab 改为 KeepAlive，页内切换不再拆掉未保存块。

## 避坑指南

- 全局仍是「同 path 不拦」，海出 `?tab=` 内部切换不会误弹。不要改这条去迁就模板旧 query。
- 点 X 必须在删 tab **之前**确认。确认关当前页后要用 `closeConfirmedTabKeys` 放行随后的 `router.replace`。
- 组件若只有文件名推断的 `name`（如 `editor`），KeepAlive include 对不上路由名，缓存不会生效，须 `defineOptions({ name: 路由名 })` 或 `keepAliveName`。
- `beforeunload` 只能同步读 `lastDirty`；保存后若立刻 F5，200ms 内可能仍提示，属预期。
- 关其它 / 关左侧 / 关全部本轮不查脏，仍可能静默丢掉缓存草稿。
