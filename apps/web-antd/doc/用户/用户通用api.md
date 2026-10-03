# 用户通用 API 文档

> **服务名**：`UserAppService`
>
> **接口基础路径**：`/api/services/app/User/`
>
> **说明**：本文档面向前端对接，覆盖 `UserAppService` 下所有通用用户接口。与后台管理接口（`UserAdmin`）不同，本服务主要供业务页面在**已登录**场景下使用，权限要求较低。

---

# 第一部分：前端接口文档

## 通用说明

| 项目 | 说明 |
| :-- | :-- |
| 认证方式 | 除特别标注外，均需在请求头携带有效 Token |
| 响应包装 | ABP 标准格式：`{ "result": ..., "success": true, "error": null }`，以下示例仅展示 `result` 部分 |
| 分页入参 | **仅**使用 `pageIndex`（从 1 开始）和 `pageSize`；**禁止**使用 `skipCount`、`maxResultCount`、`takeCount` 等参数 |
| 分页出参 | 返回 `PagedList<T>`，前端分页展示使用 `totalCount`、`currentPage`、`totalPages`、`items` |
| 用户姓名字段 | 关联用户表展示姓名时统一返回 `nickName`（昵称），不返回 `userName` 作为显示名 |

### 分页入参（所有分页接口通用）

| 字段      | JSON Key    | 类型  | 必填 | 说明                               |
| :-------- | :---------- | :---- | :--- | :--------------------------------- |
| PageIndex | `pageIndex` | `int` | 否   | 当前页码，从 `1` 开始，默认 `1`    |
| PageSize  | `pageSize`  | `int` | 否   | 每页条数，默认 `10`，范围 `1~1000` |

> **注意**：分页请求**只传** `pageIndex` 和 `pageSize`，不要传 `skipCount`。

### PagedList 分页出参结构

| 字段        | JSON Key      | 类型  | 说明                                 |
| :---------- | :------------ | :---- | :----------------------------------- |
| Items       | `items`       | `T[]` | 当前页数据列表                       |
| TotalCount  | `totalCount`  | `int` | 符合条件的总记录数                   |
| CurrentPage | `currentPage` | `int` | 当前页码，对应本次请求的 `pageIndex` |
| TotalPages  | `totalPages`  | `int` | 总页数                               |

---

## 1. 获取用户简易分页列表

**Summary：** 获取用户简易分页列表，返回 `UserSimpleDto`，仅需登录，无需后台管理权限。仅包含已激活的用户，适用于下拉选人、业务单据关联用户、模糊搜索同事等场景。列表项返回用户的**所属公司id集合** `companyIds`，前端可据此按公司筛选可选人员。传入 `permissions` 后，只返回同时拥有这些权限的人，转交选人可用来只列出有对应审核权限的用户。

**GET** `/api/services/app/User/GetUserSimplePagedListAsync`

**权限**：`[AbpAuthorize]`（登录即可）

### 入参 Query Parameters（`UserSimplePagedQueryDto`）

| 字段 | JSON Key | 类型 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| KeyWords | `keyWords` | `string` | 否 | 关键字，模糊匹配昵称、用户名、英文名、工号 |
| UserAttribute | `userAttribute` | `long?` | 否 | 用户属性（位掩码），精确匹配；值大于 0 时生效 |
| Permissions | `permissions` | `string[]` | 否 | 权限名。传入后**只返回同时拥有这些权限的人**；不传或空数组不按权限筛。重复传参：`permissions=Admin.OrderFee.Audit&permissions=Admin.Client.Audit` |
| PageIndex | `pageIndex` | `int` | 否 | 当前页码，从 `1` 开始，默认 `1` |
| PageSize | `pageSize` | `int` | 否 | 每页条数，默认 `10`，范围 `1~1000` |
| Sorting | `sorting` | `string` | 否 | 排序字段，默认 `CreationTime DESC` |

> 分页入参**仅** `pageIndex`、`pageSize`，详见上文「分页入参（所有分页接口通用）」。

### 请求示例

```
GET /api/services/app/User/GetUserSimplePagedListAsync?keyWords=张三&permissions=Admin.OrderFee.Audit&pageIndex=1&pageSize=10&sorting=CreationTime%20DESC
```

### 出参 `PagedList<UserSimpleDto>`

```json
{
  "totalCount": 2,
  "currentPage": 1,
  "totalPages": 1,
  "items": [
    {
      "id": 1,
      "nickName": "张三",
      "enName": "Zhang San",
      "employeeID": "EMP001",
      "avatar": "/images/avatar.png",
      "userAttribute": 5,
      "companyIds": [1, 8]
    }
  ]
}
```

