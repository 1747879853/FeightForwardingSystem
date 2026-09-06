# 监装小程序详情支持堆场一键导航（腾讯地理编码）

## 背景意图

师傅到堆场监装需要导航。船公司堆场子表已有中文 `address`，师傅端详情原先只展示堆场名。本期用已绑定小程序 AppID 的腾讯位置服务 Key，在点击「导航」时把地址编成经纬度，再调微信 `openLocation` 打开地图。

## 核心逻辑变更

- 接入腾讯微信小程序 JS SDK（`apps/mp/src/libs/qqmap-wx-jssdk*.js`），仅调用 `geocoder`。
- 新增 `utils/yard-nav.ts`：优先用 `carrierYard.address` 编码，没有地址时退回名称并提示补全；同一地址进程内缓存；成功后 `uni.openLocation`。
- 详情「监装堆场」行增加「导航」按钮（有名称或地址才显示）。
- `manifest.json` 声明 `openLocation`；`.env` 增加 `VITE_QQMAP_KEY`（需自行填 Key）。
- 类型补齐 `CarrierYardSimpleDto.address`（后端简易对象本已有该字段）。

## 控台与后台配置（上线前必做）

1. 腾讯位置服务：Key 类型为微信小程序，绑定 AppID `wx9cf70b3653f871e7`，开通**地理编码 / WebServiceAPI**。
2. 微信公众平台 → 开发设置 → request 合法域名：`https://apis.map.qq.com`。
3. 用户隐私保护指引：收集「位置信息」，用途写「打开堆场地图导航」。
4. 将 Key 写入 `apps/mp/.env.development` 与 `.env.production` 的 `VITE_QQMAP_KEY`。

## 避坑指南

- Key 只给腾讯 SDK，**不要**指望传给 `openLocation`；微信导航 API 不吃 Key。
- 堆场地址请在船公司资料填**完整中文地址**（含省市），不要贴高德/腾讯分享短链。
- 本期不落库经纬度；每次导航（同地址有缓存）都会调腾讯编码，配额与域名未配时会失败并 toast。
- 官方 SDK zip 下载链不稳定，仓库内 vendored 自 npm `qqmap-wx-jssdk@1.0.0`。
