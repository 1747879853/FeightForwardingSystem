# 基础资料港口/航线/集装箱/国家权限 i18n 与路由控制补齐

## 背景意图

- 后端新增 `Admin.PortCode`、`Admin.LaneCode`、`Admin.CtnCode`、`Admin.CountryCode` 及其增删改查子权限。
- 权限配置页（`/system/permission`）依赖 `auth.json` 将权限码（`.` 转 `_`）映射为可读文案，缺失时会出现 `[intlify] Not found 'auth.xxx'` 告警。
- 基础资料四个子路由此前未声明独立 `authority`，仅有父级菜单聚合权限，子页面无法按模块粒度拦截访问。

## 核心技术决策 / 逻辑变更

- 在 `zh-CN/auth.json` 与 `en-US/auth.json` 同步补齐 4 组共 20 个权限键。
- 在 `basic-data.ts` 为以下路由补充 `abpPageAuthority`：
  - `/basic-data/lane-code` → `Admin.LaneCode`
  - `/basic-data/port-code` → `Admin.PortCode`
  - `/basic-data/ctn-code` → `Admin.CtnCode`
  - `/basic-data/country-code` → `Admin.CountryCode`
- 页面访问规则与其他基础资料一致：拥有模块权限或 `.Get` 子权限即可进入。

## 避坑指南（Gotchas & Constraints）

- 新增后端权限后，应同时检查 `auth.json` 双语键、`basic-data.ts` 子路由 `authority` 与父级菜单 `authority` 数组是否一致。
- 权限树文案由 `getAllPermissionsTreeApi($t)` 通过 `auth.${name.replaceAll('.', '_')}` 解析，键名必须与权限码严格对应。
- 列表页按钮级权限（Add/Edit/Delete）尚未接入，若需细粒度控制需后续在对应 `list.vue` 补充 `abpActionCode` 或 `v-access` 指令。
