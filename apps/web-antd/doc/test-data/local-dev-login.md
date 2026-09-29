---
title: 本地佳越测试默认登录
dataset_id: local-dev-login
environment: local-dev
base_url: http://localhost:5010
created_at: 2026-09-29
maintainer: Cursor Agent
---

# 本地佳越测试默认登录

> **Agent 约定：** 本机 `localhost:5010`（佳越测试）做页面验证 / browser-use / Playwright 时，**直接用下表登录，不要再向用户询问账号密码。**

| 项       | 值                                                             |
| :------- | :------------------------------------------------------------- |
| 环境     | 本地佳越测试 `http://localhost:5010`                           |
| 登录页   | `/auth/login`                                                  |
| 用户名   | `admin`                                                        |
| 密码     | `jiayue+5159`                                                  |
| 租户     | 默认（`tenantId=1` / `tenancyName=default`，页面一般无需手选） |
| 核对日期 | 2026-09-29                                                     |
| 用途     | 全权限冒烟、银行流水 / 收费结算、造数与回归                    |

## 登录接口备忘

- 接口：`POST /api/TokenAuth/AuthenticateTenantLogin`
- 表单字段：`input[name="username"]`、`input[name="password"]`，按钮文案「立即登录」

## 其它账号

部门岗位账号见 [云东公司组织、银行账户与部门用户](./yundong-org-users-2026-06-28.md)。  
需要按销售 / 操作 / 财务角色测权限时再用那些账号；**默认冒烟与未指定角色时一律用本页 `admin`。**
