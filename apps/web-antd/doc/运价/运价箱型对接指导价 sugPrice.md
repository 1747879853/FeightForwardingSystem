运价箱型（`seFreiPriceCtns`）新增可空指导价，请在运价的新增、编辑、查询展示里全部对接。删除运价没有新入参，箱型随运价一起删。

## 字段

- 位置：箱型子项 `seFreiPriceCtns` 里，和 `cost` 平级
- 字段名：`sugPrice`
- 类型：`int?`，可空
- 含义：指导价。不传或传 `null` 表示没有指导价
- 币别：跟箱型成本一样，用主表 `currencyId`

新建箱型示例：

```json
{ "ctnCodeId": 1, "cost": 100, "sugPrice": 120, "remark": "20GP" }
```

编辑已有箱型时多一个 `id`，`sugPrice` 照旧传。

## 要改的接口

1. 新增：`POST /api/services/app/seFreiPriceAdmin/AddAsync`，箱型入参加 `sugPrice`
2. 编辑：`PUT /api/services/app/seFreiPriceAdmin/EditAsync`，箱型入参加 `sugPrice`（`id` 有值改已有箱型，`id` 为 null 新增箱型）
3. 详情：`GET /api/services/app/seFreiPriceAdmin/DetailAsync`，`seFreiPriceCtns[].sugPrice` 要展示
4. 列表：`POST /api/services/app/seFreiPriceAdmin/GetPagedListAsync`，列表里展示箱型成本的地方同步展示指导价
5. 批量编辑：`PUT /api/services/app/seFreiPriceAdmin/BatchEditAsync`。`seFreiPriceCtns` 为 null 表示不改箱型；不为 null 时每个箱型要带 `sugPrice`
6. 批量简单新增：`POST /api/services/app/seFreiPriceAdmin/BatchAddSimpleAsync`
7. 批量简单编辑：`PUT /api/services/app/seFreiPriceAdmin/BatchEditSimpleAsync`

删除 `DELETE /api/services/app/seFreiPriceAdmin/DeleteAsync` 不用改入参。

## 注意

- 字段级权限屏掉指导价时，响应里**不会出现** `sugPrice`（不是返回 null）。没看到这个字段就不要展示、也不要当成 0 提交。编辑时不传或传 null，后端会用库里原值回填。
- 运价识别结果里没有指导价。识别回填后这一列留空，由用户手填。

## 验收标准

- 新增、编辑、批量新增、批量编辑、批量简单新增、批量简单编辑的箱型都能填写并保存指导价
- 不填指导价可以保存，详情和列表显示为空
- 填了指导价的运价，详情、列表、再次编辑都能看到原值
- 删除运价行为不变
