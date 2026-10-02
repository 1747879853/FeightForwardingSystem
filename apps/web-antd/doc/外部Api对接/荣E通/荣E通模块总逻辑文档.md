---
title: 荣E通对接
module: 外部Api对接
author: 系统
last_updated: 2026-10-01
---

# 1. 业务背景说明 (Background)

**白话解释：**

- **场站箱数据：** 按海运出口向荣E通要场站里的箱数据，用来回填船名、船公司航次和业务箱。一次可以选多票。某一票缺主提单号、缺场站或对方报错，不影响其他票，失败原因跟委托编号一起返回。联系人、包装、VGM、冻柜、目的港、集港时间都不回写。
- **即时运价：** 按起运港、目的港、两端运输类型和箱型，向荣E通查各船司的即时运价。运输类型由前端传入，`CY` 是堆场，`SD` 是门点。内容包括船名航次、开船和预抵日期、航程、海运费、附加费和目的港滞箱滞港费。对外是同步接口：箱型不限个数，后端等查完再返回，最长 5 分钟，超时的箱型判为失败。1 小时内起运港、目的港、运输类型、箱型都相同才复用之前的结果，不再扣次数。订阅运价没接。
- **国内舱单和 VGM：** 只接了后端私有调用，暂无对外接口，以后做舱单业务时直接调用。上海舱单 6 个接口（发送、重发、改单、删单、查询、船代查询），青岛舱单 8 个（发送、补发分票、重发、改单、改配、删单、查询、船代查询），VGM 3 个（发送、重发、查询）。三方推送结果的回调没接。
- **对外文案：** 返回给前端的报错、失败原因里一律把对方叫「三方接口」，不出现荣E通。日志照常写荣E通和原文。

# 2. 功能与操作说明 (Features & Operations)

