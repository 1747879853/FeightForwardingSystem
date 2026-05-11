## 背景意图

海运出口台账列表页原有查询条件和列表列信息较少，无法完整承接后端 `GetPagedListAsync` 的搜索参数与 `SeaExportDto` 业务字段。为了避免“前端能查不能看”或“后端有字段前端未映射”的断层，本次统一按字段映射规范补齐查询与表格展示。

## 核心技术决策/逻辑变更

1. 扩展列表查询参数映射
   - 在 `sea-export-admin/data.ts` 的 `useGridFormSchema` 中，补齐编号、ETD 区间、委托单位、港口、船期、角色人员、所属公司、截单时间区间、货物属性、业务来源、签单方式、锁定状态等字段。
   - `list.vue` 将 `showCollapseButton` 调整为 `true`，让“显性条件 + 高级搜索条件”可以通过折叠展开承载。

2. 扩展列表列展示映射
   - 新增根级字段列（船公司、订舱代理、港口、船名航次、航线、录入人、截单时间、签单方式等）。
   - 新增 `transportOrder` 嵌套字段列（委托编号、主提单号、ETD、委托单位、箱型箱量、TEU、业务来源、付费方式、会计期间、三方抬头、货描、体积重量、内部备注等）。
   - 新增枚举/布尔渲染：`blType`、`billType` 走 `CellTag`；`feeLocked`、`isBusinessLocking` 走布尔标签文本。

3. 特殊业务字段提取策略
   - 角色人员信息统一通过 `orderUsers + userAttribute` 提取，提供 `getRoleName` 复用函数，分别渲染操作/销售/客服/单证/商务。
   - 所属公司按约定从 `row.companys[0].name` 显示。
   - 发货人/收货人/通知人增加“名称优先、内容兜底”显示策略，避免主数据未建档导致表格空白。

4. API 类型同步
   - 在 `sea-export-admin.ts` 中补齐 `GetPagedListParams` 全量查询字段，减少调用时的类型缺失。
   - 为 `SeaExportDto` / `TransportOrderAddDto` 增加本次列表使用的补充字段（如 `laneName`、`creatorUserNickName`、`companys`、`totalCtn`、`teu`、`codePackageName`）。

## 避坑指南（Gotchas & Constraints）

- `orderUsers.userAttribute` 为枚举值，前端过滤时统一使用数字比较，避免后端返回字符串数字时匹配失败。
- 截单时间和开船日期为区间查询，若后端要求严格的 `date-time`，请确认 `DatePicker` 序列化格式与接口约定一致（必要时在请求层统一转换）。
- 列字段中存在多个“非实体字段”（如 `operationUserName`）仅用于 formatter 展示，避免误用于排序参数。
- `companys` 字段命名沿用后端返回（非 `companies`），不要擅自改名，避免展示丢值。
