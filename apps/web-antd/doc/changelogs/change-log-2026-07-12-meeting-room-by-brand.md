# 在线会议会议号按品牌环境区分

## 背景意图

顶栏「进入会议」跳转 [佳越会议](https://test.jiayuebetter.com/) 时，不同客户品牌需进入各自会议号，避免津海通与浩瀚远洋/佳越共用同一房间。

## 核心逻辑变更

`apps/web-antd/src/layouts/basic.vue` 中 `MEETING_ROOM` 改为按 `VITE_APP_BRAND`（`isJhtBrand`）取值：

| 品牌     | `VITE_APP_BRAND` | 会议号   |
| :------- | :--------------- | :------- |
| 津海通   | `jht`            | `999999` |
| 浩瀚远洋 | `hhyy`           | `123456` |
| 佳越软件 | `jiayue`         | `123456` |

会议地址、密码不变：`https://test.jiayuebetter.com/index.html`，密码 `jiayueruanjian`；昵称仍取当前登录用户姓名。

## 避坑指南

- 本地验证需用对应启动命令切换品牌（如 `pnpm build:jht` / `pnpm dev:hhyy` / 默认 `pnpm dev`），仅改代码不切换 env 看不到不同会议号。
- 若后续再增品牌，勿默认落到 `123456` 而不显式配置，以免误入公共房间。
