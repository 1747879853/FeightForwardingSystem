# GenerateEnum 新增 yyyyMM / yyMM 日期段

## 背景意图

后端 `GenerateEnum` 扩展了按年月格式生成编号段的能力，前端类型、下拉选项与编号预览需同步支持，避免配置后预览为空或类型收窄报错。

## 核心逻辑变更

1. **类型扩展**：`GenerateEnum` 由 `0|1|2|3|4` 扩展为含 `5=yyyyMM`、`6=yyMM`。
2. **常量与预览**：`GENERATE_ENUM` 增加对应键；`buildGenerateNumRuleSegment` 分别格式化为 `YYYYMM` / `YYMM`。
3. **表单与文案**：编号规则表单下拉及中英文 i18n 补齐两项；海进出 `orderFee/data.ts` 中的选项表一并同步。

## 避坑指南

- 年月段与日期段同属非 AutoNum，可勾选「重置序号」参与分组键。
- 预览使用浏览器当前日期，与后端实际生成日可能因时区略有差异，联调时以服务端为准。
