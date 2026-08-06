# OrderFeeTemplateAdmin 费用模板管理模块

## 📁 目录结构

```
OrderFeeTemplateAdmin/
├── list.vue                          # 列表页面
├── data.ts                           # 表格列定义和查询配置
└── modules/
    ├── form.vue                      # 新建/编辑表单弹窗（主组件）
    ├── data.ts                       # ✨ 枚举定义和表单schema配置
    ├── order-fee-template-table.vue  # Handsontable 费用明细表格组件
    └── composables/                  # 组合式函数
        ├── useDropdownSources.ts     # 下拉数据源管理
        ├── useFieldLinkage.ts        # 字段联动逻辑
        └── useHotSettings.ts         # Handsontable 配置管理
```

## 🏗️ 架构设计

### 1. 组件化设计原则

#### 主组件 (form.vue)

- **职责**：管理基础信息表单、模态框生命周期、数据提交
- **特点**：
  - 使用 `useVbenForm` 创建基础信息表单
  - 从 `./data.ts` 导入表单schema配置和枚举定义
  - 引入 `OrderFeeTemplateTable` 子组件管理费用明细
  - 通过 `v-model:dataSource` 实现双向数据绑定
  - 使用 composables 统一管理业务逻辑

#### 数据配置文件 (modules/data.ts)

- **职责**：集中管理枚举选项和表单schema配置
- **导出内容**：
  - `bizTypeOptions` - 业务类型枚举
  - `paySideOptions` - 收付类型枚举
  - `tradeTermsOptions` - 贸易条款枚举
  - `cargoTypeOptions` - 货物类型枚举
  - `blTypeOptions` - 提单类型枚举
  - `getFormSchema()` - 表单schema配置函数
- **优势**：
  - 配置与视图分离，便于维护
  - 枚举值集中管理，避免硬编码
  - 支持复用和扩展

#### Handsontable 组件 (order-fee-template-table.vue)

- **职责**：渲染费用明细表格、处理单元格编辑、数据同步
- **特点**：
  - 封装 Handsontable 实例的创建和销毁
  - 暴露 `syncDataToParent()` 方法供父组件调用
  - 暴露 `updateData()` 方法用于外部更新数据
  - 使用 `shallowRef` 优化性能

### 2. Composables 分层架构

#### useDropdownSources.ts - 数据源层

```typescript
export function useDropdownSources() {
  return {
    feeCodeList, // 费用代码列表
    currencyList, // 币别列表
    clientListByIndustry, // 按行业分类的客户列表
    getSettlementList, // 获取结算对象列表
    getFeeCodeDetail, // 获取费用代码详情
  };
}
```

**职责**：

- 集中管理所有下拉选项数据
- 提供数据查询方法
- 支持动态过滤（如根据行业类别过滤客户）

#### useFieldLinkage.ts - 业务逻辑层

```typescript
export function useFieldLinkage(dropdownSources) {
  return {
    onFeeCodeChange, // 费用代码变更联动
    onIndustryCategoryChange, // 行业类别变更联动
    onUnitPriceChange, // 含税单价变更联动
  };
}
```

**联动规则**：

1. **费用代码 → 币别/单位/税率**
   - 选择费用代码后，自动填充对应的币别、单位、税率
2. **行业类别 → 结算对象**
   - 选择行业类别后，动态更新结算对象的下拉选项
   - 根据行业类别过滤对应类型的客户

3. **含税单价 → 不含税单价**
   - 修改含税单价时，根据税率自动计算不含税单价
   - 公式：`不含税单价 = 含税单价 / (1 + 税率/100)`

#### useHotSettings.ts - 视图配置层

```typescript
export function useHotSettings(dataSource, dropdownSources, linkage) {
  return {
    hotSettings, // Handsontable 完整配置
    columns, // 列定义
  };
}
```

**配置内容**：

- 列定义（类型、宽度、格式）
- 事件回调（`afterBeginEditing`、`afterChange`）
- 右键菜单配置
- 最小空行设置

### 3. 数据流图

```
┌─────────────────────────────────────────┐
│           form.vue (父组件)              │
│  ┌───────────────────────────────────┐  │
│  │   基础信息表单 (useVbenForm)      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ OrderFeeTemplateTable (子组件)    │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ useDropdownSources          │  │  │
│  │  └─────────────────────────────┘  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ useFieldLinkage             │  │  │
│  │  └─────────────────────────────┘  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ useHotSettings              │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ↓ v-model:dataSource
    feeItems (响应式数组)
         ↓ handleSubmit
    API 提交 (add/editOrderFeeTemplate)
```

## 🔧 核心功能实现

### 1. 字段联动机制

#### 费用代码联动

```typescript
// useFieldLinkage.ts
onFeeCodeChange(rowIndex, feeCodeId, hotInstance) {
  const feeDetail = dropdownSources.getFeeCodeDetail(feeCodeId);
  if (!feeDetail) return;

  // 自动填充币别
  hotInstance.setDataAtCell(rowIndex, 'currencyId', currencyLabel);

  // 自动填充单位
  hotInstance.setDataAtCell(rowIndex, 'unit', feeDetail.unit);

  // 自动填充税率
  hotInstance.setDataAtCell(rowIndex, 'taxRate', feeDetail.taxRate);
}
```

#### 行业类别联动

