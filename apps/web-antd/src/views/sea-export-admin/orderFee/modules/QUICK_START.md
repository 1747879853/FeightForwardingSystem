# 快速开始 - 使用新的模块化架构

## 🚀 5分钟快速上手

### 步骤1：查看示例文件

打开 `order-fee-table-handsontable-refactored.example.vue`，这是使用新架构的完整示例。

### 步骤2：理解核心概念

新的架构基于 **Composables** 模式，将功能拆分为独立的模块：

```typescript
// 旧方式：所有逻辑都在一个文件中（2461行）
<script setup>
  // 2000+ 行代码...
</script>

// 新方式：使用 composables（350行）
<script setup>
import { useFinishStatus } from './composables/useFinishStatus';
import { useOrderFeePrint } from './composables/useOrderFeePrint';
import { useDropdownSources } from './composables/useDropdownSources';
// ... 其他 imports

const { isFinished, toggleFinishStatus } = useFinishStatus(editId);
const { printing, handlePrint } = useOrderFeePrint();
// ... 使用其他 composables
</script>
```

### 步骤3：主要 Composables 说明

#### 1. useFinishStatus - 完结状态管理

```typescript
const {
  isFinished,           // 是否已完结（ref<boolean>）
  loadingFinishStatus,  // 加载状态（ref<boolean>）
  loadFinishStatus,     // 加载完结状态的方法
  toggleFinishStatus    // 切换完结/未完结的方法
} = useFinishStatus(editId);

// 使用示例
<Button @click="toggleFinishStatus">
  {{ isFinished ? '设为未完结' : '设为已完结' }}
</Button>
```

#### 2. useOrderFeePrint - 打印功能

```typescript
const {
  printing,    // 打印中状态（ref<boolean>）
  handlePrint  // 打印处理方法
} = useOrderFeePrint();

// 使用示例
<Button :loading="printing" @click="handlePrint(selectedRows, type, isSavedCheck)">
  打印
</Button>
```

#### 3. useDropdownSources - 下拉框数据源

```typescript
const {
  dropdownSources, // 下拉框数据源（ref）
  currentOptionsCache, // 当前选项缓存（ref）
  initDropdownSources, // 初始化方法
  updateUnitList, // 更新单位列表
  getFeeCodeList, // 获取费用代码列表
  loadClientList, // 加载客户列表
  getSettlementIndustryCategory, // 获取结算对象行业类别
} = useDropdownSources(orderCtnList);

// 在 onMounted 中初始化
onMounted(async () => {
  await initDropdownSources();
  await getFeeCodeList();
});
```

#### 4. useOrderFeeSort - 排序功能

```typescript
const {
  sortState,          // 排序状态
  sortableFieldsSet,  // 可排序字段集合
  getSortIcon,        // 获取排序图标
  handleColumnSort    // 处理列头点击排序
} = useOrderFeeSort(getTableDate);

// 使用示例
<OrderFeeTableCore
  :sortable-fields="sortableFieldsSet"
  :sort-state="sortState"
  @column-sort="handleColumnSort"
/>
```

#### 5. useHotColumns - Handsontable 列配置

```typescript
const getColumnIndex = (field: string): number => {
  const index = hotColumns.value.findIndex((col) => col.data === field);
  return index >= 0 ? index : 0;
};

const { hotColumns } = useHotColumns(
  props,
  dropdownSources,
  dataSource,
  selectedRowKeys,
  sortableFieldsSet,
  sortState,
  getSortIcon,
  getColumnIndex,
  currentOptionsCache,
);
```

#### 6. useHotSettings - Handsontable 设置

```typescript
const { hotSettings } = useHotSettings(
  dataSource,
  selectedRowKeys,
  hotColumns,
  sortableFieldsSet,
  handleColumnSort,
  linkage,
  dropdownSources,
  currentOptionsCache,
  loadClientList,
  getColumnIndex,
  getSettlementIndustryCategory,
);

// 传递给核心表格组件
<OrderFeeTableCore :hot-settings="hotSettings" />
```

