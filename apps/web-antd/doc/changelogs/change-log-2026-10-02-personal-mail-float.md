# 个人邮箱名称、收件数量和全局悬浮框

## 背景意图

邮箱页看不出当前是哪个邮箱，收件箱目录上的数字只在有未读时出现。人在别的模块时，新邮件也没有入口。

## 核心逻辑变更

- 文件夹栏顶部显示当前邮箱名称和地址。
- 收件箱后面的数字改为收到的总封数，0 也显示；草稿箱、已发送仍是总数，其余文件夹仍是未读数。
- 登录后右下角增加邮箱悬浮框。约每分钟拉取一次收件箱；未读变多时自动展开最近几封，点一封进入该邮件。没有配置邮箱时不出现。
- 按住邮箱图标可拖到任意位置，松手后记住，窗口变小时自动收回屏幕内。单击仍是打开或收起。

## 涉及文件

- `components/personal-mail-float/`
- `layouts/basic.vue`
- `views/personal-mail/components/mail-folder-nav.vue`
- `views/personal-mail/index.vue`
- `views/personal-mail/mail-format.ts`
