---
title: 未保存内容离开拦截（全局工具）
module: 共享能力
author: auto-doc-sync
last_updated: 2026-07-14
---

# 1. 业务背景说明 (Background)

**白话解释：** 页面（尤其录入/编辑类）有未保存修改时，用户切换标签页、点菜单跳转、浏览器后退或关闭当前标签，若直接离开会丢失已填内容。本工具把「拦截跳转 + 二次确认」沉淀成全站可复用的组合式函数：页面只需提供一个"是否脏"的判断函数，即可在离开前弹出「有未保存的内容」确认框，确认才放行、取消则留在原页。

对应 TAPD 缺陷 `#1161580498001000498`【海运出口】页面切换时需要保留数据（改为"拦截离开"而非"缓存数据"）。

# 2. 功能与操作说明 (Features & Operations)

- **页面接入：** 在组件里调用 `useUnsavedGuard({ isDirty })` 即可。挂载自动登记、卸载自动注销；`keep-alive` 缓存页失活自动暂停、激活自动恢复。
- **二次确认：** 存在未保存内容时离开，弹 `Modal.confirm`（默认文案取 `common.unsavedLeaveTitle/unsavedLeaveContent/leave`），确认离开、取消留在本页。
- **覆盖范围：** 所有走 vue-router 的导航——切换多标签页、点击菜单、浏览器前进/后退、关闭当前标签页（内部 `router.replace`）。
- **暂不覆盖：** 点标签「X」/右键"关闭"（需改框架包 tabbar 关闭时序）、浏览器刷新/关闭标签（`beforeunload` 原生提示）。

# 3. API 与接入协议

**文件：** `apps/web-antd/src/composables/use-unsaved-guard.ts`

| 导出 | 说明 |
| :-- | :-- |
| `useUnsavedGuard(options)` | 页面级组合式函数（首选）。`options.isDirty: () => boolean \| Promise<boolean>` 必填；`enabled?: MaybeRefOrGetter<boolean>` 控制是否生效；`title/content/okText/cancelText?` 覆盖默认文案。返回 `{ unregister }`。 |
| `setupUnsavedNavigationGuard(router)` | 安装全局 `router.beforeEach`，在 `router/guard.ts` 的 `createRouterGuard` 中**最先**注册。 |
| `registerUnsavedGuard(entry)` | 低阶注册 API，返回注销函数；一般无需直接使用。 |

接入示例：

```ts
// 独立页面表单
useUnsavedGuard({ isDirty: isFormDirty });

// 同一组件既做独立页又被嵌入时，仅独立页生效
useUnsavedGuard({ isDirty: isFormDirty, enabled: () => !props.embedded });

// 父容器代理子表单脏状态（子组件 defineExpose isFormDirty）
useUnsavedGuard({ isDirty: () => formRef.value?.isFormDirty?.() });
```

# 4. 核心机制说明

| 机制 | 说明 |
| :-- | :-- |
| **全局注册表** | 模块内 `Map<symbol, entry>` 收集各页面的脏检查；全局守卫遍历"生效且脏"的第一条命中即拦截。 |
| **生效判定 `active()`** | `paused`（keep-alive 失活）为真 → 不生效；否则读 `enabled`（缺省 true）。 |
| **并发保护** | `confirming` 标志确保同一时刻只弹一个确认框；确认弹出期间新的导航请求直接阻断。 |
| **同路径放行** | `to.path === from.path`（仅 query/hash 变化）不视为离开，不拦截。 |
| **异常兜底** | `isDirty` 自身抛错时不拦截，避免把用户卡在页面上。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：脏检查必须有基线]** `isDirty` 常用"初始快照 vs 当前值"实现。页面初始化（含新建态空白/编辑态回填）末尾必须建立一次基线，否则守卫恒判"未脏"，永不弹窗。

> [!IMPORTANT] **[卡点 4：快照比对必须归一化空值]** 若用 `JSON.stringify` 做快照比对，`undefined`/`null`/`''` 序列化结果不同（`undefined` 会丢 key）。文本字段"输入后又删空"会在三态间漂移，导致改回原状仍被误判为脏。比对前须把三种空值归一等价（参考海运出口 `normalizeForDirtyCheck`）；`0`/`false` 不是空值需保留。

> [!IMPORTANT] **[卡点 2：保存后跳转会被误拦]** 保存成功后若还要 `router.push/replace` 到别的路由，须先把基线刷新到已保存值（或重置脏态），否则这条正常跳转会被拦。

> [!IMPORTANT] **[卡点 3：关闭标签 X 的时序（未覆盖）]** `tabbar` store `closeTab` 先删 tab 再 `router.replace`。仅靠 `beforeEach` 拦"点 X"会出现"tab 已删、页面仍停留"的不一致，需改 `packages/effects/layouts` 在删 tab 前先确认。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-14 | `Fix` | 接入方（海运出口）修复「文本删空恢复原状仍被拦截」；补充卡点 4：快照比对须归一化空值。 | 根因是裸 `JSON.stringify` 对 `undefined`/`null`/`''` 序列化不一致。工具本身不变，脏检查归一化由各接入页负责（海运出口 `normalizeForDirtyCheck`）。 |
| 2026-07-14 | `Feature` | 新增全局「未保存内容离开拦截 + 二次确认」工具，覆盖切标签/菜单跳转/后退/关闭当前标签；首个接入方为海运出口新建页与编辑工作台。对应 TAPD `#1161580498001000498`。 | 新建 `composables/use-unsaved-guard.ts`（注册表 + 全局 `beforeEach` + `useUnsavedGuard`），在 `router/guard.ts` 最先注册；文案入 `packages/locales` 的 `common.json`。keep-alive 通过 `onActivated/onDeactivated` 暂停/恢复，避免后台缓存页误拦其它页面间跳转。 |
