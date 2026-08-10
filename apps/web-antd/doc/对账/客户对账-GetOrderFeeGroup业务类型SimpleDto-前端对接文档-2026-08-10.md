# 客户对账-GetOrderFeeGroup业务类型SimpleDto-前端对接文档-2026-08-10

## 1. 背景意图

`GET /api/services/app/StatementAdmin/GetOrderFeeGroupAsync` 返回的每个业务（`TransportOrderDto`）需按业务类型挂上海运出口 / 海运进口 / 空运出口简要信息，外键一律对象化（SimpleDto），不再返回全量详情 Dto。

## 2. 接口

### 2.1 选未对账费用

| 项   | 值                                                       |
| :--- | :------------------------------------------------------- |
| 方法 | `GET`                                                    |
| 地址 | `/api/services/app/StatementAdmin/GetOrderFeeGroupAsync` |
| 权限 | `Admin.Statement.Get`                                    |
| 返回 | `PagedList<TransportOrderDto>`                           |

入参不变（仍为 `GetOrderFeeGroupInputDto`）。

### 2.2 对账详情

| 项   | 值                                                             |
| :--- | :------------------------------------------------------------- |
| 方法 | `GET`                                                          |
| 地址 | `/api/services/app/StatementAdmin/DetailAsync`                 |
| 权限 | `Admin.Statement.Get`                                          |
| 位置 | `orderFeeGroups[].transportOrder`（`TransportOrderSimpleDto`） |

`DetailAsync` 的业务组同样按 `bizType` 返回 `seaExport` / `seaImport` / `airExport`。

## 3. 出参变更（`TransportOrderDto` / `TransportOrderSimpleDto`）

| JSON 字段 | 原类型 | 新类型 | 说明 |
| :-- | :-- | :-- | :-- |
| `seaExport` | `SeaExportDto`（全量，常为 null） | `SeaExportSimpleDto` | 仅 `bizType=海运出口` 有值 |
| `seaImport` | `SeaImportDto`（全量，常为 null） | `SeaImportSimpleDto` | 仅 `bizType=海运进口` 有值 |
| `airExport` | `AirExportDto`（全量，常为 null） | `AirExportSimpleDto` | 仅 `bizType=空运出口` 有值 |

同一业务三条字段互斥：当前类型赋值，其余为 `null`。

### 3.1 `SeaExportSimpleDto` / `SeaImportSimpleDto`

| JSON         | 类型                | 说明                   |
| :----------- | :------------------ | :--------------------- |
| `id`         | Guid                | 主键（与业务 Id 相同） |
| `vessel`     | string              | 船名                   |
| `innerVoyno` | string              | 航次                   |
| `pol`        | `PortCodeSimpleDto` | 起运港对象             |
| `polRemark`  | string              | 起运港备注             |
| `pod`        | `PortCodeSimpleDto` | 目的港对象             |
| `podRemark`  | string              | 目的港备注             |
| `carrier`    | `CarrierSimpleDto`  | 船公司对象             |

`PortCodeSimpleDto`：`id` / `portName` / `cnName`  
`CarrierSimpleDto`：`id` / `code` / `cnName` / `cnShortName` / `enName` / `ediCode`

### 3.2 `AirExportSimpleDto`

| JSON        | 类型               | 说明                   |
| :---------- | :----------------- | :--------------------- |
| `id`        | Guid               | 主键（与业务 Id 相同） |
| `flightNo`  | string             | 航班                   |
| `pol`       | `AirPortSimpleDto` | 起运地                 |
| `polRemark` | string             | 起运地备注             |
| `pot`       | `AirPortSimpleDto` | 中转地                 |
| `potRemark` | string             | 中转地备注             |
| `pod`       | `AirPortSimpleDto` | 目的地                 |
| `podRemark` | string             | 目的地备注             |

`AirPortSimpleDto`：`id` / `iataCode` / `enName` / `cnName`

## 4. 前端适配清单

- [ ] 按 `bizType` 分支读取 `seaExport` / `seaImport` / `airExport`
- [ ] 港口/船公司/空港一律读对象字段（如 `seaExport.pol.cnName`），勿再读扁平 `*Id`/`*Name`
- [ ] 勿再按全量 `SeaExportDto` 字段解析本接口嵌套业务类型数据
- [ ] 需要完整业务详情时，另调对应模块 `DetailAsync`

## 5. 影响说明

`TransportOrderDto` 嵌套类型变更同时影响：

- `TransportOrderAdmin/DetailAsync`
- `PreOrderAdmin/TransportOrderDetailAsync`
- 继承 `TransportOrderDto` 的分组 Dto（如付费申请 `PayAppFeeGroupDto`）若后续赋值同样按 SimpleDto

完整海出/海进/空出详情请继续使用各自 Admin 的 `DetailAsync`。
