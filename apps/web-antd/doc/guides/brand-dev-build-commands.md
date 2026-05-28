# 多品牌开发与打包命令对照

开发与打包均通过 **Vite `--mode`** 加载对应 `.env.*`，并由 `VITE_APP_BRAND` 切换素材目录与缓存命名空间。

## 命令对照（仓库根目录）

| 公司/场景 | 开发 | 打包 | Vite mode | 素材目录 |
| --- | --- | --- | --- | --- |
| 佳越软件（本地默认） | `pnpm dev:antd` 或 `pnpm dev:antd:jiayue` | 一般不单独打包 | `development` | `src/assets/img/jiayue/` |
| 浩瀚远洋 | `pnpm dev:antd:hhyy` | `pnpm build:antd:hhyy` | `hhyy` | `src/assets/img/hhyy/` |
| 津海通 | `pnpm dev:antd:jht` | `pnpm build:antd:jht` | `jht` | `src/assets/img/jht/` |

`pnpm build:antd` 与 `pnpm build:antd:hhyy` 等价（浩瀚远洋）。

## CI / GitHub Actions

- `.github/workflows/deploy-web-antd-iis.yml`：默认 `pnpm build:antd:hhyy` 构建并发布 IIS。
- 津海通（jht）**不在 CI 中打包**，本地执行：`pnpm build:antd:jht`。

## 环境文件

| 文件               | 说明                                           |
| ------------------ | ---------------------------------------------- |
| `.env.development` | 佳越软件：`VITE_APP_BRAND=jiayue`              |
| `.env.hhyy`        | 浩瀚远洋                                       |
| `.env.jht`         | 津海通                                         |
| `.env.production`  | 与 `hhyy` 保持一致（兼容旧 `production` mode） |

## 缓存隔离

各品牌 `VITE_APP_NAMESPACE` 不同（如 `vben-web-antd-hhyy`），Pinia、偏好设置及业务 localStorage 均不会串库。切换品牌后若界面异常，可清空当前站点 localStorage。
