---
title: 分享页所属公司 Logo
module: 分享页
author: auto-doc-sync
last_updated: 2026-09-30
---

# 1. 业务背景说明 (Background)

**白话解释：** 分享给客户的页面，页头要显示**这一票业务所属公司**在组织管理里上传的 Logo。不是船公司 Logo，也不是前端打包时的品牌图。公司没传 Logo，或者按分享链接上的单号找不到业务，页头退回品牌图，页面本身要能打开。

所属公司指业务单 `OrgId` 向上找到的、组织类型为公司的那一级。Logo 文件就是该公司在组织管理上传的那张附件，和业务详情里「所属公司打印信息」的 Logo 是同一个值：相对路径前面已经拼好基址，本身就是 http 或 https 的原样返回。

# 2. 功能与操作说明 (Features & Operations)

- **监装分享：** 不新增接口。免登录公开详情 `DetailByMblAndLoadingOrderNumAsync` 的出参增加 `companyLogo`。师傅端详情、管理端详情共用同一个 DTO，也会带上。字段说明见《监装工单模块接口文档》第 7 节。
- **运踪分享：** 新增免登录查询 `ShareCompanyLogo/GetAsync`。三个页面用 `scene` 区分，单号都放在 `no`。
  - `scene=1`：现有海运运踪 `/tracking-map/{mblNo}`，`no` = 主提单号。在海运出口、海运进口里按主提单号找。
  - `scene=2`：空运轨迹 `/cargo-tracking/air?no=`，`no` = 航司单号。先按空运出口主运单号原文找；单号里的数字恰好 11 位时，再去掉主运单号中的连字符和空格后比对，并到空运跟踪订阅上按航司单号（`BusinessNumber`）和订阅时的主运单号原文（`SourceMblNum`）找。
  - `scene=3`：新海运轨迹 `/cargo-tracking/ocean`。只认链接里的 `no`。在海运出口、海运进口里按主提单号找，并到海运集装箱跟踪订阅上按上传的单号（`BillNo`）找。令牌 `t` 是编码后的轨迹地址，**不参与定位**。
- **什么时候是 null：** 没传 `scene` 或 `no`、`scene` 不是 1/2/3、一张业务都对不上、对上了但所属公司没上传 Logo。这几种都返回 `companyLogo: null`，接口成功，不报错。
- **多张业务对上同一个单号：** 取创建时间最新的一张（创建时间相同再比主键）。只看这一张的 Logo，不会因为这张没 Logo 就改用更早的一张。

# 3. 状态流转说明 (Status Transitions)

这个查询没有状态。不修改业务单，也不修改组织 Logo。

| 当前状态 | 触发人/动作    | 目标状态 | 状态说明                 |
| :------- | :------------- | :------- | :----------------------- |
| —        | 客户打开分享页 | —        | 只读 Logo 地址，没有流转 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **scene** | 哪个分享页 | 前端按页面写死 1/2/3 | **触发：** 决定 `no` 去哪类业务单里找 | 可空。空或非 1/2/3 时结果为 null，不报错 |
| **no** | 页面上已有的单号 | 路径或查询参数，原样传来 | **依赖：** 场景 3 没有 `no` 时无法定位 | 可空。空则结果为 null，不报错。前后空格会去掉 |
| **companyLogo** | 所属公司 Logo 直连地址 | 组织 Logo 附件，经 `GetCompanyPrintInfoAsync` | **依赖：** 先定位业务单，再按该单 `OrgId` 找到所属公司 | 可空。没上传或找不到业务时为 null |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：找不到业务不能报错]** 分享页没有登录，链接里也经常没有公司 id。单号对不上、公司没传 Logo，都只是页头换品牌图。接口必须返回 `companyLogo: null`，不能用「未找到业务」这类错误把整页打失败。监装公开详情不同：主提单号或工单号对不上时，详情接口仍然报错；只是对上之后 `companyLogo` 可以为 null。

