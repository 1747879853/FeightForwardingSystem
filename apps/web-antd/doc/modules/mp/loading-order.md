---
title: 小程序 - 监装师傅端
module: 小程序（apps/mp）
author: auto-doc-sync
last_updated: 2026-09-06
---

# 1. 业务背景说明 (Background)

**白话解释：** 海运出口装箱要派师傅到堆场现场盯装。操作在管理端（海运出口编辑页「监装工单」Tab）开工单、勾监装要求、可指派师傅也可不指派丢进公共池。师傅这一侧原来只能靠线下，本小程序就是师傅的现场工具：抢公共池的单、看自己在做的单、逐箱填箱号封号、按类型拍照、勾完成。

代码位置 `apps/mp`（包名 `@vben/mp`），与管理端 `apps/web-antd` 完全独立，不共用 `@vben/*` 组件。

> 历史文档 `doc/plans/tapd-1000122-loading-supervision/05-监装工单.md` 写的「小程序不在本仓库」自 2026-08-23 起作废。

# 2. 功能与操作说明 (Features & Operations)

- **底栏四个 Tab：** 首页、监装、积分兑换、个人中心。第一期只有「监装」（监装列表）与「个人中心」有内容，首页与积分兑换是占位页。
- **列表（`pages/loading/list`）：** 顶部分段「新派 / 进行中 / 已完成」分别打接口状态 1/2/3；分段用 `components/skew-tabs/skew-tabs`（Canvas 2D 斜切白滑块），点击插值滑动。打开检索抽屉时卸掉 canvas；切底栏或进出详情不再控制 canvas。Tab 与卡片间距 24rpx；过渡写在列表里：`.list__fade` 为 `180deg #F9FAFD → #F0F2F8`，与选中滑块衔接，垫在内容卡片下面。视觉按 Figma「检索条件」稿：蓝渐变顶、口号渐变字、3D 插图压在 Tab 右侧、白卡片展示监装工号、状态徽标、主提单号、明细包装\*件数、船名航次、堆场、品名、下单日期与预计到货日期。支持下拉刷新、触底加载。
- **检索：** 点顶栏放大镜从右侧弹出「检索条件」抽屉，支持监装工单号（模糊）、主提单号（模糊）、监装堆场关键字（名称/地址/备注）、起运港、船公司、品名、预计到货日；有生效条件时放大镜带红点。起运港/船公司/品名点开底部面板，可搜关键字、每页 20 条、触底加载。起运港下拉两行对齐 PC：`EDI码/英文名` + `国家英文名 / 中文名`；船公司对齐 PC：`CODE(简称)`，下拉与选中回显都带 logo（无图则只显示文字）。检索用本地 `search-drawer`（右侧遮罩，不引用 `wd-popup`，避免微信把 `node-modules/wot-design-uni` 当无依赖丢掉）。打开时把 Tab 的 `hidden` 设为 true，`v-if` 卸掉 2d canvas，关掉再挂回。
- **详情（`pages/loading/detail`）：** 三张卡——基本信息（13 行）、监装要求（胶囊标签 + 详细说明）、集装箱要求（序号/箱型/箱号/封号/监装处理）。视觉对齐 Figma「检索条件-详情」。基本信息「监装堆场」有名称或地址时可点「导航」：腾讯 `geocoder` 把中文地址转经纬度后 `uni.openLocation`。
- **监装处理：** 箱行只留一个入口，展示待处理/已完成与已传张数；点开面板可改该箱箱号、封号、完成状态并按附件类型横排传图（每类型限 1 张）。箱号旁可「识别」：拍照/相册一张图只用来识别箱号，不进入监装照片。已认领时面板底栏点「保存」立即提交；点遮罩或关闭且未保存则还原该箱打开时的值。拍照与相册分入口，避免误开相机。
- **箱型编辑：** 只有已认领状态可在「监装处理」面板改箱号、封号、完成勾选；列表行只展示。不能加箱删箱。
- **按状态的底部操作条：**
  - 待认领 → 「认领」
  - 已认领 → 「拒接」（必填原因）；箱号/封号/照片/完成状态在监装处理面板内保存
  - 已完成 → 「取消完成」
