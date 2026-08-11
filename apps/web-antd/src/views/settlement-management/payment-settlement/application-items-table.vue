<script lang="ts" setup>
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { computed, ref, watch } from 'vue';

import dayjs from 'dayjs';

import { Button, message, Modal, Table, Tag } from 'ant-design-vue';

import { formatAmount } from './form-data';

interface Props {
  /** 申请明细列表（从详情接口的 paymentApplicationCurrencies 获取 - 新的二级结构） */
  items: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto[];
  /** 是否可编辑（删除按钮是否显示） */
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: true,
});

const emit = defineEmits<{
  delete: [index: number]; // 删除指定索引的申请
}>();

// 表格展开状态管理
const expandedRowKeys = ref<string[]>([]);

// 监听 items 变化，清空展开状态
watch(
  () => props.items,
  (newItems) => {
    console.log('[application-items-table] items 变化:', newItems.length);
    expandedRowKeys.value = [];
  },
  { deep: true },
);

/**
 * 第一层列配置（申请+原币组合级别）
 */
const columns = computed(() => [
  {
    title: '申请单号',
    dataIndex: 'applicationNo',
    key: 'applicationNo',
    width: 140,
    fixed: 'left' as const,
  },
  // {
  //   title: '状态',
  //   key: 'status',
  //   width: 100,
  //   customRender: ({ record }: any) => {
  //     // 从 orderFees 中获取第一个费用的状态
  //     if (record.orderFees && record.orderFees.length > 0) {
  //       const firstFee = record.orderFees[0];
  //       const statusMap: Record<number, string> = {
  //         0: '待审核',
  //         1: '审核中',
  //         2: '已通过',
  //         3: '已驳回',
  //       };
  //       return statusMap[firstFee.feeStatus || 0] || '-';
  //     }
  //     return '-';
  //   },
  // },
  {
    title: '结算对象',
    key: 'clientName',
    width: 120,
  },
  {
    title: '申请币别',
    key: 'currencyCode',
    width: 100,
    customRender: ({ record }: any) => {
      // 如果有 currency，使用申请的币别；否则使用原币
      return record.currency?.code || record.originalCurrency?.code || '-';
    },
  },
  {
    title: '申请人',
    key: 'creatorUserName',
    width: 100,
  },
  // {
  //   title: '未结算费用',
  //   key: 'unSettledAmount',
  //   width: 120,
  //   align: 'right' as const,
  //   customRender: ({ record }: any) => {
  //     if (!record.orderFees || record.orderFees.length === 0) return '0.00';
  //     // 未结算费用 = 所有费用的 unSettledAmount 之和
  //     const total = record.orderFees.reduce(
  //       (sum: number, fee: any) => sum + (fee.unSettledAmount || 0),
  //       0,
  //     );
  //     return formatAmount(total);
  //   },
  // },
  // {
  //   title: '申请金额（原币）',
  //   key: 'settledAmount',
  //   width: 130,
  //   align: 'right' as const,
  // },
  {
    title: '本次结算金额',
    key: 'settledPrice',
    width: 130,
    align: 'right' as const,
  },
  // {
  //   title: '本次结算金额',
  //   key: 'thisSettledPrice',
  //   width: 130,
  //   align: 'right' as const,
  // },
  {
    title: '归属组织',
    key: 'orgName',
    width: 150,
    customRender: ({ record }: any) => {
      if (record.orgs && record.orgs.length > 0) {
        // 返回最后一个组织的名称（最下级组织）
        return record.orgs[record.orgs.length - 1].name || '-';
      }
      return '-';
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    fixed: 'right' as const,
  },
]);

/**
 * 第二层列配置（费用级别）
 */
const orderFeeColumns = [
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
    customRender: ({ record }: any) => {
      const names = record.transportOrder?.operatorNames;
      if (!names || !Array.isArray(names) || names.length === 0) return '-';
      return names.join('、');
    },
  },
  {
    title: '销售',
    key: 'salesNames',
    width: 100,
    customRender: ({ record }: any) => {
      const names = record.transportOrder?.saleNames;
      if (!names || !Array.isArray(names) || names.length === 0) return '-';
      return names.join('、');
    },
  },

  {
    title: '费用名称',
    dataIndex: ['feeCode', 'cnName'],
    key: 'feeCodeName',
    width: 150,
  },
  // {
  //   title: '原始币别',
  //   dataIndex: ['currency', 'code'],
  //   key: 'currencyCode',
  //   width: 100,
  // },
  // {
  //   title: '汇率',
  //   dataIndex: 'exchangeRate',
  //   key: 'exchangeRate',
  //   width: 80,
  //   align: 'right' as const,
  // },
  {
    title: '申请金额',
    dataIndex: 'settledPrice',
    key: 'settledPrice',
    width: 120,
    align: 'right' as const,
  },
  // {
  //   title: '付款金额(折币)',
  //   dataIndex: 'settledPrice',
  //   key: 'settledPrice',
  //   width: 120,
  //   align: 'right' as const,
  // },
  {
    title: '本次结算金额',
    dataIndex: 'thisSettledPrice',
    key: 'thisSettledPrice',
    width: 130,
    align: 'right' as const,
  },
  // {
  //   title: '申请金额',
  //   key: 'appliedAmount',
  //   width: 130,
  //   align: 'right' as const,
  // },
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
 * 删除申请
 */
async function handleDelete(index: number) {
  const item = props.items[index];
  if (!item) return;

  try {
    await new Promise<void>((resolve, reject) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除申请 ${item.applicationNo} (${item.originalCurrency?.code ?? ''}) 吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          resolve();
        },
        onCancel: () => {
          reject(new Error('取消删除'));
        },
      });
    });

    emit('delete', index);
    message.success('删除成功');
  } catch (error: any) {
    if (error.message !== '取消删除') {
      message.error(error.message || '删除失败');
    }
  }
}

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
  <Table
    :columns="columns"
    :data-source="items"
    :pagination="false"
    bordered
    size="small"
    row-key="rowKey"
    v-model:expanded-row-keys="expandedRowKeys"
    :expandable="{
      expandIconColumnIndex: 0,
    }"
    :scroll="{ x: 1400 }"
  >
    <!-- 第一层：申请+原币组合级别 -->
    <template #bodyCell="{ column, record, index }">
      <!-- 申请单号 -->
      <template v-if="column.key === 'applicationNo'">
        <a style="color: #fa8c16">{{ record.applicationNo }}</a>
      </template>

      <!-- 结算对象 -->
      <template v-else-if="column.key === 'clientName'">
        {{ getClientName(record) }}
      </template>

      <!-- 申请人 -->
      <template v-else-if="column.key === 'creatorUserName'">
        {{ getCreatorUserName(record) }}
      </template>
      <!-- 本次结算金额 -->
      <template v-else-if="column.key === 'settledPrice'">
        <span style="font-weight: bold; color: #1890ff">
          {{ formatAmount(record.settledPrice || 0) }}
        </span>
      </template>

      <!-- 本次结算金额 -->
      <!-- <template v-else-if="column.key === 'thisSettledPrice'">
        <span style="font-weight: bold; color: #fa8c16">
          {{ formatAmount(record.thisSettledPrice || 0) }}
        </span>
      </template> -->

      <!-- 操作 -->
      <template v-else-if="column.key === 'action'">
        <Button
          v-if="editable"
          type="primary"
          size="small"
          danger
          @click="handleDelete(index)"
        >
          删除
        </Button>
      </template>
    </template>

    <!-- 第二层：费用级别（展开行） -->
    <template #expandedRowRender="{ record }">
      <div
        v-if="!record.orderFees || record.orderFees.length === 0"
        style="padding: 16px; color: #999"
      >
        暂无费用明细
      </div>
      <div v-else>
        <Table
          :columns="orderFeeColumns"
          :data-source="getOrderFees(record)"
          :pagination="false"
          :row-key="(r) => `fee_${r.id}`"
          bordered
          size="small"
          :scroll="{ x: 1200 }"
        >
          <template #bodyCell="{ column, record: feeRecord }">
            <!-- 委托编号 -->
            <span v-if="column.key === 'commissionNum'">{{
              feeRecord.transportOrder?.commissionNum || '-'
            }}</span>

            <!-- 开船日期 -->
            <span v-else-if="column.key === 'etd'">{{
              feeRecord.transportOrder?.etd
                ? dayjs(feeRecord.transportOrder.etd).format('YYYY-MM-DD')
                : '-'
            }}</span>

            <!-- 主提单号 -->
            <span v-else-if="column.key === 'mblNum'">{{
              feeRecord.transportOrder?.mblNum || '-'
            }}</span>

            <!-- 本次结算金额 -->
            <span
              v-else-if="column.key === 'thisSettledAmount'"
              style="color: #1890ff"
            >
              {{
                formatAmount(
                  feeRecord.thisSettledAmount * feeRecord.exchangeRate || 0,
                )
              }}
            </span>

            <!-- 申请金额 -->
            <!-- <span v-else-if="column.key === 'appliedAmount'">
              {{ formatAmount(getAppliedAmount(feeRecord)) }}
            </span> -->
          </template>
        </Table>
      </div>
    </template>
  </Table>
</template>

<style scoped>
:deep(.ant-table-small .ant-table-cell) {
  padding: 6px 8px;
}

/* 展开行容器样式 */
:deep(.ant-table-expanded-row > td) {
  padding: 12px !important;
  background-color: #fafafa;
}

/* 子表格样式 */
:deep(.ant-table-expanded-row .ant-table) {
  margin: 0;
  overflow: hidden;
  border-radius: 4px;
}

/* 调试信息样式 */
:deep(.ant-table-expanded-row .debug-info) {
  padding: 4px 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
  background: #fff;
  border-left: 3px solid #1890ff;
}
</style>
