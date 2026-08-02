# 编号生成支持业务日期(ETD)年月规则

## 背景意图

委托编号等规则需要按「业务日期（开船日期 ETD）」取年月，而不是按系统当前时间。开船日期非必填，因此为空时回退当前时间。后端新增两种生成规则，并在海运出口/海运进口生成编号时传入 ETD；前端编号规则配置页需要同步暴露这两种可选类型。

## 核心逻辑变更

后端（CsprojBuilder，独立仓库）：

- `src/CsprojBuilder.Core/CsprojBuilderEnum.cs`：`GenerateEnum` 新增 `ETDyyyyMM=7`、`ETDyyMM=8`。
- `src/CsprojBuilder.Application/App/GenerateNum/Dto/GenerateNumDto.cs`：`GetGenerateTextDto` 新增 `ETD`。
- `src/CsprojBuilder.Application/CsprojBuilderAppServiceBase.cs`：生成逻辑识别业务日期规则，`ETD` 有值用之，为空取 `DateTime.Now`。
- `SeaExportAdminAppService` / `SeaImportAdminAppService`：新增、复制、更新委托编号时传 `ETD`。
- `PreOrderAdminAppService`：审核通过生成海运出口委托编号时传 `ETD`。

前端（web-antd）：

- `src/api/system/base-data/generate-num-admin.ts`：`GenerateEnum` 类型扩展为 `0 | 1 | ... | 8`。
- `src/views/system/basic-data/GenerateNumAdmin/data.ts`：`GENERATE_ENUM` 新增 `ETDyyyyMM: 7`、`ETDyyMM: 8`；`buildGenerateNumRuleSegment` 中 ETD 规则与 `yyyyMM`/`yyMM` 复用同一段预览格式。
- `src/views/system/basic-data/GenerateNumAdmin/modules/form.vue`：规则明细的生成类型下拉追加两项。
- `locales/zh-CN/system.json`、`locales/en-US/system.json`：新增文案「业务日期(yyyyMM)」「业务日期(yyMM)」/ `Business Date (yyyyMM)`、`Business Date (yyMM)`。

| 枚举值 | 名称 | 说明 | 示例(ETD=2026-08-15) |
| :-- | :-- | :-- | :-- |
| 7 | ETDyyyyMM | 业务日期四位年两位月（为空取当前时间） | `202608` |
| 8 | ETDyyMM | 业务日期两位年两位月（为空取当前时间） | `2608` |

## 避坑指南

- 与 `yyyyMM(5)`/`yyMM(6)`（始终取系统当前日期）不同，业务日期规则优先用单据传入的 `ETD`，为空才回退当前时间；两组规则不要混用于同一条编号。
- 配置页预览没有单据上下文，ETD 规则的预览一律按当前时间渲染，实际生成结果可能与预览不同，这是预期行为。
- 只有后端已传 `ETD` 的场景（海运出口、海运进口、业务联系单审核通过生成出口委托编号）才会取到业务日期；其余表名配置成 ETD 规则等同于取当前时间。
- 无需数据库迁移，枚举以整型存储。
