# 运价批量新增弹窗多行插入性能优化

## 背景意图

批量新增弹窗一次新增 10 行时，界面出现明显卡顿后才完成插入。原因是逐行调用 `insertAt` 触发多次表格重渲染，且每行挂载大量表单控件（港口/船公司等 Select）。

## 核心逻辑变更

- `batch-add-modal.vue` 新增 `buildDefaultRows` 与 `insertRowsBatch`：先批量构建行数据，再一次性 `loadData` 合并写入，避免 N 次重渲染。
- `addRows` 与 `handleCopyRows` 均改为走批量插入路径。
- 新增 `addingRows` 状态：表格区域 `Spin` 提示「正在新增行...」，新增/复制按钮在插入期间 loading 并禁用；插入前 `nextTick` + `requestAnimationFrame` 确保 loading 先渲染。

## 避坑指南

- 批量新增仍是一次性挂载全部行组件，若单次 50+ 行仍卡顿，需进一步启用虚拟滚动或 Select 懒加载。
- 使用 `loadData` 合并数据时须先 `getFullData()` 保留已有行，避免覆盖。
