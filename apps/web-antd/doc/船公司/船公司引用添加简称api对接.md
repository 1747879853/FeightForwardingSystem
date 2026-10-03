# 船公司引用添加中文简称字段 - 前端API对接文档

## 变更概述

所有返回船公司(Carrier)相关数据的接口，新增返回 **船公司中文简称** (`CarrierCnShortName` / `CnShortName`) 字段。

**数据来源：** `App_Carriers` 表的 `CnShortName` 字段（中文简称）

---

## 涉及的接口清单

| 序号 | 模块 | 接口 | 新增字段位置 |
| --- | --- | --- | --- |
| 1 | 船公司管理 | `GET /api/services/app/CarrierAdmin/GetPagedList` | `CarrierDto.CnShortName`（已有） |
| 2 | 船公司管理 | `GET /api/services/app/CarrierAdmin/Detail` | `CarrierDto.CnShortName`（已有） |
| 3 | 海运出口 | `GET /api/services/app/SeaExportAdmin/GetPagedList` | `SeaExportDto.CarrierCnShortName`（**新增**） |
| 4 | 海运出口 | `GET /api/services/app/SeaExportAdmin/Detail` | `SeaExportDto.CarrierCnShortName`（**新增**） |
| 5 | 海运运价 | `GET /api/services/app/SeFreiPriceAdmin/GetPagedList` | `SeFreiPriceOutDto.Carrier.CnShortName`（已有） |
| 6 | 海运运价 | `GET /api/services/app/SeFreiPriceAdmin/Detail` | `SeFreiPriceOutDto.Carrier.CnShortName`（已有） |
| 7 | 服务项任务 | `GET /api/services/app/SeServiceTaskAdmin/GetPagedList` | `SeServiceTaskItemDto.SeaExport.CarrierCnShortName`（**新增**） |
| 8 | 服务项任务 | `GET /api/services/app/SeServiceTaskAdmin/GetWorkbenchList` | `SeServiceTaskWorkbenchItemDto.SeaExport.CarrierCnShortName`（**新增**） |
| 9 | 服务项任务 | `GET /api/services/app/SeServiceTaskAdmin/GetWorkbenchPagedList` | `SeServiceTaskWorkbenchItemDto.SeaExport.CarrierCnShortName`（**新增**） |

---

## 详细字段说明

### 1. 船公司管理模块 (CarrierAdmin)

#### 接口：`GetPagedList` / `Detail`

返回的 `CarrierDto` 已包含 `CnShortName` 字段，**无需前端改动**（如之前未对接此字段，可直接使用）。

**CarrierDto 完整结构：**

```json
{
  "id": 1,
  "cnName": "中远海运集装箱运输有限公司",
  "cnShortName": "中远海运",          // 中文简称
  "enName": "COSCO SHIPPING Lines Co., Ltd.",
  "code": "COSCO",                     // 英文简称
  "otherCode": "",
  "ediCode": "COSU",
  "remark": "",
  "logo": { ... },
  "creationTime": "2026-01-01T00:00:00",
  "creatorUserId": 1,
  "lastModificationTime": null,
  "lastModifierUserId": null
}
```

| 字段          | 类型     | 说明                     |
| ------------- | -------- | ------------------------ |
| `cnShortName` | `string` | 船公司中文简称，可能为空 |

---

### 2. 海运出口模块 (SeaExportAdmin)

#### 接口：`GetPagedList`

- **路径：** `GET /api/services/app/SeaExportAdmin/GetPagedList`
- **返回：** `PagedList<SeaExportDto>`

#### 接口：`Detail`

- **路径：** `GET /api/services/app/SeaExportAdmin/Detail`
- **返回：** `SeaExportDto`

**SeaExportDto 中船公司相关字段：**

```json
{
  "carrierId": 1,
  "carrierName": "中远海运集装箱运输有限公司",
  "carrierCnShortName": "中远海运",    // 【新增】船公司中文简称
  "carrierLogo": { ... },
  // ... 其他字段
}
```

| 字段 | 类型 | 说明 | 变更 |
| --- | --- | --- | --- |
| `carrierId` | `long?` | 船公司ID | 已有 |
| `carrierName` | `string` | 船公司中文全称（来自CnName） | 已有 |
| `carrierCnShortName` | `string` | **船公司中文简称（来自CnShortName）** | **新增** |
| `carrierLogo` | `AttachmentItemDto` | 船公司Logo | 已有 |

---

### 3. 海运运价模块 (SeFreiPriceAdmin)

#### 接口：`GetPagedList`

- **路径：** `GET /api/services/app/SeFreiPriceAdmin/GetPagedList`
- **返回：** `PagedList<SeFreiPriceOutDto>`