- **批量查询并回写：** 前端传海运出口 Id 列表。后端用该票主提单号（转大写）和场站简称去查。查到箱子后：同一箱号的分票合成一箱，件数、毛重、体积相加；箱型、封号、皮重、船名、航次各分票必须一致，否则整票不回写。各箱船名、航次也必须一致，才写到海运出口的船名和船公司航次。
- **跳过已提箱：** 入参 `skipPickedUp` 为 true 时，`IsPickedUp` 已经是 true 的票不查询、不改数据、不算失败。
- **没有箱子：** 不改船名、航次、是否提箱，也不删原业务箱，并且不算失败。
- **有箱子：** 先删掉该票全部业务箱，再按箱型表现形式 `CtnName` 完全相等插入。对不上的箱子不插入，这一票仍算成功。是否提箱改为 true。分票不一致导致未回写时，是否提箱也不改。
- **不回写：** 场站联系人、包装、主提单号，以及 VGM、是否冻品、是否危险品、英文目的港、计划集港时间、温湿度通风。
- **支持的港口五字码：** 荣E通港口基础数据里的 911 个五字码写在后端 `RongETongPortCodes`，不落库，也不单独给接口。前端把同一份名单写死。选完起运港、目的港后，用港口 EDI 代码在本地判断；有一个不在里面，就提示「港口不支持」，不要调用即时运价查询。
- **即时运价查询（`SpotQueryAsync`）：** 前端传起运港、目的港、两端运输类型和箱型，箱型不限个数。运输类型必填，只接受 `CY`（堆场）和 `SD`（门点），原样发给三方接口。后端先校验运输类型和港口 EDI 代码，再核对五字码是否在上述 911 个里，不在则提示「港口不支持」，不复用、不创建任务、不请求三方接口。通过后再校验箱型表现形式：去空格转大写后只接受 `20GP`、`40GP`、`40HC`、`45HC`、`20NOR`、`40NOR`、`20RF`、`40RF`、`40RH`、`20OT`、`40OT`，不再把结尾 `HQ` 换成 `HC`，不在则提示不支持的箱型，并列出支持的箱型。然后按下面的顺序处理，最后每个箱型返回一条结果，顺序和传入一致。
- **复用：** 1 小时内起运港、目的港、两端运输类型、箱型都相同、且不是失败的查询记录直接复用，不创建任务、不扣次数。运输类型不同不算同一条。复用到执行中的记录，会接着查任务状态、取结果。不分用户都复用。
- **创建任务：** 没有可复用记录的箱型去创建任务。三方接口一次最多 3 个箱型，超过的每 3 个一批拆成多次请求。每批任务号拿到马上用独立工作单元落库，后面超时或报错都不会丢。三方接口没返回某个箱型的任务号时，该箱型记为失败。
- **轮询取结果：** 每 3 秒查一次任务状态，三方接口一次最多查 10 个任务号，超过的拆成多次请求。任务已完成就取结果，把结果 JSON 存进记录并标为已完成；任务级报错（例如任务不存在）标为失败。
- **等满 5 分钟还没完成：** 直接判为失败，本次返回的失败原因是「三方接口查询超时」。失败的记录不复用，再查会重新创建任务、重新扣次数。
- **即时运价报错：** 校验不通过、三方接口账号或权益有问题、请求失败时，整次请求报错，不逐个箱型返回。报错之前已经落库的任务号和结果都保留，重试时复用。文案见第 4 节「即时运价、舱单报错」。
- **舱单私有调用（`PostManifestAsync<T>`）：** 第一个参数是接口名常量 `Manifest*Action`，第二个是业务参数。查询接口的业务参数在请求体顶层（上海、青岛用 `RongETongManifestQueryParam`，VGM 用 `RongETongVgmQueryParam`），其余接口都是 `RongETongManifestRequest<明细类型>`，明细放在 `detail` 下。每个接口用哪个类型见第 4 节「舱单私有调用」。
- **外部交易号 outTradeCode：** 一份舱单（一份 VGM）固定一个，首次发送时由调用方生成并保存，之后重发、改单、删单、查询都传同一个，不能改。
- **结果通知地址 notifyUrl：** 上海发送、青岛发送、VGM 发送和重发必填，其余接口不传。
- **舱单返回：** 发送、重发、改单、删单、改配、补发分票的 data 是 bool。状态码成功但 data 为 false 也按失败抛错，所以调用方拿到返回值就是成功。查询返回明细对象。报错和即时运价走同一套，文案见第 4 节「即时运价、舱单报错」。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 未提箱 | 对方返回了箱子并完成回写 | 已提箱 | 同时删原箱、插入匹配上的箱。箱型对不上的不插入 |
| 已提箱 | `skipPickedUp=true` | 已提箱 | 不查询、不改数据 |
| 票上已有业务箱 | 对方没有箱子 | 不变 | 不算失败 |
| 票上已有业务箱 | 分票字段不一致 | 不变 | 返回失败原因，文案带「未回写」 |
| 即时运价：没有可复用记录 | 创建任务并拿到任务号 | 执行中 | 任务号马上落库 |
| 即时运价：没有可复用记录 | 创建任务没返回该箱型的任务号 | 失败 | 本次返回失败原因「三方接口未返回查询任务号」。失败的记录不复用 |
| 即时运价：执行中 | 查任务状态为已完成，取到结果 | 已完成 | 结果 JSON 存进 `ResultJson` |
| 即时运价：执行中 | 查任务状态带任务级错误，例如任务不存在 | 失败 | 本次返回失败原因「三方接口查询任务已失效」。下次同样条件会重新创建任务 |
| 即时运价：执行中 | 等满 5 分钟仍未完成 | 失败 | 本次返回失败原因「三方接口查询超时」。下次同样条件会重新创建任务 |
| 即时运价：执行中 | 查询中途报错，例如三方接口请求失败 | 执行中 | 整次请求报错。1 小时内再查同样条件会接着取结果 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **SeaExportIds** | 要查的海运出口 | 前端传入 | 重复 Id 只处理一次 | 必填，至少一票。没选则整批报错。 |
| **SkipPickedUp** | 是否跳过已提箱 | 前端传入 | 为 true 时跳过 `IsPickedUp` 已是 true 的票 | 不传按 false。跳过不算失败。 |
| **IsPickedUp** | 是否提箱 | 海运出口列，列表和详情返回 | 本接口在回写箱子时改为 true。新建、编辑、复制都不写 true | 不可编辑。复制出的新票为 false。 |
| **CommissionNum** | 失败票的委托编号 | `TransportOrder.CommissionNum` | 只出现在失败结果里 | 票不存在时为空。 |
| **Reason** | 失败原因 | 枚举 `RongETongRealQueryFailReason`，返回整数 | 成功和「没有箱子」不产生原因 | 前端按枚举值出文案，接口不返回文本。 |
| **MblNum** | 主提单号 | 票上的主提单号，发给对方 `detail.billNo` | 去空格并转大写。不回写 | 必填。只允许大写字母或数字，长度 6 到 30。 |
| **Yard.Name** | 场站简称 | 海运出口场站的客户简称，发给对方 `detail.stationName` | 不用场站代码 | 必填，最长 20 个字符，须与对方基础数据逐字一致。 |
| **Vessel / InnerVoyno** | 船名、船公司航次 | 合并后的各箱必须一致 | 非空才覆盖。不写码头航次 | 最长 64。 |
| **CtnNo / SealNo / CtnName / PKGS / GrossWeight / Volume / TareWeight** | 箱号、封号、箱型、件数、毛重、体积、皮重 | 同一箱号的分票 | 件数、毛重、体积相加。皮重、封号、箱型必须一致。箱型按 `CtnName` 找 `CtnCodeId` | 对不上箱型则该箱不插入。 |

