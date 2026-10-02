# 海运出口（SeaExportAdmin）接口文档

## 概述

海运出口模块用于管理海运出口业务。每条海运出口记录关联一个业务表（TransportOrder），业务表包含委托信息、往来单位、日期、箱型箱量、商品信息、关联用户等子表数据。海运出口表的主键与业务表共享同一个ID。

**权限说明**：

| 操作      | 权限标识                 |
| --------- | ------------------------ |
| 新增      | `Admin.SeaExport.Add`    |
| 删除      | `Admin.SeaExport.Delete` |
| 编辑      | `Admin.SeaExport.Edit`   |
| 查询/详情 | `Admin.SeaExport.Get`    |

**接口路径前缀**：`/api/services/app/SeaExportAdmin/`

---

## 0. 更新委托编号 - UpdateCommissionNumAsync

**请求方式**：`PUT`

**接口路径**：`/api/services/app/SeaExportAdmin/UpdateCommissionNumAsync`

**Content-Type**：`application/json`

### 请求参数

| 字段名 | 类型 | 必填 | 说明                                          |
| ------ | ---- | ---- | --------------------------------------------- |
| id     | Guid | 是   | 海运出口主键（与 TransportOrder 共用同一 Id） |

### 出参

`string`：后端重新生成后的委托编号。

### 业务规则

- 前端**禁止传入委托编号内容**，接口只传 `id`
- 后端按编号规则重新生成 `SeaExport.CommissionNum`
- 实际更新的是同 Id 的 `TransportOrder.CommissionNum`
- 若海运出口或对应业务不存在，分别报「海运出口不存在」「对应的业务信息不存在」

---

## 1. 新增海运出口 - AddAsync

**请求方式**：`POST`

**接口路径**：`/api/services/app/SeaExportAdmin/Add`

**Content-Type**：`application/json`

### 请求参数（SeaExportAddDto）

#### 海运出口字段

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| blType | int | 是 | 装运方式（BLType枚举） |
| billType | int | 是 | 订单类型（BillType枚举） |
| secondNotifierId | Guid? | 否 | 第二通知人id |
| secondNotifierContent | string | 否 | 第二通知人内容（最大1024字符） |
| podAgentId | Guid? | 否 | 目的港代理id |
| podAgentContent | string | 否 | 目的港代理内容（最大1024字符） |
| bookingAgentId | Guid? | 否 | 订舱代理id（国内代理） |
| bookingAgentContactId | long? | 否 | 订舱代理联系人id（须属于 bookingAgentId 下的 ClientContact，无外键） |
| shipAgentId | Guid? | 否 | 船代id |
| yardId | Guid? | 否 | 场站id |
| yardEmail | string | 否 | 场站邮箱（最大64字符） |
| yardContact | string | 否 | 场站联系人（最大32字符） |
| yardTel | string | 否 | 场站电话（最大32字符） |
| yardMobile | string | 否 | 场站手机（最大32字符） |
| codeIssueTypeId | long? | 否 | 签单方式id |
| vessel | string | 否 | 船名（最大64字符） |
| innerVoyno | string | 否 | 航次（船公司航次，最大64字符） |
| terminalVoyno | string | 否 | 码头航次（港区航次，最大64字符；与船公司航次是两套编号，查码头船舶计划用这个） |
| carrierId | long? | 否 | 船公司id |
| noBillEnum | int? | 否 | 提单份数，1 到 10。**2026-09-30 起不再是枚举** |
| copyNoBillEnum | int? | 否 | 副本份数，1 到 10。**2026-09-30 起不再是枚举** |
| closingTime | DateTime? | 否 | 截港日期 |
| closeVgmTime | DateTime? | 否 | 截VGM |
| closeDocTime | DateTime? | 否 | 截单日期 |
| closeManifestTime | DateTime? | 否 | 截舱单日期 |
| signingTime | DateTime? | 否 | 签单日期 |
| prepareAtId | long? | 否 | 付费地点Id（港口） |
| signingPortId | long? | 否 | 签单地点Id（港口） |
| podId | long? | 否 | 目的港id |
| podRemark | string | 否 | 目的港备注（最大128字符） |
| polId | long | 是 | 起运港id（必填，用于校验服务项配置） |
| polRemark | string | 否 | 起运港备注（最大128字符） |
| pot1Id | long? | 否 | 中转港1id |
| pot1Remark | string | 否 | 中转港1备注（最大128字符） |
| pot2Id | long? | 否 | 中转港2id |
| pot2Remark | string | 否 | 中转港2备注（最大128字符） |
| receivePortId | long? | 否 | 收货地Id（港口） |
| receivePortRemark | string | 否 | 收货地备注（最大128字符） |
| deliverPortId | long? | 否 | 交货地Id（港口） |
| deliverPortRemark | string | 否 | 交货地备注（最大128字符） |
| sortId | int | 否 | 排序id |
| orgId | long? | **是** | 所属组织id；须为**当票销售**的直属组织（完全相等，不判父子） |
| serviceTypes | object[] | 否 | 服务项目列表（每项含 `serviceType` 和 `sortId`，见下方；会按照起运港配置进行校验） |
| transportOrder | object | 是 | 业务表信息（见下方） |
| attachmentGroup | array | 否 | 分组的附件（按附件详细类型分组，见下方） |

##### serviceTypes 子字段

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| serviceType | int | 是 | 服务项类型（ServiceType枚举） |
| sortId | int | 否 | 排序id（**后端忽略此字段**，`SeaExportService.SortId` 统一取服务项配置的 SortId；前端可不传） |

> **服务项校验与任务生成说明**：
>
> - `serviceTypes` 中每项的 `serviceType` 必须存在于该起运港（`polId`）配置中，否则报错"服务项目包含未配置的项"
> - **不再校验委托单位排除项**：即使某服务项被委托单位排除，仍可添加到海运出口（委托单位排除仅用于 `GetServiceTypesByPOLAsync` 的默认勾选状态）
> - **不再校验输入顺序**：`serviceTypes` 可任意顺序传入，优先级由后端按配置决定，与传入顺序无关
> - 每项的 `sortId` **后端忽略不使用**：`SeaExportService.SortId`（服务项优先级）直接取服务项配置（`SeServiceConfigItem`）的 SortId，因此**相同 sortId 代表同优先级**由配置决定；前端可不传 sortId
> - 校验通过后，系统按服务项配置的最小优先级（SortId）自动生成该优先级下所有服务项任务（SeServiceTask），并根据配置的 UserAttribute 匹配订单用户生成任务处理人
> - 如果找不到起运港配置，`serviceTypes` 可为空，不生成任务

#### 业务表字段（TransportOrderAddDto）

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| bizType | int | 是 | 业务类型（BizType枚举） |
| commissionNum | string | 否 | 委托编号（不传则自动生成，最大32字符） |
| accountDate | DateTime | 是 | 会计期间（根据开船日期自动计算取月份） |
| settlementDate | DateTime | 是 | 应结日期（根据委托单位账期自动计算） |
| codeSourceId | long? | 否 | 业务来源id |
| isBusinessLocking | bool | 否 | 是否业务锁定 |
| mblNum | string | 否 | 主提单号（最大64字符）。当前租户业务表内不可重复（海运出口/海运进口/空运出口互相也不能撞号）；去首尾空格、忽略大小写；空值不校验；冲突报「主提单号【{号码}】已存在」 |
| bookingNum | string | 否 | 订舱编号（最大64字符） |
| contractNum | string | 否 | 合同号（最大64字符，可空） |
| invoiceNum | string | 否 | 发票号（最大64字符，可空）。**2026-09-15 新增**，业务主表字段，所有业务类型共用 |
| codeFrtId | long? | 否 | 付费方式id |
| codeServiceId | long? | 否 | 运输条款id |
| tradeTermsType | int? | 否 | 贸易条款（TradeTermsType枚举） |
| internalRemark | string | 否 | 内部备注（最大1024字符） |
| cargoId | int | 否 | 货物类型（CargoType枚举） |
| marks | string | 否 | 唛头 |
| pkgs | int? | 否 | 件数 |
| codePackageId | long? | 否 | 包装id |
| kgs | decimal? | 否 | 毛重KGS，`decimal(20,4)` |
| cbm | decimal? | 否 | 体积CBM，`decimal(20,4)` |
| goodsDes | string | 否 | 货物描述 |
| clientId | Guid | 是 | 委托单位id |
| clientContactId | long? | 否 | 委托单位联系人id（须属于 clientId 下的 ClientContact，无外键） |
| teamId | Guid? | 否 | 车队id |
| custBrokerId | Guid? | 否 | 报关行id |
| warehouseId | Guid? | 否 | 仓库id |
| insuranceId | Guid? | 否 | 保险公司id |
| consigneeId | Guid? | 否 | 收货人id |
| consigneeContent | string | 否 | 收货人内容（最大1024字符） |
| shipperId | Guid? | 否 | 发货人id |
| shipperContent | string | 否 | 发货人内容（最大1024字符） |
| notifierId | Guid? | 否 | 通知人id |
| notifierContent | string | 否 | 通知人内容（最大1024字符） |
| sortId | int | 否 | 排序id |
| goodsCompleteTime | DateTime? | 否 | 货好时间 |
| etd | DateTime? | 否 | 开船日期 |
| atd | DateTime? | 否 | 实际开船日期 |
| eta | DateTime? | 否 | 预抵日期 |
| orderCodeGoodss | Array | 否 | 商品信息（品名）列表 |
| orderCtns | Array | 否 | 箱型箱量列表 |
| orderUsers | Array | 是 | 业务关联用户列表（至少一个；**销售必填且有且只能有一个**） |

> **未完结字段说明**：`isUnfinished` 不在新建/编辑入参中。新建时后端强制为 `false`；切换未完结状态请调用 `TransportOrderAdmin/ChangeIsUnfinishedAsync`。详见 `文档/业务/业务未完结接口文档.md`。

> **所属组织校验（新建/编辑）**：`orgId` 必填。本人按**当票销售**判定（`orderUsers` 中 `UserAttribute=Sale` 有且只能 1 个，且 `userId>0`），`orgId` 必须是该销售的直属组织。列表可见性仍按下方「数据权限说明」原规则，**不因本校验改变**。

#### 子表 orderCodeGoodss 字段（OrderCodeGoodsAddDto）

| 字段名      | 类型 | 必填 | 说明               |
| ----------- | ---- | ---- | ------------------ |
| codeGoodsId | long | 是   | 商品信息（品名）id |

#### 子表 orderCtns 字段（OrderCtnAddDto）

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| ctnCodeId | long | 是 | 箱型id |
| ctnNo | string | 否 | 箱号（最大32字符） |
| sealNo | string | 否 | 封号 |
| pkgs | int? | 否 | 件数 |
| codePackageId | long? | 否 | 包装id |
| grossWeight | decimal? | 否 | 毛重，`decimal(20,4)`，**小数最多 4 位**，超出的位数在反序列化时四舍五入 |
| tareWeight | decimal? | 否 | 皮重，`decimal(20,4)`，**小数最多 4 位** |
| overLength | decimal? | 否 | 超长，`decimal(18,2)`，**小数最多 2 位** |
| overWidth | decimal? | 否 | 超宽，`decimal(18,2)`，**小数最多 2 位** |
| overHeight | decimal? | 否 | 超高，`decimal(18,2)`，**小数最多 2 位** |
| volume | decimal? | 否 | 体积，`decimal(20,4)`，**小数最多 4 位** |
| codeGoodsId | long? | 否 | 商品信息（品名）id |
| bookingNo | string | 否 | 订舱号 |
| remark | string | 否 | 备注 |

#### 子表 orderUsers 字段（OrderUserAddDto）

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | long | 是 | 用户Id |
| userAttribute | int | 是 | 用户属性（UserAttribute枚举，值必须为2的整数次幂，如1=销售，2=操作等） |
| sortId | int | 否 | 排序id（降序，大的在前） |
| remark | string | 否 | 备注（最大1024字符） |

#### 分组附件 attachmentGroup 字段（AttachmentGroupInputDto）

附件按**附件详细类型**（`attachmentDtlTypeId`）分组传入。上传文件先调用通用上传接口获取 `attachmentId`。

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| attachmentDtlTypeId | number/null | 否 | 附件详细类型Id（分组依据，如提单、托书） |
| items | array | 否 | 该类型下的附件集合 |
| items[].attachmentId | number | 是 | 附件Id（先通过上传接口获取） |
| items[].attachmentDtlTypeId | number/null | 否 | 附件详细类型Id（可与分组一致，分组优先） |
| items[].clientVisible | boolean | 否 | 客户是否可见 |
| items[].displayOrder | number | 否 | 显示顺序 |

### 请求示例

```json
{
  "blType": 0,
  "billType": 0,
  "vessel": "EVER GIVEN",
  "innerVoyno": "V001",
  "terminalVoyno": "1173069E",
  "carrierId": 1,
  "polId": 1,
  "podId": 2,
  "closingTime": "2026-05-20T18:00:00",
  "sortId": 0,
  "remark": "",
  "serviceTypes": [
    { "serviceType": 1, "sortId": 0 },
    { "serviceType": 2, "sortId": 0 },
    { "serviceType": 3, "sortId": 1 }
  ],
  "transportOrder": {
    "bizType": 0,
    "clientId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "accountDate": "2026-05-01T00:00:00",
    "settlementDate": "2026-06-01T00:00:00",
    "mblNum": "MBLTEST001",
    "etd": "2026-05-25T00:00:00",
    "atd": "2026-05-25T08:30:00",
    "eta": "2026-06-10T00:00:00",
    "goodsCompleteTime": "2026-05-18T00:00:00",
    "orderUsers": [{ "userId": 1, "userAttribute": 1, "sortId": 1 }],
    "orderCodeGoodss": [{ "codeGoodsId": 1 }],
    "orderCtns": [{ "ctnCodeId": 1, "ctnNo": "TEMU1234567", "sealNo": "SL001" }]
  },
  "attachmentGroup": [
    {
      "attachmentDtlTypeId": 1,
      "items": [
        { "attachmentId": 12345, "clientVisible": true, "displayOrder": 0 },
        { "attachmentId": 12346, "clientVisible": false, "displayOrder": 1 }
      ]
    },
    {
      "attachmentDtlTypeId": 2,
      "items": [
        { "attachmentId": 12347, "clientVisible": true, "displayOrder": 0 }
      ]
    }
  ]
}
```

