<script lang="ts" setup>
import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Descriptions, Spin, Table, Tag } from 'ant-design-vue';

import {
  getOperationDetail,
  getSalesDetail,
} from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';

import CalcView from './calc-view.vue';
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

const { CommissionType } = CommissionOrderAdminApi;

const detail = ref<
  | CommissionOrderAdminApi.CommissionSalesDetailDto
  | CommissionOrderAdminApi.CommissionOperationDetailDto
  | null
>(null);

const loading = ref(false);

const [Modal, modalApi] = useVbenModal({
  class: 'w-[1300px]',
  footer: false,
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
</script>

<template>
  <Modal :title="$t('commissionOrder.detail.title')">
    <Spin :spinning="loading">
      <div v-if="order" class="space-y-4">
        <!-- 单头 -->
        <Descriptions bordered :column="2" size="small">
          <Descriptions.Item :label="$t('commissionOrder.columns.orderNum')">
            {{ order.commissionOrderNum }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.detail.type')">
            {{
              isSales
                ? $t('commissionOrder.detail.typeSales')
                : $t('commissionOrder.detail.typeOperation')
            }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.columns.status')">
            <Tag v-if="statusOption" :color="statusOption.color">
              {{ statusOption.label }}
            </Tag>
            <span v-else>{{ order.status }}</span>
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.columns.accountDate')">
            {{ formatMonth(order.accountDate) }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.detail.user')">
            {{ order.user?.nickName ?? '-' }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.detail.orgs')">
            {{ orgsText }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.columns.configName')">
            {{ order.commissionConfigName ?? '-' }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.columns.itemCount')">
            {{ order.itemCount }}
          </Descriptions.Item>
          <Descriptions.Item
            :label="$t('commissionOrder.columns.commissionAmount')"
          >
            {{ formatAmount(order.commissionAmount) }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.columns.baseSalary')">
            {{ baseSalaryText }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.columns.finalAmount')">
            <span class="font-medium text-primary">
              {{ formatAmount(order.finalAmount) }}
            </span>
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.columns.grantAmount')">
            {{ formatAmount(order.grantAmount) }}
          </Descriptions.Item>
          <Descriptions.Item
            :span="2"
            :label="$t('commissionOrder.detail.remark')"
          >
            {{ order.remark ?? '-' }}
          </Descriptions.Item>

          <!-- 提交信息 -->
          <Descriptions.Item :label="$t('commissionOrder.detail.submitUser')">
            {{ order.submitUserName ?? '-' }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.detail.submitTime')">
            {{ formatDateTimeText(order.submitTime) }}
          </Descriptions.Item>
          <!-- 审核信息 -->
          <Descriptions.Item :label="$t('commissionOrder.detail.auditUser')">
            {{ order.auditUserName ?? '-' }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.detail.auditTime')">
            {{ formatDateTimeText(order.auditTime) }}
          </Descriptions.Item>
          <Descriptions.Item
            :span="2"
            :label="$t('commissionOrder.detail.auditRemark')"
          >
            {{ order.auditRemark ?? '-' }}
          </Descriptions.Item>
          <!-- 发放信息 -->
          <Descriptions.Item :label="$t('commissionOrder.detail.grantUser')">
            {{ order.grantUserName ?? '-' }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.detail.grantTime')">
            {{ formatDateTimeText(order.grantTime) }}
          </Descriptions.Item>
          <Descriptions.Item
            :span="2"
            :label="$t('commissionOrder.detail.grantRemark')"
          >
            {{ order.grantRemark ?? '-' }}
          </Descriptions.Item>
          <!-- 创建信息 -->
          <Descriptions.Item
            :label="$t('commissionOrder.detail.creatorUserName')"
          >
            {{ order.creatorUserName ?? '-' }}
          </Descriptions.Item>
          <Descriptions.Item :label="$t('commissionOrder.detail.creationTime')">
            {{ formatDateTimeText(order.creationTime) }}
          </Descriptions.Item>
        </Descriptions>

        <!-- 计算结果 -->
        <div>
          <div class="mb-2 font-medium">
            {{ $t('commissionOrder.calc.title') }}
          </div>
          <CalcView :calculation="detail?.calculation" />
        </div>

        <!-- 参与计算的票 -->
        <div>
          <div class="mb-2 font-medium">
            {{
              $t('commissionOrder.detail.ticketsTitle', {
                count: tickets.length,
              })
            }}
          </div>
          <Table
            bordered
            size="small"
            :columns="ticketColumns"
            :data-source="tickets"
            :pagination="false"
            :row-key="ticketRowKey"
          />
        </div>
      </div>
      <div v-else-if="!loading" class="py-8 text-center text-gray-400">
        {{ $t('common.noData') }}
      </div>
    </Spin>
  </Modal>
</template>
