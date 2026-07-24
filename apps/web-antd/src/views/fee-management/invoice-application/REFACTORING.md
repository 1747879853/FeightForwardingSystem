# 开票申请表单组件重构说明

## 📋 重构概述

原 `form.vue` 文件有 **2890行**代码，难以维护。现已按功能拆分为多个组合函数（Composables），使代码更清晰、更易维护。

## 📁 文件结构

```
invoice-application/
├── form.vue                          # 主组件（精简版，约400行）
├── composables/                      # 组合函数目录
│   ├── use-form-data.ts             # 表单数据和基础状态管理
│   ├── use-fee-management.ts        # 费用管理逻辑
│   ├── use-goods-details.ts         # 商品明细管理
│   ├── use-invoice-info.ts          # 发票信息相关（客户、银行等）
│   ├── use-template.ts              # 备注模板相关
│   ├── use-submit.ts                # 提交和保存逻辑
│   ├── use-fee-selection.ts         # 费用选择处理
│   ├── use-computed.ts              # 计算属性
│   └── use-load-detail.ts           # 加载详情数据
└── components/                       # 子组件目录（保持不变）
    ├── FeeSelectionDrawer.vue
    ├── FeeDetailModal.vue
    ├── RemarkTemplateModal.vue
    └── SelectRemarkTemplateModal.vue
```

## 🔧 组合函数说明

### 1. use-form-data.ts
**职责**：管理表单数据和基础状态
- 表单数据（formData）
- 申请人信息
- 客户开票信息
- 发票商品编码列表
- 费用分组数据
- 工具方法：flattenTreeData、getAddedFeeIds等

### 2. use-fee-management.ts
**职责**：费用的增删改查和金额计算
- addSelectedFeesToForm - 添加费用到表单
- handleDeleteFee - 删除费用
- recalculateGoodsDetails - 重新计算商品明细金额

### 3. use-goods-details.ts
**职责**：商品明细的CRUD操作
- handleAddGoodsRow - 添加商品明细行
- handleDeleteGoodsRow - 删除商品明细行
- autoFillGoodsDetails - 自动填充商品明细
- mergeAmountToExistingGoods - 合并金额到现有商品明细
- 各种字段变化处理函数

### 4. use-invoice-info.ts
**职责**：发票相关信息管理
- loadClientInvoiceInfo - 加载客户开票信息
- updateClientBankByCurrency - 根据币别更新客户银行
- updateOrgBankByCurrency - 根据币别更新销售方银行
- filteredClientBanks - 过滤后的客户银行列表（computed）
- filteredOrgBanks - 过滤后的销售方银行列表（computed）

### 5. use-template.ts
**职责**：备注模板相关功能
- handleOpenSelectRemarkTemplateModal - 打开选择模板弹窗
- handleUseTemplate - 应用模板到备注
- handleExtractRemark - 从费用中提取备注
- remarkTemplateData - 模板占位符数据（computed）

### 6. use-submit.ts
**职责**：表单提交和保存
- handleSubmit - 保存表单
- handleDirectSubmit - 直接提交（保存+提交）
- handleSubmitForAudit - 提交审核
- validateForm - 表单验证
- buildBatchData - 构建批次数据

### 7. use-fee-selection.ts
**职责**：费用选择抽屉的保存处理
- handleFeeSelectionSave - 处理费用选择后的保存逻辑
- 自动设置归属组织、币别、汇率等
- 自动填充或合并商品明细

### 8. use-computed.ts
**职责**：所有计算属性
- totalInvoiceAmount - 发票总金额
- totalTaxAmount - 总税额
- totalAppliedAmount - 申请总金额
- hasAmountDifference - 是否有金额差异
- foreignCurrencyAmount - 外币金额
- taxRateOptions - 税率选项
- invoiceTypeOptions - 发票类型选项

### 9. use-load-detail.ts
**职责**：加载编辑状态的详情数据
- loadDetail - 从API加载详情并填充表单
- 处理feeGroups数据结构转换
- 加载商品明细数据

## ✨ 重构优势

### 1. **可维护性提升**
- 每个文件控制在200-300行以内
- 功能模块清晰，易于定位和修改
- 降低代码耦合度

### 2. **可测试性提升**
- 组合函数可以独立单元测试
- 逻辑与UI分离，便于Mock测试

### 3. **可复用性提升**
- 组合函数可在其他页面复用
- 例如：use-goods-details可用于其他需要商品明细的场景

### 4. **协作效率提升**
- 不同开发者可并行修改不同模块
- 减少代码冲突

### 5. **可读性提升**
- 主组件只关注UI和组合函数调用
- 业务逻辑封装在独立的composables中

## 🚀 使用方式

主组件中的使用方式非常简洁：

```typescript
// 1. 导入组合函数
import { useFormData } from './composables/use-form-data';
import { useFeeManagement } from './composables/use-fee-management';
// ... 其他组合函数

// 2. 使用组合函数
const { formData, isEdit, isReadOnly, ... } = useFormData();
const { handleDeleteFee, ... } = useFeeManagement(...);
// ... 其他组合函数

// 3. 在模板中使用返回的状态和方法
```

## 📝 注意事项

1. **依赖传递**：组合函数之间如有依赖，通过参数传递而非直接导入
2. **响应式保持**：所有ref/reactive对象保持响应式特性
3. **避免循环依赖**：确保组合函数之间不会形成循环引用
4. **类型安全**：所有组合函数都有完整的TypeScript类型定义

## 🔄 后续优化建议

1. 可以考虑将部分通用逻辑提取到全局composables
2. 为每个组合函数添加单元测试
3. 添加JSDoc注释完善API文档
4. 考虑使用provide/inject进一步优化深层组件通信

## 📊 重构前后对比

| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| 主组件行数 | 2890行 | ~400行 | ↓ 86% |
| 文件数量 | 1个 | 10个 | 模块化 |
| 最大文件行数 | 2890行 | ~300行 | ↓ 90% |
| 代码复用性 | 低 | 高 | ⬆️ |
| 可测试性 | 困难 | 容易 | ⬆️ |
| 维护难度 | 高 | 低 | ⬇️ |

## 👥 团队协作指南

- **修改表单数据结构**：修改 `use-form-data.ts`
- **修改费用相关逻辑**：修改 `use-fee-management.ts` 或 `use-fee-selection.ts`
- **修改商品明细逻辑**：修改 `use-goods-details.ts`
- **修改发票信息逻辑**：修改 `use-invoice-info.ts`
- **修改模板功能**：修改 `use-template.ts`
- **修改提交逻辑**：修改 `use-submit.ts`
- **修改UI布局**：修改 `form.vue` 的template部分

---

**重构完成时间**：2026-07-24  
**重构负责人**：AI Assistant  
**备份文件**：form.vue.backup
