# 权限新增键 i18n 补齐（二批）

## 背景意图

- 权限页加载后仍出现 `auth.*` 缺失告警，说明还有新增权限键未进入语言包。
- 本次主要集中在枚举管理、海运运价与打印 JSON 权限组。

## 核心技术决策 / 逻辑变更

- 在 `apps/web-antd/src/locales/langs/zh-CN/auth.json` 补齐：
- `Admin_Enumeration*`
- `Admin_SeFreiPrice*`
- `Admin_PrintJson`、`Admin_PrintJson_Add`、`Admin_PrintJson_Get`、`Admin_PrintJson_Edit`
- 在 `apps/web-antd/src/locales/langs/en-US/auth.json` 同步补齐同名键，保持中英文键集合一致。

## 避坑指南（Gotchas & Constraints）

- 单独补 `Delete` 不够，权限组通常需要“主键 + CRUD 子键”成组补全。
- 新增权限上线后，建议通过控制台关键字 `Not found 'auth.` 做一次快速回归，尽早发现漏项。
- 若权限码命名包含缩写（如 `SeFreiPrice`），i18n 键必须严格同名，不能按语义自行改写。
