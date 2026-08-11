<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

import type { PreOrderCtnRow } from './modules/ctn-table.vue';
import type { PreOrderFeeRow } from './modules/fee-table.vue';
import type { PreOrderServiceRow } from './modules/service-panel.vue';
import type { PreOrderUserRow } from './modules/user-defaults';

import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { FileText, IconifyIcon, MapPin, Package } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import {
  Button,
  Card,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
} from 'ant-design-vue';

import { UserOrgSelect } from '#/adapter/component';
import { useVbenForm } from '#/adapter/form';
import { TaskType } from '#/api/audit-approval/payment-review-admin';
import {
  addPreOrder,
  auditPreOrder,
  editPreOrder,
  getPreOrderBizTypeOptions,
  getPreOrderDetail,
  PreOrderBizType,
  PreOrderStatus,
  rejectPreOrder,
  submitPreOrder,
  unSubmitPreOrder,
} from '#/api/pre-order/pre-order-admin';
import { getClientDetail } from '#/api/sea-export/client-admin';
import { getCarrierDetail } from '#/api/system/base-data/carrier-admin';
import { getOrganizationUnit } from '#/api/system/organization-unit';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { formatOrgPathLabel } from '#/composables/use-all-user-org';
import { useOrderUserRoles } from '#/composables/use-order-user-roles';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import {
  hasValidUserId,
  toPortObjectSelectedItems,
  toSelectedItems,
} from '#/views/sea-export-admin/basic-info-form/sea-export-detail-mapper';
import {
  buildPortSelectProps,
  formatSeaExportPortRemark,
  getBlTypeOptions,
  pickPortSelectOption,
} from '#/views/sea-export-admin/data';
import SeaExportEditor from '#/views/sea-export-admin/editor.vue';

import {
  PRE_ORDER_PORT_REMARK_FIELDS,
  usePreOrderBasicSchema,
  usePreOrderCargoSchema,
  usePreOrderCargoTypeInlineSchema,
  usePreOrderPartySchema,
  usePreOrderPortSchema,
  USER_ATTRIBUTE,
} from './form-data';
import AttachmentGroups from './modules/attachment-groups.vue';
import AuditModal from './modules/audit-modal.vue';
import CtnTable from './modules/ctn-table.vue';
import FeeTable from './modules/fee-table.vue';
import { checkPreOrderFees, coercePreOrderFeeUnit } from './modules/fee-unit';
import ServicePanel from './modules/service-panel.vue';
import {
  applyClientDefaultPreOrderUsers,
  syncPreOrderUserRows,
} from './modules/user-defaults';
import UserTable from './modules/user-table.vue';

defineOptions({ name: 'PreOrderEditor' });

const perm = createAbpPermission('Admin.PreOrder');
const auditCode = 'Admin.PreOrder.Audit';
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { hasAccessByCodes } = useAccess();
const canAudit = computed(() => hasAccessByCodes([auditCode]));
const { open: openWorkflowTimeline } = useWorkflowTimeline();
const { setTabTitle } = useTabs();

/** 页签标题由本页托管：tabbar 会保留历史 newTabTitle，需进页时主动写回 */
const PRE_ORDER_TAB_TITLE = '业务联系单';
function syncPreOrderTabTitle() {
  void setTabTitle(PRE_ORDER_TAB_TITLE);
}

const preOrderId = ref<string>(route.params.id ? String(route.params.id) : '');
const isEdit = computed(() => !!preOrderId.value);
const currentUserId = computed(() => {
  const rawUserId = userStore.userInfo?.userId;
  if (!rawUserId) return undefined;
  const parsedUserId = Number(rawUserId);
  return Number.isFinite(parsedUserId) && parsedUserId > 0
    ? parsedUserId
    : undefined;
});

const loading = ref(false);
const saving = ref(false);
const detail = ref<PreOrderAdminApi.PreOrderDto | null>(null);
const activeTab = ref<'basic' | 'seaExport'>('basic');
/** 收发通区块默认折叠，点击标题栏展开/收起 */
const partyExpanded = ref(false);
const auditModalVisible = ref(false);
const auditSuccess = ref(true);
/** 提交 DTO 的 JSON 快照，用于未保存拦截 */
const formSnapshot = ref('');

/** 归属组织 / 业务类型 / 装运方式对齐海运出口放在标题栏 meta 区，不进表单 */
const headerOrgId = ref<null | number | undefined>();
/** 编辑回显兜底选项：详情 orgs 路径拼完整公司名，组织加载完成前也能正确显示 */
const headerOrgSelectedItems = ref<Array<{ label: string; value: number }>>([]);
const headerBizType = ref<PreOrderBizType | undefined>(
  PreOrderBizType.SeaExport,
);
const bizTypeOptions = getPreOrderBizTypeOptions();
/** 新建默认整柜（0）；编辑回显仍以详情为准 */
const headerBlType = ref<number | undefined>(0);
const blTypeOptions = getBlTypeOptions();

/** 干系人可用角色由 system/enumeration 按业务类型配置，销售固定必填不可删 */
const { roleOptions: userRoleOptions, whenRolesReady: whenUserRolesReady } =
  useOrderUserRoles({
    bizType: headerBizType,
    fixedRoles: [USER_ATTRIBUTE.Sale],
  });

const ctns = ref<PreOrderCtnRow[]>([]);
/** 角色枚举到位前先铺固定角色，避免面板初始为空 */
const users = ref<PreOrderUserRow[]>(
  syncPreOrderUserRows([], userRoleOptions.value),
);
/** 干系人中「销售」绑定的用户 id，归属组织下拉据此取该销售的组织范围（对齐海运出口） */
const salesUserId = computed<number | undefined>(() => {
  const row = users.value.find(
    (item) => Number(item.userAttribute) === USER_ATTRIBUTE.Sale,
  );
  return hasValidUserId(row?.userId) ? Number(row?.userId) : undefined;
});
/** 详情回填期间不按业务类型清理干系人，避免删掉历史角色行 */
let skipBizTypeUserSync = false;
/** 业务类型已切换、等新角色到位后再剔除不适用的角色行 */
let pendingRoleCleanup = false;

watch(userRoleOptions, (roles) => {
  users.value = syncPreOrderUserRows(users.value, roles, pendingRoleCleanup);
  pendingRoleCleanup = false;
});

watch(headerBizType, () => {
  if (skipBizTypeUserSync) return;
  pendingRoleCleanup = true;
});

/** 本单箱型名，费用单位可取这些值（数量按对应箱量带出） */
const ctnUnitNames = computed(() =>
  ctns.value.map((row) => (row.ctnCodeName ?? '').trim()).filter(Boolean),
);