**即时运价**（接口 `SpotQueryAsync`。括号里是三方接口的字段名）

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **POLId / PODId** | 起运港、目的港 | 前端传入，系统海运港口 | 取港口 `EdiCode` 转大写发送（`polCode` / `podCode`） | 必填。港口不存在或没维护 EDI 代码时报错。五字码不在代码里的 911 个里，提示「港口不支持」，不请求三方接口。 |
| **PolServiceType / PodServiceType** | 起运港、目的港运输类型 | 前端传入，并写入查询记录 | 发给三方接口 `polServiceType` / `podServiceType`。1 小时复用时必须和记录上的值相同 | 必填。只接受 `CY`（堆场）、`SD`（门点），空或不认识的值报错。 |
| **CtnCodeIds** | 箱型 | 前端传入，系统箱型 | 取表现形式去空格转大写后原样发送（`sizeTypes`），不再把结尾 `HQ` 换成 `HC`。每个箱型一个任务，每 3 个一批创建 | 必填，至少 1 个，不限个数，重复 Id 去重。表现形式为空、转大写后重复，或不在 `20GP`、`40GP`、`40HC`、`45HC`、`20NOR`、`40NOR`、`20RF`、`40RF`、`40RH`、`20OT`、`40OT` 里时报错。 |
| **Status** | 查询状态 | 查询记录，枚举 `RongETongSpotQueryStatus` | 0 执行中，1 已完成，2 失败。接口返回时只会是 1 或 2 | — |
| **IsReused** | 是否复用 | 按查询记录判断 | 1 小时内同样条件、不是失败的记录才复用 | — |
| **CreationTime** | 查询时间 | 查询记录的创建时间 | 复用时是原记录的时间 | — |
| **ErrorMessage** | 失败原因 | 本次查询过程中产生，不落库 | 只在失败时有值 | 文案不带供应商名称。 |
| **SpotList** | 运价，每条是一个船司的一个船名航次 | 查询记录里的结果 JSON，读的时候解析 | 只在已完成时有值，其他状态为空数组 | — |
| **CarrierCode** | 船司代码 | 三方接口的编码，如 `MSK`、`EMC` | 原样返回 | 和系统船公司 `Code`、`EdiCode` 不一定一致。 |
| **Vessel / InnerVoyno** | 船名、船公司航次（`vesselName` / `voyage`） | 三方接口 | 三方接口的 `voyage` 是航次 | — |
| **Voyage** | 航程，单位天（`sailingTime`） | 三方接口 | 和系统运价 `SeFreiPrice.Voyage`（航程）同义 | — |
| **ETD / ETA** | 开船、预抵日期（`polEtd` / `podEta`） | 三方接口 | 转成本地时间后只取日期 | — |
| **IsDirect / IsSoldOut** | 是否直达、是否售罄 | 三方接口的整数 0/1 | 转成 bool | — |
| **ValidTimeEnd** | 报价有效期截止（`quotationPeriodEnd`） | 三方接口 | 和系统运价的有效时间止同义 | 可能为空。 |
| **FreightAmount / TotalAmount** | 海运费、总费用，各带币别代码 | 三方接口 | 原样返回 | — |
| **FeeGroupInfoList** | 附加费，按费用分类分组 | 三方接口 | 计费单位 `CNTR` 转成 `PriceFeeType.Ctn`（按箱），`BL` 转成 `PriceFeeType.Order`（按票），其他单位为空 | 费用名称是英文全称，和系统费用名称不一定一致。 |
| **DndGroupInfoList** | 目的港滞箱、滞港、堆存费用区间 | 三方接口 | 类型 1 滞箱，2 滞港，3 堆存，4 合并计算 | 费用和单价是字符串，原样返回。 |

**即时运价、舱单报错**

| 情形 | 报错文案 |
| :-- | :-- |
| 没选起运港或目的港 | 请选择起运港和目的港 |
| 没选运输类型，或不是 CY、SD | 请选择起运港运输类型 / 请选择目的港运输类型 |
| 没选箱型 | 请选择箱型 |
| 港口不存在或没维护 EDI 代码 | 起运港不存在或未维护 EDI 代码 / 目的港不存在或未维护 EDI 代码 |
| 五字码不在荣E通港口基础数据的 911 个里 | 港口不支持 |
| 箱型 Id 查不到 | 箱型不存在 |
| 箱型没维护表现形式 | 箱型未维护表现形式 |
| 两个箱型转大写后相同 | 所选箱型重复 |
| 表现形式不在允许的 11 种里 | 不支持的箱型用顿号拼在前面，例如 `40HQ不支持，支持的箱型：20GP、40GP、40HC、45HC、20NOR、40NOR、20RF、40RF、40RH、20OT、40OT`。多个不支持的箱型同样用顿号隔开 |
| 未配置 `BaseUrl` | 未配置三方接口地址，请联系管理员 |
| 未配置 `AccessKey` 或 `SecretKey` | 未配置三方接口账号，请联系管理员 |
| 请求超时 | 三方接口请求超时，请稍后重试 |
| 请求异常；或 HTTP 不是 200 且返回不是 JSON | 三方接口请求失败，请稍后重试 |
| 返回为空；或状态码成功但没有 data | 三方接口返回为空 |
| HTTP 200 但返回不是 JSON、缺状态码、data 解析不了 | 三方接口返回格式错误 |
| 100001 参数无效 | 三方接口参数无效 |
| 100002 请求超出有效时间 | 三方接口请求已过期，请联系管理员 |
| 100003 账号不存在 | 三方接口账号不存在，请联系管理员 |
| 100004 账号已停用 | 三方接口账号已停用，请联系管理员 |
| 100005 验证签名失败 | 三方接口签名验证失败，请联系管理员 |
| 100006 请求重复 | 三方接口请求重复，请重新发起 |
| 200002 客户 ID 不存在（舱单删单、查询） | 三方接口客户不存在，请联系管理员 |
| 200013 无有效支付权益（青岛改配、删单） | 没有有效的舱单权益，请联系管理员 |
| 200014 商户订单重复支付（青岛改配、删单） | 该舱单操作已提交过，请勿重复提交 |
| 230000 箱型数据格式错误 | 箱型格式不正确 |
| 230001 港口数据格式错误 | 起运港或目的港代码不正确 |
| 230002 企业没有申请开通 | 未开通即时运价查询，请联系管理员 |
| 230003 无有效的即时运价权益 | 没有有效的即时运价权益，请联系管理员 |
| 230005 免费次数不足且无权益 | 即时运价免费查询次数已用完，请联系管理员 |
| 999999 系统错误 | 三方接口暂时不可用，请稍后重试 |
| 其他状态码 | 三方接口返回失败，请稍后重试 |
| 状态码成功但 data 为 false（舱单发送、改单、删单这类） | 三方接口返回失败，请稍后重试 |

