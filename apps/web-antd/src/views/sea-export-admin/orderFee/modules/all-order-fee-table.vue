<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useExpenseAllColumns } from '../data';
import { computed, onMounted, ref, watch, h } from 'vue';
import {
  Button,
  Input,
  Select,
  InputNumber,
  Space,
  Table,
  Checkbox,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Textarea,
  Tag,
  Card,
} from 'ant-design-vue';
import { $t } from '#/locales';
import dayjs from 'dayjs';

import * as feeConstants from '../data';

import { OrderFeeTaskDetailAsync } from '#/api/audit-approval/expense-admin';

const dataSource = defineModel<ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[]>({
  default: () => [],
});

const props = defineProps<{
  type?: number; // 收付类型 0 应收 1 应付
  transportOrderId: string;
  entityId: string;
}>();

const handleModifyTask = (
  orderFeeTasks: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  let tasks = orderFeeTasks?.filter(
    (item) => item.task?.taskType !== feeConstants.taskTypeMap.feeModify,
  );
  let modifyData = orderFeeTasks?.filter(
    (item) => item.task?.taskType === feeConstants.taskTypeMap.feeModify,
  );

  modifyData.map((item: any) => {
    let modifyItem = item.task as ExpenseSubmissionAdminApi.TaskItemDto;
    let info = JSON.parse(modifyItem.info as string);
    Object.keys(info).forEach((key) => {
      if (item[key] !== info[key]) {
        item[key] = `${item[key]} => [${info[key]}]`;
      }
    });
    return {
      ...item,
    };
  });
  tasks = tasks.concat(modifyData);
  return tasks;
};

/** 为 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderFeeWithRowKey = (
  items: OrderFeeAdminApi.OrderFeeDto[] | undefined,
) => {
  console.log('normalizeOrderFeeWithRowKey items', items);
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `ofee_${i}_${Date.now()}`,
    creationTime: dayjs(item.creationTime).format('YYYY-MM-DD HH:mm:ss'),
    unitPriceStr: `${feeConstants.getCurrencyEnumSymbolOptions().find((o) => o.value === item.currencyId)?.label}${item.unitPrice}`,
    amountStr: `${feeConstants.getCurrencyEnumSymbolOptions().find((o) => o.value === item.currencyId)?.label}${item.amount}`,
    noTaxUnitPriceStr: `${feeConstants.getCurrencyEnumSymbolOptions().find((o) => o.value === item.currencyId)?.label}${item.noTaxUnitPrice}`,
    noTaxAmountStr: `${feeConstants.getCurrencyEnumSymbolOptions().find((o) => o.value === item.currencyId)?.label}${item.noTaxAmount}`,

    rqstPaymentAmountStr: `${feeConstants.getCurrencyEnumSymbolOptions().find((o) => o.value === item.currencyId)?.label}${item.rqstPaymentAmount}`,
    invoicedAmountStr: `${feeConstants.getCurrencyEnumSymbolOptions().find((o) => o.value === item.currencyId)?.label}${item.invoicedAmount}`,

    orderInvoiceAmountStr: `${feeConstants.getCurrencyEnumSymbolOptions().find((o) => o.value === item.currencyId)?.label}${item.orderInvoiceAmount}`,
    settledAmountStr: `${feeConstants.getCurrencyEnumSymbolOptions().find((o) => o.value === item.currencyId)?.label}${item.settledAmount}`,
  })) as any[];
};

const [Grid, gridApi] = useVbenVxeGrid<OrderFeeAdminApi.OrderFeeEditDto>({
  gridOptions: {
    columns: useExpenseAllColumns(),
    height: '300px',
    keepSource: true,
    radioConfig: {
      highlight: true,
      trigger: 'row',
    },
    rowConfig: {
      keyField: 'id',
    },
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async () => {
          if (props.transportOrderId === '') {
            return [];
          }
          const detail = await OrderFeeTaskDetailAsync({
            id: props.transportOrderId,
          });
          const orderFeeTasks =
            detail.orderFeeTasks?.filter(
              (item) => item.paySide === props.type,
            ) || [];
          const modifyData = handleModifyTask(orderFeeTasks);
          dataSource.value = normalizeOrderFeeWithRowKey(modifyData);
          emit('updateTableData', dataSource.value);
          return dataSource.value;
        },
      },
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      zoom: true,
    },
  },
  gridEvents: {
    // 单行选择变化事件
    checkboxChange: ({ row, checked }) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      const ids = records.map((r: any) => r._rowKey);
      emit('updateSelectData', ids);
      // 可以在这里处理业务逻辑
    },

    // 全选/取消全选事件
    checkboxAll: ({ checked }) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      const ids = records.map((r: any) => r._rowKey);
      emit('updateSelectData', ids);
    },

    // 单选模式下的选择事件（如果使用 radio 类型）
    radioChange: ({ row }) => {
      console.log('单选选中:', row);
    },
  },
});

const getTableDate = async () => {
  gridApi.query();
};

const emit = defineEmits(['updateTableData', 'updateSelectData']);

// watch(
//   () => dataSource.value,
//   (val) => {
//     if (val === undefined || val === null) {
//       dataSource.value = [];
//     }
//     const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
//     selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
//   },
//   { immediate: true },
// );
watch(
  [() => props.transportOrderId, () => props.entityId],
  ([newSubmissionId, newEntityId]) => {
    if (newSubmissionId && newEntityId) {
      console.log('newSubmissionId', newSubmissionId);
      getTableDate();
    }
  },
  { immediate: true },
);
onMounted(() => {
  //getTableDate();
});

// 必须显式暴露
defineExpose({
  getTableDate,
});
</script>

<template>
  <div
    class="order-ctn-table justify-between rounded-md border"
    :class="[type === 0 ? 'rec-table' : 'pay-table']"
  >
    <Grid
      :table-title="
        type === 0
          ? $t('seaExport.export.orderFee.receivableCharges')
          : $t('seaExport.export.orderFee.payableCharges')
      "
    >
      <template #toolbar-tools>
        <div class="text-small font-normal">
          {{ $t('auditApproval.totalNum', [dataSource.length]) }}
        </div>
      </template>
    </Grid>
  </div>
</template>

<style scoped lang="scss">
.rec-table {
  border-left: 2px solid rgb(6 100 224);
}

.pay-table {
  border-left: 2px solid rgb(255 153 0);
}

.green {
  color: green;
}

.blue {
  color: rgb(6 100 224);
}

.yellow {
  color: rgb(255 153 0);
}

.my-custom-table {
  // min-height: 400px;
}

/* 或者如果需要更精确地控制内部容器 */
.my-custom-table:deep(.ant-table-tbody) {
  min-height: 300px;
}

.money {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-variant-numeric: tabular-nums;

  /* 增强对齐 */
}
</style>