- **监装照片：** 详情加载时并行调 `AttachmentDtlType/GetListByModuleTypesAsync`（`moduleTypes: [160100]`），把维护的类型铺成空槽，再叠上该箱已有 `attachmentGroups`。面板按类型横排网格，每类型限 1 张；有图则隐藏添加槽，相册/拍照都只选 1 张。拍照先出本地缩略图再上传，展示地址必须拼 `VITE_API_ORIGIN`。上传后先记本地，点「保存」才随箱提交。未配置类型时提示「未配置监装附件类型」，并保留一个未分类「监装照片」槽。
- **登录：** 启动静默登录（`wx.login` → `WxOpenSilentAuthenticate`）；未绑账号时登录页展示「手机号一键登录」。开发态可用账密（`VITE_ENABLE_PASSWORD_LOGIN=true`）。
- **个人中心：** 头像、昵称、账号、工号、手机号与退出登录。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 待认领（新派） | 师傅 认领 | 已认领 | 只能认领公共池（无师傅）的单；被人抢先报「该工单已被【xx】认领」，前端刷新详情 |
| 已认领（进行中） | 师傅 拒接（还剩人） | 已认领 | 只把自己移出，状态不变 |
| 已认领（进行中） | 师傅 拒接（列表空了） | 待认领 | 退回公共池 |
| 已认领（进行中） | 师傅在监装处理面板保存（全部箱勾完成） | 已完成 | 后端自动流转 |
| 已完成 | 师傅 取消完成 | 已认领 | **不会清各箱的完成勾选**，不手动取消至少一个箱就保存会立刻再次完成 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **carrierYard** | 监装堆场简要（id/名称/地址） | 详情 `carrierYard` | 有名称或地址时详情行显示「导航」；编码优先 `address`，否则退回 `name` | 地址在船公司资料维护，勿填地图短链 |
| **status** | 监装状态 | `LoadingOrder/GetMyPagedListAsync` | 决定详情底部按钮与箱型是否可编辑 | 师傅端只能查 1/2/3，传 0 报错 |
| **列表筛选** | 工单号/提单号/堆场关键字/起运港/船公司/品名/到货日 | `GetMyPagedListAsync` 的 `LoadingOrderMyQueryDto` | 三个 Tab 共用同一套筛选，只改 `status` | 堆场关键字搜堆场表名称/地址/备注；没选堆场的工单匹配不上 |
| **ctnNo / sealNo** | 箱号 / 封号 | 详情 `orderCtns`；箱号可走 `GeminiAdmin/UploadAndExtractCtnNoAsync` 预填 | 只有已认领可在监装处理面板改；识别只回填箱号，不改附件 | 各最长 32；识别失败 `ctnNo` 为 null 时手工填 |
| **isLoadingCompleted** | 该箱监装是否完成 | 详情 `orderCtns` | 全部箱为 true 时工单自动完成 | — |
| **attachmentGroups** | 分组监装照片 | 详情 `orderCtns[].attachmentGroups` + `AttachmentDtlType/GetListByModuleTypesAsync`（`160100`） | **触发/依赖：** 先铺维护类型空槽再填已有照片；类型横排；**按箱全量替换**，漏传该组等于清空该组 | 先 `POST /upload/UploadFile` 拿 `attachmentId`；**每类型最多 1 张**；空组不提交 |
| **rejectReason** | 拒接原因 | 前端填，`RejectAsync` | 多人先后拒接只保留最后一次 | 前端必填，最长 1024 |
| **loadingRequirements** | 监装要求 | 详情 | 师傅端只返回勾选了的明细，`isChecked` 恒 true | 师傅只读，不能改勾选 |
| **remark** | 工单详细说明 | 详情 `remark` | 与拒接原因是两个独立字段 | 管理端维护，师傅只读 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：入口靠用户属性，不是权限码]** 师傅端六个接口都不校验后台权限，只查当前登录人的 `UserAttribute` 是否含监装（512）。缺属性时后端报「当前登录人的用户属性不包含监装,无权使用监装功能」，前端捕获该文案后把监装 Tab 整页降级成「当前账号无监装权限」，其余 Tab 照常可用。 `GetMyAsync` 目前不返回 `userAttribute`，所以只能靠接口报错判断，无法提前预判。

> [!IMPORTANT] **[卡点 2：取消完成后的假完成]** `CancelCompleteAsync` 只改工单状态，不动各箱的 `isLoadingCompleted`。师傅若只是进去改个封号就保存，工单会立刻再次自动完成。页面在取消完成后强制弹窗提示「请先打开监装处理取消至少一个箱子的勾选再保存」。

