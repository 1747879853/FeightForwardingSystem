# 币别（Currency）API 接口文档

**控制器**：`CurrencyAdminAppService`  
**基础路径**：`/api/services/app/CurrencyAdmin`  
**权限**：需要登录（`[AbpAuthorize]`）

---

## 一、接口总览

| # | 接口 | 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 1 | AddAsync | POST | `/api/services/app/CurrencyAdmin/AddAsync` | `Admin_Currency_Add` | 新增币别 |
| 2 | DeleteAsync | DELETE | `/api/services/app/CurrencyAdmin/DeleteAsync` | `Admin_Currency_Delete` | 删除币别 |
| 3 | EditAsync | PUT | `/api/services/app/CurrencyAdmin/EditAsync` | `Admin_Currency_Edit` | 编辑币别 |
| 4 | GetPagedListAsync | GET | `/api/services/app/CurrencyAdmin/GetPagedListAsync` | 仅需登录 | 币别分页列表 |
| 5 | DetailAsync | GET | `/api/services/app/CurrencyAdmin/DetailAsync` | 仅需登录 | 币别详情 |

> 本项目 ABP 动态 API **不会**剥掉方法名的 `Async` 后缀，路径里必须带着，写掉会 404。

---

## 二、数据字段说明

### 币别实体字段

| 字段 | JSON Key | 类型 | 最大长度 | 说明 |
| --- | --- | --- | --- | --- |
| 币别代码 | `code` | `string` | 8 | 必填，如 "CNY"、"USD" |
| 中文名称 | `cnName` | `string` | 128 | 如 "人民币"、"美元" |
| 英文名称 | `enName` | `string` | 128 | 如 "Chinese Yuan"、"US Dollar" |
| 币别符号 | `symbol` | `string` | 8 | 如 "￥"、"$"、"€" |
| 描述 | `description` | `string` | 128 | 描述信息 |
| 财务软件代码 | `financeSoftCode` | `string` | 32 | 对接财务软件的代码 |
| 别称 | `alias` | `string` | 32 | 别称 |
| 是否启用 | `enable` | `bool` | - | true/false |
| 排序id | `sortId` | `int` | - | 大的在前 |
| 备注 | `remark` | `string` | 1024 | 备注信息 |

---

## 三、接口详情

### 3.1 新增币别

**接口**：`POST /api/services/app/CurrencyAdmin/AddAsync`  
**权限**：`Admin_Currency_Add`

**入参** `CurrencyAddDto`：

```json
{
  "code": "USD",
  "cnName": "美元",
  "enName": "US Dollar",
  "symbol": "$",
  "description": "美国美元",
  "financeSoftCode": "USD001",
  "alias": "美金",
  "enable": true,
  "sortId": 100,
  "remark": "备注"
}
```

**出参**：`long`（新增记录的Id）

---

### 3.2 删除币别

**接口**：`DELETE /api/services/app/CurrencyAdmin/DeleteAsync`  
**权限**：`Admin_Currency_Delete`

**入参** `IdDto`：

```json
{
  "id": 1
}
```

**出参**：`bool`（成功返回 `true`）

**引用校验**：被下列任一模块引用时禁止删除，报 `该币别已被【xx、yy】模块引用,禁止删除`。

业务费用、海运出口运价、合作客户、付费申请、付费结算、对账费用、费用代码、银行流水、 **汇率**（`CurrencyId` 或 **`LocalCurrencyId`** 命中任一即算引用）、开票申请、发票开出、发票备注模板、合同、**组织机构**（公司的本位币指向该币别）。

> 组织机构这条尤其重要：本位币被删掉后，该公司下所有取汇率的逻辑都会直接报「当前公司未配置本位币」。

---

### 3.3 编辑币别

**接口**：`PUT /api/services/app/CurrencyAdmin/EditAsync`  
**权限**：`Admin_Currency_Edit`

**入参** `CurrencyEditDto`：

```json
{
  "id": 1,
  "code": "USD",
  "cnName": "美元",
  "enName": "US Dollar",
  "symbol": "$",
  "description": "美国美元",
  "financeSoftCode": "USD001",
  "alias": "美金",
  "enable": true,
  "sortId": 100,
  "remark": "备注"
}
```

**出参**：`bool`（成功返回 `true`）

---

### 3.4 币别分页列表

**接口**：`GET /api/services/app/CurrencyAdmin/GetPagedListAsync`  
**权限**：仅需登录

**入参** `CurrencyQueryDto`（Query参数）：

| 参数 | JSON Key | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 关键字 | `keyword` | `string` | 否 | 模糊匹配 code/cnName/enName/remark |
| 排序 | `sorting` | `string` | 否 | 排序表达式，默认 "Id DESC" |
| 当前页码 | `pageIndex` | `int` | 否 | 默认1，最小值1 |
| 每页条数 | `pageSize` | `int` | 否 | 默认10，范围1-1000 |

