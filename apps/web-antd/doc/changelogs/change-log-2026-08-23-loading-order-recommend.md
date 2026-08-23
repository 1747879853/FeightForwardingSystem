# 2026-08-23 监装「推荐」弹窗回填堆场与师傅

## 背景意图

堆场标签旁的橙色「推荐」原先只是稿面角标。产品要求点击后弹出该到货日、该船公司已排师傅的堆场，选中后回填堆场和监装师傅。

## 核心逻辑变更

- 封装 `GET /LoadingOrderAdmin/GetYardUsersAsync`，入参 `estimatedArrivalDate`（只取天）+ `carrierId`。
- 未提交可点「推荐」：缺已保存船公司或预计到货时间先提示，不弹窗。
- 弹窗按堆场名分组展示师傅昵称；单选一行，确定后回填 `carrierYardId` / `userIds`。
- 接口只回 `yardName` / `userName`。堆场 id 对照当前船公司 `carrierYards`；师傅 id 对照 `userSimpleListCache`（用户属性含监装）。对不上的跳过并提示。

## 避坑指南

- 不要把 `GetYardUsersAsync` 当冲突拦截，同一天同一船公司可以多个堆场。
- 回填会覆盖当前已选堆场和师傅，不是追加。
- 师傅下拉回显依赖 `selectedItems`；推荐选中的人要写进 `extraSupervisors`，否则只看到 id。
