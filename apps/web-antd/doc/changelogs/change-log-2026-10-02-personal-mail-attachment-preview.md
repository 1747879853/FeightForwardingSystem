# 个人邮箱附件预览

## 背景意图

邮件附件只能下载，图片和 PDF 也要先存到本地才能看。

## 核心逻辑变更

- 点附件卡片先下载文件流，再用全站附件查看器预览。图片、PDF、docx、xlsx、pptx 在弹窗里打开。
- 卡片右侧仍是下载。同一附件在预览或下载结束前不会再发起一次请求。

## 涉及文件

- `views/personal-mail/components/mail-reading-pane.vue`
- `views/personal-mail/composables/use-personal-mail.ts`
- `views/personal-mail/index.vue`
