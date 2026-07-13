---
title: 分组禁用搜索项增加直观提示
date: 2026-07-12
type: Feature
scope: 通用列表分组（list-grouping）/ 海运出口列表
---

# 背景意图

列表启用某个「分组维度」后，与之互斥的同名搜索项会被禁用并清空。此前只是把控件置灰，用户看不出「为什么突然不能用了」，容易误以为是页面 bug 或权限问题，交互体验不佳。

需求：开启分组后，被禁用的搜索项要能**直观**地告诉用户「是因为开启了该字段分组才禁用」。

# 核心逻辑变更

改动集中在通用组合式函数 `apps/web-antd/src/components/list-grouping/use-list-grouping.ts`，所有复用 `useListGrouping` 的列表（当前为海运出口列表）都会受益。

- `disableSearchField(field)`：置灰的同时补充两处可见提示——
  - 将该搜索项的 `placeholder` 替换为内联提示 `已按「<分组名>」分组`（控件已清空 + 禁用，placeholder 常驻可见，用户一眼可见原因）；
  - 在 label 旁挂 `help` 帮助图标（tooltip 文案：`该条件已作为「<分组名>」分组维度，暂不可筛选；关闭分组后可恢复。`），悬浮可看到更完整的原因与恢复方式。
  - 禁用前先从 `formApi.state.schema` 读取该项原始 `placeholder` / `help` 并缓存，供恢复时还原。
- `restoreSearchField()`：切换/关闭分组时，将 `disabled`、`placeholder`、`help` 还原为缓存值。因 `updateSchema` 底层用 `defu` 合并会忽略 `undefined`（保留旧值），故 `placeholder`/`help` 用空字符串兜底覆盖，确保分组提示与帮助图标能被清掉。

# 避坑指南

- `updateSchema` 走 `mergeWithArrayOverride`（defu）：**source 中的 `undefined` 会被忽略**，想「清空/移除」某个已被设置的属性时，必须传空字符串等假值而非 `undefined`。
- `help` 在 `form-label.vue` 中以 `v-if="help"` 渲染帮助图标，空字符串即隐藏，符合还原预期。
- 依赖读取 `formApi.state.schema` 获取原始 placeholder；本组件当前互斥字段的 `componentProps` 均为纯对象，若未来接入 `componentProps` 为函数的字段，需另行兼容。
