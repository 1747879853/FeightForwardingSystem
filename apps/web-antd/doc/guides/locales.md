# 国际化（locales）扩展说明

> 原 `src/locales/README.md` 已迁至此。

每个 app 使用的国际化可能不同。`apps/web-antd/src/locales/` 用于扩展：

- dayjs、Ant Design Vue 等组件库的多语言切换
- 本应用自身的文案（`langs/zh-CN`、`langs/en-US` 等）

业务页面优先走 `$t(...)` / `#/locales`，勿硬编码中文（权限、品牌差异文案除外时按现有约定）。