### 响应

成功返回新增记录的 `Guid`（同时作为TransportOrder和SeaExport的主键）。

```json
{
  "result": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "success": true,
  "error": null
}
```

---

## 2. 复制海运出口 - CopyAsync

**请求方式**：`POST`

**接口路径**：`/api/services/app/SeaExportAdmin/Copy`

**Content-Type**：`application/json`

**权限**：`Admin.SeaExport.Add`

### 请求参数（SeaExportCopyDto）

| 字段名        | 类型 | 必填 | 说明               |
| ------------- | ---- | ---- | ------------------ |
| id            | Guid | 是   | 要复制的海运出口id |
| copyOrderFees | bool | 是   | 是否复制费用       |

### 业务规则

- 复制 `TransportOrder`、`SeaExport`、`SeaExportServices`，以及 `OrderCodeGoodss`、`OrderCtns`、`OrderUsers`
- **不复制** `SeaExportSeparates`、附件、服务项任务历史
- `commissionNum` 自动生成；`mblNum`、`bookingNum`、`contractNum`、`invoiceNum` 置空
- 业务锁定、费用锁定等状态重置为初始；`userId` 为当前登录用户
- `accountDate`、`settlementDate` 按新建逻辑根据 ETD 重新计算
- 复制后按服务项配置校验并生成首个待处理服务项任务（同 `AddAsync`）
- 当 `copyOrderFees=true` 时：仅复制源票 `changeOrderId` 为空的费用；新费用状态为录入（`feeStatus=0`）、未结算、未开票，`settledAmount=0`，`dataEntryMethod=5`（业务复制）

### 请求示例

```json
{
  "id": "2dd8823b-62db-4d6b-b519-85bd34285906",
  "copyOrderFees": true
}
```

### 响应

成功返回新记录的 `Guid`（同时作为 TransportOrder 和 SeaExport 的主键）。

```json
{
  "result": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "success": true,
  "error": null
}
```

---

## 3. 删除海运出口 - DeleteAsync

**请求方式**：`DELETE`

**接口路径**：`/api/services/app/SeaExportAdmin/Delete`

**Content-Type**：`application/json`

### 请求参数

| 字段名 | 类型 | 必填 | 说明                                 |
| ------ | ---- | ---- | ------------------------------------ |
| id     | Guid | 是   | 海运出口主键（同时删除对应的业务表） |

### 请求示例

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

### 响应

```json
{
  "result": true,
  "success": true,
  "error": null
}
```

---

## 4. 编辑海运出口 - EditAsync

**请求方式**：`PUT`

**接口路径**：`/api/services/app/SeaExportAdmin/EditAsync`

**Content-Type**：`application/json`

### 请求参数（SeaExportEditDto）

与新增接口字段一致，区别如下：

- 顶层增加 `id`（Guid，必填，海运出口主键）
- `transportOrder` 内增加 `id`（Guid，必填）
- 子表 `orderCodeGoodss` / `orderCtns` / `orderUsers` 中，如果 `id > 0` 则为更新，否则为新增；数据库中存在但输入中不存在的记录会被删除
- `transportOrder` 中所有日期字段（`goodsCompleteTime`、`etd`、`atd`、`eta`）均可编辑更新
- `orgId` 校验同新增：本人 = 当票销售（必填且唯一），须为该销售直属组织；列表数据权限逻辑不变

#### 海运出口字段

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Guid | 是 | 海运出口主键 |
| （其余字段同新增接口） |  |  |  |
| transportOrder | object | 是 | 业务表信息 |
| serviceTypes | object[] | 是 | 服务项目列表（全量替换，每项含 `serviceType` 和 `sortId`，结构同新增接口） |

#### 业务表字段（TransportOrderEditDto）

| 字段名                                        | 类型 | 必填 | 说明       |
| --------------------------------------------- | ---- | ---- | ---------- |
| id                                            | Guid | 是   | 业务表主键 |
| （其余字段同新增接口的 TransportOrderAddDto） |      |      |            |

#### 子表编辑逻辑说明

- **orderCodeGoodss**：`id` 有值（>0）为更新，无值为新增；数据库中有但输入中没有的记录自动删除
- **orderCtns**：同上
- **orderUsers**：同上

#### 服务项与任务变更逻辑

- `polId` 为必填项
- **起运港变更 或 服务项（serviceType 集合）变更**：系统将删除所有现有服务项记录和已生成的服务项任务，按新的 `serviceTypes` 和起运港配置重新生成（逻辑与新增相同），`SeaExportService.SortId` 取服务项配置的 SortId
- **起运港未变更 且 服务项集合未变更**：不对服务项和任务做任何处理（仅可能同步任务处理人）

> **判断服务项是否变更**：将输入 `serviceTypes` 的 `serviceType` 集合排序后与数据库中已有服务项排序后比较，只要 serviceType 集合不一致就视为变更并重建任务；`sortId` 由后端按配置取值，前端传入的 sortId 不影响判断

#### 锁定字段逻辑

- 编辑时会检查该海运出口所有**已完成任务**对应的 `SeServiceConfigItem.SeServiceLocks`
- 锁定的字段不会被修改（静默跳过，不报错）。即：即使前端传了新值，后端也会保留原值
- 锁定字段通过 `SeaExportPropEnum` 枚举的 `Description` 属性映射到 SeaExport / TransportOrder 的属性名

### 响应

```json
{
  "result": true,
  "success": true,
  "error": null
}
```

---

## 4.1 批量编辑海运出口 - BatchEditAsync

**请求方式**：`PUT`

**接口路径**：`/api/services/app/SeaExportAdmin/BatchEditAsync`

**Content-Type**：`application/json`

**权限**：`Admin.SeaExport.Edit`

把选中的多票海运出口统一改成输入的值。**除 `ids` 外全部字段都可空，只传要改的字段；没传的字段（id 为 `null`、字符串为空）保持每票原值不变。**

### 请求参数（SeaExportBatchEditDto）

#### 顶层

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| ids | Guid[] | 是 | 要批量修改的海运出口id列表（与 TransportOrder 共用同一 Id），重复项自动去重 |
| orgId | long | 否 | 所属组织id，须为该票销售的直属组织；同时写入 SeaExport 与 TransportOrder |

#### 往来单位

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| clientId | Guid | 否 | 委托单位id。改动后 `transportOrder.clientContactId` 被清空，应结日期与结算方式按新委托单位的账期重算 |
| shipAgentId | Guid | 否 | 船代id |
| bookingAgentId | Guid | 否 | 订舱代理id（国内代理）。改动后 `bookingAgentContactId` 被清空 |
| teamId | Guid | 否 | 车队id |
| insuranceId | Guid | 否 | 保险公司id |
| warehouseId | Guid | 否 | 仓库id |
| yardId | Guid | 否 | 场站id |

#### 船期

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| carrierId | long | 否 | 船公司id |
| vessel | string | 否 | 船名，上限 64 字符；空字符串视为不修改 |
| innerVoyno | string | 否 | 航次（船公司航次），上限 64 字符；空字符串视为不修改 |

#### 日期

**`null` 表示不修改，所以本接口只能把日期改成某个值、不能用它把日期清空**（要清空请走单条编辑）。归一化口径与 `EditAsync` 一致。

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| etd | DateTime | 否 | 开船日期，只取日期部分（时分秒归零）。**会连带重算会计期间、原票费用的会计期间、应结日期与结算方式**，见下文 |
| atd | DateTime | 否 | 实际开船日期，只取日期部分 |
| eta | DateTime | 否 | 预抵日期，只取日期部分 |
| goodsCompleteTime | DateTime | 否 | 货好时间，原值保留 |
| closingTime | DateTime | 否 | 截港日期，原值保留 |
| closeDocTime | DateTime | 否 | 截单日期，精确到分钟（秒和毫秒归零） |
| closeManifestTime | DateTime | 否 | 截舱单日期（截关日期），精确到分钟 |
| closeVgmTime | DateTime | 否 | 截VGM，精确到分钟。**该字段已不再使用**，仅为与单条编辑保持一致而保留 |
| signingTime | DateTime | 否 | 签单日期，原值保留 |

#### 方式与条款

| 字段名          | 类型 | 必填 | 说明                                 |
| --------------- | ---- | ---- | ------------------------------------ |
| codeIssueTypeId | long | 否   | 签单方式id                           |
| codeFrtId       | long | 否   | 付款方式id（即付费方式）             |
| prepareAtId     | long | 否   | 付款地点id（即付费地点，取港口）     |
| codeServiceId   | long | 否   | 运输条款id                           |
| tradeTermsType  | int  | 否   | 贸易条款枚举（0 CIF、1 FOB、2 EXW…） |
| codeSourceId    | long | 否   | 业务来源id                           |

#### 港口

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| receivePortId | long | 否 | 收货地（港口）id |
| receivePortRemark | string | 否 | 收货地备注，上限 128 字符 |
| polId | long | 否 | 起运港id。改动后该票服务项与任务按新起运港重建，见下文 |
| polRemark | string | 否 | 起运港备注，上限 128 字符 |
| pot1Id | long | 否 | 中转港1id |
| pot1Remark | string | 否 | 中转港1备注，上限 128 字符 |
| pot2Id | long | 否 | 中转港2id |
| pot2Remark | string | 否 | 中转港2备注，上限 128 字符 |
| podId | long | 否 | 目的港id |
| podRemark | string | 否 | 目的港备注，上限 128 字符 |
| deliverPortId | long | 否 | 交货地（港口）id |
| deliverPortRemark | string | 否 | 交货地备注，上限 128 字符 |

> [!IMPORTANT] **备注跟着港口 id 走，不能单独改。**
>
> - 只有**同时传了对应的港口 id**，备注才会被写入；只传 `polRemark` 不传 `polId` 时这个备注会被忽略（备注描述的就是那个港口，港口没换却改备注只会让两者对不上）
> - 传了港口 id 但**没带备注**时，后端按港口资料自动生成 `PortName, CountryEnName`（逗号后有一个空格，例如 `SHANGHAI, CHINA`），与识别类接口生成的备注是同一套格式；港口英文名或国家英文名缺一侧时只写另一侧
> - 该港口 id 被已完成任务锁定时（目前只有 `polId`、`podId` 有锁定枚举），id 和备注一起跳过，两者不会脱节
> - 备注不计入「至少输入一个要修改的字段」的判断：只传备注不传港口 id 等于什么都没改

#### 业务关联人员

传用户id，落到 `OrderUser` 的 `userId` + `userAttribute` 两列。**按用户属性单独换人，不是清空重建**：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| operationUserId | long | 否 | 操作用户id |
| documentationUserId | long | 否 | 单证用户id |
| customerServiceUserId | long | 否 | 客服用户id |
| saleUserId | long | 否 | 销售用户id。改动后该票所属人（`UserId`）跟着变 |
| lanerUserId | long | 否 | 航线用户id |

- 该票原来有这个属性的人 → 把人**改**成新的
- 原来没有这个属性 → **新增**一条
- 同一属性原来有多条 → 只留一条，多余的删掉
- 输入里**没提到**的属性（商务、财务、海外客服、监装等）**一概不动**

### 请求示例

```json
{
  "ids": [
    "3a1b0c5e-1111-4a2b-9c3d-000000000001",
    "3a1b0c5e-1111-4a2b-9c3d-000000000002"
  ],
  "carrierId": 12,
  "vessel": "COSCO SHIPPING ROSE",
  "innerVoyno": "081E",
  "etd": "2026-10-08",
  "closingTime": "2026-10-06 18:00:00",
  "closeDocTime": "2026-10-05 16:30:00",
  "yardId": "9f2e0b7a-2222-4c3d-8e4f-000000000003",
  "operationUserId": 1024
}
```

### 出参

`int`：**实际修改的票数**。传入的 ids 中被数据权限或表级权限过滤掉的票不计入。

```json
{
  "result": 2,
  "success": true,
  "error": null
}
```

### 数据权限

- 传入的 `ids` 先过**「编辑」口径的行级数据权限 + 表级权限**（与 `EditAsync`、列表 `isEditable` 同一套判定），没权限的票被**过滤掉、不参与修改**
- 全部票都没权限时报「所选海运出口都没有编辑权限」
- 前端可用列表返回的 `isEditable` 预先禁用勾选，避免出现「选了 5 票只改了 3 票」

### 业务规则

| 规则 | 说明 |
| --- | --- |
| 一个字段都没传 | 报「请至少输入一个要修改的字段」 |
| 外键校验 | 每个传了值的字段只校验一次（不逐票查），不存在时报「xx不存在」 |
| 锁定字段 | 某票被**已完成任务**锁定的字段自动跳过、保留原值，其余字段照改；不会因为一票锁了字段就让整批失败 |
| 字段级权限屏蔽 | 当前用户无查看权限的字段**一律不参与批量更新**（保守策略，不做条件求值），即使传了也保持各票原值 |
| 所属组织 | 传 `orgId` 或换销售时校验 `orgId` 属于该票销售的直属组织；该票没有销售时报「委托编号[xx]没有销售，无法校验所属组织」 |
| 应结日期 | 开船日期 / 委托单位 / 业务来源 / 所属组织任一变化时按账期规则重算 `settlementDate` 与 `settlementType`，时间基准为开船日期（没有则取创建日期） |
| 提成单守卫 | 会计期间变化、换销售、或改动 `clientId`/`tradeTermsType`/`polId`/`podId` 时走与 `EditAsync` 相同的提成守卫；已提交销售提成的票改开船日期跨月会报「已提交销售提成不可修改会计期间」 |
| 联系人一致性 | 换委托单位清 `clientContactId`，换订舱代理清 `bookingAgentContactId`（联系人挂在旧单位下，换了就不成立） |
| 事务 | 整批在一个事务里，任何一票校验不过则整批回滚，不会出现改了一半的情况 |

