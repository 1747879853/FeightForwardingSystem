# 2026-08-13 业务联系单详情外键对象直接拼 selectedItems 回显

## 背景意图

业务联系单详情（`PreOrderAdmin/DetailAsync`）已把所有外键对象随单返回：`carrier` / `carrierLogo`、`codeFrt`、`codeService`、`codePackage`、`preOrderCodeGoodss[].codeGoods`、`preOrderCtns[].ctnCode`（含 `teu`）、`preOrderUsers[].user`（含昵称与头像）、`preOrderFees[].feeCode`（字段与费用代码列表一致）。

此前编辑页只给委托单位、收发通、港口注入了 `selectedItems`，其余下拉进页后各自按 id 回打 `DetailAsync`（付费方式、运输条款、包装、品名、船公司、每个干系人一发 `GetUser`、干系人头像再来一发、TEU 计量还要逐箱 `CtnCodeAdmin/DetailAsync`）。一张单打开要多出十几个请求，且请求返回前下拉是空白的。本次统一改为用详情已有对象拼回显项。

## 核心逻辑变更

1. **新增映射层 `views/pre-order/modules/detail-selected-items.ts`：** 按各 biz-select 的 `mapItemToOption` 口径拼 `selectedItems`（船公司 `cnShortName`+`code`+`logo`、付费方式/运输条款 `cnName`、包装 `name`、品名 `name`、干系人 `nickName`）。
2. **编辑页 `fillFromDetail`：** 在同一次 `updateSchema` 里给 `carrierId` / `codeFrtId` / `codeServiceId` 注入回显项，货物区补 `codePackageId` 与 `orderCodeGoodss`；删除原 `hydrateCarrierSelectedItem`（不再调 `getCarrierDetail`）。
3. **干系人：** 详情行携带的 `user` 直接喂给 `UserSelect` 的 `selected-items`，并预置到头像缓存，`getUser` 只在本地新选人时触发；换人时清掉失效的 `user` 快照。
4. **费用：** 详情 `feeCode` 直接作为 `feeCodeSnapshot`，切换收付不再打 `FeeCodeAdmin/DetailAsync`。
5. **箱型：** 详情 `ctnCode.teu` 先入 TEU 缓存；下拉选箱型时把 option 的完整箱型对象写回行（`row.ctnCode`），单位=TEU 的费用行不再逐箱拉详情。
6. **API 类型：** `PreOrderDto` 的 `carrier` / `ctnCode` / `user` / `feeCode` 由笼统的 `SimpleNamedDto` 细化为 `CarrierSimpleDto` / `CtnCodeSimpleDto` / `UserSimpleDto` / `FeeCodeSimpleDto`，`SimpleNamedDto` 补 `ediCode`。

## 避坑指南

- **详情没给名称就返回空数组。** `selectedItems` 一旦带上 id，组件会把它记进 `loadedSelectedIds` 并跳过详情兜底；此时若 label 为空，下拉会永久显示空白。所有 builder 都在名称为空时返回 `[]`，让组件回落到自己的 `DetailAsync`。
- **回显项要带 `enable: true`。** `code-frt` / `code-service` / `code-package` / `code-goods` 的 `mapItemToOption` 都是 `disabled: !item.enable`，精简回显项缺这个字段会被判成禁用；多选（品名）下连标签都删不掉。
- 船公司名称在详情里是 `cnShortName`/`cnName`，**不是** `name`（老代码读 `carrier.name` 恒为 `undefined`，才导致每次都回落去拉详情）。
- 干系人行新增了 `user` 字段，`buildSubmitPayload` 必须解构剔除，否则会随 `preOrderUsers` 回传后端，也会污染未保存脏检查的快照。
- 换人/按客户默认回填干系人时要同步清掉 `user`，否则头像和昵称停留在上一个人。
