# 用户管理 (UserAdmin) 前端对接文档

---

## 1. 获取用户分页列表

**GET** `/api/services/app/UserAdmin/GetUserPagedListAsync`

### Query Parameters

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyWords | string | 否 | 关键字(匹配邮箱、用户名、昵称、手机号) |
| isActive | bool? | 否 | 是否已激活 |
| isEmailConfirmed | bool? | 否 | 邮箱是否验证 |
| isPhoneNumberConfirmed | bool? | 否 | 手机是否验证 |
| status | int? | 否 | 审核状态 |
| roleId | int? | 否 | 角色Id |
| userAttribute | long? | 否 | 用户属性(位掩码，精确匹配) |
| creationTimeStart | DateTime? | 否 | 创建时间起 |
| creationTimeEnd | DateTime? | 否 | 创建时间止 |
| lastLoginTimeStart | DateTime? | 否 | 最后登录时间起 |
| lastLoginTimeEnd | DateTime? | 否 | 最后登录时间止 |
| pageIndex | int | 否 | 当前页码，默认1 |
| pageSize | int | 否 | 每页条数，默认10 |
| sorting | string | 否 | 排序字段，默认 "Id DESC" |

### Response

```json
{
  "totalCount": 100,
  "pageIndex": 0,
  "pageSize": 10,
  "items": [
    {
      "id": 1,
      "nickName": "张三",
      "userName": "zhangsan",
      "phoneNumber": "13800138000",
      "isPhoneNumberConfirmed": true,
      "isActive": true,
      "avatar": "/Images/avatar_default.png",
      "status": 1,
      "emailAddress": "zhangsan@example.com",
      "organizations": [
        {
          "default": true,
          "oneOrganizationPath": [
            {
              "id": 1,
              "name": "总公司",
              "isCompany": true,
              "localCurrencyId": 1
            },
            {
              "id": 2,
              "name": "华东分公司",
              "isCompany": true,
              "localCurrencyId": 1
            },
            {
              "id": 3,
              "name": "技术部",
              "isCompany": false,
              "localCurrencyId": null
            }
          ]
        }
      ],
      "roles": ["Admin"],
      "userAttribute": 3,
      "enName": "Zhang San",
      "qq": "123456",
      "employeeID": "EMP001",
      "gender": 1,
      "enable": true,
      "idNumber": "310000199001011234",
      "remark": "备注",
      "emailPwd": "xxx",
      "receiveAddrPort": "imap.example.com:993",
      "sendAddrPort": "smtp.example.com:465",
      "officeTel": "021-12345678",
      "senderDisplayName": "张三",
      "extensionNumber": 923,
      "creationTime": "2026-01-01T00:00:00"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | long | 用户id |
| nickName | string | 昵称(真实姓名) |
| userName | string | 登录用户名 |
| phoneNumber | string | 手机号 |
| isPhoneNumberConfirmed | bool | 手机号是否已验证 |
| isActive | bool | 账户是否激活 |
| avatar | string | 头像路径 |
| status | int? | 审核状态 |
| emailAddress | string | 邮箱 |
| organizations | UserOrganizationPathDto[] | 用户全部所属组织路径（一个用户可属多个组织，每条为一条从顶到底的组织链）；用户未挂组织时为空数组 |
| roles | string[] | 角色名称列表 |
| userAttribute | long | 用户属性(位掩码) |
| enName | string | 英文名 |
| qq | string | QQ |
| employeeID | string | 工号 |
| gender | int? | 性别 |
| enable | bool | 是否启用。`false` 时不允许登录，选人列表也检索不到 |
| idNumber | string | 身份证号 |
| remark | string | 备注 |
| emailPwd | string | 邮箱密码 |
| receiveAddrPort | string | 收件服务器+端口 |
| sendAddrPort | string | 发件服务器+端口 |
| officeTel | string | 办公电话 |
| senderDisplayName | string | 发件显示名 |
| extensionNumber | int? | 开票分机号，接口开票时用于匹配开票员；未维护为 `null` |
| creationTime | DateTime | 创建时间 |

#### UserOrganizationPathDto 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| default | bool | 是否默认组织 |
| oneOrganizationPath | UserOrganizationPathItemDto[] | 单条组织链，从顶级组织到当前组织，按层级顺序排列 |

#### UserOrganizationPathItemDto 字段

| 字段            | 类型   | 说明             |
| --------------- | ------ | ---------------- |
| id              | long   | 组织id           |
| name            | string | 组织名称         |
| isCompany       | bool   | 是否公司节点     |
| localCurrencyId | long?  | 本位币id（新增） |

---

## 2. 获取用户详情(编辑回显)

**GET** `/api/services/app/UserAdmin/GetUserForEditAsync`

### Query Parameters

| 参数 | 类型 | 必填   | 说明   |
| ---- | ---- | ------ | ------ |
| id   | long | **是** | 用户id |

### Response

```json
{
  "id": 1,
  "nickName": "张三",
  "avatar": "/Images/avatar_default.png",
  "userName": "zhangsan",
  "emailAddress": "zhangsan@example.com",
  "phoneNumber": "13800138000",
  "status": 1,
  "isActive": true,
  "shouldChangePasswordOnNextLogin": false,
  "organizations": [
    {
      "default": true,
      "oneOrganizationPath": [
        { "id": 1, "name": "总公司", "isCompany": true, "localCurrencyId": 1 },
        {
          "id": 3,
          "name": "技术部",
          "isCompany": false,
          "localCurrencyId": null
        }
      ]
    }
  ],
  "roles": ["Admin"],
  "userAttribute": 3,
  "enName": "Zhang San",
  "qq": "123456",
  "employeeID": "EMP001",
  "gender": 1,
  "enable": true,
  "idNumber": "310000199001011234",
  "remark": "备注",
  "emailPwd": "xxx",
  "receiveAddrPort": "imap.example.com:993",
  "sendAddrPort": "smtp.example.com:465",
  "officeTel": "021-12345678",
  "senderDisplayName": "张三",
  "extensionNumber": 923,
  "grantedOrganizationIds": [1, 2],
  "dataPermissionType": 0
}
```

### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | long | 用户id |
| nickName | string | 昵称(真实姓名) |
| avatar | string | 头像路径 |
| userName | string | 登录用户名 |
| emailAddress | string | 邮箱 |
| phoneNumber | string | 手机号 |
| status | int? | 审核状态 |
| isActive | bool | 账户是否激活 |
| shouldChangePasswordOnNextLogin | bool | 下次登录是否需要改密码 |
| organizations | UserOrganizationPathDto[] | 用户全部所属组织路径，默认组织 `default=true`（替代原 `organizationId`/`organizationName`） |
| roles | string[] | 角色名称列表 |
| userAttribute | long | 用户属性(位掩码) |
| enName | string | 英文名 |
| qq | string | QQ |
| employeeID | string | 工号 |
| gender | int? | 性别 |
| enable | bool | 是否启用。`false` 时不允许登录，选人列表也检索不到 |
| idNumber | string | 身份证号 |
| remark | string | 备注 |
| emailPwd | string | 邮箱密码 |
| receiveAddrPort | string | 收件服务器+端口 |
| sendAddrPort | string | 发件服务器+端口 |
| officeTel | string | 办公电话 |
| senderDisplayName | string | 发件显示名 |
| extensionNumber | int? | 开票分机号，接口开票时用于匹配开票员；未维护为 `null` |
| grantedOrganizationIds | long[] | 数据权限(可查看的部门Id列表) |
| dataPermissionType | int | 数据权限类型 |

> **变更(2026-07-22)**：不再返回 `organizationId`/`organizationName`（及公司/部门单值字段），改为返回 `organizations` 全部组织路径。`UserOrganizationPathDto` 结构见「1. 获取用户分页列表」。

### 业务逻辑

1. 根据用户id查询用户实体
2. 通过AutoMapper映射为 `UserInAdminDataPermissionDto`
3. 额外查询并填充用户的角色列表，以及**全部所属组织路径** `organizations`（默认组织 `default=true`）

---

## 3. 新增或更新用户

**POST** `/api/services/app/UserAdmin/CreateOrUpdateUserAsync`

### Request Body

```json
{
  "id": null,
  "nickName": "张三",
  "avatar": "/Images/avatar_default.png",
  "userName": "zhangsan",
  "emailAddress": "zhangsan@example.com",
  "phoneNumber": "13800138000",
  "status": 1,
  "isActive": true,
  "shouldChangePasswordOnNextLogin": false,
  "organizations": [
    { "id": 1, "default": true },
    { "id": 5, "default": false }
  ],
  "roles": ["Admin"],
  "userAttribute": 3,
  "enName": "Zhang San",
  "qq": "123456",
  "employeeID": "EMP001",
  "gender": 1,
  "enable": true,
  "idNumber": "310000199001011234",
  "remark": "备注",
  "emailPwd": "xxx",
  "receiveAddrPort": "imap.example.com:993",
  "sendAddrPort": "smtp.example.com:465",
  "officeTel": "021-12345678",
  "senderDisplayName": "张三",
  "extensionNumber": 923
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | long? | 否 | 用户id，有值=更新，null=新增 |
| nickName | string | **是** | 昵称(真实姓名) |
| avatar | string | 否 | 头像路径 |
| userName | string | **是** | 登录用户名(英文字母开头，只含字母、数字、下划线) |
| emailAddress | string | 否 | 邮箱(不传则自动生成) |
| phoneNumber | string | 否 | 手机号(需符合手机号格式) |
| status | int? | 否 | 审核状态 |
| isActive | bool | 否 | 是否激活 |
| shouldChangePasswordOnNextLogin | bool | 否 | 下次登录是否需要改密码 |
| organizations | UpdateUserOrganizationPathDto[] | 否 | 用户所属组织列表（替代原 `organizationId`/`organizationName`），据此重建多组织关系并设默认组织 |
| roles | string[] | 否 | 角色名称列表 |
| userAttribute | long | 否 | 用户属性(位掩码) |
| enName | string | 否 | 英文名(最长64) |
| qq | string | 否 | QQ(最长32) |
| employeeID | string | 否 | 工号(最长32) |
| gender | int? | 否 | 性别 |
| enable | bool | 否 | 是否启用，默认 true。`false` 时不允许登录 |
| idNumber | string | 否 | 身份证号(最长20) |
| remark | string | 否 | 备注(最长1024) |
| emailPwd | string | 否 | 邮箱密码(最长64) |
| receiveAddrPort | string | 否 | 收件服务器+端口(最长64) |
| sendAddrPort | string | 否 | 发件服务器+端口(最长64) |
| officeTel | string | 否 | 办公电话(最长32) |
| senderDisplayName | string | 否 | 发件显示名(最长64) |
| extensionNumber | int? | 否 | 开票分机号，见下方说明 |

> **开票分机号 `extensionNumber`（2026-09-01 新增）**：接口开票时随报文传给开票服务商，服务商据此匹配开票员，由服务商分配。**数字类型**，不填传 `null`。不填不影响开票，只是发票在服务商侧归到企业默认开票员名下，所以**不要做成必填**。

### Response

无返回值(HTTP 200表示成功)

### 业务逻辑

1. 如果 `emailAddress` 为空，自动生成一个默认邮箱
2. `id` 有值时执行**更新**，无值时执行**新增**
3. **新增**：使用默认密码 `123qwe`，自动分配默认角色
4. **更新**：通过AutoMapper将输入映射到现有用户实体并更新
5. 根据 `organizations` 重建用户多组织关系（`UserOrganizationUnit`），并设置默认组织 `User.DefaultOrgId`

> **组织写入规则（`SetUserOrganizationsAsync`）：** 先清空原有组织关系；逐个校验组织存在且启用（禁用报错）；写入新的组织关系；`DefaultOrgId` 取 `organizations` 中 `default=true` 的那条（最多一条，若未指定则回退取第一条）。

#### UpdateUserOrganizationPathDto 字段

| 字段    | 类型 | 必填   | 说明                                |
| ------- | ---- | ------ | ----------------------------------- |
| id      | long | **是** | 组织id（须存在且启用）              |
| default | bool | 否     | 是否设为默认组织（最多一条为 true） |

---

## 4. 新增或更新用户(含数据权限)

**POST** `/api/services/app/UserAdmin/CreateOrUpdateUserInAdminAsync`

### Request Body

```json
{
  "id": null,
  "nickName": "张三",
  "userName": "zhangsan",
  "emailAddress": "zhangsan@example.com",
  "phoneNumber": "13800138000",
  "status": 1,
  "isActive": true,
  "shouldChangePasswordOnNextLogin": false,
  "organizations": [
    { "id": 1, "default": true },
    { "id": 5, "default": false }
  ],
  "grantedOrganizationIds": [1, 2],
  "dataPermissionType": 0,
  "enName": "Zhang San",
  "qq": "123456",
  "employeeID": "EMP001",
  "gender": 1,
  "enable": true,
  "idNumber": "310000199001011234",
  "remark": "备注",
  "emailPwd": "xxx",
  "receiveAddrPort": "imap.example.com:993",
  "sendAddrPort": "smtp.example.com:465",
  "officeTel": "021-12345678",
  "senderDisplayName": "张三",
  "extensionNumber": 923
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | long? | 否 | 用户id，有值=更新，null=新增 |
| nickName | string | **是** | 昵称(真实姓名) |
| userName | string | **是** | 登录用户名(只含字母、数字、下划线) |
| emailAddress | string | 否 | 邮箱(不传则自动生成) |
| phoneNumber | string | 否 | 手机号(需符合手机号格式) |
| status | int? | 否 | 审核状态 |
| isActive | bool | 否 | 是否激活 |
| shouldChangePasswordOnNextLogin | bool | 否 | 下次登录是否需要改密码 |
| organizations | UpdateUserOrganizationPathDto[] | 否 | 用户所属组织列表（替代原 `organizationId`），据此重建多组织关系并设默认组织 |
| grantedOrganizationIds | long[] | 否 | 数据权限(可查看的部门Id列表) |
| dataPermissionType | int | 否 | 数据权限类型 |
| enName | string | 否 | 英文名(最长64) |
| qq | string | 否 | QQ(最长32) |
| employeeID | string | 否 | 工号(最长32) |
| gender | int? | 否 | 性别 |
| enable | bool | 否 | 是否启用，默认 true。`false` 时不允许登录 |
| idNumber | string | 否 | 身份证号(最长20) |
| remark | string | 否 | 备注(最长1024) |
| emailPwd | string | 否 | 邮箱密码(最长64) |
| receiveAddrPort | string | 否 | 收件服务器+端口(最长64) |
| sendAddrPort | string | 否 | 发件服务器+端口(最长64) |
| officeTel | string | 否 | 办公电话(最长32) |
| senderDisplayName | string | 否 | 发件显示名(最长64) |
| extensionNumber | int? | 否 | 开票分机号，说明同「3. 新增或更新用户」 |

> ⚠️ 本接口与「3. 新增或更新用户」用的是**两个互不继承的入参 DTO**，字段各写各的。 `extensionNumber` 两边都已加好，调哪个都能存进去。

### Response

返回用户 id（新增为新生成的 id，更新为入参 id）。

```json
{
  "result": 1,
  "success": true,
  "error": null
}
```

| 字段   | 类型 | 说明    |
| ------ | ---- | ------- |
| result | long | 用户 id |

### 业务逻辑

1. 如果 `emailAddress` 为空，自动生成一个默认邮箱
2. `id` 有值时执行**更新**，无值时执行**新增**
3. **新增**：使用默认密码 `123qwe`，自动分配默认角色，并根据 `organizations` 建立多组织关系
4. **更新**：通过AutoMapper将输入映射到现有用户实体并更新，如未传入邮箱则保留原邮箱
5. 根据 `organizations` 重建用户多组织关系并设置默认组织 `DefaultOrgId`（规则见「3. 新增或更新用户」）
6. 接口返回该用户 id，便于前端新增后立刻拿 id 做后续操作（例如绑附件、跳转详情）

---

## 5. 导出所有人的权限Excel

同一份 Excel 给了两个接口，按前端的下载方式挑一个用，产出内容完全一样：

| # | 用途 | 地址 | 返回 |
| --- | --- | --- | --- |
| 5.1 | 落盘到服务器，返回文件名 | **POST** `/api/services/app/UserAdmin/ExportUserPermissionsToLocalFileAsync` | 文件名（string） |
| 5.2 | 直接返回文件流 | **GET** `/api/ExportFile/ExportUserPermissionsAsync` | xlsx 文件流 |

两者权限都是 `Admin.Team.User.Get`（查看用户），与用户列表同一个权限点。**都没有入参**，导出当前租户下**全部**用户，不做筛选（未激活、已禁用的用户同样导出）。

### 5.1 落盘版

**POST** `/api/services/app/UserAdmin/ExportUserPermissionsToLocalFileAsync`

#### Request Body

无入参，传空对象 `{}` 即可。

#### Response

```json
{
  "result": "用户权限-20260831143000-638939520000000000.xlsx",
  "success": true,
  "error": null
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| result | string | 文件名。文件存在服务端 `wwwroot/excel/` 下，**下载地址 = `/excel/` + 这个文件名**（跨域时前端再拼上后端域名） |

文件名格式 `用户权限-{yyyyMMddHHmmss}-{Ticks}.xlsx`。用法与打印接口返回 `/PrintTempFile/{文件名}` 一致：接口只回文件名，前缀由前端拼。

`/excel/{文件名}` 是静态文件，**不鉴权**，`window.open` / `<a download>` 直接能下，不用处理 token。代价是拿到地址的人都能下载，全公司权限表算敏感数据，介意就用 5.2。

### 5.2 文件流版

**GET** `/api/ExportFile/ExportUserPermissionsAsync`

> **地址不在 `/api/services/app/UserAdmin/` 下。** 本项目返回文件流的导出统一走 `ExportFileController`（与「导出库存列表」同一套），AppService 上的 `ExportUserPermissionsExcelAsync` 标了 `[RemoteService(false)]`，不暴露成 ABP 动态 API。

#### Query Parameters

无入参。

#### Response

直接返回 xlsx 文件流，不是 JSON。

| 响应头 | 值 |
| --- | --- |
| Content-Type | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Content-Disposition | `attachment; filename="用户权限{yyyyMMddHHmmss}.xlsx"` |

需要鉴权的 GET，裸 `window.open` 不带 `Authorization` 头会 401，请用 blob 下载（带鉴权头请求后本地存盘），做法同「导出库存列表」。

### 5.3 Excel 结构（两个接口一致）

工作表名 `用户权限`；第 1 行表头、第 1 列昵称，均已冻结。

|  | A 列 | B 列 | C 列 | … |
| --- | --- | --- | --- | --- |
| **第 1 行（表头）** | 昵称 | 后台-团队管理-用户-查看用户 | 后台-团队管理-用户-编辑用户 | … |
| 第 2 行 | 张三 | √ | √ | … |
| 第 3 行 | 李四 | √ |  | … |

| 位置 | 内容 | 说明 |
| --- | --- | --- |
| A1 | `昵称` | 固定表头 |
| B1 及之后 | 权限中文名**全路径** | 用 `-` 连接各级父权限的中文名，如 `后台-团队管理-用户-查看用户`。叶子权限的中文名大量重复（各模块都叫「查看」「编辑」），所以必须拼全路径才分得清。列顺序按权限树深度优先展开，同一模块的权限连在一起 |
| A2 及之后 | 用户昵称(`NickName`) | 按昵称排序 |
| 交叉单元格 | `√` 或空 | 有该权限为 `√`，没有则留空 |

### 5.4 业务逻辑

1. 取当前租户的全部权限，按权限树深度优先展开成列（父权限在前，子权限紧随其后）
2. 一次查出全部用户，逐个调 `UserManager.GetGrantedPermissionsAsync`，口径与 `GetUserPermissionsAsync` 完全一致 = **用户自身的授权 ∪ 其角色带来的授权**
3. 交叉打勾生成 Excel；落盘版再把字节写到 `wwwroot/excel/` 并返回文件名

> **前端注意：**
>
> 1. 权限列会随权限增删整体位移，不要按固定列号解析。这份 Excel 是给人看的，不要当接口数据用。
> 2. 复杂度是 用户数 × 权限数，人多时较慢，做成手动点「导出」，不要挂首屏自动调。
> 3. 打的勾是「有效权限」，靠角色继承来的也会打勾，不只是用户自己单独勾的那些。

详见 `文档/用户/用户-导出所有人权限Excel-2026-08-31.md`。

---

## 附：变更记录

| 日期 | 变更 |
| :-- | :-- |
| 2026-09-01 | 全部出入参新增 `extensionNumber`（开票分机号，`int?` 可空）：列表、编辑回显、两个新增修改接口都已加。接口开票时传给开票服务商用于匹配开票员，不填不影响开票。详见 `文档/诺诺发票/诺诺发票对接-开票员不再上传与分机号按人维护-前端对接文档-2026-09-01.md` |
| 2026-08-31 | 新增「导出所有人的权限Excel」两个接口：落盘版 `POST /api/services/app/UserAdmin/ExportUserPermissionsToLocalFileAsync`（存 `wwwroot/excel`，返回文件名）、文件流版 `GET /api/ExportFile/ExportUserPermissionsAsync`。行=用户昵称，列=权限中文名全路径，交叉打勾。详见 `文档/用户/用户-导出所有人权限Excel-2026-08-31.md` |
| 2026-08-28 | `CreateOrUpdateUserInAdminAsync` 由无返回值改为返回用户 id（`long`）。详见 `文档/用户/用户-新增修改返回用户id-2026-08-28.md` |
| 2026-07-22 | 用户支持多组织：列表 `organizationPath`→`organizations`；编辑回显/新增修改的 `organizationId`/`organizationName` 统一改为 `organizations`；`UserOrganizationPathItemDto` 新增 `localCurrencyId`；用户新增 `DefaultOrgId`。详见 `文档/权限/用户或角色数据权限/数据权限与多组织改造-2026-07-22.md` |
| 2026-07-22 | 用户返回体全量统一为多组织：**下线遗留单值字段 `organization`（原"部门名"字符串）**；`GetUserPagedListAsync`、`GetUserPagingListAsync`、`GetUserAsync`（详情）均统一返回 `organizations` 多组织路径（此前 `GetUserPagingListAsync`/`GetUserAsync` 未返回组织，现已补齐）。详见 `文档/用户/用户-多组织返回统一-2026-07-22.md` |