#### 开船日期变更时的会计期间

- **只有传了 `etd`、且与该票原值不同**时才重算会计期间（取新开船日期的月初）
- 没传 `etd` 的票**一律沿用库里的 `accountDate`，不会照 ETD 反推**。存量数据里建单时没填开船日期的票，`accountDate` 是按创建日期生成的，与 ETD 本就对不上；每票都重算会把这些票的会计期间悄悄挪月，还会连带触发销售提成守卫让整批失败
- 会计期间真的变了时，**该票原票（`changeOrderId` 为空）的费用会计期间跟着一起改**；更改单的费用有自己的会计期间，不动

#### 起运港变更时的服务项与任务

口径与 `EditAsync` 完全一致：

- `polId` 真的变了（传了值、未被锁定、且与原值不同）→ **删除该票所有服务项与服务项任务，按新起运港的配置重建服务项并生成首个优先级的任务**
- 批量编辑**不接受服务项输入**，沿用该票原有的服务项集合；原有服务项必须在新起运港的配置里，否则报「服务项目包含未配置的项」
- `polId` 没变、但关联人员变了 → 只同步待处理任务的处理人（已处理任务保留历史处理人，已转交任务不动）

---

## 5. 海运出口列表 - GetPagedListAsync

**请求方式**：`GET`

**接口路径**：`/api/services/app/SeaExportAdmin/GetPagedListAsync`

### 请求参数（SeaExportQueryDto，Query参数）

#### 分页排序

| 字段名    | 类型   | 必填 | 说明                               |
| --------- | ------ | ---- | ---------------------------------- |
| pageIndex | int    | 否   | 当前页码（从1开始，默认1）         |
| pageSize  | int    | 否   | 每页条数（默认10）                 |
| sorting   | string | 否   | 排序字段，如 `"creationTime desc"` |

#### 通用搜索

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 关键字，模糊匹配：船名、航次、备注、主提单号、订舱编号、合同号、发票号、委托编号 |
| keys | List&lt;string&gt; | 否 | 关键字列表，**精确匹配**上述同一批字段；列表内满足任意一个即可。Query 重复传参：`keys=MBL001&keys=MBL002`。空串/空白项忽略。与 `keyword` 同时传时为 AND |
| orgId | long? | 否 | 组织id（按组织筛选数据权限） |

#### SeaExport字段筛选

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| blType | int? | 装运方式 |
| billType | int? | 订单类型 |
| secondNotifierId | Guid? | 第二通知人id |
| secondNotifierContent | string | 第二通知人内容（模糊匹配） |
| podAgentId | Guid? | 目的港代理id |
| podAgentContent | string | 目的港代理内容（模糊匹配） |
| bookingAgentId | Guid? | 订舱代理id |
| shipAgentId | Guid? | 船代id |
| yardId | Guid? | 场站id |
| yardIdEmpty | bool? | 场站未填写（true=仅查 YardId 为空；与 yardId 互斥） |
| codeIssueTypeId | long? | 签单方式id |
| codeIssueTypeIdEmpty | bool? | 签单方式未填写（true=仅查 CodeIssueTypeId 为空；与 codeIssueTypeId 互斥） |
| vessel | string | 船名（模糊匹配） |
| vesselEmpty | bool? | 船名未填写（true=仅查 Vessel 为 null；与 vessel 互斥） |
| innerVoyno | string | 航次（船公司航次，模糊匹配） |
| terminalVoyno | string | 码头航次（港区航次，模糊匹配） |
| carrierId | long? | 船公司id |
| carrierIdEmpty | bool? | 船公司未填写（true=仅查 CarrierId 为空；与 carrierId 互斥） |
| noBillEnum | int? | 提单份数 |
| copyNoBillEnum | int? | 副本份数 |
| closingTimeStart | DateTime? | 截港日期起 |
| closingTimeEnd | DateTime? | 截港日期止 |
| closeVgmTimeStart | DateTime? | 截VGM起 |
| closeVgmTimeEnd | DateTime? | 截VGM止 |
| closeDocTimeStart | DateTime? | 截单日期起 |
| closeDocTimeEnd | DateTime? | 截单日期止 |
| closeManifestTimeStart | DateTime? | 截舱单日期起 |
| closeManifestTimeEnd | DateTime? | 截舱单日期止 |
| signingTimeStart | DateTime? | 签单日期起 |
| signingTimeEnd | DateTime? | 签单日期止 |
| prepareAtId | long? | 付费地点id |
| signingPortId | long? | 签单地点id |
| podId | long? | 目的港id |
| podIdEmpty | bool? | 目的港未填写（true=仅查 PODId 为空；与 podId 互斥） |
| podRemark | string | 目的港备注（模糊匹配） |
| polId | long? | 起运港id |
| polIdEmpty | bool? | 起运港未填写（true=仅查 POLId 为空；与 polId 互斥） |
| polRemark | string | 起运港备注（模糊匹配） |
| pot1Id | long? | 中转港1id |
| pot1Remark | string | 中转港1备注（模糊匹配） |
| pot2Id | long? | 中转港2id |
| pot2Remark | string | 中转港2备注（模糊匹配） |
| receivePortId | long? | 收货地id |
| receivePortRemark | string | 收货地备注（模糊匹配） |
| deliverPortId | long? | 交货地id |
| deliverPortRemark | string | 交货地备注（模糊匹配） |
| serviceType | int? | 服务项目（ServiceType枚举） |

#### TransportOrder字段筛选

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| bizType | int? | 业务类型 |
| commissionNum | string | 委托编号（模糊匹配） |
| accountDateStart | DateTime? | 会计期间起 |
| accountDateEnd | DateTime? | 会计期间止 |
| settlementDateStart | DateTime? | 应结日期起 |
| settlementDateEnd | DateTime? | 应结日期止 |
| codeSourceId | long? | 业务来源id |
| isBusinessLocking | bool? | 是否业务锁定 |
| mblNum | string | 主提单号（模糊匹配） |
| bookingNum | string | 订舱编号（模糊匹配） |
| contractNum | string | 合同号（模糊匹配） |
| invoiceNum | string | 发票号（模糊匹配）。**2026-09-15 新增** |
| codeFrtId | long? | 付费方式id |
| codeFrtIdEmpty | bool? | 付费方式未填写（true=仅查 CodeFrtId 为空；与 codeFrtId 互斥） |
| codeServiceId | long? | 运输条款id |
| tradeTermsType | int? | 贸易条款 |
| internalRemark | string | 内部备注（模糊匹配） |
| cargoId | int? | 货物类型 |
| marks | string | 唛头（模糊匹配） |
| codePackageId | long? | 包装id |
| goodsDes | string | 货物描述（模糊匹配） |
| clientId | Guid? | 委托单位id |
| teamId | Guid? | 车队id |
| custBrokerId | Guid? | 报关行id |
| warehouseId | Guid? | 仓库id |
| insuranceId | Guid? | 保险公司id |
| consigneeId | Guid? | 收货人id |
| consigneeContent | string | 收货人内容（模糊匹配） |
| shipperId | Guid? | 发货人id |
| shipperContent | string | 发货人内容（模糊匹配） |
| notifierId | Guid? | 通知人id |
| notifierContent | string | 通知人内容（模糊匹配） |
| goodsCompleteTimeStart | DateTime? | 货好时间起 |
| goodsCompleteTimeEnd | DateTime? | 货好时间止 |
| etdStart | DateTime? | 开船日期起 |
| etdEnd | DateTime? | 开船日期止 |
| atdStart | DateTime? | 实际开船日期起 |
| atdEnd | DateTime? | 实际开船日期止 |
| etaStart | DateTime? | 预抵日期起 |
| etaEnd | DateTime? | 预抵日期止 |
| feeLocked | bool? | 是否费用锁定 |
| creationTimeStart | DateTime? | 创建时间起 |
| creationTimeEnd | DateTime? | 创建时间止 |

#### 关联用户字段筛选

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| saleId | long? | 销售id（用户id） |
| saleIdEmpty | bool? | 销售未填写（true=仅查未挂销售干系人；与 saleId 互斥） |
| operationId | long? | 操作id（用户id） |
| operationIdEmpty | bool? | 操作未填写（true=仅查未挂操作干系人；与 operationId 互斥） |
| documentationId | long? | 单证id |
| businessId | long? | 商务id |
| customerServiceId | long? | 客服id |

#### 箱型字段筛选

| 字段名    | 类型   | 说明             |
| --------- | ------ | ---------------- |
| ctnCodeId | long?  | 箱型id           |
| ctnNo     | string | 箱号（模糊匹配） |

### 请求示例

```
GET /api/services/app/SeaExportAdmin/GetPagedList?keyword=MBLTEST&etdStart=2026-05-01&etdEnd=2026-05-31&atdStart=2026-05-01&atdEnd=2026-05-31&pageIndex=1&pageSize=10&sorting=creationTime desc
```

### 数据权限说明（列表 / 分组统计专用）

列表 `GetPagedListAsync` 与分组统计 `GetGroupedListAsync` **不使用**通用 `DataPermissionFilterAsync`（仅按 `UserId` 过滤），而使用海运出口专用规则：

在数据权限配置的可见用户 id 范围内，满足以下**任意一条**即可看到该票：

| 匹配字段 | 说明 |
| --- | --- |
| `SeaExport.UserId` | 所属人 |
| `SeaExport.CreatorUserId` | 创建人 |
| 业务关联人员 | `OrderUser` 表中，用户在销售/商务/操作/客服/单证/海外客服角色之一 |
| 服务项任务转交人 | `SeServiceTask.AssigneeUserId`（已转交的任务处理人） |

**性能说明：** 常见场景（仅本人数据权限）走 `UserId == 当前用户` 等值比较；业务关联人员、任务转交人分别通过 `OrderUser`、`SeServiceTask` 独立子查询（`EXISTS`）匹配，不在主查询 JOIN 子表。多人权限范围时才使用 `IN`/`Contains`。

数据权限类型为「全部」时不过滤。其余模块（详情、编辑、删除等）仍按原 `UserId` 规则，不受此变更影响。

### 响应（PagedList\<SeaExportListDto\>）

**2026-10-01 起列表出参改为 `SeaExportListDto`，不再返回完整 `SeaExportDto`。** 详情 `DetailAsync` 仍是完整对象。下面旧样例和「响应字段说明」是改前的整票结构，列表不要再按那份对接。

票根：`id`、`isEditable`、`orgs`、`creationTime`、`lastModificationTime`、`localCurrencyCode`、`creatorUserNickName`、`receiveFeeStatus`、`payFeeStatus`、`blType`、`billType`、`vessel`、`innerVoyno`、`closeVgmTime`、`closingTime`、`closeDocTime`、`terminalVoyno`、`polRemark`、`podRemark`、`poT1Remark`、`poT2Remark`、`receivePortRemark`、`deliverPortRemark`、`isYundangSubscribed`、`isYundangSubscribeSuccess`、`isFeituoSubscribed`、`isFeituoSubscribeSuccess`。

`orgs` 每级只留 `name`。**2026-10-01 起列表不再返回** `userId`、`orgId`、`creatorUserId`、`lastModifierUserId`、`isDeleted`、`deleterUserId`、`deletionTime`、`localCurrencyId`。详情仍返回这些字段。

| 嵌套 | 只留 |
| :-- | :-- |
| `pod` | `lane.laneName`。起运港、中转港、收货地、交货地、签单地、付费地对象不返回，港口列走上面的备注 |
| `bookingAgent` / `yard` | `name` |
| `carrier` | `code`、`cnShortName` |
| `carrierLogo` | `url` |
| `codeIssueType` | `billType` |
| `seaExportServices` | `serviceType`（前端枚举 Name：`ServiceType`）、`sortId`、`seServiceTask.serviceTaskStatus` |
| `yundangShipmentOceanNode` | `stateDescCN` |
| `feituoTracking` | `billNo`、`containerNo`、`errorMessage`、`statusCategory`、`updateTime`、`currentDescriptionCn`、`currentIsEsti`、`hasOffLoadOfCarrier`、`offLoadContainerNos`、`hasWarning`、`warningCount`、`latestWarningCategory`、`latestWarningTime`、`latestWarningDescription`、`iframeUrl`、`iframeShortUrl` |
| `transportOrder` | `id`、`commissionNum`、`mblNum`、`bookingNum`、`contractNum`、`invoiceNum`、`accountDate`、`goodsCompleteTime`、`etd`、`atd`、`eta`、`pkgs`、`kgs`、`cbm`、`marks`、`goodsDes`、`internalRemark`、`remark`、`feeLocked`、`isBusinessLocking`、`isUnfinished`、`consigneeContent`、`shipperContent`、`notifierContent`、`totalCtn`、`teu`、`hasOrderFee`、`unsolvedQuestionCount` |
| `transportOrder.codeSource` / `codeFrt` | `cnName` |
| `transportOrder.codePackage` | `name` |
| `transportOrder.client` / `consignee` / `shipper` / `notifier` | `name`。简称为空时回退到对应正文 |
| `transportOrder.orderUsers` | `userAttribute`、`userNickName` |

不再返回：费用明细 `orderFees`、箱子明细 `orderCtns`、品名 `orderCodeGoodss`、提单摘要 `billOfLadings`、订舱代理联系人、船代、第二通知人、目的港代理、车队、报关行、仓库、保险公司、委托单位联系人、危险品、冷冻、第二通知人正文、目的港代理正文、场站邮箱/电话。`hasOrderFee` 有任意一条费用即为 `true`。`totalCtn`、`teu` 仍由箱子算出。字段屏蔽仍按海运出口、业务表两套规则生效。

