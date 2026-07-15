# 未保存内容离开拦截全局工具（切标签/菜单跳转二次确认）

对应 TAPD 缺陷 `#1161580498001000498`【海运出口】页面切换时需要保留数据。

## 背景意图

用户在海运出口录入页填完信息未点保存，切换标签页 / 点菜单跳转后再回来，已录内容被清空。经确认采用的处理方式不是"缓存数据"，而是"**有未保存内容时拦截离开并二次确认**"，且要求把「拦截跳转 + 二次确认」沉淀为**可复用的全局工具**，供其它页面接入。

## 核心逻辑变更

### 1. 新增全局工具 `composables/use-unsaved-guard.ts`

- `useUnsavedGuard({ isDirty, enabled?, title?, content?, okText?, cancelText? })`：页面级组合式函数。组件挂载时把自身脏检查登记进全局注册表，卸载时自动注销；被 `keep-alive` 缓存时随 `onDeactivated` 暂停、`onActivated` 恢复，避免后台缓存页误拦其它页面之间的正常跳转。
- `setupUnsavedNavigationGuard(router)`：安装一条全局 `router.beforeEach`。导航前扫描所有"生效且脏"的登记项，命中则弹 `Modal.confirm` 二次确认，用户取消返回 `false` 阻断本次导航。
- `registerUnsavedGuard(entry)`：低阶 API，返回注销函数（一般用不到，优先用 `useUnsavedGuard`）。
- 覆盖范围（仅走 vue-router 的导航）：**切换多标签页**、**点击菜单**、**浏览器前进/后退**、**关闭当前标签页**（内部走 `router.replace`）。本期不含"点 X/右键关闭标签"（需改框架包 tabbar）与浏览器刷新/关闭（`beforeunload`）。

### 2. 路由守卫接入 `router/guard.ts`

`createRouterGuard` 中**最先**注册 `setupUnsavedNavigationGuard(router)`，确保用户取消离开时尽早中断后续（通用/权限）守卫。

### 3. 海运出口接入（示例落地）

- `basic-info-form/form.vue`：`useUnsavedGuard({ isDirty: isFormDirty, enabled: () => !props.embedded })`；`defineExpose` 追加 `isFormDirty`。嵌入编辑工作台时（`embedded`）本页守卫不生效，交由父级统一登记。
- `editor.vue`：`FormExpose` 类型补 `isFormDirty`；`useUnsavedGuard({ isDirty: () => formRef.value?.isFormDirty?.() })`。无论当前停留在哪个内部标签，离开路由都基于基础信息表单脏状态确认。
- `form.vue` `onMounted`：**新建态**补 `syncFormSnapshot()`，为脏检查建立空白基线（原先仅编辑态在 `loadEditData` 末尾建基线，新建态 `formSnapshotJson` 为空导致 `isFormDirty` 恒为 `false`）。
- `use-sea-export-submit.ts`：**新建保存成功后、`router.replace` 跳编辑页前**补 `syncFormSnapshot()`，把基线刷新到已保存值，避免保存后的正常跳转误触发拦截弹窗。

### 4. 文案

`packages/locales` 的 `common.json` 新增 `leave` / `unsavedLeaveTitle` / `unsavedLeaveContent`（zh-CN + en-US），作为二次确认的默认文案。

## 避坑指南

- **脏检查必须有基线**：`isFormDirty` 依赖 `formSnapshotJson` 快照对比，任何"进入即空/进入即回填"的页面都要在初始化末尾调用一次 `syncFormSnapshot()`，否则守卫恒判为"未脏"，永不弹窗。
- **保存后跳转会误拦**：保存成功后若还要 `router.push/replace` 到别的路由，务必先把快照刷新到已保存值（或先重置脏态），否则会拦住这条正常跳转。
- **嵌入组件不要重复登记**：同一份 `form.vue` 既做独立新建页、又嵌入编辑工作台。独立页用 `enabled: () => !props.embedded` 生效，嵌入时由 `editor.vue` 统一登记，避免一个脏状态被登记两次。
- **keep-alive 语义**：`useUnsavedGuard` 依赖 `onActivated/onDeactivated` 暂停后台缓存页的守卫，请在**路由级组件**（或独立页面组件）里调用；若在被 `v-if` 频繁挂卸的深层子组件里调用，暂停语义会与预期不符。
- **关闭标签页时序坑（本期未做）**：`tabbar` store 的 `closeTab` 是"先从 store 删 tab、再 `router.replace`"。若仅靠 `router.beforeEach` 拦截"点 X 关闭"，会出现"tab 已删、页面仍停留"的不一致。要支持该场景须改 `packages/effects/layouts` 在删 tab 前先确认。
