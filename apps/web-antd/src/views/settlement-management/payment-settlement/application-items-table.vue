<script lang="ts" setup>
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { computed, ref, watch } from 'vue';

import dayjs from 'dayjs';

import { Checkbox } from 'ant-design-vue';

import NestedDataTable from '#/components/nested-data-table/nested-data-table.vue';

import { formatAmount } from './form-data';

interface Props {
  /** 申请明细列表（从详情接口的 paymentApplicationCurrencies 获取 - 新的二级结构） */
  items: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto[];
  /** 是否可编辑（是否显示复选框） */
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: true,
});

const emit = defineEmits<{
  'update:selectedRowKeys': [keys: string[]]; // 暴露选中的行key
}>();

// 表格展开状态管理
const expandedRowKeys = ref<string[]>([]);

// 选中的行 keys
const selectedRowKeys = ref<string[]>([]);

// 监听 items 变化，清空展开状态和选中状态
watch(
  () => props.items,
  (newItems) => {
    console.log('[application-items-table] items 变化:', newItems.length);
    expandedRowKeys.value = [];
    selectedRowKeys.value = [];
  },
  { deep: true },
);

// 监听选中状态变化，通知父组件
watch(
  () => selectedRowKeys.value,
  (newKeys) => {
    emit('update:selectedRowKeys', newKeys);
  },
);

/**
 * 外层列配置（申请+原币组合级别）
 */
const outerColumns = computed(() => [
  {
    title: '序号',
    key: 'seq',
    width: 60,
  },
  {
    title: '申请单号',
    dataIndex: 'applicationNo',
    key: 'applicationNo',
    width: 140,
  },
  {
    title: '结算对象',
    key: 'clientName',
    width: 120,
  },
  {
    title: '申请币别',
    key: 'currencyCode',
    width: 100,
  },
  {
    title: '申请人',
    key: 'creatorUserName',
    width: 100,
  },
  {
    title: '申请金额',
    key: 'payAppPrice',
    width: 130,
    align: 'right' as const,
  },
  {
    title: '本次结算金额',
    key: 'settledPrice',
    width: 130,
    align: 'right' as const,
  },
  {
    title: '归属组织',
    key: 'orgName',
    width: 150,
  },
]);

/**
 * 内层列配置（费用级别）
 */
const innerColumns = [
  {
    title: '委托编号',
    key: 'commissionNum',
    width: 150,
  },
  {
    title: '主提单号',
    key: 'mblNum',
    width: 180,
  },
  {
    title: '开船日期',
    key: 'etd',
    width: 120,
  },
  {
    title: '操作',
    key: 'operatorNames',
    width: 100,
  },
  {
    title: '销售',
    key: 'salesNames',
    width: 100,
  },
  {
    title: '费用名称',
    key: 'feeCodeName',
    width: 150,
  },
  {
    title: '申请金额',
    key: 'settledPrice',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '本次结算金额',
    key: 'thisSettledPrice',
    width: 130,
    align: 'right' as const,
  },
];

/**
 * 获取结算对象名称
 */
function getClientName(
  record: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto,
): string {
  return record.settlement?.name || '-';
}

/**
 * 获取申请人
 */
function getCreatorUserName(
  record: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto,
): string {
  return record.userName || '-';
}

/**
 * 获取归属组织名称
 */
function getOrgName(
  record: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto,
): string {
  if (record.orgs && record.orgs.length > 0) {
    // 返回最后一个组织的名称（最下级组织）
    const lastOrg = record.orgs[record.orgs.length - 1];
    return lastOrg?.name || '-';
  }
  return '-';
}

/**
 * 获取申请币别
 */
function getCurrencyCode(
  record: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto,
): string {
  // 如果有 currency，使用申请的币别；否则使用原币
  return record.currency?.code || record.originalCurrency?.code || '-';
}

/**
 * 切换全选状态
 */
function toggleAllSelection(checked: boolean) {
  if (checked) {
    selectedRowKeys.value = props.items.map((item) => item.rowKey || '');
  } else {
    selectedRowKeys.value = [];
  }
}

/**
 * 切换单行选中状态
 */
function toggleRowSelection(rowKey: string, checked: boolean) {
  if (checked) {
    if (!selectedRowKeys.value.includes(rowKey)) {
      selectedRowKeys.value.push(rowKey);
    }
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter(
      (key) => key !== rowKey,
    );
  }
}

/**
 * 是否全选
 */
const isAllSelected = computed(() => {
  if (props.items.length === 0) return false;
  return props.items.every((item) =>
    selectedRowKeys.value.includes(item.rowKey || ''),
  );
});

/**
 * 是否半选
 */
const isIndeterminate = computed(() => {
  if (props.items.length === 0) return false;
  const selectedCount = selectedRowKeys.value.length;
  return selectedCount > 0 && selectedCount < props.items.length;
});