#### 7. useModals - 模态框管理

```typescript
const {
  modifyModalRef,           // 编辑模态框引用
  auditHistoryModalRef,     // 审核历史模态框引用
  batchImportModalRef,      // 批量导入模态框引用
  openAuditHistoryModal,    // 打开审核历史
  handleModalConfirm        // 处理模态框确认
} = useModals();

// 使用示例
<Button @click="openAuditHistoryModal(rowData)">查看审核历史</Button>
```

### 步骤4：工具函数使用

#### helpers.ts 中的辅助函数

```typescript
import {
  getFeeCodeLabel,
  getIndustryCategoryLabel,
  getCurrencyLabel,
  getSettlementLabel,
  getInvoiceStatusLabel,
  getFeeStatusLabel,
  getDataEntryMethodLabel,
  formatDateTime,
  extractSettlementNameFromOrder,
} from './utils/helpers';

// 使用示例
const label = getFeeCodeLabel(feeCodeId, feeCodeList);
const formattedDate = formatDateTime(dateValue);
```

### 步骤5：完整的生命周期

```typescript
// 初始化
onMounted(async () => {
  initOrderFeeEnumCache();
  await initDropdownSources();
  await getFeeCodeList();
  getTableDate();
  loadFinishStatus();
});

// 监听器
watch(
  () => orderCtnList.value,
  () => updateUnitList(),
  { deep: true },
);

watch(
  () => dataSource.value,
  (newData) => {
    hotSettings.value.data = newData;
    nextTick(() => {
      coreTableRef.value?.hotTableRef?.hotInstance?.loadData(newData);
    });
  },
  { deep: true },
);

watch(
  () => hotColumns.value,
  (newColumns) => {
    hotSettings.value.columns = newColumns;
    nextTick(() => {
      coreTableRef.value?.hotTableRef?.hotInstance?.render();
    });
  },
  { deep: true },
);
```

## 🔍 常见问题

### Q1: 如何调试新的架构？

**A:** 由于去除了所有 console 日志，建议使用：

1. Vue DevTools 检查组件状态
2. 浏览器断点调试
3. 临时添加 console.log（仅用于调试，完成后删除）

### Q2: 如果某个 composable 不工作怎么办？

**A:**

1. 检查是否正确导入了 composable
2. 确认传入的参数类型正确
3. 查看 composable 内部的实现逻辑
4. 参考示例文件的使用方式

### Q3: 如何测试新功能？

**A:**

1. 在开发环境运行项目
2. 打开订单费用页面
3. 测试所有功能：
   - ✅ 添加/删除行
   - ✅ 保存数据
   - ✅ 打印功能
   - ✅ 排序功能
   - ✅ 下拉框选择
   - ✅ 完结状态切换
   - ✅ 批量导入
   - ✅ 审核历史

### Q4: 性能有提升吗？

**A:**

- 代码量减少 86%，理论上加载更快
- 模块化后更容易进行性能优化
- 建议使用 Performance API 测量实际性能

### Q5: 可以只使用部分 composables 吗？

**A:** 可以！每个 composable 都是独立的，你可以根据需要选择性使用。例如：

```typescript
// 只使用完结状态和打印功能
const { isFinished, toggleFinishStatus } = useFinishStatus(editId);
const { printing, handlePrint } = useOrderFeePrint();
// 其他逻辑保持原样
```

## 📚 更多资源

- 📖 [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) - 详细的重构指南
- 📊 [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - 重构完成总结
- 💡 [order-fee-table-handsontable-refactored.example.vue](./order-fee-table-handsontable-refactored.example.vue) - 完整示例

## 🆘 需要帮助？

如果遇到问题：

1. 查看示例文件的使用方式
2. 检查相关文档
3. 联系团队成员
4. 提交 Issue

---

**祝你使用愉快！** 🎉
