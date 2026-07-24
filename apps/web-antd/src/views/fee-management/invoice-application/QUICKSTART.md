# 快速开始指南

## 🚀 5分钟了解重构后的代码结构

### 1. 文件位置

```
apps/web-antd/src/views/fee-management/invoice-application/
├── form.vue                              # 原文件（2890行，已备份）
├── form.vue.backup                       # 备份文件
├── composables/                          # ✨ 新增：组合函数目录
│   ├── use-form-data.ts                 # 表单数据管理
│   ├── use-fee-management.ts            # 费用管理
│   ├── use-goods-details.ts             # 商品明细管理
│   ├── use-invoice-info.ts              # 发票信息
│   ├── use-template.ts                  # 备注模板
│   ├── use-submit.ts                    # 提交保存
│   ├── use-fee-selection.ts             # 费用选择
│   ├── use-computed.ts                  # 计算属性
│   └── use-load-detail.ts               # 加载详情
├── components/                           # 子组件（保持不变）
├── REFACTORING.md                        # 详细重构说明
├── SUMMARY.md                            # 重构总结
└── QUICKSTART.md                         # 本文件
```

### 2. 核心概念

#### 什么是组合函数（Composable）？
组合函数是Vue 3的一种代码组织方式，它将相关的状态和逻辑封装到一个函数中，可以在多个组件间复用。

```typescript
// 简单示例
export function useCounter() {
  const count = ref(0)
  
  function increment() {
    count.value++
  }
  
  return { count, increment }
}

// 在组件中使用
const { count, increment } = useCounter()
```

#### 为什么要拆分？
- ❌ **之前**：2890行代码全部在一个文件中，难以维护
- ✅ **现在**：每个功能模块独立，最多300行，清晰易懂

### 3. 如何使用

#### 步骤1：查看组合函数

打开任意一个组合函数文件，例如 `use-form-data.ts`：

```typescript
// composables/use-form-data.ts
export function useFormData() {
  // 1. 定义状态
  const formData = ref({...})
  const applicantName = ref('')
  
  // 2. 定义方法
  function initApplicantInfo() {...}
  
  // 3. 返回给组件使用
  return {
    formData,
    applicantName,
    initApplicantInfo,
  }
}
```

#### 步骤2：在主组件中使用

```vue
<script lang="ts" setup>
// 1. 导入组合函数
import { useFormData } from './composables/use-form-data'

// 2. 调用组合函数，获取状态和方法
const { formData, applicantName, initApplicantInfo } = useFormData()

// 3. 在模板中直接使用
</script>

<template>
  <Input :value="applicantName" />
</template>
```

### 4. 依赖关系图

```
form.vue (主组件)
  │
  ├─→ useFormData (表单数据)
  │     └─→ 提供: formData, applicantName, codeInvoiceList...
  │
  ├─→ useGoodsDetails (商品明细)
  │     ├─→ 依赖: goodsDetails, codeInvoiceList, formData...
  │     └─→ 提供: handleAddGoodsRow, autoFillGoodsDetails...
  │
  ├─→ useFeeManagement (费用管理)
  │     ├─→ 依赖: formData, feeGroupsData, goodsDetails...
  │     └─→ 提供: addSelectedFeesToForm, handleDeleteFee...
  │
  ├─→ useInvoiceInfo (发票信息)
  │     ├─→ 依赖: formData, clientInvoiceInfoList...
  │     └─→ 提供: loadClientInvoiceInfo, filteredClientBanks...
  │
  ├─→ useTemplate (模板)
  │     ├─→ 依赖: formData, feeGroupsData...
  │     └─→ 提供: handleUseTemplate, remarkTemplateData...
  │
  ├─→ useSubmit (提交)
  │     ├─→ 依赖: formData, goodsDetails, isEdit, editId
  │     └─→ 提供: handleSubmit, handleDirectSubmit...
  │
  ├─→ useFeeSelectionSave (费用选择)
  │     ├─→ 依赖: 多个其他组合函数的方法
  │     └─→ 提供: handleFeeSelectionSave
  │
  ├─→ useComputed (计算属性)
  │     ├─→ 依赖: goodsDetails, formData...
  │     └─→ 提供: totalInvoiceAmount, totalTaxAmount...
  │
  └─→ useLoadDetail (加载详情)
        ├─→ 依赖: 多个状态和方法
        └─→ 提供: loadDetail
```

### 5. 常见场景示例

#### 场景1：添加商品明细行

**之前**（在2890行的大文件中找）：
```typescript
// 需要滚动很久才能找到这个函数
function handleAddGoodsRow(index?: number) {
  // ... 100行代码
}
```

**现在**（直接定位）：
```typescript
// composables/use-goods-details.ts
// 直接打开这个文件，就能找到
export function useGoodsDetails(...) {
  function handleAddGoodsRow(index?: number) {
    // ... 清晰的逻辑
  }
  
  return { handleAddGoodsRow }
}
```

#### 场景2：修改费用删除逻辑

