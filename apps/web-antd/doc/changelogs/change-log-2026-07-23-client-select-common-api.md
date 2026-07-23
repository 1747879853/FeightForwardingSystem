# ClientSelect 迁移至通用 Client 接口

## 背景意图

业务页客户下拉（委托单位、保险公司、订舱代理等）此前仍调用 `ClientAdmin/GetPagedListAsync`，普通业务用户缺少 `Admin.Client.Get` 时会 403。通用接口 `Client/GetPagedListAsync` 已就绪且仅需登录，需让 `ClientSelect` 真正切过去。

## 核心逻辑变更

1. `client-select.vue` 数据源由 `#/api/sea-export/client-admin` 改为 `#/api/common/client`。
2. 列表请求改为 `/services/app/Client/GetPagedListAsync`，入参使用 camelCase：`keyword` / `industryCategory` / `pageIndex` / `pageSize`。
3. `industryCategory` 为空时不下发请求（通用接口业务场景下应传行业类别）。
4. 类型改为 `ClientAppApi.ClientSimpleDto`；编辑回显继续依赖父级传入的 `selectedItems`。
5. 移除对 `ClientAdmin/DetailAsync` 的按 id 回显拉取（通用服务无 Detail；Admin 详情会再次触发权限问题）。
6. README 同步标注数据源为非 Admin 接口。

## 避坑指南

- 编辑态务必传 `selectedItems`（至少含 `id` + 展示名），否则可能短暂只显示原始 id。
- 客户管理后台列表/表单仍走 `ClientAdmin`，不要误改。
- 拉干系人默认值等「完整客户详情」场景（如海出委托单位变更后回填销售/操作）仍可单独调 `ClientAdmin/DetailAsync`，与下拉选人职责分离。