```typescript
// useHotSettings.ts - afterBeginEditing
if (field === 'settlementId') {
  const industryValue = hotInstance.getDataAtCell(row, 'industryCategory');
  const settlementList = dropdownSources.getSettlementList(industryValue);
  const source = settlementList.map((item) => item.label);
  hotInstance.setCellMeta(row, col, 'source', source);
}
```

#### 单价计算联动

```typescript
// useFieldLinkage.ts
onUnitPriceChange(rowIndex, unitPrice, taxRate, hotInstance) {
  if (!unitPrice || !taxRate) return;

  // 不含税单价 = 含税单价 / (1 + 税率/100)
  const noTaxUnitPrice = unitPrice / (1 + taxRate / 100);
  hotInstance.setDataAtCell(rowIndex, 'noTaxUnitPrice',
    parseFloat(noTaxUnitPrice.toFixed(2)));
}
```

### 2. 性能优化策略

#### shallowRef 优化

```typescript
// order-fee-template-table.vue
const hotSettings = shallowRef(rawHotSettings.value);
```

- 避免对大型配置对象进行深度响应式追踪
- 减少不必要的重新渲染

#### 按需更新

```typescript
// 只更新变化的部分，而非重建整个实例
watch(
  () => props.dataSource,
  (newData) => {
    if (hotInstance) {
      hotInstance.loadData(newData); // 仅加载数据，不重建
    }
  },
);
```

### 3. 数据同步机制

#### 子组件 → 父组件

```typescript
// order-fee-template-table.vue
function syncDataToParent() {
  if (!hotInstance) return;

  const data = hotInstance.getData();
  const columns = hotInstance.getSettings().columns;

  // 将数组格式转换为对象格式
  const result = data.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: any, index: number) => {
      if (col.data) {
        obj[col.data] = row[index];
      }
    });
    return obj;
  });

  emit('update:dataSource', result);
}
```

#### 父组件 → 子组件

```typescript
// form.vue
<OrderFeeTemplateTable
  ref="hotTableRef"
  v-model:data-source="feeItems"
/>

// 当 feeItems 变化时，子组件自动监听并更新
watch(() => props.dataSource, (newData) => {
  if (hotInstance) {
    hotInstance.loadData(newData);
  }
});
```

## 📝 使用示例

### 在父组件中使用

```
<script setup lang="ts">
import OrderFeeTemplateTable from './order-fee-template-table.vue';

const feeItems = ref([]);
const hotTableRef = ref();

// 提交前同步数据
async function handleSubmit() {
  // 从子组件获取最新数据
  hotTableRef.value?.syncDataToParent();

  // 验证并提交
  await api.submit({
    ...formData,
    orderFeeTemplateItems: feeItems.value,
  });
}

// 编辑时加载数据
async function loadDetail(id: string) {
  const detail = await api.getDetail(id);
  feeItems.value = detail.orderFeeTemplateItems;

  // 等待 DOM 更新后同步到表格
  await nextTick();
  hotTableRef.value?.updateData(feeItems.value);
}
</script>

<template>
  <OrderFeeTemplateTable ref="hotTableRef" v-model:data-source="feeItems" />
</template>
```

## 🎯 最佳实践

### 1. 组件职责单一

- 每个 composable 只负责一个领域的逻辑
- 组件之间通过 props/emits 通信，避免直接操作内部状态

### 2. 数据流向清晰

- 单向数据流：父组件 → 子组件（props）
- 事件驱动：子组件 → 父组件（emits）
- 双向绑定：使用 `v-model` 简化常用场景

### 3. 性能优先

- 使用 `shallowRef` 包装大型对象
- 避免在 watch 中进行深度监听
- 批量更新而非逐条更新

### 4. 可维护性

- 清晰的目录结构和命名规范
- 详细的注释和文档
- 统一的代码风格

## 🔄 与海运出口费用录入的对比

| 特性     | OrderFeeTemplateAdmin     | SeaExport OrderFee    |
| -------- | ------------------------- | --------------------- |
| 架构模式 | 组件化 + Composables      | 单文件组件 + 内联逻辑 |
| 数据管理 | 独立的 useDropdownSources | 混合在组件内部        |
| 字段联动 | 独立的 useFieldLinkage    | 内联在 afterChange    |
| 配置管理 | 独立的 useHotSettings     | 直接在组件中定义      |
| 复用性   | ⭐⭐⭐⭐⭐ 高             | ⭐⭐ 低               |
| 可测试性 | ⭐⭐⭐⭐⭐ 高             | ⭐⭐ 低               |
| 维护成本 | ⭐⭐⭐⭐⭐ 低             | ⭐⭐ 高               |

## 🚀 未来优化方向

1. **类型安全增强**
   - 为所有 DTO 添加完整的 TypeScript 类型定义
   - 使用泛型提升 composables 的复用性

2. **单元测试覆盖**
   - 为每个 composable 编写单元测试
   - 测试字段联动逻辑的正确性

3. **性能监控**
   - 添加性能埋点，监控表格渲染时间
   - 虚拟滚动支持大数据量场景

4. **国际化支持**
   - 提取所有硬编码文本到语言包
   - 支持多语言切换

## 📚 相关文档

- [Handsontable 官方文档](https://handsontable.com/docs)
- [Vue 3 Composition API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)
- [Vben Admin 开发指南](../../../../../docs/)
