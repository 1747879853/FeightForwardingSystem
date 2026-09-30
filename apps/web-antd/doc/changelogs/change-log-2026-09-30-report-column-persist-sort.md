# TAPD #1001023：报表自定义列持久化与列头三击排序

对应 [TAPD #1161580498001001023](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001001023)。

## 问题

1. **自定义列表不能永久保存**：利润/欠费报表右键隐藏列只存在当前会话；重新查询或刷新后列又全部显示。
2. **排序第三下有问题**：列头单击约定升序 → 降序 → 取消；前两下正常，第三下取消后顺序/箭头异常（隐藏列后视觉下标与物理列错位时更明显）。

## 改动

- 新增 `use-report-column-persist.ts`：复用 `useTableConfigStore`，UserSetting key 为 `table_config_ProfitReport` / `table_config_ArrearsReport`。
- `use-report-page`：加载并合并用户隐藏列/显隐/顺序；隐藏列变更防抖保存；「重置」清除用户列配置。
- `report-hot-table`：
  - 排序始终从 `originalData` 重排（`sort.ts`）；
  - `groupingCache` 键加入排序签名；
  - 表头/右键列下标经 `toPhysicalColumn`；
  - 空查询结果不再清空隐藏列偏好；
  - `hotSettings` 显式依赖 `sortState`，取消排序后箭头同步消失。

## 验证

- [ ] 利润报表隐藏若干列 → 刷新页面 → 仍隐藏
- [ ] 再次查询（含换日期出不同币别列）→ 原隐藏列仍隐藏；新币别列默认可见
- [ ] 点「重置」→ 列恢复默认，刷新后也不再隐藏
- [ ] 欠费报表同上（配置互不覆盖）
- [ ] 列头同一列点三次：升序 → 降序 → 回到查询原始顺序，箭头消失
- [ ] 先隐藏左侧列再点右侧列头排序，三次循环仍正确
