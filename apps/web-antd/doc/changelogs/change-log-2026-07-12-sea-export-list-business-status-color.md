# 海运出口列表业务状态列按进度态着色

## 背景意图

列表「业务状态」原先只展示纯文本（进行中的服务名或「已完成」），扫读时难以区分未开始 / 进行中 / 已完成。需与详情页顶部服务项目 chevron 的进度色保持一致。

## 核心逻辑变更

1. **`getSeaExportBusinessStatusMeta`**：在原有文案计算之上增加进度态 `upcoming` / `active` / `done`。
2. **`SEA_EXPORT_BUSINESS_STATUS_COLORS`**：三态色值与 `basic-info-form/form.css` 服务项目状态色对齐（绿=完成、黄=进行中、灰=未开始）。
3. **列表 slot**：非 `-` 文案以圆角色块展示；无服务项仍显示灰色 `-`。
4. **兼容**：保留 `getSeaExportBusinessStatusText`，内部委托 meta，避免其它调用方破坏。

## 避坑指南

- 改色时同步对照详情页服务项目 CSS，避免列表与详情语义不一致。
- 单元格渲染勿对同一行多次调用 `resolveBusinessStatus` 做昂贵计算时可再抽缓存；当前规模可接受。
