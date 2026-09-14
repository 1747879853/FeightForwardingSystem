# 港口下拉改走 PortCode/GetPagedListAsync

## 背景意图

业务港口下拉此前调用 `PortCodeAdmin/GetPagedListAsync`，依赖管理端权限。按 `doc/基础/港口接口文档.md`，只读分页应使用无需业务权限的 `PortCode/GetPagedListAsync`。

## 核心逻辑变更

- `port-code-admin.ts`：为 `PortCode` 增加 `PortCodePagedDto` / `getPortCodePagedList`；管理端分页改名为 `getPortCodeAdminPagedList`。
- `PortSelect`、运价 Handsontable 港口远程搜索：统一调用 `PortCode/GetPagedListAsync`。
- 按 id 回显：PortCode 无 Detail，改用 `GetListAsync` 精简全量列表兜底映射。
- 港口基础资料管理列表仍用 `PortCodeAdmin` 分页接口。

## 避坑指南

- 管理 CRUD 与业务下拉必须分流：Admin 带权限/用户昵称，PortCode 只读登录即可。
- 业务侧 `selectedItems` 类型可用 `PortCodeApi.PortCodePagedDto`（与订单嵌套港口结构兼容）。