**舱单私有调用**（`PostManifestAsync<T>`。路径接在 `RongETong:ManifestPathPrefix` 后面，默认 `/api/manifest/openapi`）

| 接口名常量 | 三方路径 | 业务参数 | data |
| :-- | :-- | :-- | :-- |
| `ManifestShanghaiSendAction` | `shanghai/sendManifest` | `RongETongManifestRequest<RongETongShanghaiManifestDetail>`，`NotifyUrl` 必填 | bool |
| `ManifestShanghaiReSendAction` | `shanghai/reSendManifest` | 同发送，不带 `NotifyUrl` | bool |
| `ManifestShanghaiUpdateAction` | `shanghai/updateManifest` | 同重发，`AddManifestFlag` 不传 | bool |
| `ManifestShanghaiDeleteAction` | `shanghai/delManifest` | `RongETongManifestRequest<RongETongManifestDeleteDetail>`，`DelType` 不传 | bool |
| `ManifestShanghaiQueryAction` | `shanghai/queryManifest` | `RongETongManifestQueryParam`，在顶层 | `RongETongShanghaiManifestData` |
| `ManifestShanghaiShipAgentAction` | `shanghai/queryShipAgent` | `RongETongManifestRequest<RongETongShipAgentQueryDetail>` | `RongETongShipAgentData` |
| `ManifestQingdaoSendAction` | `qingdao/sendManifest` | `RongETongManifestRequest<RongETongQingdaoManifestDetail>`，`NotifyUrl` 必填 | bool |
| `ManifestQingdaoAddSubAction` | `qingdao/addSubManifest` | `RongETongManifestRequest<RongETongQingdaoAddSubManifestDetail>` | bool |
| `ManifestQingdaoReSendAction` | `qingdao/reSendManifest` | 同发送，不带 `NotifyUrl`，`DraftPlanType`、`WebCode` 不传 | bool |
| `ManifestQingdaoUpdateAction` | `qingdao/updateManifest` | 同重发 | bool |
| `ManifestQingdaoUpdateConfigAction` | `qingdao/updateManifestConfig` | `RongETongManifestRequest<RongETongQingdaoManifestConfigDetail>` | bool |
| `ManifestQingdaoDeleteAction` | `qingdao/delManifest` | `RongETongManifestRequest<RongETongManifestDeleteDetail>`，`DelType` 必填 | bool |
| `ManifestQingdaoQueryAction` | `qingdao/queryManifest` | `RongETongManifestQueryParam`，在顶层 | `RongETongQingdaoManifestData` |
| `ManifestQingdaoShipAgentAction` | `qingdao/queryShipAgent` | 同上海港船代查询 | `RongETongShipAgentData` |
| `ManifestVgmSendAction` | `vgm/sendManifest` | `RongETongManifestRequest<RongETongVgmDetail>`，`NotifyUrl` 必填 | bool |
| `ManifestVgmReSendAction` | `vgm/reSendManifest` | 同发送，`NotifyUrl` 也必填 | bool |
| `ManifestVgmQueryAction` | `vgm/queryManifest` | `RongETongVgmQueryParam`，在顶层 | `RongETongVgmData` |

**舱单字段名**：DTO 里能对上系统字段的用系统字段名，见下表；其余属性沿用三方字段名（如 `CarrierName`、`PackageNum`）。写了「取三方基础数据」的字段（船公司、货物类型、提单类型、付款方式、港口、船代、箱型、货主箱、包装、国家等）要填三方基础数据里的写法，如 `APL-美国总统`、`SHANGHAI | CNSHA`、`CN-中国`，不是系统里的名称。

