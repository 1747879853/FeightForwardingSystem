# User 模块 API 前端对接文档

> 本文档说明本次 User 模块新增/修改的所有接口及字段，供前端对接使用。
>
> 服务名：`UserAdminAppService`
>
> 接口基础路径：`/api/services/app/UserAdmin/`

---

## 一、User 主表新增字段说明

以下字段已添加到 User 实体，并在**所有用户相关的创建、更新、查询接口**中生效。

| 字段名 | 类型 | 必填 | 最大长度 | 说明 |
| --- | --- | --- | --- | --- |
| `enName` | `string` | 否 | 64 | 英文名 |
| `qq` | `string` | 否 | 32 | QQ号 |
| `employeeID` | `string` | 否 | 32 | 工号 |
| `gender` | `int?` | 否 | - | 性别（枚举值，可空） |
| `enable` | `bool` | 否 | - | 是否启用（默认true）。不启用时不能被检索到，但不影响登录状态 |
| `idNumber` | `string` | 否 | 20 | 身份证号 |
| `remark` | `string` | 否 | 1024 | 备注 |
| `emailPwd` | `string` | 否 | 64 | 邮箱密码 |
| `receiveAddrPort` | `string` | 否 | 64 | 收件服务器+端口 |
| `sendAddrPort` | `string` | 否 | 64 | 发件服务器+端口 |

---

## 二、涉及新增字段的已有接口

### 2.1 获取单个用户

- **URL**：`POST /api/services/app/UserAdmin/GetUser`
- **权限**：`Admin_Team_User_Get`
- **请求参数**：

```json
{
  "id": 1
}
```

- **返回值** `UserDto`（含新增字段和银行账户列表）：

```json
{
  "nickName": "张三",
  "userName": "zhangsan",
  "phoneNumber": "13800138000",
  "isPhoneNumberConfirmed": true,
  "isActive": true,
  "avatar": "/Images/avatar_default.png",
  "status": 0,
  "emailAddress": "zhangsan@example.com",
  "organization": "技术部",
  "userAttribute": 0,
  "enName": "Zhang San",
  "qq": "123456789",
  "employeeID": "EMP001",
  "gender": 1,
  "enable": true,
  "idNumber": "110101199001011234",
  "remark": "备注信息",
  "emailPwd": "pwd123",
  "receiveAddrPort": "imap.example.com:993",
  "sendAddrPort": "smtp.example.com:465",
  "shouldChangePasswordOnNextLogin": false,
  "roles": [
    {
      "roleId": 1,
      "roleName": "Admin",
      "roleDisplayName": "管理员"
    }
  ],
  "userProfile": null,
  "userBankAccounts": [
    {
      "id": 1,
      "userId": 1,
      "currencyId": 1,
      "currencyCode": "CNY",
      "accountName": "张三",
      "bankShortName": "工行",
      "bankName": "中国工商银行北京分行",
      "bankAddress": "北京市朝阳区XX路",
      "bankAccount": "6222000000000000001"
    }
  ],
  "id": 1,
  "creationTime": "2025-01-01T00:00:00",
  "creatorUserId": null
}
```

> **说明**：`GetUser` 接口现在额外返回 `userBankAccounts` 银行账户列表，每个银行账户都额外带有 `currencyCode`（币种代码，从Currency表关联查出）。

---

### 2.2 获取分页列表

- **URL**：`POST /api/services/app/UserAdmin/GetUserPagingList`
- **权限**：`Admin_Team_User_Get`
- **返回值** `PagingList<UserListDto>`：

列表中每条记录的 `UserListDto` 现在包含所有新增字段（`enName`、`qq`、`employeeID`、`gender`、`enable`、`idNumber`、`remark`、`emailPwd`、`receiveAddrPort`、`sendAddrPort`）。

---

### 2.3 获取用户用于后台编辑

- **URL**：`POST /api/services/app/UserAdmin/GetUserForEdit`
- **权限**：`Admin_Team_User_Get`
- **请求参数**：

```json
{
  "id": 1
}
```

- **返回值** `UserInAdminDataPermissionDto`：

现包含所有新增字段，可直接用于编辑表单回显。

---

### 2.4 创建或更新用户

- **URL**：`POST /api/services/app/UserAdmin/CreateOrUpdateUser`
- **权限**：创建 `Admin_Team_User_Add` / 更新 `Admin_Team_User_Edit`
- **请求参数** `UserInAdminInputDto`（含新增字段）：

```json
{
  "id": null,
  "nickName": "张三",
  "avatar": null,
  "userName": "zhangsan",
  "emailAddress": "zhangsan@example.com",
  "phoneNumber": "13800138000",
  "status": null,
  "isActive": true,
  "shouldChangePasswordOnNextLogin": false,
  "organizationName": "技术部",
  "organizationId": 1,
  "roles": ["Admin"],
  "userAttribute": 0,
  "enName": "Zhang San",
  "qq": "123456789",
  "employeeID": "EMP001",
  "gender": 1,
  "enable": true,
  "idNumber": "110101199001011234",
  "remark": "备注信息",
  "emailPwd": "pwd123",
  "receiveAddrPort": "imap.example.com:993",
  "sendAddrPort": "smtp.example.com:465"
}
```

