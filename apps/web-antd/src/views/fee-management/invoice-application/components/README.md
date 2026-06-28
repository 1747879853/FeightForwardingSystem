# 备注模板管理组件

## 概述

`RemarkTemplateModal.vue` 是发票申请模块的备注模板管理组件，用于管理不同公司和币别的发票备注模板。

## 功能特性

1. **按所属公司+币别区分模板**
   - 每个公司+币别组合可以设置一个默认模板
   - 支持筛选和查询特定公司或币别的模板

2. **可用占位符**
   - [委托编号] - 自动替换为委托编号
   - <主提单号> - 自动替换为主提单号
   - [折算汇率] - 自动替换为折算汇率
   - [外币金额(总计)] - 自动替换为外币总金额
   - [人民币金额(总计)] - 自动替换为人民币总金额
   - [购方银行] - 自动替换为购买方银行名称
   - [购方账号] - 自动替换为购买方银行账号
   - [销方银行] - 自动替换为销售方银行名称
   - [销方账号] - 自动替换为销售方银行账号

3. **模板操作**
   - 新增模板：选择公司和币别，输入模板内容
   - 编辑模板：修改现有模板的内容
   - 删除模板：删除不需要的模板
   - 设置默认：将模板设置为该组合的默认模板
   - 使用模板：快速应用模板到当前开票申请（待实现）

4. **默认模板规则**
   - 每个公司+币别组合最多只能有一个默认模板
   - 设置新默认模板时，会自动取消旧的默认模板
   - 在添加费用时，会根据当前申请的所属公司和币别自动加载对应的默认模板到备注字段

## 使用方法

### 在表单中打开模板管理

```typescript
// 导入组件
import RemarkTemplateModal from './components/RemarkTemplateModal.vue';

// 添加状态
const remarkTemplateModalVisible = ref(false);

// 添加方法
function handleOpenRemarkTemplateModal() {
  remarkTemplateModalVisible.value = true;
}

// 在模板中使用
<Button @click="handleOpenRemarkTemplateModal">模板设置</Button>
<RemarkTemplateModal v-model:visible="remarkTemplateModalVisible" />
```

### 自动加载默认模板（待实现）

在添加费用后，根据当前选择的结算单位和币别，自动从模板管理中加载对应的默认模板到备注字段：

```typescript
// TODO: 实现自动加载默认模板的逻辑
async function loadDefaultRemarkTemplate(
  settlementId: string,
  currencyId: number,
) {
  // 1. 获取结算单位对应的公司ID
  // 2. 查询该组合的默认模板
  // 3. 将模板内容填充到 formData.remark
}
```

## API接口

所有接口定义在 `#/api/Invoice/invoiceRemarkTemplate.ts` 中：

- `addAsync` - 新增模板
- `editAsync` - 编辑模板
- `deleteAsync` - 删除模板
- `detailAsync` - 获取模板详情
- `getPagedListAsync` - 获取模板分页列表

## 数据结构

### InvoiceRemarkTemAddDto

```typescript
{
  companyId: number;        // 公司ID
  currencyId: number;       // 币别ID
  template?: string;        // 模板内容
  default: boolean;         // 是否为默认模板
}
```

### InvoiceRemarkTemListDto

```typescript
{
  id: string;               // 模板ID
  companyId: number;        // 公司ID
  currencyId: number;       // 币别ID
  template: string;         // 模板内容
  default: boolean;         // 是否为默认模板
  creatorUserName: string;  // 创建人
  company: CompanySimpleDto;    // 公司信息
  currency: CurrencySimpleDto;  // 币别信息
}
```

## 注意事项

1. 公司列表从当前登录用户信息中提取，需要确保用户信息中包含公司信息
2. 模板内容支持占位符语法，在实际使用时会被动态替换
3. 设置默认模板时会弹出确认对话框，避免误操作
4. 删除模板是不可恢复的操作，删除前会弹出确认对话框

## 后续优化

1. 实现"使用"按钮功能，将选中的模板应用到当前开票申请的备注字段
2. 添加模板预览功能，在保存前可查看占位符替换后的效果
3. 支持批量操作：批量删除、批量设置默认
4. 添加模板导出/导入功能
