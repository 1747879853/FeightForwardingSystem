# 船公司Logo对接文档

本次修改在所有返回船公司信息的接口中，额外返回 `carrierLogo` 字段（类型为 `AttachmentItemDto`）。

船公司Logo通过附件系统管理，`ModuleTypeId` 为 `CarrierLogo`，`ItemId` 为船公司id。Logo不是Carrier表的字段，而是通过附件表关联。

---

## AttachmentItemDto 结构

```json
{
  "id": 1,
  "attachmentId": 100,
  "moduleTypeId": 2001,
  "itemId": "5",
  "displayOrder": 0,
  "isFirstShow": true,
  "url": "/uploads/carrier_logo.png",
  "name": "carrier_logo.png"
}
```

---

## 涉及的接口清单

### 1. CarrierAdminAppService（已有Logo，无需修改）

| 接口 | 路径 | 说明 |
| --- | --- | --- |
| 船公司列表 | `GET /api/services/app/CarrierAdmin/GetPagedListAsync` | `CarrierDto.Logo` 已存在 |
| 船公司详情 | `GET /api/services/app/CarrierAdmin/DetailAsync` | `CarrierDto.Logo` 已存在 |

---

### 2. SeaExportAdminAppService（本次新增 `carrierLogo`）

| 接口 | 路径 | 返回字段位置 |
| --- | --- | --- |
| 海运出口列表 | `GET /api/services/app/SeaExportAdmin/GetPagedListAsync` | `SeaExportDto.carrierLogo` |
| 海运出口详情 | `GET /api/services/app/SeaExportAdmin/DetailAsync` | `SeaExportDto.carrierLogo` |

#### 返回示例（SeaExportDto 中的船公司部分）

```json
{
  "carrierId": 5,
  "carrierName": "中远海运",
  "carrierLogo": {
    "id": 1,
    "attachmentId": 100,
    "moduleTypeId": 2001,
    "itemId": "5",
    "displayOrder": 0,
    "isFirstShow": true,
    "url": "/uploads/cosco_logo.png",
    "name": "cosco_logo.png"
  }
}
```

#### 修改说明

- `SeaExportDto` 新增 `AttachmentItemDto CarrierLogo` 字段
- `GetPagedListAsync`：批量加载分页结果中所有船公司id对应的Logo附件，在循环中赋值 `data.CarrierLogo`
- `DetailAsync`：根据单个船公司id加载Logo附件，赋值 `result.CarrierLogo`

---

### 3. SeServiceTaskAdminAppService（本次新增 `carrierLogo`）

| 接口 | 路径 | 返回字段位置 |
| --- | --- | --- |
| 任务查询列表 | `GET /api/services/app/SeServiceTaskAdmin/GetPagedListAsync` | 每个任务的 `seaExport.carrierLogo` |
| 工作台综合查询 | `GET /api/services/app/SeServiceTaskAdmin/GetWorkbenchListAsync` | 每个任务的 `seaExport.carrierLogo` |

#### 返回示例（SeServiceTask 中的 SeaExportDto 船公司部分）

```json
{
  "seServiceTasks": [
    {
      "seaExport": {
        "carrierId": 5,
        "carrierName": "中远海运",
        "carrierLogo": {
          "id": 1,
          "attachmentId": 100,
          "moduleTypeId": 2001,
          "itemId": "5",
          "url": "/uploads/cosco_logo.png",
          "name": "cosco_logo.png"
        }
      }
    }
  ]
}
```

#### 修改说明

- `MapSeaExportsAsync` 私有方法中批量加载所有船公司id对应的Logo附件
- 在循环中赋值 `data.CarrierLogo`
- 影响所有调用 `MapSeaExportsAsync` 的接口：`GetPagedListAsync` 和 `GetWorkbenchListAsync`

---

### 4. SeFreiPriceAdminAppService（已有Logo，无需修改）

| 接口 | 路径 | 说明 |
| --- | --- | --- |
| 海运运价列表 | `GET /api/services/app/SeFreiPriceAdmin/GetPagedListAsync` | `SeFreiPriceOutDto.Carrier.Logo` 已存在 |
| 海运运价详情 | `GET /api/services/app/SeFreiPriceAdmin/DetailAsync` | `SeFreiPriceOutDto.Carrier.Logo` 已存在 |

---

## 修改文件清单

| 文件 | 修改内容 |
| --- | --- |
| `src/CsprojBuilder.Application/App/SeaExport/Dto/SeaExportDto.cs` | 新增 `AttachmentItemDto CarrierLogo` 字段 |
| `src/CsprojBuilder.Application/App/SeaExport/SeaExportAdminAppService.cs` | 注入 `IAttachmentAppService`；`GetPagedListAsync` 和 `DetailAsync` 中加载并赋值船公司Logo |
| `src/CsprojBuilder.Application/App/SeServiceTask/SeServiceTaskAdminAppService.cs` | 注入 `IAttachmentAppService`；`MapSeaExportsAsync` 中加载并赋值船公司Logo |

## 未修改的文件（注入了Carrier仓储但未实际使用）

| 文件 | 原因 |
| --- | --- |
| `OrderFeeAdminAppService.cs` | 注入了 `_carrierRepository` 但代码中未使用 |
| `PaymentApplicationAdminAppService.cs` | 注入了 `_carrierRepository` 但代码中未使用 |
| `StatementAdminAppService.cs` | 注入了 `_carrierRepository` 但代码中未使用 |
| `TransportOrderAdminAppService.cs` | 注入了 `_carrierRepository` 但代码中未使用 |
