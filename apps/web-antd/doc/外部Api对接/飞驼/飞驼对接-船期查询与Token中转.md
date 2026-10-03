---
title: 飞驼(Freightower)对接 - 船期查询与Token中转
module: 外部Api对接
author: 系统
last_updated: 2026-07-16
---

# 0. 文档导航

- **本文档(完整版)**：架构、Token 中转、后台刷新、配置、代码位置，供后端/运维查阅。
- **前端对接版**：`飞驼对接-船期查询-前端对接.md`，只含 `QueryScheduleAsync` 的入参与返回结构，前端仅需看这一份。
- **集装箱综合跟踪**：`飞驼对接-集装箱跟踪订阅与推送.md`(完整版) / `飞驼对接-集装箱跟踪-前端对接.md`(前端版)。注意：飞驼 Token 已抽出为 `FeituoTokenProvider`，由船期查询与集装箱跟踪**共用**。

# 1. 业务背景说明 (Background)

**白话解释：** 飞驼(Freightower)提供海运船期(港到港，含直达+中转)等数据。与云当一致，飞驼的鉴权密钥(clientId/secret)集中放在【中转站(Relay)】，各业务服务器不持有密钥，而是携带全局密钥(`Relay:Token`)向中转站获取飞驼 `access_token`，再以 Bearer 方式请求飞驼业务接口。船期数据仅格式化后返回前端展示，**不落库、不写日志**。

# 2. 功能与操作说明 (Features & Operations)

- **Token 中转下发：** 中转站新增 `feituo` 平台节点，业务端 `GET /relay/feituo/token` 获取 token。
- **Token 后台刷新：** 中转站启动即刷新，之后每 30 分钟刷新一次；失败则 1 分钟后重试。刷新记录写入 `Logs/FeituoToken/token-yyyyMMdd.log`(每天一个文件)。
- **船期查询：** 业务端 `FeituoAdminAppService.QueryScheduleAsync` 取 token 后请求飞驼 `/vessel2/v2/schedule`，格式化后返回前端。

# 3. 接口与配置映射

| 项目 | 位置 |
| :-- | :-- |
| 飞驼 Token 接口 | `POST http://openapi.freightower.com/auth/api/token`(body: clientId/secret，token 在 `data.access_token`) |
| 飞驼船期接口 | `GET http://openapi.freightower.com/vessel2/v2/schedule`(Bearer 鉴权) |
| 中转站平台配置 | `src/Freight.Relay/appsettings.json` → `Relay:Providers:feituo`(clientId/secret 在此，`TokenLogFolder=FeituoToken`) |
| 中转站取 Token | `GET /relay/feituo/token`(请求头 `X-Relay-Token`=全局密钥) |
| 统一发送与失效重试 | `FeituoTokenProvider.SendAsync`(所有请求飞驼的地方都走它，token 失效自动换新重试一次) |
| 中转站后台刷新 | `src/Freight.Relay/Services/TokenRefreshHostedService.cs`(按 `TokenLogFolder` 分平台归档) |
| 业务端服务 | `src/CsprojBuilder.Application/App/ExternalApi/Feituo/FeituoAdminAppService.cs` |
| 业务端 DTO | `src/CsprojBuilder.Application/App/ExternalApi/Feituo/Dto/FeituoDto.cs` |
| 业务端 HttpClient | `Startup.cs` 注册 `"Feituo"`(BaseAddress=`http://openapi.freightower.com`) |
| 业务端配置 | 复用 `Relay:BaseUrl` / `Relay:Token`(无需新增) |

# 4. 核心字段说明 (船期查询入参 FeituoScheduleQueryInputDto)

| 字段名 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- |
| **PolCode** | 起始港五字码 | 是 | 自动转大写，如 CNSHA |
| **PodCode** | 目的港五字码 | 是 | 自动转大写，如 USLGB |
| **Etd** | 预计离港日期 | 是 | 格式 yyyy-MM-dd |
| **Eta** | 预计到港日期 | 否 | 与 Etd 组合查询，传入后 WeeksOut 不生效 |
| **WeeksOut** | 范围(周) | 是 | 1=7天…8=56天；传 Eta 时飞驼接口不生效，但仍需传入 |
| **CarrierCd** | 船公司代码 | 否 | 仅支持单个 |
| **RouteCode** | 头程航线代码 | 否 |  |
| **IsTransit** | 中转标识 | 否 | 0直达 1中转，不传返回全部 |
| **TransitPortEn** | 第1次中转港口名 | 否 |  |
| **Vessel** | 船名 | 否 |  |
| **PageNum** | 页码 | 否 | 默认 1 |
| **PageSize** | 每页条数 | 否 | 最大 1000，默认 100 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **中转站 feituo 密钥必须先填。** `Relay:Providers:feituo:TokenRequestBody` 中的 clientId/secret 为占位符，须替换为飞驼实际账号密码，否则取 token 失败。

> [!IMPORTANT] **业务端复用 Relay 配置。** 业务端不新增飞驼配置，`Relay:BaseUrl`/`Relay:Token` 必须已配置且 `Relay:Token` 与中转站 `Relay:AccessToken` 一致。

