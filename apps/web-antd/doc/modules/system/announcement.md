---
title: 公告管理
module: 公告管理
author: auto-doc-sync
last_updated: 2026-07-11
---

# 1. 业务背景说明 (Background)

**白话解释：** 管理员维护面向内部用户的系统公告，可配置生效时间、富文本内容与附件。拥有公告查看权限的用户登录后，未读且在有效期内的公告会以 Modal 逐条强提醒。侧边栏自「系统管理」子项提升为独立顶级菜单，页面 URL 仍为 `/system/announcement`。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/system/announcement` |
| 路由名称 | `SystemAnnouncement` |
| 页面组件 | `src/views/system/announcement/list.vue` |
| 权限口径 | `Admin.Announcement` / `Admin.Announcement.Get` |
| 关键源码 | `src/router/routes/modules/announcement.ts`<br/>`src/api/system/announcement-admin.ts`<br/>`src/views/system/announcement/`<br/>`src/layouts/basic.vue` |

# 2. 功能与操作说明 (Features & Operations)

- **列表：** 关键字与启用状态筛选；勾选后顶部批量删除；双击行打开 Modal 编辑。
- **新建/编辑：** `name`、`text`（wangEditor）、`enable`、`startTime`/`endTime`、`sortId`、`remark`、`attachments`。
- **登录弹窗：** 进入主布局后自动检测；逐条展示富文本与附件下载；仅「我已阅读」按钮，已读写入 `sessionStorage`（关闭浏览器后会话清空，公告可再次弹出）。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 草稿/停用 | `enable=false` | 用户不可见 | 不参与登录弹窗 |
| 已启用 | `enable=true` 且在有效期内 | 可展示 | 结合未读判断 |
| 未读 | 用户点「我已阅读」 | 已读（本会话） | sessionStorage 记录 readAt |
| 已读后内容变更 | `lastModificationTime` 更新 | 未读 | 再次进入弹窗队列 |
| 浏览器会话结束 | 关闭标签页/浏览器 | 未读 | sessionStorage 清空后重新弹出 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 含义 | 数据来源 | 联动规则 | 校验 |
| :-- | :-- | :-- | :-- | :-- |
| **name** | 公告标题 | 表单 | 弹窗标题 | 必填 |
| **text** | 富文本 HTML | wangEditor | `renderAnnouncementHtml` 消毒并拼接附件 URL 后展示 | 必填（去标签后非空） |
| **enable** | 是否启用 | 表单 Switch | false=不展示 | - |
| **attachments** | 附件 | FileUploadInput | 弹窗底部下载区 | - |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] 无服务端已读接口，已读为前端 `sessionStorage`；同标签页会话内已读后刷新不再弹出，关闭浏览器后会再次弹出。

> [!IMPORTANT] 登录弹窗仅对拥有 `Admin.Announcement.Get` 的用户生效；403 时静默跳过。

# 6. 变更与解析日志 (Change & Parsing Log)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-11 | 重构 | 侧边栏从「系统管理」子项提升为独立顶级「公告管理」 | 新增 `announcement.ts` 路由模块，`order: 9998`；`system.ts` 移除公告子路由 |
| 2026-07-11 | 调整 | 登录弹窗仅保留「我已阅读」，已读改存 sessionStorage | 移除 skip-session；关闭浏览器后会话清空可再弹 |
| 2026-06-23 | 重构 | 新建/编辑改为居中弹窗，排序与备注同列 | 富文本 `autoHeight` 避免与 Modal 滚动条叠加 |
| 2026-06-23 | 重构 | 移除适用部门字段与登录弹窗组织过滤 | 具备查看权限用户可见全部有效未读公告 |
| 2026-06-23 | 修复 | 编辑抽屉生效起始/终止时间无法回显 | 回填前将 ISO 字符串转 `dayjs`，与 Ant Design DatePicker 值类型一致 |
| 2026-06-23 | 修复 | 登录弹窗富文本内图片/链接相对路径无法加载 | `renderAnnouncementHtml` 复用 `buildAttachmentUrl`，与附件预览同一套拼接规则 |
| 2026-06-22 | 功能 | 新增公告管理与登录 Modal 展示 | 展示逻辑挂载 `basic.vue`；过滤工具在 `utils/announcement-filter.ts` 与 `announcement-read-storage.ts` |
