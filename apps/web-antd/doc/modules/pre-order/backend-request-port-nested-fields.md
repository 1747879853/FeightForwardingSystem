# 业务联系单详情：港口嵌套对象字段补齐

## 接口

`GET /api/services/app/PreOrderAdmin/DetailAsync?Id={preOrderId}`

（业务联系单详情）

## 问题

详情里港口嵌套对象字段不完整。前端 `PortSelect` 回显要求字段齐全，否则会再打：

`GET /api/services/app/PortCodeAdmin/DetailAsync?Id={portId}`

请与海运出口详情的港口简易对象 `PortCodeSimpleDtoForOrder` 对齐。

## 现状（缺字段）

例如目的港当前返回：

```json
"pod": {
  "id": 3202,
  "portName": "HECTORVILLE",
  "cnName": "HECTORVILLE",
  "country": null
}
```

缺失：

- `ediCode`
- `country.countryEnName`
- （建议一并返回完整 `country` / `lane`）

## 期望

以下字段若有关联港口，均按同一结构返回（有值就给，无则 `null`）：

| 字段            | 说明                                      |
| --------------- | ----------------------------------------- |
| `receivePort`   | 收货地                                    |
| `pol`           | 起运港                                    |
| `poT1` / `pot1` | 中转港1（与现有 JSON 字段名保持一致即可） |
| `poT2` / `pot2` | 中转港2                                   |
| `pod`           | 目的港                                    |
| `deliverPort`   | 交货地                                    |

建议结构（对齐海出 `PortCodeSimpleDtoForOrder`）：

```json
{
  "id": 3202,
  "portName": "HECTORVILLE",
  "cnName": "HECTORVILLE",
  "ediCode": "AUHEC",
  "country": {
    "id": 1,
    "code": "AU",
    "countryName": "澳大利亚",
    "countryEnName": "AUSTRALIA"
  },
  "lane": {
    "id": 1,
    "code": "...",
    "laneName": "...",
    "laneEnName": "...",
    "ediCode": "..."
  }
}
```

## 前端硬性依赖

以下字段缺任意一项，就会二次拉港口详情：

1. `ediCode`
2. `portName`
3. `cnName`
4. `country.countryEnName`

## 参考

海运出口详情里同名字段（`pol` / `pod` / `receivePort` 等）已按上述结构返回，业务联系单详情请复用同一港口映射 / DTO。