> [!IMPORTANT] **请求飞驼一律走 `FeituoTokenProvider.SendAsync`，不要自己拿 token 拼 HttpClient。** 业务端按有效期缓存 token(下发过期时间 − 5 分钟)，而中转站的后台服务每 `RefreshIntervalMinutes`(飞驼配的是 30 分钟) **强制换新一次**，飞驼签发新 token 后旧的立即失效。业务端并不知道中转站换过号，于是会拿着已失效的 token 请求，返回 `HTTP 401 + statusCode 40100 token无效`。中转站重启、账号在别处被顶也是同样结果。
>
> 因此 `SendAsync` 统一承担「带 token 发送 + 识别失效 + 清缓存换新 + 重试一次」。失效判定同时认 **HTTP 401** 与响应体里的 **40100**；只重试**一次**，换了新 token 还失败就是账号或权限问题。清缓存时会**比对是不是自己用的那个 token**，避免并发下把别的线程刚取回来的新 token 误删、引发反复取号。
>
> 目前 6 个请求飞驼的地方(船期、港口拥堵、码头船舶计划、航次换算、集装箱订阅、空运订阅与查询)都已改走它。新增对接接口时照抄任意一处即可，**别再写 `GetTokenAsync()` + 自己发请求**，那样就绕过了重试。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-09-03 | `Fix` | 修复周期性的 `401 / 40100 token无效`：`FeituoTokenProvider` 新增统一发送方法 `SendAsync`，**token 失效时自动清缓存换新并重试一次**；所有请求飞驼的地方(共 6 处)都改走它 | 根因是**业务端缓存时长(有效期−5分钟≈68分钟) > 中转站强制刷新间隔(30分钟)** 的结构性矛盾：中转站每 30 分钟主动换新 token、旧的立即失效，而业务端还要拿 38 分钟才到期，这段时间必然 401。本次按产品决定**不动刷新间隔**，只加重试兜底——重试能同时覆盖中转站重启、账号在别处被顶等调配置治不了的场景。实现上把「拿 token + 发请求 + 判失效 + 重试」整段收进 `SendAsync`，入参是**构造请求的工厂**而不是请求对象：`HttpRequestMessage` 发过一次就不能复用，重试必须重新构造(含 Content)。失效判定同时认 HTTP 401 与响应体 40100，因为不排除某些接口只给业务码而 HTTP 仍是 200。`InvalidateToken` 会**比对待清理的是否就是本次用的那个 token**，否则并发撞 401 时第二个线程会抹掉第一个线程刚换回来的新 token，造成取号风暴。两个 Manager 由此不再需要 `IHttpClientFactory`，构造函数一并精简；`FeituoAdminAppService` 里那处 `_httpClientFactory` 保留，因为它调的是中转站而不是飞驼 |
| 2026-07-03 | `Feature` | 新增飞驼 Token 中转下发、后台刷新(FeituoToken 日志)、船期查询格式化返回 | 中转站 `ProviderOptions` 增加 `TokenLogFolder`；`TokenRefreshHostedService` 由单一 YundangToken 日志改为按平台字典化归档；业务端新建 `Feituo` 模块，token 走 Bearer、`data.access_token` 由中转站 `TokenResultPath` 点分路径提取；船期数据不落库不写日志 |
| 2026-07-03 | `Fix` | `WeeksOut` 更正为**必填**(与飞驼接口一致)，取值 1~8 | 移除 DTO 默认值 8 与服务端静默兜底；未传或越界时直接提示 |
| 2026-07-03 | `Docs` | 拆分文档：新增**前端对接版**(`飞驼对接-船期查询-前端对接.md`)，只含 `QueryScheduleAsync` 入参/返回；本文档保留完整架构说明 | 前端只需对接单一接口，无需了解 Token/中转站细节 |
| 2026-07-03 | `Feature` | 新增**船期(Admin.Schedule)增删改查权限**并汉化(添加/查询/编辑/删除)；`QueryScheduleAsync` 改用**查询权限**(`Admin.Schedule.Get`) | 权限组设计为**各平台通用**(飞驼及后续平台船期查询共用)；查询沿用项目约定用 `Get`；权限在 `FreightPermissions`/`FreightAuthorizationProvider` 注册，汉化在 `CsprojBuilder-zh-Hans.xml` |
| 2026-08-08 | `Refactor` | 飞驼 Token 获取从本服务抽出为 `FeituoTokenProvider`，与新增的集装箱综合跟踪**共用同一份进程内缓存**；本服务改为注入 `IFeituoTokenProvider` | 新增集装箱跟踪后会出现第二套重复的 token 缓存实现与重复取号，故抽出单一来源；`Relay:BaseUrl` 未配置的校验一并下沉到 Provider。集装箱跟踪详见《飞驼对接-集装箱跟踪订阅与推送.md》 |
| 2026-07-16 | `Fix` | 船期返回**补齐飞驼 `/vessel2/v2/schedule` 全部字段**，不再只映射子集：明细新增 shareCabins(共舱)、imoNumber/mmsi/callSign(船舶标识)、shipManagerEn、pol/polCountry/polTerminal(原始)/polUnCode/polUnName/polTimeZone 及对应 pod\* 系列、routeEtd/routeEta、staticEtdWeekOfYear、atd/ata、manifestCutoff/cvCutoff、pathCode/pathDescription/solutionDescription/solutionCode；中转港新增 portEn/portTimeZone/terminal(原始)/imoNumber/mmsi/callSign；结果集新增 status/size | 原 `FeituoScheduleRawItem` 仅反序列化 ~27 字段，导致大量数据被丢弃。现按 apifox 文档字段顺序补全原始 DTO(`FeituoScheduleRawItem`/`FeituoTransitRawItem`/新增 `FeituoShareCabinRawItem`)与展示 DTO(`FeituoScheduleItemDto`/`FeituoScheduleTransitDto`/新增 `FeituoShareCabinDto`)并逐字段补注释；`Format` 全量映射。**契约变更**：`polTerminal`/`podTerminal`/`terminal` 原返回的是标准码头名，现改为船公司原始名，标准名请改用 `*TerminalCn` |
