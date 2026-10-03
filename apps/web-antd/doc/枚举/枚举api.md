# 枚举模块 API 接口文档

## 接口总览

| 序号 | 模块 | 接口 | 方法 | 是否需要登录 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 1 | 枚举公开 | `/api/services/app/Enumeration/GetAll` | GET | 否 | 获取所有枚举（含子表） |
| 2 | 枚举管理 | `/api/services/app/EnumerationAdmin/GetPagedList` | GET | 是（Admin_Enumeration_Get） | 枚举分页列表 |
| 3 | 枚举管理 | `/api/services/app/EnumerationAdmin/Detail` | GET | 是（Admin_Enumeration_Get） | 枚举详情（含子表） |
| 4 | 枚举管理 | `/api/services/app/EnumerationAdmin/Add` | POST | 是（Admin_Enumeration_Add） | 新增枚举 |
| 5 | 枚举管理 | `/api/services/app/EnumerationAdmin/Edit` | PUT | 是（Admin_Enumeration_Edit） | 编辑枚举 |
| 6 | 枚举管理 | `/api/services/app/EnumerationAdmin/Delete` | DELETE | 是（Admin_Enumeration_Delete） | 删除枚举 |
| 7 | 枚举管理 | `/api/services/app/EnumerationAdmin/GetItemsByName` | GET | 否 | 根据枚举名获取枚举值列表（带缓存） |

---

## 一、枚举公开接口 (EnumerationAppService)

### 1. 获取所有枚举（含子表）

- **路径：** `GET /api/services/app/Enumeration/GetAll`
- **登录要求：** 无需登录（`[AbpAllowAnonymous]`）
- **缓存：** 不使用缓存
- **说明：** 一次性返回当前租户下所有枚举及其枚举值子表

#### 请求参数

无

#### 响应结构

```json
{
  "result": [
    {
      "id": "guid",
      "name": "PaymentMethod",
      "description": "付款方式",
      "remark": "",
      "creationTime": "2026-01-01T00:00:00",
      "creatorUserId": 1,
      "lastModificationTime": null,
      "lastModifierUserId": null,
      "enumerationItems": [
        {
          "id": "guid",
          "enumerationId": "guid",
          "value": 1,
          "enable": true,
          "displayName": "现金",
          "extra1": false,
          "description": "",
          "remark": "",
          "creationTime": "2026-01-01T00:00:00",
          "creatorUserId": 1,
          "lastModificationTime": null,
          "lastModifierUserId": null
        }
      ]
    }
  ],
  "success": true,
  "error": null
}
```

#### 响应字段说明

**枚举主表 (EnumerationDetailDto)**

| 字段                   | 类型                   | 说明                       |
| ---------------------- | ---------------------- | -------------------------- |
| `id`                   | `Guid`                 | 枚举主键                   |
| `name`                 | `string`               | 枚举名称（英文标识，唯一） |
| `description`          | `string`               | 描述                       |
| `remark`               | `string`               | 备注                       |
| `creationTime`         | `DateTime`             | 创建时间                   |
| `creatorUserId`        | `long?`                | 创建人Id                   |
| `lastModificationTime` | `DateTime?`            | 最后修改时间               |
| `lastModifierUserId`   | `long?`                | 最后修改人Id               |
| `enumerationItems`     | `EnumerationItemDto[]` | 枚举值子表列表             |

**枚举值子表 (EnumerationItemDto)**

| 字段                   | 类型        | 说明                                |
| ---------------------- | ----------- | ----------------------------------- |
| `id`                   | `Guid`      | 枚举值主键                          |
| `enumerationId`        | `Guid`      | 所属枚举主表Id                      |
| `value`                | `int`       | 枚举值（数字）                      |
| `enable`               | `bool`      | 是否启用                            |
| `displayName`          | `string`    | 枚举值展示文本                      |
| `extra1`               | `bool`      | 额外字段1（服务项目的是否业务流程） |
| `description`          | `string`    | 描述                                |
| `remark`               | `string`    | 备注                                |
| `creationTime`         | `DateTime`  | 创建时间                            |
| `creatorUserId`        | `long?`     | 创建人Id                            |
| `lastModificationTime` | `DateTime?` | 最后修改时间                        |
| `lastModifierUserId`   | `long?`     | 最后修改人Id                        |

---

## 二、枚举管理接口 (EnumerationAdminAppService)

### 2. 枚举分页列表

- **路径：** `GET /api/services/app/EnumerationAdmin/GetPagedList`
- **登录要求：** 需要登录 + 权限 `Admin.Enumeration.Get`
- **说明：** 分页获取枚举列表（不含子表）

#### 请求参数 (Query)

