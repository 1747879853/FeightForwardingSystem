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
  {
    title: '结算对象',
    key: 'clientName',
    width: 120,
  },
  {
    title: '申请人',
    key: 'creatorUserName',
    width: 100,
  },
  {
    title: '原币币别',
    key: 'originalCurrencyCode',
    width: 100,
  },
  {
    title: '本次结算金额（原币）',
    key: 'settledAmount',
    width: 130,
    align: 'right' as const,
  },
  {
    title: '本次结算金额（结算币）',
    key: 'settledPrice',
    width: 130,
    align: 'right' as const,
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
    title: '开船日期',
    key: 'etd',
    width: 120,
  },
  {
    title: '主提单号',
    key: 'mblNum',
    width: 180,
  },
  {
    title: '费用名称',
    dataIndex: ['feeCode', 'cnName'],
    key: 'feeCodeName',
    width: 150,
  },
  {
    title: '原始币别',
    dataIndex: ['currency', 'code'],
    key: 'currencyCode',
    width: 100,
  },
  {
    title: '原始金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '本次结算金额',
    dataIndex: 'thisSettledAmount',
    key: 'thisSettledAmount',
    width: 130,
    align: 'right' as const,
  },
  {
    title: '申请金额',
    key: 'appliedAmount',
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
  // TODO: 需要从详情中获取申请人信息，这里暂时返回占位符
  return record.userName || '-';
}

/**
 * 计算费用的申请金额
 */
function getAppliedAmount(fee: PaymentSettlementAdminApi.OrderFeeDto): number {
  // TODO: 需要根据业务逻辑计算申请金额
  // 这里暂时返回未结算金额作为示例
  return fee.unSettledAmount || 0;
}

/**
 * 获取费用的委托编号
 */
function getCommissionNum(fee: PaymentSettlementAdminApi.OrderFeeDto): string {
  // TODO: OrderFeeDto 中没有 transportOrder 字段，需要从其他地方获取
  // 根据实际接口返回结构调整
  return '-';
}

/**
 * 获取费用的开船日期
 */
function getSailingDate(fee: PaymentSettlementAdminApi.OrderFeeDto): string {
  // TODO: OrderFeeDto 中没有开船日期字段，需要从其他地方获取
  // 根据实际接口返回结构调整
  return '-';
}

/**
 * 获取费用的主提单号
 */
function getMblNum(fee: PaymentSettlementAdminApi.OrderFeeDto): string {
  // TODO: OrderFeeDto 中没有 transportOrder 字段，需要从其他地方获取
  // 根据实际接口返回结构调整
  return '-';
}

/**
 * 处理展开行
 */
function handleExpand(
  expanded: boolean,
  record: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto,
) {
  console.log(
    '[handleExpand] 被调用！expanded:',
    expanded,
    'record.rowKey:',
    record.rowKey,
  );

  if (expanded) {
    if (!expandedRowKeys.value.includes(record.rowKey)) {
      expandedRowKeys.value.push(record.rowKey);
      console.log(
        '[handleExpand] 添加到 expandedRowKeys:',
        expandedRowKeys.value,
      );
    }
  } else {
    const index = expandedRowKeys.value.indexOf(record.rowKey);
    if (index > -1) {
      expandedRowKeys.value.splice(index, 1);
      console.log(
        '[handleExpand] 从 expandedRowKeys 移除:',
        expandedRowKeys.value,
      );
    }
  }
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
        content: `确定要删除申请 ${item.applicationNo} (${item.originalCurrencyCode}) 吗？`,
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

      <!-- 原币币别 -->
      <template v-else-if="column.key === 'originalCurrencyCode'">
        <Tag color="blue">{{ record.originalCurrencyCode }}</Tag>
      </template>

      <!-- 本次结算金额（原币） -->
      <template v-else-if="column.key === 'settledAmount'">
        <span style="font-weight: bold; color: #fa8c16">
          {{ formatAmount(record.settledAmount || 0) }}
        </span>
      </template>

      <!-- 本次结算金额（结算币） -->
      <template v-else-if="column.key === 'settledPrice'">
        <span style="font-weight: bold; color: #1890ff">
          ¥{{ formatAmount(record.settledPrice || 0) }}
        </span>
      </template>

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
        <!-- 调试信息 -->
        <div class="debug-info">
          费用数量: {{ getOrderFees(record).length }} | 原币:
          {{ record.originalCurrencyCode }} | 汇率: {{ record.rate }}
        </div>
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
              {{ formatAmount(feeRecord.thisSettledAmount || 0) }}
            </span>

            <!-- 申请金额 -->
            <span v-else-if="column.key === 'appliedAmount'">
              {{ formatAmount(getAppliedAmount(feeRecord)) }}
            </span>
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