### 出参分页字段说明（`PagedList<UserSimpleDto>`）

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| TotalCount | `totalCount` | `int` | 总记录数 |
| CurrentPage | `currentPage` | `int` | 当前页码，对应入参 `pageIndex` |
| TotalPages | `totalPages` | `int` | 总页数 |
| Items | `items` | `UserSimpleDto[]` | 当前页数据 |

### 出参列表项字段说明（`UserSimpleDto`）

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| Id | `id` | `long` | 用户主键 id |
| NickName | `nickName` | `string` | 昵称（真实姓名，用于页面展示） |
| EnName | `enName` | `string` | 英文名 |
| EmployeeID | `employeeID` | `string` | 工号 |
| Avatar | `avatar` | `string` | 头像 URL |
| UserAttribute | `userAttribute` | `long` | 用户属性（位掩码），可同时具备多个属性；无属性为 `0`。取值见下表 |
| CompanyIds | `companyIds` | `long[]` | 所属公司id集合，无组织时为 `[]` |

#### `userAttribute` 位掩码取值

| 值  | 名称                    | 说明                                   |
| :-- | :---------------------- | :------------------------------------- |
| 0   | None                    | 无                                     |
| 1   | Operation               | 操作                                   |
| 2   | CustomerService         | 客服                                   |
| 4   | Documentation           | 单证                                   |
| 8   | Business                | 商务                                   |
| 16  | Sale                    | 销售                                   |
| 32  | Finance                 | 财务                                   |
| 64  | OverseasCustomerService | 海外客服                               |
| 128 | HR                      | 人事                                   |
| 256 | Laner                   | 航线                                   |
| 512 | LoadingSupervision      | 监装（到堆场现场监督集装箱装货的师傅） |

> 该字段是**按位或**组合的，例如 `5 = 1 | 4` 表示该用户同时是「操作」和「单证」。前端判断某个属性用按位与：`(userAttribute & 4) === 4` 即为单证。**不要**用 `userAttribute === 4` 直接等值比较，多属性用户会判错。

> **注意**：`UserSimpleDto` 未继承审计字段，**不返回** `creatorUserName`、`lastModifierUserName`、`creationTime` 等创建/修改人信息；亦不返回用户名、手机号、邮箱、性别、是否激活等字段。

### 业务规则

1. 仅需登录，不校验 `Admin_Team_User_Get` 等后台权限。
2. **仅返回已激活的用户**（`IsActive == true`），未激活用户不会出现在结果中；**不按审核状态 `Status` 过滤**。
3. `keyWords` 为空时不按关键字过滤；有值时仅匹配 `NickName`、`UserName`、`EnName`、`EmployeeID` 四个字段，不匹配邮箱、手机号等字段。
4. 列表查询使用 `AsNoTracking()` + `ProjectTo<UserSimpleDto>` 投影，SQL 仅查询 `UserSimpleDto` 映射字段，不加载用户表全部字段。
5. 入参 `userAttribute` 使用位掩码精确匹配：`(user.UserAttribute & input.UserAttribute) == input.UserAttribute`；出参 `userAttribute` 原样返回用户表上的位掩码值，由前端自行解码展示。
6. `companyIds` 由 `GetAllUserOrganizationPathsAsync()`（租户级缓存）一次性取全部用户的组织链后填充：一个用户可在多个组织下，**每条组织链取最靠近部门的公司节点**（`IsCompany == true`），汇总去重得到该用户的所属公司id集合；用户未挂任何组织，或组织链上没有公司节点时为 `[]`。
7. 相比 `UserAdmin/GetUserPagedListAsync`，本接口**不返回**角色列表、审核状态、邮箱密码等管理字段。
8. `permissions` 不传、空、或全是空白时**不按权限过滤**。有值时必须**同时拥有每一项**（并且关系，不是任一即可）。判定与登录后的权限检查一致：该用户直接授予了这项，或者其任一角色授予了这项且用户自己没有把这项标成禁止。权限名用系统里的全名，例如 `Admin.OrderFee.Audit`。数组按 `permissions=Admin.OrderFee.Audit&permissions=Admin.Client.Audit` 重复传，不要传 JSON 字符串。

---

## 2. 获取单个用户

**Summary：** 根据用户 id 获取完整用户信息，包含角色和用户资料。

**GET** `/api/services/app/User/GetUserAsync`

**权限**：`[AbpAuthorize]`（登录即可）

### 入参 Query Parameters

| 字段 | JSON Key | 类型   | 必填   | 说明    |
| :--- | :------- | :----- | :----- | :------ |
| Id   | `id`     | `long` | **是** | 用户 id |

### 请求示例

```
GET /api/services/app/User/GetUserAsync?id=1
```

### 出参 `UserDto`

