# 个人邮箱列表布局与附件下载反馈

## 背景意图

收件箱、已发送等邮件列表像表单堆叠，层次弱。附件卡片点下去没有反馈，容易连点出多份下载。

## 核心逻辑变更

- 文件夹名与封数单独成标题，搜索改为圆角输入，未读改为胶囊筛选，日期选择器收进同一工具行。
- 列表行改为发件人/时间一行、主题/附件一行；未读用圆点和加粗，当前信左侧主题色条。
- 头像按发件人区分底色。筛选、勾选、搜索、分页行为不变。
- 附件下载中显示「正在下载」和转圈，按钮禁用；同一附件在结束前不会再次请求。

## 涉及文件

- `views/personal-mail/components/mail-list-pane.vue`
- `views/personal-mail/components/mail-reading-pane.vue`
- `views/personal-mail/composables/use-personal-mail.ts`
- `views/personal-mail/index.vue`