> [!IMPORTANT] **[卡点 3：照片是全量替换]** `EditOrderCtnsAsync` 的 `attachmentGroups` 对每个箱是整体替换。保存只带有照片的分组；某类删光后不传该组，等于清掉该类。

> [!IMPORTANT] **[卡点 4：租户写死为 1]** 微信登录的租户取自服务端 `WxOpenConfig.TenantId`（恒为 1），前端不能传也没有输入口。多品牌需要各自的小程序 AppId 与独立打包，目前只支持一个租户。

> [!IMPORTANT] **[卡点 5：类型槽位靠枚举 + 附件类型维护]** 小程序按 `ModuleType=160100` 拉默认展示类型。枚举管理的 `ModuleType` 需有 `160100`（监装箱型附件），且附件类型勾了该模块，面板才会出现对应分组。类型接口失败时仍能打开详情，只展示工单已有分组。

> [!IMPORTANT] **[卡点 6：拍照缩略图必须先本地再拼完整 URL]** 上传接口返回的 `fileUrl` 常是相对路径。详情回填有 `buildAttachmentUrl`，拍照后若直接塞给 `<image>` 会空白，关掉面板或保存重进才显示。相机临时文件还会被 `uploadFile` 回收。当前流程：拍照 `saveFile` → 立刻占格 → 上传成功再换成带 origin 的地址，失败回退本地。

> [!IMPORTANT] **[卡点 7：识别箱号图不进监装附件]** `UploadAndExtractCtnNoAsync` 后端仍按 `UploadFile` 落附件，但小程序忽略 `attachmentId`，只把 `ctnNo` 写入输入框。`success=true` 且 `ctnNo` 为空要弹窗「未识别到箱号」，请求失败弹「识别失败」。不要在 `hideLoading` 后立刻 Toast，微信会把提示吃掉。

> [!IMPORTANT] **[卡点 8：列表堆场关键字搜堆场表]** `carrierYardKeyword` 模糊匹配 `CarrierYard.Name/Address/Remark`，不是工单备注。起运港/船公司/品名用自定义面板：关键字搜索、每页 20 条、触底加载。起运港走 `PortCodeAdmin/GetPagedListAsync`（与 PC 同一接口），下拉两行 `EDI/英文名`、`国家 / 中文名`；船公司走 `CarrierAdmin/GetPagedListAsync`，文案 `CODE(简称)`，下拉和选中回显都带 logo。

> [!IMPORTANT] **[卡点 9：每类型只能一张图]** 监装处理面板类型横排；相册/拍照都只选 1 张。有图则隐藏添加槽，换图要先删。历史多图仍展示，保存不会自动截成 1 张。