| DTO 属性 | 三方字段 | 说明 |
| :-- | :-- | :-- |
| `MblNum` | `masterBillNo` | 主提单号 |
| `BlNum` / `BlNums` | `houseBillNo` / `houseBillNos` | 分提单号，对应系统分单的 `BlNum`。查询示例里它和主提单号相同 |
| `Vessel` | `oceanVessel`（VGM 是 `vessel`） | 船名 |
| `InnerVoyno` | `voyage` | 航次，按船公司航次 |
| `CtnNo` | `containerNo` | 箱号 |
| `Volume` | `cbm` | 体积 |
| `Marks` | `marking` | 唛头。青岛主单上的是主单唛头，只有要自定义时才传 |
| `GoodsDes` | `description` | 英文品名。青岛主单上的是主单品名，只有要自定义时才传 |
| `ReeferTemperature` | `temperature` | 冷藏温度 |
| `ReeferVentilation` | `reefer` | 通风量，只有青岛有 |
| `DgNo` | `undgNo` | 危险品 UN 编号 |
| `DgLevel` | `undgClass` | 危险品分类 |
| `DgContact` / `DgTel` | `undgLinkMan` / `undgLinkTele` | 危险品联系人、电话。上海在货物明细上，青岛在主单上 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：账号没配]** `appsettings` 的 `RongETong:AccessKey`、`SecretKey` 为空时，整批直接报「未配置三方接口账号，请联系管理员」，不会逐票返回。

> [!IMPORTANT] **[卡点 2：场站用简称]** 发给对方的是场站客户简称，不是代码。简称必须和对方基础数据里的名称一致，例如「港捷丰场站」，最长 20 个字符。

> [!IMPORTANT] **[卡点 3：有箱子就会删原箱]** 对方只要返回了箱子，就先删掉该票全部业务箱，再插入箱型匹配上的。箱型是 `40RH` 而系统表现形式是 `40RF` 时，这一箱不会插入，原箱也没了。对方一个箱子都没返回时，不动原数据。

> [!IMPORTANT] **[卡点 4：分票先合并]** 同一个箱号多行时，件数、毛重、体积相加，皮重不相加。箱型、封号、皮重、船名、航次有冲突则整票不回写。

> [!IMPORTANT] **[卡点 5：主提单号字段名]** 请求里的主提单号用示例报文的 `billNo`。参数表写的是 `masterBillNo`。若失败原因是「参数无效」，再改字段名。

> [!IMPORTANT] **[卡点 12：五字码不在荣E通港口基础数据里就不能查运价]** 支持的五字码是荣E通港口基础数据里的 911 个，写在 `RongETongPortCodes` 里，不落库，也不提供查询接口。前端把同一份名单写死。系统港口表里有这个港口、但五字码不在这 911 个里，提示「港口不支持」，不复用旧结果、不创建任务、不请求三方接口、不扣次数。前端在调用即时运价之前本地判断，不支持就提示，不要发查询请求。

> [!IMPORTANT] **[卡点 6：即时运价创建任务会扣次数]** 每创建一次任务，就消耗一次即时运价权益或免费查询次数。所以任务号一拿到就用独立工作单元落库，1 小时内同样条件复用；查询中途报错后重试会接着取结果，不会重复创建。但等满 5 分钟判为失败的不复用，再查会重新扣次数。两个人同时查同样条件、库里都还没有记录时，会各建一次任务。查询记录按港口 Id、箱型 Id 复用，这两个 Id 本身分租户，不同租户之间不会复用。

> [!IMPORTANT] **[卡点 7：箱型只接受固定的 11 种]** 不再把结尾的 `HQ` 换成 `HC`。表现形式去空格转大写后，必须是 `20GP`、`40GP`、`40HC`、`45HC`、`20NOR`、`40NOR`、`20RF`、`40RF`、`40RH`、`20OT`、`40OT` 之一，否则整次报错，写明哪个箱型不支持，并列出支持的箱型，例如「40HQ不支持，支持的箱型：20GP、40GP、40HC、45HC、20NOR、40NOR、20RF、40RF、40RH、20OT、40OT」。不复用、不创建任务、不请求三方接口。系统里写成 `40HQ` 的高箱不会再被改成 `40HC`。

> [!IMPORTANT] **[卡点 11：同步等待最长 5 分钟]** 接口每 3 秒查一次任务状态，最多等 5 分钟，超时的箱型判为失败。实测一次查询 105 秒才返回，所以从 120 秒放宽到 5 分钟。前端请求超时同样是 5 分钟。等满 5 分钟后还要再查一轮状态、取已完成的结果，返回可能晚几秒；前端先超时的，后端照样跑完，已完成的箱型已经落库，1 小时内同样条件重查直接复用。调三方接口的单次 HTTP 超时仍是 60 秒，管的是一次调用，不是整个等待。IIS 是进程内托管，`web.config` 的 `requestTimeout` 不限制这类长请求。方法不开事务（`[UnitOfWork(false)]`），避免一个请求把事务和数据库连接占住几分钟；任务号和结果都走独立工作单元即时提交。

