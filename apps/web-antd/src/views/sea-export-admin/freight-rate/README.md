# 海运出口运价管理模块

## 目录结构

```
freight-rate/
├── data.ts                    # 表格列配置和搜索表单配置
├── list.vue                   # 主列表页面
└── modules/
    └── form.vue              # 新增/编辑/批量更改表单组件
```

## 功能说明

### 1. 列表页面 (list.vue)

**主要功能：**

- ✅ 显示海运出口运价列表（带复选框）
- 🔍 支持多条件筛选（船公司、起运港、目的港、是否推荐、是否有效）
- ✏️ 编辑运价信息
- 🗑️ 删除运价记录（单条和批量）
- ➕ 新增运价
- 📋 复制运价（基于已有运价创建新记录）
- 🔄 刷新列表
- 📊 分页显示
- ⚡ **批量操作**：
  - 批量更改运价信息
  - 批量推荐/取消推荐
  - 批量删除

**工具栏按钮：**

1. **新增** - 创建新的运价记录（主按钮）
2. **复制** - 基于选中的运价创建新记录（需要单选）
3. **批量修改** - 同时修改多条选中的运价记录
4. **批量推荐** - 批量设置推荐状态为"是"
5. **批量取消推荐** - 批量设置推荐状态为"否"
6. **批量删除** - 批量删除选中的多条记录

**选择模式：**

- **复选框** - 用于所有操作（复制取第一条，其他操作用于全部选中项）

**权限控制：**

- 需要 `Admin.SeFreiPrice.Add` 权限才能显示新增按钮
- 需要 `Admin.SeFreiPrice.Edit` 权限才能编辑和批量操作
- 需要 `Admin.SeFreiPrice.Delete` 权限才能删除
- 需要 `Admin.SeFreiPrice.Get` 权限才能查看

### 2. 表单组件 (form.vue)

**支持三种模式：**

#### 模式一：新增运价

- ✅ 完整的主表信息编辑
- ✅ 箱型费率表格（海运费）
- ✅ 条件费用配置（支持阈值判断）
- ✅ 表单验证

#### 模式二：编辑运价

- ✅ 从API加载完整详情数据
- ✅ 显示已有箱型费率和费用配置
- ✅ 支持修改所有字段

#### 模式三：批量更改 ⭐

- ✅ 同时修改多条运价记录
- ✅ 留空字段不修改
- ✅ 黄色提示条提醒用户
- ✅ 字段支持"不改"选项（单选按钮）

**表单分区：**

1. **基础信息**
   - 船公司、免用箱、航程、开船日期
   - 截单时间、截关时间
   - 起运港、目的港、中转港1、中转港2
   - 备注

2. **其他设置**
   - 有效日期范围（起止日期）
   - 是否推荐（不改/是/否）
   - 是否直达（不改/是/否）

3. **箱型费率 (USD)**
   - 支持多种箱型：20GP、40GP、40HQ、40NOR
   - 海运费输入
   - 条件费用配置（点击过滤器图标）
   - 留空则不修改（批量模式）

### 3. 配置文件 (data.ts)

**包含内容：**

- `useGridFormSchema()` - 搜索表单配置
- `useColumns()` - 表格列配置（包含复选框列）

**支持的筛选条件：**

- 船公司（下拉选择，支持搜索）
- 起运港（下拉选择，支持搜索）
- 目的港（下拉选择，支持搜索）
- 是否推荐（单选）
- 是否有效（单选）

## API 接口

使用的API定义在 `#/api/sea-export/freight-rate-admin.ts`：

- `getSeFreiPriceList()` - 获取运价列表（分页）
- `getSeFreiPriceDetail()` - 获取运价详情
- `addSeFreiPrice()` - 新增运价
- `editSeFreiPrice()` - 编辑运价
- `deleteSeFreiPrice()` - 删除运价（支持批量）
- `batchEditSeFreiPrice()` - 批量编辑运价 ⭐
- `changeRecommendStatus()` - 改变推荐状态
- `getAllLaneCodes()` - 获取所有航线

## 数据结构说明

### 重要变更（2026-05-03）

根据最新Swagger文档，运价数据结构进行了重大调整：

#### 1. 字段命名规范

- 中转港字段从 `pot1Id/pot2Id` 改为 `poT1Id/poT2Id`（驼峰命名更规范）

