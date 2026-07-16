# 2026-07-16 货物轨迹弹窗工具栏展示品牌 Logo

## 背景意图

独立分享页 `tracking-map/page.vue` 页头已按白标品牌（`VITE_APP_BRAND`）渲染公司 Logo，但系统内「货物轨迹」全局弹窗工具栏仅显示订阅号，白标场景下品牌辨识不足。需与分享页对齐，在弹窗工具栏左侧展示当前品牌 Logo。

## 核心逻辑变更

- **`tracking-map-modal.vue`**：引入 `brandLogo` / `brandLogoText`（横版优先，缺省回退方形），工具栏左侧新增品牌 Logo（无图时回退公司名称），右侧语言切换与分享按钮不变；订阅号与 Logo 用竖线分隔，样式与独立页头部一致。

## 避坑指南

- Logo 随打包品牌自动切换，无需在弹窗内写死路径；改品牌资源改 `brand-assets.ts` / 对应 `assets/img/<brand>/` 即可。
- 此为白标**品牌** Logo，不是承运商/船公司 Logo；船司图标仍由 trackingeyes iframe 内渲染。
