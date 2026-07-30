# 自动费用模板 - 系统配置指南

## 概述

本文档说明如何在系统中配置和启用"自动费用模板"功能模块。

---

## 一、后端配置（ABP框架）

### 1.1 菜单配置

在ABP系统的菜单管理中添加新菜单项：

**一级菜单：基础数据**

- 已存在，无需创建

**二级菜单：自动费用模板**

```json
{
  "name": "OrderFeeTemplateAdmin",
  "displayName": "自动费用模板",
  "path": "/system/basic-data/OrderFeeTemplateAdmin/list",
  "component": "system/basic-data/OrderFeeTemplateAdmin/list",
  "icon": "ant-design:template-outlined",
  "sort": 20,
  "parentId": "BasicData",
  "type": 1,
  "status": 0,
  "visible": true,
  "keepAlive": true,
  "permissions": ["Admin.OrderFeeTemplate.View"]
}
```

**字段说明：**

- `name`: 菜单唯一标识
- `displayName`: 显示名称
- `path`: 路由路径
- `component`: 组件路径（相对于views目录）
- `icon`: 图标（使用Iconify图标）
- `sort`: 排序号（决定在基础数据下的显示顺序）
- `parentId`: 父菜单ID（基础数据的ID）
- `type`: 菜单类型（1=菜单，2=按钮）
- `status`: 状态（0=启用，1=禁用）
- `visible`: 是否可见
- `keepAlive`: 是否缓存页面
- `permissions`: 访问权限列表

### 1.2 权限配置

在ABP系统的权限管理中添加以下权限：

```json
[
  {
    "name": "Admin.OrderFeeTemplate",
    "displayName": "自动费用模板管理",
    "parentName": "Admin.BasicData",
    "sort": 20
  },
  {
    "name": "Admin.OrderFeeTemplate.View",
    "displayName": "查看",
    "parentName": "Admin.OrderFeeTemplate",
    "sort": 1
  },
  {
    "name": "Admin.OrderFeeTemplate.Add",
    "displayName": "新建",
    "parentName": "Admin.OrderFeeTemplate",
    "sort": 2
  },
  {
    "name": "Admin.OrderFeeTemplate.Edit",
    "displayName": "编辑",
    "parentName": "Admin.OrderFeeTemplate",
    "sort": 3
  },
  {
    "name": "Admin.OrderFeeTemplate.Delete",
    "displayName": "删除",
    "parentName": "Admin.OrderFeeTemplate",
    "sort": 4
  }
]
```

**权限层级结构：**

```
基础数据管理 (Admin.BasicData)
└── 自动费用模板管理 (Admin.OrderFeeTemplate)
    ├── 查看 (Admin.OrderFeeTemplate.View)
    ├── 新建 (Admin.OrderFeeTemplate.Add)
    ├── 编辑 (Admin.OrderFeeTemplate.Edit)
    └── 删除 (Admin.OrderFeeTemplate.Delete)
```

### 1.3 角色权限分配

为不同角色分配相应权限：

**管理员角色：**

- ✅ Admin.OrderFeeTemplate.View
- ✅ Admin.OrderFeeTemplate.Add
- ✅ Admin.OrderFeeTemplate.Edit
- ✅ Admin.OrderFeeTemplate.Delete

**操作员角色：**

- ✅ Admin.OrderFeeTemplate.View
- ✅ Admin.OrderFeeTemplate.Add
- ✅ Admin.OrderFeeTemplate.Edit
- ❌ Admin.OrderFeeTemplate.Delete

**只读角色：**

- ✅ Admin.OrderFeeTemplate.View
- ❌ Admin.OrderFeeTemplate.Add
- ❌ Admin.OrderFeeTemplate.Edit
- ❌ Admin.OrderFeeTemplate.Delete

---

## 二、前端配置

### 2.1 路由配置（如需前端路由）

如果系统使用前端路由，需要在路由配置文件中添加：

**文件位置：** `apps/web-antd/src/router/routes/modules/system.ts`

```typescript
{
  path: '/system',
  name: 'System',
  meta: {
    title: '系统管理',
    icon: 'ant-design:setting-outlined',
  },
  children: [
    // ... 其他子路由
    {
      path: 'basic-data',
      name: 'BasicData',
      meta: {
        title: '基础数据',
        icon: 'ant-design:database-outlined',
      },
      children: [
        // ... 其他基础数据子路由
        {
          path: 'OrderFeeTemplateAdmin',
          name: 'OrderFeeTemplateAdmin',
          component: () => import('#/views/system/basic-data/OrderFeeTemplateAdmin/list.vue'),
          meta: {
            title: '自动费用模板',
            icon: 'ant-design:template-outlined',
            keepAlive: true,
          },
        },
      ],
    },
  ],
}
```

