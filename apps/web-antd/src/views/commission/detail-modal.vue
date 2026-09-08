<script lang="ts" setup>
import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Spin, Table, Tag } from 'ant-design-vue';

import {
  getOperationDetail,
  getSalesDetail,
} from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';

import CalcPanels from './calc-panels.vue';
import {
  formatAmount,
  formatDateTimeText,
  formatMonth,
  getBaseSalaryModeLabel,
  getStatusOptions,
  ticketRowKey,
  useOperationTicketColumns,
  useSalesTicketColumns,
} from './data';

defineOptions({ name: 'CommissionOrderDetailModal' });

const { CommissionItemProfitType, CommissionType } = CommissionOrderAdminApi;

const detail = ref<
  | CommissionOrderAdminApi.CommissionSalesDetailDto
  | CommissionOrderAdminApi.CommissionOperationDetailDto
  | null
>(null);

const loading = ref(false);

const [Modal, modalApi] = useVbenModal({
  class: 'w-[1300px]',
  async onOpenChange(isOpen) {
    if (!isOpen) {
      detail.value = null;
      return;
    }
    const data = modalApi.getData<{
      commissionType?: CommissionOrderAdminApi.CommissionType;
      id?: string;
    }>();
    if (!data?.id) return;
    loading.value = true;
    try {
      detail.value =
        data.commissionType === CommissionType.Operation
          ? await getOperationDetail(data.id)
          : await getSalesDetail(data.id);
    } finally {
      loading.value = false;
    }
  },
});

const isSales = computed(
  () =>
    detail.value?.commissionOrder.commissionType !== CommissionType.Operation,
);

const order = computed(() => detail.value?.commissionOrder);

const orgsText = computed(
  () =>
    (order.value?.orgs ?? [])
      .map((org) => org.name)
      .filter(Boolean)
      .join(' / ') || '-',
);

const statusOption = computed(() => {
  if (order.value == null) return undefined;
  return getStatusOptions().find((o) => o.value === order.value?.status);
});

const headTag = computed(() =>
  statusOption.value
    ? { color: statusOption.value.color, label: statusOption.value.label }
    : null,
);

const baseSalaryText = computed(() => {
  const current = order.value;
  if (current == null) return '-';
  if (current.baseSalary == null) return '-';
  const mode = getBaseSalaryModeLabel(current.baseSalaryMode);
  const modeText = mode ? `（${mode}）` : '';
  return `${formatAmount(current.baseSalary)}${modeText}`;
});

const ticketColumns = computed(() =>
  isSales.value ? useSalesTicketColumns() : useOperationTicketColumns(),
);

const tickets = computed(() => detail.value?.tickets ?? []);

/** 未达门槛票数（销售），供「达标票数」磁贴副文案 */
const belowCount = computed(
  () =>
    tickets.value.filter(
      (ticket) => ticket.profitType === CommissionItemProfitType.BelowThreshold,
    ).length,
);

const typeText = computed(() =>
  isSales.value
    ? $t('commissionOrder.detail.typeSales')
    : $t('commissionOrder.detail.typeOperation'),
);
</script>

