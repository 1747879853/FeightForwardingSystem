# 监装列表分段 Tab 改为 Canvas 斜切滑块

## 背景意图

监装列表「新派 / 进行中 / 已完成」原先是纯色块切换，没有滑动形态。按微信小程序自定义 Tab 方案，用 Canvas 2D 画平行斜切白滑块，替换列表顶部分段。

## 核心逻辑变更

- 新增可复用组件 `apps/mp/src/components/skew-tabs/skew-tabs.vue`：底座 `#e3ecff`、白色 S 曲线滑块、平行分割线，点击后插值动画跟手。
- `pages/loading/list` 用 easycom + `usingComponents` 注册 `<skew-tabs>`，文案仍来自 `STATUS_TABS`（新派 / 进行中 / 已完成），切 Tab 仍按状态 1/2/3 拉列表。
- 配色与字号沿用现有 token（`$tab-track` / `$text-title` / `$text-label`），不改检索、卡片与分页逻辑。
- `manifest.json` / `project.private.config.json` 关闭微信 `ignoreDevUnusedFiles`，避免开发者工具把组件当成无依赖文件丢掉。

## 避坑指南

- 组件内查 Canvas 节点必须 `uni.createSelectorQuery().in(当前组件)`，否则自定义组件里拿不到 `type="2d"` 的 node。
- `@dcloudio/types` 的 `fields` 必须传第二个 callback，再 `.exec()`；只写 `.fields({ node: true, size: true })` 会 typecheck 失败。
- 微信开发者工具里 Canvas 有时首帧拿不到宽高，组件会短重试；从底栏切走再回来会 `onShow` 重绘，避免滑块被清空。
- 改完后需重新编译 `dev:mp-weixin`，用微信开发者工具打开 `apps/mp/dist/dev/mp-weixin` 看动画。
- 不要只写 `import SkewTabs from '@/components/skew-tabs.vue'`：编译后会变成 JSON `usingComponents`，微信「过滤无依赖文件」会报「已被代码依赖分析忽略」。组件放 `components/组件名/组件名.vue`，并在 `pages.json` 登记。
- 若重编译后仍报该错：开发者工具 → 详情 → 本地设置 → 取消「过滤无依赖文件」，再编译一次。