#### 2. 费用结构重构

**旧结构：**

```typescript
{
  seFreiPriceCtns: [  // 箱型列表
    {
      ctnCodeId: number,
      cost: number,
      seFreiPriceCtnFees: [...]  // 嵌套的费用
    }
  ]
}
```

**新结构：**

```typescript
{
  seFreiPriceCtns: [  // 箱型列表（简化）
    {
      ctnCodeId: number,
      cost: number,
      remark?: string
    }
  ],
  seFreiPriceFees: [  // 费用列表（独立）
    {
      feeCodeId: number,
      currencyId: number,
      seFreiPriceCtnFees: [  // 该费用下各箱型的价格
        {
          ctnCodeId: number,
          price: number,
          conditionType?: number,  // 条件类型
          value?: number,          // 阈值
          otherPrice?: number      // 否则的价格
        }
      ]
    }
  ]
}
```

#### 3. 返回类型统一

- 列表和详情都使用 `SeFreiPriceOutDto` 类型
- 分页返回格式：`{ items: [], totalCount: number, currentPage: number, totalPages: number }`

### DTO 类型说明

**输入DTO：**

- `AddSeFreiPriceInput` - 新增运价
- `EditSeFreiPriceInput` - 编辑运价
- `BatchEditSeFreiPriceInput` - 批量编辑
- `SeFreiPriceCtnAddDto` - 箱型（新增）
- `SeFreiPriceFeeAddDto` - 费用（新增）
- `SeFreiPriceCtnFeeAddDto` - 箱型费用（新增）

**输出DTO：**

- `SeFreiPriceOutDto` - 运价详情/列表项
- `SeFreiPriceCtnOutDto` - 箱型（输出）
- `SeFreiPriceFeeOutDto` - 费用（输出）
- `SeFreiPriceCtnFeeOutDto` - 箱型费用（输出）

## 路由配置

路由定义在 `#/router/routes/modules/freight-rate.ts`：

```typescript
{
  path: '/freight-rate',
  name: 'FreightRate',
  meta: {
    icon: 'lucide:ship',
    order: 210,
    title: '运价管理',
  },
  children: [
    {
      path: '',
      name: 'FreightRateList',
      component: () => import('#/views/sea-export-admin/freight-rate/list.vue'),
    }
  ]
}
```

## 国际化

已在以下文件中添加翻译：

- `#/locales/langs/zh-CN/seaExport.json` - 中文
- `#/locales/langs/en-US/seaExport.json` - 英文

使用方式：

```typescript
$t('seaExport.freightRate.title'); // 运价管理
$t('seaExport.freightRate.carrierId'); // 船公司
```

## 依赖的基础数据

表单中使用的下拉选项来自以下API：

1. **船公司** - `#/api/system/base-data/carrier-admin.ts`
   - `getCarrierPagedList()`

2. **港口** - `#/api/system/base-data/port-code-admin.ts`
   - `getPortCodePagedList()`

3. **箱型** - `#/api/system/base-data/ctn-code-admin.ts`
   - `getCtnCodePagedList()`

4. **费用代码** - `#/api/system/base-data/fee-code-admin.ts`
   - `getFeeCodePagedList()`

## 开发注意事项

### 1. 批量更改模式

批量更改是运价管理的重要功能，特点：

```typescript
// 打开批量更改弹窗
formModalApi
  .setData({
    isBatch: true,
    ids: ['id1', 'id2', 'id3'], // 选中的记录ID
  })
  .open();

// 表单字段支持"留空不修改"
// - 下拉框：allowClear: true
// - 单选框：添加"不改"选项 (value: undefined)
// - 输入框：placeholder 提示"留空不修改"
```

### 2. 箱型费率表格

使用原生HTML表格实现，支持条件费用配置：

