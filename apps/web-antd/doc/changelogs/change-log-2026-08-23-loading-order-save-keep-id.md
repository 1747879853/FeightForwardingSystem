# 2026-08-23 监装新建后记住工单 id

## 背景意图

新建成功后会立刻打 `DetailBySeaExportIdAsync`。该接口在有师傅时 AutoMap `LoadingOrderUsers` 会 500，`detail.id` 挂不上，再点保存又走 `AddAsync`。

## 核心逻辑变更

- `AddAsync` 返回的工单 id 先写入 `detail`（未提交），再拉详情。
- 详情失败时仍走 `EditAsync` / `SubmitAsync`，不再重复新建。

## 避坑指南

- 保存走编辑看的是 `detail.id`，不是「页面上有没有工号」。
- 根因仍是后端详情映射，修好后这条兜底只是防再踩。
