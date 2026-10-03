# 委托单位联系人、订舱代理联系人改为多选

## 背景意图

后端把委托单位联系人、订舱代理联系人从单个改成可多个（订舱代理联系人存各扩展表自己的子表，委托单位联系人存业务表子表），接口字段从单个 id 改成 id 数组。海运出口原来只在标签旁只读显示一个自动带出的默认联系人，海运进口只原样回传 id，空运出口没有联系人。这次三个模块都改成可勾选多个。件杂货前端还没有页面，不涉及。

## 核心逻辑变更

共用实现在 `src/views/_shared/party-contact/`：

- `party-contact.ts`：联系人快照类型、按单位拉未禁用联系人（最多 100 条）、按单位取默认联系人、提交用 id 数组整理。
- `party-contacts-field-label.ts`：`createPartyContactsFieldLabel`，挂在往来单位字段 `schema.label` 上。字段名在左，已选联系人姓名在右（顿号连接，超长省略）。可编辑时点姓名弹出该单位联系人的勾选列表；只读或字段被已完成服务项锁定时悬停只看已选联系人。不传 `fieldLabel` 时是紧凑形态「联系人 姓名」，给标签放不下姓名的横排表单用。

各模块：

| 模块 | 委托单位联系人 | 订舱代理联系人 |
| --- | --- | --- |
| 海运出口 | 委托单位标签右侧（原只读显示改为可勾选） | 订舱代理标签右侧（同上） |
| 空运出口 | 委托单位标签右侧（新增） | 航段标题栏订舱代理下拉右侧，紧凑形态（新增） |
| 海运进口 | 委托单位标签右侧（新增） | 无订舱代理 |

- 用户改选委托单位 / 订舱代理时，联系人清空并带出新单位的默认联系人（`isDefault` 优先，否则第一条未禁用），再由用户增减。
- 编辑回填用详情的 `transportOrder.clientContacts`、`bookingAgentContacts` 数组，不在加载时改写成默认联系人；回填会作废还在路上的默认联系人请求。
- AI 识别带出委托单位 / 订舱代理时同样带出默认联系人（`setValues` 不触发下拉 `onChange`，由识别 hook 的 `applyPartyContacts` 补）。
- 保存提交 `transportOrder.clientContactIds`、`bookingAgentContactIds` 数组；没选单位时传空数组。
- 接口类型：`clientContactId` / `bookingAgentContactId` 改为 `clientContactIds` / `bookingAgentContactIds`，`clientContact` / `bookingAgentContact` 改为 `clientContacts` / `bookingAgentContacts`；空运出口补上这些字段与 `ClientContactSimpleDto`。字段权限别名同步改名。

## 避坑指南

- 编辑接口按数组覆盖保存，**不传等于清空**，所以每次保存都要带上当前选择，不能在没加载完详情时提交。
- 联系人只在详情返回。列表、服务项任务、监装工单里复用的 `SeaExportDto` 两个数组为 `null`，不要从列表取联系人。
- 弹层只列未禁用联系人；已选但被禁用的联系人会补在列表末尾，方便取消勾选。
- 联系人不是表单字段，dirty 检查与提交都靠表单聚合值里的 `clientContactIds` / `bookingAgentContactIds`。