```json
{
  "id": 1,
  "nickName": "张三",
  "userName": "zhangsan",
  "phoneNumber": "13800138000",
  "isPhoneNumberConfirmed": true,
  "isActive": true,
  "avatar": "/images/avatar.png",
  "status": 1,
  "emailAddress": "zhangsan@example.com",
  "organization": "操作部",
  "userAttribute": 1,
  "enName": "Zhang San",
  "qq": "123456789",
  "employeeID": "EMP001",
  "gender": 1,
  "enable": true,
  "idNumber": "310101199001011234",
  "remark": "备注",
  "emailPwd": "xxx",
  "receiveAddrPort": "imap.example.com:993",
  "sendAddrPort": "smtp.example.com:465",
  "officeTel": "021-12345678",
  "senderDisplayName": "张三",
  "extensionNumber": 923,
  "creationTime": "2026-01-01T00:00:00",
  "shouldChangePasswordOnNextLogin": false,
  "roles": [
    {
      "roleId": 1,
      "roleName": "Admin",
      "roleDisplayName": "管理员"
    }
  ],
  "userProfile": {
    "userId": 1,
    "trueName": "张三",
    "nickName": "张三",
    "phoneNumber": "13800138000",
    "gender": 1,
    "birthday": "1990-01-01T00:00:00",
    "address": "上海市",
    "description": "个人简介",
    "avatar": "/images/avatar.png",
    "emailAddress": "zhangsan@example.com",
    "wechat": "wechat_id"
  },
  "userBankAccounts": null
}
```

### 出参字段说明（`UserDto`）

继承 `UserListDto` 全部字段，并额外包含：

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| ShouldChangePasswordOnNextLogin | `shouldChangePasswordOnNextLogin` | `bool` | 下次登录是否需要修改密码 |
| Roles | `roles` | `UserRoleDto[]` | 用户角色列表 |
| UserProfile | `userProfile` | `UserProfileDto` | 用户扩展资料，无资料时为 `null` |
| UserBankAccounts | `userBankAccounts` | `UserBankAccountDto[]` | 用户银行账户列表，本接口当前不填充，通常为 `null` |

#### UserListDto 基础字段

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| Id | `id` | `long` | 用户主键 id |
| NickName | `nickName` | `string` | 昵称（真实姓名） |
| UserName | `userName` | `string` | 登录用户名 |
| PhoneNumber | `phoneNumber` | `string` | 手机号 |
| IsPhoneNumberConfirmed | `isPhoneNumberConfirmed` | `bool` | 手机号是否已验证 |
| IsActive | `isActive` | `bool` | 账户是否激活 |
| Avatar | `avatar` | `string` | 头像 URL |
| Status | `status` | `int?` | 审核状态 |
| EmailAddress | `emailAddress` | `string` | 帐号邮箱 |
| Organization | `organization` | `string` | 所属部门名称 |
| UserAttribute | `userAttribute` | `long` | 用户属性（位掩码） |
| EnName | `enName` | `string` | 英文名 |
| QQ | `qq` | `string` | QQ 号 |
| EmployeeID | `employeeID` | `string` | 工号 |
| Gender | `gender` | `int?` | 性别：`0`=未知，`1`=男，`2`=女 |
| Enable | `enable` | `bool` | 是否启用。`false` 时不允许登录，选人列表也检索不到 |
| IdNumber | `idNumber` | `string` | 身份证号 |
| Remark | `remark` | `string` | 备注 |
| EmailPwd | `emailPwd` | `string` | 邮箱密码 |
| ReceiveAddrPort | `receiveAddrPort` | `string` | 收件服务器+端口 |
| SendAddrPort | `sendAddrPort` | `string` | 发件服务器+端口 |
| OfficeTel | `officeTel` | `string` | 办公电话 |
| SenderDisplayName | `senderDisplayName` | `string` | 发件显示名 |
| ExtensionNumber | `extensionNumber` | `int?` | 开票分机号，接口开票时用于匹配开票员；未维护为 `null` |
| CreationTime | `creationTime` | `DateTime` | 创建时间 |

#### UserRoleDto 字段

| 字段            | JSON Key          | 类型     | 说明       |
| :-------------- | :---------------- | :------- | :--------- |
| RoleId          | `roleId`          | `int`    | 角色 id    |
| RoleName        | `roleName`        | `string` | 角色名称   |
| RoleDisplayName | `roleDisplayName` | `string` | 角色显示名 |

#### UserProfileDto 字段

| 字段         | JSON Key       | 类型       | 说明     |
| :----------- | :------------- | :--------- | :------- |
| UserId       | `userId`       | `long`     | 用户 id  |
| TrueName     | `trueName`     | `string`   | 真实姓名 |
| NickName     | `nickName`     | `string`   | 昵称     |
| PhoneNumber  | `phoneNumber`  | `string`   | 手机号   |
| Gender       | `gender`       | `int`      | 性别     |
| Birthday     | `birthday`     | `DateTime` | 生日     |
| Address      | `address`      | `string`   | 居住地   |
| Description  | `description`  | `string`   | 个人简介 |
| Avatar       | `avatar`       | `string`   | 头像     |
| EmailAddress | `emailAddress` | `string`   | 邮箱     |
| Wechat       | `wechat`       | `string`   | 微信     |

