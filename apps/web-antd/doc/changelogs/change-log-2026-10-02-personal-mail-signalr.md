# 个人邮箱新邮件 SignalR 提醒

TAPD：[1161580498001000198](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000198) 第四节

## 背景意图

新邮件由后台检查后推给在线的邮箱本人。前端不再每分钟轮询收件箱来发现新邮件。

## 核心逻辑变更

- 登录时保存 `encryptedAccessToken`。有查看邮件权限后连接 `/signalr?enc_auth_token=`，自动重连，退出时断开。不连接 `/chathub`。
- 监听 `personalMail.received`。只展开全局邮件图标上的面板，不再另弹一条「新邮件」通知。点面板里的邮件按 `folderName` + `uid` 打开。正在看收件箱第一页且没有搜索时刷新列表和未读数。
- 个人中心邮箱配置展示 `watchState`：暂停时提示重新填写授权码，连续失败时显示失败原因。

## 涉及文件

- `packages/stores/src/modules/access.ts`
- `apps/web-antd/src/store/auth.ts`
- `apps/web-antd/src/components/personal-mail-float/`
- `apps/web-antd/src/views/_core/profile/mail-account-setting.vue`
- `apps/web-antd/vite.config.mts`
