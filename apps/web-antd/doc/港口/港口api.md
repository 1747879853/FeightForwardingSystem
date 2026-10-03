# 港口信息接口文档（PortCodeAdminAppService）

## 基础信息

- **控制器路径：** `/api/services/app/PortCodeAdmin`
- **权限要求：** 需要登录认证（`AbpAuthorize`）
- **数据表：** `App_PortCodes`

---

## 1. 新增港口

**请求方式：** `POST`  
**接口路径：** `/api/services/app/PortCodeAdmin/AddAsync`  
**权限：** `Admin_PortCode_Add`

### 请求参数（PortCodeAddDto）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `portName` | `string` | 是 | 港口英文名称 |
| `cnName` | `string` | 否 | 港口中文名称 |
| `chau` | `string` | 否 | 所在大洲 |
| `explain` | `string` | 否 | 说明 |
| `portType` | `string` | 否 | 港口类型 |
| `countryId` | `long` | 是 | 国家Id（关联 App_CountryCodes） |
| `laneId` | `long` | 是 | 航线Id（关联 App_LaneCodes） |
| `ediCode` | `string` | 否 | EDI代码 |
| `statisticalArea` | `string` | 否 | 统计区域 |
| `status` | `int` | 否 | 状态：0=启用，1=禁用 |
| `sortId` | `int` | 否 | 排序 id，降序，值大的排前面；未传默认 `0` |
| `remark` | `string` | 否 | 备注 |

### 返回值

| 类型   | 说明          |
| ------ | ------------- |
| `long` | 新建港口的 Id |

### 业务校验

| 校验规则 | 错误提示 |
| --- | --- |
| `portName` 不能为空 | `港口信息名称不能为空` |
| `laneId` 必须是已存在的航线 | `航线id错误` |
| `countryId` 必须是已存在的国家 | `国家id错误` |
| `portName` + `countryId` 组合唯一（大小写不敏感，`portName` 自动去首尾空格，已删除数据不参与） | `港口英文名称和国家已存在` |

### 请求示例

```json
POST /api/services/app/PortCodeAdmin/AddAsync
{
  "portName": "SHANGHAI",
  "cnName": "上海",
  "portType": "海港",
  "countryId": 1,
  "laneId": 10,
  "ediCode": "CNSHA",
  "status": 0,
  "sortId": 10
}
```

---

## 2. 删除港口

**请求方式：** `DELETE`  
**接口路径：** `/api/services/app/PortCodeAdmin/DeleteAsync`  
**权限：** `Admin_PortCode_Delete`

### 请求参数（IdDto）

| 字段 | 类型   | 必填 | 说明   |
| ---- | ------ | ---- | ------ |
| `id` | `long` | 是   | 港口Id |

### 返回值

| 类型   | 说明         |
| ------ | ------------ |
| `bool` | 删除是否成功 |

---

## 3. 编辑港口

**请求方式：** `PUT`  
**接口路径：** `/api/services/app/PortCodeAdmin/EditAsync`  
**权限：** `Admin_PortCode_Edit`

### 请求参数（PortCodeEditDto）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `long` | 是 | 港口Id |
| `portName` | `string` | 是 | 港口英文名称 |
| `cnName` | `string` | 否 | 港口中文名称 |
| `chau` | `string` | 否 | 所在大洲 |
| `explain` | `string` | 否 | 说明 |
| `portType` | `string` | 否 | 港口类型 |
| `countryId` | `long` | 是 | 国家Id |
| `laneId` | `long` | 是 | 航线Id |
| `ediCode` | `string` | 否 | EDI代码 |
| `statisticalArea` | `string` | 否 | 统计区域 |
| `status` | `int` | 否 | 状态：0=启用，1=禁用 |
| `sortId` | `int` | 否 | 排序 id，降序，值大的排前面；未传默认 `0` |
| `remark` | `string` | 否 | 备注 |

### 返回值

| 类型   | 说明         |
| ------ | ------------ |
| `bool` | 编辑是否成功 |

### 业务校验

| 校验规则 | 错误提示 |
| --- | --- |
| `id` 必须是已存在的港口 | `输入港口信息错误` |
| `portName` 不能为空 | `港口信息名称不能为空` |
| `portName` + `countryId` 组合唯一（排除自身，大小写不敏感，`portName` 自动去首尾空格，已删除数据不参与） | `港口英文名称和国家已存在` |

---

## 4. 港口列表（分页）

**请求方式：** `GET`  
**接口路径：** `/api/services/app/PortCodeAdmin/GetPagedListAsync`

### 请求参数（PortCodeQueryDto）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `keyword` | `string` | 否 | 港口查询，模糊匹配港口英文名 `PortName`、中文名 `CnName` |
| `laneId` | `long?` | 否 | 航线Id，精确匹配 |
| `ediCode` | `string` | 否 | EDI代码，模糊匹配 |
| `countryId` | `long?` | 否 | 国家Id，精确匹配 |
| `status` | `int?` | 否 | 状态筛选：0=启用，1=禁用 |
| `sorting` | `string` | 否 | 排序字段（如 `id desc`）。不传时按 `sortId` 降序 + `id` 降序 |
| `pageIndex` | `int` | 否 | 当前页码，默认1 |
| `pageSize` | `int` | 否 | 每页条数，默认10 |

