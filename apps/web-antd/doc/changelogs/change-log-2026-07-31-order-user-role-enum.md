# 2026-07-31 干系人可选角色改由 system/enumeration 按业务类型配置

## 背景意图

海运出口编辑页的干系人面板此前把「能添加的角色」写死为 6 项（销售 / 商务 / 操作 / 客服 / 单证 / 海外客服），业务联系单写死为 9 项，两边口径还不一致。每次业务要增减一个岗位都得改代码发版。

本次改为由后台在「系统管理 → 枚举管理」按**业务类型**维护角色清单，前端只保留必须存在的固定角色兜底：

- 海运出口：**操作、销售** 固定，无论枚举是否配置都展示且不可删除
- 业务联系单：**仅销售** 固定，其余角色随所选业务类型的枚举变化

## 后台需要配置什么

| 业务类型                  | 枚举名称（`name`，大小写敏感） |
| :------------------------ | :----------------------------- |
| 海运出口（`bizType = 0`） | `SeaExportUserAttribute`       |
| 海运进口（`bizType = 1`） | `SeaImportUserAttribute`       |

枚举子项字段口径：

| 子项字段 | 含义 |
| :-- | :-- |
| `value` | `UserAttribute` 位值。**编辑这两个枚举时不用手填数字**，「用户属性」下拉直接勾角色（操作=1、客服=2、单证=4、商务=8、销售=16、财务=32、海外客服=64、人事=128、航线=256） |
| `displayName` | 面板上显示的角色名（留空则回退到用户属性国际化文案） |
| `enable` | 取消启用即不再出现在面板与「+ 添加角色」候选中 |
| `extra1` | **是否默认展示**：勾上=进页面就渲染这张角色卡；不勾=只作为「+ 添加角色」候选（旧的「海外客服有值才显示」由此表达） |

枚举里子项的**排列顺序即面板展示顺序**。

### 枚举管理页怎么配

原先 `extra1` 的勾选框只在编辑 `ServiceType` 时渲染，其他枚举没有入口；`value` 又只能手填数字，配位标志极易填错（新增子项还按 `maxValue + 1` 递增，必然配出无效属性）。本次在「系统管理 → 枚举管理」编辑 `SeaExportUserAttribute` / `SeaImportUserAttribute` 时：

1. 「枚举值」输入框换成 **「用户属性」下拉**，直接勾角色，位值由前端填；已被其他子项占用的属性置灰，防止重复配置。
2. 选完属性若「显示名称」为空，自动带出属性名称（后台仍可改成业务叫法）。
3. 每个子项右侧出现 **「默认展示」** 勾选框（即 `extra1`），悬停有说明：勾上 = 进入干系人面板就渲染这张角色卡；不勾 = 只作为「+ 添加角色」候选。
4. 保存前校验「每项都选了属性」「同一属性不重复」，不通过直接提示不提交。
5. 保存后刷新业务页即生效（角色每次都请求最新配置，不吃缓存）。

详情弹窗同步：`value` 位置显示「用户属性：操作（1）」而非裸数字，并带「默认展示 / 手动添加」标签。

实现口径：可选属性与「是否角色枚举」的判断都放在 `use-order-user-roles.ts`（`getUserAttributeRoleOptions` / `isOrderUserRoleEnum`），枚举管理页只消费，避免两处各写一份角色清单；`extra1` 勾选框的白名单也由 `ORDER_USER_ROLE_ENUM_NAMES` 派生，将来加业务类型只改映射一处。

## 核心逻辑变更

新增 `src/composables/use-order-user-roles.ts`，两个模块共用：

- `ORDER_USER_ROLE_ENUM_NAMES`：业务类型 → 枚举名映射
- `getOrderUserRoleOptions(bizType, fixedRoles)`：拉枚举、过滤 `enable`、把 `extra1` 转成 `defaultVisible`；固定角色恒为 `defaultVisible` 且在枚举漏配时兜底补在最前
- `useOrderUserRoles({ bizType, fixedRoles })`：响应式加载，业务类型变化自动重拉，`requestSeq` 丢弃过期响应；`whenRolesReady()` 供快照基线等待稳定态
- `syncOrderUserRows()`：按角色配置补齐默认展示行、按枚举顺序排序，可选剔除枚举外角色

取角色时**先请求 `GetItemsByNameAsync` 取最新配置**，失败才退回 localStorage 枚举缓存，避免后台改完前端还拿旧值（口径与 `service-type.ts` 一致）；同名并发请求合并为一次。两个枚举名也加进了 `init-enum.ts` 的预热列表，让缓存兜底有内容。

海运出口（`use-order-users.ts`）：

- 删掉硬编码的 `orderUserRoleOptions`（6 项）、`getOrderUserRoleLabel` 的 switch 与 `defaultOrderUsers`（默认 5 行）
- `createOrderUserRows` 的「海外客服有人员才展示」硬编码，泛化为「非默认展示角色且无人员不展示」
- `initializeOrderUsersPanel(items?, { fillCurrentUser })`：显式区分「编辑态无干系人时兜底当前登录账号」与「新建态不兜底」，保留原有行为
- 角色枚举是异步的，面板可能先渲染：加了对 `roleOptions` 的 watch，在配置到位后补齐默认行

