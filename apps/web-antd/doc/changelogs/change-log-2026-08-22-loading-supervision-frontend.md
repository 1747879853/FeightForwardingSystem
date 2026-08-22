# 2026-08-22 监装模块前端落地（TAPD #1000122）

## 背景意图

TAPD [#1000122 监装](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000122)：海运出口一票货要派师傅去堆场现场监督装箱。后端已在 `D:\code\Freight` 落地库表与接口，本次做 `apps/web-antd` 管理端对接，含四项前置改造与监装工单本体。

**本轮范围只做管理端。** 师傅端（认领 / 拒接 / 改箱号封号 / 拍照 / 完成）在小程序，不在本仓库。

执行计划见 `doc/plans/tapd-1000122-loading-supervision/`。

## 核心逻辑变更

### 1. 用户属性新增「监装」（512）

- `UserAttribute` 主枚举加 `LoadingSupervision = 512`，`client-admin` / `pre-order-admin` / `payment-application-admin` / `pre-order/form-data.ts` 四处拷贝枚举同步。
- 按用户要求铺到**所有**用户属性入口：用户管理勾选（`getUserAttributeOptions`）、标签映射（`use-order-user-roles`）、海出干系人可配角色（`seaExportOrderUserAttributeValues` / `getSeaExportOrderUserRoleOptions`，港口服务项负责岗位与客户排除服务项随之跟上）、枚举管理角色下拉。
- 未做成销售/操作那种代码写死的必填固定角色；海出干系人是否默认出卡仍由枚举 `SeaExportUserAttribute` 的 `extra1` 决定。

### 2. 包装类型新增明细包装子表

- `CodePackageAdminApi` 补 `codePackageItems`（Add/Edit/Dto 三套）。
- 表单由 Modal 改 **Drawer**（对齐 `CodeGoodsAdmin`），下方加可增删行明细表：名称、备注。
- 编辑全量提交，保留行带 `id`、新增 `id: null`、删除行从数组移除。

### 3. 船公司新增堆场子表

- `CarrierAdminApi` 补 `carrierYards`（名称、地址、备注）。
- 表单同样 Modal → Drawer；Logo 区留在主表，提交继续带 `logo`，避免被空覆盖。

### 4. 基础数据新增「监装要求」模块

- 新增 `src/api/system/base-data/loading-requirement-admin.ts` 与 `views/system/basic-data/LoadingRequirementAdmin/`（list / data / modules/form）。
- 路由 `/basic-data/loading-requirement`，权限 `Admin.LoadingRequirement.*`；父菜单 `BasicData` 的 authority 数组已加。
- 主子表：主表有前端填的 `sortId`，子表顺序即数组顺序。

### 5. 监装工单（海出编辑工作台新 Tab）

- 新增 `src/api/sea-export/loading-order-admin.ts`（`DetailBySeaExportIdAsync` / Add / Edit / Delete / Submit / Withdraw）与 `views/sea-export-admin/loading-order/index.vue`。
- Tab 插在**派车之后、分单之前**；无 `Admin.SeaExport.LoadingOrder.Get` 时整 Tab 隐藏且不参与 Tab 记忆恢复。
- 按状态控制按钮：未提交（编辑/删除/提交）、待认领（仅撤回）、已认领与已完成（禁用并提示联系师傅）。
- 箱型只读展示箱型/箱号/封号/完成/照片数；监装要求用详情 `loadingRequirements` 的 `isChecked` 回填勾选。
- 编号规则页表名下拉补 `LoadingOrder.LoadingOrderNum`，否则新建工单报「未配置生成规则」。

## 避坑指南

- **子表一律不传 `sortId`**：包装明细、堆场、监装要求明细的 `sortId` 都由后端按数组下标生成，UI 不要做排序输入框（`CodeGoodsAdmin` 的规格表有排序列，**不要照抄那一列**）。主表 `sortId` 反而要前端传。
- **子表是全量覆盖**：编辑漏传已有行等于删除。船公司还要连 `logo` 一起带，否则 Logo 被清空。
- **监装要求列表默认 `SortId ASC`**，不是别处常见的 `CreationTime DESC`，`createPagedListQuery` 显式传了 `defaultSort`。
- **工单下拉只认已保存的海运出口**：明细包装取落库 `codePackageId` 的包装详情，堆场取落库 `carrierId` 的船公司详情；基础信息未保存的改动不联动，否则提交会被后端按库值打回。缺包装/缺船公司时禁用并给后端同口径文案。
- **干系人「监装」与工单师傅是两套，不同步**：工单只提交 `userIds`，不读写订单干系人。
- **师傅最多 2 人由前端限制**，后端不卡；`userIds` 数组顺序即监装顺序。
- **`DetailBySeaExportIdAsync` 的 `id` 是海运出口 id**，不是工单 id；`result` 为 `null` 表示还没工单。
- 海运运价等处内嵌的 `carrier.carrierYards` 恒为 `null`（不是 `[]`），取值要判空。
- 本轮**未接** `GetYardUsersAsync`（「该日该船公司各堆场已排师傅」提示）。同一天同一船公司可以有多个堆场，它是备忘不是冲突拦截，下轮再做。

## 关联文档

后端接口文档（`D:\code\Freight\aspnet-core\文档`）：

- `基础资料\包装类型-明细包装子表-前端接口文档-2026-08-20.md`
- `船公司\船公司-堆场子表-前端接口文档-2026-08-20.md`
- `用户\用户-用户属性新增监装-2026-08-20.md`
- `监装\监装要求模块接口文档.md`
- `监装\监装工单模块接口文档.md`
