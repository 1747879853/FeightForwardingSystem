# 海运出口港口服务项配置前端对接

## 背景意图

后端已提供 `SeServiceConfigAdmin` 的完整增删改查接口，基础数据菜单缺少对应前端入口与页面，导致海运出口服务项配置无法在系统内维护。

## 核心逻辑变更

1. 新增 `SeServiceConfigAdmin` API 封装，覆盖 `AddAsync / EditAsync / DeleteAsync / GetPagedListAsync / DetailAsync`，并补齐主表与子表 DTO。
2. 在基础数据路由新增 `/basic-data/se-service-config` 页面入口，权限对齐 `Admin.ServiceConfig.SeServiceConfig`。
3. 新建页面 `SeServiceConfigAdmin`：
   - 列表支持按起运港、服务项类型筛选；
   - 弹窗支持主表与 `seServiceConfigItems` 联动维护；
   - 支持子项 `seServiceShows / seServiceLocks / seServiceRequires` 的差异更新数据结构；
   - `serviceType` 通过枚举中心动态加载 `serviceType` 键值，避免前端硬编码。
4. 补充中英文 i18n 文案，保证菜单、列表、弹窗字段可本地化显示。

## 避坑指南

- 编辑接口不接收 `seServiceConfigItems.sortId`，前端只按数组顺序提交明细，避免携带旧排序导致后端覆盖逻辑异常。
- 子表回填必须保留子项 `id`，否则编辑时会被后端识别为新增并触发旧数据删除。
- `serviceType` 枚举依赖系统枚举缓存；如果新增了枚举项但页面未更新，可在系统枚举页更新后刷新页面重新拉取。
