# 个人邮箱收件箱一键已读

## 背景意图

未读要一封封打开或勾选后才能标已读，收件箱多的时候太慢。

## 核心逻辑变更

- 收件箱列表增加「一键已读」。确认后按未读把序号取全，再调用 `SetReadAsync`，每批最多 500 封。
- 没有未读时按钮不可点。其他文件夹不显示。

## 涉及文件

- `views/personal-mail/components/mail-list-pane.vue`
- `views/personal-mail/composables/use-personal-mail.ts`
- `views/personal-mail/index.vue`