const services = ref<PreOrderServiceRow[]>([]);
const fees = ref<PreOrderFeeRow[]>([]);
const feeTableRef = ref<InstanceType<typeof FeeTable> | null>(null);

/** 箱型表按钮：按箱型/箱量/卖价一键铺应收海运费 */
async function handleGenerateOceanFreightFees() {
  await feeTableRef.value?.generateOceanFreightFees();
}
/** 附件分组：先 UploadFile 拿 attachmentId，再随 Add/Edit 的 attachmentGroup 全量提交 */
const attachmentGroup = ref<PreOrderAdminApi.AttachmentGroupInputDto[]>([]);

const status = computed(() => detail.value?.status ?? PreOrderStatus.Entering);
/** 录入/驳回（含新建）显示保存与提交审核；表单本身不按状态禁用 */
const canSave = computed(
  () =>
    !isEdit.value ||
    status.value === PreOrderStatus.Entering ||
    status.value === PreOrderStatus.Rejected,
);
const hasSeaExport = computed(
  () =>
    status.value === PreOrderStatus.Passed && !!detail.value?.transportOrderId,
);

const statusMeta = computed(() => {
  switch (status.value) {
    case PreOrderStatus.Auditing: {
      return { color: 'processing', text: '待审核' };
    }
    case PreOrderStatus.Passed: {
      return { color: 'success', text: '通过' };
    }
    case PreOrderStatus.Rejected: {
      return { color: 'error', text: '驳回' };
    }
    default: {
      return { color: 'default', text: '录入状态' };
    }
  }
});

const [BasicForm, basicFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePreOrderBasicSchema(),
  showDefaultActions: false,
  wrapperClass: 'basic-info-wrap form-controls-small grid-cols-6 gap-x-4',
});

const [PartyForm, partyFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePreOrderPartySchema(),
  showDefaultActions: false,
  wrapperClass: 'party-flow-wrap form-controls-small grid-cols-6 gap-x-4',
});

/** 服务候选依赖起运港与委托单位，需实时跟随表单值（对齐海出：字段 onChange 直传，不依赖 Form @change） */
const currentPolId = ref<number | string | undefined>();
const currentClientId = ref<string | undefined>();
/** 收发通 id，费用「结算对象类别」带出结算对象时用 */
const currentShipperId = ref<string | undefined>();
const currentConsigneeId = ref<string | undefined>();
const currentNotifierId = ref<string | undefined>();
/** 往来单位名称，费用带出结算对象时写入 selectedItems，避免显示成 uuid */
const currentClientName = ref<string | undefined>();
const currentShipperName = ref<string | undefined>();
const currentConsigneeName = ref<string | undefined>();
const currentNotifierName = ref<string | undefined>();

/** 往来单位 id → 名称，换单位时按 id 取名，避免沿用上一家的名称或重复拉详情 */
const partyNameCache = new Map<string, string>();

function rememberPartyName(id?: string, name?: string) {
  if (id && name) partyNameCache.set(id, name);
}

/** 费用表行业类别 → 结算对象映射上下文 */
const feeParties = computed(() => ({
  clientId: currentClientId.value,
  clientName: currentClientName.value,
  shipperId: currentShipperId.value,
  shipperName: currentShipperName.value,
  consigneeId: currentConsigneeId.value,
  consigneeName: currentConsigneeName.value,
  notifierId: currentNotifierId.value,
  notifierName: currentNotifierName.value,
}));

/**
 * 从主表单现取往来单位 id（名称尽量保留缓存），供费用表切换收付时带出结算对象。
 * 仅靠 ClientSelect onChange 同步时，偶发漏写会导致应收切回来带不出委托单位。
 */
async function resolveFeeParties() {
  const [basicValues, partyValues] = await Promise.all([
    basicFormApi.getValues(),
    partyFormApi.getValues(),
  ]);
  const nextClientId = toOptionalStringId(basicValues.clientId);
  const nextShipperId = toOptionalStringId(partyValues.shipperId);
  const nextConsigneeId = toOptionalStringId(partyValues.consigneeId);
  const nextNotifierId = toOptionalStringId(partyValues.notifierId);

  // id 变了就按新 id 取名，命中不了宁可留空，也不能把上一家的名称带过去
  if (nextClientId !== currentClientId.value) {
    currentClientId.value = nextClientId;
    currentClientName.value = nextClientId
      ? partyNameCache.get(nextClientId)
      : undefined;
  }
  if (nextShipperId !== currentShipperId.value) {
    currentShipperId.value = nextShipperId;
    currentShipperName.value = nextShipperId
      ? partyNameCache.get(nextShipperId)
      : undefined;
  }
  if (nextConsigneeId !== currentConsigneeId.value) {
    currentConsigneeId.value = nextConsigneeId;
    currentConsigneeName.value = nextConsigneeId
      ? partyNameCache.get(nextConsigneeId)
      : undefined;
  }
  if (nextNotifierId !== currentNotifierId.value) {
    currentNotifierId.value = nextNotifierId;
    currentNotifierName.value = nextNotifierId
      ? partyNameCache.get(nextNotifierId)
      : undefined;
  }

  return feeParties.value;
}

/** 货物计量，费用单位=重量/体积时按此带出数量 */
const feeCargo = ref<{
  cbm?: null | number;
  kgs?: null | number;
}>({});
/** 归属组织本位币，费用行币别命中时汇率锁 1 */
const localCurrencyId = ref<null | number>(null);

function toOptionalStringId(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  return String(value);
}

/** 从 ClientSelect change 的 option 取展示名 */
function pickSelectOptionLabel(option: unknown): string | undefined {
  if (!option || typeof option !== 'object') return undefined;
  const o = option as { label?: string; name?: string; rawLabel?: string };
  const label = o.label || o.rawLabel || o.name;
  return label ? String(label) : undefined;
}

function toOptionalId(value: unknown): number | string | undefined {
  if (value == null || value === '') return undefined;
  return value as number | string;
}

/** PortSelect @change：起运港联动服务项；港口备注回填 */
function handlePortSelectChange(
  fieldName: string,
  value: unknown,
  option: unknown,
) {
  if (fieldName === 'polId') {
    currentPolId.value = toOptionalId(value);
  }
  const remarkField = PRE_ORDER_PORT_REMARK_FIELDS[fieldName];
  if (!remarkField) return;
  const remark = formatSeaExportPortRemark(pickPortSelectOption(option)?.raw);
  if (!remark) return;
  void portFormApi.setFieldValue(remarkField, remark);
}

