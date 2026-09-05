# 2026-09-05 监装工单分享给客户免登录查看

## 背景意图

后端已提供师傅端免登录公开详情 `LoadingOrder/DetailByMblAndLoadingOrderNumAsync`（主提单号 + 监装工单号当口令）。管理端监装 Tab 需要一键把链接复制给客户，客户不登录也能看监装进度、箱号封号和照片。客户页不展示监装要求与备注。

## 核心逻辑变更

- 海出编辑「监装」Tab 顶栏增加「分享」：有工单号即可点；用 `router.resolve` 生成绝对地址（兼容 hash / history），剪贴板复制。缺主提单号时提示先填写。
- 新增免登录路由 `/loading-order-share`（`ignoreAccess`、无 Layout），query 传 `mblNum` + `loadingOrderNum`。
- 公开页调 `DetailByMblAndLoadingOrderNumAsync`，请求带 `skipAuth`（不传 token、401 不刷新/登出）和 `skipErrorMessage`。对不上展示后端统一文案「主提单号或监装工单号错误」。
- 公开页只渲染基本信息、集装箱与分组照片；**不渲染** `loadingRequirements` 与 `remark`（以及拒接原因等内部字段）。

## 避坑指南

- **分享链接必须走 `router.resolve`。** jht 等品牌是 hash 路由，手写 `origin + /loading-order-share?...` 会打到错误地址。
- **公开接口不要带登录 token。** 过期 token 会触发全局刷新/登出，把客户页打回登录。`skipAuth` 同时跳过 Authorization 与 401 重认证。
- **不必传租户。** 后端先关租户过滤按两个号码跨租户定位，再切到该工单租户映射详情。
- 后端出参仍含监装要求与备注，前端只是不展示；不要在客户页再铺要求标签或详细说明。
