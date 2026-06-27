# 海运出口提单类字段全角转半角

## 背景意图

唛头、货描、港口备注、收发通、主提单号等提单类字段除英文自动大写外，还需将全角英数字、标点与空格统一转为半角，避免提单打印与对单时出现全半角混排。

## 核心逻辑变更

1. `toHalfWidth`（`src/utils/english-upper-case.ts`）：将全角空格 `U+3000` 转为半角空格，将 `U+FF01`–`U+FF5E` 区间字符按 `0xFEE0` 偏移转为半角；中文及其他字符不变。
2. `toEnglishUpperCase` 先调用 `toHalfWidth` 再转大写，所有已接入大写规范的输入组件与 AI 回填路径自动获得半角转换，无需逐字段改动。
3. 港口选择联动备注 `formatSeaExportPortRemark` 输出时同步执行规范化，保证自动填入备注也为半角大写。

## 避坑指南

- 内部备注 `internalRemark`、外部备注 `remark` 未纳入范围，避免影响中文备注场景。
- 全角转换仅覆盖标准全角 ASCII 区段与全角空格，不处理弯引号等兼容标点；若后续有需求可单独扩展。
- 新增同类提单文本字段时继续复用 `EnglishUpperInput` / `EnglishUpperTextarea` 与 `toEnglishUpperCase`。
