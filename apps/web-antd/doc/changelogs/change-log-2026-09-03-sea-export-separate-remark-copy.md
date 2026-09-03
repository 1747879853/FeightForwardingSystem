# 2026-09-03 海运出口分单头备注与复制分单

## 背景意图

后端为分单主表新增 `remark` 字段，并提供 `CopyAsync` 复制已有分单。业务需要在分单头上单独记一句话，并能基于已有分单快速开新单：收发通、货物信息、签单付费条款都带走，分提单号和箱型箱量不带。

## 核心逻辑变更

- **API 类型与接口**：`SeaExportSeparateAdminApi.SeparateAddDto` / `SeparateEditDto` / `SeparateDto` 增加主表 `remark`；新增 `copySeparate(id)` 调用 `POST /services/app/SeaExportSeparateAdmin/CopyAsync`。
- **分单 Tab 表单**：主卡底部增加分单头「备注」多行输入（`maxlength=1024`），随 `AddAsync`/`EditAsync` 提交 `remark`；回填读 `SeparateDto.remark`，与装箱表行内 `seaExportSeparateCtns[].remark` 分离。
- **复制分单**：顶栏在「删除」与「打印」之间增加「复制」按钮，仅已保存分单可用。有未保存修改时先确认「基于已保存内容复制」；确认后说明复制范围（带收发通/货物/条款/备注，分提单号置空、不带装箱），调 `CopyAsync` 成功后刷新列表并切到新分单 Tab。
- **i18n**：`seaExport.export.separate` 增补 `remark`、`copy` 及复制确认/成功文案；关键字提示文案扩展为含「备注」。

## 避坑指南

- **主表备注 ≠ 箱型行备注。** 分单头 `formData.remark` 对应 `SeaExportSeparate.Remark`；装箱表「备注」列仍是子表 `SeaExportSeparateCtn.Remark`，不要混填。
- **复制不带子表。** 后端新单 `seaExportSeparateCtns` 为空数组，前端复制成功后 `loadData(newId)` 会展示空装箱表，需用户自行勾箱。
- **复制仍挂同一海出。** 不会跳转到新票编辑页，只在当前 `/sea-exports/:id/edit` 分单 Tab 内新增胶囊。
- **复制只认已保存 id。** 草稿 Tab（无 `editingId`）不显示复制能力；未保存修改时复制基于库内源单，不是当前表单快照。