> [!IMPORTANT] **[卡点 8：对方的 voyage 是航次，不是航程]** 对方的 `voyage` 是航次，DTO 里映射到 `InnerVoyno`。对方的航程是 `sailingTime`（天），映射到 `Voyage`，和系统运价 `SeFreiPrice.Voyage`（航程）同义。按对方字段名去对系统字段，会把航次写进航程。

> [!IMPORTANT] **[卡点 9：业务参数里的键也要排序后签名]** 场站的 `detail`、运价的 `param`、舱单的 `detail` 是 JSON 结构，里面每一层的键都按 ASCII 排序后，用紧凑 JSON 参与签名；数组元素顺序不变。请求体按同一份排好序的 JSON 发送。为空的字段不发送，也不参与签名。场站和运价两份文档都没写这条，出处是对方官网开票接口的签名说明「包括 value，如果 value 为json 结构，也需要排序」。创建运价任务排序后是 `podCode`、`podServiceType`、`polCode`、`polServiceType`、`sizeTypes`，按文档示例顺序签名会报 100005「验证签名失败」。场站的 `billNo`、`stationName` 本来就是字典序，不受影响。顶层参数值是字符串的（舱单发送的 `notifyUrl`，舱单查询的 `outTradeCode`、`masterBillNo`、`billNo`）原样拼进签名，不加引号。

> [!IMPORTANT] **[卡点 10：运价只给了正式地址]** 运价路径前缀默认 `/api/rpasearch/openapi/spot`，可用 `RongETong:SpotPathPrefix` 覆盖。`BaseUrl` 和场站共用，切到测试地址时，运价前缀要按对方给的测试地址一起改。

> [!IMPORTANT] **[卡点 13：舱单只有私有调用]** 只接了 `PostManifestAsync<T>` 和报文 DTO，没有对外接口，也不落库。系统里还没有存外部交易号和发送结果的字段，做发送舱单时要先加，结果回调也要另外接（卡点 15）。

> [!IMPORTANT] **[卡点 14：外部交易号一份舱单固定一个]** `outTradeCode` 首次发送时定下，之后重发、改单、删单、查询都传同一个，不能改。VGM 同理。

> [!IMPORTANT] **[卡点 15：结果回调没接]** 海关回执、VGM 各渠道状态由三方推到发送时传的 `notifyUrl`。接收方必须原样返回 `success` 七个字符，否则三方 25 小时内重发 8 次（间隔 4 分钟、10 分钟、30 分钟、1 小时、2 小时、6 小时、15 小时）。所以要对外开一个匿名接口，不能包 ABP 的返回结构。回调的签名算法文档没写；VGM 回调示例把 `accessKey`、`notifyDate`、`notifyID`、`signType`、`sign` 写进了 `content`，参数表在顶层。目前只能用查询接口看状态。

> [!IMPORTANT] **[卡点 16：舱单字段的 JSON 类型按文档示例发]** 对方怎么验签文档没写，多发一个对方没有的字段、或者把数字发成字符串，都可能报 100005「验证签名失败」。DTO 按文档示例报文定类型：件数 `packageNum`、提单份数 `originalNumber`、危险品分类 `undgClass`、温度 `temperature` 是字符串；毛重、体积、VGM 重量是数字；联系人类型、是否加单、计划发送类型、删单类型、发送渠道、云港通结算方式是整数。没赋值的字段不发送。验签失败时先核这几项。

> [!IMPORTANT] **[卡点 17：发送超时不等于没发出去]** 舱单发送、重发按分单个数扣权益，VGM 按箱数扣。请求超时时三方可能已经收下，直接重发可能重复扣，先查询确认。

> [!IMPORTANT] **[卡点 18：青岛改单改不了的字段]** 船名、航次、提单号、船代、箱型、箱号不能通过改单修改，只能删单后重发。只改船名航次用改配 `ManifestQingdaoUpdateConfigAction`。

> [!IMPORTANT] **[卡点 19：舱单文档前后不一致的地方]**
>
> - 上海、青岛查询返回：参数表写收发通是 `partyInfoList`，示例报文是 `linkInfos`，按示例接。查询只给了 data 里的内容，按 `code`、`message`、`data` 的外壳解析。
> - 船代查询入参 `carrierName`：参数表写的是「船名」、长度 35，返回里同名字段却是船司名称。DTO 按参数表填船名，联调时核对。
> - 上海收发通的 `countryCode`：参数表没列，示例报文有。DTO 留了，为空不发送。
> - VGM 的云港通结算方式 `ygtJsfs`：没给示例，按参数表顺序和查询返回放在箱子上。
> - VGM 查询示例里船司状态出现过 5，文档没写含义。
> - VGM 查询的状态码 200011（收款账号不属于同一商户）像是从支付文档抄来的，没单独出文案，按「其他状态码」处理。