### 返回值（PagedList\<PortCodeDto\>）

```json
{
  "totalCount": 100,
  "items": [
    {
      "id": 1,
      "portName": "SHANGHAI",
      "cnName": "上海",
      "chau": "亚洲",
      "explain": "",
      "portType": "海港",
      "countryId": 1,
      "laneId": 10,
      "ediCode": "CNSHA",
      "statisticalArea": "华东",
      "status": 0,
      "sortId": 10,
      "remark": "",
      "creatorUserId": 2,
      "creatorUserName": "张三",
      "lastModifierUserId": 2,
      "lastModifierUserName": "张三",
      "country": {
        "id": 1,
        "code": "CN",
        "countryName": "中国",
        "countryEnName": "China"
      },
      "lane": {
        "id": 10,
        "laneCode": "FE",
        "laneName": "远东航线"
      }
    }
  ]
}
```

> 说明：`creatorUserName` / `lastModifierUserName` 由 `CreatorUserId` / `LastModifierUserId` 解析用户昵称；无对应用户时为 `null`。国家、航线以嵌套对象返回，不平铺。列表查询先按条件分页港口表，再按本页 `countryId`/`laneId` 批量查国家和航线，不在港口查询上 `Include`。

---

## 5. 港口详情

**请求方式：** `GET`  
**接口路径：** `/api/services/app/PortCodeAdmin/DetailAsync`

### 请求参数（IdDto）

| 字段 | 类型   | 必填 | 说明   |
| ---- | ------ | ---- | ------ |
| `id` | `long` | 是   | 港口Id |

### 返回值（PortCodeDto）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `long` | 港口Id |
| `portName` | `string` | 港口英文名称 |
| `cnName` | `string` | 港口中文名称 |
| `countryName` | `string` | 国家中文名称 |
| `countryEnName` | `string` | 国家英文名称 |
| `chau` | `string` | 所在大洲 |
| `explain` | `string` | 说明 |
| `portType` | `string` | 港口类型 |
| `countryId` | `long` | 国家Id |
| `laneId` | `long` | 航线Id |
| `laneCode` | `string` | 航线代码 |
| `laneName` | `string` | 航线中文名称 |
| `ediCode` | `string` | EDI代码 |
| `statisticalArea` | `string` | 统计区域 |
| `status` | `int` | 状态：0=启用，1=禁用 |
| `sortId` | `int` | 排序 id，降序，值大的排前面 |
| `remark` | `string` | 备注 |
| `creatorUserId` | `long?` | 创建人Id |
| `creatorUserName` | `string` | 创建人昵称 |
| `lastModifierUserId` | `long?` | 修改人Id |
| `lastModifierUserName` | `string` | 修改人昵称 |
| `country` | `CountryCodeSimpleDto` | 国家对象（嵌套） |
| `lane` | `LaneCodeSimpleDto` | 航线对象（嵌套） |

### 国家对象（CountryCodeSimpleDto）

| 字段            | 类型     | 说明                    |
| --------------- | -------- | ----------------------- |
| `id`            | `long`   | 国家Id                  |
| `code`          | `string` | 国家唯一代码（2字代码） |
| `countryName`   | `string` | 国家中文名称            |
| `countryEnName` | `string` | 国家英文名称            |
| `chau`          | `string` | 所在大洲                |
| `capital`       | `string` | 首都                    |
| `tariff`        | `int`    | 关税等级                |
| `tonnageTax`    | `int`    | 吨位税                  |
| `countryCode3`  | `string` | 国家3字代码             |
| `explain`       | `string` | 国家描述                |
| `remark`        | `string` | 备注                    |
| `status`        | `int`    | 状态：0=启用，1=禁用    |

### 返回示例

```json
{
  "id": 1,
  "portName": "SHANGHAI",
  "cnName": "上海",
  "chau": "亚洲",
  "explain": "",
  "portType": "海港",
  "countryId": 1,
  "laneId": 10,
  "ediCode": "CNSHA",
  "statisticalArea": "华东",
  "status": 0,
  "sortId": 10,
  "remark": "",
  "creatorUserId": 2,
  "creatorUserName": "张三",
  "lastModifierUserId": 2,
  "lastModifierUserName": "张三",
  "country": {
    "id": 1,
    "code": "CN",
    "countryName": "中国",
    "countryEnName": "China"
  },
  "lane": {
    "id": 10,
    "laneCode": "FE",
    "laneName": "远东航线"
  }
}
```

---

## 数据模型关系

```
App_PortCodes (港口表)
  ├── Id              (主键)
  ├── PortName        (港口英文名称)
  ├── CnName          (港口中文名称)
  ├── PortType        (港口类型)
  ├── EdiCode         (EDI代码)
  ├── StatisticalArea (统计区域)
  ├── Status          (状态)
  ├── SortId          (排序id，降序，大的在前)
  ├── CountryId ──→ App_CountryCodes (国家表)
  │                   ├── CountryName   (国家中文名)
  │                   ├── CountryEnName (国家英文名)
  │                   ├── Code          (国家2字代码)
  │                   └── CountryCode3  (国家3字代码)
  └── LaneId ──→ App_LaneCodes (航线表)
                      ├── LaneName (航线名称)
                      └── Code     (航线代码)
```