| 参数        | 类型     | 必填 | 说明                                       |
| ----------- | -------- | ---- | ------------------------------------------ |
| `keyword`   | `string` | 否   | 关键字，模糊匹配 Name、Description、Remark |
| `pageIndex` | `int`    | 否   | 当前页码，默认1                            |
| `pageSize`  | `int`    | 否   | 每页条数，默认10                           |
| `sorting`   | `string` | 否   | 排序字段，默认 "Id DESC"                   |

#### 响应结构

```json
{
  "result": {
    "totalCount": 10,
    "items": [
      {
        "id": "guid",
        "name": "PaymentMethod",
        "description": "付款方式",
        "remark": "",
        "creationTime": "2026-01-01T00:00:00",
        "creatorUserId": 1,
        "lastModificationTime": null,
        "lastModifierUserId": null
      }
    ]
  },
  "success": true,
  "error": null
}
```

#### 响应字段说明 (EnumerationListDto)

| 字段                   | 类型        | 说明                 |
| ---------------------- | ----------- | -------------------- |
| `id`                   | `Guid`      | 枚举主键             |
| `name`                 | `string`    | 枚举名称（英文标识） |
| `description`          | `string`    | 描述                 |
| `remark`               | `string`    | 备注                 |
| `creationTime`         | `DateTime`  | 创建时间             |
| `creatorUserId`        | `long?`     | 创建人Id             |
| `lastModificationTime` | `DateTime?` | 最后修改时间         |
| `lastModifierUserId`   | `long?`     | 最后修改人Id         |

---

### 3. 枚举详情（含子表）

- **路径：** `GET /api/services/app/EnumerationAdmin/Detail`
- **登录要求：** 需要登录 + 权限 `Admin.Enumeration.Get`
- **说明：** 获取单个枚举的详情及其枚举值子表

#### 请求参数 (Query)

| 参数 | 类型   | 必填 | 说明       |
| ---- | ------ | ---- | ---------- |
| `id` | `Guid` | 是   | 枚举主键Id |

#### 响应结构

```json
{
  "result": {
    "id": "guid",
    "name": "PaymentMethod",
    "description": "付款方式",
    "remark": "",
    "creationTime": "2026-01-01T00:00:00",
    "creatorUserId": 1,
    "lastModificationTime": null,
    "lastModifierUserId": null,
    "enumerationItems": [
      {
        "id": "guid",
        "enumerationId": "guid",
        "value": 1,
        "enable": true,
        "displayName": "现金",
        "extra1": false,
        "description": "",
        "remark": "",
        "creationTime": "2026-01-01T00:00:00",
        "creatorUserId": 1,
        "lastModificationTime": null,
        "lastModifierUserId": null
      }
    ]
  },
  "success": true,
  "error": null
}
```

