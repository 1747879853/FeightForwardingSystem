# 监装小程序详情支持堆场一键导航（腾讯地理编码）

## 背景意图

师傅到堆场监装需要导航。船公司堆场子表已有中文 `address`，师傅端详情原先只展示堆场名。本期用已绑定小程序 AppID 的腾讯位置服务 Key，在点击「导航」时把地址编成经纬度，再调微信 `openLocation` 打开地图。

## 核心逻辑变更

- `utils/yard-nav.ts`：`uni.request` 直调腾讯 WebService 地理编码（`/ws/geocoder/v1/`），优先用 `carrierYard.address`，没有地址时退回名称并提示补全；同一地址进程内缓存；成功后 `uni.openLocation`。不再运行时依赖 qqmap CJS SDK（Vite 下易踩 default 导出问题；SDK 文件仍保留备用）。
- 详情「监装堆场」行增加「导航」按钮（有名称或地址才显示）。
- `manifest.json` 不把 `openLocation` 写进 `requiredPrivateInfos`（微信白名单无此项，写了会报 app.json 错误）；本期也不调 `getLocation`，故不声明 `scope.userLocation`。`.env` 增加 `VITE_QQMAP_KEY`（需自行填 Key，勿提交仓库）。
- 类型补齐 `CarrierYardSimpleDto.address`（后端简易对象本已有该字段）。

## 控台与后台配置（上线前必做）

1. 腾讯位置服务：Key 类型为微信小程序，绑定 AppID `wx9cf70b3653f871e7`，勾选并保存 **WebServiceAPI**。
2. **配额管理**：给该 Key 的「地址解析」分配日调用量（账户有免费额度 ≠ Key 已分配；`limit_pv=0` 时会误报每日上限）。
3. 微信公众平台 → 开发设置 → request 合法域名：`https://apis.map.qq.com`。
4. 将 Key 写入 `apps/mp/.env.development` 与 `.env.production` 的 `VITE_QQMAP_KEY`，改后须重启 `dev:mp-weixin`。

## 避坑指南

- Key 只给腾讯 WebService，**不要**指望传给 `openLocation`；微信导航 API 不吃 Key。
- 堆场地址请在船公司资料填**完整中文地址**（含省市），不要贴高德/腾讯分享短链。
- 本期不落库经纬度；同地址有内存缓存。真机冷启动无缓存时更易暴露配额/域名问题。
- 响应头 `X-LIMIT` 的 `limit_pv=0` 表示 Key 未分配额度，不是「平台日配额真满」。
