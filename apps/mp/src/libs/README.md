# 腾讯位置服务微信小程序 JS SDK

本目录原接入腾讯微信小程序 JS SDK（`geocoder`）。堆场导航已改为 `uni.request` 直调 WebService，避免 Vite 下 CJS `export default` 问题；本目录 SDK 可保留备用。

微信后台须将 `https://apis.map.qq.com` 配为 request 合法域名，Key 须开通地理编码 / WebService，并写入 `VITE_QQMAP_KEY`（改 env 后须重启 `dev:mp-weixin`）。

若仍用本目录 SDK：Vite / uni-app Vue3 只认 ESM，末尾须为 `export default`，否则会报 default is not exported。
