# 海运出口截关节点文案与顺序调整

## 背景意图

业务将船期信息中「截 VGM / 截舱单」的叫法统一为「截港 / 截关」，并要求时间轴右侧顺序为：截单 → 截港 → 截关。

## 核心逻辑变更

1. **文案（i18n）**
   - `closeVgmTime`：`截VGM` → `截港日期`
   - `closeManifestTime`：`截舱单日期` → `截关日期`
   - 英文字段同步为 Port Cutoff / Customs Cutoff；海运进口中文文案一并对齐。
2. **展示顺序**
   - 船期时间轴 `shipment-time-pos--5/6/7` 对应字段改为：`closeDocTime` → `closeVgmTime` → `closeManifestTime`。
   - 保存校验数组、应收应付/更改单摘要字段顺序同步为截单 → 截港 → 截关。
3. **字段映射不变**：仍绑定原 API 字段名，仅改标签与 UI 顺序；隐藏的 `closingTime` 仍保留。

## 避坑指南

- 勿把「截关日期」文案误绑到隐藏字段 `closingTime`；页面可见的截关对应 `closeManifestTime`。
- 历史文档/注释里的「截 VGM / 截舱单」指同一组字段，读档时按新叫法理解。
