# 小程序填入津海通 AppId

## 背景意图

`apps/mp` 的 `manifest.json` 原先 AppId 为空，微信开发者工具无法登录、`wx.login` 拿不到 code。本次按津海通小程序填写 AppId，便于本地编译导入开发者工具。

## 核心逻辑变更

- `apps/mp/src/manifest.json` 的根 `appid` 与 `mp-weixin.appid` 均填入津海通小程序 AppId。
- AppSecret **不进前端仓库**：换 `code`、取 `access_token` 由后端表 `App_WeixinAccessTokens`（`AppType=0` 小程序）提供，忘了插行时登录会报「系统未配置小程序的微信应用」。

## 避坑指南

- 微信开发者工具导入的是编译产物 `apps/mp/dist/dev/mp-weixin`，改完 `manifest.json` 后需重新跑 `pnpm --filter @vben/mp run dev:mp-weixin`。
- 多品牌仍是各自 AppId、各自打包；当前工程只挂一个 AppId，本次按津海通。
