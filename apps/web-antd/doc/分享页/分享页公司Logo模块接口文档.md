---
title: 分享页所属公司 Logo
module: 分享页
author: auto-doc-sync
last_updated: 2026-09-30
---

# 分享页所属公司 Logo 模块接口文档

**受众**：分享页（免登录，给客户看） **性质**：新增一个查询；监装分享是在已有公开详情上补字段，见《监装工单模块接口文档》第 7、12 节

接口地址必须带 `Async` 后缀，写掉了会 404。

本接口**不要求登录**。定位不到业务、没传单号、公司没上传 Logo，都返回 `companyLogo: null`，**不要**把分享页打成打开失败。前端拿 `null` 用品牌图兜底。

---

## 1. 接口清单

| 接口 | HTTP | 地址 | 鉴权 |
| :-- | :-- | :-- | :-- |
| 查所属公司 Logo | GET | `/api/services/app/ShareCompanyLogo/GetAsync` | **免登录** |

监装分享**不走这个接口**，继续用公开详情，读它出参里的 `companyLogo`：

`GET /api/services/app/LoadingOrder/DetailByMblAndLoadingOrderNumAsync`

---

## 2. 查所属公司 Logo — `GetAsync`

`GET /api/services/app/ShareCompanyLogo/GetAsync?scene={场景}&no={单号}`

三个运踪分享页各自传自己页面上已有的单号。新海运轨迹链接里的令牌 `t` **不是业务主键，不要传**。

### 2.1 入参（query string）

| 字段 | JSON | 类型 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| 场景 | `scene` | int | 否 | 见下表。不传、或不是 1/2/3 时，`companyLogo` 为 `null`，不报错 |
| 单号 | `no` | string | 否 | 前后空格会去掉。不传或空字符串时，`companyLogo` 为 `null`，不报错 |

| `scene` | 页面 | `no` 传什么 |
| :-- | :-- | :-- |
| `1` | `/tracking-map/{mblNo}` 现有海运运踪 | 路径里的主提单号 |
| `2` | `/cargo-tracking/air?no=` 空运轨迹 | 查询参数里的航司单号。带不带连字符都可以，例如 `999-12345678` 和 `99912345678` |
| `3` | `/cargo-tracking/ocean?t=&no=` 新海运轨迹 | 查询参数里的 `no`。没有 `no` 就不要指望用 `t` 换 Logo，直接当 `null` |

### 2.2 出参

ABP 外壳里的 `result` 只有这一层，没有再嵌业务单对象。

| 字段 | JSON | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 所属公司 Logo | `companyLogo` | string | 当前业务所属公司在组织管理上传的 Logo 直连地址。相对路径已拼好基址；已经是 http(s) 的原样返回。没上传、或按单号找不到业务时为 `null` |

```json
{ "companyLogo": "https://example.com/files/logo.png" }
```

找不到或没 Logo：

```json
{ "companyLogo": null }
```

### 2.3 页面怎么调

| 页面 | 请求 |
| :-- | :-- |
| `/tracking-map/COSU1234567890` | `GetAsync?scene=1&no=COSU1234567890` |
| `/cargo-tracking/air?no=999-12345678` | `GetAsync?scene=2&no=999-12345678` |
| `/cargo-tracking/ocean?t=令牌&no=COSU1234567890` | `GetAsync?scene=3&no=COSU1234567890`（`t` 不传） |
| `/cargo-tracking/ocean?t=令牌` | 可以不请求；请求了也不要带 `t`，`companyLogo` 为 `null` |

同一单号命中多张业务单时，后端取**创建时间最新**的那张的所属公司。该张没 Logo 就返回 `null`，不会改去找更早的一张。