#### 接口：`Detail`

- **路径：** `GET /api/services/app/SeFreiPriceAdmin/Detail`
- **返回：** `SeFreiPriceOutDto`

**SeFreiPriceOutDto 中船公司相关字段：**

```json
{
  "carrierId": 1,
  "carrier": {
    "id": 1,
    "cnName": "中远海运集装箱运输有限公司",
    "cnShortName": "中远海运",          // 中文简称（已有，嵌套在Carrier对象中）
    "enName": "COSCO SHIPPING Lines Co., Ltd.",
    "code": "COSCO",
    "otherCode": "",
    "ediCode": "COSU",
    "remark": "",
    "logo": { ... }
  },
  // ... 其他字段
}
```

| 字段路径              | 类型         | 说明           | 变更                 |
| --------------------- | ------------ | -------------- | -------------------- |
| `carrierId`           | `long`       | 船公司ID       | 已有                 |
| `carrier`             | `CarrierDto` | 完整船公司对象 | 已有                 |
| `carrier.cnShortName` | `string`     | 船公司中文简称 | 已有（通过嵌套对象） |

> 注意：运价模块返回的是完整的 `CarrierDto` 对象，其中已包含 `cnShortName` 字段。如前端之前未使用该字段，现在可以直接取用。

---

### 4. 服务项任务模块 (SeServiceTaskAdmin)

#### 接口：`GetPagedList`

- **路径：** `GET /api/services/app/SeServiceTaskAdmin/GetPagedList`
- **返回：** `SeServiceTaskPagedResultDto`
- **字段位置：** `Items[].SeServiceConfigItems[].SeServiceTasks[].SeaExport.CarrierCnShortName`

#### 接口：`GetWorkbenchList`

- **路径：** `GET /api/services/app/SeServiceTaskAdmin/GetWorkbenchList`
- **返回：** `SeServiceTaskWorkbenchResultDto`
- **字段位置：** `Items[].SeServiceConfigItems[].SeServiceTasks[].SeaExport.CarrierCnShortName`

#### 接口：`GetWorkbenchPagedList`

- **路径：** `GET /api/services/app/SeServiceTaskAdmin/GetWorkbenchPagedList`
- **返回：** `PagedList<SeServiceTaskWorkbenchItemDto>`
- **字段位置：** `Items[].SeaExport.CarrierCnShortName`

**嵌套的SeaExport中船公司相关字段（同海运出口模块）：**

```json
{
  "seaExport": {
    "carrierId": 1,
    "carrierName": "中远海运集装箱运输有限公司",
    "carrierCnShortName": "中远海运",  // 【新增】船公司中文简称
    "carrierLogo": { ... },
    // ... 其他字段
  }
}
```

---

## 前端对接要点

### 新增字段总结

| 字段名             | JSON属性名           | 类型     | 可空 | 说明           |
| ------------------ | -------------------- | -------- | ---- | -------------- |
| CarrierCnShortName | `carrierCnShortName` | `string` | 是   | 船公司中文简称 |

### 对接步骤

1. **海运出口列表/详情页面**
   - 在展示船公司信息的地方，新增 `carrierCnShortName` 字段的展示
   - 建议展示格式：`中文简称(carrierCnShortName)` 或与 `carrierName` 搭配展示

2. **服务项任务工作台**
   - 任务列表中的海运出口信息已包含新字段
   - 取值路径：`task.seaExport.carrierCnShortName`

3. **海运运价列表/详情页面**
   - 通过 `carrier.cnShortName` 获取（此字段原已存在于CarrierDto中）

### 注意事项

- `carrierCnShortName` 可能为 `null` 或空字符串，前端需做空值判断
- 此字段为只读展示字段，不需要在新建/编辑表单中传入
- 与 `carrierName`（中文全称）区分使用，一般列表页用简称，详情页用全称

---

## 后端变更文件清单

| 文件 | 变更内容 |
| --- | --- |
| `App/SeaExport/Dto/SeaExportDto.cs` | `SeaExportDto` 新增 `CarrierCnShortName` 属性 |
| `App/SeaExport/SeaExportAdminAppService.cs` | 列表和详情方法中查询并填充 `CarrierCnShortName` |
| `App/SeServiceTask/SeServiceTaskAdminAppService.cs` | 任务列表构建SeaExportDto时填充 `CarrierCnShortName` |

> 说明：`CarrierDto`（船公司管理模块）和 `SeFreiPriceOutDto`（运价模块嵌套CarrierDto）中 `CnShortName` 字段原已存在，本次无需修改。
