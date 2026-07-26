# 运价批量新增 Handsontable 实现

## 概述

本目录包含使用 Handsontable 重写的运价批量新增功能，替代了原有的 VXE Table 实现。

## 架构设计

### 组件结构

```
batch-add-modal.vue (主模态框)
├── BatchAddTableCore.vue (Handsontable 核心表格组件)
└── composables/
    ├── useBatchAddData.ts (数据管理)
    ├── useBatchAddDropdownSources.ts (下拉框数据源管理)
    ├── useBatchAddColumns.ts (列配置)
    ├── useBatchAddSettings.ts (Handsontable 设置)
    └── useBatchAddActions.ts (操作逻辑)
```

### 核心特性

1. **Handsontable 表格**
   - 高性能的 spreadsheet 编辑器
   - 支持键盘导航和快速编辑
   - 内置复选框、日期、数字等编辑器类型

2. **动态箱型列**
   - 通过下拉框动态添加箱型列
   - 自动为所有行初始化新箱型的空值
   - 支持无限数量的箱型列

3. **数据缓存机制**
   - 页面加载时预加载港口、币别等基础数据
   - Label 缓存避免重复 API 调用
   - ID 到 Label 的自动转换

4. **字段联动逻辑**
   - 是否直达 → 控制中转港禁用状态
   - 日期模式 vs 星期模式 → 互斥清空
   - DEM + DET = 免箱使期自动计算

5. **懒加载下拉选项**
   - 点击单元格时才加载下拉选项
   - Autocomplete 编辑器支持搜索过滤
   - 保存原值以便取消编辑时恢复

## 文件说明

### batch-add-modal.vue

主模态框组件，整合所有 composables 并提供用户界面。

**主要功能：**

- 工具栏操作（新增行、复制、删除、添加箱型）
- 模态框生命周期管理
- 表单验证和提交

### BatchAddTableCore.vue

Handsontable 核心表格组件，封装表格渲染和事件处理。

**主要功能：**

- 渲染 Handsontable 实例
- 处理下拉框打开回调
- 监听数据变化并同步到表格

### composables/useBatchAddData.ts

数据管理 composable，负责行数据的增删改查。

**导出：**

- `dataSource`: 表格数据源
- `selectedRowKeys`: 选中的行 keys
- `addedCtnTypes`: 已添加的箱型列表
- `addRow()`: 新增行
- `deleteSelectedRows()`: 删除选中行
- `copySelectedRows()`: 复制选中行
- `validateForm()`: 验证表单
- `prepareSubmitData()`: 准备提交数据

### composables/useBatchAddDropdownSources.ts

下拉框数据源管理 composable，负责加载和缓存基础数据。

**导出：**

- `allCtnOptions`: 所有箱型选项
- `labelCache`: Label 缓存
- `getCarrierName()`: 获取船公司名称
- `getPortName()`: 获取港口名称
- `getCurrencyName()`: 获取币别名称
- `getClientName()`: 获取客户名称
- `initDropdownSources()`: 初始化下拉选项

### composables/useBatchAddColumns.ts

列配置 composable，定义 Handsontable 的所有列。

**导出：**

- `hotColumns`: 动态计算的列配置

**列类型：**

- 复选框列
- Autocomplete 编辑器（船公司、港口、币别、客户）
- Dropdown 编辑器（是否直达）
- Numeric 编辑器（费用、天数）
- Date 编辑器（日期时间）
- Text 编辑器（备注、约号等）

### composables/useBatchAddSettings.ts

Handsontable 设置 composable，配置表格行为和事件。

**导出：**

- `hotSettings`: Handsontable 配置对象

**关键配置：**

- `fixedColumnsLeft: 2`: 固定前两列
- `contextMenu`: 启用右键菜单
- `columnSorting`: 启用列排序
- `afterChange`: 处理字段联动
- `cells`: 动态设置单元格属性

### composables/useBatchAddActions.ts

操作逻辑 composable，包含所有用户交互操作。

**导出：**

- `loading`: 提交加载状态
- `customRowCountVisible`: 自定义行数弹窗可见性
- `handleAddRow()`: 新增行
- `handleDeleteRows()`: 删除选中行
- `handleCopyRows()`: 复制选中行
- `handleAddCtnType()`: 添加箱型列
- `handleSubmit()`: 提交表单

## 使用示例

```vue
<script setup>
import BatchAddModal from './modules/batch-add-modal.vue';
import { ref } from 'vue';

const modalRef = ref();

function openModal() {
  modalRef.value?.open();
}

function handleSuccess() {
  console.log('批量新增成功');
  // 刷新列表
}
</script>

<template>
  <Button @click="openModal">批量新增</Button>
  <BatchAddModal ref="modalRef" @success="handleSuccess" />
</template>
```

## 注意事项

### 1. 数据类型

- 所有 ID 字段在数据模型中同时保存原始值和 Label 值
- 提交时使用 `_value` 后缀的原始 ID
- 显示时使用不带后缀的 Label

### 2. 性能优化

- 使用 `shallowRef` 包装大型配置对象
- 监听数据变化时调用 `loadData()` 而非重新渲染
- 懒加载下拉选项，避免一次性加载大量数据

### 3. 待完善功能

以下功能需要在后续迭代中补充：

- [ ] 船公司列表加载（需要 API 支持）
- [ ] 客户列表加载（需要 API 支持）
- [ ] AI 数据识别和填充（参考原版实现）
- [ ] 列排序功能实现
- [ ] 打印功能

### 4. 与原版对比

| 特性       | 原版 (VXE Table) | 新版 (Handsontable) |
| ---------- | ---------------- | ------------------- |
| 表格引擎   | VXE Table        | Handsontable        |
| 性能       | 中等             | 高（适合大数据量）  |
| 编辑体验   | 点击编辑         | Excel 式编辑        |
| 键盘导航   | 基础支持         | 完整支持            |
| 代码复杂度 | 高（单文件）     | 中（模块化）        |
| 可维护性   | 低               | 高                  |

## 调试技巧

### 控制台日志

组件中已添加详细的调试日志：

- 💾 保存原值
- ✅ 设置 source
- 📊 数据统计
- ⚠️ 警告信息

打开浏览器控制台可以看到完整的操作流程。

### 常见问题

**Q: 下拉框不显示选项？**

A: 检查 `currentOptionsCache` 是否有数据，确保 `initDropdownSources()` 已调用。

**Q: 箱型列添加后不显示？**

A: 检查 `addedCtnTypes` 是否更新，确认 `watch` 监听器已触发。

**Q: 数据修改后表格未更新？**

A: Handsontable 需要调用 `loadData()` 或 `render()` 才能刷新视图。

## 相关文件

- 原版实现：`batch-add-modal-back.vue`（备份）
- 参考实现：`../orderFee/modules/order-fee-table-handsontable.vue`
- API 定义：`#/api/sea-export/freight-rate-admin`

## 更新日志

### 2026-07-26

- ✅ 完成 Handsontable 基础架构
- ✅ 实现动态箱型列
- ✅ 实现数据缓存机制
- ✅ 实现字段联动逻辑
- ⏳ 待补充船公司和客户数据加载
