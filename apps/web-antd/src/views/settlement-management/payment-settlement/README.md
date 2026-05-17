# 付费结算管理模块

## 功能概述

付费结算管理模块用于管理货运代理系统中的付费结算业务，支持对已审核通过的付费申请进行结算操作。

## 主要功能

### 1. 分页列表查询

- 支持按结算单号、结算对象、结算币别、我司银行、结算时间范围、主提单号、创建人等条件筛选
- 显示结算单号、结算状态、结算时间、付款方式、锁定状态、结算对象、结算币别、结算金额合计等信息
- 支持分页浏览和自定义列显示

### 2. 新建付费结算

- 通过新Tab页面打开新建表单
- 填写基本信息：结算时间、付款方式、结算对象、结算币别、我司银行、对方银行、手续费、备注
- 设置汇率：为不同币别设置汇率
- 添加申请明细：通过右侧抽屉选择付费申请
- 上传附件：支持上传多个附件

### 3. 编辑付费结算

- 编辑未锁定的结算单
- 可以修改主表信息和汇率
- 可以添加或删除结算明细

### 4. 结算单操作

- **查看**：查看结算单的详细信息
- **编辑**：编辑未锁定的结算单（修改主表信息和汇率）
- **删除**：删除未锁定的结算单（支持单个和批量删除）
- **锁定**：锁定结算单，锁定后不能进行任何编辑/删除操作
- **解锁**：解锁已锁定的结算单

### 5. 状态管理

结算单状态包括：

- 录入中（0）
- 审核中（1）
- 已驳回（2）
- 审核通过（3）
- 部分结算（4）
- 已结算（5）

## 技术实现

### 文件结构

```
settlement-management/
├── payment-settlement/
│   ├── list.vue                    # 列表页面
│   ├── form.vue                    # 新建/编辑表单页面
│   ├── data.ts                     # 列表表格列配置和查询表单配置
│   ├── form-data.ts                # 表单数据配置
│   ├── add-application-drawer/     # 选择付费申请抽屉组件
│   │   ├── index.vue               # 抽屉主组件
│   │   └── data.ts                 # 抽屉表格列配置和查询表单配置
│   └── README.md                   # 说明文档
```

### API接口

使用以下API接口：

- `#/api/sea-export/payment-settlement-admin` - 付费结算相关接口
  - `getPaymentSettlementPagedList` - 获取分页列表
  - `addPaymentSettlement` - 新增付费结算
  - `editPaymentSettlement` - 编辑付费结算
  - `deletePaymentSettlement` - 删除结算单
  - `getPaymentSettlementDetail` - 获取详情
  - `lockPaymentSettlement` - 锁定结算单
  - `unlockPaymentSettlement` - 解锁结算单

- `#/api/settlement-management/payment-application-admin` - 付费申请相关接口
  - `getPaymentApplicationPagedListForSettlement` - 获取可结算的付费申请列表

### 路由配置

在 `apps/web-antd/src/router/routes/modules/settlement-management.ts` 中配置：

- 一级菜单：结算管理
- 二级菜单：付费结算
- 路径：
  - 列表：`/settlement-management/payment-settlement`
  - 新建：`/settlement-management/payment-settlement/add`
  - 编辑：`/settlement-management/payment-settlement/:id/edit`

## 权限要求

- 查看列表：`Admin.PaymentSettlement.Get`
- 新增：`Admin.PaymentSettlement.Add`
- 编辑：`Admin.PaymentSettlement.Edit`
- 删除：`Admin.PaymentSettlement.Delete`
- 锁定：`Admin.PaymentSettlement.Lock`
- 解锁：`Admin.PaymentSettlement.Unlock`

## 页面布局说明

### 新建/编辑页面布局

页面分为以下几个部分：

1. **基本信息卡片**
   - 结算时间（日期时间选择器）
   - 付款方式（下拉选择）
   - 结算对象（客户选择）
   - 结算币别（币别选择）
   - 我司银行（银行选择）
   - 对方银行（银行选择）
   - 手续费（数字输入）
   - 备注（文本域）

2. **汇率设置卡片**
   - 表格展示所有币别的汇率
   - 可编辑汇率数值

3. **申请明细卡片**
   - 表格展示已选择的结算明细
   - "添加申请"按钮：打开右侧抽屉选择付费申请
   - 每行可删除

4. **附件上传卡片**
   - 支持上传多个附件
   - 模块类型ID：160011

5. **底部操作按钮**
   - 取消：返回列表页
   - 保存：保存当前表单

### 选择付费申请抽屉

抽屉从右侧弹出，包含：

1. **查询区域**
   - 关键字（模糊匹配委托编号/主提单号/订舱号）
   - 申请单号
   - 结算对象
   - 币别
   - 提交时间范围
   - 最晚付款时间范围
   - 申请人

2. **表格区域**
   - 显示可选择的付费申请列表
   - 只显示状态为"审核通过"或"部分结算"的申请
   - 只显示有未结算余额的申请
   - 支持多选
   - 分页显示

3. **底部按钮**
   - 取消：关闭抽屉
   - 确定：确认选择的申请

## 待实现功能

以下功能需要进一步完善：

1. ~~新建结算单页面和逻辑~~ ✅ 已完成
2. ~~编辑结算单页面和逻辑~~ ✅ 已完成
3. 查看结算单详情页面（可复用编辑页面，设置为只读模式）
4. 导出功能
5. 完善选择付费申请后的数据处理逻辑（将付费申请转换为结算明细）
6. 完善汇率设置的交互（自动根据币别生成汇率行）

## 注意事项

1. 已锁定的结算单不能进行编辑和删除操作
2. 删除操作会同时删除关联的附件
3. 结算单删除后会自动回滚所有关联数据（OrderFee、PaymentApplicationItem、PaymentApplication的状态）
4. 时间字段统一显示到分钟级别（YYYY-MM-DD HH:mm）
5. 新建结算时必须先选择结算对象和结算币别，才能添加申请明细
6. 汇率列表的币别必须与结算明细涉及的币别完全一致
7. 每个付费申请的每种币别的结算量必须在可结算范围内
