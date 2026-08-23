---
title: 未保存内容离开拦截（全局工具）
module: 共享能力
author: auto-doc-sync
last_updated: 2026-08-23
---

# 1. 业务背景说明 (Background)

**白话解释：** 页面有未保存修改时，切标签/点菜单/后退先二次确认；确认后页面可 KeepAlive，回来草稿还在。点 X 关闭才销毁并丢失。刷新走浏览器原生提示。

对应 TAPD `#1161580498001000498` 最初只做拦截；2026-08-23 起与详情页缓存一起用。

# 2. 功能与操作说明 (Features & Operations)

- **页面接入：** 在组件里调用 `useUnsavedGuard({ isDirty })` 即可。挂载自动登记、卸载自动注销；`keep-alive` 缓存页失活自动暂停、激活自动恢复。
- **二次确认：** 切走用 `unsavedLeave*`（切换后可回来继续编辑）；点 X 用 `unsavedClose*`（关闭后将丢失）。
- **覆盖范围：** vue-router 导航（切标签/菜单/前进后退）；单个关闭标签（点 X / 右键「关闭」）在删 tab 前确认；当前页脏时 `beforeunload`。
- **暂不覆盖：** 右键关其它/左侧/右侧/全部；sessionStorage 草稿恢复。

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

> [!IMPORTANT] **[卡点 3：关闭标签须先确认再删 tab]** `closeTab` 先走 `setBeforeCloseTabHandler`（按 tabKey 查脏，后台缓存页也问），确认后再 `_close`。确认关当前页后把 key 放入 `closeConfirmedTabKeys`，避免随后 `router.replace` 再弹「切走」文案。关其它/左右/全部仍不查脏。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-23 | `Feature` | 切走与点 X 文案分开；单个关标签先确认再销毁；当前页脏时 `beforeunload`；按 tabKey 查后台缓存页脏状态。 | `setBeforeCloseTabHandler` 挂在 `closeTab`；KeepAlive 失活仍保留 tabKey 登记。详见 `changelogs/change-log-2026-08-23-detail-keep-alive-unsaved.md`。 |
| 2026-07-14 | `Fix` | 接入方（海运出口）修复「文本删空恢复原状仍被拦截」；补充卡点 4：快照比对须归一化空值。 | 根因是裸 `JSON.stringify` 对 `undefined`/`null`/`''` 序列化不一致。工具本身不变，脏检查归一化由各接入页负责（海运出口 `normalizeForDirtyCheck`）。 |
| 2026-07-14 | `Feature` | 新增全局「未保存内容离开拦截 + 二次确认」工具，覆盖切标签/菜单跳转/后退/关闭当前标签；首个接入方为海运出口新建页与编辑工作台。对应 TAPD `#1161580498001000498`。 | 新建 `composables/use-unsaved-guard.ts`（注册表 + 全局 `beforeEach` + `useUnsavedGuard`），在 `router/guard.ts` 最先注册；文案入 `packages/locales` 的 `common.json`。keep-alive 通过 `onActivated/onDeactivated` 暂停/恢复，避免后台缓存页误拦其它页面间跳转。 |
