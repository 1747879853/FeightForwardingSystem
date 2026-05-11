# CHANGELOG 索引（固定模板）

> 用途：集中索引 `apps/web-antd/doc` 下的改动归档文档。  
> 规则：新记录按“时间倒序”插入对应月份分组顶部；标题格式保持一致。  
> 命名建议：`change-log-YYYY-MM-DD-<topic>.md`

## 维护规范

- 月份分组格式：`## YYYY-MM`
- 条目格式：`- [YYYY-MM-DD <变更标题>](./change-log-YYYY-MM-DD-<topic>.md)`
- 同一天多条可在标题后加简短后缀区分
- 无对应月份时先新增月份分组，再添加条目

## 2026-05

- [2026-05-10] [海运出口列表查询区调整为一行4个条件](./changelogs/change-log-2026-05-10-sea-export-list-query-four-columns.md)
- [2026-05-10] [海运出口列表查询与显示字段映射对齐](./changelogs/change-log-2026-05-10-sea-export-list-query-table-mapping.md)
- [2026-05-10] [将搜索字段顺序调整交互改为拖动排序](./changelogs/change-log-2026-05-10-search-form-field-drag-order.md)
- [2026-05-10] [补充搜索字段顺序调整持久化与回放](./changelogs/change-log-2026-05-10-search-form-field-order-persist.md)
- [2026-05-10] [新增 useVbenVxeGrid 搜索字段显示/隐藏持久化与工具栏配置入口](./changelogs/change-log-2026-05-10-search-form-field-persist.md)
- [2026-05-10] [将 sea-exports 列持久化临时调试日志改为开关式（默认关闭）](./changelogs/change-log-2026-05-10-sea-exports-column-persist-debug-switch.md)
- [2026-05-10] [对齐 sea-exports 恢复默认规则：全显示、初始顺序、取消固定](./changelogs/change-log-2026-05-10-sea-exports-reset-default-rule-align.md)
- [2026-05-10] [修复 sea-exports 冻结列持久化与恢复默认配置回放](./changelogs/change-log-2026-05-10-sea-exports-column-persist-fixed-and-reset-default.md)
- [2026-05-10] [修复 sea-exports 列配置保存结构不完整（补齐全量显隐映射）](./changelogs/change-log-2026-05-10-sea-exports-column-persist-save-structure-fix.md)
- [2026-05-10] [修复 sea-exports 列配置历史脏 key 导致加载后不生效（自动自愈）](./changelogs/change-log-2026-05-10-sea-exports-column-persist-dirty-config-self-heal.md)
- [2026-05-10] [增强 sea-exports 列配置持久化全链路调试日志](./changelogs/change-log-2026-05-10-sea-exports-column-persist-debug-log.md)
- [2026-05-10] [修复 sea-exports 列配置拉取后未应用（稳定列 key）并增加日期格式化兜底](./change-log-2026-05-10-sea-exports-column-persist-apply-fix-and-date-guard.md)
- [2026-05-10] [修复 sea-exports 列配置保存后刷新失效（tableId 稳定性）](./changelogs/change-log-2026-05-10-sea-exports-column-persist-tableid-fix.md)
- [2026-05-10] [修复列配置持久化未触发接口请求](./changelogs/change-log-2026-05-10-vxe-column-persist-api-save-fix.md)
- [2026-05-10 useVbenVxeGrid 列设置持久化改造归档](./changelogs/change-log-2026-05-10-vxe-column-persist.md)

## 2026-04

- （预留）
