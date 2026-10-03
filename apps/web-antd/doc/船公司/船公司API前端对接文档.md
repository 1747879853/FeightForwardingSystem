# 船公司（Carrier）API 前端对接文档

> 基础路径：`/api/services/app/CarrierAdmin`  
> 所有接口需要登录认证（Bearer Token）
>
> ⚠️ **接口地址必须带 `Async` 后缀**。本项目 ABP 动态 API 不会剥掉方法名的 `Async`，方法叫 `AddAsync`，地址就是 `/api/services/app/CarrierAdmin/AddAsync`。本文档 2026-08-20 之前的版本把后缀写掉了，照着调会 404，现已全部修正。

---

## 1. 上传附件（通用）

上传文件获取 `attachmentId`，后续新增/编辑时通过 `logo` 对象传入。

### 请求

```
POST /api/Upload/UploadFile
Content-Type: multipart/form-data
```

| 参数 | 类型 | 说明                    |
| ---- | ---- | ----------------------- |
| file | File | 上传的文件（form-data） |

### 响应

```json
{
  "result": {
    "filePath": "存储路径",
    "fileUrl": "文件访问URL",
    "fileName": "文件原始名称",
    "attachmentId": 12345
  },
  "success": true
}
```

> 拿到 `attachmentId` 后，作为 `logo.attachmentId` 传入新增/编辑接口。

---

## 2. 新增船公司

### 请求

```
POST /api/services/app/CarrierAdmin/AddAsync
Content-Type: application/json
```

### 请求体