<template>
  <Modal :title="$t('commissionOrder.detail.title')">
    <Spin :spinning="loading">
      <div v-if="order" class="space-y-3">
        <!-- 单头信息卡（对齐新增弹窗 filter-card） -->
        <section class="meta-card">
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-item__label">
                {{ $t('commissionOrder.columns.orderNum') }}
              </span>
              <span class="meta-item__value">
                {{ order.commissionOrderNum }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">
                {{ $t('commissionOrder.detail.type') }}
              </span>
              <span class="meta-item__value">
                <Tag>{{ typeText }}</Tag>
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">
                {{ $t('commissionOrder.columns.status') }}
              </span>
              <span class="meta-item__value">
                <Tag v-if="statusOption" :color="statusOption.color">
                  {{ statusOption.label }}
                </Tag>
                <span v-else>{{ order.status }}</span>
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">
                {{ $t('commissionOrder.columns.accountDate') }}
              </span>
              <span class="meta-item__value">
                {{ formatMonth(order.accountDate) }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">
                {{ $t('commissionOrder.detail.user') }}
              </span>
              <span class="meta-item__value">
                {{ order.user?.nickName ?? '-' }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">
                {{ $t('commissionOrder.detail.orgs') }}
              </span>
              <span class="meta-item__value">{{ orgsText }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">
                {{ $t('commissionOrder.columns.configName') }}
              </span>
              <span class="meta-item__value">
                {{ order.commissionConfigName ?? '-' }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">
                {{ $t('commissionOrder.columns.itemCount') }}
              </span>
              <span class="meta-item__value">{{ order.itemCount }}</span>
            </div>
          </div>

          <div class="meta-remark">
            <span class="meta-item__label">
              {{ $t('commissionOrder.detail.remark') }}
            </span>
            <span class="meta-item__value">{{ order.remark ?? '-' }}</span>
          </div>

          <!-- 流程轨迹 -->
          <div class="meta-flow">
            <div class="meta-flow__item">
              <span class="meta-flow__title">
                {{ $t('commissionOrder.detail.submitInfo') }}
              </span>
              <span class="meta-flow__text">
                {{ order.submitUserName ?? '-' }}
                ·
                {{ formatDateTimeText(order.submitTime) }}
              </span>
            </div>
            <div class="meta-flow__item">
              <span class="meta-flow__title">
                {{ $t('commissionOrder.detail.auditInfo') }}
              </span>
              <span class="meta-flow__text">
                {{ order.auditUserName ?? '-' }}
                ·
                {{ formatDateTimeText(order.auditTime) }}
                <template v-if="order.auditRemark">
                  （{{ order.auditRemark }}）
                </template>
              </span>
            </div>
            <div class="meta-flow__item">
              <span class="meta-flow__title">
                {{ $t('commissionOrder.detail.grantInfo') }}
              </span>
              <span class="meta-flow__text">
                {{ order.grantUserName ?? '-' }}
                ·
                {{ formatDateTimeText(order.grantTime) }}
                <template v-if="order.grantRemark">
                  （{{ order.grantRemark }}）
                </template>
              </span>
            </div>
            <div class="meta-flow__item">
              <span class="meta-flow__title">
                {{ $t('commissionOrder.detail.creatorUserName') }}
              </span>
              <span class="meta-flow__text">
                {{ order.creatorUserName ?? '-' }}
                ·
                {{ formatDateTimeText(order.creationTime) }}
              </span>
            </div>
          </div>
        </section>

        <!-- 计算结果（与新增预览同一套面板） -->
        <CalcPanels
          :calculation="detail?.calculation"
          :month="order.accountDate"
          :is-sales="isSales"
          :below-count="belowCount"
          :head-tag="headTag"
        />

        <!-- 参与计算的票 -->
        <section class="ticket-card">
          <header class="ticket-card__head">
            {{
              $t('commissionOrder.detail.ticketsTitle', {
                count: tickets.length,
              })
            }}
          </header>
          <Table
            class="design-table"
            size="small"
            :scroll="{ x: 'max-content' }"
            :columns="ticketColumns"
            :data-source="tickets"
            :pagination="false"
            :row-key="ticketRowKey"
          />
        </section>
      </div>
      <div v-else-if="!loading" class="py-8 text-center text-gray-400">
        {{ $t('common.noData') }}
      </div>
    </Spin>

    <template #footer>
      <div class="modal-footer">
        <div class="modal-footer__left">
          <template v-if="order">
            <span class="modal-footer__total-label">
              {{ $t('commissionOrder.columns.commissionAmount') }}
            </span>
            <span class="modal-footer__muted">
              ¥{{ formatAmount(order.commissionAmount) }}
            </span>
            <span class="modal-footer__total-label">
              {{ $t('commissionOrder.columns.baseSalary') }}
            </span>
            <span class="modal-footer__muted">{{ baseSalaryText }}</span>
            <span class="modal-footer__total-label">
              {{ $t('commissionOrder.columns.finalAmount') }}
            </span>
            <span class="modal-footer__total">
              ¥{{ formatAmount(order.finalAmount) }}
            </span>
            <template v-if="order.grantAmount != null">
              <span class="modal-footer__total-label">
                {{ $t('commissionOrder.columns.grantAmount') }}
              </span>
              <span class="modal-footer__muted">
                ¥{{ formatAmount(order.grantAmount) }}
              </span>
            </template>
          </template>
        </div>
        <div class="modal-footer__right">
          <Button type="primary" @click="modalApi.close()">
            {{ $t('common.close') }}
          </Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
/* ---------- 单头信息卡 ---------- */
.meta-card {
  padding: 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.meta-item__label {
  font-size: 12px;
  color: #8c95a3;
}

.meta-item__value {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  word-break: break-all;
}

.meta-remark {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid hsl(var(--border));
}

.meta-flow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid hsl(var(--border));
}

.meta-flow__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meta-flow__title {
  font-size: 12px;
  font-weight: 600;
  color: #3d3d3d;
}

.meta-flow__text {
  font-size: 12px;
  color: #8c95a3;
  word-break: break-all;
}

/* ---------- 票卡片 ---------- */
.ticket-card {
  padding: 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.ticket-card__head {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.design-table :deep(.ant-table) {
  background: transparent;
}

.design-table :deep(.ant-table-thead > tr > th) {
  font-weight: 600;
  color: #3d3d3d;
  background: #f5f7fa;
}

.design-table :deep(.ant-table-thead > tr > th::before) {
  display: none;
}

.design-table :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid #f2f2f2;
}

/* ---------- 底部操作栏 ---------- */
.modal-footer {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.modal-footer__left {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.modal-footer__total-label {
  margin-left: 4px;
  font-size: 13px;
  color: #3d3d3d;
}

.modal-footer__muted {
  font-size: 13px;
  font-weight: 600;
  color: #8c95a3;
}

.modal-footer__total {
  font-size: 16px;
  font-weight: 700;
  color: #006ce6;
}

.modal-footer__right {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
