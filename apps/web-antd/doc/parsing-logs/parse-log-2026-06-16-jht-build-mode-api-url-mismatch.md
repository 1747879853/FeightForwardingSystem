# 解析日志：jht 打包 API 地址误用 production 环境

> 日期：2026-06-16  
> 范围：`internal/vite-config/src/utils/env.ts`、`internal/vite-config/src/plugins/extra-app-config.ts`、`apps/web-antd/.env.*`  
> 触发：直接执行 `pnpm vite build --mode jht` 后，产物请求 `118.190.1.4:82` 而非津海通 `43.138.14.122:82`

---

## 解析目标

弄清 `--mode jht` 打包后 API 仍指向浩瀚远洋地址的根因，并给出正确打包方式。

---

## 现象

| 打包命令 | `dist/_app.config.js` 中的 `VITE_GLOB_API_URL` |
| --- | --- |
| `pnpm vite build --mode jht`（直接调用） | `http://118.190.1.4:82/api` ❌ |
| `pnpm build:jht` / `pnpm build:antd:jht` | `http://43.138.14.122:82/api` ✅ |

终端 cwd 为 `apps/web-antd`，命令为 `pnpm vite build --mode jht`，与错误现象一致。

---

## 核心逻辑梳理

### 1. 生产环境 API 来源

运行时通过 `useAppConfig()` 读取 **`window._VBEN_ADMIN_PRO_APP_CONF_`**（即 `dist/_app.config.js`），而非 `import.meta.env`：

```ts
// packages/effects/hooks/src/use-app-config.ts
const config = isProduction
  ? window._VBEN_ADMIN_PRO_APP_CONF_
  : (env as VbenAdminProAppConfigRaw);
```

### 2. `_app.config.js` 的生成链路

`vite:extra-app-config` 插件在 build 阶段调用自定义 `loadEnv()`，将 `VITE_GLOB_*` 变量写入 `_app.config.js`：

```ts
// internal/vite-config/src/plugins/extra-app-config.ts
async function getConfigSource() {
  const config = await loadEnv();
  // ...
}
```

### 3. 自定义 `loadEnv` 的 mode 检测缺陷

`getConfFiles()` **不读取 Vite 传入的 `mode`**，而是从 `process.env.npm_lifecycle_script` 正则解析 `--mode`：

```ts
// internal/vite-config/src/utils/env.ts
function getConfFiles() {
  const script = process.env.npm_lifecycle_script as string;
  const reg = /--mode ([\d_a-z]+)/;
  const result = reg.exec(script);
  let mode = 'production'; // 解析失败时回退
  if (result) {
    mode = result[1] as string;
  }
  return ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];
}
```

| 调用方式 | `npm_lifecycle_script` | 实际加载 env | API |
| --- | --- | --- | --- |
| `pnpm vite build --mode jht` | 空 / 未定义 | `.env.production` | 118.190.1.4:82 |
| `pnpm build:jht` | `pnpm vite build --mode jht` | `.env.jht` | 43.138.14.122:82 |

### 4. 与 Vite 原生 loadEnv 的分裂

`application.ts` 中 Vite 自身使用 `loadEnv(mode, root)`，mode 为 `jht` 时能正确加载 `.env.jht`（品牌 Logo、标题等）。但 **`_app.config.js` 走另一套 env 加载**，两套逻辑不同步，导致「品牌素材是 jht、API 却是 hhyy」的混合产物。

### 5. 各 env 文件中的 API 配置

| 文件 | `VITE_GLOB_API_URL` | 品牌 |
| --- | --- | --- |
| `.env.jht` | `http://43.138.14.122:82/api` | 津海通 |
| `.env.hhyy` | `http://118.190.1.4:82/api` | 浩瀚远洋 |
| `.env.production` | `http://118.190.1.4:82/api` | 与 hhyy 一致（兼容旧 production mode） |

---

## 架构洞察

1. **`VITE_GLOB_*` 与 `VITE_*` 走不同注入路径**：前者进 `_app.config.js`，后者进 Vite 编译时替换；排查 API 问题应优先看 `dist/_app.config.js`。
2. **`getConfFiles()` 依赖 npm script 是脆弱设计**：绕过 `package.json` script 直接调 `vite` 会导致 mode 误判；长期应改为从 Vite 插件上下文传入 `mode`。
3. **`vite.config.mts` 的 `resolveApiTarget()` 仅影响 dev 代理**，不影响生产打包 API，勿与 `_app.config.js` 混淆。

---

## 避坑指南

1. **津海通打包请始终使用**：`pnpm build:jht` 或根目录 `pnpm build:antd:jht`。
2. **禁止**在 `apps/web-antd` 直接执行 `pnpm vite build --mode jht`（或任意绕过 npm script 的 vite 调用）。
3. 打包后可用 `Get-Content dist/_app.config.js` 快速校验 API 是否正确。
4. 若已误打包，可临时修改 `dist/_app.config.js` 中的 `VITE_GLOB_API_URL` 后刷新，无需重编（项目设计支持）。

---

## 建议后续修复（未实施）

修改 `internal/vite-config/src/utils/env.ts` 的 `getConfFiles(mode?: string)`，优先使用 Vite 传入的 `mode`，`npm_lifecycle_script` 仅作兜底。