响应字段同 [GetAll 接口的 EnumerationDetailDto](#响应字段说明)。

---

### 4. 新增枚举

- **路径：** `POST /api/services/app/EnumerationAdmin/Add`
- **登录要求：** 需要登录 + 权限 `Admin.Enumeration.Add`
- **说明：** 新增枚举主表及子表

#### 请求参数 (Body JSON)

```json
{
  "name": "PaymentMethod",
  "description": "付款方式",
  "remark": "",
  "enumerationItems": [
    {
      "value": 1,
      "enable": true,
      "displayName": "现金",
      "extra1": false,
      "description": "",
      "remark": ""
    },
    {
      "value": 2,
      "enable": true,
      "displayName": "转账",
      "extra1": false,
      "description": "",
      "remark": ""
    }
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | 是 | 枚举名称（英文，唯一） |
| `description` | `string` | 否 | 描述 |
| `remark` | `string` | 否 | 备注 |
| `enumerationItems` | `EnumerationItemAddDto[]` | 否 | 枚举值列表 |
| `enumerationItems[].value` | `int` | 是 | 枚举值（同一枚举内不可重复） |
| `enumerationItems[].enable` | `bool` | 是 | 是否启用 |
| `enumerationItems[].displayName` | `string` | 是 | 展示文本（同一枚举内不可重复） |
| `enumerationItems[].extra1` | `bool` | 否 | 额外字段1（服务项目的是否业务流程） |
| `enumerationItems[].description` | `string` | 否 | 描述 |
| `enumerationItems[].remark` | `string` | 否 | 备注 |

#### 响应

```json
{
  "result": "guid (新增的枚举Id)",
  "success": true,
  "error": null
}
```

---

### 5. 编辑枚举

- **路径：** `PUT /api/services/app/EnumerationAdmin/Edit`
- **登录要求：** 需要登录 + 权限 `Admin.Enumeration.Edit`
- **说明：** 编辑枚举主表及子表。子表处理规则：Id为空或Guid.Empty表示新增，有值表示修改，数据库中存在但请求列表中不包含的会被删除。

#### 请求参数 (Body JSON)

```json
{
  "id": "guid",
  "name": "PaymentMethod",
  "description": "付款方式（修改后）",
  "remark": "",
  "enumerationItems": [
    {
      "id": "guid (已有项的Id，修改)",
      "value": 1,
      "enable": true,
      "displayName": "现金",
      "extra1": false,
      "description": "",
      "remark": ""
    },
    {
      "id": null,
      "value": 3,
      "enable": true,
      "displayName": "支票",
      "extra1": false,
      "description": "",
      "remark": ""
    }
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `Guid` | 是 | 枚举主键Id |
| `name` | `string` | 是 | 枚举名称（英文，唯一） |
| `description` | `string` | 否 | 描述 |
| `remark` | `string` | 否 | 备注 |
| `enumerationItems` | `EnumerationItemEditDto[]` | 否 | 枚举值列表 |
| `enumerationItems[].id` | `Guid?` | 否 | 枚举值Id（为空=新增，有值=修改） |
| `enumerationItems[].value` | `int` | 是 | 枚举值（不可重复） |
| `enumerationItems[].enable` | `bool` | 是 | 是否启用 |
| `enumerationItems[].displayName` | `string` | 是 | 展示文本（不可重复） |
| `enumerationItems[].extra1` | `bool` | 否 | 额外字段1（服务项目的是否业务流程） |
| `enumerationItems[].description` | `string` | 否 | 描述 |
| `enumerationItems[].remark` | `string` | 否 | 备注 |

#### 响应

```json
{
  "result": true,
  "success": true,
  "error": null
}
```

---

### 6. 删除枚举

- **路径：** `DELETE /api/services/app/EnumerationAdmin/Delete`
- **登录要求：** 需要登录 + 权限 `Admin.Enumeration.Delete`
- **说明：** 批量删除枚举（软删除，同时删除子表）

#### 请求参数 (Body JSON)

```json
{
  "ids": ["guid1", "guid2"]
}
```

| 参数  | 类型     | 必填 | 说明               |
| ----- | -------- | ---- | ------------------ |
| `ids` | `Guid[]` | 是   | 要删除的枚举Id列表 |

#### 响应

```json
{
  "result": true,
  "success": true,
  "error": null
}
```

---

### 7. 根据枚举名获取枚举值列表（带缓存）

- **路径：** `GET /api/services/app/EnumerationAdmin/GetItemsByName`
- **登录要求：** 无需登录
- **缓存：** 使用缓存（按租户+枚举名缓存）
- **说明：** 根据枚举名称获取启用状态的枚举值列表（不分页），仅返回 `Enable == true` 的项

#### 请求参数 (Query)

| 参数   | 类型     | 必填 | 说明                 |
| ------ | -------- | ---- | -------------------- |
| `name` | `string` | 是   | 枚举名称（英文标识） |

#### 响应结构

```json
{
  "result": [
    {
      "id": "guid",
      "enumerationId": "guid",
      "value": 1,
      "enable": true,
      "displayName": "现金",
      "extra1": false,
      "description": "",
      "remark": "",
      "creationTime": "2026-01-01T00:00:00",
      "creatorUserId": 1,
      "lastModificationTime": null,
      "lastModifierUserId": null
    }
  ],
  "success": true,
  "error": null
}
```

响应字段同 [EnumerationItemDto](#枚举值子表-enumerationitemdto)。

---

## 数据模型参考

### 数据库表

| 表名                   | 说明       |
| ---------------------- | ---------- |
| `App_Enumerations`     | 枚举主表   |
| `App_EnumerationItems` | 枚举值子表 |

### 权限标识

| 权限                       | 说明               |
| -------------------------- | ------------------ |
| `Admin.Enumeration`        | 枚举管理（父权限） |
| `Admin.Enumeration.Add`    | 新增枚举           |
| `Admin.Enumeration.Get`    | 查询枚举           |
| `Admin.Enumeration.Edit`   | 编辑枚举           |
| `Admin.Enumeration.Delete` | 删除枚举           |

### 接口差异对比

| 对比项 | EnumerationAppService（公开） | EnumerationAdminAppService（管理） |
| --- | --- | --- |
| GetAll | 返回所有枚举含子表，无缓存，不需登录 | - |
| GetPagedList | - | 分页列表（不含子表），需权限 |
| Detail | - | 单个详情含子表，需权限 |
| GetItemsByName | - | 按名称查枚举值，有缓存，不需登录 |
| Add | - | 新增枚举，需权限 |
| Edit | - | 编辑枚举，需权限 |
| Delete | - | 删除枚举，需权限 |