### 2.2 依赖检查

确保以下依赖已安装：

**package.json 中应包含：**

```json
{
  "dependencies": {
    "@handsontable/vue3": "^18.0.0",
    "handsontable": "^14.0.0"
  }
}
```

**验证安装：**

```bash
cd apps/web-antd
pnpm list handsontable @handsontable/vue3
```

### 2.3 TypeScript类型检查

运行类型检查确保没有类型错误：

```bash
cd apps/web-antd
pnpm typecheck
```

---

## 三、数据库配置

### 3.1 枚举值配置

确保数据库中已配置以下枚举值：

**BizType（业务类型）：**

```sql
INSERT INTO AbpEnumItems (Name, Value, DisplayName) VALUES
('BizType', 0, '海运出口');
```

**PaySide（收付类型）：**

```sql
INSERT INTO AbpEnumItems (Name, Value, DisplayName) VALUES
('PaySide', 0, '收'),
('PaySide', 1, '付');
```

**TradeTermsType（贸易条款）：**

```sql
INSERT INTO AbpEnumItems (Name, Value, DisplayName) VALUES
('TradeTermsType', 0, 'EXW'),
('TradeTermsType', 1, 'FOB'),
('TradeTermsType', 2, 'CIF'),
('TradeTermsType', 3, 'DDP'),
('TradeTermsType', 4, 'DDU');
```

**CargoType（货物类型）：**

```sql
INSERT INTO AbpEnumItems (Name, Value, DisplayName) VALUES
('CargoType', 0, '普通货物'),
('CargoType', 1, '危险品'),
('CargoType', 2, '冷藏货物');
```

**BLType（装运方式）：**

```sql
INSERT INTO AbpEnumItems (Name, Value, DisplayName) VALUES
('BLType', 0, 'MBL'),
('BLType', 1, 'HBL');
```

**IndustryCategory（行业类别）：**

```sql
INSERT INTO AbpEnumItems (Name, Value, DisplayName) VALUES
('IndustryCategory', 0, '客户'),
('IndustryCategory', 1, '承运人');
```

### 3.2 数据表检查

确保后端已创建以下数据表：

- `OrderFeeTemplates` - 模板主表
- `OrderFeeTemplateItems` - 模板明细表

---

## 四、API接口配置

### 4.1 后端API端点

确认后端已实现以下API端点：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /services/app/OrderFeeTemplateAdmin/AddAsync | 新增模板 |
| PUT | /services/app/OrderFeeTemplateAdmin/EditAsync | 编辑模板 |
| DELETE | /services/app/OrderFeeTemplateAdmin/DeleteAsync | 删除模板 |
| GET | /services/app/OrderFeeTemplateAdmin/DetailAsync | 获取详情 |
| GET | /services/app/OrderFeeTemplateAdmin/GetPagedListAsync | 分页列表 |
| GET | /services/app/OrderFeeTemplateAdmin/GetPolGroupListAsync | 起运港分组统计 |

### 4.2 CORS配置

如果前后端分离部署，确保CORS配置允许前端域名访问。

---

## 五、部署步骤

### 5.1 开发环境

1. **拉取最新代码**

   ```bash
   git pull origin main
   ```

2. **安装依赖**

   ```bash
   cd apps/web-antd
   pnpm install
   ```

3. **启动开发服务器**

   ```bash
   pnpm dev:jht  # 或其他环境
   ```

4. **验证功能**
   - 访问 http://localhost:端口号
   - 登录后导航到"基础数据 > 自动费用模板"
   - 测试新建、编辑、删除功能

### 5.2 生产环境

1. **构建前端**

   ```bash
   cd apps/web-antd
   pnpm build:jht  # 根据实际环境选择
   ```

2. **部署静态文件**
   - 将 `dist` 目录内容上传到Web服务器
   - 配置Nginx或IIS

3. **Nginx配置示例**

   ```nginx
   location /system/basic-data/OrderFeeTemplateAdmin {
       try_files $uri $uri/ /index.html;
   }
   ```

4. **清除浏览器缓存**
   - 通知用户清除浏览器缓存
   - 或使用版本号强制刷新

