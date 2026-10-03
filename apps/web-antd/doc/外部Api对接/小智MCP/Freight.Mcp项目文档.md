---
title: Freight.Mcp 货代业务 MCP 服务项目文档
module: 外部Api对接 / 小智MCP
author: 自动化文档代理
last_updated: 2026-07-09
---

# 1. 项目定位 (Overview)

`Freight.Mcp` 是一个**独立运行的 MCP（Model Context Protocol）服务进程**，用于把货代业务系统（CsprojBuilder / 主 API）的能力，以「工具（Tool）」的形式暴露给小智（XiaoZhi）AI 语音终端。

一句话概括它做的事：

> 小智 AI ⇄（WebSocket / MCP 协议）⇄ **Freight.Mcp** ⇄（HTTP + Bearer Token）⇄ 货代业务 API

- 对**小智**：作为 MCP Server，通过 WebSocket 主动连接到小智的 MCP 接入点，注册一批工具供大模型调用。
- 对**货代 API**：作为 HTTP 客户端，用配置的账号自动登录换取 Token，再代理调用主系统的 AppService 接口。

它是一个 `net9.0` 的控制台 / Web 混合宿主（`Microsoft.NET.Sdk.Web`，`OutputType=Exe`），**不被主 ABP 解决方案引用**，可单独部署运行。

# 2. 运行架构 (Architecture)

```
┌───────────────┐   WebSocket(MCP)   ┌────────────────────┐   HTTP(Bearer)   ┌──────────────────┐
│   小智 AI      │ ◀───────────────▶ │     Freight.Mcp     │ ◀─────────────▶ │  货代业务 API      │
│ (语音/大模型)  │  tools/list、call  │  MCP Server + 客户端 │  登录 / 业务接口  │ (CsprojBuilder)   │
└───────────────┘                    └────────────────────┘                  └──────────────────┘
                                              │
                                              ├─ HTTP GET  /            状态页(HTML，每3秒刷新)
                                              ├─ HTTP GET  /api/status  状态快照(JSON)
                                              └─ HTTP POST /api/notify/service-task  接收主系统语音通知
```

## 2.1 关键特性

- **WebSocket 传输 + 自动重连**：由 `XiaoZhi.Mcp.Connector`（`WithWebSocketServerTransport`）实现，自定义 `ITransport` 直连小智接入点。
- **单会话模式**：面向单一小智会话优化。
- **Token 自动管理**：`FreightApiClient` 内部缓存 accessToken，按 `expireInSeconds` 计算过期，提前 `TokenRefreshBufferMinutes` 分钟刷新，`SemaphoreSlim` 防并发重复登录。
- **运行状态可视化**：`RuntimeStatusService` 记录阶段流转与最近 50 条历史，通过状态页/JSON 暴露。
- **拉取式语音通知**：接收主系统推送并暂存，等小智调用工具取出播报（详见第 6 节）。

# 3. 目录结构 (Project Layout)

```
src/Freight.Mcp/
├── Program.cs                         # 宿主入口：DI、MCP Server、状态页、Webhook
├── Freight.Mcp.csproj                 # net9.0；依赖 XiaoZhi.Mcp.Connector、Serilog
├── appsettings.json                   # 正式配置（含小智接入点 Token、货代 API 账号）
├── appsettings.Development.json       # 开发配置
├── Options/
│   ├── XiaoZhiMcpOptions.cs           # 小智：WebSocketUrl / ServerName / 说明
│   ├── FreightApiOptions.cs           # 货代 API：BaseUrl / 账号 / 租户 / Token 缓冲
│   └── StatusOptions.cs               # 状态页端口(默认 5099)
├── Services/
│   ├── FreightApiClient.cs            # 货代 API HTTP 客户端(登录+代理调用)
│   ├── ApiQueryBuilder.cs             # 把匿名对象转 query string(首字母小写、日期 O 格式)
│   ├── AbpApiResponseHelper.cs        # 解析 ABP 响应(success/result/error)
│   ├── RuntimeStatusService.cs        # 运行阶段与历史状态
│   ├── StatusBridgeLoggerProvider.cs  # 把日志桥接进状态服务
│   ├── StartupWarmupHostedService.cs  # 启动后预热登录一次
│   ├── VoiceNotificationStore.cs      # 语音通知待播报内存队列
│   └── VoiceNotifyRequest.cs          # 语音通知入站请求体
└── Tools/
    ├── FreightTools.cs                # 运输业务单 TransportOrder 工具
    ├── SeaExportTools.cs              # 海运出口 SeaExport 工具
    ├── SeaExportApiPaths.cs           # SeaExportAdmin 接口路径常量
    ├── ServiceTaskTools.cs            # 海出服务任务语音通知工具
    └── McpAiResponse.cs               # 统一工具返回格式(ok/message/data)
```

