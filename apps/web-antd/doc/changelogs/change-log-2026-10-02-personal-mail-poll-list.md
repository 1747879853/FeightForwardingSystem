# 个人邮箱定时拉取未读和新邮件

## 背景意图

定时检查只看文件夹未读数，没有按封去取未读和刚到的邮件。

## 核心逻辑变更

- 约每分钟调用 `GetMailPagedListAsync` 两次：一次只看未读，用命中总数更新未读数；一次取收件箱最新一页，用没见过的序号判断新邮件。
- 有新邮件时展开悬浮框。人正在看收件箱第一页且没有搜索条件时，列表跟着刷新。

## 涉及文件

- `components/personal-mail-float/use-personal-mail-float.ts`
- `views/personal-mail/index.vue`
