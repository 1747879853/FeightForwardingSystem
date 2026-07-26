<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import type { PreOrderCtnRow } from './modules/ctn-table.vue';
import type { PreOrderFeeRow } from './modules/fee-table.vue';
import type { PreOrderServiceRow } from './modules/service-panel.vue';
import type { PreOrderUserRow } from './modules/user-defaults';

import { computed, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { FileText, MapPin, Package } from '@vben/icons';

import {
  Button,
  Card,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import { TaskType } from '#/api/audit-approval/payment-review-admin';
import {
  auditPreOrder,
  getPreOrderBizTypeOptions,
  getPreOrderDetail,
  PreOrderStatus,
  rejectPreOrder,
  unSubmitPreOrder,
} from '#/api/pre-order/pre-order-admin';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { formatOrgPathLabel } from '#/composables/use-all-user-org';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import {
  getBlTypeOptions,
  getCargoTypeOptions,
  getTradeTermsTypeOptions,
} from '#/views/sea-export-admin/data';
import { getIndustryCategoryOptions } from '#/views/sea-export-admin/orderFee/data';
import SeaExportEditor from '#/views/sea-export-admin/editor.vue';

import { getPreOrderFormPath, getPreOrderStatusOptions } from './data';
import { PAY_SIDE_OPTIONS, PRE_ORDER_USER_ATTRIBUTE_LABELS } from './form-data';
import AuditModal from './modules/audit-modal.vue';
import ServicePanel from './modules/service-panel.vue';

defineOptions({ name: 'PreOrderDetail' });

const perm = createAbpPermission('Admin.PreOrder');
const auditCode = 'Admin.PreOrder.Audit';
const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canAudit = computed(() => hasAccessByCodes([auditCode]));
const { open: openWorkflowTimeline } = useWorkflowTimeline();

const preOrderId = computed(() =>
  route.params.id ? String(route.params.id) : '',
);

const loading = ref(false);
const saving = ref(false);
const detail = ref<PreOrderAdminApi.PreOrderDto | null>(null);
const activeTab = ref<'basic' | 'seaExport'>('basic');
const auditModalVisible = ref(false);
const auditSuccess = ref(true);
const transitPortTab = ref<'pot1' | 'pot2'>('pot1');

const services = ref<PreOrderServiceRow[]>([]);
const users = ref<PreOrderUserRow[]>([]);
const ctns = ref<PreOrderCtnRow[]>([]);
const fees = ref<PreOrderFeeRow[]>([]);

const status = computed(() => detail.value?.status ?? PreOrderStatus.Entering);
const statusMeta = computed(() => {
  const hit = getPreOrderStatusOptions().find(
    (item) => item.value === status.value,
  );
  return {
    color: hit?.color ?? 'default',
    text: hit?.label ?? '录入状态',
  };
});

const hasSeaExport = computed(
  () =>
    status.value === PreOrderStatus.Passed && !!detail.value?.transportOrderId,
);

const orgLabel = computed(() => {
  const orgs = detail.value?.orgs ?? [];
  if (orgs.length === 0) return '-';
  return formatOrgPathLabel(orgs) || '-';
});

const bizTypeLabel = computed(() =>
  optionLabel(getPreOrderBizTypeOptions(), detail.value?.bizType),
);
const blTypeLabel = computed(() =>
  optionLabel(getBlTypeOptions(), detail.value?.blType),
);
const cargoTypeLabel = computed(() =>
  optionLabel(getCargoTypeOptions(), detail.value?.cargoId),
);
const tradeTermsLabel = computed(() =>
  optionLabel(getTradeTermsTypeOptions(), detail.value?.tradeTermsType),
);
const goodsNames = computed(() => {
  const names = (detail.value?.preOrderCodeGoodss ?? [])
    .map(
      (item) =>
        item.codeGoods?.name ||
        item.codeGoods?.cnName ||
        item.codeGoods?.enName ||
        '',
    )
    .filter(Boolean);
  return names.length > 0 ? names.join('、') : '-';
});

const ctnColumns = [
  { title: '箱型', dataIndex: 'ctnName', width: 160 },
  { title: '箱量', dataIndex: 'count', width: 90 },
  { title: '货重', dataIndex: 'weight', width: 100 },
  { title: '指导价', dataIndex: 'sugPrice', width: 100 },
  { title: '卖价', dataIndex: 'price', width: 100 },
  { title: '备注', dataIndex: 'remark', minWidth: 140 },
];

const ctnRows = computed(() =>
  ctns.value.map((item) => ({
    key: item.rowKey,
    ctnName: named(item.ctnCode, item.ctnCodeName),
    count: displayValue(item.count),
    weight: displayValue(item.weight),
    sugPrice: displayValue(item.sugPrice),
    price: displayValue(item.price),
    remark: displayValue(item.remark),
  })),
);

const feeColumns = [
  { title: '收付', dataIndex: 'paySide', width: 80 },
  { title: '费用代码', dataIndex: 'feeCode', width: 140 },
  { title: '结算对象类别', dataIndex: 'industryCategory', width: 120 },
  { title: '结算对象', dataIndex: 'settlement', width: 160 },
  { title: '币别', dataIndex: 'currency', width: 90 },
  { title: '汇率', dataIndex: 'exchangeRate', width: 90 },
  { title: '单位', dataIndex: 'unit', width: 90 },
  { title: '数量', dataIndex: 'quantity', width: 90 },
  { title: '含税单价', dataIndex: 'unitPrice', width: 100 },
  { title: '税率(%)', dataIndex: 'taxRate', width: 90 },
  { title: '不含税单价', dataIndex: 'noTaxUnitPrice', width: 110 },
  { title: '金额', dataIndex: 'amount', width: 100 },
  { title: '禁开票', dataIndex: 'invoiceBlocked', width: 80 },
  { title: '机密', dataIndex: 'isConfidential', width: 70 },
  { title: '备注', dataIndex: 'remark', minWidth: 120 },
];

const feeRows = computed(() =>
  fees.value.map((item) => ({
    key: item.rowKey,
    paySide: optionLabel(PAY_SIDE_OPTIONS, item.paySide),
    feeCode: named(item.feeCode),
    industryCategory: industryCategoryLabel(item.industryCategory),
    settlement: named(item.settlement),
    currency: named(item.currency),
    exchangeRate: displayValue(item.exchangeRate),
    unit: displayValue(item.unit),
    quantity: displayValue(item.quantity),
    unitPrice: displayValue(item.unitPrice),
    taxRate: displayValue(item.taxRate),
    noTaxUnitPrice: displayValue(item.noTaxUnitPrice),
    amount: displayValue(item.amount),
    invoiceBlocked: boolText(item.invoiceBlocked),
    isConfidential: boolText(item.isConfidential),
    remark: displayValue(item.remark),
  })),
);

const userColumns = [
  { title: '角色', dataIndex: 'role', width: 110 },
  { title: '用户', dataIndex: 'userName' },
];

const userRows = computed(() =>
  users.value.map((item) => ({
    key: item.rowKey,
    role: optionLabel(PRE_ORDER_USER_ATTRIBUTE_LABELS, item.userAttribute),
    userName: displayValue(item.userNickName),
  })),
);

function named(
  dto?: null | {
    cnName?: string;
    code?: string;
    /** 箱型详情常用字段，SimpleNamedDto 未声明 */
    ctnName?: string;
    enName?: string;
    name?: string;
  },
  fallback?: null | string,
) {
  return (
    dto?.name ||
    dto?.ctnName ||
    dto?.cnName ||
    dto?.enName ||
    dto?.code ||
    (fallback != null && fallback !== '' ? String(fallback) : '') ||
    '-'
  );
}

function displayValue(value?: null | number | string) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function boolText(value?: boolean | null) {
  if (value == null) return '-';
  return value ? '是' : '否';
}

function optionLabel(
  options: Array<{ label: string; value: number | string }>,
  value?: null | number | string,
) {
  if (value === null || value === undefined || value === '') return '-';
  const hit = options.find((item) => String(item.value) === String(value));
  return hit?.label ?? '-';
}

function industryCategoryLabel(key?: null | number) {
  if (key == null) return '-';
  const hit = getIndustryCategoryOptions().find(
    (item) => Number(item.key) === Number(key),
  );
  return hit?.label ?? '-';
}

function formatDate(value?: null | string) {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '-';
}

function portName(
  port?: null | PreOrderAdminApi.SimpleNamedDto,
  fallbackName?: null | string,
) {
  return named(port, fallbackName);
}

function fillFromDetail(dto: PreOrderAdminApi.PreOrderDto) {
  detail.value = dto;
  services.value = (dto.preOrderServices ?? [])
    .filter((item) => item.serviceType != null && Number(item.id ?? 1) !== 0)
    .map((item) => ({
      serviceType: Number(item.serviceType),
      sortId: item.sortId,
    }));
  users.value = (dto.preOrderUsers ?? []).map((item, index) => ({
    ...item,
    rowKey: String(item.id ?? `user-${index}`),
  }));
  ctns.value = (dto.preOrderCtns ?? []).map((item, index) => ({
    ...item,
    rowKey: String(item.id ?? `ctn-${index}`),
    ctnCodeName:
      (item.ctnCode as { ctnName?: string } | null | undefined)?.ctnName ||
      item.ctnCode?.name,
  }));
  fees.value = (dto.preOrderFees ?? []).map((item, index) => ({
    ...item,
    rowKey: String(item.id ?? `fee-${index}`),
  }));
}

async function syncRouteByStatus() {
  if (!preOrderId.value || !detail.value) return;
  const targetPath = getPreOrderFormPath(preOrderId.value, status.value);
  if (route.path === targetPath) return;
  await router.replace(targetPath);
}

async function loadDetail() {
  if (!preOrderId.value) return;
  loading.value = true;
  try {
    const dto = await getPreOrderDetail(preOrderId.value);
    fillFromDetail(dto);
    await syncRouteByStatus();
  } finally {
    loading.value = false;
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
  if (!preOrderId.value) return;
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

onMounted(async () => {
  await loadDetail();
});
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
                        :client-id="detail?.clientId"
                        :pol-id="detail?.polId"
                        :readonly="true"
                        :is-edit="true"
                        :compare-list="detail?.preOrderServices ?? []"
                      />
                    </div>
                    <Space class="content-section__actions-right">
                      <Button size="small" @click="handleViewWorkflow">
                        审核流程
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
                      <div class="basic-info-header__item">
                        <span class="basic-info-header__label">归属组织</span>
                        <span class="basic-info-header__value">
                          {{ orgLabel }}
                        </span>
                      </div>
                      <div class="basic-info-header__item">
                        <span class="basic-info-header__label">业务类型</span>
                        <span class="basic-info-header__value">
                          {{ bizTypeLabel }}
                        </span>
                      </div>
                      <div class="basic-info-header__item">
                        <span class="basic-info-header__label">装运方式</span>
                        <span class="basic-info-header__value">
                          {{ blTypeLabel }}
                        </span>
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
                    <div
                      class="basic-info-wrap form-controls-small grid grid-cols-6 gap-x-4 gap-y-2"
                    >
                      <div class="detail-field">
                        <div class="detail-field__label">委托单位</div>
                        <div class="detail-field__value">
                          {{ named(detail?.client, detail?.clientName) }}
                        </div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-field__label">主提单号</div>
                        <div class="detail-field__value">
                          {{ displayValue(detail?.mblNum) }}
                        </div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-field__label">货好时间</div>
                        <div class="detail-field__value">
                          {{ formatDate(detail?.goodsCompleteTime) }}
                        </div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-field__label">开船日期</div>
                        <div class="detail-field__value">
                          {{ formatDate(detail?.etd) }}
                        </div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-field__label">船公司</div>
                        <div class="detail-field__value">
                          {{ named(detail?.carrier, detail?.carrierName) }}
                        </div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-field__label">运输条款</div>
                        <div class="detail-field__value">
                          {{ named(detail?.codeService) }}
                        </div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-field__label">贸易条款</div>
                        <div class="detail-field__value">
                          {{ tradeTermsLabel }}
                        </div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-field__label">付费方式</div>
                        <div class="detail-field__value">
                          {{ named(detail?.codeFrt) }}
                        </div>
                      </div>
                      <div class="detail-field col-span-4">
                        <div class="detail-field__label">备注</div>
                        <div
                          class="detail-field__value detail-field__value--wrap"
                        >
                          {{ displayValue(detail?.remark) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="content-section">
                  <div
                    class="content-section__body content-section__body--flush-top"
                  >
                    <div
                      class="party-flow-wrap form-controls-small detail-party-flow grid grid-cols-6 gap-x-4"
                    >
                      <div class="party-flow-item party-flow-pos--1">
                        <div class="detail-field__label">发货人</div>
                        <div class="detail-field__value">
                          {{ named(detail?.shipper) }}
                        </div>
                      </div>
                      <div class="party-flow-content party-flow-content-pos--1">
                        <pre class="detail-pre">{{
                          displayValue(detail?.shipperContent)
                        }}</pre>
                      </div>
                      <div class="party-flow-item party-flow-pos--2">
                        <div class="detail-field__label">收货人</div>
                        <div class="detail-field__value">
                          {{ named(detail?.consignee) }}
                        </div>
                      </div>
                      <div class="party-flow-content party-flow-content-pos--2">
                        <pre class="detail-pre">{{
                          displayValue(detail?.consigneeContent)
                        }}</pre>
                      </div>
                      <div
                        class="party-flow-item party-flow-item--notifier party-flow-pos--3"
                      >
                        <div class="detail-field__label">通知人</div>
                        <div class="detail-field__value">
                          {{ named(detail?.notifier) }}
                        </div>
                      </div>
                      <div
                        class="party-flow-content party-flow-content--notifier party-flow-content-pos--3"
                      >
                        <pre class="detail-pre">{{
                          displayValue(detail?.notifierContent)
                        }}</pre>
                      </div>
                    </div>
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
                    <div
                      class="port-flow-wrap form-controls-small detail-port-flow grid grid-cols-5 gap-x-8"
                    >
                      <div class="port-flow-item port-flow-pos--receive">
                        <div class="detail-field__label">收货地</div>
                        <div class="detail-field__value">
                          {{ portName(detail?.receivePort) }}
                        </div>
                      </div>
                      <div class="port-flow-item port-flow-pos--pol">
                        <div class="detail-field__label">起运港</div>
                        <div class="detail-field__value">
                          {{ portName(detail?.pol, detail?.polName) }}
                        </div>
                      </div>
                      <div
                        class="port-flow-item port-flow-item--transit port-flow-pos--transit"
                        :class="{
                          'port-flow-item--hidden': transitPortTab !== 'pot1',
                        }"
                      >
                        <div class="detail-field__label detail-transit-label">
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
                              @click="transitPortTab = 'pot1'"
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
                              @click="transitPortTab = 'pot2'"
                            >
                              中转港2
                            </button>
                          </span>
                        </div>
                        <div class="detail-field__value">
                          {{ portName(detail?.pot1) }}
                        </div>
                      </div>
                      <div
                        class="port-flow-item port-flow-item--transit port-flow-item--transit-secondary port-flow-pos--transit"
                        :class="{
                          'port-flow-item--hidden': transitPortTab !== 'pot2',
                        }"
                      >
                        <div class="detail-field__label detail-transit-label">
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
                              @click="transitPortTab = 'pot1'"
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
                              @click="transitPortTab = 'pot2'"
                            >
                              中转港2
                            </button>
                          </span>
                        </div>
                        <div class="detail-field__value">
                          {{ portName(detail?.pot2) }}
                        </div>
                      </div>
                      <div class="port-flow-item port-flow-pos--pod">
                        <div class="detail-field__label">目的港</div>
                        <div class="detail-field__value">
                          {{ portName(detail?.pod, detail?.podName) }}
                        </div>
                      </div>
                      <div
                        class="port-flow-item port-flow-item--last port-flow-pos--deliver"
                      >
                        <div class="detail-field__label">交货地</div>
                        <div class="detail-field__value">
                          {{ portName(detail?.deliverPort) }}
                        </div>
                      </div>

                      <div
                        class="port-flow-remark port-flow-pos--receive-remark"
                      >
                        <pre class="detail-pre">{{
                          displayValue(detail?.receivePortRemark)
                        }}</pre>
                      </div>
                      <div class="port-flow-remark port-flow-pos--pol-remark">
                        <pre class="detail-pre">{{
                          displayValue(detail?.polRemark)
                        }}</pre>
                      </div>
                      <div
                        class="port-flow-remark port-flow-remark--transit port-flow-pos--transit-remark"
                        :class="{
                          'port-flow-item--hidden': transitPortTab !== 'pot1',
                        }"
                      >
                        <pre class="detail-pre">{{
                          displayValue(detail?.pot1Remark)
                        }}</pre>
                      </div>
                      <div
                        class="port-flow-remark port-flow-remark--transit port-flow-remark--transit-secondary port-flow-pos--transit-remark"
                        :class="{
                          'port-flow-item--hidden': transitPortTab !== 'pot2',
                        }"
                      >
                        <pre class="detail-pre">{{
                          displayValue(detail?.pot2Remark)
                        }}</pre>
                      </div>
                      <div class="port-flow-remark port-flow-pos--pod-remark">
                        <pre class="detail-pre">{{
                          displayValue(detail?.podRemark)
                        }}</pre>
                      </div>
                      <div
                        class="port-flow-remark port-flow-pos--deliver-remark"
                      >
                        <pre class="detail-pre">{{
                          displayValue(detail?.deliverPortRemark)
                        }}</pre>
                      </div>
                    </div>
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
                      <div class="basic-info-header__meta detail-cargo-inline">
                        <div class="basic-info-header__item">
                          <span class="basic-info-header__label">货物类型</span>
                          <span class="basic-info-header__value">
                            {{ cargoTypeLabel }}
                          </span>
                        </div>
                        <div class="basic-info-header__item">
                          <span class="basic-info-header__label">品名</span>
                          <span class="basic-info-header__value">
                            {{ goodsNames }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </template>
                  <div class="cargo-main-layout">
                    <div class="cargo-main-layout__left">
                      <Table
                        size="small"
                        :columns="ctnColumns"
                        :data-source="ctnRows"
                        :pagination="false"
                        :locale="{ emptyText: '暂无箱型箱量' }"
                      />
                    </div>
                    <div class="cargo-main-layout__right">
                      <div class="detail-cargo-metrics">
                        <div class="detail-cargo-metrics__row">
                          <span class="detail-cargo-metrics__label">件数</span>
                          <span class="detail-cargo-metrics__value">
                            {{ displayValue(detail?.pkgs) }}
                          </span>
                        </div>
                        <div class="detail-cargo-metrics__row">
                          <span class="detail-cargo-metrics__label">包装</span>
                          <span class="detail-cargo-metrics__value">
                            {{ named(detail?.codePackage) }}
                          </span>
                        </div>
                        <div class="detail-cargo-metrics__row">
                          <span class="detail-cargo-metrics__label">
                            毛重(KGS)
                          </span>
                          <span class="detail-cargo-metrics__value">
                            {{ displayValue(detail?.kgs) }}
                          </span>
                        </div>
                        <div class="detail-cargo-metrics__row">
                          <span class="detail-cargo-metrics__label">
                            尺码(CBM)
                          </span>
                          <span class="detail-cargo-metrics__value">
                            {{ displayValue(detail?.cbm) }}
                          </span>
                        </div>
                      </div>
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
                  <Table
                    size="small"
                    :columns="feeColumns"
                    :data-source="feeRows"
                    :pagination="false"
                    :scroll="{ x: 1600 }"
                    :locale="{ emptyText: '暂无费用' }"
                  />
                </Card>
              </section>
            </div>

            <div class="right-column">
              <Card class="right-column__card">
                <template #title>
                  <span class="card-title">干系人</span>
                </template>
                <Table
                  size="small"
                  :columns="userColumns"
                  :data-source="userRows"
                  :pagination="false"
                  :locale="{ emptyText: '暂无干系人' }"
                />
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
.pre-order-editor-page {
  height: 100%;
}

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
  overflow: auto;
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

.detail-field {
  min-width: 0;
}

.detail-field__label {
  margin-bottom: 2px;
  font-size: 12px;
  line-height: 20px;
  color: #8c8c8c;
}

.detail-field__value {
  min-height: 24px;
  font-size: 12px;
  font-weight: 500;
  line-height: 22px;
  color: #262626;
  word-break: break-all;
}

.detail-field__value--wrap {
  white-space: pre-wrap;
}

.detail-pre {
  min-height: 48px;
  margin: 0;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
  color: #262626;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.detail-party-flow,
.detail-port-flow {
  position: relative;
}

.detail-transit-label {
  display: flex;
  align-items: center;
  min-height: 22px;
}

.detail-cargo-inline {
  margin-left: 12px;
}

.detail-cargo-metrics {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 120px;
  padding: 4px 0;
}

.detail-cargo-metrics__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-cargo-metrics__label {
  font-size: 12px;
  line-height: 20px;
  color: #8c8c8c;
}

.detail-cargo-metrics__value {
  min-height: 22px;
  font-size: 12px;
  font-weight: 500;
  line-height: 22px;
  color: #262626;
  word-break: break-all;
}
</style>