```vue
<table class="w-full border-collapse border border-gray-300">
  <thead>
    <tr class="bg-gray-100">
      <th>费用类型</th>
      <th>20GP</th>
      <th>40GP</th>
      <th>40HQ</th>
      <th>40NOR</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>海运费</td>
      <td>
        <!-- 条件费用图标 -->
        <button @click="showConditionPopup($event, 'ocean', ctn.code)">
          <IconifyIcon icon="mdi:filter-outline" />
        </button>
        
        <!-- 普通模式 -->
        <input v-if="!config.enabled" 
               v-model="feeData['ocean'].prices[ctn.code]" />
        
        <!-- 条件模式：4个格子 -->
        <div v-else class="grid grid-cols-2 gap-2">
          <input v-model="config.threshold" placeholder="阈值" />
          <span>否则</span>
          <input v-model="config.valueIfGreater" placeholder="大于值" />
          <input v-model="config.valueOtherwise" placeholder="否则值" />
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

### 3. 数据类型转换

注意后端返回的ID类型：

- 长整型ID（如 carrierId）可能超过 JavaScript Number 安全范围
- 建议在传输时使用字符串类型
- API定义中已使用 `number` 类型，如需处理大数请转换为 `string`

### 4. 日期格式

- 日期字段使用 ISO 8601 格式：`YYYY-MM-DD`
- 日期时间字段使用：`YYYY-MM-DD HH:mm`
- DatePicker 组件需配置 `valueFormat` 确保格式一致

### 5. 条件费用配置

支持基于阈值的条件定价：

```typescript
interface ConditionalFeeConfig {
  enabled: boolean; // 是否启用条件
  threshold?: number; // 阈值（如：重量 > 10吨）
  valueIfGreater?: number; // 大于阈值的價格
  valueOtherwise?: number; // 否则的价格
}
```

提交时转换为：

```typescript
{
  ctnCodeId: number,
  price: config.valueIfGreater,
  conditionType: 1,  // 1表示"大于"
  value: config.threshold,
  otherPrice: config.valueOtherwise
}
```

## 后续优化建议

1. ✅ **箱型费率与API对接**
   - 实现 seFreiPriceCtns 数据的加载和提交
   - 实现 seFreiPriceFees 费用明细的增删改
   - 添加成本自动计算

2. ✅ **费用代码选择器**
   - 海运费改为从费用代码API选择
   - 支持费用代码搜索

3. ✅ **数据验证增强**
   - 有效期起止逻辑验证（结束日期不能早于起始日期）
   - 箱型费率必填验证
   - 条件费用逻辑验证

4. ✅ **性能优化**
   - 下拉选项缓存
   - 虚拟滚动（大数据量时）
   - 防抖搜索

5. ✅ **用户体验优化**
   - 添加加载骨架屏
   - 表单字段分组折叠
   - 快捷键支持（Ctrl+S保存）

## 测试要点

- [ ] 新增运价功能正常
- [ ] 编辑运价能正确加载数据
- [ ] 删除运价有确认提示
- [ ] 筛选条件正常工作
- [ ] 分页功能正常
- [ ] 权限控制生效
- [ ] 表单验证规则正确
- [ ] 国际化文本显示正确
- [ ] **批量更改功能正常** ⭐
- [ ] **批量推荐/取消推荐正常** ⭐
- [ ] **批量删除功能正常** ⭐
- [ ] **箱型费率表格数据正确** ⭐
- [ ] **条件费用配置正常** ⭐
- [ ] **字段命名符合新规范（poT1Id/poT2Id）** ⭐

## 更新日志

### 2026-05-03 v3.0

- ✅ 适配最新Swagger文档API结构
- ✅ 字段命名从 pot1Id/pot2Id 改为 poT1Id/poT2Id
- ✅ 费用结构从 seFreiPriceCtns 嵌套改为 seFreiPriceFees 独立
- ✅ 更新类型定义为 SeFreiPriceOutDto
- ✅ 适配新的分页返回格式
- ✅ 实现条件费用配置功能
- ✅ 移除附加费明细功能（简化为单一费用结构）

### 2026-04-30 v2.0

- ✅ 实现批量更改功能
- ✅ 添加批量推荐/取消推荐
- ✅ 添加批量删除功能
- ✅ 实现箱型费率表格
- ✅ 实现附加费明细动态表格
- ✅ 优化表单布局（基础信息、其他设置分区）
- ✅ 添加复选框列支持多选
- ✅ 批量模式"留空不修改"逻辑

### 2026-04-30 v1.0

- ✅ 创建基础列表页面
- ✅ 实现搜索筛选功能
- ✅ 实现新增/编辑表单（主表）
- ✅ 添加路由配置
- ✅ 添加国际化支持

1234567890
