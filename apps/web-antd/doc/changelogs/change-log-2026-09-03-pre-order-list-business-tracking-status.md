# 业务联系单列表增加业务状态与运踪状态列

## 背景意图

TAPD `#1161580498001000922`：列表要能看到审核通过后生成的业务进度和运踪，口径对齐海运出口列表。后端已在 `GetPagedListAsync` 的 `transportOrder` 嵌套里带回服务项和运踪，前端原先只有 `transportOrderId`，两列都没有。

## 核心逻辑变更

- 状态列后增加「业务状态」「运踪状态」。业务状态只读 `transportOrder.seaExport.seaExportServices`，复用海出 `getSeaExportBusinessStatusMeta`；海进/空出/未通过没有服务项，显示 `-`。
- 运踪从嵌套对象读：海出按品牌走新服务商或旧运踪；海进走集装箱运踪；空出走空运运踪。未生成业务显示 `-`。
- 有 `Admin.ExternalApi.Get` 时运踪 Tag 可点开详情弹窗。列表不加运踪订阅按钮，也不加主提单号预警叹号。

## 避坑指南

- 数据在 `transportOrder.seaExport|seaImport|airExport` 里，根上没有 `seaExportServices` / `feituoTracking`。详情接口不返回这份嵌套，不要拿详情 DTO 当列表用。
- 列 `field` 是计算列（`businessStatus` / `yundangTrackStatus`），和海出一样靠 slot；运踪列名沿用 `yundangTrackStatus` 只为对齐现有列配置习惯。
- 列设置里没有这两列时会按默认显示（新增列不会因为旧配置而隐藏）。
- 用户可见文案不要出现第三方运踪供应商名称。
