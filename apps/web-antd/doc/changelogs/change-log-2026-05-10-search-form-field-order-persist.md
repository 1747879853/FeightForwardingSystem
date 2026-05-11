# 搜索字段顺序调整持久化补充

## 背景意图

- 搜索字段已支持显示/隐藏持久化，但用户仍无法按个人习惯调整搜索项顺序并保持刷新后不变。
- 需要在既有搜索配置能力上补齐“顺序调整 + 持久化回放”。

## 核心技术决策 / 逻辑变更

- 在 `packages/effects/plugins/src/vxe-table/use-vxe-grid.vue` 的搜索配置结构中新增 `fieldOrder`：
  - 保存时将当前弹层列表顺序写入 `fieldOrder`；
  - 加载时按 `fieldOrder` 重排可配置项，再应用显隐。
- 新增 `applySearchFieldOrderToSchema`，在顺序变更后同步重排 `formApi` 的 `schema`，确保页面搜索区展示顺序立即生效。
- 在“搜索项设置”弹层每项增加“上移/下移”按钮，移动后立即触发持久化保存。

## 避坑指南（Gotchas & Constraints）

- 仅重排可配置搜索项，不影响 `hide: true` 或内部 `hidden` 字段的相对位置。
- `fieldOrder` 与 `fieldVisibility` 必须同时持久化，否则会出现“顺序恢复但显隐错位”或相反情况。
- 重排 `schema` 时应保持同一项对象引用，避免字段依赖与默认值状态意外重建。
