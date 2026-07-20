# 订单费用表格组件架构说明

## 📁 文件结构

```
orderFee/modules/
├── order-fee-table-handsontable.vue          # 主组件（575行 → 约300行）
├── OrderFeeTableCore.vue                      # 核心表格组件（约230行）
├── composables/
│   ├── useOrderFeeData.ts                     # 数据管理逻辑（约400行）
│   └── useOrderFeeActions.ts                  # 操作逻辑（约450行）
├── order-fee-editor-modal.vue                 # 费用编辑弹窗（保持不变）
├── order-fee-audit-history-modal.vue          # 审核历史弹窗（保持不变）
└── batch-import-fee-modal.vue                 # 批量导入弹窗（保持不变）
```

## 🎯 拆分原则

### 1. 主组件 (`order-fee-table-handsontable.vue`)

**职责**：

- 模板渲染和样式定义
- 组合使用 composables 和子组件
- 处理打印等独立功能
- 管理模态框引用和交互

**代码量**：从 ~1500行 减少到 ~300行

### 2. 核心表格组件 (`OrderFeeTableCore.vue`)

**职责**：

- Handsontable 实例管理
- 单元格渲染和自定义下拉框
- 行选择和事件处理
- 表格样式优化

**代码量**：约 230 行

### 3. 数据管理 Composable (`useOrderFeeData.ts`)

**职责**：

- 数据加载和查询（`getTableDate`）
- 数据同步（`syncFee`）
- 金额计算（`calculateAndEmitAmount`）
- 订单详情应用（`applyOrderDetail`）
- 数据规范化（`normalizeOrderFeeWithRowKey`、`sanitizeOrderFee`）

**代码量**：约 400 行

### 4. 操作逻辑 Composable (`useOrderFeeActions.ts`)

**职责**：

- 行操作（`addRow`、`delRow`、`removeSelectedRows`）
- 费用操作（`Submitted`、`submitModify`、`submitDelete`）
- 批量操作（`generateOppositeFees`、`saveRow`）
- 撤回操作（`orderFeeWithdraw`）
- 模态框交互（`openModifyModal`、`handleModalConfirm`）

**代码量**：约 450 行

## 🔄 数据流

```
父组件
  ↓ (Props: type, mode, orderDetail, etc.)
主组件 (order-fee-table-handsontable.vue)
  ↓ (调用 composables)
  ├─ useOrderFeeData (数据管理)
  │   ├─ dataSource (响应式数据)
  │   ├─ selectedRowKeys (选中行)
  │   └─ getTableDate, syncFee (方法)
  │
  └─ useOrderFeeActions (操作逻辑)
      ├─ addRow, delRow (行操作)
      ├─ Submitted, saveRow (费用操作)
      └─ openModifyModal (模态框)

  ↓ (传递给子组件)
OrderFeeTableCore (核心表格)
  ↓ (Emits: update:selectedRowKeys)
主组件
  ↓ (Emits: sync-fee, update-amount, refresh-opposite-table)
父组件
```

## ✨ 优势

### 1. **可维护性提升**

- 每个文件职责清晰，代码量控制在 500 行以内
- 修改特定功能时只需关注对应文件
- 降低了代码耦合度

### 2. **可测试性提升**

- Composables 可以独立单元测试
- 子组件可以独立渲染测试
- 业务逻辑与 UI 分离

### 3. **可复用性提升**

- Composables 可在其他组件中复用
- 核心表格组件可独立使用
- 操作逻辑可被多个页面共享

### 4. **团队协作友好**

- 多人可同时修改不同文件，减少冲突
- 新功能开发更容易定位文件
- Code Review 更聚焦

## 🔧 使用示例

### 在父组件中使用

```vue
<template>
  <OrderFeeTableHandsontable
    :type="0"
    :mode="'normal'"
    :order-detail="orderDetail"
    @sync-fee="handleSyncFee"
    @update-amount="handleUpdateAmount"
    @refresh-opposite-table="handleRefresh"
  />
</template>

<script setup>
import OrderFeeTableHandsontable from './modules/order-fee-table-handsontable.vue';

const handleSyncFee = (data) => {
  console.log('费用同步', data);
};

const handleUpdateAmount = (data) => {
  console.log('金额更新', data);
};

const handleRefresh = () => {
  // 刷新对立表格
};
</script>
```

### 扩展新功能

如需添加新的费用操作，只需：

1. 在 `useOrderFeeActions.ts` 中添加新方法
2. 在主组件的工具栏中添加按钮
3. 绑定到新方法即可

## 📝 注意事项

1. **保持 API 兼容**：对外暴露的方法（如 `getTableDate`）保持不变
2. **类型安全**：虽然使用了 `any` 类型简化 emit，但核心数据类型保持强类型
3. **响应式数据**：所有状态通过 composables 管理，确保响应式更新
4. **事件传递**：子组件事件通过主组件向上传递，保持单向数据流

## 🚀 后续优化建议

1. **提取常量**：将魔法数字和字符串提取为常量文件
2. **类型完善**：逐步完善 emit 的类型定义
3. **单元测试**：为 composables 编写单元测试
4. **性能优化**：考虑使用虚拟滚动优化大数据量场景