### 业务规则

1. 根据 `id` 查询用户实体，不存在时抛出「用户不存在」。
2. 自动填充角色名称（`roleName`、`roleDisplayName`）。
3. 若存在 `UserProfile` 记录则一并返回，否则 `userProfile` 为 `null`。

---

## 3. 按用户id批量获取用户

**Summary：** 传入一批用户 id，一次性返回这些用户的昵称、启用状态、手机号、邮箱、角色列表与所属组织机构路径，**不分页**。适用于前端已持有若干 `userId`（单据上的业务员、操作员、审批人等）需要批量回显的场景。**不传 `ids` 时返回全部用户。**

**GET** `/api/services/app/User/GetUserListByIdsAsync`

**权限**：`[AbpAuthorize]`（登录即可）

### 入参 Query Parameters（`UserListByIdsQueryDto`）

| 字段 | JSON Key | 类型 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| Ids | `ids` | `long[]` | 否 | 用户 id 集合。**为空或不传时返回全部用户**；内部自动去重；不存在的 id 直接忽略，不报错 |

### 请求示例

```
GET /api/services/app/User/GetUserListByIdsAsync?ids=2&ids=5&ids=9
```

```
GET /api/services/app/User/GetUserListByIdsAsync
```

> 数组参数按 `ids=1&ids=2&ids=3` 的形式重复传递，不要传 JSON 字符串（传错会因绑定为空而返回全部用户）。

### 出参 `UserInfoDto[]`

```json
[
  {
    "id": 2,
    "nickName": "张三",
    "enable": true,
    "phoneNumber": "13800138000",
    "emailAddress": "zhangsan@example.com",
    "roles": [
      {
        "roleId": 1,
        "roleName": "Admin",
        "roleDisplayName": "管理员"
      }
    ],
    "organizations": [
      {
        "oneOrganizationPath": [
          {
            "id": 1,
            "name": "XX物流有限公司",
            "isCompany": true,
            "localCurrencyId": 1
          },
          {
            "id": 6,
            "name": "操作部",
            "isCompany": false,
            "localCurrencyId": null
          }
        ],
        "default": true
      }
    ]
  }
]
```

### 出参列表项字段说明（`UserInfoDto`）

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| Id | `id` | `long` | 用户主键 id |
| NickName | `nickName` | `string` | 昵称（真实姓名，页面展示统一用此字段） |
| Enable | `enable` | `bool` | 是否启用。`false` 表示已停用：不允许登录、选人列表不可再检索；历史单据仍需按 id 展示其姓名 |
| PhoneNumber | `phoneNumber` | `string` | 手机号 |
| EmailAddress | `emailAddress` | `string` | 帐号邮箱 |
| Roles | `roles` | `UserRoleDto[]` | 用户角色列表，无角色时为空数组 |
| Organizations | `organizations` | `UserOrganizationPathDto[]` | 所属组织机构路径列表（一个用户可属于多个组织），无组织时为空数组 |

#### UserOrganizationPathDto 字段

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| OneOrganizationPath | `oneOrganizationPath` | `UserOrganizationPathItemDto[]` | 单条组织路径，按「从顶级组织到末级组织」顺序排列 |
| Default | `default` | `bool` | 是否为该用户的默认组织 |

#### UserOrganizationPathItemDto 字段

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| Id | `id` | `long` | 组织 id |
| Name | `name` | `string` | 组织名称 |
| IsCompany | `isCompany` | `bool` | 是否为公司节点 |
| LocalCurrencyId | `localCurrencyId` | `long?` | 该组织的本位币 id，未配置时为 `null` |

> `UserRoleDto` 字段见上文「2. 获取单个用户」。
>
> **注意**：本接口**不返回** `userName`、`avatar`、`enName`、`employeeID`、`gender`、`status`、`isActive`、`userAttribute` 及身份证号、邮箱密码、收发件服务器等字段，也**不返回**创建人/修改人与创建时间。需要完整信息请调用 `GetUserAsync`。

### 业务规则

1. `ids` 为 `null` 或空数组时**返回当前租户下的全部用户**（不分页、无数量上限）。
2. `ids` 内部自动去重；传入重复 id 只返回一条。
3. 传入的 id 不存在时**静默忽略**，不抛「用户不存在」，返回条数可能少于传入数量，前端需按 `id` 匹配并处理缺失项。
4. 排序：传了 `ids` 时返回顺序与 `ids` **严格一致**；未传 `ids` 时按用户 id 升序。
5. **不过滤**审核状态与激活状态：已停用、未激活、待审核用户也会返回（本接口用于按 id 回显历史数据）。这与 `GetUserSimplePagedListAsync` 的取数范围不同。
6. 角色一次性批量查出（`GetRolesByUserIds`），组织路径读取租户级缓存字典，不产生 N+1 查询。

