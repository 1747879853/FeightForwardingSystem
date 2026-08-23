# 新增小程序端 `apps/mp`：监装师傅端第一期

## 背景意图

监装工单的管理端（海运出口编辑页 Tab）已经落地，但师傅侧的认领、改箱号封号、拍照、完成一直只能靠线下。后端师傅端接口 `/api/services/app/LoadingOrder` 与微信小程序登录接口 2026-08 已就绪，本次在本仓库补上小程序工程与第一期页面。

与既有文档的差异：`doc/plans/tapd-1000122-loading-supervision/05-监装工单.md` 当时写的是「小程序不在本仓库」，本次起小程序进入本仓库 `apps/mp`，该结论作废。

## 核心逻辑变更

### 工程

- 新增 `apps/mp`（包名 `@vben/mp`），uni-app Vue 3 + Vite + TypeScript，纳入 pnpm workspace。
- **默认构建不带它**：包内只有 `dev:mp-weixin` / `build:mp-weixin` / `typecheck`，没有 `build` 与 `dev` 脚本，所以 `pnpm build`、`pnpm dev` 不会触发；`pnpm check:type` 会带上它。
- 不依赖任何 `@vben/*` 包与 Ant Design Vue；页面按 Figma 手写，弹层/图标用 `wot-design-uni`。
- `vite` 锁 `5.2.8`（`@dcloudio/vite-plugin-uni` 的 peer 要求），与根目录 `vite 7` 各自独立。

### 业务

- 三个分段对应师傅端状态：新派=待认领(1)、进行中=已认领(2)、已完成=复用(3)，共用 `GetMyPagedListAsync`，只换 `status`。
- 详情三张卡（基本信息 / 监装要求 / 集装箱要求）按设计稿；在稿子只读版式之上按状态加底部操作条：
  - 待认领 → 认领
  - 已认领 → 拒接（必填原因）、保存（箱号/封号/完成勾选/照片一次性提交）
  - 已完成 → 取消完成
- 监装照片：点表格里的「监装图片」弹出该箱面板，按 `attachmentGroups` 的附件明细类型分组；没有类型时落到一个默认组。上传只拿 `attachmentId`，真正落库在页底「保存」。
- 登录：启动走 `WxOpenSilentAuthenticate`，`shouldBindingUser` 时才展示手机号一键登录按钮；`.env` 的 `VITE_ENABLE_PASSWORD_LOGIN` 控制开发态账密入口。
- 底栏四个 Tab 全做：首页、内部首页（监装列表）、积分兑换、个人中心；首页与积分兑换本期是占位页。

## 避坑指南

- **不要引 `json-bigint`。** 它依赖 `bignumber.js`，小程序打包会外部化成 `require('bignumber.js')` 而运行时找不到，构建不报错、进小程序才白屏。雪花 ID 精度改由 `src/utils/safe-json.ts` 处理：先把超出安全范围的整数字面量加引号再 `JSON.parse`。ID 到前端仍是 string，禁止 `Number()`。
- **`attachmentGroups` 是按箱全量替换。** 保存时必须把该箱当前全部分组带上，漏传某组等于把该组照片删掉，所以 `toCtnEditPayload` 一律提交全量。
- **取消完成不会重置各箱的 `isLoadingCompleted`。** 取消后若不手动取消至少一个箱的勾选，下次保存会立刻再次自动完成，页面已加弹窗提示。
- **`inset: 0` 不能用。** stylelint 的 `declaration-block-no-redundant-longhand-properties` 会把遮罩的 top/right/bottom/left 合并成 `inset`，旧版小程序 webview 不认，遮罩塌成 0 尺寸导致弹层「点了没反应」。已在根 `stylelint.config.mjs` 对 `apps/mp` 关掉该规则，同时关掉 `declaration-property-value-no-unknown`（不认 `rpx`）与放宽 `selector-type-no-unknown`（`page`/`view`/`text`/`image`）。
- **`vite.config.ts` 要手动取 `default`。** 包是 `"type": "module"`，而 `@dcloudio/vite-plugin-uni` 是 CJS，直接 `import uni from` 会报 `uni is not a function`。
- **列表接口不返回箱型**，所以卡片上的「箱型箱量」拿不到，目前退回展示「明细包装\*件数」；箱型只在详情里有。
- 权限口径本期仍按**用户属性**（`userAttribute` 含监装 512），后端师傅端六个接口都只校验它、不校验权限码。前端捕获「用户属性不包含监装」把内部首页整页降级为无权限提示，不弹 Toast。
- 小程序租户由服务端写死（`WxOpenConfig.TenantId = 1`），前端不能传租户，多品牌需要另配 AppId 与独立打包。
- `manifest.json` 的 `appid` 留空，需要填真实小程序 AppId；`.env.production` 的 `VITE_API_ORIGIN` 必须换成已在小程序后台登记的 https 合法域名。
