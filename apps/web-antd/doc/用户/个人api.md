# 个人信息接口文档

**控制器**：`UserAdmin`

**所有接口均需要登录认证**

---

## 一、获取自己的信息

### `GET /api/services/app/UserAdmin/GetMyAsync`

**权限**：登录即可（`[AbpAuthorize]`）

**入参**：无

**出参** `MyDto`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `userName` | `string` | 用户名 |
| `nickName` | `string` | 用户昵称 |
| `enName` | `string` | 英文名 |
| `employeeID` | `string` | 工号 |
| `phoneNumber` | `string` | 手机号 |
| `emailAddress` | `string` | 邮箱 |
| `officeTel` | `string` | 办公电话 |
| `qq` | `string` | QQ |
| `idNumber` | `string` | 身份证号 |
| `gender` | `int?` | 性别（0=未知，1=男，2=女） |
| `avatar` | `string` | 头像URL |
| `emailPwd` | `string` | 邮箱密码 |
| `departmentId` | `long?` | 部门ID |
| `departmentName` | `string` | 部门名称 |
| `organizations` | `MyUserOrganizationPathDto[]` | 用户所属组织路径列表（一个用户可属多个组织）。每个元素含 `oneOrganizationPath`（`OrganizationUnitDto[]`，从最高级组织到该组织，顶→底）与 `default`（是否默认组织）；路径中公司节点（`isCompany=true`）附带本位币（`localCurrencyId`/`localCurrencyCode`）与公司银行账户 `orgBankAccounts` |

**出参示例**：

```json
{
  "userName": "zhangsan",
  "nickName": "张三",
  "enName": "Zhang San",
  "employeeID": "EMP001",
  "phoneNumber": "13800138000",
  "emailAddress": "zhangsan@example.com",
  "officeTel": "021-12345678",
  "qq": "123456789",
  "idNumber": "310101199001011234",
  "gender": 1,
  "avatar": "https://example.com/avatar.png",
  "emailPwd": "pwd123",
  "departmentId": 5,
  "departmentName": "操作部",
  "organizations": [
    {
      "default": true,
      "oneOrganizationPath": [
        {
          "id": 1,
          "displayName": "XX物流有限公司",
          "isCompany": true,
          "localCurrencyId": 1,
          "localCurrencyCode": "CNY",
          "orgBankAccounts": []
        },
        { "id": 5, "displayName": "操作部", "isCompany": false }
      ]
    }
  ]
}
```

**业务规则**：

- 返回当前登录用户的个人信息
- 部门通过用户的组织架构层级关系获取：部门为组织层级中最底层的 `IsCompany=false` 节点
- `organizations` 返回用户所属的多个组织路径（一个用户可属多个组织）：每条路径为从最高级组织到该组织（顶→底）的完整节点串；公司节点（`IsCompany=true`）额外携带本位币（`localCurrencyId`/`localCurrencyCode`）与公司银行账户 `orgBankAccounts`

---

## 二、获取全部用户的所属组织

### `GET /api/services/app/UserAdmin/GetAllUserOrganizationsAsync`

**权限**：登录即可（`[AbpAuthorize]`），无需额外权限

**入参**：无

**出参** `List<UserOrganizationsDto>`（每个用户一条）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `userId` | `long` | 用户id |
| `organizations` | `MyUserOrganizationPathDto[]` | 该用户所属组织路径列表，结构与 `GetMyAsync.organizations` 相同（含 `default`、`oneOrganizationPath`；公司节点含本位币与 `orgBankAccounts`） |

**出参示例**：

```json
[
  {
    "userId": 10001,
    "organizations": [
      {
        "default": true,
        "oneOrganizationPath": [
          {
            "id": 1,
            "displayName": "总公司",
            "isCompany": true,
            "localCurrencyId": 1,
            "localCurrencyCode": "CNY",
            "orgBankAccounts": []
          },
          {
            "id": 10,
            "displayName": "销售部",
            "isCompany": false
          }
        ]
      }
    ]
  },
  {
    "userId": 10002,
    "organizations": []
  }
]
```

**业务规则**：

- 返回当前租户下**全部用户**，每人一条；无组织时 `organizations` 为空数组
- 组织数据走全量用户组织路径缓存，组织详情/银行账户批量填充（同 `GetMyAsync`）
- 用途：业务录入（如海运出口）选定销售后，按其 `userId` 取对应 `organizations` 选择所属组织 `orgId`

---

## 三、修改自己的信息

### `PUT /api/services/app/UserAdmin/UpdateMyInfoAsync`

**权限**：登录即可（`[AbpAuthorize]`）

**入参** `UpdateMyInfoDto`：

| 字段           | 类型     | 必填 | 说明                       |
| -------------- | -------- | ---- | -------------------------- |
| `enName`       | `string` | 否   | 英文名                     |
| `phoneNumber`  | `string` | 否   | 手机号                     |
| `emailAddress` | `string` | 否   | 邮箱                       |
| `officeTel`    | `string` | 否   | 办公电话                   |
| `qq`           | `string` | 否   | QQ                         |
| `idNumber`     | `string` | 否   | 身份证号                   |
| `gender`       | `int?`   | 否   | 性别（0=未知，1=男，2=女） |
| `avatar`       | `string` | 否   | 头像URL                    |
| `emailPwd`     | `string` | 否   | 邮箱密码                   |

**入参示例**：

```json
{
  "enName": "Zhang San",
  "phoneNumber": "13800138000",
  "emailAddress": "zhangsan@example.com",
  "officeTel": "021-12345678",
  "qq": "123456789",
  "idNumber": "310101199001011234",
  "gender": 1,
  "avatar": "https://example.com/new-avatar.png",
  "emailPwd": "newpwd456"
}
```

**出参**：无（`void`）

**业务规则**：

- 修改当前登录用户的个人信息
- 所有字段均为全量更新，传入什么值就更新为什么值
- 不传或传 `null` 的字段会被置为空

---

## 四、修改自己的头像

### `PUT /api/services/app/UserAdmin/UpdateMyAvatarAsync`

**权限**：登录即可（`[AbpAuthorize]`）

**入参** `UpdateMyAvatarDto`：

| 字段     | 类型     | 必填 | 说明    |
| -------- | -------- | ---- | ------- |
| `avatar` | `string` | 是   | 头像URL |

**入参示例**：

```json
{
  "avatar": "https://example.com/new-avatar.png"
}
```

**出参**：无（`void`）

**业务规则**：

- 修改当前登录用户的头像字段
- 传入头像的完整URL地址