# 4. 启动流程 (Program.cs)

1. 初始化 Serilog（控制台 + `Logs/mcp-.log` 按天滚动，保留 31 天）。
2. `WebApplication.CreateBuilder`，先临时绑定随机端口，后按 `Status:Port` 绑定 `http://127.0.0.1:{port}`（**仅回环地址**）。
3. 注册单例：`IRuntimeStatusService`、`IVoiceNotificationStore`；绑定三个 Options 配置节。
4. 校验 `XiaoZhiMcp:WebSocketUrl` 必填，否则抛异常退出。
5. `AddHttpClient<IFreightApiClient, FreightApiClient>()`；`AddHostedService<StartupWarmupHostedService>()`。
6. `AddMcpServer().WithWebSocketServerTransport(url).WithTools<FreightTools>().WithTools<SeaExportTools>().WithTools<ServiceTaskTools>()`。
7. 映射 HTTP 端点：`GET /`（状态页）、`GET /api/status`（JSON）、`POST /api/notify/service-task`（语音通知 Webhook）。
8. `app.RunAsync()`。

# 5. MCP 工具清单 (Tools)

> 返回统一为 `McpAiResponse` 格式：`{ ok: true/false, message, data }`。约定 **`ok=true` 才算成功**，不能只看 HTTP 状态或字段数量。

## 5.1 FreightTools（运输业务单 TransportOrder）

| 工具名 | 说明 | 代理接口 |
| :-- | :-- | :-- |
| `freight_ping` | 检测货代 API 连通性与登录状态 | `Session/GetCurrentLoginInformations` |
| `TransportOrder_GetPagedList` | 按关键字（提单号/委托单号）分页搜索业务单 | `TransportOrderAdmin/GetPagedListAsync` |
| `TransportOrder_GetIsFinished` | 查询业务单是否已完结 | `TransportOrderAdmin/GetIsFinishedAsync` |

## 5.2 SeaExportTools（海运出口 SeaExport → SeaExportAdmin）

| 工具名 | 说明 | 代理接口 |
| :-- | :-- | :-- |
| `SeaExport_GetPagedList` | 按关键字/船名/航次分页搜索海运出口 | `SeaExportAdmin/GetPagedListAsync` |
| `SeaExport_Detail` | 获取海运出口详情 | `SeaExportAdmin/DetailAsync` |
| `SeaExport_GetDates` | 按船名/航次/ETD 查历史日期 | `SeaExportAdmin/GetDatesAsync` |
| `SeaExport_GetServiceTypesByPOL` | 查起运港服务项 | `SeaExportAdmin/GetServiceTypesByPOLAsync` |
| `SeaExport_Copy` | 复制海运出口（可选带费用） | `SeaExportAdmin/CopyAsync` |
| `SeaExport_Add` | 新增海运出口（传完整 JSON） | `SeaExportAdmin/AddAsync` |
| `SeaExport_Edit` | 编辑海运出口（JSON 含 id） | `SeaExportAdmin/EditAsync` |
| `SeaExport_Delete` | 删除海运出口 | `SeaExportAdmin/DeleteAsync` |
| `SeaExport_Help` | 返回本模块工具说明 | 无 |

## 5.3 ServiceTaskTools（海出服务任务语音通知）

| 工具名 | 说明 |
| :-- | :-- |
| `ServiceTask_GetNewNotifications` | 取出并播报待播报的新增服务任务通知，**取出即清空** |
| `ServiceTask_PendingCount` | 查看当前待播报数量，不清空 |

# 6. 语音通知链路 (Voice Notification)

由于小智云端 MCP 是**拉取式**协议（设备/AI 主动调用工具），服务端无法直接把语音推到设备。因此采用「主系统推送 → MCP 暂存 → 小智调用工具播报」的方案：

| 步骤 | 参与方 | 动作 |
| :-- | :-- | :-- |
| 1 | 主系统 `SeServiceTaskVoiceNotifyWorker` | 每小时查询最近一小时新增的 `SeServiceTask` |
| 2 | 主系统 `McpVoiceNotifier` | `POST /api/notify/service-task` 推送播报文案 |
| 3 | `Freight.Mcp` Webhook | 校验后入队 `VoiceNotificationStore`（内存队列，上限 100 条） |
| 4 | 小智 AI | 调用 `ServiceTask_GetNewNotifications` 取出并朗读 |

