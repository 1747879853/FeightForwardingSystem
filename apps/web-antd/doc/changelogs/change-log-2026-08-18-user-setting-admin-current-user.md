# 用户设置列表固定当前人，编辑按 name 匹配

## 背景意图

- 后端 `UserSettingAdmin/GetPagedListAsync` 改为固定只查当前登录人，不再接收 `CreatorUserId`。
- 后端 `UserSettingAdmin/EditAsync` 改为按 `name` 匹配当前人记录，不再接收 `id`。
- 前端列配置 / 搜索项 / 分组配置均走该接口，需同步入参，避免多余字段被忽略或报错。

## 核心逻辑变更

- `user-setting-admin.ts`
  - `GetPagedListParams` 去掉 `CreatorUserId`；
  - `EditUserSettingDto` 仅保留 `name`、`setting`。
- `store/table-config.ts`
  - 预拉取列配置、搜索项配置、分组配置时不再传 `CreatorUserId`，也不再依赖 `useUserStore` 取当前用户 id；
  - `editTableConfig` / `editSearchFormConfig` / `editGroupConfig` 调用 `EditAsync` 时只提交 `name` + `setting`。
- 本地缓存仍保留列表返回的 `id`，删除接口 `DeleteAsync` 继续按 `id` 操作。

## 避坑指南（Gotchas & Constraints）

- **编辑靠 name 唯一性**：同一用户下 `table_config_*` / `search_form_config_*` / `group_config_*` 的 name 必须稳定；改 name 等于改另一条记录，不会按旧 id 更新。
- **勿把 id 带进 EditAsync**：store 内部 upsert 仍带 `id` 是为了本地缓存，请求体必须拆出 `name`/`setting`，不能整包透传。
- **列表范围由登录态决定**：未登录或 token 无效时后端不会按前端指定的他人 id 查配置。
