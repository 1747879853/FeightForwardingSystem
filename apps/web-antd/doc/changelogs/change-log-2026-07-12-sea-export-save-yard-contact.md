# 海运出口保存时带回场站联系人信息

## 背景意图

编辑海运出口保存后，场站联系人/邮箱/手机/电话被空值覆盖。根因是前端此前把这四字段当作只读展示，未写入 `EditAsync`/`AddAsync` 请求体，而后端 Edit/Add DTO 含这些字段，缺省时会按空覆盖。

## 核心逻辑变更

1. `collectCurrentFormValues`：从 `entrustReadonlyInfo` 取出 `yardContact` / `yardEmail` / `yardMobile` / `yardTel` 并入聚合表单值。
2. `buildSeaExportDto`：将上述四字段写入海出根级 DTO（与 OpenAPI `SeaExportEditDto` / `SeaExportAddDto` 对齐）。
3. `SeaExportAddDto` / `SeaExportEditDto` 类型补齐四字段定义。

展示仍只读（标签旁悬浮），不随改选 `yardId` 即时刷新；保存时透传当前只读值，避免被空覆盖。

## 避坑指南

- 场站联系人存在 `entrustReadonlyInfo`，不在任何 `useVbenForm` schema 字段中；只改 `buildSeaExportDto` 不够，必须同时改 `collectCurrentFormValues`。
- 勿再文档写「不参与保存提交」——后端会落库，漏传即清空。