业务联系单（`editor.vue` / `user-defaults.ts` / `user-table.vue` / `form-data.ts`）：

- 删掉 `PRE_ORDER_USER_ATTRIBUTE_LABELS`（9 项）、`DEFAULT_PRE_ORDER_USERS` / `createDefaultPreOrderUsers` / `mergeDefaultPreOrderUsers`
- `syncPreOrderUserRows(rows, roles, dropUnknownRoles)` 统一承担「初始化 / 详情回填 / 角色到位后补齐 / 切业务类型后清理」，并按顺序重算 `sortId`
- `useOrderUserRoles` 的 `bizType` 直接绑 `headerBizType`；用户主动切业务类型时置 `pendingRoleCleanup`，等新角色到位再剔除不在新枚举里的角色行
- `UserTable` 改为接收 `roles` prop，角色名与「+ 添加角色」候选都来自它

## 避坑指南

> [!IMPORTANT] **枚举名写错等于没配** `name` 大小写敏感，写错时接口返回空数组，面板只会剩固定角色（海出=操作+销售，联系单=销售）。这是预期兜底行为，不是 bug——先去枚举管理页核对名称。

> [!IMPORTANT] **`extra1` 才是「默认展示」开关** 只把角色加进枚举但不勾「默认展示」，进页面不会有这张卡，只能从「+ 添加角色」里手动加。想让商务/客服/单证像以前一样默认出现，必须勾上。

> [!IMPORTANT] **新增业务类型只改映射，但详情标签要单独加** `extra1` 勾选框与「用户属性」下拉都按 `ORDER_USER_ROLE_ENUM_NAMES` 派生，加空运等业务类型只需扩这一处映射；但 `detail.vue` 的 `EXTRA1_TAG_TEXT_BY_ENUM` 是独立白名单，漏加只是详情少一个标签，不影响配置。

> [!IMPORTANT] **枚举名靠表单实时值判断** 子项编辑形态（下拉 / 数字框）取决于当前枚举名，走的是 `handleValuesChange` 维护的 ref——因为 `FormApi.form` 是普通类属性，挂载后替换不会触发 computed 重算，新建枚举时输入名称就切不过去。改这块别退回读 `formApi.form.values`。

> [!IMPORTANT] **固定角色不受枚举摆布** 销售（海出还有操作）即使在枚举里被停用或删掉，仍会兜底展示且不可删除，保存校验也照旧（海出销售必须且只能一人、销售与操作必须选人；联系单销售必填唯一）。

> [!IMPORTANT] **切业务类型会丢角色行** 业务联系单切换业务类型后，不在新业务类型枚举里的角色行会被清掉（含已选人员）。**详情回填不触发清理**，历史单据里的历史角色会原样保留在末尾。

> [!IMPORTANT] **异步角色 vs 未保存拦截** 角色是异步拉的，拉回来会补角色行、改 `sortId`，若快照基线早于它就会误报「未保存」。两个页面的 `syncFormSnapshot` 都已 `await whenRolesReady()` + `nextTick()`，新增快照点务必照做。

> [!IMPORTANT] **服务项绑定角色仍是独立口径** 「服务项配置」的用户属性下拉与 `parseSeaExportUserAttribute` 仍用 `views/system/user/data.ts` 里固定的 6 项，未随本次改动走枚举。若枚举给海出加了财务/人事/航线，这些角色暂时无法被服务项绑定校验引用。

## 影响文件

| 文件 | 说明 |
| :-- | :-- |
| `src/composables/use-order-user-roles.ts` | 新增，角色枚举读取与行同步 |
| `src/utils/init-enum.ts` | 预热列表补两个角色枚举名 |
| `src/views/system/enumeration/modules/form.vue` | 角色枚举的 `value` 改用户属性下拉（去重/自动带名称/保存校验）；`extra1` 勾选框放开并随枚举变文案 |
| `src/views/system/enumeration/modules/detail.vue` | 角色枚举展示属性名与 `extra1` 标签 |
| `src/views/sea-export-admin/basic-info-form/use-order-users.ts` | 角色改枚举驱动，去掉硬编码 6 项与默认 5 行 |
| `src/views/sea-export-admin/basic-info-form/form.vue` | 初始化入参调整；快照前等角色就绪 |
| `src/views/pre-order/form-data.ts` | 删除硬编码 9 项角色标签 |
| `src/views/pre-order/modules/user-defaults.ts` | 改为 `syncPreOrderUserRows` |
| `src/views/pre-order/modules/user-table.vue` | 角色来源改 `roles` prop |
| `src/views/pre-order/editor.vue` | 按业务类型加载角色、切换清理、快照等待 |
