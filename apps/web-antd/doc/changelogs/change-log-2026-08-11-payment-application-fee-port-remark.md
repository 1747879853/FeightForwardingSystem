# 2026-08-11 付费申请费用明细港口展示港口备注

## 背景意图

付费申请「添加费用」抽屉与底部费用明细的起运港/目的港此前展示港口中文名（甚至调试回退 `123`），与海运出口应收应付口径不一致；业务侧需要看到提单/表单上的港口备注文本。

## 核心逻辑变更

- `resolvePolPortDisplayName` / `resolvePodPortDisplayName` 改为只读港口备注：
  - 详情：`transportOrder.seaExport.polRemark` / `podRemark`
  - 选费列表：`PayAppFeeGroupDto.polRemark` / `podRemark`
- 备注为空时显示空字符串，不回退 `portName` / `cnName`

## 避坑指南

- 列字段名仍为 `polName` / `podName`（兼容表格列配置），仅数据源改为备注
- 付款审核详情面板复用同一解析函数，会一并生效