```json
{
  "result": {
    "totalCount": 100,
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "blType": 0,
        "billType": 0,
        "secondNotifierId": null,
        "secondNotifierContent": null,
        "podAgentId": null,
        "podAgentContent": null,
        "bookingAgentId": null,
        "shipAgentId": null,
        "yardId": null,
        "codeIssueTypeId": null,
        "vessel": "EVER GIVEN",
        "innerVoyno": "V001",
        "terminalVoyno": "1173069E",
        "carrierId": 1,
        "noBillEnum": null,
        "copyNoBillEnum": null,
        "closingTime": "2026-05-20T18:00:00",
        "closeVgmTime": null,
        "closeDocTime": null,
        "closeManifestTime": null,
        "signingTime": null,
        "prepareAtId": null,
        "prepareAt": null,
        "signingPortId": null,
        "signingPort": null,
        "podId": 2,
        "pod": {
          "id": 2,
          "portName": "ROTTERDAM",
          "cnName": "鹿特丹",
          "ediCode": "NLRTM",
          "lane": {
            "id": 2,
            "code": "EU",
            "laneName": "欧洲线",
            "laneEnName": "Europe",
            "ediCode": null
          },
          "country": {
            "id": 2,
            "code": "NL",
            "countryName": "荷兰",
            "countryEnName": "Netherlands"
          }
        },
        "podRemark": null,
        "polId": 1,
        "pol": {
          "id": 1,
          "portName": "SHANGHAI",
          "cnName": "上海",
          "ediCode": "CNSHA",
          "lane": null,
          "country": null
        },
        "polRemark": null,
        "pot1Id": null,
        "pot1": null,
        "pot1Remark": null,
        "pot2Id": null,
        "pot2": null,
        "pot2Remark": null,
        "receivePortId": null,
        "receivePort": null,
        "receivePortRemark": null,
        "deliverPortId": null,
        "deliverPort": null,
        "deliverPortRemark": null,
        "sortId": 0,
        "remark": null,
        "creatorUserNickName": "管理员",
        "secondNotifier": null,
        "podAgent": null,
        "bookingAgent": null,
        "shipAgent": null,
        "yard": null,
        "carrier": {
          "id": 1,
          "cnName": "中远海运集装箱运输有限公司",
          "cnShortName": "中远海运",
          "enName": "COSCO SHIPPING Lines",
          "code": "COSCO",
          "ediCode": "COSU"
        },
        "carrierLogo": null,
        "codeIssueTypeName": null,
        "feeStatusPay": null,
        "feeStatusReceive": null,
        "billOfLadings": [
          { "id": "b1c2d3e4-5717-4562-b3fc-2c963f66afa6", "status": 1 },
          { "id": "c2d3e4f5-5717-4562-b3fc-2c963f66afa6", "status": 0 }
        ],
        "seaExportServices": [
          {
            "id": 1,
            "seaExportId": "3fa85f64-...",
            "serviceType": 1,
            "sortId": 0,
            "seServiceTask": {
              "id": "a1b2c3d4-...",
              "serviceTaskStatus": 0,
              "completionUserId": null,
              "completionUserName": null,
              "completionTime": null,
              "seServiceTaskUsers": [{ "userId": 1, "userNickName": "张三" }]
            }
          }
        ],
        "transportOrder": {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "bizType": 0,
          "commissionNum": "SE202605001",
          "accountDate": "2026-05-01T00:00:00",
          "settlementDate": "2026-06-01T00:00:00",
          "codeSourceId": null,
          "isBusinessLocking": false,
          "isUnfinished": false,
          "mblNum": "MBLTEST001",
          "bookingNum": null,
          "contractNum": null,
          "invoiceNum": null,
          "codeFrtId": null,
          "codeServiceId": null,
          "tradeTermsType": null,
          "internalRemark": null,
          "cargoId": 0,
          "marks": null,
          "pkgs": null,
          "upperPKGS": null,
          "codePackageId": null,
          "codePackageName": null,
          "kgs": null,
          "cbm": null,
          "goodsDes": null,
          "clientId": "3fa85f64-...",
          "client": {
            "id": "3fa85f64-...",
            "name": "测试委托单位",
            "fullName": "测试委托单位有限公司",
            "address": null,
            "enAddress": null
          },
          "teamId": null,
          "team": null,
          "custBrokerId": null,
          "custBroker": null,
          "warehouseId": null,
          "warehouse": null,
          "insuranceId": null,
          "insurance": null,
          "consigneeId": null,
          "consignee": null,
          "consigneeContent": null,
          "shipperId": null,
          "shipper": null,
          "shipperContent": null,
          "notifierId": null,
          "notifier": null,
          "notifierContent": null,
          "goodsCompleteTime": "2026-05-18T00:00:00",
          "etd": "2026-05-25T00:00:00",
          "atd": "2026-05-25T08:30:00",
          "eta": "2026-06-10T00:00:00",
          "feeLocked": false,
          "feeLockedUserId": null,
          "feeLockedTime": null,
          "feeUnLockedUserId": null,
          "feeUnLockedTime": null,
          "sortId": 0,
          "remark": null,
          "codeSourceName": null,
          "codeFrtName": null,
          "codeServiceName": null,
          "totalCtn": "20GP*1",
          "teu": 1,
          "unsolvedQuestionCount": 0,
          "orderCodeGoodss": [
            {
              "id": 1,
              "transportOrderId": "3fa85f64-...",
              "codeGoodsId": 1,
              "codeGoodsName": "电子产品",
              "codeGoodsHSCode": "8471300000"
            }
          ],
          "orderCtns": [
            {
              "id": 1,
              "transportOrderId": "3fa85f64-...",
              "ctnCodeId": 1,
              "ctnNo": "TEMU1234567",
              "sealNo": "SL001",
              "pkgs": null,
              "codePackageId": null,
              "grossWeight": null,
              "tareWeight": null,
              "overLength": null,
              "overWidth": null,
              "overHeight": null,
              "volume": null,
              "codeGoodsId": null,
              "bookingNo": null,
              "remark": null,
              "ctnCodeName": "20GP",
              "codePackageName": null,
              "codeGoodsName": null,
              "codeGoodsHSCode": null
            }
          ],
          "orderUsers": [
            {
              "id": 1,
              "transportOrderId": "3fa85f64-...",
              "userId": 1,
              "userNickName": "张三",
              "userAttribute": 1,
              "sortId": 1,
              "remark": null
            }
          ],
          "orderFees": []
        }
      }
    ]
  },
  "success": true,
  "error": null
}
```

### 响应字段说明（2026-10-01 前的 SeaExportDto，列表已不再返回）

#### 海运出口字段

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | Guid | 主键 |
| blType | int | 装运方式 |
| billType | int | 订单类型 |
| secondNotifierId | Guid? | 第二通知人id |
| secondNotifierContent | string | 第二通知人内容 |
| podAgentId | Guid? | 目的港代理id |
| podAgentContent | string | 目的港代理内容 |
| bookingAgentId | Guid? | 订舱代理id |
| shipAgentId | Guid? | 船代id |
| yardId | Guid? | 场站id |
| yardEmail | string | 场站邮箱 |
| yardContact | string | 场站联系人 |
| yardTel | string | 场站电话 |
| yardMobile | string | 场站手机 |
| isPickedUp | bool | 是否提箱。场站查询返回了箱子后由系统置为 true。新增、编辑、批量编辑都不接收这个字段 |
| codeIssueTypeId | long? | 签单方式id |
| vessel | string | 船名 |
| innerVoyno | string | 航次（船公司航次） |
| terminalVoyno | string | 码头航次（港区航次） |
| carrierId | long? | 船公司id |
| noBillEnum | int? | 提单份数，1 到 10。打印字段列表里不出现（没有 Description） |
| noBillEnumStr | string | 提单份数英文。仅详情 `isPrint=true` 时有值：1 `One` … 10 `Ten`。列表和普通详情为 null |
| copyNoBillEnum | int? | 副本份数，1 到 10。打印字段列表里不出现 |
| copyNoBillEnumStr | string | 副本份数英文。仅详情 `isPrint=true` 时有值，对照关系与提单份数相同 |
| closingTime | DateTime? | 截港日期 |
| closeVgmTime | DateTime? | 截VGM |
| closeDocTime | DateTime? | 截单日期 |
| closeManifestTime | DateTime? | 截舱单日期 |
| signingTime | DateTime? | 签单日期 |
| prepareAtId | long? | 付费地点id |
| prepareAt | object \| null | 付费地点（`PortCodeSimpleDtoForOrder`） |
| signingPortId | long? | 签单地点id |
| signingPort | object \| null | 签单地点（`PortCodeSimpleDtoForOrder`） |
| podId | long? | 目的港id |
| pod | object \| null | 目的港（`PortCodeSimpleDtoForOrder`；界面航线/国家取自 `pod.lane` / `pod.country`） |
| podRemark | string | 目的港备注 |
| polId | long? | 起运港id |
| pol | object \| null | 起运港（`PortCodeSimpleDtoForOrder`） |
| polRemark | string | 起运港备注 |
| pot1Id | long? | 中转港1id |
| pot1 | object \| null | 中转港1（`PortCodeSimpleDtoForOrder`） |
| pot1Remark | string | 中转港1备注 |
| pot2Id | long? | 中转港2id |
| pot2 | object \| null | 中转港2（`PortCodeSimpleDtoForOrder`） |
| pot2Remark | string | 中转港2备注 |
| receivePortId | long? | 收货地id |
| receivePort | object \| null | 收货地（`PortCodeSimpleDtoForOrder`） |
| receivePortRemark | string | 收货地备注 |
| deliverPortId | long? | 交货地id |
| deliverPort | object \| null | 交货地（`PortCodeSimpleDtoForOrder`） |
| deliverPortRemark | string | 交货地备注 |

#### PortCodeSimpleDtoForOrder（港口业务单简易对象）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | long | 港口主键 |
| portName | string | 港口代码/英文名 |
| cnName | string | 中文名称 |
| ediCode | string | EDI 代码 |
| lane | object \| null | 航线（`LaneCodeSimpleDto`：`id`/`code`/`laneName`/`laneEnName`/`ediCode`） |
| country | object \| null | 国家（`CountryCodeSimpleDto`：`id`/`code`/`countryName`/`countryEnName`） |

#### 海运出口字段（续）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| sortId | int | 排序id |
| previousId | Guid \| null | 上一票 Id。**仅详情返回**，列表恒为 `null`。按详情入参的列表搜索条件与排序取当前票的前一条 |
| nextId | Guid \| null | 下一票 Id。**仅详情返回**，列表恒为 `null`。按详情入参的列表搜索条件与排序取当前票的后一条 |
| creatorUserNickName | string | 录入人昵称 |
| secondNotifier | object \| null | 第二通知人（`ClientSimpleDtoForOrder`：`id`/`name`/`fullName`） |
| podAgent | object \| null | 目的港代理（`ClientSimpleDtoForOrder`） |
| bookingAgent | object \| null | 订舱代理（`ClientSimpleDtoForOrder`） |
| bookingAgentContactId | long? | 订舱代理联系人id |
| bookingAgentContact | object \| null | 订舱代理联系人（`ClientContactSimpleDto`：`id`/`name`/`mobile`/`email`/`tel`/`position`/`weChat`） |
| shipAgent | object \| null | 船代（`ClientSimpleDtoForOrder`） |
| yard | object \| null | 场站（`ClientSimpleDtoForOrder`） |
| carrier | object \| null | 船公司（`CarrierSimpleDto`：`id`/`cnName`/`cnShortName`/`enName`/`code`英文简称/`ediCode`） |
| carrierLogo | object \| null | 船公司 Logo（`AttachmentItemDto`，与 `carrier` 同级） |
| codeIssueTypeName | string | 签单方式名 |
| feeStatusPay | int? | 应付费用最小状态（无则null） |
| feeStatusReceive | int? | 应收费用最小状态（无则null） |
| isYundangSubscribed | bool | 是否已订阅云当海运运单（`App_YundangOceanSubscriptions` 存在该海运出口记录即为 true） |
| isYundangSubscribeSuccess | bool | 云当海运运单是否订阅成功（订阅记录 `isSuccess=true`） |
| yundangShipmentOceanNode | object \| null | 云当运踪：最后一个有 `actualityTime` 的海运节点(`YundangShipmentOceanNodeDto`)；无数据为 null |
| isFeituoSubscribed | bool | 是否已订阅飞驼集装箱跟踪（`App_FeituoContainerSubscriptions` 存在该业务单记录即为 true） |
| isFeituoSubscribeSuccess | bool | 飞驼集装箱跟踪是否订阅成功 |
| feituoTracking | object \| null | 飞驼运踪摘要(`FeituoTrackingSimpleDto`)：当前节点、整票状态、关键时间、订舱箱量、甩柜标记、**异常预警条数与最近一条**、轨迹页链接；未订阅为 null。字段明细见《外部Api对接/飞驼/飞驼对接-集装箱跟踪-前端对接.md》第 6 节 |
| feituoTrackingDetail | object \| null | 飞驼运踪**完整数据**（含全部轨迹节点/集装箱/航段/地点/装箱单）。**仅详情返回，列表恒为 null**；结构见《飞驼对接-集装箱跟踪-前端对接.md》第 5 节 |
| feituoTrackingWarnings | array \| null | 飞驼**异常预警明细**(`FeituoTrackingWarningDto[]`，按收到时间倒序)。**仅详情返回，列表恒为 null**；无预警为空数组。只来自飞驼「增量+预警推送」，结构见《飞驼对接-集装箱跟踪-前端对接.md》第 6.3 节 |
| billOfLadings | array \| null | 该票提单列表（`SeaExportBillOfLadingSimpleDto[]`）。**仅列表返回**，详情及其它复用 `SeaExportDto` 的接口为 `null`。主单与该票全部分单各一条，没有提单时为空数组。主单在前，分单按创建时间升序，时间相同再按提单 id |