const [PortForm, portFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePreOrderPortSchema({ onPortChange: handlePortSelectChange }),
  showDefaultActions: false,
  wrapperClass: 'port-flow-wrap form-controls-small grid-cols-5 gap-x-8',
});

/** 中转港 1/2 共用一列，通过 label 内联 Tab 切换（与海运出口一致） */
const transitPortTab = ref<'poT1' | 'poT2'>('poT1');
const transitPortLabelTarget = ref<HTMLElement | null>(null);

function refreshTransitPortLabelTarget() {
  void nextTick(() => {
    transitPortLabelTarget.value = document.querySelector(
      '.pre-order-port-section .port-flow-item--transit:not(.port-flow-item--hidden) > label',
    ) as HTMLElement | null;
  });
}

function applyTransitPortTabSchema() {
  const isPoT1Active = transitPortTab.value === 'poT1';
  portFormApi.updateSchema([
    {
      fieldName: 'poT1Id',
      formItemClass: `port-flow-item port-flow-item--transit port-flow-pos--transit${
        isPoT1Active ? '' : ' port-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'poT2Id',
      formItemClass: `port-flow-item port-flow-item--transit port-flow-item--transit-secondary port-flow-pos--transit${
        isPoT1Active ? ' port-flow-item--hidden' : ''
      }`,
    },
    {
      fieldName: 'poT1Remark',
      formItemClass: `port-flow-remark port-flow-remark--transit port-flow-pos--transit-remark${
        isPoT1Active ? '' : ' port-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'poT2Remark',
      formItemClass: `port-flow-remark port-flow-remark--transit port-flow-remark--transit-secondary port-flow-pos--transit-remark${
        isPoT1Active ? ' port-flow-item--hidden' : ''
      }`,
    },
  ]);
  refreshTransitPortLabelTarget();
}

function switchTransitPortTab(tab: 'poT1' | 'poT2') {
  if (transitPortTab.value === tab) return;
  transitPortTab.value = tab;
  applyTransitPortTabSchema();
}

const [CargoForm, cargoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePreOrderCargoSchema(),
  showDefaultActions: false,
  /** 右侧竖排件数/包装/毛重/尺码，对齐海运出口 cargo-metrics */
  wrapperClass: 'cargo-metrics-wrap form-controls-small grid-cols-1',
});

/** 货物类型 / 品名：对齐海运出口，挂在「货物与箱型」卡片标题栏 */
const [CargoTypeInlineForm, cargoTypeInlineFormApi] = useVbenForm({
  layout: 'horizontal',
  compact: true,
  schema: usePreOrderCargoTypeInlineSchema(),
  showDefaultActions: false,
  commonConfig: { labelWidth: 0 },
  wrapperClass: 'form-controls-small grid-cols-2 gap-x-3',
});

/**
 * 委托单位变更：按客户维护的干系人默认回填（销售/客服/操作/单证），
 * 操作/单证/客服缺失时兜底当前登录账号。可保存态用户主动切换时生效。
 */
async function applyClientDefaultUsersByClientId(value: unknown) {
  if (!canSave.value) return;
  const clientId =
    value === null || value === undefined || value === ''
      ? undefined
      : String(value);
  let client: Awaited<ReturnType<typeof getClientDetail>> | undefined;
  if (clientId) {
    try {
      client = await getClientDetail(clientId);
      if (client?.name) {
        currentClientName.value = client.name;
        rememberPartyName(clientId, client.name);
      }
    } catch {
      client = undefined;
    }
  } else {
    currentClientName.value = undefined;
  }
  users.value = applyClientDefaultPreOrderUsers(
    users.value,
    client,
    currentUserId.value,
  );
}

/** 委托单位变更：同步服务项候选 + 干系人默认回填；详情回填时顺带注入 selectedItems */
function bindClientUserLinkage(selectedItems?: any[]) {
  basicFormApi.updateSchema([
    {
      fieldName: 'clientId',
      componentProps: {
        ...(selectedItems ? { selectedItems } : {}),
        onChange: (value: unknown, option?: unknown) => {
          currentClientId.value = toOptionalStringId(value);
          if (currentClientId.value) {
            const name = pickSelectOptionLabel(option);
            currentClientName.value =
              name ?? partyNameCache.get(currentClientId.value);
            rememberPartyName(currentClientId.value, name);
          } else {
            currentClientName.value = undefined;
          }
          void applyClientDefaultUsersByClientId(value);
        },
      },
    },
  ]);
}