```json
{
  "cnName": "中远海运",
  "cnShortName": "中远",
  "enName": "COSCO Shipping",
  "code": "COSCO",
  "otherCode": "COS",
  "ediCode": "COSU",
  "remark": "备注信息",
  "logo": {
    "attachmentId": 12345,
    "displayOrder": 0
  },
  "carrierYards": [
    {
      "name": "外高桥一期堆场",
      "address": "上海市浦东新区外高桥保税区XX路1号",
      "remark": "常用"
    },
    {
      "name": "洋山堆场",
      "address": "上海市浦东新区洋山深水港XX路8号",
      "remark": null
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| cnName | string | 是 | 中文名称 |
| cnShortName | string | 是 | 中文简称 |
| enName | string | 是 | 英文名称 |
| code | string | 是 | 英文简称 |
| otherCode | string | 否 | 船公司代码别名 |
| ediCode | string | 否 | EDI代码 |
| remark | string | 否 | 备注 |
| logo | object/null | 否 | Logo附件信息，不传或传null表示无附件 |
| logo.attachmentId | number | 是(logo非null时) | 附件Id（先通过上传接口获取） |
| logo.displayOrder | number | 否 | 排序序号，默认0 |
| carrierYards | array/null | 否 | 堆场明细，不传或传 `[]` 表示无堆场 |
| carrierYards[].name | string | 是 | 堆场名称，最长128，同一船公司下不可重名 |
| carrierYards[].address | string | 否 | 堆场地址，最长512 |
| carrierYards[].remark | string | 否 | 堆场备注，最长1024 |

> **堆场没有 `sortId` 入参**：后端按数组下标自增生成（1、2、3……），传了也会被忽略。详见《船公司-堆场子表-前端接口文档-2026-08-20》。

### 响应

```json
{
  "result": 1,
  "success": true
}
```

> `result` 为新创建的船公司Id。

---

## 3. 编辑船公司

### 请求

```
PUT /api/services/app/CarrierAdmin/EditAsync
Content-Type: application/json
```

### 请求体

```json
{
  "id": 1,
  "cnName": "中远海运",
  "cnShortName": "中远",
  "enName": "COSCO Shipping",
  "code": "COSCO",
  "otherCode": "COS",
  "ediCode": "COSU",
  "remark": "备注信息",
  "logo": {
    "attachmentId": 12345,
    "displayOrder": 0
  },
  "carrierYards": [
    {
      "id": "aaaaaaaa-1111-2222-3333-444444444444",
      "name": "外高桥一期堆场",
      "address": "上海市浦东新区外高桥保税区XX路1号",
      "remark": "常用"
    },
    {
      "id": null,
      "name": "宝山堆场",
      "address": "上海市宝山区XX路9号",
      "remark": "新增"
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 船公司Id |
| cnName | string | 是 | 中文名称 |
| cnShortName | string | 是 | 中文简称 |
| enName | string | 是 | 英文名称 |
| code | string | 是 | 英文简称 |
| otherCode | string | 否 | 船公司代码别名 |
| ediCode | string | 否 | EDI代码 |
| remark | string | 否 | 备注 |
| logo | object/null | 否 | Logo附件信息，传null或不传则清除已有附件 |
| logo.attachmentId | number | 是(logo非null时) | 附件Id |
| logo.displayOrder | number | 否 | 排序序号，默认0 |
| carrierYards | array/null | 否 | 堆场明细，**全量提交**；传 `null` 或 `[]` 表示清空全部堆场 |
| carrierYards[].id | string(Guid)/null | 否 | **传 id = 修改这一条；传 null 或不传 = 新增一条** |
| carrierYards[].name | string | 是 | 堆场名称，最长128，同一船公司下不可重名 |
| carrierYards[].address | string | 否 | 堆场地址，最长512 |
| carrierYards[].remark | string | 否 | 堆场备注，最长1024 |

> **堆场是全量提交**：数据库里有、本次没提交的堆场会被删除，前端必须回传保留行的 `id`。 `sortId` 按本次数组顺序整体重排，无需也无法由前端指定。详见《船公司-堆场子表-前端接口文档-2026-08-20》。

### 响应

```json
{
  "result": true,
  "success": true
}
```

---

## 4. 删除船公司

### 请求

```
DELETE /api/services/app/CarrierAdmin/DeleteAsync
Content-Type: application/json
```

### 请求体

```json
{
  "id": 1
}
```

| 字段 | 类型   | 必填 | 说明     |
| ---- | ------ | ---- | -------- |
| id   | number | 是   | 船公司Id |

### 响应

```json
{
  "result": true,
  "success": true
}
```

> 删除时会自动清除关联的Logo附件，并同步删除该船公司下的**全部堆场**。船公司被海运出口/海运进口/海运运价引用时禁止删除，会返回 `该船公司已被【xx】模块引用,禁止删除`。

---

## 5. 船公司列表（分页）

### 请求

```
GET /api/services/app/CarrierAdmin/GetPagedListAsync
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 关键字模糊匹配（中文名、简称、英文名、代码、别名、备注） |
| cnName | string | 否 | 中文名称 |
| cnShortName | string | 否 | 中文简称 |
| enName | string | 否 | 英文名称 |
| code | string | 否 | 英文简称 |
| otherCode | string | 否 | 船公司代码别名 |
| ediCode | string | 否 | EDI代码 |
| remark | string | 否 | 备注 |
| sorting | string | 否 | 排序字段，如 `"id desc"` |
| pageIndex | number | 否 | 当前页码（从1开始，默认1） |
| pageSize | number | 否 | 每页条数（默认10） |

### 响应

```json
{
  "result": {
    "totalCount": 100,
    "items": [
      {
        "id": 1,
        "cnName": "中远海运",
        "cnShortName": "中远",
        "enName": "COSCO Shipping",
        "code": "COSCO",
        "otherCode": "COS",
        "ediCode": "COSU",
        "remark": "备注",
        "logo": {
          "id": 100,
          "attachmentId": 12345,
          "itemId": "1",
          "moduleTypeId": "160010",
          "isFirstShow": true,
          "displayOrder": 0,
          "url": "https://xxx.com/2024/01/logo.png",
          "mediaType": 1,
          "friendlyFileName": "logo.png",
          "fileLength": 204800,
          "creationTime": "2024-01-01T10:00:00",
          "creatorUserId": 1,
          "creatorUserName": "张三"
        },
        "creationTime": "2024-01-01T10:00:00",
        "creatorUserId": 1,
        "lastModificationTime": "2024-01-02T10:00:00",
        "lastModifierUserId": 1,
        "creatorUserName": "张三",
        "lastModifierUserName": "李四",
        "carrierYards": [
          {
            "id": "aaaaaaaa-1111-2222-3333-444444444444",
            "carrierId": 1,
            "name": "外高桥一期堆场",
            "address": "上海市浦东新区外高桥保税区XX路1号",
            "sortId": 1,
            "remark": "常用",
            "creationTime": "2026-08-20T10:00:00",
            "creatorUserId": 1,
            "lastModificationTime": null,
            "lastModifierUserId": null
          }
        ]
      }
    ]
  },
  "success": true
}
```

> `logo` 字段为 `null` 表示没有关联Logo附件。 `carrierYards` 为该船公司下的堆场明细，**按 `sortId` 升序**（与录入顺序一致），无数据返回 `[]`。

---

## 6. 船公司详情

### 请求

```
GET /api/services/app/CarrierAdmin/DetailAsync?id=1
```

### 查询参数

| 参数 | 类型   | 必填 | 说明     |
| ---- | ------ | ---- | -------- |
| id   | number | 是   | 船公司Id |

### 响应

```json
{
  "result": {
    "id": 1,
    "cnName": "中远海运",
    "cnShortName": "中远",
    "enName": "COSCO Shipping",
    "code": "COSCO",
    "otherCode": "COS",
    "ediCode": "COSU",
    "remark": "备注",
    "logo": {
      "id": 100,
      "attachmentId": 12345,
      "itemId": "1",
      "moduleTypeId": "160010",
      "isFirstShow": true,
      "displayOrder": 0,
      "url": "https://xxx.com/2024/01/logo.png",
      "mediaType": 1,
      "friendlyFileName": "logo.png",
      "fileLength": 204800,
      "creationTime": "2024-01-01T10:00:00",
      "creatorUserId": 1,
      "creatorUserName": "张三"
    },
    "creationTime": "2024-01-01T10:00:00",
    "creatorUserId": 1,
    "lastModificationTime": "2024-01-02T10:00:00",
    "lastModifierUserId": 1,
    "creatorUserName": "张三",
    "lastModifierUserName": "李四",
    "carrierYards": [
      {
        "id": "aaaaaaaa-1111-2222-3333-444444444444",
        "carrierId": 1,
        "name": "外高桥一期堆场",
        "address": "上海市浦东新区外高桥保税区XX路1号",
        "sortId": 1,
        "remark": "常用",
        "creationTime": "2026-08-20T10:00:00",
        "creatorUserId": 1,
        "lastModificationTime": null,
        "lastModifierUserId": null
      },
      {
        "id": "bbbbbbbb-1111-2222-3333-444444444444",
        "carrierId": 1,
        "name": "洋山堆场",
        "address": "上海市浦东新区洋山深水港XX路8号",
        "sortId": 2,
        "remark": null,
        "creationTime": "2026-08-20T10:00:00",
        "creatorUserId": 1,
        "lastModificationTime": null,
        "lastModifierUserId": null
      }
    ]
  },
  "success": true
}
```

## 堆场输出字段说明（CarrierYardDto）

列表/详情响应中 `carrierYards` 数组元素的字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string(Guid) | 堆场Id，编辑时原样回传即为「修改」 |
| carrierId | number | 所属船公司Id |
| name | string | 堆场名称 |
| address | string | 堆场地址 |
| sortId | number | 排序id，后端按录入顺序生成，**列表按其升序返回** |
| remark | string | 备注 |
| creationTime | string | 创建时间 |
| creatorUserId | number/null | 创建人Id |
| lastModificationTime | string/null | 最后修改时间 |
| lastModifierUserId | number/null | 最后修改人Id |

---

## Logo 输入字段说明（AttachmentItemForItemInputDto）

新增/编辑时 `logo` 对象的字段：

| 字段         | 类型   | 必填 | 说明                       |
| ------------ | ------ | ---- | -------------------------- |
| attachmentId | number | 是   | 附件Id（通过上传接口获取） |
| displayOrder | number | 否   | 排序序号，默认0            |

---

## Logo 输出字段说明（AttachmentItemDto）

列表/详情响应中 `logo` 对象的字段：

| 字段             | 类型        | 说明                                       |
| ---------------- | ----------- | ------------------------------------------ |
| id               | number      | 附件关联记录Id                             |
| attachmentId     | number      | 附件Id                                     |
| itemId           | string      | 关联的船公司Id（字符串格式）               |
| moduleTypeId     | string      | 模块类型Id（固定 `"160010"`）              |
| isFirstShow      | boolean     | 是否优先展示                               |
| displayOrder     | number      | 排序序号                                   |
| url              | string      | 文件访问完整URL                            |
| mediaType        | number      | 附件类型（1=图片, 2=视频, 3=音频, 4=文件） |
| friendlyFileName | string      | 文件显示名称（原始文件名）                 |
| fileLength       | number/null | 文件大小（字节）                           |
| creationTime     | string/null | 上传时间                                   |
| creatorUserId    | number/null | 上传人Id                                   |
| creatorUserName  | string/null | 上传人昵称                                 |

---

## 前端对接流程

### 新增/编辑带Logo

```
1. 用户选择图片文件
2. 调用 POST /api/Upload/UploadFile 上传文件
3. 从响应中获取 attachmentId
4. 调用新增/编辑接口，将 logo: { attachmentId: xxx, displayOrder: 0 } 传入请求体
```

### 删除Logo

编辑时将 `logo` 设为 `null` 或不传该字段即可清除Logo。

### 替换Logo

```
1. 上传新图片获取新的 attachmentId
2. 调用编辑接口传入新的 logo: { attachmentId: 新Id }（后端会自动替换旧关联）
```

---

## 变更说明

- 移除了 `countryId` 字段及国家关联（查询、新增、编辑均不再需要国家Id）
- 新增了 `logo` 字段支持单个Logo附件关联
- 列表和详情响应中新增 `logo` 对象字段（类型为 `AttachmentItemDto`）

### 2026-08-20

- **修正了本文档所有接口地址**：补上此前漏写的 `Async` 后缀（`AddAsync` / `EditAsync` / `DeleteAsync` / `GetPagedListAsync` / `DetailAsync`）。旧地址会 404。
- 新增**堆场子表**：新增/编辑入参增加 `carrierYards` 数组（名称、地址、备注；`sortId` 由后端按数组顺序自增生成，前端不传），列表/详情出参增加 `carrierYards`（按 `sortId` 升序），删除时同步清理。编辑为全量提交：传 id 的改、id 为 null 的新增、没传的删除。
- 列表和详情响应新增 `creatorUserName`、`lastModifierUserName` 两个昵称字段。
- 完整说明见《船公司-堆场子表-前端接口文档-2026-08-20》与《船公司-堆场子表-2026-08-20》。
