# workbench-top-nav

## 作用

顶部业务标签导航（`海运出口服务 / 其他业务`），支持受控切换。

## Props

- `modelValue: string` 当前激活 tab key
- `tabs: ServiceTab[]` 标签列表，结构 `{ key, label }`

## Emits

- `update:modelValue` 切换 tab 时触发，返回 `key`

## 对接建议

- 将 `update:modelValue` 与页面级查询参数绑定，用于切换服务线后刷新数据。
