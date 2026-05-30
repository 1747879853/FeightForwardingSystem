# 海运出口港口服务项配置 SeaExportPropEnum 千位分流规则

## 背景意图

后端 `SeaExportPropEnum` 新增「额外字段」区段（`1001+`），与基础字段（`1~17`）形成「ID/值字段 + 名称展示字段」的成对关系。服务项配置弹窗中，展示字段、锁定字段、完成时必填字段对枚举值的可用范围不同，需在 UI 层按千位规则分流，并与后端枚举保持同步。

## 核心逻辑变更

### 1. 枚举同步策略

弹窗打开时并行加载三类数据源并合并（按 `value` 去重，接口文案优先）：

1. **前端兜底清单** `SEA_EXPORT_PROP_FALLBACK_ITEMS`：与后端 C# 枚举一致，含 `1~17` 与 `1001/1002/1003/1010/1011/1012/1013/1017`；
2. **本地枚举缓存** `getEnumItems('SeaExportPropEnum')`；
3. **实时接口** `GetItemsByNameAsync?name=SeaExportPropEnum`。

合并后统一走 `buildSeaExportPropOptions` 生成两套下拉选项。

### 2. 千位分流规则（重点）

常量 `SEA_EXPORT_EXTRA_PROP_BASE = 1000`。

| 子表字段 | 业务含义 | 下拉候选规则 | 示例 |
| :-- | :-- | :-- | :-- |
| `seServiceShows` | 展示字段 | **>1000** 的额外字段始终保留；**≤1000** 的基础字段，若存在对应 `value + 1000` 的额外项则**隐藏** | 有 `1017 ClientName` 时不显示 `17 ClientId`；无额外项时仍显示 `4 Vessel` |
| `seServiceLocks` | 锁定字段 | 仅 **≤1000** 的基础字段 | 可选 `17 ClientId`，不可选 `1017 ClientName` |
| `seServiceRequires` | 完成时必填 | 同锁定字段，仅 **≤1000** | 同左 |

**展示字段去重算法（伪代码）：**

```text
对每个枚举项 value:
  if value > 1000:
    保留
  else if 枚举集合中存在 (value + 1000):
    丢弃（被额外名称字段替代）
  else:
    保留（如 Vessel=4、ETD=16 等无对应 1000+x 的项）
```

**锁定/必填过滤：**

```text
对每个枚举项 value:
  保留当且仅当 value <= 1000
```

### 3. 选择与回显约束

- `updatePropRefs` 写入时按当前下拉白名单过滤，防止 `tags` 模式手工录入非法值。
- 编辑回显时，`seServiceLocks` / `seServiceRequires` 中 `>1000` 的历史值会被过滤，不再展示（与下拉口径一致）。

### 4. 涉及文件

- `apps/web-antd/src/views/system/basic-data/SeServiceConfigAdmin/modules/form.vue`

## 避坑指南

- **不要**让三个子表共用同一套 `SeaExportPropEnum` 选项：展示字段允许名称类额外枚举，锁定/必填必须限制在基础字段。
- **成对关系**以「是否存在 `value + 1000`」判断，而非硬编码映射表；后端新增 `1018` 时会自动隐藏 `18`（若 `18` 日后加入枚举）。
- 枚举缓存可能滞后：弹窗已强制拉取实时接口并与兜底清单合并；若下拉仍缺项，检查枚举管理后台是否已维护 `SeaExportPropEnum`。
- 提交 payload 时展示字段可含 `1000+` 值，锁定/必填应只含 `≤1000`；前端已约束选择，但后端仍应校验语义一致性。
