# 2026-09-05 小程序监装检索起运港/船公司对齐 PC 下拉文案

## 背景意图

师傅端检索里起运港只显示中文名、船公司只显示简称，和 PC `PortSelect` / `CarrierSelect` 对不上，不好辨认。

## 核心逻辑变更

- 船公司下拉改为 `CODE(简称)`，有 logo 时左侧显示图标，口径对齐 PC `CarrierSelect`。
- 起运港改为两行：`EDI码/英文名`、`国家英文名 / 中文名`，口径对齐 PC `PortSelect` 下拉。
- 起运港数据源从 `PortCode/GetListAsync` 精简列表改为 `PortCodeAdmin/GetPagedListAsync`（登录即可），才能拿到 EDI 与国家，并走后端分页搜索。

## 避坑指南

- **港口不要再用 `i/c/p` 精简字段拼中文名。** 两行展示依赖 `ediCode`、`portName`、`country.countryEnName`、`cnName`。
- **选中回填用第一行。** 检索抽屉里的已选文案是 `CNSHA/SHANGHAI`、`MAEU(MSK)`，不是纯中文。
