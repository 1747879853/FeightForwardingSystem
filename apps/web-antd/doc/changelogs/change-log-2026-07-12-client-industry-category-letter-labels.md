# 客户列表行业类别补齐 a/k 中文映射

## 背景意图

客户列表「行业类别」列把后端字母码映射为中文时，部分码找不到选项，直接回退显示字母（如 `a`、`k`），与其它类别的中文展示不一致。

## 核心逻辑变更

1. **存储约定：** `industryCategories` 为字母串（`a`=船公司、`b`=发货人…），列表经 `formatIndustryCategories` 按 `getIndustryCategoryOptions` 映射 label。
2. **缺陷：** 选项表中 `a`（船公司）被注释、`k`（代理）整项缺失，映射失败走 `optionsMap.get(v) || v` 原样输出字母。
3. **修复：** 在客户 `base/data.ts` 与费用侧共用的 `orderFee/data.ts` 中恢复 `a` 船公司，并补上 `k`/`key:11` 代理（i18n：`industryCategoryOptions.agent`）。

## 避坑指南

- 新增/隐藏行业类别时，列表展示映射与表单可选子集是两套：展示用全量 `getIndustryCategoryOptions`，编辑勾选用 `getCustomer/SupplierIndustryCategoryOptions`；全量表缺项会导致列表露出字母。
- 字母与枚举序号对应关系为 `'a' + (n-1)`；跳号（如 `t`）若后端有存值也需同步进全量选项，否则同样会显示字母。