> **说明**：`id` 为 `null` 时创建用户，有值时更新用户。新增字段在创建和更新时都会被保存。

---

### 2.5 数据权限模式创建或更新用户

- **URL**：`POST /api/services/app/UserAdmin/CreateOrUpdateUserInAdmin`
- **请求参数** `UserInAdminDataPermissionInputDto`（含新增字段）：

```json
{
  "id": null,
  "userName": "zhangsan",
  "emailAddress": "zhangsan@example.com",
  "status": null,
  "phoneNumber": "13800138000",
  "isActive": true,
  "organizationId": 1,
  "grantedOrganizationIds": [1, 2, 3],
  "shouldChangePasswordOnNextLogin": false,
  "dataPermissionType": 0,
  "nickName": "张三",
  "enName": "Zhang San",
  "qq": "123456789",
  "employeeID": "EMP001",
  "gender": 1,
  "enable": true,
  "idNumber": "110101199001011234",
  "remark": "备注信息",
  "emailPwd": "pwd123",
  "receiveAddrPort": "imap.example.com:993",
  "sendAddrPort": "smtp.example.com:465"
}
```

---

## 三、用户银行账户（UserBankAccount）接口

> 所有银行账户接口复用 User 的权限验证，权限标识如下：
>
> | 操作          | 权限                     |
> | ------------- | ------------------------ |
> | 查询列表/详情 | `Admin_Team_User_Get`    |
> | 创建/更新     | `Admin_Team_User_Edit`   |
> | 删除          | `Admin_Team_User_Delete` |

---

### 3.1 获取用户银行账户列表

- **URL**：`POST /api/services/app/UserAdmin/GetUserBankAccountList`
- **权限**：`Admin_Team_User_Get`
- **请求参数**：

```json
{
  "id": 1
}
```

| 参数 | 类型   | 必填 | 说明   |
| ---- | ------ | ---- | ------ |
| `id` | `long` | 是   | 用户Id |

- **返回值** `List<UserBankAccountDto>`：

```json
[
  {
    "id": 1,
    "userId": 1,
    "currencyId": 1,
    "currencyCode": "CNY",
    "accountName": "张三",
    "bankShortName": "工行",
    "bankName": "中国工商银行北京分行",
    "bankAddress": "北京市朝阳区XX路",
    "bankAccount": "6222000000000000001"
  },
  {
    "id": 2,
    "userId": 1,
    "currencyId": 2,
    "currencyCode": "USD",
    "accountName": "Zhang San",
    "bankShortName": "ICBC",
    "bankName": "Industrial and Commercial Bank of China",
    "bankAddress": "Beijing",
    "bankAccount": "6222000000000000002"
  }
]
```

---

### 3.2 获取单个银行账户

- **URL**：`POST /api/services/app/UserAdmin/GetUserBankAccount`
- **权限**：`Admin_Team_User_Get`
- **请求参数**：

```json
{
  "id": 1
}
```

| 参数 | 类型   | 必填 | 说明       |
| ---- | ------ | ---- | ---------- |
| `id` | `long` | 是   | 银行账户Id |

- **返回值** `UserBankAccountDto`：

```json
{
  "id": 1,
  "userId": 1,
  "currencyId": 1,
  "currencyCode": "CNY",
  "accountName": "张三",
  "bankShortName": "工行",
  "bankName": "中国工商银行北京分行",
  "bankAddress": "北京市朝阳区XX路",
  "bankAccount": "6222000000000000001"
}
```

---

### 3.3 创建银行账户

- **URL**：`POST /api/services/app/UserAdmin/CreateUserBankAccount`
- **权限**：`Admin_Team_User_Edit`
- **请求参数** `CreateUserBankAccountInputDto`：

```json
{
  "userId": 1,
  "currencyId": 1,
  "accountName": "张三",
  "bankShortName": "工行",
  "bankName": "中国工商银行北京分行",
  "bankAddress": "北京市朝阳区XX路",
  "bankAccount": "6222000000000000001"
}
```

| 参数 | 类型 | 必填 | 最大长度 | 校验说明 |
| --- | --- | --- | --- | --- |
| `userId` | `long` | 是 | - | 用户id，最小值1 |
| `currencyId` | `long` | 是 | - | 账户币种id，最小值1，需要外键校验Currency表 |
| `accountName` | `string` | 否 | 256 | 账户名称 |
| `bankShortName` | `string` | **是** | 32 | 开户银行简称 |
| `bankName` | `string` | **是** | 128 | 开户银行全称 |
| `bankAddress` | `string` | 否 | 128 | 开户银行地址 |
| `bankAccount` | `string` | **是** | 128 | 银行账号，同一用户下唯一 |

- **返回值** `UserBankAccountDto`（同3.2）
- **业务校验**：
  - `currencyId` 不存在时返回错误：`"币种不存在"`
  - 同一 `userId` 下 `bankAccount` 重复时返回错误：`"同一用户下银行账号不能重复"`

---

