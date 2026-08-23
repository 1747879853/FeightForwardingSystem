# @vben/mp - 货代小程序

uni-app（Vue 3 + Vite + TypeScript）小程序工程。**第一期只做监装师傅端**，挂在底栏「内部首页」。

管理端在 `apps/web-antd`，两者不共享代码，只共享后端接口口径。

## 跑起来

```bash
# 安装（仓库根目录）
pnpm install

# 微信小程序开发编译（产物 apps/mp/dist/dev/mp-weixin）
pnpm --filter @vben/mp run dev:mp-weixin

# 打包（产物 apps/mp/dist/build/mp-weixin）
pnpm --filter @vben/mp run build:mp-weixin
```

然后用微信开发者工具导入 `apps/mp/dist/dev/mp-weixin`（或 `dist/build/mp-weixin`）。

本包**不参与**根目录的 `pnpm build` 与 `pnpm dev`（包内没有 `build` / `dev` 脚本），但会参与 `pnpm check:type`（`typecheck` 脚本）。

## 跑之前要配的

| 位置 | 配什么 | 不配的后果 |
| --- | --- | --- |
| `src/manifest.json` 的 `appid` / `mp-weixin.appid` | 真实小程序 AppId | 开发者工具无法登录、`wx.login` 拿不到 code |
| `.env.development` 的 `VITE_API_ORIGIN` | 后端根地址（不带 `/api`） | 所有接口 404 |
| `.env.production` 的 `VITE_API_ORIGIN` | 已在小程序后台登记的 **https** 合法域名 | 真机请求被拦 |
| 微信开发者工具 → 详情 → 本地设置 | 勾「不校验合法域名」 | 开发态连 http 后端会被拦 |

开发态账密登录入口由 `VITE_ENABLE_PASSWORD_LOGIN` 控制，正式包必须为 `false`。

## 目录

```
src/
  api/            请求封装与接口（request / auth / user / loading-order / upload）
  components/     ctn-photo-panel.vue 分组照片面板
  pages/
    home/         首页（占位）
    loading/      list 列表、detail 详情
    login/        登录
    points/       积分兑换（占位）
    profile/      个人中心
  stores/auth.ts  会话状态（静默登录 / 手机号绑定 / 账密 / 登出）
  utils/          format 展示格式化、ctn-model 箱型编辑模型、safe-json 雪花 ID 安全解析
  static/         Figma 导出的图标与插图
```

## 几条必须知道的

- **雪花 ID 一律当 string。** 走 `utils/safe-json.ts` 解析，禁止 `Number(id)`。不要引 `json-bigint`——它依赖的 `bignumber.js` 在小程序里会变成找不到的 `require`，构建不报错、运行才炸。
- **照片按箱全量替换。** 保存时必须带上该箱当前全部 `attachmentGroups`，漏传等于删照片。
- **取消完成不会清各箱的完成勾选**，不手动取消至少一个箱就保存会立刻再次自动完成。
- **别用 `inset: 0`**，旧版小程序 webview 不支持，遮罩会塌成 0 尺寸。根 `stylelint.config.mjs` 已对本包关掉相关自动合并规则。
- **租户写死为 1**，微信登录不接受前端传租户；多品牌要各自 AppId 与独立打包。

## 已知待补

- 底栏图标只有一套（Figma 只给了当前选中态那一版），选中/未选中暂时共用同一张，仅文字变色。
- 列表接口不返回箱型，卡片上的「箱型箱量」暂以「明细包装\*件数」代替；箱型只在详情里有。
