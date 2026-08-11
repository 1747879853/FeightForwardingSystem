# 业务联系单主表选港同步备注并写入港口表单

## 背景意图

起运港/目的港已迁入主表基础 schema，但选港时只更新了服务项用的 `currentPolId`，未同步隐藏的 `PortForm`，也未自动带出港口备注，保存后备注易丢失。

## 核心逻辑变更

1. **`handleBasicPortChange`**：主表 `polId`/`podId` 变更时先 `portFormApi.setFieldValue`，再走 `handlePortSelectChange`（更新 `currentPolId` + 按 option 回填 `polRemark`/`podRemark`）
2. **`bindBasicPortLinkage` / `fillFromDetail`**：起运港、目的港统一挂上述回调，不再只用「只改 currentPolId」的旧逻辑
3. **港口分区**：由 `v-if="false"` 改为 `hidden` class，保留 `PortForm` 实例与备注字段，避免卸载后无法写入

## 避坑指南

- 主表与隐藏 `PortForm` 共用 `polId`/`podId` 时，选港必须双写；只改 basic 表单值，提交仍读 `portFormApi.getValues()` 会丢备注
- 恢复可见港口分区时，勿再给 `PortForm` 重复挂主表已有的 `polId`/`podId` 控件
- 勿把港口分区改回 `v-if="false"`，否则备注联动写不进未挂载的表单
