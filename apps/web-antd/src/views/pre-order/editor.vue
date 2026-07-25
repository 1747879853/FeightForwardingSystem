<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import type { PreOrderCtnRow } from './modules/ctn-table.vue';
import type { PreOrderFeeRow } from './modules/fee-table.vue';
import type { PreOrderServiceRow } from './modules/service-panel.vue';
import type { PreOrderUserRow } from './modules/user-defaults';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { FileText, MapPin, Package } from '@vben/icons';

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
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import { getBlTypeOptions } from '#/views/sea-export-admin/data';
import SeaExportEditor from '#/views/sea-export-admin/editor.vue';

import {
  usePreOrderBasicSchema,
  usePreOrderCargoSchema,
  usePreOrderPartySchema,
  usePreOrderPortSchema,
  USER_ATTRIBUTE,
} from './form-data';
import AuditModal from './modules/audit-modal.vue';
import CtnTable from './modules/ctn-table.vue';
import FeeTable from './modules/fee-table.vue';
import ServicePanel from './modules/service-panel.vue';
import {
  createDefaultPreOrderUsers,
  mergeDefaultPreOrderUsers,
} from './modules/user-defaults';
import UserTable from './modules/user-table.vue';

defineOptions({ name: 'PreOrderEditor' });

const perm = createAbpPermission('Admin.PreOrder');
const auditCode = 'Admin.PreOrder.Audit';
const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canAudit = computed(() => hasAccessByCodes([auditCode]));
const { open: openWorkflowTimeline } = useWorkflowTimeline();

const preOrderId = ref<string>(route.params.id ? String(route.params.id) : '');
const isEdit = computed(() => !!preOrderId.value);

const loading = ref(false);
const saving = ref(false);
const detail = ref<PreOrderAdminApi.PreOrderDto | null>(null);
const activeTab = ref<'basic' | 'seaExport'>('basic');
const auditModalVisible = ref(false);
const auditSuccess = ref(true);
/** 提交 DTO 的 JSON 快照，用于未保存拦截 */
const formSnapshot = ref('');

/** 归属组织 / 装运方式对齐海运出口放在标题栏 meta 区，不进表单 */
const headerOrgId = ref<number | undefined>();
const headerBlType = ref<number>(0);
const blTypeOptions = getBlTypeOptions();

const ctns = ref<PreOrderCtnRow[]>([]);
/** 新建态默认展示销售/商务/操作/客服/单证，与海运出口一致 */
const users = ref<PreOrderUserRow[]>(createDefaultPreOrderUsers());
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
  wrapperClass: 'party-flow-wrap form-controls-small grid-cols-3 gap-x-4',
});

const [PortForm, portFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePreOrderPortSchema(),
  showDefaultActions: false,
  wrapperClass: 'port-flow-wrap form-controls-small grid-cols-6 gap-x-4',
});

const [CargoForm, cargoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePreOrderCargoSchema(),
  showDefaultActions: false,
  wrapperClass: 'cargo-main-wrap form-controls-small grid-cols-4 gap-x-4',
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
  },
  { immediate: true },
);

/** 服务候选依赖起运港与委托单位，需实时跟随表单值 */
const currentPolId = ref<number | string | undefined>();
const currentClientId = ref<string | undefined>();

async function syncServiceContext() {
  const [basicValues, portValues] = await Promise.all([
    basicFormApi.getValues(),
    portFormApi.getValues(),
  ]);
  currentClientId.value = basicValues.clientId as string | undefined;
  currentPolId.value = portValues.polId as number | string | undefined;
}

let rowSeed = 0;
const nextRowKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${(rowSeed += 1)}`;

function fillFromDetail(dto: PreOrderAdminApi.PreOrderDto) {
  detail.value = dto;
  headerOrgId.value = dto.orgId ?? undefined;
  headerBlType.value = dto.blType ?? 0;
  void basicFormApi.setValues({
    clientId: dto.clientId,
    mblNum: dto.mblNum,
    cargoId: dto.cargoId,
    codeServiceId: dto.codeServiceId,
    tradeTermsType: dto.tradeTermsType,
    codeFrtId: dto.codeFrtId,
    etd: dto.etd,
    goodsCompleteTime: dto.goodsCompleteTime,
    carrierId: dto.carrierId,
  });
  void partyFormApi.setValues({
    shipperId: dto.shipperId,
    consigneeId: dto.consigneeId,
    notifierId: dto.notifierId,
    remark: dto.remark,
  });
  void portFormApi.setValues({
    receivePortId: dto.receivePortId,
    polId: dto.polId,
    pot1Id: dto.pot1Id,
    pot2Id: dto.pot2Id,
    podId: dto.podId,
    deliverPortId: dto.deliverPortId,
  });
  void cargoFormApi.setValues({
    pkgs: dto.pkgs,
    codePackageId: dto.codePackageId,
    kgs: dto.kgs,
    cbm: dto.cbm,
  });
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
  fees.value = (dto.preOrderFees ?? []).map((item) => ({
    ...item,
    rowKey: nextRowKey('fee'),
  }));
  currentClientId.value = dto.clientId;
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

onMounted(async () => {
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
  const [basicValues, partyValues, portValues, cargoValues] = await Promise.all(
    [
      basicFormApi.getValues(),
      partyFormApi.getValues(),
      portFormApi.getValues(),
      cargoFormApi.getValues(),
    ],
  );
  return {
    bizType: PreOrderBizType.SeaExport,
    ...basicValues,
    ...partyValues,
    ...portValues,
    ...cargoValues,
    orgId: headerOrgId.value,
    blType: headerBlType.value ?? 0,
    preOrderNum: undefined,
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
  ]);
  return results.every((item) => item.valid);
}

async function handleSave() {
  if (!(await validateForms())) return;
  if (!validateUsers()) return;
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
    <div class="flex min-w-0 flex-1 flex-col">
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

      <Spin :spinning="loading">
        <div v-show="activeTab === 'basic'" class="sea-export-form-page">
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
                    <BasicForm @change="syncServiceContext" />
                  </div>
                </section>

                <section class="content-section">
                  <div
                    class="content-section__body content-section__body--flush-top"
                  >
                    <PartyForm />
                  </div>
                </section>

                <section class="content-section">
                  <div class="content-section__header section-title-bar">
                    <span class="card-title card-title--on-primary">
                      <MapPin class="size-4" />
                      港口与航线
                    </span>
                  </div>
                  <div class="content-section__body">
                    <PortForm @change="syncServiceContext" />
                  </div>
                </section>
              </div>

              <section>
                <Card class="cargo-container-card">
                  <template #title>
                    <div class="cargo-container-card__title section-title-bar">
                      <span class="card-title card-title--on-primary">
                        <Package class="size-4" />
                        货物与箱型
                      </span>
                    </div>
                  </template>
                  <CargoForm />
                  <div class="cargo-ctn-section">
                    <CtnTable v-model="ctns" :readonly="readonly" />
                  </div>
                </Card>
              </section>

              <section>
                <Card class="cargo-container-card">
                  <template #title>
                    <div class="cargo-container-card__title section-title-bar">
                      <span class="card-title card-title--on-primary">
                        费用
                      </span>
                    </div>
                  </template>
                  <FeeTable v-model="fees" :ctns="ctns" :readonly="readonly" />
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