---

## 4. 获取通用打印信息

**Summary：** 获取当前登录用户的打印信息，包含个人联系方式及所属公司的打印要素（Logo、银行账户等）。

**GET** `/api/services/app/User/GetUserPrintAsync`

**权限**：`[AbpAuthorize]`（登录即可）

### 入参

无

### 出参 `UserPrintDto`

```json
{
  "nickName": "张三",
  "enName": "Zhang San",
  "emailAddress": "zhangsan@example.com",
  "phoneNumber": "13800138000",
  "companyDisplayName": "XX物流有限公司",
  "companyShortName": "XX物流",
  "companyEnName": "XX Logistics Co., Ltd.",
  "companyAddress": "上海市浦东新区xxx路",
  "companyContactPhone": "021-12345678",
  "companyEmail": "contact@example.com",
  "unifiedSocialCreditCode": "91310000MA1FL8XQ30",
  "logo": "https://example.com/logo.png",
  "defaultBanks": [
    {
      "currencyCode": "CNY",
      "accountName": "XX物流有限公司",
      "bankShortName": "工行",
      "bankName": "中国工商银行上海分行",
      "bankAccount": "6222021234567890"
    }
  ]
}
```

### 出参字段说明（`UserPrintDto`）

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| NickName | `nickName` | `string` | 用户昵称 |
| EnName | `enName` | `string` | 英文名 |
| EmailAddress | `emailAddress` | `string` | 邮箱 |
| PhoneNumber | `phoneNumber` | `string` | 手机号 |
| CompanyDisplayName | `companyDisplayName` | `string` | 公司全称 |
| CompanyShortName | `companyShortName` | `string` | 公司简称 |
| CompanyEnName | `companyEnName` | `string` | 公司英文名 |
| CompanyAddress | `companyAddress` | `string` | 公司办公地址 |
| CompanyContactPhone | `companyContactPhone` | `string` | 公司联系电话 |
| CompanyEmail | `companyEmail` | `string` | 公司邮箱 |
| UnifiedSocialCreditCode | `unifiedSocialCreditCode` | `string` | 统一社会信用代码/税号 |
| Logo | `logo` | `string` | 公司 Logo 地址 |
| DefaultBanks | `defaultBanks` | `CompanyBankAccountPrintDto[]` | 公司默认银行账户列表 |

#### CompanyBankAccountPrintDto 字段

| 字段          | JSON Key        | 类型     | 说明         |
| :------------ | :-------------- | :------- | :----------- |
| CurrencyCode  | `currencyCode`  | `string` | 币种代码     |
| AccountName   | `accountName`   | `string` | 账户名称     |
| BankShortName | `bankShortName` | `string` | 开户银行简称 |
| BankName      | `bankName`      | `string` | 开户银行全称 |
| BankAccount   | `bankAccount`   | `string` | 银行账号     |

### 业务规则

1. 固定返回**当前登录用户**的信息，不接受用户 id 参数。
2. 公司通过缓存方法 `GetUserCompanyByCacheAsync` 获取。
3. 公司 Logo 从附件模块（`OrganizationUnitLogo`）读取并转换为完整 URL。
4. 用户无关联公司时，公司相关字段及 `defaultBanks` 均为 `null` 或空。

---

## 5. 获取密码规则设置

**Summary：** 获取系统密码复杂度规则，用于注册或修改密码时的前端校验提示。

**GET** `/api/services/app/User/GetPasswordComplexitySetting`

**权限**：`[AbpAllowAnonymous]`（无需登录）

### 入参

无

### 出参 `PasswordComplexitySetting`

```json
{
  "requiredLength": 6,
  "requireDigit": true,
  "requireLowercase": true,
  "requireUppercase": false,
  "requireNonAlphanumeric": false
}
```

### 出参字段说明

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| RequiredLength | `requiredLength` | `int` | 密码最小长度 |
| RequireDigit | `requireDigit` | `bool` | 是否必须包含数字 |
| RequireLowercase | `requireLowercase` | `bool` | 是否必须包含小写字母 |
| RequireUppercase | `requireUppercase` | `bool` | 是否必须包含大写字母 |
| RequireNonAlphanumeric | `requireNonAlphanumeric` | `bool` | 是否必须包含特殊符号 |

### 业务规则

1. 规则值来自系统配置 `AbpZeroSettingNames.UserManagement.PasswordComplexity`。
2. 前端应在提交密码前按此规则做本地校验。

---

## 6. 修改我的密码

**Summary：** 当前登录用户修改自己的登录密码。

**POST** `/api/services/app/User/ChangeMyPasswordAsync`

