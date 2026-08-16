# 海运进口编辑页补齐运踪订阅按钮

## 背景意图

- 海运进口列表已有批量「运踪订阅」，编辑页已有「运踪信息」Tab，但基础信息工具栏缺少单票订阅入口。
- 海运出口、空运出口编辑页均已在保存按钮旁提供「运踪订阅 / 重新订阅」，进口应对齐，避免只能回列表才能订。

## 核心逻辑变更

- `sea-import-admin/basic-info-form/form.vue` 接入共享 `useContainerTrackingSubscribe`（`bizType=SeaImport`）。
- 仅编辑态 + `Admin.ExternalApi.Use` 渲染按钮；已成功订阅禁用，失败显示「重新订阅」。
- 点击后按当前单据 Id 发起单票订阅，结果弹窗与列表共用；成功/失败后 `loadEditData()` 回读 `isFeituoSubscribed` / `isFeituoSubscribeSuccess`。
- 问号提示复用 `tracking.subscribeRules.seaImport`（优先主提单号，否则首箱号；船公司须有 EDI 代码）。

## 避坑指南

- 订阅读库内已保存数据，未保存的主提单号/箱号不会进入当次订阅。
- 用户可见文案只写「运踪订阅」，不要出现服务商名称。
- 新建页共用同一 `form.vue`，按钮必须 `v-if="isEdit"`，否则无单据 Id 无法订阅。