// 辅助函数：获取费用明细（直接从 orderFees 字段获取）
function getOrderFees(
  record: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto,
): PaymentSettlementAdminApi.OrderFeeDto[] {
  if (!record.orderFees || record.orderFees.length === 0) {
    console.log('[getOrderFees] orderFees 为空:', record);
    return [];
  }

  console.log('[getOrderFees] 费用数量:', record.orderFees.length);
  return record.orderFees;
}
</script>

<template>
  <NestedDataTable
    :columns="outerColumns"
    :data-source="items"
    fill-height
    :inner-columns="innerColumns"
    inner-data-key="orderFees"
    inner-row-key="id"
    row-key="rowKey"
    v-model:expanded-row-keys="expandedRowKeys"
  >
    <template #outerHeaderCell="{ column }">
      <!-- 序号列显示全选复选框 -->
      <template v-if="column.key === 'seq'">
        <span class="table-sequence-cell">
          <Checkbox
            v-if="editable"
            :checked="isAllSelected"
            :indeterminate="isIndeterminate"
            @change="(e) => toggleAllSelection(e.target.checked)"
          />
          {{ column.title }}
        </span>
      </template>
      <template v-else>{{ column.title }}</template>
    </template>

    <template #outerBodyCell="{ column, record, index }">
      <!-- 序号列显示复选框 -->
      <template v-if="column.key === 'seq'">
        <span class="table-sequence-cell">
          <Checkbox
            v-if="editable"
            :checked="selectedRowKeys.includes(record.rowKey)"
            @change="
              (e) => toggleRowSelection(record.rowKey, e.target.checked)
            "
          />
          {{ index + 1 }}
        </span>
      </template>

      <!-- 申请单号 -->
      <template v-else-if="column.key === 'applicationNo'">
        <a style="color: #fa8c16">{{ record.applicationNo }}</a>
      </template>

      <!-- 结算对象 -->
      <template v-else-if="column.key === 'clientName'">
        {{ getClientName(record) }}
      </template>

      <!-- 申请币别 -->
      <template v-else-if="column.key === 'currencyCode'">
        {{ getCurrencyCode(record) }}
      </template>

      <!-- 申请人 -->
      <template v-else-if="column.key === 'creatorUserName'">
        {{ getCreatorUserName(record) }}
      </template>

      <!-- 申请金额 -->
      <template v-else-if="column.key === 'payAppPrice'">
        <span style="font-weight: bold; color: #1890ff">
          {{ formatAmount(record.payAppPrice || 0) }}
        </span>
      </template>

      <!-- 本次结算金额 -->
      <template v-else-if="column.key === 'settledPrice'">
        <span style="font-weight: bold; color: #fa8c16">
          {{ formatAmount(record.settledPrice || 0) }}
        </span>
      </template>

      <!-- 归属组织 -->
      <template v-else-if="column.key === 'orgName'">
        {{ getOrgName(record) }}
      </template>

      <!-- 默认显示 -->
      <template v-else>
        {{ column.dataIndex ? record[column.dataIndex] : '' }}
      </template>
    </template>

    <template #innerBodyCell="{ column, record: feeRecord }">
      <!-- 委托编号 -->
      <template v-if="column.key === 'commissionNum'">
        {{ feeRecord.transportOrder?.commissionNum || '-' }}
      </template>

      <!-- 主提单号 -->
      <template v-else-if="column.key === 'mblNum'">
        {{ feeRecord.transportOrder?.mblNum || '-' }}
      </template>

      <!-- 开船日期 -->
      <template v-else-if="column.key === 'etd'">
        {{
          feeRecord.transportOrder?.etd
            ? dayjs(feeRecord.transportOrder.etd).format('YYYY-MM-DD')
            : '-'
        }}
      </template>

      <!-- 操作 -->
      <template v-else-if="column.key === 'operatorNames'">
        {{
          feeRecord.transportOrder?.operatorNames?.join('、') || '-'
        }}
      </template>

      <!-- 销售 -->
      <template v-else-if="column.key === 'salesNames'">
        {{
          feeRecord.transportOrder?.saleNames?.join('、') || '-'
        }}
      </template>

      <!-- 费用名称 -->
      <template v-else-if="column.key === 'feeCodeName'">
        {{ feeRecord.feeCode?.cnName || '-' }}
      </template>

      <!-- 申请金额 -->
      <template v-else-if="column.key === 'settledPrice'">
        {{ formatAmount(feeRecord.settledPrice || 0) }}
      </template>

      <!-- 本次结算金额 -->
      <template v-else-if="column.key === 'thisSettledPrice'">
        {{ formatAmount(feeRecord.thisSettledPrice || 0) }}
      </template>

      <!-- 默认显示 -->
      <template v-else>
        {{ column.dataIndex ? feeRecord[column.dataIndex] : '' }}
      </template>
    </template>
  </NestedDataTable>
</template>

<style scoped>
/* NestedDataTable 组件已有完整样式，这里只需少量自定义样式 */
.table-sequence-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