**权限**：`[AbpAuthorize]`（登录即可）

### 入参 Body（`MyPasswordInputDto`）

| 字段 | JSON Key | 类型 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| Password | `password` | `string` | **是** | 新密码 |
| ConfirmPassword | `confirmPassword` | `string` | **是** | 确认密码，须与 `password` 一致 |

### 请求示例

```json
{
  "password": "Abc123456",
  "confirmPassword": "Abc123456"
}
```

### 出参

无（`void`，HTTP 200 表示成功）

### 业务规则

1. 修改对象为**当前登录用户**，不接受用户 id 参数。
2. 修改成功后 `shouldChangePasswordOnNextLogin` 置为 `false`。
3. `password` 与 `confirmPassword` 不一致时校验失败。

---

# 第二部分：功能说明文档

---

title: 用户通用 API module: 用户 author: 系统 last_updated: 2026-09-18

---

## 1. 业务背景说明 (Background)

**白话解释：**

`UserAppService` 是面向业务系统的**通用用户服务**，与后台管理的 `UserAdminAppService` 分工不同：

- **UserAdmin**：面向系统管理员，负责用户的增删改查、角色权限、数据权限等完整管理。
- **User（本服务）**：面向已登录的业务用户，提供选人、查看同事信息、获取打印要素、修改个人密码等轻量能力。

典型使用场景包括：业务单据中选择业务员/操作员、页面展示用户昵称与部门、打印单据时拉取公司与个人联系信息、登录后修改密码等。

## 2. 功能与操作说明 (Features & Operations)

| 功能 | 接口 | 说明 |
| :-- | :-- | :-- |
| 用户简易分页列表 | `GetUserSimplePagedListAsync` | 登录即可调用，返回精简字段，适合下拉搜索选人 |
| 获取单个用户 | `GetUserAsync` | 按 id 获取较完整的用户信息（含角色、资料） |
| 按用户id批量获取用户 | `GetUserListByIdsAsync` | 传一批 id 批量回显用户（含角色、多组织），不分页；不传 `ids` 返回全部用户 |
| 通用打印信息 | `GetUserPrintAsync` | 获取当前用户 + 所属公司的打印要素 |
| 密码规则 | `GetPasswordComplexitySetting` | 匿名可访问，供前端密码校验 |
| 修改我的密码 | `ChangeMyPasswordAsync` | 当前用户自助改密 |

### 与 UserAdmin 分页接口的对比

| 对比项 | `User/GetUserSimplePagedListAsync` | `UserAdmin/GetUserPagedListAsync` |
| :-- | :-- | :-- |
| 权限 | 仅需登录 | 需要 `Admin_Team_User_Get` |
| 返回类型 | `UserSimpleDto` | `UserListDto` |
| 用户范围 | 仅已激活（不按审核状态过滤） | 全部用户（可按 Status / IsActive 筛选） |
| 角色信息 | 不返回 | 返回 |
| 敏感字段 | 不返回（用户名、手机号、邮箱、性别、是否激活等） | 返回管理字段 |
| 适用场景 | 业务页面选人、展示 | 后台用户管理列表 |

## 3. 状态流转说明 (Status Transitions)

本模块接口均为查询或自助改密，**无业务状态流转**。

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 已登录 | 调用 `ChangeMyPasswordAsync` | 已登录（密码已更新） | 密码哈希更新，`shouldChangePasswordOnNextLogin` 置 `false` |

## 4. 核心字段说明 (Field Definitions)

### UserSimpleDto（简易用户）

| 字段名 | 字段含义说明 | 数据来源 | 联动规则 | 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **id** | 用户主键 | `User` 表 | 作为外键关联用户 | 只读 |
| **nickName** | 页面展示用姓名 | `User.NickName` | 所有关联用户展示优先用此字段 | - |
| **enName** | 英文名 | `User.EnName` | - | - |
| **employeeID** | 工号 | `User.EmployeeID` | 可与关键字搜索联动 | - |
| **avatar** | 头像 | `User.Avatar` | - | - |
| **userAttribute** | 用户属性（位掩码） | `User.UserAttribute` | 可与入参 `userAttribute` 联动做岗位筛选；判断属性须用按位与 | 无属性为 0 |
| **companyIds** | 所属公司id集合 | `GetAllUserOrganizationPathsAsync()` 租户级缓存 | 一个用户可属多个组织，每条组织链取最靠近部门的公司节点并去重；可用于按公司过滤人员下拉 | 无组织为空数组 |

### UserInfoDto（按 id 批量获取用户）

