# 海运出口委托信息只读项新增超出省略与悬浮显示

## 背景意图

- 海运出口详情页左侧“委托信息”中的只读值在内容较长时会挤压布局，影响信息扫描效率。
- 目标是在不改变字段值来源和展示位置的前提下，实现超出省略，并在鼠标悬浮时查看完整内容。

## 核心技术决策/逻辑变更

- 在 `apps/web-antd/src/views/sea-export-admin/modules/readonly-form-item.vue` 的值渲染节点增加 `title` 绑定（`displayValue`），复用浏览器原生悬浮提示能力。
- 为 `.readonly-form-item__value` 增加 `overflow: hidden`、`text-overflow: ellipsis`、`white-space: nowrap`，统一实现单行截断。
- 通过改造通用只读组件，使 `form.vue` 中所有 `ReadonlyFormItem` 调用点自动获得一致行为，无需逐处改动。

## 避坑指南（Gotchas & Constraints）

- 当前方案基于原生 `title`，若后续需要富文本提示或移动端交互，应升级为组件级 Tooltip 并补充触屏触发方案。
- 省略样式依赖父容器宽度与 `min-width: 0`，后续若调整布局结构，需保留该约束避免省略失效。
- `displayValue` 仍保留空值占位符逻辑（默认 `-`），避免悬浮提示出现空字符串导致体验不一致。