### 3.4 更新银行账户

- **URL**：`POST /api/services/app/UserAdmin/UpdateUserBankAccount`
- **权限**：`Admin_Team_User_Edit`
- **请求参数** `UpdateUserBankAccountInputDto`：

```json
{
  "id": 1,
  "userId": 1,
  "currencyId": 2,
  "accountName": "Zhang San",
  "bankShortName": "ICBC",
  "bankName": "Industrial and Commercial Bank of China",
  "bankAddress": "Beijing",
  "bankAccount": "6222000000000000001"
}
```

| 参数 | 类型 | 必填 | 最大长度 | 校验说明 |
| --- | --- | --- | --- | --- |
| `id` | `long` | 是 | - | 银行账户Id |
| `userId` | `long` | 是 | - | 用户id，最小值1 |
| `currencyId` | `long` | 是 | - | 账户币种id，最小值1，需要外键校验Currency表 |
| `accountName` | `string` | 否 | 256 | 账户名称 |
| `bankShortName` | `string` | **是** | 32 | 开户银行简称 |
| `bankName` | `string` | **是** | 128 | 开户银行全称 |
| `bankAddress` | `string` | 否 | 128 | 开户银行地址 |
| `bankAccount` | `string` | **是** | 128 | 银行账号，同一用户下唯一（排除自身） |

- **返回值** `UserBankAccountDto`（同3.2）
- **业务校验**：
  - `currencyId` 不存在时返回错误：`"币种不存在"`
  - 同一 `userId` 下 `bankAccount` 重复（排除当前记录）时返回错误：`"同一用户下银行账号不能重复"`

---

### 3.5 删除银行账户

- **URL**：`POST /api/services/app/UserAdmin/DeleteUserBankAccount`
- **权限**：`Admin_Team_User_Delete`
- **请求参数**：

```json
{
  "id": 1
}
```

| 参数 | 类型   | 必填 | 说明       |
| ---- | ------ | ---- | ---------- |
| `id` | `long` | 是   | 银行账户Id |

- **返回值**：无（`void`）

---

## 四、UserBankAccountDto 返回字段说明

| 字段名          | 类型     | 说明                                           |
| --------------- | -------- | ---------------------------------------------- |
| `id`            | `long`   | 银行账户主键Id                                 |
| `userId`        | `long`   | 所属用户Id                                     |
| `currencyId`    | `long`   | 账户币种Id                                     |
| `currencyCode`  | `string` | **币种代码**（额外关联查询，如 CNY、USD、EUR） |
| `accountName`   | `string` | 账户名称                                       |
| `bankShortName` | `string` | 开户银行简称                                   |
| `bankName`      | `string` | 开户银行全称                                   |
| `bankAddress`   | `string` | 开户银行地址                                   |
| `bankAccount`   | `string` | 银行账号                                       |

> `currencyCode` 是通过 `currencyId` 关联 Currency 表查询出来的额外字段，不需要前端传入，仅在返回时携带。

---

## 五、错误码说明

| 错误信息 | 触发条件 |
| --- | --- |
| `"币种不存在"` | 创建/更新银行账户时 `currencyId` 在 Currency 表中找不到 |
| `"同一用户下银行账号不能重复"` | 创建/更新银行账户时同一 `userId` 下已存在相同 `bankAccount` |
| `"用户不存在"` | 更新用户时 `id` 找不到对应用户 |

---

## 六、权限汇总

| 接口                     | 权限标识                                        |
| ------------------------ | ----------------------------------------------- |
| `GetUser`                | `Admin_Team_User_Get`                           |
| `GetUserPagingList`      | `Admin_Team_User_Get`                           |
| `GetUserPagedList`       | `Admin_Team_User_Get`                           |
| `GetUserForEdit`         | `Admin_Team_User_Get`                           |
| `CreateOrUpdateUser`     | `Admin_Team_User`（内部创建`_Add`/更新`_Edit`） |
| `DeleteUsers`            | `Admin_Team_User_Delete`                        |
| `GetUserBankAccountList` | `Admin_Team_User_Get`                           |
| `GetUserBankAccount`     | `Admin_Team_User_Get`                           |
| `CreateUserBankAccount`  | `Admin_Team_User_Edit`                          |
| `UpdateUserBankAccount`  | `Admin_Team_User_Edit`                          |
| `DeleteUserBankAccount`  | `Admin_Team_User_Delete`                        |

---

## 七、注意事项

1. **银行账户的 `currencyCode` 为只读字段**，前端创建/更新时不需要传入，由后端根据 `currencyId` 自动关联查询填充。
2. **`enable` 字段默认值为 `true`**，创建用户时如果不传，默认启用。
3. **`gender` 为可空枚举**，不传入时为 `null`。
4. **获取单个用户（`GetUser`）时会同时返回该用户的所有银行账户列表**（`userBankAccounts`），无需单独调用银行账户列表接口。
5. 银行账户的唯一性校验范围：**同一 `userId` 下 `bankAccount` 不能重复**。
6. 所有银行账户接口的权限验证复用 User 模块的权限，无需额外配置权限项。