## Webhook：POST /api/notify/service-task

请求体（camelCase）：

```json
{
  "title": "海出服务任务提醒",
  "message": "最近一小时新增了 3 条海出服务任务，涉及航次：MSC ARIA/FE123。请及时处理。",
  "count": 3,
  "generatedAt": "2026-07-09T18:00:00+08:00",
  "items": [
    {
      "taskId": "...",
      "seaExportId": "...",
      "vessel": "MSC ARIA",
      "voyno": "FE123",
      "creationTime": "2026-07-09T17:12:00+08:00",
      "remark": ""
    }
  ]
}
```

响应：`{ "ok": true, "pending": 1 }`；`message` 为空返回 400。

# 7. 配置说明 (Configuration)

`appsettings.json` / `appsettings.Development.json`：

| 配置节 | 键 | 说明 |
| :-- | :-- | :-- |
| `XiaoZhiMcp` | `WebSocketUrl` | 小智 MCP 接入点，形如 `wss://api.xiaozhi.me/mcp/?token=xxx`（**必填**） |
|  | `ServerName` / `ServerVersion` | 小智后台显示的服务名与版本 |
|  | `ServerInstructions` | 给大模型的工具使用引导话术 |
| `FreightApi` | `BaseUrl` | 货代业务 API 基地址，如 `http://localhost:5010` |
|  | `UserName` / `Password` | 登录账号密码 |
|  | `TenantId` / `TenancyName` | 租户 ID 与编码 |
|  | `TokenRefreshBufferMinutes` | Token 提前刷新缓冲分钟数（默认 10） |
| `Status` | `Port` | 状态页/接口监听端口（默认 5099，仅 `127.0.0.1`） |

# 8. 部署与观测 (Deploy & Observability)

- **运行**：`dotnet run --project src/Freight.Mcp`（或发布后运行 `Freight.Mcp.exe`）。
- **状态页**：浏览器打开 `http://127.0.0.1:5099/`，每 3 秒自动刷新，展示当前阶段、说明、最近历史。
- **状态 JSON**：`GET http://127.0.0.1:5099/api/status`。
- **日志**：控制台 + `Logs/mcp-YYYYMMDD.log`。
- **启动预热**：`StartupWarmupHostedService` 启动后会先登录一次货代 API，便于尽早在状态页看到登录结果。

# 9. 避坑指南 (Pitfalls)

> [!IMPORTANT] **[1] 仅监听回环地址**：宿主 `UseUrls("http://127.0.0.1:{port}")`，`/api/notify/service-task` 只能被同机访问。主系统与 MCP **需同机部署**，否则需改监听地址。

> [!IMPORTANT] **[2] 判断成功看 `ok`**：ABP 接口即使 HTTP 200 也可能业务失败（`success=false`）。`FreightApiClient` 会解析并抛 `InvalidOperationException`，工具层通过 `AbpApiResponseHelper.IsBusinessSuccess` 判定。

> [!IMPORTANT] **[3] SeaExport ≠ TransportOrder**：海运出口必须用 `SeaExport_*`（AppService = `SeaExportAdmin`），不要用 `TransportOrder_*`。工具描述里已强调，避免大模型选错。

> [!IMPORTANT] **[4] 接口路径都带 Async 后缀**：如 `.../SeaExportAdmin/GetPagedListAsync`，漏写会 404。

> [!IMPORTANT] **[5] 语音通知需主动拉取**：入队后不会自动播报，必须由小智调用 `ServiceTask_GetNewNotifications`；否则堆积到 100 条后丢弃最旧。建议在 `ServerInstructions` 或小智智能体侧配置定时轮询/话术引导。

> [!IMPORTANT] **[6] 敏感信息**：`appsettings.json` 内含小智接入点 Token、货代 API 账号密码，属敏感配置，注意不要泄露。

# 10. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-09 | `Feature` | 新增 `ServiceTaskTools` 与 `/api/notify/service-task` Webhook，打通「主系统每小时新增海出服务任务 → 小智语音播报」链路。 | 复用 `McpAiResponse`/`RuntimeStatusService` 既有模式；受小智 MCP 拉取式协议限制，采用「推送-暂存-拉取播报」。 |
| 2026-07-09 | `Parsing` | 无（文档梳理） | 通读 `Program.cs`、`FreightApiClient`、`Freight/SeaExport/ServiceTask` 工具、Options 与 Services，沉淀本项目整体说明文档。 |
