字段级屏蔽新增了一个模块，请在前端维护模块枚举、字段中文名的地方加上。

## 要改什么

- 模块：`SeFreiPriceCtn`，枚举值 **11**，文档描述、界面上的中文名是「运价箱型」，不是「运价」
- 运价主表仍是 `SeFreiPrice`（7，中文名「运价」）。箱型单独走 `SeFreiPriceCtn`（11，中文名「运价箱型」）
- 箱型成本不要配在「运价」上。`PropName` 只写 `Cost`，不要写成 `SeFreiPriceCtns.Cost` 这种路径
- 响应里对应的是 `seFreiPriceCtns` 每一条上的 `cost`。屏蔽后这个 key 不出现，不是 `null`

## 运价箱型可配的字段

| PropName | 含义 |
| :-- | :-- |
| Cost | 成本 |
| Remark | 备注 |
| CtnCodeId | 箱型 id |
| CtnCode | 箱型对象（和 CtnCodeId 要成对配，只屏 id 仍能从对象里读到箱型） |
| SeFreiPriceId | 运价 id |
| Id | 箱型行 id |

条件判据只能用运价箱型自己的标量字段（上表除 `CtnCode` 这种对象），不能用运价主表的船公司、港口。

## 验收标准

- 字段屏蔽配置里能选到「运价箱型」，并能配 `Cost`
- 配上后运价列表/详情里的箱型成本不再显示
- 「运价」主表的屏蔽项不受影响
