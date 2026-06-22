# 公告管理与登录弹窗展示

## 背景意图

实现 `AnnouncementAdmin` 后台 CRUD，并在用户登录后通过 Modal 强提醒展示未读有效公告；公告内容支持 wangEditor 富文本与独立附件。

## 核心逻辑变更

- 新增 `src/api/system/announcement-admin.ts` 对接五类管理接口。
- 系统管理新增 `/system/announcement`：Drawer 表单含富文本、部门树、附件；列表支持勾选批量删除与双击编辑。
- 主布局挂载 `AnnouncementLoginModal`：仅 `Admin.Announcement.Get` 用户拉取 `Enable=true` 公告，前端按有效期、部门与 localStorage 未读状态过滤；逐条「我已阅读」或「稍后提醒」（sessionStorage 跳过本会话）。
- 引入 `@wangeditor/editor`、`dompurify`；展示 HTML 经白名单消毒。

## 避坑指南

- 接口无 `isMustRead` 与已读上报：已读依赖 `localStorage`，公告更新后以 `lastModificationTime` 判定需重读。
- 列表项若未返回 `organizationUnits`，部门过滤会按全员处理。
