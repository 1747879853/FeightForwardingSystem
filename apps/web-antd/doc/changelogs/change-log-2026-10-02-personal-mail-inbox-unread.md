# 个人邮箱收件箱显示未读数

## 背景意图

收件箱目录上的数字是收到的总封数，看不出还有多少封没读。

## 核心逻辑变更

- 收件箱后面改为当前未读封数，没有未读时显示 0。
- 草稿箱、已发送仍是总数，其余文件夹仍是未读数。

## 涉及文件

- `views/personal-mail/mail-format.ts`
- `views/personal-mail/components/mail-folder-nav.vue`
