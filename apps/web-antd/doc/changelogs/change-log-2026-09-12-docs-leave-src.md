# 变更日志：文档迁出代码目录

- **日期**：2026-09-12
- **类型**：Docs

## 摘要

统一将 `apps/web-antd/src/**` 下的 README 迁入 `apps/web-antd/doc/`（按模块 / guides 分组），代码目录不再放置说明文档。

## 迁移动作

| 原路径 | 新路径 |
| :-- | :-- |
| `src/views/_core/README.md` | `doc/modules/_core/README.md` |
| `src/views/settlement-management/payment-settlement/README.md` | `doc/modules/settlement-management/payment-settlement.md` |
| `src/views/sea-export-admin/basic-info-form/README.md` | `doc/modules/sea-exports/basic-info-form.md` |
| `src/adapter/component/biz-select/README.md` | `doc/guides/biz-select.md` |
| `src/locales/README.md` | `doc/guides/locales.md` |
| `src/assets/fonts/README.md` + `src/assets/img/*/README.md` | `doc/guides/brand-assets.md`（合并） |

报表模块此前已迁至 `doc/modules/report/`。

## 约定

后续文档只写 `doc/modules/<域>/` 或 `doc/guides/`，并在 `MODULE_INDEX.md` / `GUIDES_INDEX.md` 登记。
