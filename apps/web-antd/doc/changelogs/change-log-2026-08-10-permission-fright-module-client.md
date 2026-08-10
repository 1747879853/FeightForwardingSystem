# 权限配置 - FrightModule 同步客户管理

## 背景意图

TAPD #0551：表级/字段权限模块下拉缺少「客户管理」。后端已新增 `FrightModule.Client = 9`，前端枚举与选项需对齐，否则无法为客户模块配置表级权限。

## 核心逻辑变更

- `FrightModule` 增加 `Client = 9`（客户管理）。
- `FrightModuleOptions` / `FrightModuleLabels` 同步展示「客户管理」。
- 表级权限条件字段元数据暂未为 Client 单独配置（与 PreOrder 等模块一致）；主规则可按模块保存，条件字段待后端确认属性后再补。

## 避坑指南

- 枚举值必须与后端 `Core/CsprojBuilderEnum.cs` 一致（`Client = 9`），勿自行改号。
- 「看全部客户」若仅需数据范围放开，优先验证数据权限 Tab 配「全部」（ClientAdmin 列表已写明全部数据权限不过滤）；表级权限是按模块条件过滤，二者勿混用。
