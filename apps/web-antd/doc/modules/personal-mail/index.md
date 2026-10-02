---
title: 个人邮箱
module: 个人邮箱
author: frontend
last_updated: 2026-10-02
---

# 1. 业务背景说明 (Background)

每个人把自己的邮箱接进系统：在个人中心配置一次，之后在「个人邮箱」里看文件夹、读信、写信、回复、转发、存草稿，以及标记已读、移动、删除。邮件内容不落在本系统，每次向邮箱服务器实时读取。

配置和收发分开：

- 个人中心「邮箱配置」：我的邮箱列表、新增、修改、删除，以及测试连接。有 `Admin.PersonalMail` 才能看见。
- `/personal-mail`：其余收发和整理。菜单按 `Admin.PersonalMail` 或 `Admin.PersonalMail.Get` 显示，按钮按各自叶子权限显隐。

本期每人只能配置一个邮箱，收发接口不传 `mailAccountId`。

# 2. 功能与操作说明 (Features & Operations)

| 项目 | 内容 |
| :-- | :-- |
| 邮箱页 | `/personal-mail`，路由名 `PersonalMail` |
| 配置页 | `/profile?tab=mail` |
| 接口 | `src/api/personal-mail/personal-mail-admin.ts`，前缀 `/services/app/PersonalMailAdmin/`，方法名保留 `Async` |
| 后端文档 | `doc/个人邮箱/个人邮箱模块接口文档.md` |

邮箱页是三栏：文件夹、列表、阅读窗。宽度不够时先显示列表，点开后再看正文。写信盖在当前页上。正文放进带 sandbox 的 iframe，不使用 `v-html`。附件列表去掉内嵌图片。下载用文件流，文件名用详情里的 `fileName`。

草稿箱里点开一封信直接进入编辑，详情请求 `markAsRead: false`。回复、转发直接发送走对应接口，原文由后端拼。写到一半改存草稿时，前端把引用拼进正文；回复草稿另传 `inReplyToMessageId`。移动后刷新列表，因为 `uid` 会变。不在已删除夹里删除是移入已删除；已在已删除夹，或选择彻底删除，会二次确认。

文件夹每次进入页面重新拉取，不做长期缓存，也不定时轮询。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 动作 | 结果 |
| :-- | :-- | :-- |
| 未配置邮箱 | 打开邮箱页 | 空状态。有配置权限时跳到个人中心邮箱页签 |
| 无邮箱配置 | 进入邮箱配置 | 新增 |
| 已有一条配置 | 进入邮箱配置 | 编辑，密码留空表示不改 |
| 未读 | 打开详情 | 标为已读（草稿除外） |
| 普通文件夹 | 删除 | 移到已删除 |
| 已删除夹，或选择彻底删除 | 删除 | 不可恢复 |

# 4. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] 定位一封邮件必须成对使用列表返回的 `folderName` 和 `uid`。文件夹参数传 `fullName`。

> [!IMPORTANT] 发信附件不走系统上传。文件转成 base64 后去掉 `data:` 前缀，合计不要超过约 20MB。正文插图用 data URI，编辑器在邮箱页切到 base64 模式。

> [!IMPORTANT] 个人信息里的邮箱和邮箱密码仍属于 `UserAdmin`，和个人邮箱配置不是同一份数据。