| 字段名 | 字段含义说明 | 数据来源 | 联动规则 | 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **id** | 用户主键 | `User` 表 | 前端按此字段与传入的 `ids` 做匹配 | 只读 |
| **nickName** | 页面展示用姓名 | `User.NickName` | 所有关联用户展示统一用此字段 | - |
| **enable** | 是否启用 | `User.Enable` | `false` 时不允许登录，选人列表也不可再检索；历史单据仍需展示姓名，建议前端灰显 | - |
| **phoneNumber** | 手机号 | `User.PhoneNumber` | - | - |
| **emailAddress** | 帐号邮箱 | `User.EmailAddress` | - | - |
| **roles** | 角色列表 | `_userStore.GetRolesByUserIds` 批量查询 | 展示用 `roleDisplayName`，程序判断用 `roleName` | 无角色为空数组 |
| **organizations** | 所属组织机构路径 | `GetAllUserOrganizationPathsAsync()` 租户级缓存 | 一个用户可属多个组织，每条路径含 `default` 默认标记 | 无组织为空数组 |

### 分页查询入参

| 字段名 | 字段含义说明 | 数据来源 | 联动规则 | 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **keyWords** | 搜索关键字 | 前端输入 | 仅匹配昵称/用户名/英文名/工号 | 建议防抖后请求 |
| **userAttribute** | 用户属性筛选 | 前端选择 | 位掩码精确匹配 | 值须 > 0 才生效 |
| **permissions** | 权限名集合 | 前端传入权限全名 | 必须同时拥有每一项；直接授予或角色授予都算，用户明确禁止的不算 | 不传或空则不筛；按 `permissions=名&permissions=名` 重复传参 |
| **pageIndex** | 当前页码 | 前端分页 | 从 1 开始 | 默认 1；**唯一分页页码参数** |
| **pageSize** | 每页条数 | 前端分页 | - | 默认 10，最大 1000；**唯一分页条数参数** |
| **sorting** | 排序 | 前端传入 | 默认 `CreationTime DESC` | - |

> **禁止**使用 `skipCount`、`maxResultCount` 作为分页请求参数。

## 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **卡点 1：权限差异**
>
> 业务页面若只需选人/展示用户，应调用 `User/GetUserSimplePagedListAsync`，**不要**调用 `UserAdmin` 下的管理接口，否则普通业务用户会因缺少 `Admin_Team_User_Get` 权限而 403。

> [!IMPORTANT] **卡点 2：展示名统一**
>
> 页面展示用户姓名时统一使用 `nickName`，不要使用 `userName` 作为显示名。

> [!IMPORTANT] **卡点 3：分页参数**
>
> 分页请求**仅**传 `pageIndex` 和 `pageSize`，**禁止**传 `skipCount`、`maxResultCount`。响应中使用 `currentPage`、`totalPages`、`totalCount` 驱动分页控件。

> [!IMPORTANT] **卡点 4：`GetUserListByIdsAsync` 的 `ids` 传空等于查全部**
>
> 该接口不传 `ids` 时返回全部用户。因此数组参数必须按 `ids=1&ids=2` 重复传参，若误传 `ids=[1,2]` 之类的 JSON 字符串，绑定为空后接口会**静默返回全量数据**而不是报错，容易被忽略。

> [!IMPORTANT] **卡点 5：`GetUserSimplePagedListAsync` 的 `organization` 已下线**
>
> 一个用户可以同时属于多个组织，单值部门名 `organization` 无法表达，已移除。前端不要再读取 `items[].organization`，改用 `items[].companyIds`（所属公司id集合）。若页面需要展示组织名称而不只是 id，请改调 `GetUserListByIdsAsync`（返回完整多组织路径 `organizations`）。

> [!IMPORTANT] **卡点 6：`Enable=false` 不允许登录**
>
> 后台把用户的 `enable` 关掉后，该账号不能再拿 Token（账号密码、手机验证码、微信、刷新 Token 都会报「您的账号未启用，无法登录，请联系管理员处理」）。这与 `isActive` 不是同一开关。选人列表也检索不到该用户，但 `GetUserListByIdsAsync` 仍会按 id 回显姓名。

> [!IMPORTANT] **卡点 7：`permissions` 传错格式会当成没传**
>
> 本接口是 GET。`permissions` 必须按 `permissions=Admin.OrderFee.Audit&permissions=Admin.Client.Audit` 重复传。传成 JSON 字符串（`permissions=["Admin.OrderFee.Audit"]`）会绑定成空，接口**不会报错**，结果退回「全部已激活用户」，转交选人时会把没有审核权限的人也列出来。多项之间是并且：人必须每一项都有，少一项就不出现。