#### billOfLadings（SeaExportBillOfLadingSimpleDto）

只含提单 id 与状态。主单（分单 id 为空的那条）排在前面，分单按创建时间升序。状态取值见《提单模块接口文档》0.1 节。

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | Guid | 提单 id |
| status | int | 提单状态。0待签入 1已签入 2已驳回 3签出审核中 4可签出 5已签出 6已扣单 |

#### yundangShipmentOceanNode 字段（YundangShipmentOceanNodeDto）

| 字段名            | 类型   | 说明                                    |
| ----------------- | ------ | --------------------------------------- |
| id                | Guid   | 海运节点记录Id                          |
| stateCode         | string | 节点状态代码                            |
| stateDesc         | string | 节点描述(英文)                          |
| stateDescCN       | string | 节点描述(中文)                          |
| place             | string | 地点                                    |
| placeCd           | string | 地点代码                                |
| vesselName        | string | 船名                                    |
| voy               | string | 航次                                    |
| isCurrent         | bool?  | 是否当前节点                            |
| count             | int?   | 已完成数量                              |
| total             | int?   | 总数量                                  |
| planTime          | string | 计划时间                                |
| estimateTime      | string | 预计时间                                |
| actualityTime     | string | 实际时间                                |
| aisEstimateTime   | string | AIS预计时间                             |
| aisActualityTime  | string | AIS实际时间                             |
| number            | int?   | 节点序号(云当推送 number，用于节点排序) |
| seaExportServices | Array  | 服务项目列表                            |
| transportOrder    | object | 业务表信息（见下方）                    |

#### 业务表输出字段（TransportOrderDto）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | Guid | 主键 |
| bizType | int | 业务类型 |
| inputType | int | 录入方式（0=手动录入，1=业务联系单导入）。只读，新建固定0，不可修改 |
| seaExport | object | 对应海运出口详情。**`TransportOrderAdmin/DetailAsync`**：结构同海运出口详情，其内 `transportOrder` 置空避免循环嵌套。**`PreOrderAdmin/TransportOrderDetailAsync`**：直接调用海运出口详情方法，结构与海运出口详情完全一致（含全部字段/子表，其内 `transportOrder` 为完整业务详情）。其余场景为 `null` |
| seaImport | object | 对应海运进口详情（暂未实现，恒为 `null`）。预留字段，后续海运进口上线后按 `bizType` 填充 |
| commissionNum | string | 委托编号 |
| accountDate | DateTime | 会计期间 |
| settlementDate | DateTime | 应结日期 |
| codeSourceId | long? | 业务来源id |
| codeSourceName | string | 业务来源名 |
| isBusinessLocking | bool | 是否业务锁定 |
| isUnfinished | bool | 未完结（`true` 表示业务费用未完结；主单未完结时不可费用锁定） |
| mblNum | string | 主提单号 |
| bookingNum | string | 订舱编号 |
| contractNum | string | 合同号 |
| invoiceNum | string | 发票号。**2026-09-15 新增**，所有业务类型共用 |
| codeFrtId | long? | 付费方式id |
| codeFrtName | string | 付费方式名 |
| codeServiceId | long? | 运输条款id |
| codeServiceName | string | 运输条款名 |
| tradeTermsType | int? | 贸易条款 |
| internalRemark | string | 内部备注 |
| cargoId | int | 货物类型 |
| marks | string | 唛头 |
| pkgs | int? | 件数 |
| upperPKGS | string | 件数大写（件数+包装名） |
| codePackageId | long? | 包装id |
| codePackageName | string | 包装名 |
| kgs | decimal? | 毛重KGS，`decimal(20,4)` |
| cbm | decimal? | 体积CBM，`decimal(20,4)` |
| goodsDes | string | 货物描述 |
| clientId | Guid | 委托单位id |
| client | object \| null | 委托单位（`ClientSimpleDtoForOrder`：`id`/`name`/`fullName`/`address`/`enAddress`） |
| clientContactId | long? | 委托单位联系人id |
| clientContact | object \| null | 委托单位联系人（`ClientContactSimpleDto`：`id`/`name`/`mobile`/`email`/`tel`/`position`/`weChat`） |
| teamId | Guid? | 车队id |
| team | object \| null | 车队（`ClientSimpleDtoForOrder`） |
| custBrokerId | Guid? | 报关行id |
| custBroker | object \| null | 报关行（`ClientSimpleDtoForOrder`） |
| warehouseId | Guid? | 仓库id |
| warehouse | object \| null | 仓库（`ClientSimpleDtoForOrder`） |
| insuranceId | Guid? | 保险公司id |
| insurance | object \| null | 保险公司（`ClientSimpleDtoForOrder`） |
| consigneeId | Guid? | 收货人id |
| consignee | object \| null | 收货人（`ClientSimpleDtoForOrder`） |
| consigneeContent | string | 收货人内容 |
| shipperId | Guid? | 发货人id |
| shipper | object \| null | 发货人（`ClientSimpleDtoForOrder`） |
| shipperContent | string | 发货人内容 |
| notifierId | Guid? | 通知人id |
| notifier | object \| null | 通知人（`ClientSimpleDtoForOrder`） |
| notifierContent | string | 通知人内容 |
| goodsCompleteTime | DateTime? | 货好时间 |
| etd | DateTime? | 开船日期 |
| atd | DateTime? | 实际开船日期 |
| eta | DateTime? | 预抵日期 |
| feeLocked | bool | 是否费用锁定 |
| feeLockedUserId | long? | 费用锁定人id |
| feeLockedTime | DateTime? | 费用锁定时间 |
| feeUnLockedUserId | long? | 费用锁定解锁人id |
| feeUnLockedTime | DateTime? | 费用锁定解锁时间 |
| sortId | int | 排序id |
| remark | string | 备注 |
| totalCtn | string | 箱型箱量合计（如"20GP*2 40HC*1"） |
| teu | int | TEU |
| unsolvedQuestionCount | int | 未处理问题数量 |
| orderCodeGoodss | Array | 商品信息列表 |
| orderCtns | Array | 箱型箱量列表 |
| orderUsers | Array | 业务关联用户列表 |
| orderFees | Array | 费用列表 |

#### 子表 orderCodeGoodss（OrderCodeGoodsDto）

| 字段名           | 类型   | 说明           |
| ---------------- | ------ | -------------- |
| id               | long   | 主键           |
| transportOrderId | Guid   | 业务id         |
| codeGoodsId      | long   | 商品信息id     |
| codeGoodsName    | string | 商品信息名     |
| codeGoodsHSCode  | string | 商品信息HSCode |

#### 子表 orderCtns（OrderCtnDto）

| 字段名           | 类型     | 说明           |
| ---------------- | -------- | -------------- |
| id               | long     | 主键           |
| transportOrderId | Guid     | 业务id         |
| ctnCodeId        | long     | 箱型id         |
| ctnNo            | string   | 箱号           |
| sealNo           | string   | 封号           |
| pkgs             | int?     | 件数           |
| codePackageId    | long?    | 包装id         |
| grossWeight      | decimal? | 毛重           |
| tareWeight       | decimal? | 皮重           |
| overLength       | decimal? | 超长           |
| overWidth        | decimal? | 超宽           |
| overHeight       | decimal? | 超高           |
| volume           | decimal? | 体积           |
| codeGoodsId      | long?    | 商品信息id     |
| bookingNo        | string   | 订舱号         |
| remark           | string   | 备注           |
| ctnCodeName      | string   | 箱型名         |
| codePackageName  | string   | 包装名         |
| codeGoodsName    | string   | 商品信息名     |
| codeGoodsHSCode  | string   | 商品信息HSCode |

#### 子表 orderUsers（OrderUserDto）

| 字段名           | 类型   | 说明                          |
| ---------------- | ------ | ----------------------------- |
| id               | long   | 主键                          |
| transportOrderId | Guid   | 业务id                        |
| userId           | long   | 用户Id                        |
| userNickName     | string | 用户昵称                      |
| userAttribute    | int    | 用户属性（UserAttribute枚举） |
| sortId           | int    | 排序id                        |
| remark           | string | 备注                          |

#### 子表 orderFees（OrderFeeDto）

列表与详情的 `transportOrder.orderFees` 按 `sortId` 升序、相同再按创建时间升序。本接口没有费用级 `sorting` 入参。

| 字段名           | 类型     | 说明                           |
| ---------------- | -------- | ------------------------------ |
| id               | Guid     | 主键                           |
| transportOrderId | Guid     | 业务id                         |
| changeOrderId    | Guid?    | 更改单id                       |
| feeCodeId        | long     | 费用代码id                     |
| feeCodeName      | string   | 费用代码名                     |
| paySide          | int      | 收付方向（PaySide枚举：收/付） |
| currencyId       | long     | 币种id                         |
| currencyName     | string   | 币种名                         |
| unitPrice        | decimal  | 单价                           |
| quantity         | decimal  | 数量                           |
| amount           | decimal  | 金额                           |
| noTaxUnitPrice   | decimal  | 不含税单价                     |
| noTaxAmount      | decimal  | 不含税金额                     |
| taxRate          | decimal  | 税率                           |
| settlementId     | Guid     | 结算对象id                     |
| settlementName   | string   | 结算对象名                     |
| feeStatus        | int      | 费用状态                       |
| accountDate      | DateTime | 会计期间                       |
| invoicedAmount   | decimal  | 已开票金额                     |
| unInvoicedAmount | decimal  | 未开票金额                     |
| creatorUserId    | long?    | 创建人id                       |
| creatorUserName  | string   | 创建人名                       |
| sortId           | int      | 排序id，越小越靠前，允许相同   |

#### 子表 seaExportServices（SeaExportServiceDto）

| 字段名        | 类型    | 说明                                            |
| ------------- | ------- | ----------------------------------------------- |
| id            | long    | 主键                                            |
| seaExportId   | Guid    | 海出id                                          |
| serviceType   | int     | 服务项（ServiceType枚举）                       |
| sortId        | int     | 排序id（按输入顺序自动生成，从0开始，升序返回） |
| seServiceTask | object? | 关联的服务项任务（见下方）                      |

#### 子表 seServiceTask（SeaExportServiceTaskDto，嵌套在seaExportServices中）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | Guid | 任务id |
| serviceTaskStatus | int | 任务状态（0=待处理Pending，1=已处理Processed） |
| completionUserId | long? | 完成人id（已处理时有值） |
| completionUserName | string? | 完成人名称（已处理时有值） |
| completionTime | DateTime? | 完成时间（已处理时有值） |
| seServiceTaskUsers | Array? | 任务处理人列表（仅待处理时返回） |

#### 子表 seServiceTaskUsers（SeaExportServiceTaskUserDto）

| 字段名       | 类型   | 说明     |
| ------------ | ------ | -------- |
| userId       | long   | 用户id   |
| userNickName | string | 用户昵称 |

---

## 6. 海运出口详情 - DetailAsync

**请求方式**：`GET`

**接口路径**：`/api/services/app/SeaExportAdmin/DetailAsync`

### 请求参数（SeaExportDetailQueryDto，Query参数）

入参 = **当前票 `id`** + **与列表 `GetPagedListAsync` 完全相同的搜索条件与排序**。前端从列表点进详情、以及详情里点上一票/下一票时，应把当时列表的 Query 原样带上（再换成当前票 `id`）。上一票/下一票按这份条件筛完、再按 `sorting` 排完之后的顺序定位，**与当前在第几页无关**（`pageIndex` / `pageSize` 可带但不参与定位）。

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Guid | 是 | 当前海运出口主键 |
| isPrint | bool? | 否 | 是否为打印。`true` 时额外返回 `companyPrintInfo`、干系人拆分对象、`noBillEnumStr`、`copyNoBillEnumStr`，且不计算上一票/下一票 |
| sorting | string | 否 | 与列表相同，默认 `CreationTime DESC`。决定上一票/下一票的前后方向 |
| 其余筛选字段 | 同列表 | 否 | 与第 5 节列表入参完全一致（`keyword`/`keys`/`orgId`、海运出口字段、业务表字段、箱型字段等） |
| pageIndex / pageSize | int | 否 | 可随列表 Query 一起带上，**不影响**上一票/下一票 |

只传 `id`、不传筛选时：上一票/下一票按「当前用户可见的全部海运出口 + 默认创建时间倒序」计算。

### 请求示例

```
GET /api/services/app/SeaExportAdmin/DetailAsync?id=3fa85f64-5717-4562-b3fc-2c963f66afa6&keyword=EVER&sorting=CreationTime DESC
```

### 响应

响应结构与列表接口中 `items` 的单条数据一致（SeaExportDto），包含完整的业务表、商品信息、箱型箱量、关联用户、港口对象（`PortCodeSimpleDtoForOrder`）、往来单位对象等。`billOfLadings` 只在列表填充，详情为 `null`。详情接口额外返回：

- `previousId` / `nextId`：按入参搜索条件与排序得到的上一票、下一票 Id
- `upperPKGS`（件数大写）
- 按附件详细类型分组的附件 `attachmentGroup`
- 所属公司打印信息 `companyPrintInfo`（`isPrint=true` 时才填）
- `noBillEnumStr` / `copyNoBillEnumStr`（`isPrint=true` 时才填，1 `One` … 10 `Ten`）
- `seaExportServices`：服务项及嵌套任务，组装逻辑与独立接口 `GetServicesAsync` 相同（按 `sortId` 升序；任务走同一套 `EnrichServiceTaskInfoAsync`，待处理会带处理人）

#### previousId / nextId

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| previousId | Guid \| null | 上一票 Id。当前票是结果集第一条、或不在该搜索结果里时为 `null`。列表接口恒为 `null` |
| nextId | Guid \| null | 下一票 Id。当前票是结果集最后一条、或不在该搜索结果里时为 `null`。列表接口恒为 `null` |

口径：

