# 品牌素材与字体资源

> 原散落在 `src/assets/img/*/README.md` 与 `src/assets/fonts/README.md` 的说明已合并至此。  
> 打包命令与 mode 对照见：[多品牌开发与打包命令对照](./brand-dev-build-commands.md)。

素材物理文件仍在 `src/assets/img/<brand>/`；**说明文档只维护本文件**，勿在素材目录再写 README。

## 字体

阿里巴巴普惠体通过 `src/utils/global-font-loader.ts` 运行时加载：

- `jht`：优先 OSS 私有签名 URL，失败回退固定 OSS 地址
- `hhyy` / `jiayue`：固定 OSS 地址

`src/assets/fonts/` 不再存放本地字体文件，避免被构建打包。

## 通用文件约定

多数品牌使用下列文件名（扩展名可能是 `.png` / `.webp`）：

| 文件 | 用途 |
| :-- | :-- |
| `logo` | 侧栏 / 系统偏好方形 Logo |
| `logo-text` | 首屏 Loading、路由切换 Loading（部分品牌兼顶栏） |
| `logo-login` | 登录页 `auth-title-logo` |
| `favicon` | 浏览器标签图标（可选；缺省回退 `public/favicon.png` 或 `logo`） |

登录页背景视频一般为固定 OSS 地址，不再使用本地 `login-back.mp4`。

## 各品牌素材目录

路径均相对 `apps/web-antd/src/assets/img/`。

### 佳越（`jiayue/`）— 本地默认 / jytest / demo / 佳越标准库

- 命令：`pnpm dev` / `pnpm dev:antd`、`pnpm dev:antd:jytest`、`pnpm build:antd:jiayue` 等
- `VITE_APP_BRAND=jiayue`；开发默认标题「佳越测试」
- 文件：`logo.webp`、`logo-text.webp`、`logo-login.webp`（来源 `@vbenjs/static-source` 的 `logo-v1.webp`）
- 登录背景暂与 jht 共用 OSS 视频

### 浩瀚远洋（`hhyy/`）

- 命令：`pnpm dev:antd:hhyy` / `pnpm build:antd:hhyy`
- `logo.png`、`logo-text.png`、`logo-login.png`、`favicon.png`

### 津海通（`jht/`）

- 命令：`pnpm build:antd:jht` / `pnpm dev:antd:jht`
- `logo.png`、`logo-text.png`、`logo-login.png`、`favicon.png`
- `logo-text` 建议透明底 PNG（深蓝/彩色 Logo 与默认黑底渐变滤镜表现不同）

### 世纪通达（`sjtd/`）

- 命令：`pnpm build:antd:sjtd` / `pnpm dev:antd:sjtd`
- `logo.png`、`logo-text.png`、`logo-login.png`、`favicon.png`
- 登录背景暂复用 hhyy OSS；可单独上传 `sjtd-login-back.mp4` 后改 `brand-assets.ts`

### 青港（`qinggang/`）

素材提取自《青港logo总.pdf》第 1 页（位图，非矢量）。

| 文件               | 尺寸     | 用途                    |
| :----------------- | :------- | :---------------------- |
| `logo.png`         | 432×432  | 方形图标                |
| `logo-text.png`    | 235×54   | 彩色横版加载            |
| `logo-login.png`   | 2170×725 | 登录页（左图标 + 白字） |
| `logo-stacked.png` | 380×576  | 竖版备用                |
| `logo-dark.png`    | 560×160  | 黑底亮蓝横版备用        |

系统配置已引用前三个；后两个为备用。`logo-text` / `logo-login` 含真实 Alpha。

### 青岛海鼎（`qdhd/`）

| 文件             | 尺寸   | 用途                    |
| :--------------- | :----- | :---------------------- |
| `logo.png`       | 97×54  | 独立图形                |
| `logo-text.png`  | 235×54 | 图形 + OVERSEAS，加载页 |
| `logo-login.png` | 613×88 | 登录页                  |

尺寸对齐 hhyy 槽位。

### 山东金冠（`sdjg/`）

- `logo.png` 97×54、`logo-text.png` 235×54、`logo-login.png` 613×88、`logo-stacked.png`（备用）
- 前三项尺寸与 hhyy 一致，品牌配置已引用

### 其他品牌目录

`longshan/` 等以 `brand-dev-build-commands.md` 命令表为准；替换素材时保持上述文件名约定。

## Changelog

| 日期       | 说明                                           |
| :--------- | :--------------------------------------------- |
| 2026-09-12 | 合并各品牌 img README 与 fonts README 至本指南 |
