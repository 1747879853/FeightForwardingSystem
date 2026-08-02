# 业务联系单备注 textarea 默认 1 行

## 背景意图

编辑页基础信息区「备注」多行输入默认占 2 行高度，视觉偏高，改为默认显示 1 行，与港口备注等紧凑字段一致。

## 核心逻辑变更

- `form-data.ts` 中 `remark` 字段 `componentProps.rows`：`2` → `1`
- 去掉 `showCount`，不再显示 `0/1024` 字数统计；仍保留 `maxlength: 1024`
- `formItemClass`：`col-span-4` → `col-span-2`（占两列）

## 避坑指南

- 仅改基础信息 `remark`，不影响港口节点备注（本就 `rows: 1`）与审核弹窗意见框（仍为 `rows: 3`）