- 筛选、数据权限、表级权限、排序与列表 `GetPagedListAsync` **同一套**（`BuildSeaExportFilterQuery` + 列表数据权限 + 表级权限 + `ApplySorting`）
- 走的是筛完之后的**全量顺序**，不是当前页的前后两条；从第 1 页最后一条点下一票，会得到第 2 页第一条
- 当前票因改单等原因已不满足这次带过来的搜索条件时，两条都是 `null`（前端应禁用翻票）
- 打印（`isPrint=true`）不计算这两项，保持 `null`

前端翻票：拿返回的 `previousId` 或 `nextId` 再调本接口，**搜索条件与排序保持不变**，只换 `id`。

#### companyPrintInfo（CompanyPrintInfoDto）

由详情业务的 `orgId` 向上解析到最近的公司节点（`IsCompany=true`，逻辑同 `GetCompanyOrgIdAsync`），再加载该公司名称/地址/税号/Logo/默认银行。无 `orgId` 或找不到公司时为 `null`。

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| companyDisplayName | string | 公司全称 |
| companyShortName | string | 公司简称 |
| companyEnName | string | 公司英文名 |
| companyAddress | string | 公司办公地址 |
| companyContactPhone | string | 公司联系电话 |
| companyEmail | string | 公司邮箱 |
| unifiedSocialCreditCode | string | 统一社会信用代码/税号 |
| logo | string | 公司 Logo 直连 Url；相对路径前会拼 `appsettings.json` 的 `GlobalServer:BaseUrl`，已是 `http(s)://` 则原样返回；无附件为 `null` |
| defaultBanks | array | 该公司全部默认银行账户 |
| defaultBanks[].currencyCode | string | 币种代码 |
| defaultBanks[].accountName | string | 账户名称 |
| defaultBanks[].bankShortName | string | 开户银行简称 |
| defaultBanks[].bankName | string | 开户银行全称 |
| defaultBanks[].bankAccount | string | 银行账号 |
| rmbBank | object/null | 默认 RMB 银行（从 defaultBanks 取 currencyCode=RMB） |
| usdBank | object/null | 默认 USD 银行（从 defaultBanks 取 currencyCode=USD） |

#### 分组附件 attachmentGroup 响应字段（AttachmentGroupDto）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| attachmentDtlTypeId | number/null | 附件详细类型Id（分组依据） |
| attachmentDtlType | object/null | 附件详细类型信息（id、name、sortId） |
| items | array | 该类型下的附件集合 |
| items[].id | number | 附件关联记录Id |
| items[].attachmentId | number | 附件Id |
| items[].attachmentDtlTypeId | number/null | 附件详细类型Id |
| items[].clientVisible | boolean | 客户是否可见 |
| items[].displayOrder | number | 显示顺序 |
| items[].url | string | 文件下载Url |
| items[].friendlyFileName | string | 文件显示名称 |
| items[].fileLength | number | 文件大小 |
| items[].creationTime | string | 上传时间 |
| items[].creatorUserName | string | 上传人昵称 |

> 分组按 `attachmentDtlType.sortId` 升序排列，组内附件按 `displayOrder` 升序排列。`attachmentDtlTypeId` 为空时单独成组。

```json
{
  "result": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "nextId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "blType": 0,
    "billType": 0,
    "vessel": "EVER GIVEN",
    "innerVoyno": "V001",
    "terminalVoyno": "1173069E",
    "attachmentGroup": [
      {
        "attachmentDtlTypeId": 1,
        "attachmentDtlType": { "id": 1, "name": "提单", "sortId": 1 },
        "items": [
          {
            "id": 100,
            "attachmentId": 12345,
            "attachmentDtlTypeId": 1,
            "clientVisible": true,
            "displayOrder": 0,
            "url": "https://xxx.com/file.pdf",
            "friendlyFileName": "提单.pdf",
            "creatorUserName": "张三"
          }
        ]
      }
    ],
    "transportOrder": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "commissionNum": "SE202605001",
      "mblNum": "MBLTEST001",
      "etd": "2026-05-25T00:00:00",
      "atd": "2026-05-25T08:30:00",
      "eta": "2026-06-10T00:00:00",
      "upperPKGS": "ONE HUNDREDCARTONS",
      "...": "（其余字段同列表接口）"
    },
    "...": "（其余字段同列表接口）"
  },
  "success": true,
  "error": null
}
```

---

## 6.1 获取服务项与任务 - GetServicesAsync

**请求方式**：`GET`

**接口路径**：`/api/services/app/SeaExportAdmin/GetServicesAsync`

**权限**：`Admin.SeaExport.Get`

只查某一票已经落到库里的服务项（`App_SeaExportServices`）及其对应的服务项任务，**不返回**起运港配置里「可以勾哪些服务项」。起运港配置走 `GetServiceTypesByPOLAsync`。

返回值与详情 `seaExportServices` **同一套组装**：按 `sortId` 升序；任务按服务项类型匹配 `SeServiceConfigItem.ServiceType`，再填 `seServiceTask`。列表接口虽然也带 `seaExportServices`，但列表里待处理任务**不返回** `seServiceTaskUsers`，本接口与详情一致会返回。

入参只传当前票 `id`。先过「查看」口径的行级数据权限和表级权限（与详情相同），再取服务项；不是只校验记录是否存在。

### 请求参数（GuidIdDto，Query参数）

| 字段名 | 类型 | 必填 | 说明                                    |
| ------ | ---- | ---- | --------------------------------------- |
| id     | Guid | 是   | 海运出口主键（与业务主表共用同一个 Id） |

### 请求示例

```
GET /api/services/app/SeaExportAdmin/GetServicesAsync?id=3fa85f64-5717-4562-b3fc-2c963f66afa6
```

### 响应

`List<SeaExportServiceDto>`。没有服务项时返回空数组。某一项还没有生成任务时，该项的 `seServiceTask` 为 `null`。

#### 行级字段（SeaExportServiceDto）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | long | 服务项记录主键 |
| seaExportId | Guid | 海出 id |
| serviceType | int | 服务项（ServiceType 枚举） |
| sortId | int | 优先级，取服务项配置 `SeServiceConfigItem.SortId`，相同值代表同优先级；按升序返回 |
| seServiceTask | object? | 关联的服务项任务。按 `serviceType` 匹配到任务才有值，见下方 |

#### 嵌套 seServiceTask（SeaExportServiceTaskDto）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | Guid | 任务 id |
| serviceTaskStatus | int | 任务状态（0=待处理 Pending，1=已处理 Processed） |
| completionUserId | long? | 完成人 id（已处理时有值） |
| completionUserNickName | string? | 完成人昵称（已处理时有值） |
| completionTime | DateTime? | 完成时间（已处理时有值） |
| seServiceTaskUsers | Array? | 任务处理人列表，**仅待处理时返回**；已处理为 `null` |

待处理时处理人怎么填：

- 已转交（`AssigneeUserId` 有值）：列表里只有被转交人
- 未转交：按任务关联用户 `SeServiceTaskUsers` 原样返回

#### 嵌套 seServiceTaskUsers（SeaExportServiceTaskUserDto，仅待处理时有值）

| 字段名       | 类型   | 说明     |
| ------------ | ------ | -------- |
| userId       | long   | 用户 id  |
| userNickName | string | 用户昵称 |

```json
{
  "result": [
    {
      "id": 1,
      "seaExportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "serviceType": 1,
      "sortId": 0,
      "seServiceTask": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "serviceTaskStatus": 0,
        "completionUserId": null,
        "completionUserNickName": null,
        "completionTime": null,
        "seServiceTaskUsers": [{ "userId": 1, "userNickName": "张三" }]
      }
    }
  ],
  "success": true
}
```

---

## 7. 获取海运出口附件 - GetAttachmentsAsync

**请求方式**：`GET`

**接口路径**：`/api/services/app/SeaExportAdmin/GetAttachments`

**权限**：`Admin.SeaExport.Get`

### 请求参数（Query参数）

| 字段名 | 类型 | 必填 | 说明         |
| ------ | ---- | ---- | ------------ |
| id     | Guid | 是   | 海运出口主键 |

### 请求示例

```
GET /api/services/app/SeaExportAdmin/GetAttachments?id=3fa85f64-5717-4562-b3fc-2c963f66afa6
```

### 响应

按 `attachmentDtlTypeId` 分组返回，结构与详情接口 `attachmentGroup` 一致（`List<AttachmentGroupDto>`）。

```json
{
  "result": [
    {
      "attachmentDtlTypeId": 1,
      "attachmentDtlType": { "id": 1, "name": "提单", "sortId": 1 },
      "items": [
        {
          "id": 100,
          "attachmentId": 12345,
          "attachmentDtlTypeId": 1,
          "clientVisible": true,
          "displayOrder": 0,
          "url": "https://xxx.com/file.pdf",
          "friendlyFileName": "提单.pdf",
          "creatorUserName": "张三"
        }
      ]
    }
  ],
  "success": true
}
```

---

## 8. 添加海运出口附件 - AddAttachmentsAsync

**请求方式**：`POST`

**接口路径**：`/api/services/app/SeaExportAdmin/AddAttachments`

**权限**：`Admin.SeaExport.Edit`

**Content-Type**：`application/json`

### 请求体（SeaExportAttachmentsAddDto）

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Guid | 是 | 海运出口主键 |
| attachments | array | 是 | 附件集合（不分组） |
| attachments[].attachmentId | number | 是 | 附件Id（先通过上传接口获取） |
| attachments[].attachmentDtlTypeId | number/null | 否 | 附件详细类型Id |
| attachments[].clientVisible | boolean | 否 | 客户是否可见 |
| attachments[].displayOrder | number | 否 | 显示顺序 |

### 请求示例

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "attachments": [
    {
      "attachmentId": 12345,
      "attachmentDtlTypeId": 1,
      "clientVisible": true,
      "displayOrder": 0
    },
    {
      "attachmentId": 12346,
      "attachmentDtlTypeId": 2,
      "clientVisible": false,
      "displayOrder": 1
    }
  ]
}
```

### 响应

```json
{
  "result": true,
  "success": true
}
```

---

## 9. 删除海运出口附件 - DeleteAttachmentsAsync

**请求方式**：`DELETE`

**接口路径**：`/api/services/app/SeaExportAdmin/DeleteAttachments`

**权限**：`Admin.SeaExport.Edit`

**Content-Type**：`application/json`

### 请求体（SeaExportAttachmentsDeleteDto）

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Guid | 是 | 海运出口主键 |
| attachmentIds | number[] | 是 | 附件Id集合（`Attachment.Id`，非关联记录Id） |

> 仅删除**当前海运出口**下的附件关联，不影响其他模块对同一附件的引用。

### 请求示例

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "attachmentIds": [12345, 12346]
}
```

### 响应

```json
{
  "result": true,
  "success": true
}
```

---

## 10. 根据起运港获取服务项目 - GetServiceTypesByPOLAsync

**请求方式**：`GET`

**接口路径**：`/api/services/app/SeaExportAdmin/GetServiceTypesByPOL`

**权限**：`Admin.SeaExport.Edit`

### 请求参数（Query参数）

| 字段名   | 类型  | 必填   | 说明                                         |
| -------- | ----- | ------ | -------------------------------------------- |
| polId    | long  | **是** | 起运港id（必填，为空时报错"起运港不能为空"） |
| clientId | Guid? | 否     | 委托单位id（用于排除客户排除的服务项）       |

### 请求示例

```
GET /api/services/app/SeaExportAdmin/GetServiceTypesByPOL?polId=1&clientId=3fa85f64-5717-4562-b3fc-2c963f66afa6
```

### 响应

返回该起运港配置的所有服务项目列表，按 `sortId` 升序排列。优先查找该港口的专属配置，若不存在则回退使用默认港口配置（`POLId`为空的配置）。若两者都不存在，报错"未找到该起运港对应的服务项配置,请配置该港口或配置默认港口服务项"。

