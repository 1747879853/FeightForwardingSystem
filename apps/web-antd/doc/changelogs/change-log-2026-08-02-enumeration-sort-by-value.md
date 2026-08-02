# 枚举管理子项按枚举值升序展示

## 背景意图

- TAPD #0671：枚举管理（如 ServiceType 海运出口服务项目）子项较多时，按接口返回顺序不便查阅，需按枚举值从小到大排列。

## 核心逻辑变更

- `enumeration/data.ts`：新增 `sortEnumerationItemsByValue`，兼容数字/字符串 value。
- 编辑弹窗：加载时规范化 `value` 后排序；模板用 computed 始终按 value 升序展示；保存时按排序后的顺序提交；删除按对象引用，避免排序后 index 错位。
- 详情弹窗：子项列表同样按 value 升序展示。

## 避坑指南

- 勿用 `:key="index"` 渲染可重排列表，否则 DOM 复用会导致「看起来没排序」。
- 本地未部署前，远程测试环境看不到本改动；请在本机 `localhost` 硬刷新验证。
