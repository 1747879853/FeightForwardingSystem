# 2026-07-13 全局货物轨迹地图弹窗（iframe 内嵌 trackingeyes）

## 背景意图

业务侧需要在任意页面通过订阅号（提单号 mblNo）快速查看货物轨迹地图。第三方地图服务（trackingeyes）通过 URL `#/Map?companyid=<企业编号>&referenceno=<订阅号>` 提供轨迹页面。为避免在代码/页面中直接暴露原始地址与企业编号（100514），要求把地址与企业编号收敛到 env，调用方只传订阅号。

## 核心逻辑变更

- **env 收敛敏感配置**（`apps/web-antd/.env`）：
  - `VITE_GLOB_TRACKING_MAP_URL="https://saas.trackingeyes.com/#/Map"`（**必须用引号**，否则 dotenv 会把 `#/Map` 当行内注释丢弃）
  - `VITE_GLOB_TRACKING_COMPANY_ID=100514`
  - 放在共享 `.env`，各品牌（hhyy/jht/sjtd/jiayue）构建自动继承。
- **新增全局组件目录** `apps/web-antd/src/components/tracking-map/`：
  - `use-tracking-map.ts`：模块级单例状态（`visible`/`referenceNo`）+ `open({ mblNo })` / `close()`；仿 `workflow-timeline` 全局弹窗模式。
  - `tracking-map-modal.vue`：Ant Design `Modal` 内用 `iframe` 渲染；弹窗宽度 `90vw`（最大 `1400px`）、内容区高度 `80vh`；src 由 env 的 base url + companyid 与传入的 referenceno（mblNo）在运行时用 `URLSearchParams` 拼装，兼容带 hash（`#/Map`）的地址；`referrerpolicy="no-referrer"`；订阅号为空时展示 `Empty` 兜底。
  - `index.ts`：统一导出 `useTrackingMap` / `TrackingMapOpenParams` / `TrackingMapModal`。
- **全局注册**（`apps/web-antd/src/app.vue`）：在根 `App` 内挂载 `<TrackingMapModal />`，与 `PrintFormatModal` / `WorkflowTimelineModal` 并列，实现全站单例弹窗。

## 使用方式

```ts
import { useTrackingMap } from '#/components/tracking-map';

const { open } = useTrackingMap();
open({ mblNo: row.mblNum });
```

## 避坑指南

- **企业编号/地址不硬编码**：组件内不出现 `100514` 与原始域名，全部读 `import.meta.env.VITE_GLOB_TRACKING_*`；新增品牌环境若地址不同可在对应 `.env.<brand>` 覆盖。
- **VITE\_ 前缀的现实边界**：`VITE_` 变量会被内联进客户端产物，浏览器 DevTools/iframe src 仍可见，属前端固有限制；此处目标是“代码与页面层面不直接暴露、集中可维护”，并非做到网络层完全隐藏。
- **hash 地址拼参**：base url 含 `#/Map`，直接字符串拼接易破坏 hash，务必用 `URLSearchParams` 只处理 `?` 后的查询段。
- **dotenv 行内注释**：`.env` 中 URL 含 `#` 时必须用双引号包裹，否则 `#/Map` 会被 dotenv 截断，iframe 只能打开域名根路径。
- **修改 .env 后需重启 dev server**：Vite 仅在启动时读取环境变量。
