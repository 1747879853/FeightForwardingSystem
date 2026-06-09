# 模块权限树关键词搜索

## 背景意图

权限配置页「模块权限」Tab 展示全量权限树，节点层级深、数量多，管理员勾选时难以快速定位目标权限。需在树上方提供前端关键词搜索，支持按显示名称与权限码过滤，并保留父级路径便于理解上下文。

## 核心逻辑变更

- `list.vue` 新增 `permissionSearchKeyword` 与 `filterPermissionTree`：对 `name`、`authCode` 做包含匹配（不区分大小写）；命中子节点时保留祖先路径，命中父节点时展示完整子树。
- 过滤结果通过 `filteredPermissions` 传给 `Tree`；有搜索词时使用 `:key` 重挂载并 `defaultExpandedLevel=99` 自动展开；无结果时显示「未找到匹配的权限」。
- 切换角色/用户、配置对象类型或 Tab 时自动清空搜索词。
- 移除模块权限 Tab 顶部说明文案，搜索框置于原说明位置，「保存」按钮保留右侧。
- 双语 i18n：`searchPlaceholder`、`searchNoResult`。

## 避坑指南

- `checkedPermissions` 与树展示数据解耦，过滤仅影响可见节点，不影响已勾选集合与保存 payload。
- 勿用 `@vben/utils` 的 `filterTree` 直接过滤权限树：该工具只保留自身命中节点，无法保留「子命中、父展示」的路径语义。