## 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-09-22 | `Feature` | `GetUserSimplePagedListAsync` 入参新增 `permissions`，传入后只返回同时拥有这些权限的已激活用户 | 不传不筛。每一项单独 AND：用户权限行 `IsGranted` 直接算有；否则所属角色有授予且用户没有把该项标成禁止才算有。与 `UserManager.IsGrantedAsync` 口径一致，静态角色默认不发全权限，只看 `Sys_Permissions`。转交选人可传对应审核权限名 |
| 2026-09-18 | `Fix` | `User.Enable=false` 的账号不允许登录 | `TokenAuthController` 原先只拦 ABP 的 `IsActive`，业务启用字段从未校验。现抽 `EnsureUserEnabled`：账号密码/手机验证码走 `GetLoginResultAsync`（拦在改密、双重验证之前）；签发 JWT 的 `CreateJwtClaims` 再兜一层（覆盖刷新 Token、微信、外部登录、绑定）；PC 扫码走 SignalR 推同一句提示，避免被外层 catch 改写成「此微信未绑定账号」。与 `IsActive` 仍是两个开关。 |
| 2026-07-13 | `Fix` | 仅返回审核已通过且已激活的用户；关键字搜索仅匹配昵称、用户名、英文名、工号；列表查询改为 `ProjectTo` 投影 | 业务选人场景排除待审核/未通过/未激活用户 |
| 2026-07-25 | `Feature` | 新增 `GetUserListByIdsAsync`：按用户 id 批量获取用户（不分页），返回昵称/是否启用/手机号/邮箱/角色/多组织路径；不传 `ids` 返回全部用户；不按审核与激活状态过滤，保证历史单据上已停用的人也能回显姓名 | 单独定义 `UserInfoDto` 隔离 `UserListDto` 中的敏感字段（身份证号/邮箱密码/收发件服务器），避免"登录即可"的接口越权暴露；角色批量 join、组织走租户级缓存字典避免 N+1。详见 `文档/用户/用户-按id批量获取用户-2026-07-25.md` |
| 2026-08-16 | `Feature` | `GetUserSimplePagedListAsync` 移除单值部门名 `organization`，改为返回所属公司id集合 `companyIds`（一个用户可属多个组织） | 复用 `GetAllUserOrganizationPathsAsync()` 租户级缓存一次取全量组织链，每条链取 `LastOrDefault(IsCompany)` 后去重，避免逐用户查库；同时补 `AsNoTracking()`。**更正文档偏差**：本接口实际只过滤 `IsActive`，并无 `Status == 已通过` 条件（2026-07-13 记录的审核过滤已在后续"用户搜不到"修复中去掉），原文档描述有误，本次一并更正。详见 `文档/用户/用户-简易分页返回所属公司ids-2026-08-16.md` |
| 2026-08-17 | `Feature` | `GetUserSimplePagedListAsync` 出参新增 `userAttribute`（用户属性位掩码），前端选人下拉可直接区分操作/客服/单证等岗位，不必再按属性分别请求 | 字段直接取自 `User.UserAttribute`，由 `ProjectTo<UserSimpleDto>` 按同名自动投影，SQL 只多带一列，无额外查询与内存填充。详见 `文档/用户/用户-简易分页返回用户属性-2026-08-17.md` |
| 2026-08-20 | `Feature` | `UserAttribute` 新增「监装」（`LoadingSupervision = 512`），用于标记到堆场现场监督集装箱装货的师傅，为监装模块做准备。用户编辑、Excel 导入、按属性筛选、服务项配置等所有按属性走的地方自动支持 | 位掩码枚举末尾追加，不影响任何既有值；顺带把只用于界面展示的 `UserAttributeEnum` 补齐（原先漏了 `Laner`，现补 `Laner = 8`、`LoadingSupervision = 9`）。详见 `文档/用户/用户-用户属性新增监装-2026-08-20.md` |

---

## 附录：接口与代码文件映射

| 接口文档 | 服务接口 | 实现类 | DTO 文件 |
| :-- | :-- | :-- | :-- |
| 用户通用api.md | `IUserAppService` | `UserAppService.cs` | `Dto/UserDto.cs`、`Dto/UserQueryDto.cs`、`Dto/PasswordInputDto.cs` |
| 用户-按id批量获取用户-前端对接文档-2026-07-25.md | `IUserAppService` | `UserAppService.cs` | `Dto/UserDto.cs`（`UserInfoDto`）、`Dto/UserQueryDto.cs`（`UserListByIdsQueryDto`） |
| 用户-按id批量获取用户-2026-07-25.md（功能说明与避坑） | `IUserAppService` | `UserAppService.cs` | 同上 |
| 用户-简易分页返回所属公司ids-2026-08-16.md（变更记录） | `IUserAppService` | `UserAppService.cs`（`GetUserSimplePagedListAsync`） | `Dto/UserDto.cs`（`UserSimpleDto`） |
| 用户-简易分页返回用户属性-2026-08-17.md（变更记录） | `IUserAppService` | `UserAppService.cs`（`GetUserSimplePagedListAsync`） | `Dto/UserDto.cs`（`UserSimpleDto`）、`CsprojBuilderEnum.cs`（`UserAttribute`） |