> [!IMPORTANT] **[卡点 20：舱单测试环境路径不带 /api]** 测试环境 `BaseUrl` 是 `http://221.238.46.76:9097`，路径不带 `/api`，`RongETong:ManifestPathPrefix` 要一起改成 `/manifest/openapi`。`BaseUrl` 是场站、运价、舱单共用的，切测试时三者的路径都要按测试地址改。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-10-01 | `Feature` | 接入国内舱单（上海 6 个、青岛 8 个接口）和 VGM（3 个接口）的后端私有调用，暂无对外接口，结果回调没接 | 新私有方法 `PostManifestAsync<T>`，按 `Manifest*Action` 常量拼路径，路径前缀默认 `/api/manifest/openapi`，可用 `RongETong:ManifestPathPrefix` 覆盖。原 `PostSpotAsync` 里的请求、解析、状态码处理挪到 `PostOpenApiAsync<T>`，即时运价和舱单共用：状态码文案合并，新增舱单的 200002、200013、200014；状态码成功但 data 为 false 也按失败抛错；日志前缀由「荣E通即时运价」改为「荣E通」，看 url 区分接口。`BuildSignedBody` 改为传一个对象，每个顶层属性就是请求体的一个顶层参数，值是字符串的原样拼进签名，是 JSON 结构的照旧排序后拼紧凑 JSON；场站、即时运价的报文和签名不变。舱单报文 DTO 能对上系统字段的用系统字段名，其余沿用三方字段名。私有方法区去掉了按方法拆的子 region。 |
| 2026-09-30 | `Change` | 即时运价箱型不再把结尾 HQ 换成 HC。表现形式只接受 20GP、40GP、40HC、45HC、20NOR、40NOR、20RF、40RF、40RH、20OT、40OT，否则提示「箱型不支持」，不请求三方接口 | 校验在复用和创建任务之前。系统箱型写成 40HQ 时不会再改写成 40HC。 |
| 2026-09-30 | `Feature` | 即时运价两端运输类型改为前端必填（CY 堆场、SD 门点），写入查询记录。1 小时内复用时运输类型也必须相同 | 列 `PolServiceType`、`PodServiceType`。已有记录迁移时默认 `CY`，因为改之前固定按堆场查。复用索引带上这两列。 |
| 2026-09-30 | `Feature` | 即时运价查询前核对港口五字码是否在荣E通港口基础数据的 911 个里，不在则提示「港口不支持」，不请求三方接口。前端把同一份名单写死，不提供五字码查询接口 | 911 个五字码写在 `RongETongPortCodes`，不建表。判断在复用和创建任务之前。 |
| 2026-09-30 | `Change` | 即时运价同步等待上限由 120 秒改为 5 分钟，前端请求超时由 180 秒改为 5 分钟 | 实测一次查询 105 秒才返回，离 120 秒太近。只改 `SpotMaxWait`；调三方接口的单次 HTTP 超时 60 秒不变，它管的是一次调用。 |
| 2026-09-30 | `Fix` | 修复即时运价创建任务报 100005「验证签名失败」 | `BuildSignedBody` 把业务参数的键逐层按 ASCII 排序后再签名和发送，之前是按 DTO 声明顺序。创建任务的 `polCode` 排在 `podCode` 前，对方排序后算出的签名对不上。请求 DTO 上的 `JsonProperty(Order)` 已去掉，顺序不再由它决定。 |
| 2026-09-29 | `Feature` | 即时运价查询入参只留起运港、目的港、箱型，箱型不限个数；运输类型固定按堆场。最长等 120 秒，超时的箱型判为失败 | 创建任务每 3 个箱型一批、查状态每 10 个任务号一批。查询记录表只存港口 Id、箱型 Id、任务号、状态、结果 JSON、创建时间，复用按港口 Id + 箱型 Id；结果仍存 JSON，三方接口增减字段不用改表。失败原因只在本次返回里带，不落库。 |
| 2026-09-29 | `Feature` | 即时运价对外同步查询接口 `SpotQueryAsync`：一次最多 3 个箱型，最长等 90 秒，1 小时内同样条件复用。返回给前端的报错和失败原因一律叫「三方接口」 | 新表 `App_RongETongSpotQueries` 存任务号、状态和结果原文，任务号和结果走独立工作单元即时提交。方法不开事务。结果存原文、读时映射，以后调整映射不用重新查。场站两条配置报错、场站失败原因枚举说明、即时运价报错统一改成「三方接口…」，规则 `dotnet-api-dto.mdc` 同步补上荣E通和「三方接口」叫法。 |
| 2026-09-29 | `Feature` | 接入即时运价三个接口（创建任务、查任务状态、取结果）的后端私有调用，暂无对外接口。订阅运价不接 | 三个接口共用私有方法 `PostSpotAsync<T>`，按接口名常量拼路径，对方状态码转成不带供应商名的中文报错。签名抽成 `BuildSignedBody`，场站和运价共用，场站只是改为调用它，报文和签名不变。响应 DTO 按系统字段名命名：`voyage` 对应 `InnerVoyno`，`sailingTime` 对应 `Voyage`，`polEtd`、`podEta` 对应 `ETD`、`ETA`，`quotationPeriodEnd` 对应 `ValidTimeEnd`，港口代码对应 `EdiCode`。 |
| 2026-09-28 | `Feature` | 场站查询失败原因改为枚举值，不再返回文案 | `reason` 为 `RongETongRealQueryFailReason` 的整数。箱号不再拼进失败信息。 |
| 2026-09-28 | `Feature` | 海运出口增加是否提箱。场站查询可跳过已提箱；返回了箱子并回写时改为已提箱 | 列名 `IsPickedUp`。不进新增/编辑/批量编辑。复制强制为 false。跳过的票不进失败列表。分票不一致未回写时不改这个标记。 |
| 2026-09-28 | `Feature` | 对外改为批量海运出口查询并回写。失败返回委托编号和原因。不回写联系人和包装。没有箱子不改原数据 | 场站 HTTP 留在私有方法。分票按箱号合并后再删插业务箱。跟踪实体只改船名和航次，不调用整行更新。成功的票不出现在返回列表里，避免某一票抛错把其他票的回写回滚掉。 |
| 2026-09-28 | `Feature` | 先接了场站查询报文和签名 | 正式路径按文档原文 `commom`。测试环境路径不同，要同时改 `BaseUrl` 和 `StationDataPath`。 |

