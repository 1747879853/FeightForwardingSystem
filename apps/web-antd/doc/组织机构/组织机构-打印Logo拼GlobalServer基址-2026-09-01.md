---
title: 组织机构 - 公司打印 Logo 拼 GlobalServer 基址
module: 组织机构
author: 系统
last_updated: 2026-09-01
---

# 1. 背景意图 (Background)

业务详情返回的 `CompanyPrintInfo.Logo` 原先直接取附件 `Url`。本地文件存储在 `ServerBaseUrl` 为 `http://localhost/` 时会把主机剥掉，留下相对路径（如 `/Uploads/...`）。打印端（FastReport 等）按相对路径拉图会失败，需要一条公网可访问的绝对地址。

# 2. 核心逻辑变更

`GetCompanyPrintInfoAsync`（`CsprojBuilderAppServiceBase`）在赋 `Logo` 时，对**相对路径**前拼接 `appsettings.json` 的 `GlobalServer:BaseUrl`（去尾斜杠后与 Url 去头斜杠拼接）。

| 附件 Url | 配置 `GlobalServer:BaseUrl` | 返回 `Logo` |
| :-- | :-- | :-- |
| `/Uploads/a.png` | `http://47.80.240.255:88` | `http://47.80.240.255:88/Uploads/a.png` |
| 已是 `http(s)://...` | 任意 | 原样，不再拼 |
| 有值但未配 BaseUrl | 空 | 原样相对路径 |

无 Logo 附件时字段仍为 `null`。所有走 `GetCompanyPrintInfoAsync` 的详情（海运出口/进口、空运出口、对账单、费用、更改单、分单等）一并生效，DTO 结构未变。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT] **1. 打印拿图看的是 `GlobalServer:BaseUrl`，不是 `App:ServerBaseUrl`。** 部署后要把 `GlobalServer:BaseUrl` 改成打印机能访问到附件的实际地址。配错或留空时，相对路径 Logo 打印端仍然拉不到图。

> [!NOTE] **2. 已是绝对地址的 Url 不会再拼。** 生产若 `App:ServerBaseUrl` 已是公网地址，附件 Url 本身就是 `http(s)://...`，不会变成「基址 + 整段绝对地址」。

> [!NOTE] **3. 用户打印 `GetUserPrintAsync` 的 `Logo` 没改。** 那条路径自己用 `UrlHelpers.GetAttachmentUrl`，不走 `CompanyPrintInfoDto`。

# 4. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-09-01 | `Fix` | `CompanyPrintInfo.Logo` 相对路径前拼 `GlobalServer:BaseUrl`，打印可直连 | 拼接点只在 `GetCompanyPrintInfoAsync`；`DefaultStoreProvider.GetDirectlyUrl` 会把 `http://localhost` 剥掉，所以本地附件 Url 经常是相对路径。已是 http(s) 的不拼，避免双重基址 |