```json
{
  "result": [
    {
      "serviceType": 1,
      "sortId": 0,
      "checked": true,
      "userAttribute": 3,
      "seServiceShows": [
        { "seaExportPropEnum": 1, "requireValues": null },
        { "seaExportPropEnum": 2, "requireValues": null }
      ],
      "seServiceLocks": [{ "seaExportPropEnum": 1, "requireValues": null }],
      "seServiceRequires": [
        { "seaExportPropEnum": 2, "requireValues": null },
        { "seaExportPropEnum": 10001, "requireValues": "1|2" }
      ]
    },
    {
      "serviceType": 2,
      "sortId": 1,
      "checked": false,
      "userAttribute": 1,
      "seServiceShows": [],
      "seServiceLocks": [],
      "seServiceRequires": []
    }
  ],
  "success": true,
  "error": null
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| serviceType | int | 服务项（ServiceType枚举值） |
| sortId | int | 排序id |
| checked | bool | 是否勾选（true=该客户未排除此服务项，false=已排除）。排除项按**命中的那份配置**取：起运港有单独配置时取该起运港的排除项，落到默认配置时取合作客户里针对默认配置（起运港为空）设置的排除项。2026-10-02 修正，之前一律按入参起运港取，针对默认配置设置的排除项永远不生效 |
| userAttribute | long | 该服务项所需的用户属性（UserAttribute flags枚举值，可组合：1=操作,2=客服,4=单证,8=商务,16=销售,32=财务,64=海外客服,128=人事） |
| seServiceShows | object[] | 展示字段列表 |
| seServiceLocks | object[] | 完成后不允许修改字段列表 |
| seServiceRequires | object[] | 完成时必填项列表（含附件类型等扩展类型） |
| ├── seaExportPropEnum | int | 海运出口字段枚举；`10001`=附件类型（仅 `seServiceRequires` 会出现） |
| └── requireValues | string | 扩展类型的具体值，多个用 `\|` 分隔。`seaExportPropEnum=10001` 时为附件类型id，如 `"1\|2"`；普通字段为 `null` |

> **附件类型必填：** `seServiceRequires` 中 `seaExportPropEnum=10001` 的项表示完成该服务项前必须上传 `requireValues` 中列出的附件类型，否则完成时报错"完成任务需要上传以下附件: xx、xx"。

---

## 11. 根据船名航次开船日期获取日期 - GetDatesAsync

**请求方式**：`GET`

**接口路径**：`/api/services/app/SeaExportAdmin/GetDates`

**权限**：`Admin.SeaExport.Get`

### 请求参数（Query参数）

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| vessel | string | **是** | 船名（为空时报错"船名不能为空"；后端会规范化空字符串为 null） |
| innerVoyno | string | **是** | 航次（为空时报错"航次不能为空"） |
| etd | DateTime | **是** | 开船日期（为空时报错"开船日期不能为空"） |

### 请求示例

```
GET /api/services/app/SeaExportAdmin/GetDates?vessel=EVER%20GIVEN&innerVoyno=001W&etd=2026-07-15T00:00:00
```

### 业务逻辑

1. 输入 `etd` **只取日期部分**，与历史数据中 `TransportOrder.ETD` 的**日期部分**匹配
2. 同时匹配 `SeaExport.Vessel`、`SeaExport.InnerVoyno`
3. 排除五个日期字段**同时为 null** 的记录（不参与分组）
4. 分组规则：
   - `ATD`、`ETA`：只按**日期（天）**分组与返回
   - `CloseVgmTime`、`CloseDocTime`、`CloseManifestTime`：按**分钟**分组与返回（秒归零）
5. 返回**出现次数最多**的一组；若无有效数据，五个字段均为 `null`

> **新建/编辑保存规则：** `ETD`/`ATD`/`ETA` 只保留日期；截单类三个字段精确到分钟（秒归零）。

### 响应（SeaExportDatesDto）

```json
{
  "result": {
    "atd": "2026-07-16T00:00:00",
    "eta": "2026-08-01T00:00:00",
    "closeVgmTime": "2026-07-14T12:30:00",
    "closeDocTime": "2026-07-14T18:15:00",
    "closeManifestTime": "2026-07-14T16:45:00"
  },
  "success": true,
  "error": null
}
```

无匹配数据时：

```json
{
  "result": {
    "atd": null,
    "eta": null,
    "closeVgmTime": null,
    "closeDocTime": null,
    "closeManifestTime": null
  },
  "success": true,
  "error": null
}
```

#### 响应字段说明

| 字段名            | 类型      | 说明                                      |
| ----------------- | --------- | ----------------------------------------- |
| atd               | DateTime? | 实际开船日期（仅日期，时分秒为 00:00:00） |
| eta               | DateTime? | 预计到港日期（仅日期，时分秒为 00:00:00） |
| closeVgmTime      | DateTime? | 截VGM（精确到**分钟**，秒为 00）          |
| closeDocTime      | DateTime? | 截单日期（精确到**分钟**，秒为 00）       |
| closeManifestTime | DateTime? | 截舱单日期（精确到**分钟**，秒为 00）     |

---

## 12. 海运出口分组统计 - GetGroupedListAsync

**接口地址：** `GET /api/services/app/SeaExportAdmin/GetGroupedListAsync`

**权限：** `Admin.SeaExport.Get`

**说明：** 查询条件与列表接口 `GetPagedListAsync` **完全一致**（复用同一套筛选与数据权限），并额外指定一个 `groupField` 分组字段。接口先用查询条件筛出全部数据，再按指定字段分组，返回每个分组的 id、名称及数据总条数。结果按 `count` 倒序排列。

### 请求参数（SeaExportGroupQueryDto，Query参数）

继承自 `SeaExportQueryDto`（即列表接口的全部查询参数），在此基础上新增：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| groupField | int(SeaExportGroupField) | 是 | 分组字段：1=装运方式，2=订单类型，3=委托单位，4=船公司，5=起运港，6=目的港，7=船名，8=付费方式，9=签单方式，10=场站，19=销售，20=操作 |

> 其余查询参数（Keyword、Keys、OrgId、CarrierId、POLId、PODId、ClientId、各类日期区间等）与列表接口一致，用于在分组前筛选数据。分页参数（PageIndex/PageSize/Sorting）对本接口无效（不分页，返回全部分组）。

**可空字段「未填写」筛选（与分组统计联动）：** 船公司（groupField=4）、起运港（5）、目的港（6）、船名（7）、付费方式（8）、签单方式（9）、场站（10）、销售（19）、操作（20）在分组结果中可能出现 `id`/`name` 均为 null 的「未填写」分组。前端点击该分组后，列表接口应传对应 `*Empty=true`（如 `vesselEmpty=true`、`yardIdEmpty=true`、`saleIdEmpty=true`、`operationIdEmpty=true`），`totalCount` 将与分组中该分组的 `count` 一致。`*Empty` 与同名筛选参数不可同时传入。销售新建时必填，未填写分组通常不会出现；操作可以不挂，未填写分组会有。

### 请求示例

```
GET /api/services/app/SeaExportAdmin/GetGroupedListAsync?groupField=1&ETDStart=2026-06-01&ETDEnd=2026-06-30
```

（按装运方式分组，统计 6 月开船的各装运方式数据条数）

```
GET /api/services/app/SeaExportAdmin/GetGroupedListAsync?groupField=19&ETDStart=2026-06-01&ETDEnd=2026-06-30
```

（按销售分组，`id` 为用户 id，点某组下钻列表传 `saleId`）

### 响应（List\<SeaExportGroupDto\>）

```json
{
  "result": [
    {
      "id": "0",
      "name": "整箱",
      "count": 128,
      "logo": null
    },
    {
      "id": "1",
      "name": "拼箱",
      "count": 35,
      "logo": null
    }
  ],
  "success": true,
  "error": null
}
```

按船公司分组时，`name` 为中文简称，`logo` 有值：

```json
{
  "result": [
    {
      "id": "12",
      "name": "马士基",
      "count": 56,
      "logo": {
        "id": 1001,
        "attachmentId": 12345,
        "itemId": "12",
        "moduleTypeId": "160010",
        "url": "https://xxx.com/carrier-logo.png",
        "friendlyFileName": "MSK.png"
      }
    }
  ],
  "success": true,
  "error": null
}
```

### 响应字段说明（SeaExportGroupDto）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 分组值 id。枚举类（装运方式/订单类型）为枚举数值字符串；委托单位、场站为 Guid 字符串；船名为名称本身；船公司/起运港/目的港/付费方式/签单方式为 long 类型 id 字符串；销售/操作为用户 id 字符串；该字段无值时为 `null` |
| name | string | 分组名称。装运方式/订单类型为枚举描述；委托单位为单位名称；船公司为中文简称（CnShortName）；起运港/目的港为港口名称；船名为名称本身；付费方式为中文名；签单方式为签单方式名称；场站为场站名称；销售/操作为用户昵称（NickName）；无值时为 `null` |
| count | int | 该分组下的数据总条数 |
| logo | object \| null | 船公司 logo（AttachmentItemDto）。**仅 groupField=4（船公司）时有值**，其余分组为 `null` |

### 各分组字段对应来源

| groupField | 含义 | 分组依据 | id 来源 | name 来源 |
| --- | --- | --- | --- | --- |
| 1 | 装运方式 | `SeaExport.BLType` | 枚举值 | 枚举描述 |
| 2 | 订单类型 | `SeaExport.BillType` | 枚举值 | 枚举描述 |
| 3 | 委托单位 | `TransportOrder.ClientId` | Client.Id | Client.Name |
| 4 | 船公司 | `SeaExport.CarrierId` | Carrier.Id | Carrier.CnShortName；额外返回 `logo`（模块 `160010` 船公司 logo） |
| 5 | 起运港 | `SeaExport.POLId` | PortCode.Id | PortCode.PortName |
| 6 | 目的港 | `SeaExport.PODId` | PortCode.Id | PortCode.PortName |
| 7 | 船名 | `SeaExport.Vessel` | 船名字符串 | 船名字符串 |
| 8 | 付费方式 | `TransportOrder.CodeFrtId` | CodeFrt.Id | CodeFrt.CnName |
| 9 | 签单方式 | `SeaExport.CodeIssueTypeId` | CodeIssueType.Id | CodeIssueType.BillType |
| 10 | 场站 | `SeaExport.YardId` | Client.Id | Client.Name |
| 19 | 销售 | `TransportOrder.OrderUsers` 中 `UserAttribute=Sale` 的用户 | User.Id | User.NickName |
| 20 | 操作 | `TransportOrder.OrderUsers` 中 `UserAttribute=Operation` 的用户 | User.Id | User.NickName |

销售保存时有且只能有一个；操作允许不挂、也允许多人。同一属性挂了多人时，**每个人的分组都计入这一票**（同一人在一票里重复挂只计一次），因此销售/操作各组 `count` 之和可能大于列表 `totalCount`。点某人下钻与列表 `saleId` / `operationId`（`.Any` 命中即可）一致；未填写传 `saleIdEmpty=true` / `operationIdEmpty=true`。

---

## 错误响应格式

所有接口在发生错误时返回统一格式：

```json
{
  "result": null,
  "success": false,
  "error": {
    "code": 0,
    "message": "错误描述信息",
    "details": null
  }
}
```

常见错误信息：

| 错误信息 | 说明 |
| --- | --- |
| 输入信息不能为空 | 请求体为null |
| 业务信息不能为空 | transportOrder为null |
| 业务关联人员不能为空 | orderUsers为空 |
| 销售有且只能有一个 | orderUsers中UserAttribute为Sale的数量不等于1 |
| 销售不能为空 | 销售存在但 userId<=0 |
| 所属组织不能为空 | 新建/编辑未传 orgId |
| 所选组织不在数据所属人(本人)所属组织范围内 | orgId 不是当票销售的直属组织 |
| 起运港不能为空 | polId为空 |
| 委托单位不存在 | clientId对应的记录不存在 |
| 服务项目包含未配置的项 | serviceTypes中包含该起运港未配置的服务项(不再校验委托单位排除项) |
| 服务项{serviceType}顺序未配置 | 服务项在起运港配置中缺少 SortId(优先级)，理论上不会出现(兜底防御) |
| 未找到对应用户属性的处理人，不允许新建 | 首个服务项配置的UserAttribute与订单用户的UserAttribute无匹配 |
| 委托编号长度不能超过32个字符 | 字段超长 |
| 合同号长度不能超过64个字符 | 字段超长 |
| 发票号长度不能超过64个字符 | 字段超长 |
| 航次长度不能超过64个字符 | 字段超长 |
| 码头航次长度不能超过64个字符 | 字段超长 |
| 输入海运出口错误 | 编辑/详情/附件/`GetServicesAsync` 时 id 不存在 |
| 没有这条数据的数据权限,不能查看 | 详情/`GetServicesAsync` 时数据存在但当前用户没有查看口径的数据权限 |
| 没有这条数据的表级权限,不能查看 | 详情/`GetServicesAsync` 时被表级权限挡住 |
| 附件Id集合不能为空 | DeleteAttachmentsAsync 未传 attachmentIds |
| 未找到该起运港对应的服务项配置,请配置该港口或配置默认港口服务项 | GetServiceTypesByPOLAsync 未找到该港口专属配置且无默认配置 |
| 该起运港未配置服务项目，不允许输入服务项 | 新建/编辑时起运港无专属配置且无默认配置，但传入了服务项 |
| 船名不能为空 | GetDatesAsync 未传 vessel 或规范化后为空 |
| 航次不能为空 | GetDatesAsync 未传 innerVoyno |
| 开船日期不能为空 | GetDatesAsync 未传 etd |

---

## 业务(TransportOrder)详情与业务联系单互查接口

> 以下接口挂在业务接口 `TransportOrderAdmin` 下，用于业务(TransportOrder)与业务联系单(PreOrder)互查。

### 查询业务联系单详情 - `TransportOrderAdmin/PreOrderDetailAsync`

- **地址**：`GET /api/services/app/TransportOrderAdmin/PreOrderDetailAsync`
- **权限**：`Admin.TransportOrder.Get`
- **说明**：在业务接口中查询业务联系单详情，**返回结构与业务联系单详情(`PreOrderAdmin/DetailAsync`)完全相同**（`TransportOrderAdminAppService` 构造函数注入 `IPreOrderAdminAppService` 直接委托 `PreOrderAdmin.DetailAsync`）。
- **入参**：`id`（`Guid`，业务联系单id）
- **出参**：`PreOrderDto`（同业务联系单详情，含各子表）。
- **完整入参/出参说明详见**：《业务联系单接口文档》第八节。

---

## 修改记录

| 日期 | 修改内容 |
| --- | --- | --- |
| 2026-10-02 | Bug 修复：`GetServiceTypesByPOLAsync` 的委托单位排除项改为按命中的那份配置取（落到默认配置时取针对默认配置设置的排除项），之前针对默认配置设置的排除项永远不生效。出入参不变 |
| 2026-10-01 | 列表票根不再返回 `userId`、`orgId`、`creatorUserId`、`lastModifierUserId`、`isDeleted`、`deleterUserId`、`deletionTime`、`localCurrencyId`。`orgs` 每级只留 `name`。仍返回 `creationTime`、`lastModificationTime`、`localCurrencyCode` |
| 2026-10-01 | 列表 `GetPagedListAsync` 出参改为 `SeaExportListDto`，只留列表列。详情仍是 `SeaExportDto`。不再返回费用明细、箱子明细、品名、提单摘要。新增 `transportOrder.hasOrderFee`。箱量文本和 TEU 仍返回。路径：`/api/services/app/SeaExportAdmin/GetPagedListAsync` |
| 2026-09-28 | 海运出口新增 **`isPickedUp` 是否提箱** | （bool，默认 false）。列表和详情返回。新增、编辑、批量编辑不接收，复制出的新票为 false。只有荣E通场站查询 `RongETongAdmin/RealQueryAsync` 在对方返回了箱子并完成回写时把它改为 true。 |
| 2026-09-26 | 列表 `GetPagedListAsync` 每条新增 `billOfLadings`：该票主单与全部分单的提单，只含 `id` 与 `status`。主单在前，分单按创建时间升序。没有提单时为空数组。详情及其它复用 `SeaExportDto` 的接口该字段为 `null`。路径：`/api/services/app/SeaExportAdmin/GetPagedListAsync` |
| 2026-09-20 | **新增 `GetServicesAsync`**（`GET`，权限 `Admin.SeaExport.Get`，见第 6.1 节）。入参只传海运出口 `id`，返回该票服务项及嵌套任务，结构与详情 `seaExportServices` 一致（按 `sortId` 升序，任务走同一套 `EnrichServiceTaskInfoAsync`）。先过查看口径的数据权限与表级权限，与详情相同；路径必须带 `Async`：`/api/services/app/SeaExportAdmin/GetServicesAsync`。 |
| 2026-09-20 | 详情 `DetailAsync` 入参由只传 `id` 改为 `SeaExportDetailQueryDto`（`id` + 与列表完全相同的搜索条件/排序）。出参新增 `previousId` / `nextId`：按该条件筛完再按 `sorting` 排完后的全量顺序取上一票/下一票 Id，忽略分页；当前票不在结果集内或已到头/到尾时为 `null`。只传 `id` 时按可见全量 + 默认创建时间倒序计算。打印（`isPrint=true`）不计算这两项。路径必须带 `Async`：`/api/services/app/SeaExportAdmin/DetailAsync`。 |
| 2026-09-18 | 列表与详情嵌套 `transportOrder.orderFees` 按费用 `sortId` 升序、相同再按创建时间升序。费用表新增 `sortId`。业务费用分页列表仍走前端 `sorting`，本模块没有费用级排序入参。 |
| 2026-09-18 | 分组统计 `GetGroupedListAsync` 新增 `groupField=19`（销售）、`groupField=20`（操作）：按业务干系人表对应用户分组，`id` 为用户 id，`name` 为昵称。一票同一属性挂多人时每个人的分组都计入这一票（同一人重复挂只计一次），各组 `count` 之和可能大于列表总条数；没挂该属性的进未填写分组。列表同步新增 `saleIdEmpty` / `operationIdEmpty`（与 `saleId` / `operationId` 互斥）。 |
| 2026-09-16 | 批量编辑 `BatchEditAsync` 新增 6 个港口备注字段 `receivePortRemark` / `polRemark` / `pot1Remark` / `pot2Remark` / `podRemark` / `deliverPortRemark`（各上限 128 字符）。**备注跟着港口 id 走**：只有同时传了对应港口 id 才写入，只传备注不生效、也不计入「至少输入一个要修改的字段」；传了港口 id 没带备注时后端按港口资料生成 `PortName, CountryEnName`（逗号后带空格，与识别类接口同一套格式）；港口 id 被锁定时 id 与备注一起跳过。**修复原先批量改港后列表仍显示旧备注**的问题。 |
| 2026-09-15 | **新增批量编辑接口 `BatchEditAsync`**（`PUT`，权限 `Admin.SeaExport.Edit`，见第 4.1 节）。入参除 `ids` 外全部可空，只改传了值的字段；可批量改委托单位、船公司、船名、航次、船代、订舱代理、车队、保险公司、仓库、场站、签单方式、付款方式、付款地点、运输条款、贸易条款、业务来源、收货地、起运港、中转港1/2、目的港、交货地、所属组织，日期类（开船日期、实际开船日期、预抵日期、货好时间、截港日期、截单日期、截舱单日期、截VGM、签单日期），以及操作/单证/客服/销售/航线五类关联人员。日期 `null` 表示不修改，因此本接口只能改成某个日期、不能清空。**改开船日期会重算会计期间并连带刷原票费用的会计期间**（只在真的传了且与原值不同时才动，不会照 ETD 反推没传的票）。关联人员是**按用户属性单独换人**（原来有就改、没有就加、多条只留一条），不清空重建，其它属性的人不动。`ids` 先过「编辑」口径数据权限与表级权限，没权限的票被过滤掉，**返回值是实际修改的票数（int）**。被已完成任务锁定的字段逐票跳过；起运港真的变了则按 `EditAsync` 同一口径重建服务项与任务；换委托单位会清委托单位联系人并重算应结日期。 |
| 2026-09-15 | 修正文档笔误：编辑接口路径由 `/api/services/app/SeaExportAdmin/Edit` 更正为 `/api/services/app/SeaExportAdmin/EditAsync`（ABP 动态 API 不剥 `Async` 后缀，原写法会 404）。 |
| 2026-09-15 | **业务主表新增发票号 `transportOrder.invoiceNum`**（上限 64，可空，一票一号）。新增/编辑走该字段；列表/分组查询增加独立 `invoiceNum` 模糊筛选；`keyword` 与 `keys` 覆盖字段同步加上发票号；复制时与主提单号/订舱编号/合同号一并清空。海运进口原扩展表字段已迁到同一列。 |
| 2026-09-15 | 新建/保存主提单号在当前租户业务表内不可重复（海运出口/海运进口/空运出口互相也不能撞号），冲突报「主提单号【{号码}】已存在」。空值不校验；去首尾空格、忽略大小写；编辑排除自身（锁定字段回填之后再查）。 |
| 2026-09-03 | 列表/分组查询新增 `keys`（`List<string>`）：与 `keyword` 覆盖同一批字段（船名、航次、备注、主提单号、订舱编号、合同号、委托编号），但是**精确匹配**、列表内任意一条命中即可。详见《海运出口-列表Keys精确搜索-2026-09-03.md》 |
| 2026-09-01 | `companyPrintInfo.logo` 相对路径前拼接 `appsettings.json` 的 `GlobalServer:BaseUrl`（已是 `http(s)://` 则不拼），打印可直连。详见《组织机构-打印Logo拼GlobalServer基址-2026-09-01.md》 |
| 2026-09-01 | 新增字段 **`terminalVoyno` 码头航次**（港区航次，上限64字符），原有 `innerVoyno` 明确为**船公司航次**，两者是两套不同编号。新增/编辑可录入、列表与详情返回、列表查询支持 `terminalVoyno` 模糊筛选、批量修改支持（`SeaExportPropEnum.TerminalVoyno = 19`）。**查码头船舶计划用的是码头航次**，接口 `FeituoAdmin/QueryTerminalScheduleAsync` 会优先取它；为空且船公司航次有值时后端自动换算一次。关键字 `keyword` 的模糊范围**未**包含码头航次。详见《海运出口-码头航次-2026-09-01.md》 |
| 2026-08-19 | **破坏性变更**：`GetServiceTypesByPOLAsync` 的 `seServiceShows`/`seServiceLocks`/`seServiceRequires` 由 `int[]` 改为对象数组（`seaExportPropEnum` + `requireValues`）。`seServiceRequires` 中 `seaExportPropEnum=10001` 表示完成时必填附件类型，`requireValues` 为 `\|` 分隔的附件类型id |
| 2026-08-08 | 列表/详情新增**飞驼异常预警**：`feituoTracking` 内新增 `hasWarning`(是否有预警，建议列表打红点)、`warningCount`(累计条数)、`latestWarningCategory`/`latestWarningCode`/`latestWarningTime`/`latestWarningDescription`(最近一条)；**详情**额外返回 `feituoTrackingWarnings`(全部预警明细，按收到时间倒序，列表恒为 null)。预警只来自飞驼「集装箱综合跟踪(增量+预警推送)」，订阅/查询接口不返回，需飞驼客服配置回调地址后才有数据。字段明细见《外部Api对接/飞驼/飞驼对接-集装箱跟踪-前端对接.md》第 6.3 节 |
| 2026-08-08 | 列表/详情新增**飞驼集装箱跟踪运踪**：`isFeituoSubscribed`、`isFeituoSubscribeSuccess`、`feituoTracking`(运踪摘要：当前节点中文描述/发生时间/发生地、整票数据状态、起运ETD-ATD、目的STA-ETA-ATA、头程船名航次、订舱状态与箱量汇总、甩柜标记、飞驼可视化轨迹页链接)；**详情**额外返回 `feituoTrackingDetail`(完整跟踪数据，含全部轨迹节点/集装箱/航段/地点/装箱单，列表恒为 null)。字段明细见《外部Api对接/飞驼/飞驼对接-集装箱跟踪-前端对接.md》第 5、6 节；订阅接口为 `FeituoAdmin/SubscribeContainerAsync`(`bizType=0` 表示海运出口) |
| 2026-08-06 | **破坏性**：`SeaExportDto` 全部港口由平铺 `*Name`/`*EdiCode`/`countryName`/`laneName` 改为 `PortCodeSimpleDtoForOrder` 对象（`pol`/`pod`/`signingPort`/`prepareAt`/`pot1`/`pot2`/`receivePort`/`deliverPort`）；航线/国家挂在港口对象下，海出界面取自目的港。详见《海运出口-港口对象化-前端对接文档-2026-08-06》 |
| 2026-07-24 | **破坏性**：`SeaExportDto` 往来单位由 `*Name` 改为 `ClientSimpleDtoForOrder` 对象；船公司由 `carrierName`/`carrierCnShortName`/`carrierCode` 改为 `carrier`（`CarrierSimpleDto`，含中英文名称/简称与 EDI）；`TransportOrderDto` 委托单位等往来单位同样对象化。详见《海运出口-往来单位与船公司对象化-前端对接文档-2026-07-24》 |
| 2026-07-23 | 详情 `DetailAsync` 新增 `companyPrintInfo`：按业务 `orgId` 解析所属公司后返回公司打印信息（名称/地址/税号/Logo/默认银行，结构同 `CompanyPrintInfoDto`） |
| 2026-07-14 | 业务详情 `TransportOrderAdmin/DetailAsync` 新增 `seaExport`（结构同海运出口详情，其内 transportOrder 置空避免循环嵌套）；新增业务↔业务联系单互查接口 `TransportOrderAdmin/PreOrderDetailAsync`(文档见《业务联系单接口文档》第八节)、`PreOrderAdmin/TransportOrderDetailAsync`，返回结构分别与对方详情完全一致 |
| 2026-07-12 | 列表/分组数据权限改为海运出口专用规则：可见用户 id 命中 UserId、CreatorUserId、业务关联人员(销售/商务/操作/客服/单证/海外客服)或服务项任务转交人(SeServiceTask.AssigneeUserId)任意一项即可见；不再仅按 UserId 过滤 |
| 2026-07-12 | 列表 GetPagedListAsync 新增场站未填写筛选 `yardIdEmpty`（与 `yardId` 互斥）；分组统计 GetGroupedListAsync 新增 groupField=10（场站）；按船公司分组时 `name` 改为 CnShortName，并额外返回 `logo`（船公司附件） |
| 2026-07-12 | GetAttachmentsAsync/详情 attachmentGroup：附件项上传人字段由 creatorUserNickName 改为 creatorUserName，取值 User.NickName |
| 2026-07-10 | 服务项 SortId 赋值规则调整：`SeaExportService.SortId` 统一取服务项配置(SeServiceConfigItem)的 SortId，忽略前端传入的 sortId；移除输入顺序校验(不再报"服务项目顺序不正确")；配置缺失优先级时报"服务项{serviceType}顺序未配置" |
| 2026-07-10 | 列表/详情 `SeaExportDto` 新增 `isYundangSubscribed`、`isYundangSubscribeSuccess`；云当订阅以 `seaExportId` 为准，已成功不可重复订阅，失败可重试并更新订阅表 |
| 2026-07-10 | 新增/编辑/复制服务项校验不再排除委托单位排除项：只校验起运港配置，被委托单位排除的服务项仍可添加到海运出口 |
| 2026-07-09 | 新增/编辑接口 `serviceTypes` 由 `int[]` 改为对象数组（含 `serviceType` + `sortId`），`SeaExportService.SortId` 取前端传入 sortId；编辑时仅 sortId 变化不重建任务，只同步优先级 |
| 2026-07-08 | 新增 GetDatesAsync；ETD/ATD/ETA 按天，截单类精确到分钟；新建/保存同步规范化日期 |
| 2026-07-06 | 新增复制接口 CopyAsync：支持按源票复制海运出口及业务子表，可选复制费用（ChangeOrderId 为空、初始状态、DataEntryMethod=Copy） |
| 2026-07-02 | 海运出口新增场站联系字段：yardEmail（场站邮箱，64）、yardContact（场站联系人，32）、yardTel（场站电话，32）、yardMobile（场站手机，32）；新增/编辑请求与详情/列表响应均已携带，含长度校验；由云港通实时查询回写。查询过滤 DTO 不含这 4 字段 |
| 2026-06-28 | 列表新增船名未填写筛选 vesselEmpty；新建/编辑时空船名规范为 null；分组统计船名分组保持原 GroupBy 逻辑 |
| 2026-06-28 | 列表 GetPagedListAsync 新增可空字段「未填写」筛选：carrierIdEmpty、polIdEmpty、podIdEmpty、codeFrtIdEmpty、codeIssueTypeIdEmpty（bool?，true=查空值），与分组统计 id=null 分组联动；筛选逻辑在 BuildSeaExportFilterQuery 共用 |
| 2026-06-27 | 新增分组统计接口 GetGroupedListAsync：查询条件同列表，按 groupField（1装运方式~9签单方式）分组，返回每组 id、name、count |
| 2026-06-21 | 新增附件接口：GetAttachmentsAsync（分组查询）、AddAttachmentsAsync（批量添加）、DeleteAttachmentsAsync（批量删除关联） |
| 2026-06-21 | 新增/详情支持 attachmentGroup 分组附件；编辑接口不涉及附件 |
| 2026-06-06 | 编辑接口「服务项与任务变更逻辑」修改：起运港变更或服务项变更时均删除并重新生成服务项和任务；起运港和服务项均未变更时不做任何处理 |
| 2026-05-30 | 接口6「根据起运港获取服务项目」GetServiceTypesByPOLAsync：响应新增 userAttribute 字段（该服务项所需的用户属性） |