**请求示例**：

```
GET /api/services/app/CurrencyAdmin/GetPagedListAsync?keyword=美元&sorting=sortId desc&pageIndex=1&pageSize=10
```

**出参** `PagedList<CurrencyDto>`：

```json
{
  "items": [
    {
      "id": 1,
      "code": "USD",
      "cnName": "美元",
      "enName": "US Dollar",
      "symbol": "$",
      "description": "美国美元",
      "financeSoftCode": "USD001",
      "alias": "美金",
      "enable": true,
      "sortId": 100,
      "remark": "备注",
      "creationTime": "2026-01-01T00:00:00",
      "creatorUserId": 1,
      "lastModificationTime": "2026-06-07T00:00:00",
      "lastModifierUserId": 1
    }
  ],
  "totalCount": 1,
  "pageIndex": 1,
  "pageSize": 10
}
```

---

### 3.5 币别详情

**接口**：`GET /api/services/app/CurrencyAdmin/DetailAsync`  
**权限**：仅需登录

**入参** `IdDto`（Query参数）：

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| `id` | `long` | 币别Id |

**请求示例**：

```
GET /api/services/app/CurrencyAdmin/DetailAsync?id=1
```

**出参** `CurrencyDto`：

```json
{
  "id": 1,
  "code": "USD",
  "cnName": "美元",
  "enName": "US Dollar",
  "symbol": "$",
  "description": "美国美元",
  "financeSoftCode": "USD001",
  "alias": "美金",
  "enable": true,
  "sortId": 100,
  "remark": "备注",
  "creationTime": "2026-01-01T00:00:00",
  "creatorUserId": 1,
  "lastModificationTime": "2026-06-07T00:00:00",
  "lastModifierUserId": 1
}
```

---

## 四、DTO 结构总览

### 4.1 `CurrencyAddDto`（新增入参）

| 字段         | JSON Key          | 类型     | 必填 | 说明                 |
| ------------ | ----------------- | -------- | ---- | -------------------- |
| 币别代码     | `code`            | `string` | 是   | 最大8字符            |
| 中文名称     | `cnName`          | `string` | 否   | 最大128字符          |
| 英文名称     | `enName`          | `string` | 否   | 最大128字符          |
| 币别符号     | `symbol`          | `string` | 否   | 最大8字符，如 ￥ $ € |
| 描述         | `description`     | `string` | 否   | 最大128字符          |
| 财务软件代码 | `financeSoftCode` | `string` | 否   | 最大32字符           |
| 别称         | `alias`           | `string` | 否   | 最大32字符           |
| 是否启用     | `enable`          | `bool`   | 否   | 默认false            |
| 排序id       | `sortId`          | `int`    | 否   | 大的在前             |
| 备注         | `remark`          | `string` | 否   | 最大1024字符         |

### 4.2 `CurrencyEditDto`（编辑入参）

与 `CurrencyAddDto` 相同字段，额外包含：

| 字段 | JSON Key | 类型   | 必填 | 说明           |
| ---- | -------- | ------ | ---- | -------------- |
| 主键 | `id`     | `long` | 是   | 要编辑的币别Id |

### 4.3 `CurrencyDto`（列表/详情出参）

包含 `CurrencyAddDto` 所有字段，额外包含：

| 字段         | JSON Key               | 类型        | 说明         |
| ------------ | ---------------------- | ----------- | ------------ |
| 主键         | `id`                   | `long`      | 币别Id       |
| 创建时间     | `creationTime`         | `datetime`  | 创建时间     |
| 创建人Id     | `creatorUserId`        | `long?`     | 创建人       |
| 最后修改时间 | `lastModificationTime` | `datetime?` | 最后修改时间 |
| 最后修改人Id | `lastModifierUserId`   | `long?`     | 最后修改人   |

### 4.4 `CurrencyQueryDto`（列表查询入参）

| 字段 | JSON Key | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 关键字 | `keyword` | `string` | 否 | 模糊匹配 code/cnName/enName/remark |
| 排序 | `sorting` | `string` | 否 | 排序表达式，默认 "Id DESC" |
| 当前页码 | `pageIndex` | `int` | 否 | 默认1，最小值1 |
| 每页条数 | `pageSize` | `int` | 否 | 默认10，范围1-1000 |

---

## 五、错误处理

所有接口在异常时返回 `UserFriendlyException`，前端可通过 ABP 标准错误格式获取错误信息：

```json
{
  "error": {
    "message": "输入币别错误",
    "details": null
  }
}
```