> [!IMPORTANT] **[卡点 10：堆场导航靠腾讯编码 + 微信 openLocation]** Key 配在 `VITE_QQMAP_KEY`，只给腾讯 `geocoder`；微信 `openLocation` 不吃 Key。微信后台须加 `https://apis.map.qq.com`，隐私指引声明位置用途。地址越完整编码越准；本期不存经纬度。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-06 | `Feature` | 详情监装堆场可一键导航到地图。 | 腾讯 geocoder + `uni.openLocation`；Key 见 `VITE_QQMAP_KEY`。详见 `changelogs/change-log-2026-09-06-mp-loading-yard-nav.md`。 |
| 2026-09-06 | `Fix` | 监装处理照片改为类型横排，每个类型只能上传一张；三列等大方格。 | 相册 `chooseImages` 改 count=1；有图隐藏添加槽；历史多图仍展示可删。详见 `changelogs/change-log-2026-09-06-loading-photo-one-per-type.md` |
| 2026-09-06 | `Fix` | 检索选中船公司后回显 logo | 选中时记下 `logoUrl`；检索栏左侧图标 + `CODE(简称)`；清空/重置同步清掉 |
| 2026-09-05 | `Fix` | 检索起运港/船公司下拉文案对齐 PC | 港口 `EDI/英文名` + `国家 / 中文名`；船公司 `CODE(简称)` + logo；港口改走 `PortCodeAdmin/GetPagedListAsync` |
| 2026-09-05 | `Feature` | 监装列表检索增加堆场关键字、起运港、船公司、品名 | `GetMyPagedListAsync`；选择面板关键字搜索并触底分页，不再截 200 条 |
| 2026-09-05 | `Feature` | 监装处理箱号旁可拍照/相册识别箱号，结果写入输入框，照片不进附件槽 | `GeminiAdmin/UploadAndExtractCtnNoAsync`；`ctnNo` 为空仍 success；失败用弹窗，勿在 hideLoading 后立刻 Toast |
| 2026-09-05 | `Fix` | 监装处理拍照后缩略图立刻显示，不必二次打开 | 相对 `fileUrl` 拼 origin；相机先 `saveFile` 占格；`hideLoading` 后重挂原生 image |
| 2026-09-05 | `Feature` | 监装处理先拉维护的附件类型再按类型分槽上传；未配置类型时提示并可传到未分类组 | `GetListByModuleTypesAsync(160100)` 与详情并行；`toEditableCtns` 合并空槽与已有照片；标题读 `name` 不是 `typeName` |
| 2026-08-30 | `Feature` | 箱号/封号/照片/完成状态在监装处理面板内保存，详情底栏不再单独放保存 | 关闭未保存时还原该箱快照；接口仍整单 `EditOrderCtnsAsync` |
| 2026-08-30 | `Fix` | 进详情时底栏按钮不再跟着系统 Tab 闪 | 进详情不再 `hideTabBar`（回来会丢底栏）；回列表补 `showTabBar`；详情底栏延后 180ms，并用 URL `status` 先画 |
| 2026-08-30 | `Feature` | 箱号、封号改在「监装处理」面板里填 | 集装箱表只展示；保存已改到面板内 |
| 2026-08-30 | `Fix` | 切页不再卸/延后挂 Tab canvas | 只在打开检索抽屉时 `hidden` 卸 canvas，避免切底栏闪动 |
| 2026-08-30 | `Fix` | 检索抽屉改为本地 `search-drawer`，不再用 `wd-popup` | 微信会把 `node-modules/wot-design-uni/.../wd-popup.js` 当无依赖丢掉，首页也会注册失败 |
| 2026-08-30 | `Fix` | 打开检索抽屉时 `v-if` 卸掉 Tab canvas | `hidden` 跟 `searchVisible`；只藏不够，必须卸原生节点 |
| 2026-08-30 | `Fix` | 斜切 Tab 恢复 Canvas 方案，检索抽屉改 `page-container` | 普通 view / PNG 还原不了 S 线；`page-container` 是假页，用来盖原生 canvas |
| 2026-08-30 | `Style` | 斜切 Tab 按 Figma `Rectangle 30` 路径还原 S 形圆弧 | 上凸 + 斜切 + 下凹；左右 PNG，高 68rpx，底 20rpx 接渐变 |
| 2026-08-30 | `Fix` | 斜切 Tab 去掉 canvas，改普通 view 绘制 | 微信 canvas 经常不走同层渲染，`z-index` / `root-portal` 都压不住；抽屉回到页面 `fixed` |
| 2026-08-30 | `Fix` | 检索抽屉改为页面级 `root-portal` 盖住 Tab canvas | 不再卸 canvas；`root-portal` 必须写在页面上，`z-index: 10000`。套在 `wd-popup` 里盖不住原生层 |
| 2026-08-30 | `Style` | 列表过渡渐变起点改为 `#F9FAFD`，与选中滑块衔接 | `.list__fade`：`180deg #F9FAFD → #F0F2F8` |
| 2026-08-30 | `Style` | 分段 Tab 选中滑块色改为 `#F9FAFD` | `skew-tabs` 的 `SLIDER_COLOR` |
| 2026-08-30 | `Style` | 分段 Tab 未选中底色改为 `#E3ECFF` | `skew-tabs` 的 `TRACK_COLOR` 与 `$tab-track` |
| 2026-08-30 | `Style` | 分段 Tab 未选中底色改为 `#FAFBFD` | `skew-tabs` 的 `TRACK_COLOR` 与 `$tab-track` |
| 2026-08-30 | `Style` | Tab 与内容卡片间距改为 24rpx | 只改 `.list` 的 `padding-top` |
| 2026-08-30 | `Style` | 渐变过渡条从 Tab 组件挪到列表，垫在内容卡片下 | `skew-tabs` 只留滑块；`.list__fade` 绝对定位、`pointer-events: none`，卡片 `z-index: 1` |
| 2026-08-30 | `Style` | Tab 下沿改为 `#FDFEFF → #F0F2F8` 渐变过渡条 | 不再叠卡片；Tab 行 88rpx，下伸 48rpx 渐变 `view` |
| 2026-08-30 | `Fix` | 选中 Tab 与第一张卡片中间断层（露底色） | 白滑块改回画满轨道底边，只裁顶角；列表 `margin-top: -26rpx` 叠上，过渡条只留在未选中段 |
| 2026-08-30 | `Style` | Tab 与列表卡片之间补上稿面 `#e3ecff` 过渡色条 | 轨道 114rpx、Tab 行 88rpx；过渡条在未选中段下沿，不能整宽切断选中白块 |
| 2026-08-30 | `Style` | 斜切 Tab 去掉段与段之间的平行分割线 | 只删 canvas 描边循环，滑块与 `fillText` 文案不变 |
| 2026-08-30 | `Fix` | 斜切 Tab 滑块能显示但「新派 / 进行中 / 已完成」看不见 | 微信 2d canvas 在原生层会盖住 view 文字；文案改为 `fillText` 画进 canvas，上层 view 只做热区 |
| 2026-08-30 | `Fix` | 修复微信开发者工具报 skew-tabs 被代码依赖分析忽略、页面找不到组件 | 组件改 easycom 目录 + `pages.json` `usingComponents`；关 `ignoreDevUnusedFiles`。Vue `import` 编成 JSON 后会被「过滤无依赖文件」丢掉 |
| 2026-08-30 | `Style` | 列表「新派 / 进行中 / 已完成」改为 Canvas 斜切滑块 Tab | 组件走 `components/skew-tabs/skew-tabs`；查 2d canvas 必须 `.in(组件实例)` |
| 2026-08-28 | `Style` | 底栏第二个 Tab 文案由「内部首页」改为「监装」 | 仅改 `pages.json` 的 `tabBar.list[].text`，路由仍是 `pages/loading/list` |
| 2026-08-26 | `Feature` | 详情箱列表合并为「监装处理」入口；面板内切换完成状态，拍照与相册分源；列表检索改为右侧抽屉 | 选图 `chooseImages` 改为必传 `sourceType`；相机一次 1 张、相册最多 9 张。状态改动仍走详情页保存 |
| 2026-08-26 | `Style` | 列表与详情按 Figma「检索条件 / 检索条件-详情」还原色值、字号、圆角、插图与图标 | token 主色改为 `#327aff`，页面底 `#eceef6`；插图用 Figma 透明 PNG。微信原生 tabBar 无法做成稿里的悬浮胶囊，只对齐颜色与图标；底栏已分选中/未选中 PNG |
| 2026-08-26 | `Chore` | 开发态后端改为津海通 `http://43.138.14.122:82`，不再连佳越测试 `:88` | `apps/mp/.env.development` 的 `VITE_API_ORIGIN`；须重启 `dev:mp-weixin`。正式包 `.env.production` 仍是 https 占位 |
| 2026-08-25 | `Chore` | `manifest.json` 填入津海通小程序 AppId，便于微信开发者工具登录与 `wx.login` | AppSecret 不进前端；后端凭据在 `App_WeixinAccessTokens`（`AppType=0`）。改 manifest 后须重启 `dev:mp-weixin` |
| 2026-08-25 | `Chore` | 开发态后端改为 `http://43.138.14.122:88`，停用 `118.190.1.4:82` | `apps/mp/.env.development` 的 `VITE_API_ORIGIN`；须重启小程序开发服务 |
| 2026-08-23 | `Feature` | 新增 `apps/mp` 小程序工程与监装师傅端第一期：登录（微信静默 + 手机号绑定 + 开发态账密）、监装列表三分段与检索、详情三卡与认领/拒接/保存/取消完成、分组照片面板、四个底栏 Tab（首页与积分兑换为占位）。 | 小程序不能用 `json-bigint`：其依赖 `bignumber.js` 会被打包器外部化成运行时找不到的 `require`，改为零依赖的 `safe-json.ts`（超安全范围整数先加引号再 parse），保持与 web-antd 一致的「ID 即 string」口径。`vite` 必须锁 5.2.8 以满足 `vite-plugin-uni` 的 peer；包内不提供 `build`/`dev` 脚本，`pnpm build` 与 `pnpm dev` 因此不会带上小程序。stylelint 对 `apps/mp` 需关 `rpx` 未知值校验与 `inset` 简写合并（旧 webview 不支持，遮罩会塌陷）。 |
