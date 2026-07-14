# 2026-07-14 货物轨迹支持中英文切换（分享英文链接）

## 背景意图

货物轨迹弹窗的地图内容默认中文，但很多客户看英文。业务需要在弹窗内一键把 iframe 地图切换成英文，并且分享给外部客户的链接也能是英文版（trackingeyes 内嵌页支持 `lang=en` 参数即为英文）。

## 核心逻辑变更

- **`build-tracking-map-src.ts` 新增 `lang` 参数**：
  - 新增导出类型 `TrackingMapLang = 'en' | 'zh'`。
  - `buildTrackingMapSrc(referenceNo, lang?)`：当 `lang === 'en'` 时向 iframe 地址追加 `lang=en`；默认中文不追加，保持原行为。
  - `index.ts` 追加导出 `TrackingMapLang` 类型。
- **弹窗 `tracking-map-modal.vue` 新增语言切换**：
  - 工具栏加入 `Segmented` 中文 / English 切换（`lang` 状态，默认中文）。
  - iframe `src` 与「复制分享链接」「新窗口打开」的分享 URL 均随所选语言同步；英文时分享链接带 `?lang=en`。
  - 每次打开弹窗重置为中文，避免上一次的英文选择带入新订阅号。
  - 复制成功提示按语言区分（“英文分享链接已复制” / “分享链接已复制”）。
- **独立静态页 `views/tracking-map/page.vue` 识别语言**：
  - 从 `route.query.lang` 读取语言（`en` 生效，其余默认中文），传入 `buildTrackingMapSrc`，使分享出去的英文链接（`/tracking-map/:mblNo?lang=en`）直接渲染英文地图。
  - **页头标题与空态文案**同步跟随 `lang`：中文为「货物轨迹查询」/ 空态中文提示，英文为 `Cargo Tracking` / 对应英文空态提示（不依赖全局 i18n，分享页免登录也可正确显示）。

## 避坑指南

- **宿主页文案也跟 URL lang**：页头「货物轨迹查询」与 Empty 文案按 `?lang=` 本地切换，不再写死中文；iframe 则透传 `lang=en` 给 trackingeyes。
- **分享链接语言以生成时选择为准**：复制/新窗口打开时读取的是当前 `lang` 状态，切换语言后需重新复制才会得到对应语言链接。
- **默认中文不追加参数**：保持与历史链接兼容，中文场景不带 `lang`。
- **不改系统全局语言**：静态页只按 URL query 决定自身文案，不会调用全局 `setLocale`。
