# 2026-09-05 小程序监装列表对接新增查询条件

## 背景意图

师傅端 `GetMyPagedListAsync` 除工单号、主提单号、预计到货日外，后端还支持堆场关键字、起运港、船公司、品名。检索抽屉原先只接了前三项。

## 核心逻辑变更

- 查询入参补上 `carrierYardKeyword`、`polId`、`carrierId`、`codeGoodsId`，与 `LoadingOrderMyQueryDto` 对齐。
- 堆场用关键字模糊匹配名称/地址/备注，不传 `carrierYardId`。
- 起运港走 `PortCodeAdmin/GetPagedListAsync`，下拉两行对齐 PC：`EDI码/英文名`、`国家英文名 / 中文名`。
- 船公司、品名走 `CarrierAdmin` / `CodeGoodsAdmin` 分页接口，每页 20 条，关键字搜索、触底加载下一页。船公司文案对齐 PC：`CODE(简称)`，有 logo 时显示。

## 避坑指南

- **堆场搜的是堆场表，不是工单备注。** 没选堆场的工单匹配不上。
- **港口 JSON 走完整 DTO。** 下拉要用 `ediCode`、`portName`、`country.countryEnName`、`cnName`，不要按精简字段 `i`/`c`/`p` 只拼中文名。
- **不要用微信原生 picker 做分页下拉。** 原生选择器只能塞固定数组；船公司/品名必须用自定义列表 + `pageIndex/pageSize/keyword`。
