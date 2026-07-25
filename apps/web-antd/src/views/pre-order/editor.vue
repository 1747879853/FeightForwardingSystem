<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import type { PreOrderCtnRow } from './modules/ctn-table.vue';
import type { PreOrderFeeRow } from './modules/fee-table.vue';
import type { PreOrderServiceRow } from './modules/service-panel.vue';
import type { PreOrderUserRow } from './modules/user-defaults';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { FileText, MapPin, Package } from '@vben/icons';
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
  getPreOrderDetail,
  PreOrderBizType,
  PreOrderStatus,
  rejectPreOrder,
  submitPreOrder,
  unSubmitPreOrder,
} from '#/api/pre-order/pre-order-admin';
import { getClientDetail } from '#/api/sea-export/client-admin';
import { getOrganizationUnit } from '#/api/system/organization-unit';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { formatOrgPathLabel } from '#/composables/use-all-user-org';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import {
  hasValidUserId,
  toSelectedItems,
} from '#/views/sea-export-admin/basic-info-form/sea-export-detail-mapper';
import {
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
import AuditModal from './modules/audit-modal.vue';
import CtnTable from './modules/ctn-table.vue';
import FeeTable from './modules/fee-table.vue';
import {
  checkPreOrderFees,
  normalizePreOrderFeeUnit,
} from './modules/fee-unit';
import ServicePanel from './modules/service-panel.vue';
import {
  applyClientDefaultPreOrderUsers,
  createDefaultPreOrderUsers,
  mergeDefaultPreOrderUsers,
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
const auditModalVisible = ref(false);
const auditSuccess = ref(true);
/** 提交 DTO 的 JSON 快照，用于未保存拦截 */
const formSnapshot = ref('');

/** 归属组织 / 装运方式对齐海运出口放在标题栏 meta 区，不进表单 */
const headerOrgId = ref<null | number | undefined>();
/** 编辑回显兜底选项：详情 orgs 路径拼完整公司名，组织加载完成前也能正确显示 */
const headerOrgSelectedItems = ref<Array<{ label: string; value: number }>>([]);
const headerBlType = ref<number>(0);
const blTypeOptions = getBlTypeOptions();

const ctns = ref<PreOrderCtnRow[]>([]);
/** 新建态默认展示销售/商务/操作/客服/单证，与海运出口一致 */
const users = ref<PreOrderUserRow[]>(createDefaultPreOrderUsers());
/** 干系人中「销售」绑定的用户 id，归属组织下拉据此取该销售的组织范围（对齐海运出口） */
const salesUserId = computed<number | undefined>(() => {
  const row = users.value.find(
    (item) => Number(item.userAttribute) === USER_ATTRIBUTE.Sale,
  );
  return hasValidUserId(row?.userId) ? Number(row?.userId) : undefined;
});
const services = ref<PreOrderServiceRow[]>([]);
const fees = ref<PreOrderFeeRow[]>([]);

const status = computed(() => detail.value?.status ?? PreOrderStatus.Entering);
/** 仅录入/驳回可编辑，其余状态整单只读 */
const readonly = computed(
  () =>
    isEdit.value &&
    status.value !== PreOrderStatus.Entering &&
    status.value !== PreOrderStatus.Rejected,
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

/** 费用表行业类别 → 结算对象映射上下文 */
const feeParties = computed(() => ({
  clientId: currentClientId.value,
  shipperId: currentShipperId.value,
  consigneeId: currentConsigneeId.value,
  notifierId: currentNotifierId.value,
}));

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
const transitPortTab = ref<'pot1' | 'pot2'>('pot1');
const transitPortLabelTarget = ref<HTMLElement | null>(null);

function refreshTransitPortLabelTarget() {
  void nextTick(() => {
    transitPortLabelTarget.value = document.querySelector(
      '.pre-order-port-section .port-flow-item--transit:not(.port-flow-item--hidden) > label',
    ) as HTMLElement | null;
  });
}

function applyTransitPortTabSchema() {
  const isPot1Active = transitPortTab.value === 'pot1';
  portFormApi.updateSchema([
    {
      fieldName: 'pot1Id',
      formItemClass: `port-flow-item port-flow-item--transit port-flow-pos--transit${
        isPot1Active ? '' : ' port-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'pot2Id',
      formItemClass: `port-flow-item port-flow-item--transit port-flow-item--transit-secondary port-flow-pos--transit${
        isPot1Active ? ' port-flow-item--hidden' : ''
      }`,
    },
    {
      fieldName: 'pot1Remark',
      formItemClass: `port-flow-remark port-flow-remark--transit port-flow-pos--transit-remark${
        isPot1Active ? '' : ' port-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'pot2Remark',
      formItemClass: `port-flow-remark port-flow-remark--transit port-flow-remark--transit-secondary port-flow-pos--transit-remark${
        isPot1Active ? ' port-flow-item--hidden' : ''
      }`,
    },
  ]);
  refreshTransitPortLabelTarget();
}

function switchTransitPortTab(tab: 'pot1' | 'pot2') {
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

/** 只读态同步到各表单 commonConfig.disabled */
watch(
  readonly,
  (value) => {
    const state = { commonConfig: { disabled: value } };
    void basicFormApi.setState(state);
    void partyFormApi.setState(state);
    void portFormApi.setState(state);
    void cargoFormApi.setState(state);
    void cargoTypeInlineFormApi.setState(state);
  },
  { immediate: true },
);

/**
 * 委托单位变更：按客户维护的干系人默认回填（销售/客服/操作/单证），
 * 操作/单证/客服缺失时兜底当前登录账号。可编辑态用户主动切换时生效。
 */
async function applyClientDefaultUsersByClientId(value: unknown) {
  if (readonly.value) return;
  const clientId =
    value === null || value === undefined || value === ''
      ? undefined
      : String(value);
  let client: Awaited<ReturnType<typeof getClientDetail>> | undefined;
  if (clientId) {
    try {
      client = await getClientDetail(clientId);
    } catch {
      client = undefined;
    }
  }
  users.value = applyClientDefaultPreOrderUsers(
    users.value,
    client,
    currentUserId.value,
  );
}

/** 委托单位变更：同步服务项候选 + 干系人默认回填 */
function bindClientUserLinkage() {
  basicFormApi.updateSchema([
    {
      fieldName: 'clientId',
      componentProps: {
        onChange: (value: unknown) => {
          currentClientId.value = toOptionalStringId(value);
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
        onChange: (value: unknown) => {
          currentShipperId.value = toOptionalStringId(value);
        },
      },
    },
    {
      fieldName: 'consigneeId',
      componentProps: {
        onChange: (value: unknown) => {
          currentConsigneeId.value = toOptionalStringId(value);
        },
      },
    },
    {
      fieldName: 'notifierId',
      componentProps: {
        onChange: (value: unknown) => {
          currentNotifierId.value = toOptionalStringId(value);
        },
      },
    },
  ]);
}

let rowSeed = 0;
const nextRowKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${(rowSeed += 1)}`;

function fillFromDetail(dto: PreOrderAdminApi.PreOrderDto) {
  detail.value = dto;
  headerOrgId.value = dto.orgId ?? undefined;
  const detailOrgs = dto.orgs ?? [];
  const detailOrgLast = detailOrgs.at(-1);
  headerOrgSelectedItems.value = detailOrgLast?.id
    ? [{ value: detailOrgLast.id, label: formatOrgPathLabel(detailOrgs) }]
    : [];
  headerBlType.value = dto.blType ?? 0;
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
  void portFormApi.setValues({
    receivePortId: dto.receivePortId,
    receivePortRemark: dto.receivePortRemark,
    polId: dto.polId,
    polRemark: dto.polRemark,
    pot1Id: dto.pot1Id,
    pot1Remark: dto.pot1Remark,
    pot2Id: dto.pot2Id,
    pot2Remark: dto.pot2Remark,
    podId: dto.podId,
    podRemark: dto.podRemark,
    deliverPortId: dto.deliverPortId,
    deliverPortRemark: dto.deliverPortRemark,
  });
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
  users.value = mergeDefaultPreOrderUsers(
    (dto.preOrderUsers ?? []).map((item) => ({
      ...item,
      rowKey: nextRowKey('user'),
    })),
  );
  services.value = (dto.preOrderServices ?? [])
    // compareStatus=1 是海运出口侧新增，业务联系单本身并未勾选（后端以 id=0 追加）
    .filter((item) => item.id !== 0 && item.serviceType != null)
    .map((item) => ({
      serviceType: Number(item.serviceType),
      sortId: item.sortId,
    }));
  // 历史数据可能存着海出口径的「毛重/尺码」，后端识别不了会算成 0，回显时先归一
  fees.value = (dto.preOrderFees ?? []).map((item) => ({
    ...item,
    unit: normalizePreOrderFeeUnit(item.unit) || undefined,
    rowKey: nextRowKey('fee'),
  }));
  currentClientId.value = dto.clientId ? String(dto.clientId) : undefined;
  currentShipperId.value = dto.shipperId ? String(dto.shipperId) : undefined;
  currentConsigneeId.value = dto.consigneeId
    ? String(dto.consigneeId)
    : undefined;
  currentNotifierId.value = dto.notifierId ? String(dto.notifierId) : undefined;
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
  applyTransitPortTabSchema();
  bindClientUserLinkage();
  bindPartySettlementLinkage();
  bindCargoMetricsLinkage();
  const copyFrom = route.query.copyFrom ? String(route.query.copyFrom) : '';
  if (preOrderId.value) {
    await loadDetail();
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
    bizType: PreOrderBizType.SeaExport,
    ...basicValues,
    ...partyValues,
    ...portValues,
    ...cargoValues,
    cargoId: cargoTypeValues.cargoId ?? 0,
    orgId: headerOrgId.value,
    blType: headerBlType.value ?? 0,
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
    preOrderUsers: users.value.map(({ rowKey, ...rest }) => rest),
    preOrderServices: services.value.map((item) => ({
      serviceType: item.serviceType,
      sortId: item.sortId ?? 0,
    })),
    preOrderFees: fees.value.map(
      ({ rowKey, feeCode, settlement, currency, ...rest }) => rest,
    ),
  } as PreOrderAdminApi.PreOrderAddDto;
}

/** 提交 DTO 的稳定序列化，作为脏检查基线 */
async function buildSnapshot(): Promise<string> {
  const payload = await buildSubmitPayload();
  return JSON.stringify(payload, Object.keys(payload).sort());
}

async function syncFormSnapshot() {
  formSnapshot.value = await buildSnapshot();
}

async function isFormDirty(): Promise<boolean> {
  if (readonly.value || !formSnapshot.value) return false;
  return (await buildSnapshot()) !== formSnapshot.value;
}

useUnsavedGuard({ isDirty: isFormDirty });

/** 销售必填且唯一，与后端卡点保持一致，提前拦截以免白跑一次请求 */
function validateUsers(): boolean {
  const sales = users.value.filter(
    (row) => Number(row.userAttribute) === USER_ATTRIBUTE.Sale && row.userId,
  );
  if (sales.length !== 1) {
    message.warning('销售必填且只能指派一个用户');
    return false;
  }
  if (users.value.some((row) => !row.userId)) {
    message.warning('干系人存在未选择人员的行');
    return false;
  }
  return true;
}

/**
 * 费用行体检：审核通过时后端只转换三要素齐全的行，并按单位重算数量金额，
 * `strict` 用于提交审核前硬拦截，保存草稿时只提示。
 */
function validateFees(strict: boolean): boolean {
  const ctnNames = ctns.value
    .map((row) => row.ctnCodeName)
    .filter((name): name is string => !!name);
  const { errors, warnings } = checkPreOrderFees(fees.value, ctnNames);
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
  if (!(await validateForms())) return;
  if (!validateUsers()) return;
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
      <div class="content-tabs" :style="contentTabsStyle">
        <span
          class="content-tab"
          :class="{ 'content-tab--active': activeTab === 'basic' }"
          :style="getContentTabStyle(activeTab === 'basic')"
          @click="activeTab = 'basic'"
        >
          基础信息
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
                        :readonly="readonly"
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
                        v-if="!readonly"
                        v-access:code="isEdit ? perm.edit : perm.add"
                        size="small"
                        type="primary"
                        :loading="saving"
                        @click="handleSave"
                      >
                        保存
                      </Button>
                      <Button
                        v-if="isEdit && !readonly"
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
                      基础信息
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
                          :disabled="readonly"
                          allow-clear
                          size="small"
                          class="basic-info-header__select basic-info-header__select--org"
                          placeholder="请选择"
                        />
                      </div>
                      <div
                        class="basic-info-header__item basic-info-header__item--select"
                      >
                        <span class="basic-info-header__label">装运方式</span>
                        <Select
                          v-model:value="headerBlType"
                          :disabled="readonly"
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
                  <div
                    class="content-section__body content-section__body--flush-bottom"
                  >
                    <BasicForm />
                  </div>
                </section>

                <section class="content-section">
                  <div
                    class="content-section__body content-section__body--flush-top"
                  >
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
                              transitPortTab === 'pot1',
                          }"
                          @click.stop="switchTransitPortTab('pot1')"
                        >
                          中转港1
                        </button>
                        <button
                          type="button"
                          class="transit-port-tabs__item"
                          :class="{
                            'transit-port-tabs__item--active':
                              transitPortTab === 'pot2',
                          }"
                          @click.stop="switchTransitPortTab('pot2')"
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
                      <CtnTable v-model="ctns" :readonly="readonly" />
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
                    v-model="fees"
                    :ctns="ctns"
                    :parties="feeParties"
                    :cargo="feeCargo"
                    :local-currency-id="localCurrencyId"
                    :readonly="readonly"
                  />
                </Card>
              </section>
            </div>

            <div class="right-column">
              <Card class="right-column__card">
                <template #title>
                  <span class="card-title">干系人</span>
                </template>
                <UserTable v-model="users" :readonly="readonly" />
              </Card>
            </div>
          </div>
        </div>

        <div v-if="hasSeaExport" v-show="activeTab === 'seaExport'">
          <SeaExportEditor :key="detail?.transportOrderId ?? ''" />
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

.pre-order-basic-page :deep(.right-column) {
  height: 100%;
  min-height: 0;
  overflow: auto;
}
</style>
