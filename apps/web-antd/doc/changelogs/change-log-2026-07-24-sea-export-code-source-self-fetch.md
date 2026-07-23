# 海运出口业务来源回显改由下拉自拉取-2026-07-24

## 背景意图

- 选择委托单位后自动带出业务来源时，不再依赖客户详情里的 `codeSource.cnName` 拼 `selectedItems`；仅传 id，由 `CodeSourceSelect` 自行拉详情回显名称。
- 同步缩小头部业务来源下拉 placeholder 字号，避免窄宽下显示拥挤。

## 核心逻辑变更

- `applyClientCodeSource`：`toSelectedItems(codeSourceId, '', 'cnName')`。
- `form.css`：`.basic-info-header__select--source` placeholder `font-size: 11px`。

## 避坑指南

- 编辑首屏回填仍可用详情自带名称；委托单位变更链路以 id 为准即可。
