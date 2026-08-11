# 2026-08-11 工作流「或条件」保存后被逐条转成「且条件」

## 背景意图

工作流编辑页 `/system/workflow/edit/:id` 的条件抽屉里，若一个分支只配了「或条件」（例如 3 条），保存后重新打开会发现其中一条跑到了「且条件」区域；再删掉一条或条件并保存，剩下的两条里又会有一条变成「且条件」。

这不只是显示问题：`isOr` 直接决定后端的判定口径（所有「且条件」全满足 **且** 任意「或条件」满足），条件被静默改组后，流程实际走向与用户配置不符。

## 核心逻辑变更

`src/views/system/workflow/utils/converter.js` 的 `uiConditionsToApi` 原先按数组下标改写首条的分组：

```js
.map((item, i) => ({
  isOr: i === 0 ? false : item.isOr === true || item.isOr === 1,
  // ...
}))
```

抽屉保存时把条件合并成 `[...且条件, ...或条件]` 一个扁平数组。当分支没有任何「且条件」时，下标 0 就是第一条「或条件」，于是每保存一次就被吞掉一条 —— 这正是「删一条、又坏一条」的来源。

改为原样保留 `item.isOr`：`isOr` 表达的是条件属于「且组」还是「或组」，与它在数组里的位置无关。

同时修正 `src/views/system/workflow/utils/func.ts` 的 `conditionStr`：它原先把条件列表当作从左到右的顺序表达式，在相邻两条之间插入「且 / 或」，于是 `A且B + C或D` 会被拼成 `A 且 B 或 C 或 D`。现改为与抽屉里的 `buildConditionStr` 一致，先按 `isOr` 分组再拼成 `(A 且 B) 且 (C 或 D)`。

新增 `src/views/system/workflow/utils/converter.test.ts` 覆盖「全或条件多次保存」的往返场景。

## 避坑指南

- 分支画布上的条件文案有两条来源：抽屉保存后走内存里的 `_conditionDisplayStr`，页面刷新后走 `func.conditionStr`。改文案口径时两处都要看，否则刷新前后显示不一致。
- `conditionList` 是扁平数组，靠每条自己的 `isOr` 区分分组，**不是**顺序求值的表达式，不要再写任何依赖下标的分组逻辑。
- 单测需在仓库根目录执行（应用自身的 `vite.config.mts` 需要品牌环境变量才能加载）： `npx vitest run --dom apps/web-antd/src/views/system/workflow/utils/converter.test.ts`
