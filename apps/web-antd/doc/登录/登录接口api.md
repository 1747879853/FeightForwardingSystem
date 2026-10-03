# 多租户登录接口 API 文档

## 接口信息

| 项目         | 说明                                          |
| ------------ | --------------------------------------------- |
| 接口地址     | `POST /api/TokenAuth/AuthenticateTenantLogin` |
| 请求方式     | POST                                          |
| Content-Type | application/json                              |
| 是否需要认证 | 否                                            |

## 请求参数

### Request Body（TenantAuthenticateModel）

| 参数名                       | 类型   | 必填 | 说明                    |
| ---------------------------- | ------ | ---- | ----------------------- |
| userNameOrEmailAddress       | string | 是   | 用户名、邮箱或手机号    |
| password                     | string | 是   | 密码                    |
| tenantId                     | int    | 是   | 租户ID，必须大于0       |
| tenancyName                  | string | 是   | 租户编码（如 qd）       |
| twoFactorVerificationCode    | string | 否   | 双重验证验证码          |
| rememberClient               | bool   | 否   | 是否记住客户端          |
| twoFactorRememberClientToken | string | 否   | 双重验证记住客户端Token |
| singleSignIn                 | bool?  | 否   | 是否单点登录            |
| returnUrl                    | string | 否   | 登录后跳转地址          |

### 请求示例

```json
{
  "userNameOrEmailAddress": "admin",
  "password": "123qwe",
  "tenantId": 1,
  "tenancyName": "qd",
  "singleSignIn": false,
  "returnUrl": null
}
```

## 响应参数

### Response Body（AuthenticateResultModel）

| 参数名 | 类型 | 说明 |
| --- | --- | --- |
| accessToken | string | 登录Token（JWT） |
| refreshToken | string | 刷新Token |
| encryptedAccessToken | string | 加密后的AccessToken |
| expireInSeconds | int | Token过期时间（秒） |
| shouldResetPassword | bool | 是否需要重置密码 |
| passwordResetCode | string | 重置密码Code（shouldResetPassword为true时返回） |
| userId | long | 用户ID |
| requiresTwoFactorVerification | bool | 是否需要双重验证 |
| twoFactorAuthProviders | string[] | 双重验证方式列表（requiresTwoFactorVerification为true时返回） |
| twoFactorRememberClientToken | string | 双重验证记住客户端Token |
| returnUrl | string | 跳转地址 |
| companyId | long? | 用户所属公司ID（最底层一级），无则为null |
| companyName | string | 用户所属公司名称（最底层一级），无则为null |
| departmentId | long? | 用户所属部门ID（最底层一级），无则为null |
| departmentName | string | 用户所属部门名称（最底层一级），无则为null |

### 响应示例

#### 登录成功

```json
{
  "result": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "encryptedAccessToken": "加密后的token字符串",
    "expireInSeconds": 86400,
    "shouldResetPassword": false,
    "passwordResetCode": null,
    "userId": 1,
    "requiresTwoFactorVerification": false,
    "twoFactorAuthProviders": null,
    "twoFactorRememberClientToken": null,
    "returnUrl": null,
    "companyId": 5,
    "companyName": "青岛分公司",
    "departmentId": 12,
    "departmentName": "业务部"
  },
  "targetUrl": null,
  "success": true,
  "error": null,
  "unAuthorizedRequest": false
}
```

#### 需要重置密码

```json
{
  "result": {
    "accessToken": null,
    "refreshToken": null,
    "encryptedAccessToken": null,
    "expireInSeconds": 0,
    "shouldResetPassword": true,
    "passwordResetCode": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "userId": 1,
    "requiresTwoFactorVerification": false,
    "twoFactorAuthProviders": null,
    "twoFactorRememberClientToken": null,
    "returnUrl": null,
    "companyId": null,
    "companyName": null,
    "departmentId": null,
    "departmentName": null
  },
  "success": true
}
```

#### 需要双重验证

```json
{
  "result": {
    "accessToken": null,
    "refreshToken": null,
    "encryptedAccessToken": null,
    "expireInSeconds": 0,
    "shouldResetPassword": false,
    "passwordResetCode": null,
    "userId": 1,
    "requiresTwoFactorVerification": true,
    "twoFactorAuthProviders": ["Email", "Phone"],
    "twoFactorRememberClientToken": null,
    "returnUrl": null,
    "companyId": null,
    "companyName": null,
    "departmentId": null,
    "departmentName": null
  },
  "success": true
}
```

## 错误响应

| 场景 | 错误信息 |
| --- | --- |
| 租户ID无效（小于1） | 租户错误！ |
| 租户编码为空 | 租户编码错误！ |
| 账号待审核 | 您的账号正在加速审核，请耐心等待审核结果 |
| 账号未通过 / 未激活（`IsActive=false`） | 您的账号已暂停使用，请联系管理员处理 |
| 账号未启用（`Enable=false`） | 您的账号未启用，无法登录，请联系管理员处理 |
| 用户名或密码错误 | 登录失败相关提示（`请确认所选分公司或账号密码是否正确!`） |
| 账号已被锁定（`LockoutEndDateUtc` 未到） | **2026-09-21 起与密码错误分开提示**：`账号已被锁定，请于 yyyy-MM-dd HH:mm:ss 后再试`（提示和判定都按库里的 `LockoutEndDateUtc` 原值，不把字段当成 UTC） |
| 账号已被锁定（没有解锁截止时间） | `账号已被锁定，请稍后再试或联系管理员解锁` |

> **`Enable` 与 `IsActive` 不是同一字段。** `Enable` 是后台用户管理上的业务启用开关；关掉后选人列表也检索不到该用户，但历史单据仍要能按 id 回显姓名。`IsActive` 是 ABP 自带的账户激活标记。
>
> 未启用校验写在 `TokenAuthController.EnsureUserEnabled`：账号密码 / 手机验证码 / 微信 / 外部登录 / 刷新 Token 都会拦。PC 扫码登录不会抛异常，而是把同一句提示推到客户端。

### 错误响应示例

```json
{
  "result": null,
  "targetUrl": null,
  "success": false,
  "error": {
    "code": 0,
    "message": "租户错误！",
    "details": null,
    "validationErrors": null
  },
  "unAuthorizedRequest": false
}
```

## 字段说明

### companyId / companyName

返回用户所属组织架构中**最底层**的一级公司（`IsCompany = true`的组织）。如果用户未分配任何组织或其组织链中没有公司类型的节点，则返回 `null`。

### departmentId / departmentName

返回用户所属组织架构中**最底层**的一级部门（`IsCompany = false`的组织）。如果用户未分配任何组织或其组织链中没有部门类型的节点，则返回 `null`。

### 组织架构层级示例

假设组织结构为：`总公司(公司) → 山东分公司(公司) → 青岛分公司(公司) → 业务部(部门)`

用户挂在"业务部"下时：

- `companyId` / `companyName` → 青岛分公司（最底层的公司）
- `departmentId` / `departmentName` → 业务部（最底层的部门）