# 7. 代码位置与受影响文件 (Code Map)

**新增文件**

- `src/CsprojBuilder.Application/App/ExternalApi/RongETong/IRongETongAdminAppService.cs`
- `src/CsprojBuilder.Application/App/ExternalApi/RongETong/RongETongAdminAppService.cs`：对外接口 `RealQueryAsync`（场站）、`SpotQueryAsync`（即时运价）。私有方法 `GetStationDataAsync`（场站）、`PostSpotAsync<T>`（即时运价）、`PostManifestAsync<T>`（舱单，暂无调用方）、`PostOpenApiAsync<T>`（即时运价和舱单共用的请求、解析、状态码处理）、`BuildSignedBody`（三者共用的签名）、`NewIndependentUow`（即时运价落库用的独立工作单元）
- `src/CsprojBuilder.Application/App/ExternalApi/RongETong/Dto/RongETongStationDto.cs`：场站 DTO；即时运价的三方接口报文 DTO（`internal`），以及对外的入参、出参 DTO（`RongETongSpot*Dto`）；舱单报文 DTO（`internal`）：`RongETongManifest*`、上海 `RongETongShanghaiManifest*`、青岛 `RongETongQingdao*`、VGM `RongETongVgm*`、船代 `RongETongShipAgent*`
- `src/CsprojBuilder.Core/Entites/RongETongSpotQuery.cs`：即时运价查询记录
- `src/CsprojBuilder.Core/Entites/RongETongPortCodes.cs`：911 个五字码，直接写在代码里，不落库

**修改的已有文件**

- `src/CsprojBuilder.Core/Entites/SeaExport.cs`：新增 `IsPickedUp`
- `src/CsprojBuilder.Application/App/SeaExport/Dto/SeaExportDto.cs`：列表和详情返回 `IsPickedUp`，新增和编辑入参不加
- `src/CsprojBuilder.Application/App/SeaExport/SeaExportAdminAppService.cs`：复制新票时 `IsPickedUp` 置为 false
- `src/CsprojBuilder.Web.Host/Startup/Startup.cs`：注册名为 `RongETong` 的 HttpClient，超时 60 秒，不设 BaseAddress。场站、即时运价、舱单共用
- `src/CsprojBuilder.Web.Host/appsettings.json`：新增 `RongETong` 节点（地址、账号、场站路径 `StationDataPath`、即时运价路径前缀 `SpotPathPrefix`、舱单路径前缀 `ManifestPathPrefix`）
- `src/CsprojBuilder.Core/CsprojBuilderEnum.cs`：新增即时运价查询状态 `RongETongSpotQueryStatus`
- `src/CsprojBuilder.EntityFrameworkCore/EntityFrameworkCore/CsprojBuilderDbContext.cs`：注册 `RongETongSpotQueries`。复用索引含起运港、目的港、两端运输类型、箱型、创建时间。运输类型默认 `CY`

**接口文件 ↔ 文档**

- `IRongETongAdminAppService.RealQueryAsync` ↔ `文档/外部Api对接/荣E通/荣E通模块接口文档.md` 第 1~4 节
- `IRongETongAdminAppService.SpotQueryAsync` ↔ `文档/外部Api对接/荣E通/荣E通模块接口文档.md` 第 5 节

**数据库变更**

- `App_SeaExports` 新增 `IsPickedUp`（bool，不可空，默认 false）。迁移需自行生成。
- 新表 `App_RongETongSpotQueries`（Guid 主键，不单独分租户）：`POLId`、`PODId`、`PolServiceType`、`PodServiceType`（最长 8，不可空，已有行默认 `CY`）、`CtnCodeId`（只存 Id，不建外键）、`TaskCode`、`Status`、`ResultJson`（nvarchar(max)）、`CreationTime`。索引 (`POLId`, `PODId`, `PolServiceType`, `PodServiceType`, `CtnCodeId`, `CreationTime`)。迁移需自行生成。
