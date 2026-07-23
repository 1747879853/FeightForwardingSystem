# 模块权限缺失汉化补齐

## 背景意图

- 后端权限列表新增 `Admin.Client.AddDishonest` / `CancelDishonest`、`Admin.TransportOrder`、`Admin.PreOrder` 等节点后，前端 `auth.json` 缺少对应键，权限树显示权限码或空白。
- 另有一处与接口 `displayName` 不一致：`Admin.ReceiveSettlement` 前端为「收费核销」、接口为「收费结算」。

## 核心技术决策 / 逻辑变更

- 在 `zh-CN/auth.json` 新增 **13** 个缺失键，文案与接口 `displayName` 对齐。
- 将 `Admin_ReceiveSettlement` 文案由「收费核销」改为「收费结算」。
- 同步在 `en-US/auth.json` 补充上述 13 个键的英文占位翻译。
- `Admin.PersonalSetting` 接口仍返回 `[Admin.Personal setting]`（后端本地化缺失），前端已有「个人设置」，无需改动。

## 避坑指南（Gotchas & Constraints）

- 权限树文案键规则：权限码 `.` → `_`，查找 `auth.${key}`。
- 新增后端权限时必须同步双语 `auth.json`；历史未返回的键可保留以免旧环境缺文案。
