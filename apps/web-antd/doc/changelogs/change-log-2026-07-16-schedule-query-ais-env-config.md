# 船期查询 AIS 定位配置改为环境变量

## 背景意图

船期列表双击行会内嵌飞驼可视化船舶 AIS 定位 Iframe。飞驼的 `key` 属于按环境配置的接入密钥，不应继续留在页面源码常量中维护，因此改为统一读取 Vite 环境变量。

## 核心逻辑变更

- `AIS_IFRAME_CONFIG` 改读 `import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_URL`、`VITE_GLOB_FREIGHTOWER_AIS_CLIENT_ID`、`VITE_GLOB_FREIGHTOWER_AIS_KEY`。
- `.env` 增加飞驼 AIS Iframe 地址、客户账号与密钥占位：
  - `VITE_GLOB_FREIGHTOWER_AIS_URL="https://i.saas.freightower.com/#/ais/vessel"`
  - `VITE_GLOB_FREIGHTOWER_AIS_CLIENT_ID=fdd5679abcb897963`
  - `VITE_GLOB_FREIGHTOWER_AIS_KEY=`
- 弹窗未配置密钥时的提示文案改为指向 `.env` 的 `VITE_GLOB_FREIGHTOWER_AIS_KEY`。

## 避坑指南

- `VITE_GLOB_FREIGHTOWER_AIS_URL` 含 `#` hash 路由，必须用双引号包裹，否则 dotenv 会把 `#/ais/vessel` 当作注释截断。
- 飞驼文档中的 `key` 是商务提供的 Iframe 密钥，不是获取 token 的 `secret`。
- `VITE_` 前缀变量会被前端打包内联，浏览器仍可在 Iframe 地址中看到实际值；本次改动目标是集中配置、支持环境覆盖，不是网络层隐藏。
