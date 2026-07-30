# jiayue/demo 登录背景视频改为共用 jht 资源

## 背景意图

- demo、jiayue 打包后登录页无背景视频。
- 根因：`brand-assets.ts` 中 jiayue（demo 的 `VITE_APP_BRAND` 亦为 `jiayue`）指向 `https://oss.jiayuebetter.com/login-back.mp4`，该对象已从 OSS 下线（404）；jht 使用的 `jht-login-back.mp4` 可正常访问。

## 核心逻辑变更

- `src/utils/brand-assets.ts`：将 jiayue 品牌登录视频 OSS 地址改为与 jht 相同的 `jht-login-back.mp4`。
- 同步更新品牌素材 README 与 `doc/guides/brand-dev-build-commands.md` 映射表。

## 避坑指南

- demo 环境不单独定义品牌枚举，素材跟随 `VITE_APP_BRAND=jiayue`；改视频映射时改 jiayue 即可覆盖 demo。
- 更换登录视频时先用 HEAD 请求确认 OSS 对象存在，避免打包后静默黑底。