function toOptionalNumber(value: unknown): null | number {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

/** 毛重/体积变更：供费用按单位（重量/体积）带出数量 */
function bindCargoMetricsLinkage() {
  cargoFormApi.updateSchema(
    (['kgs', 'cbm'] as const).map((fieldName) => ({
      fieldName,
      componentProps: {
        onChange: (value: unknown) => {
          feeCargo.value = {
            ...feeCargo.value,
            [fieldName]: toOptionalNumber(
              (value as { target?: { value?: unknown } })?.target?.value ??
                value,
            ),
          };
        },
      },
    })),
  );
}

/** 收发通变更：供费用结算对象按行业类别带出 */
function bindPartySettlementLinkage() {
  partyFormApi.updateSchema([
    {
      fieldName: 'shipperId',
      componentProps: {
        onChange: (value: unknown, option?: unknown) => {
          currentShipperId.value = toOptionalStringId(value);
          if (currentShipperId.value) {
            const name = pickSelectOptionLabel(option);
            currentShipperName.value =
              name ?? partyNameCache.get(currentShipperId.value);
            rememberPartyName(currentShipperId.value, name);
          } else {
            currentShipperName.value = undefined;
          }
        },
      },
    },
    {
      fieldName: 'consigneeId',
      componentProps: {
        onChange: (value: unknown, option?: unknown) => {
          currentConsigneeId.value = toOptionalStringId(value);
          if (currentConsigneeId.value) {
            const name = pickSelectOptionLabel(option);
            currentConsigneeName.value =
              name ?? partyNameCache.get(currentConsigneeId.value);
            rememberPartyName(currentConsigneeId.value, name);
          } else {
            currentConsigneeName.value = undefined;
          }
        },
      },
    },
    {
      fieldName: 'notifierId',
      componentProps: {
        onChange: (value: unknown, option?: unknown) => {
          currentNotifierId.value = toOptionalStringId(value);
          if (currentNotifierId.value) {
            const name = pickSelectOptionLabel(option);
            currentNotifierName.value =
              name ?? partyNameCache.get(currentNotifierId.value);
            rememberPartyName(currentNotifierId.value, name);
          } else {
            currentNotifierName.value = undefined;
          }
        },
      },
    },
  ]);
}

let rowSeed = 0;
const nextRowKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${(rowSeed += 1)}`;

/** 详情 attachmentGroup → 本地可编辑结构（保留 url/文件名供展示） */
function mapAttachmentGroupFromDetail(
  groups?: PreOrderAdminApi.PreOrderDto['attachmentGroup'],
): PreOrderAdminApi.AttachmentGroupInputDto[] {
  return (groups ?? []).map((group) => ({
    attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
    items: (group.items ?? []).map((item) => ({
      attachmentId: item.attachmentId,
      attachmentDtlTypeId:
        item.attachmentDtlTypeId ?? group.attachmentDtlTypeId ?? null,
      clientVisible: item.clientVisible ?? false,
      displayOrder: item.displayOrder,
      friendlyFileName: item.friendlyFileName,
      url: item.url,
    })),
  }));
}

/** 组装 Add/Edit 的 attachmentGroup（仅含有效 attachmentId 的分组；编辑可传空数组清空） */
function buildAttachmentGroupSubmit(): PreOrderAdminApi.AttachmentGroupInputDto[] {
  return (attachmentGroup.value ?? [])
    .map((group) => ({
      attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
      items: (group.items ?? [])
        .filter((item) => {
          const id = item.attachmentId;
          if (id == null || id === '') return false;
          const asNum = Number(id);
          return Number.isFinite(asNum) ? asNum > 0 : String(id) !== '0';
        })
        .map((item, index) => ({
          attachmentId: item.attachmentId,
          attachmentDtlTypeId:
            item.attachmentDtlTypeId ?? group.attachmentDtlTypeId ?? null,
          clientVisible: item.clientVisible ?? false,
          displayOrder: item.displayOrder ?? index,
        })),
    }))
    .filter((group) => (group.items?.length ?? 0) > 0);
}

/** 详情回显船公司时补齐 logo，口径与海运出口 CarrierSelect selectedItems 一致 */
async function hydrateCarrierSelectedItem(dto: PreOrderAdminApi.PreOrderDto) {
  if (dto.carrierId == null) {
    basicFormApi.updateSchema([
      { fieldName: 'carrierId', componentProps: { selectedItems: [] } },
    ]);
    return;
  }

  const raw = dto as PreOrderAdminApi.PreOrderDto & {
    carrierLogo?: CarrierAdminApi.AttachmentItemDto | null;
  };
  let carrier: CarrierAdminApi.CarrierDto = {
    id: dto.carrierId,
    cnShortName: dto.carrier?.name,
    code: dto.carrier?.code,
    logo: raw.carrierLogo,
  };
  if (!carrier.logo?.url) {
    try {
      carrier = await getCarrierDetail(String(dto.carrierId));
    } catch {
      // 详情失败时仍用业务联系单返回的船公司名称回显
    }
  }
  if (String(detail.value?.carrierId ?? '') !== String(dto.carrierId)) return;
  basicFormApi.updateSchema([
    {
      fieldName: 'carrierId',
      componentProps: { selectedItems: [carrier] },
    },
  ]);
}

function fillFromDetail(dto: PreOrderAdminApi.PreOrderDto) {
  detail.value = dto;
  skipBizTypeUserSync = true;
  void nextTick(() => {
    skipBizTypeUserSync = false;
  });
  headerOrgId.value = dto.orgId ?? undefined;
  const detailOrgs = dto.orgs ?? [];
  const detailOrgLast = detailOrgs.at(-1);
  headerOrgSelectedItems.value = detailOrgLast?.id
    ? [{ value: detailOrgLast.id, label: formatOrgPathLabel(detailOrgs) }]
    : [];
  headerBizType.value = dto.bizType ?? PreOrderBizType.SeaExport;
  headerBlType.value =
    dto.blType === null || dto.blType === undefined ? undefined : dto.blType;
  // 详情已返回 client 对象：注入 selectedItems，避免委托单位回显成 Guid（对齐海出）
  bindClientUserLinkage(toSelectedItems(dto.clientId, dto.client?.name));
  void basicFormApi.setValues({
    clientId: dto.clientId,
    mblNum: dto.mblNum,
    codeServiceId: dto.codeServiceId,
    tradeTermsType: dto.tradeTermsType,
    codeFrtId: dto.codeFrtId,
    etd: dto.etd,
    goodsCompleteTime: dto.goodsCompleteTime,
    carrierId: dto.carrierId,
    remark: dto.remark,
  });
  void hydrateCarrierSelectedItem(dto);
  partyFormApi.updateSchema([
    {
      fieldName: 'shipperId',
      componentProps: {
        selectedItems: toSelectedItems(dto.shipperId, dto.shipper?.name),
      },
    },
    {
      fieldName: 'consigneeId',
      componentProps: {
        selectedItems: toSelectedItems(dto.consigneeId, dto.consignee?.name),
      },
    },
    {
      fieldName: 'notifierId',
      componentProps: {
        selectedItems: toSelectedItems(dto.notifierId, dto.notifier?.name),
      },
    },
  ]);
  void partyFormApi.setValues({
    shipperId: dto.shipperId,
    shipperContent: dto.shipperContent,
    consigneeId: dto.consigneeId,
    consigneeContent: dto.consigneeContent,
    notifierId: dto.notifierId,
    notifierContent: dto.notifierContent,
  });
  // 港口 Id 字段名与海出一致为 poT1Id/poT2Id（勿写成 pot1Id，详情 JSON 读不到）
  // selectedItems 与 onChange 同次 updateSchema，避免冲掉选港备注联动
  const portSelectProps = (fieldName: string, selectedItems: unknown[]) => ({
    ...buildPortSelectProps(fieldName, handlePortSelectChange),
    selectedItems,
  });
  portFormApi.updateSchema([
    {
      fieldName: 'receivePortId',
      componentProps: portSelectProps(
        'receivePortId',
        toPortObjectSelectedItems(dto.receivePort, dto.receivePortId),
      ),
    },
    {
      fieldName: 'polId',
      componentProps: portSelectProps(
        'polId',
        toPortObjectSelectedItems(dto.pol, dto.polId),
      ),
    },
    {
      fieldName: 'poT1Id',
      componentProps: portSelectProps(
        'poT1Id',
        toPortObjectSelectedItems(dto.pot1, dto.poT1Id),
      ),
    },
    {
      fieldName: 'poT2Id',
      componentProps: portSelectProps(
        'poT2Id',
        toPortObjectSelectedItems(dto.pot2, dto.poT2Id),
      ),
    },
    {
      fieldName: 'podId',
      componentProps: portSelectProps(
        'podId',
        toPortObjectSelectedItems(dto.pod, dto.podId),
      ),
    },
    {
      fieldName: 'deliverPortId',
      componentProps: portSelectProps(
        'deliverPortId',
        toPortObjectSelectedItems(dto.deliverPort, dto.deliverPortId),
      ),
    },
  ]);
  void portFormApi.setValues({
    receivePortId: dto.receivePortId,
    receivePortRemark: dto.receivePortRemark,
    polId: dto.polId,
    polRemark: dto.polRemark,
    poT1Id: dto.poT1Id,
    poT1Remark: dto.poT1Remark,
    poT2Id: dto.poT2Id,
    poT2Remark: dto.poT2Remark,
    podId: dto.podId,
    podRemark: dto.podRemark,
    deliverPortId: dto.deliverPortId,
    deliverPortRemark: dto.deliverPortRemark,
  });
  // 回填后重挂中转港 Tab 显隐，避免 updateSchema 后 Teleport 目标失效
  applyTransitPortTabSchema();
  void cargoTypeInlineFormApi.setValues({
    cargoId: dto.cargoId ?? 0,
    orderCodeGoodss: (dto.preOrderCodeGoodss ?? [])
      .map((item) => item.codeGoodsId)
      .filter((id): id is number => id != null),
  });
  void cargoFormApi.setValues({
    pkgs: dto.pkgs,
    codePackageId: dto.codePackageId,
    kgs: dto.kgs,
    cbm: dto.cbm,
  });
  feeCargo.value = { kgs: dto.kgs, cbm: dto.cbm };
  ctns.value = (dto.preOrderCtns ?? []).map((item) => ({
    ...item,
    rowKey: nextRowKey('ctn'),
    ctnCodeName: (item.ctnCode as any)?.ctnName,
  }));
  users.value = syncPreOrderUserRows(
    (dto.preOrderUsers ?? []).map((item) => ({
      ...item,
      rowKey: nextRowKey('user'),
    })),
    userRoleOptions.value,
  );
  services.value = (dto.preOrderServices ?? [])
    // compareStatus=1 是海运出口侧新增，业务联系单本身并未勾选（后端以 id=0 追加）
    .filter((item) => item.id !== 0 && item.serviceType != null)
    .map((item) => ({
      serviceType: Number(item.serviceType),
      sortId: item.sortId,
    }));
  // 历史数据可能存着海出口径的单位；回显时强制落到通用四项或本单箱型名
  const detailCtnNames = ctns.value
    .map((row) => (row.ctnCodeName ?? '').trim())
    .filter(Boolean);
  fees.value = (dto.preOrderFees ?? []).map((item) => ({
    ...item,
    unit: coercePreOrderFeeUnit(item.unit, detailCtnNames) || undefined,
    rowKey: nextRowKey('fee'),
  }));
  attachmentGroup.value = mapAttachmentGroupFromDetail(dto.attachmentGroup);
  currentClientId.value = dto.clientId ? String(dto.clientId) : undefined;
  currentClientName.value = dto.client?.name || undefined;
  currentShipperId.value = dto.shipperId ? String(dto.shipperId) : undefined;
  currentShipperName.value = dto.shipper?.name || undefined;
  currentConsigneeId.value = dto.consigneeId
    ? String(dto.consigneeId)
    : undefined;
  currentConsigneeName.value = dto.consignee?.name || undefined;
  currentNotifierId.value = dto.notifierId ? String(dto.notifierId) : undefined;
  currentNotifierName.value = dto.notifier?.name || undefined;
  rememberPartyName(currentClientId.value, currentClientName.value);
  rememberPartyName(currentShipperId.value, currentShipperName.value);
  rememberPartyName(currentConsigneeId.value, currentConsigneeName.value);
  rememberPartyName(currentNotifierId.value, currentNotifierName.value);
  currentPolId.value = dto.polId ?? undefined;
}

/** 复制：沿用业务字段，清掉单号/状态/子表主键 */
function fillFromCopySource(dto: PreOrderAdminApi.PreOrderDto) {
  fillFromDetail({ ...dto, preOrderNum: undefined, transportOrderId: null });
  detail.value = null;
  ctns.value = ctns.value.map((row) => ({ ...row, id: undefined }));
  users.value = users.value.map((row) => ({ ...row, id: undefined }));
  fees.value = fees.value.map((row) => ({ ...row, id: undefined }));
}

async function loadDetail() {
  if (!preOrderId.value) return;
  loading.value = true;
  try {
    const dto = await getPreOrderDetail(preOrderId.value);
    fillFromDetail(dto);
    await syncFormSnapshot();
  } finally {
    loading.value = false;
  }
}

/** 归属组织变化后解析其本位币，费用行币别命中时汇率锁 1 */
watch(
  headerOrgId,
  async (orgId) => {
    if (orgId == null) {
      localCurrencyId.value = null;
      return;
    }
    try {
      const org = await getOrganizationUnit(Number(orgId));
      localCurrencyId.value = org?.localCurrencyId ?? null;
    } catch {
      localCurrencyId.value = null;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  syncPreOrderTabTitle();
  applyTransitPortTabSchema();
  bindClientUserLinkage();
  bindPartySettlementLinkage();
  bindCargoMetricsLinkage();
  const copyFrom = route.query.copyFrom ? String(route.query.copyFrom) : '';
  if (preOrderId.value) {
    await loadDetail();
    syncPreOrderTabTitle();
    return;
  }
  if (copyFrom) {
    loading.value = true;
    try {
      const dto = await getPreOrderDetail(copyFrom);
      fillFromCopySource(dto);
    } finally {
      loading.value = false;
    }
  }
  await syncFormSnapshot();
  syncPreOrderTabTitle();
});

/** 多页签切回本页时，清掉历史被海出 Form 写脏的 newTabTitle */
onActivated(() => {
  syncPreOrderTabTitle();
});

watch(activeTab, (tab) => {
  if (tab === 'basic') syncPreOrderTabTitle();
});

async function buildSubmitPayload() {
  const [basicValues, partyValues, portValues, cargoValues, cargoTypeValues] =
    await Promise.all([
      basicFormApi.getValues(),
      partyFormApi.getValues(),
      portFormApi.getValues(),
      cargoFormApi.getValues(),
      cargoTypeInlineFormApi.getValues(),
    ]);
  const orderCodeGoodss = (cargoTypeValues.orderCodeGoodss ?? []) as Array<
    number | null | undefined
  >;
  return {
    bizType: headerBizType.value,
    ...basicValues,
    ...partyValues,
    ...portValues,
    ...cargoValues,
    cargoId: cargoTypeValues.cargoId ?? 0,
    orgId: headerOrgId.value,
    blType: headerBlType.value,
    preOrderNum: undefined,
    preOrderCodeGoodss: orderCodeGoodss
      .filter((id): id is number => id != null)
      .map((codeGoodsId) => ({ codeGoodsId })),
    preOrderCtns: ctns.value.map(
      ({ rowKey, ctnCodeName, ctnCode, ...rest }) => ({
        ...rest,
        ctnCodeId: rest.ctnCodeId,
        count: rest.count ?? 0,
      }),
    ),
    preOrderUsers: users.value
      .filter((row) => hasValidUserId(row.userId))
      .map(({ rowKey, ...rest }) => rest),
    preOrderServices: services.value.map((item) => ({
      serviceType: item.serviceType,
      sortId: item.sortId ?? 0,
    })),
    preOrderFees: fees.value.map(
      ({
        rowKey,
        feeCode,
        settlement,
        currency,
        settlementUiKey,
        feeCodeSnapshot,
        __isLocalCurrency,
        ...rest
      }) => ({
        ...rest,
        unit: coercePreOrderFeeUnit(rest.unit, ctnUnitNames.value) || rest.unit,
      }),
    ),
    // 编辑全量覆盖：始终传 attachmentGroup（可为空数组清空）
    attachmentGroup: buildAttachmentGroupSubmit(),
  } as PreOrderAdminApi.PreOrderAddDto;
}

/** 提交 DTO 的稳定序列化，作为脏检查基线 */
async function buildSnapshot(): Promise<string> {
  const payload = await buildSubmitPayload();
  return JSON.stringify(payload, Object.keys(payload).sort());
}

async function syncFormSnapshot() {
  // 角色枚举异步到位后干系人行还会补齐，基线须等它稳定，否则误报未保存
  await whenUserRolesReady();
  await nextTick();
  formSnapshot.value = await buildSnapshot();
}

async function isFormDirty(): Promise<boolean> {
  // 不可保存状态不拦截离开（改了也落不了库）
  if (!canSave.value || !formSnapshot.value) return false;
  return (await buildSnapshot()) !== formSnapshot.value;
}

useUnsavedGuard({ isDirty: isFormDirty });

/** 销售必填且唯一；操作等其余角色可空，提交时剔除未选人的行 */
function validateUsers(): boolean {
  const sales = users.value.filter(
    (row) => Number(row.userAttribute) === USER_ATTRIBUTE.Sale && row.userId,
  );
  if (sales.length !== 1) {
    message.warning('销售必填且只能指派一个用户');
    return false;
  }
  return true;
}

/** 箱型行箱量必填且须大于 0；有行时箱型也须选好 */
function validateCtns(): boolean {
  if (ctns.value.length === 0) {
    message.warning('请至少添加一条箱型箱量');
    return false;
  }
  for (const [index, row] of ctns.value.entries()) {
    if (row.ctnCodeId == null || row.ctnCodeId === '') {
      message.warning(`第 ${index + 1} 行请选择箱型`);
      return false;
    }
    if (row.count == null || Number(row.count) <= 0) {
      message.warning(`第 ${index + 1} 行请填写箱量`);
      return false;
    }
  }
  return true;
}

/**
 * 费用行体检：审核通过时后端只转换三要素齐全的行，并按单位重算数量金额，
 * `strict` 用于提交审核前硬拦截，保存草稿时只提示。
 */
function validateFees(strict: boolean): boolean {
  const { errors, warnings } = checkPreOrderFees(
    fees.value,
    ctnUnitNames.value,
  );
  // 条数可能很多，只提示前几条，避免刷屏
  for (const text of warnings.slice(0, 3)) message.warning(text);
  if (errors.length === 0) return true;
  for (const text of errors.slice(0, 5)) message.error(text);
  return !strict;
}

async function validateForms(): Promise<boolean> {
  if (!headerOrgId.value) {
    message.warning('请选择归属组织');
    return false;
  }
  if (headerBizType.value == null) {
    message.warning('请选择业务类型');
    return false;
  }
  if (headerBlType.value == null) {
    message.warning('请选择装运方式');
    return false;
  }
  const results = await Promise.all([
    basicFormApi.validate(),
    partyFormApi.validate(),
    portFormApi.validate(),
    cargoFormApi.validate(),
    cargoTypeInlineFormApi.validate(),
  ]);
  return results.every((item) => item.valid);
}

async function handleSave() {
  if (!canSave.value) return;
  if (!(await validateForms())) return;
  if (!validateUsers()) return;
  if (!validateCtns()) return;
  validateFees(false);
  saving.value = true;
  try {
    const payload = await buildSubmitPayload();
    if (preOrderId.value) {
      await editPreOrder({ ...payload, id: preOrderId.value });
      message.success('保存成功');
      markListShouldRefresh('PreOrderList');
      await loadDetail();
    } else {
      const newId = await addPreOrder(payload);
      message.success('新增成功');
      markListShouldRefresh('PreOrderList');
      preOrderId.value = String(newId);
      // 跳转前重置基线，避免 replace 触发未保存拦截
      await syncFormSnapshot();
      await router.replace(`/pre-order/${newId}/edit`);
      await loadDetail();
    }
  } finally {
    saving.value = false;
  }
}

async function runAction(action: () => Promise<unknown>, successText: string) {
  saving.value = true;
  try {
    await action();
    message.success(successText);
    markListShouldRefresh('PreOrderList');
    await loadDetail();
  } finally {
    saving.value = false;
  }
}

function handleSubmitAudit() {
  if (!canSave.value) return;
  // 审核通过即按当前费用生成应收应付，缺三要素的行会被后端静默丢弃，先拦下来
  if (!validateFees(true)) return;
  Modal.confirm({
    title: '提交审核',
    content: '提交后业务联系单将不可修改，确认提交？',
    onOk: () => runAction(() => submitPreOrder(preOrderId.value), '已提交审核'),
  });
}

function handleUnSubmit() {
  runAction(() => unSubmitPreOrder(preOrderId.value), '已撤回');
}

function openAudit(success: boolean) {
  auditSuccess.value = success;
  auditModalVisible.value = true;
}

async function handleAuditConfirm(payload: {
  remark?: string;
  operationUserId?: number;
}) {
  await runAction(
    () =>
      auditPreOrder({
        id: preOrderId.value,
        success: auditSuccess.value,
        remark: payload.remark,
        operationUserId: payload.operationUserId,
      }),
    auditSuccess.value ? '审核通过' : '已驳回',
  );
  auditModalVisible.value = false;
}

/** 审核后驳回：有关联海运出口时后端会拦截，提示先删除 */
function handleRejectAfterPass() {
  Modal.confirm({
    title: '审核后驳回',
    content:
      '驳回前需先删除关联的海运出口数据，否则后端将拒绝本次操作。确认继续？',
    okType: 'danger',
    onOk: () =>
      runAction(() => rejectPreOrder({ id: preOrderId.value }), '已驳回'),
  });
}

function handleViewWorkflow() {
  if (!preOrderId.value) {
    message.warning('请先保存单据后再查看审核流程');
    return;
  }
  openWorkflowTimeline({
    entityId: preOrderId.value,
    taskType: TaskType.PreOrder,
  });
}

const contentTabsStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  padding: '8px',
  overflowX: 'auto',
  position: 'sticky',
  top: '0',
  zIndex: 20,
  background: '#fff',
  border: '1px solid #e8e8e8',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
} as const;

const contentTabStyle = {
  padding: '6px 10px',
  fontSize: '12px',
  color: '#595959',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  whiteSpace: 'nowrap',
} as const;

const getContentTabStyle = (isActive: boolean) =>
  isActive
    ? {
        ...contentTabStyle,
        fontWeight: 600,
        color: '#1677ff',
        borderBottomColor: '#1677ff',
      }
    : contentTabStyle;
</script>

<template>
  <Page auto-content-height content-class="!p-0">
    <div class="pre-order-editor-page flex min-h-0 min-w-0 flex-1 flex-col">
      <div v-if="isEdit" class="content-tabs" :style="contentTabsStyle">
        <span
          class="content-tab"
          :class="{ 'content-tab--active': activeTab === 'basic' }"
          :style="getContentTabStyle(activeTab === 'basic')"
          @click="activeTab = 'basic'"
        >
          业务联系单
        </span>
        <span
          v-if="hasSeaExport"
          class="content-tab"
          :class="{ 'content-tab--active': activeTab === 'seaExport' }"
          :style="getContentTabStyle(activeTab === 'seaExport')"
          @click="activeTab = 'seaExport'"
        >
          关联海运出口
        </span>
      </div>

      <Spin :spinning="loading" class="pre-order-editor-spin">
        <div
          v-show="activeTab === 'basic'"
          class="sea-export-form-page pre-order-basic-page"
        >
          <div class="main-layout">
            <div class="center-column">
              <div class="content-column">
                <section class="content-section">
                  <div class="content-section__actions">
                    <div class="content-section__actions-left">
                      <ServicePanel
                        v-model="services"
                        :client-id="currentClientId"
                        :pol-id="currentPolId"
                        :is-edit="isEdit"
                        :compare-list="detail?.preOrderServices ?? []"
                      />
                    </div>
                    <Space class="content-section__actions-right">
                      <Button
                        v-if="isEdit"
                        size="small"
                        @click="handleViewWorkflow"
                      >
                        审核流程
                      </Button>
                      <Button
                        v-if="canSave"
                        v-access:code="isEdit ? perm.edit : perm.add"
                        size="small"
                        type="primary"
                        :loading="saving"
                        @click="handleSave"
                      >
                        保存
                      </Button>
                      <Button
                        v-if="isEdit && canSave"
                        v-access:code="perm.edit"
                        size="small"
                        :loading="saving"
                        @click="handleSubmitAudit"
                      >
                        提交审核
                      </Button>
                      <Button
                        v-if="status === PreOrderStatus.Auditing"
                        v-access:code="perm.edit"
                        size="small"
                        :loading="saving"
                        @click="handleUnSubmit"
                      >
                        撤回
                      </Button>
                      <Button
                        v-if="status === PreOrderStatus.Auditing && canAudit"
                        size="small"
                        type="primary"
                        @click="openAudit(true)"
                      >
                        审核通过
                      </Button>
                      <Button
                        v-if="status === PreOrderStatus.Auditing && canAudit"
                        size="small"
                        danger
                        @click="openAudit(false)"
                      >
                        审核驳回
                      </Button>
                      <Button
                        v-if="status === PreOrderStatus.Passed && canAudit"
                        size="small"
                        danger
                        :loading="saving"
                        @click="handleRejectAfterPass"
                      >
                        审核后驳回
                      </Button>
                    </Space>
                  </div>

                  <div
                    class="content-section__header section-title-bar basic-info-header"
                  >
                    <span class="card-title card-title--on-primary">
                      <FileText class="size-4" />
                      业务联系单
                    </span>
                    <div class="basic-info-header__meta">
                      <div class="basic-info-header__item">
                        <span class="basic-info-header__label">业务编号</span>
                        <span class="basic-info-header__value">
                          {{ detail?.preOrderNum || '-' }}
                        </span>
                      </div>
                      <div class="basic-info-header__item">
                        <span class="basic-info-header__label">状态</span>
                        <Tag :color="statusMeta.color">{{
                          statusMeta.text
                        }}</Tag>
                      </div>
                      <div
                        class="basic-info-header__item basic-info-header__item--select"
                      >
                        <span class="basic-info-header__label">归属组织</span>
                        <UserOrgSelect
                          v-model="headerOrgId"
                          :user-id="salesUserId"
                          :selected-items="headerOrgSelectedItems"
                          :auto-default="true"
                          allow-clear
                          size="small"
                          class="basic-info-header__select basic-info-header__select--org"
                          placeholder="请选择"
                        />
                      </div>
                      <div
                        class="basic-info-header__item basic-info-header__item--select"
                      >
                        <span class="basic-info-header__label">
                          <span class="order-user-panel__role-required">*</span>
                          业务类型
                        </span>
                        <Select
                          v-model:value="headerBizType"
                          size="small"
                          class="basic-info-header__select"
                          :options="bizTypeOptions"
                          placeholder="请选择"
                        />
                      </div>
                      <div
                        class="basic-info-header__item basic-info-header__item--select"
                      >
                        <span class="basic-info-header__label">
                          <span class="order-user-panel__role-required">*</span>
                          装运方式
                        </span>
                        <Select
                          v-model:value="headerBlType"
                          size="small"
                          class="basic-info-header__select"
                          :options="blTypeOptions"
                          placeholder="请选择"
                        />
                      </div>
                      <div
                        v-if="detail?.transportOrderId"
                        class="basic-info-header__item"
                      >
                        <span class="basic-info-header__label">关联出口</span>
                        <span class="basic-info-header__value">已生成</span>
                      </div>
                    </div>
                  </div>
                  <div class="content-section__body">
                    <BasicForm />
                  </div>
                </section>

                <section class="content-section">
                  <div
                    class="content-section__header section-title-bar pre-order-party-header"
                    role="button"
                    tabindex="0"
                    @click="partyExpanded = !partyExpanded"
                    @keydown.enter.prevent="partyExpanded = !partyExpanded"
                    @keydown.space.prevent="partyExpanded = !partyExpanded"
                  >
                    <span class="card-title card-title--on-primary">
                      <IconifyIcon
                        icon="mdi:account-group-outline"
                        class="size-4"
                      />
                      收发通
                    </span>
                    <span class="pre-order-party-header__hint">
                      {{ partyExpanded ? '收起' : '展开' }}
                      <IconifyIcon
                        icon="mdi:chevron-right"
                        class="pre-order-party-header__chevron size-4"
                        :class="{
                          'pre-order-party-header__chevron--open':
                            partyExpanded,
                        }"
                      />
                    </span>
                  </div>
                  <div v-show="partyExpanded" class="content-section__body">
                    <PartyForm />
                  </div>
                </section>

                <section class="content-section pre-order-port-section">
                  <div class="content-section__header section-title-bar">
                    <span class="card-title card-title--on-primary">
                      <MapPin class="size-4" />
                      港口信息
                    </span>
                  </div>
                  <div class="content-section__body">
                    <PortForm />
                    <Teleport
                      v-if="transitPortLabelTarget"
                      :to="transitPortLabelTarget"
                    >
                      <span
                        class="transit-port-inline-switch transit-port-inline-switch--in-label"
                      >
                        <button
                          type="button"
                          class="transit-port-tabs__item"
                          :class="{
                            'transit-port-tabs__item--active':
                              transitPortTab === 'poT1',
                          }"
                          @click.stop="switchTransitPortTab('poT1')"
                        >
                          中转港1
                        </button>
                        <button
                          type="button"
                          class="transit-port-tabs__item"
                          :class="{
                            'transit-port-tabs__item--active':
                              transitPortTab === 'poT2',
                          }"
                          @click.stop="switchTransitPortTab('poT2')"
                        >
                          中转港2
                        </button>
                      </span>
                    </Teleport>
                  </div>
                </section>
              </div>

              <section class="pre-order-cargo-section">
                <Card class="cargo-container-card">
                  <template #title>
                    <div class="cargo-container-card__title section-title-bar">
                      <span class="card-title card-title--on-primary">
                        <Package class="size-4" />
                        货物与箱型
                      </span>
                      <div class="cargo-type-inline-wrap">
                        <CargoTypeInlineForm />
                      </div>
                    </div>
                  </template>
                  <div class="cargo-main-layout">
                    <div class="cargo-main-layout__left">
                      <CtnTable
                        v-model="ctns"
                        @generate-fee="handleGenerateOceanFreightFees"
                      />
                    </div>
                    <div class="cargo-main-layout__right">
                      <CargoForm />
                    </div>
                  </div>
                </Card>
              </section>

              <section class="pre-order-fee-section">
                <Card class="cargo-container-card">
                  <template #title>
                    <div class="cargo-container-card__title section-title-bar">
                      <span class="card-title card-title--on-primary">
                        费用
                      </span>
                    </div>
                  </template>
                  <FeeTable
                    ref="feeTableRef"
                    v-model="fees"
                    :ctns="ctns"
                    :parties="feeParties"
                    :resolve-parties="resolveFeeParties"
                    :cargo="feeCargo"
                    :local-currency-id="localCurrencyId"
                  />
                </Card>
              </section>

              <section class="pre-order-attachment-section">
                <Card class="cargo-container-card">
                  <template #title>
                    <div class="cargo-container-card__title section-title-bar">
                      <span class="card-title card-title--on-primary">
                        <IconifyIcon icon="mdi:paperclip" class="size-4" />
                        附件
                      </span>
                    </div>
                  </template>
                  <AttachmentGroups
                    v-model="attachmentGroup"
                    :disabled="!canSave"
                  />
                </Card>
              </section>
            </div>

            <div class="right-column">
              <Card class="right-column__card">
                <template #title>
                  <span class="card-title">干系人</span>
                </template>
                <UserTable v-model="users" :roles="userRoleOptions" />
              </Card>
            </div>
          </div>
        </div>

        <!-- 仅切换到「关联海运出口」再挂载，避免一进已通过单据就跑海出 Form 改页签 -->
        <div v-if="hasSeaExport && activeTab === 'seaExport'">
          <SeaExportEditor
            :key="detail?.transportOrderId ?? ''"
            :disable-tab-title="true"
          />
        </div>
      </Spin>
    </div>

    <AuditModal
      v-model:visible="auditModalVisible"
      :success="auditSuccess"
      :users="users"
      @confirm="handleAuditConfirm"
    />
  </Page>
</template>

<style scoped src="../sea-export-admin/basic-info-form/form.css"></style>

<style scoped>
/* 业务联系单：基础 Tab 占满 Page 高度，货物卡片吃掉费用区之上的剩余高度 */
.pre-order-editor-page {
  height: 100%;
}

/* 顶部 content-tabs 与海运出口一致：禁止被下方 flex 内容压扁 */
.pre-order-editor-page > .content-tabs {
  flex-shrink: 0;
  min-height: 40px;
}

.pre-order-editor-spin {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.pre-order-editor-page :deep(.pre-order-editor-spin.ant-spin-nested-loading),
.pre-order-editor-page :deep(.pre-order-editor-spin .ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.pre-order-basic-page {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.pre-order-basic-page :deep(.main-layout) {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.pre-order-basic-page :deep(.center-column) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.pre-order-basic-page :deep(.content-column) {
  flex-shrink: 0;
}

.pre-order-cargo-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 220px;
  overflow: hidden;
}

.pre-order-cargo-section :deep(.cargo-container-card) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.pre-order-cargo-section :deep(.ant-card-head) {
  flex-shrink: 0;
}

.pre-order-cargo-section :deep(.ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.pre-order-cargo-section :deep(.cargo-main-layout) {
  flex: 1;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
}

.pre-order-cargo-section :deep(.cargo-main-layout__left) {
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 0;
  overflow: hidden;
}

.pre-order-cargo-section :deep(.cargo-main-layout__right) {
  flex-shrink: 0;
  align-self: flex-start;
}

.pre-order-fee-section {
  flex-shrink: 0;
}

.pre-order-attachment-section {
  flex-shrink: 0;
}

.pre-order-basic-page :deep(.right-column) {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.pre-order-party-header {
  gap: 8px;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.pre-order-party-header__chevron {
  transition: transform 0.2s ease;
}

.pre-order-party-header__chevron--open {
  transform: rotate(90deg);
}

.pre-order-party-header__hint {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}
</style>