**之前**：
- 在2890行文件中搜索 "delete"
- 可能找到多个相关代码
- 不确定改哪里

**现在**：
- 直接打开 `use-fee-management.ts`
- 找到 `handleDeleteFee` 函数
- 修改即可，不影响其他模块

#### 场景3：复用商品明细逻辑到其他页面

**之前**：
- 无法复用，代码耦合在form.vue中

**现在**：
```typescript
// 在其他页面的组件中
import { useGoodsDetails } from '@/views/fee-management/invoice-application/composables/use-goods-details'

const { handleAddGoodsRow, autoFillGoodsDetails } = useGoodsDetails(
  goodsDetails,
  codeInvoiceList,
  formData,
  invoiceExchangeRate,
  flattenTreeData,
)
```

### 6. 调试技巧

#### 如何追踪数据流？

```typescript
// 1. 在组合函数中添加日志
export function useFeeManagement(...) {
  function addSelectedFeesToForm(selectedFees: any[]) {
    console.log('📥 收到费用:', selectedFees)
    
    // ... 处理逻辑
    
    console.log('✅ 添加完成，当前费用数:', formData.value.invoiceApplicationItems.length)
  }
}

// 2. 在主组件中查看
const { addSelectedFeesToForm } = useFeeManagement(...)
// 控制台会显示完整的日志
```

#### 如何测试单个组合函数？

```typescript
// 创建测试文件：use-goods-details.test.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useGoodsDetails } from './use-goods-details'

describe('useGoodsDetails', () => {
  it('应该能添加商品明细行', () => {
    const goodsDetails = ref([])
    const codeInvoiceList = ref([])
    const formData = ref({ invoiceApplicationItems: [] })
    const invoiceExchangeRate = ref(1)
    const flattenTreeData = (data) => data
    
    const { handleAddGoodsRow } = useGoodsDetails(
      goodsDetails,
      codeInvoiceList,
      formData,
      invoiceExchangeRate,
      flattenTreeData,
    )
    
    // 模拟已有费用
    formData.value.invoiceApplicationItems = [{ orderFeeId: 1 }]
    
    handleAddGoodsRow()
    
    expect(goodsDetails.value.length).toBe(1)
  })
})
```

### 7. 迁移步骤（如果要完全替换form.vue）

#### 第1步：备份
```bash
cp form.vue form.vue.backup-$(date +%Y%m%d)
```

#### 第2步：创建新文件
参考 `form-refactored.vue.example` 创建新的 `form.vue`

#### 第3步：补充UI代码
从备份文件中复制右侧发票区域的完整UI代码

#### 第4步：补充缺失的导入
```typescript
import { message } from 'ant-design-vue'
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data'
```

#### 第5步：测试
- 新建开票申请
- 编辑开票申请
- 查看开票申请（只读）
- 各种边界情况

### 8. 常见问题FAQ

**Q1: 为什么有些组合函数要接收那么多参数？**
A: 这是为了避免循环依赖。如果组合函数A导入组合函数B，而B又导入A，就会形成循环依赖。通过参数传递依赖可以解决这个问题。

**Q2: 我可以修改组合函数的返回值吗？**
A: 可以，但要注意：
- 保持响应式（返回ref或reactive对象）
- 更新所有使用该组合函数的地方
- 最好先和团队沟通

**Q3: 如果我要添加新功能，应该放在哪里？**
A: 根据功能归属：
- 表单数据相关 → use-form-data.ts
- 费用操作 → use-fee-management.ts
- 商品明细 → use-goods-details.ts
- 发票信息 → use-invoice-info.ts
- 模板功能 → use-template.ts
- 提交逻辑 → use-submit.ts
- 如果是全新的功能域，可以创建新的组合函数文件

**Q4: 性能会受影响吗？**
A: 不会。组合函数只是在setup阶段执行一次，返回的对象被组件引用。运行时的性能和之前一样。

**Q5: 如何确保类型安全？**
A: 所有组合函数都有完整的TypeScript类型定义。使用时IDE会自动提示可用的属性和方法。

### 9. 最佳实践

✅ **推荐做法**：
- 每个组合函数职责单一
- 通过参数传递依赖，避免循环导入
- 保持返回值的响应式
- 添加适当的注释说明用途
- 为复杂逻辑编写单元测试

❌ **避免做法**：
- 在组合函数中直接操作DOM
- 组合函数之间相互导入形成循环依赖
- 返回非响应式的普通对象
- 在一个组合函数中处理多个不相关的功能

### 10. 下一步

1. 📖 阅读 `REFACTORING.md` 了解详细设计
2. 🔍 浏览各个组合函数文件，熟悉代码结构
3. 🧪 尝试修改一个小功能，体验新的开发流程
4. 💬 与团队分享这次重构的经验和收获

---

**祝你使用愉快！** 🎉

如有问题，请查看：
- `REFACTORING.md` - 详细技术文档
- `SUMMARY.md` - 重构总结和建议
- 或直接询问团队成员