---

## 六、验证清单

### 6.1 功能验证

- [ ] 菜单显示在"基础数据"下
- [ ] 点击菜单能正常打开列表页面
- [ ] 左侧起运港分组正常显示
- [ ] 查询功能正常工作
- [ ] 新建功能正常工作
- [ ] 编辑功能正常工作
- [ ] 批量删除功能正常工作
- [ ] Handsontable表格正常显示和编辑
- [ ] 权限控制生效（无权限时按钮隐藏）

### 6.2 性能验证

- [ ] 列表加载时间 < 2秒
- [ ] 表单打开时间 < 1秒
- [ ] Handsontable渲染流畅
- [ ] 大数据量时无明显卡顿

### 6.3 兼容性验证

- [ ] Chrome浏览器正常
- [ ] Edge浏览器正常
- [ ] Firefox浏览器正常
- [ ] Safari浏览器正常（如需要）
- [ ] 移动端响应式正常（如需要）

---

## 七、故障排查

### 7.1 菜单不显示

**可能原因：**

1. 权限未分配
2. 菜单配置错误
3. 缓存问题

**解决方案：**

```bash
# 1. 检查用户权限
控制台打印: userStore.userFunctions

# 2. 清除缓存
localStorage.clear()
sessionStorage.clear()

# 3. 重新登录
```

### 7.2 页面空白

**可能原因：**

1. 组件路径错误
2. 依赖缺失
3. JavaScript错误

**解决方案：**

```bash
# 1. 检查控制台错误
F12 → Console

# 2. 检查网络
F12 → Network

# 3. 重新安装依赖
pnpm install
```

### 7.3 Handsontable不显示

**可能原因：**

1. CSS未引入
2. 许可证问题
3. DOM元素未就绪

**解决方案：**

```typescript
// 确保CSS已引入
import 'handsontable/dist/handsontable.full.min.css';

// 检查容器
console.log(hotContainer.value); // 应该不是null

// 延迟初始化
await nextTick();
initHotTable();
```

### 7.4 API调用失败

**可能原因：**

1. 后端服务未启动
2. API路径错误
3. 认证失败

**解决方案：**

```bash
# 1. 检查后端服务
curl http://后端地址/services/app/OrderFeeTemplateAdmin/GetPagedListAsync

# 2. 检查Token
localStorage.getItem('access_token')

# 3. 查看网络请求
F12 → Network → 查看请求详情
```

---

## 八、回滚方案

如果新版本出现问题，需要回滚：

### 8.1 代码回滚

```bash
git revert <commit-hash>
git push origin main
```

### 8.2 数据库回滚

如果有数据库迁移，执行回滚脚本：

```sql
-- 删除菜单
DELETE FROM AbpMenus WHERE Name = 'OrderFeeTemplateAdmin';

-- 删除权限
DELETE FROM AbpPermissions WHERE Name LIKE 'Admin.OrderFeeTemplate%';
```

### 8.3 前端回滚

重新部署旧版本的前端文件：

```bash
# 切换到旧版本tag
git checkout v1.0.0

# 重新构建
pnpm build:jht

# 重新部署
```

---

## 九、监控和日志

### 9.1 前端监控

在关键操作处添加日志：

```typescript
// 新建模板
console.log('[OrderFeeTemplate] 新建模板', formData);

// 编辑模板
console.log('[OrderFeeTemplate] 编辑模板', templateId);

// 删除模板
console.log('[OrderFeeTemplate] 删除模板', ids);
```

### 9.2 错误追踪

集成错误追踪服务（如Sentry）：

```typescript
import * as Sentry from '@sentry/vue';

try {
  await addOrderFeeTemplate(data);
} catch (error) {
  Sentry.captureException(error);
  message.error('新建失败');
}
```

---

## 十、联系支持

### 技术支持联系方式

- **前端负责人**: [姓名]
- **后端负责人**: [姓名]
- **DBA**: [姓名]
- **运维负责人**: [姓名]

### 紧急问题处理流程

1. **发现问题** → 记录错误信息和截图
2. **初步排查** → 查看日志和控制台
3. **上报问题** → 联系技术支持
4. **临时方案** → 如有必要，提供临时解决方案
5. **永久修复** → 开发修复补丁
6. **验证发布** → 测试后发布新版本

---

**文档版本**: v1.0  
**最后更新**: 2026-07-29  
**维护人员**: 系统管理员