> [!IMPORTANT] **[卡点 2：新海运轨迹的令牌不能当主键]** `/cargo-tracking/ocean?t=` 里的 `t` 是编码后的轨迹地址，解出来也不是业务单 id。只按同时带上的 `no` 定位。链接里没有 `no` 时直接 null。

> [!IMPORTANT] **[卡点 3：免登录没有租户]** 定位业务单时要关掉租户过滤，否则别的公司的单子看不见。找到之后必须切到那张单的租户，再去读组织 Logo。不切的话，附件查询按空租户过滤，有 Logo 也会变成 null。

> [!IMPORTANT] **[卡点 4：同一单号多张单]** 跨公司、或同一公司里出口和进口碰巧主提单号相同，都会命中多张。固定取创建时间最新的一张，结果稳定，但页头 Logo 跟的是这张单的所属公司，不是「有 Logo 的那张」。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-09-30 | `Feature` | 分享页头改为显示当前业务所属公司 Logo。监装公开详情补 `companyLogo`；三个运踪分享页新增免登录 `ShareCompanyLogo/GetAsync`（scene=1 主提单号，scene=2 航司单号，scene=3 链接 no） | Logo 不单独拼地址，统一走 `GetCompanyPrintInfoAsync(...).Logo`，和业务详情打印信息保持同一口径。运踪三类合成一个接口，用 scene 区分找单规则，避免三个地址各写一套 null 约定。多条命中按 `CreationTime` 降序再按 `Id` 降序取一条 |

# 7. 代码位置与受影响文件 (Code Map)

## 7.1 新增文件清单

| 文件 | 内容 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/ShareCompanyLogo/IShareCompanyLogoAppService.cs` | 免登录查询接口 |
| `src/CsprojBuilder.Application/App/ShareCompanyLogo/ShareCompanyLogoAppService.cs` | 按 scene 跨租户找业务单，切租户后取所属公司 Logo |
| `src/CsprojBuilder.Application/App/ShareCompanyLogo/Dto/ShareCompanyLogoDto.cs` | 场景枚举、查询入参、出参。出参不挂 AutoMap，它不是某张表的投影 |
| `文档/分享页/分享页公司Logo模块总逻辑文档.md` | 本文档 |
| `文档/分享页/分享页公司Logo模块接口文档.md` | 前端接口文档 |

## 7.2 修改的已有文件清单

| 文件 | 改了什么 |
| :-- | :-- |
| `.../App/LoadingOrder/Dto/LoadingOrderDto.cs` | `LoadingOrderDetailDto` 增加 `CompanyLogo` |
| `.../App/LoadingOrder/LoadingOrderQueryHelper.cs` | `MapDetailAsync` 按业务单 `OrgId` 填 Logo |
| `.../App/LoadingOrder/LoadingOrderAppService.cs` | 师傅端详情与公开详情传入打印信息 Logo |
| `.../App/LoadingOrder/LoadingOrderAdminAppService.cs` | 管理端详情传入打印信息 Logo |
| `.../App/LoadingOrder/ILoadingOrderAppService.cs` | 公开详情注释补上 Logo |
| `.../App/LoadingOrder/ILoadingOrderAdminAppService.cs` | 管理端详情注释补上 Logo |
| `文档/监装/监装工单模块总逻辑文档.md` | 补 `companyLogo` 口径与变更记录 |
| `文档/监装/监装工单模块接口文档.md` | 详情出参补 `companyLogo` |

## 7.3 接口文件 ↔ 文档映射

| 代码文件 | 对应文档 |
| :-- | :-- |
| `ShareCompanyLogoAppService.cs` | 本文档全文；《分享页公司Logo模块接口文档》 |
| `Dto/ShareCompanyLogoDto.cs` | 《分享页公司Logo模块接口文档》第 2 节 |
| `LoadingOrder` 详情 DTO 与 `MapDetailAsync` | 《监装工单模块总逻辑文档》《监装工单模块接口文档》第 7、12 节 |

## 7.4 数据库变更

无。不新增表、不改列。Logo 仍是组织上已有的附件。
