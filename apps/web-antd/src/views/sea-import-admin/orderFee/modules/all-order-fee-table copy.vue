<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-import/order-fee-admin';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';

import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Button,
  Input,
  Select,
  InputNumber,
  Space,
  Table,
  Checkbox,
  Textarea,
  message,
  Modal,
  Tag,
} from 'ant-design-vue';

import { $t } from '#/locales';
import dayjs from 'dayjs';

import * as feeConstants from '../data';
import * as submissionConstants from '#/views/audit-approval/data';
import {
  OrderFeeTaskDetailAsync,
  OrderFeeAuditAsync,
  OrderFeeRejectedAsync,
} from '#/api/audit-approval/expense-admin';

const dataSource = defineModel<ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys;

    emit('updateSelectData', selectedRowKeys.value);
  },
}));

const props = defineProps<{
  type?: number; // 收付类型 0 应收 1 应付
  transportOrderId: number;
  entityId: number;
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

/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderFeeWithRowKey = (
  items: OrderFeeAdminApi.OrderFeeEditDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `ofee_${i}_${Date.now()}`,
  })) as any[];
};

const getTableDate = async () => {
  const detail = await OrderFeeTaskDetailAsync({ id: props.transportOrderId });
  const orderFeeTasks =
    detail.orderFeeTasks?.filter((item) => item.paySide === props.type) || [];
  const modifyData = handleModifyTask(orderFeeTasks);
  dataSource.value = normalizeOrderFeeWithRowKey(modifyData);
  emit('updateTableData', dataSource.value);
};

const showConfirmWithRemark = (approve: boolean) => {
  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: approve
      ? $t('auditApproval.task.okPass')
      : $t('auditApproval.task.noPass'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      OrderFeeAudit(approve, modalRemark);
    },
    onCancel() {
      modalRemark = '';
    },
  });
};

const showRejectWithRemark = () => {
  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: $t('auditApproval.task.okReject'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      await nextTick(); // 等待 Vue 响应式更新完成

      Rejected(modalRemark);
    },
    onCancel() {
      modalRemark = '';
    },
  });
};
// ... existing code ...
const Rejected = (modalRemark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let OrderFeeRejectedAsyncDto: ExpenseSubmissionAdminApi.OrderFeeTaskRejectedDto =
    {
      remark: modalRemark,
      orderFeeIds: list.map((item) => item.id),
    };
  OrderFeeRejectedAsync(OrderFeeRejectedAsyncDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
const OrderFeeAudit = (approve: boolean, modalRemark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let OrderFeeAuditDto: ExpenseSubmissionAdminApi.OrderFeeTaskAuditDto = {
    success: approve,
    remark: modalRemark,
    orderFeeIds: list.map((item) => item.id),
  };
  // console.log(OrderFeeAuditDto);
  OrderFeeAuditAsync(OrderFeeAuditDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const emit = defineEmits(['updateTableData', 'updateSelectData']);

watch(
  () => dataSource.value,
  (val) => {
    if (val === undefined || val === null) {
      dataSource.value = [];
    }
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
  },
  { immediate: true },
);
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
const columns = [
  {
    title: $t('seaImport.import.orderFee.invoiceStatus'),
    dataIndex: 'invoiceStatus',
    key: 'invoiceStatus',
    width: 80,
  },
  {
    title: $t('seaImport.import.orderFee.feeStatus'),
    dataIndex: 'feeStatus',
    align: 'center',
    key: 'feeStatus',
    width: 90,
  },
  {
    title: $t('seaImport.import.orderFee.feecodeName'),
    dataIndex: 'feeCodeName',
    key: 'feeCodeName',
    minWidth: 120,
  },
  {
    title: $t('seaImport.client.industryCategories'),
    dataIndex: 'industryCategory',
    key: 'industryCategory',
    minWidth: 110,
  },
  {
    title: $t('seaImport.import.orderFee.settlement'),
    dataIndex: 'settlementName',
    key: 'settlementName',
    minWidth: 110,
  },
  {
    title: $t('seaImport.import.orderFee.currency'),
    dataIndex: 'currencyName',
    key: 'currencyName',
    align: 'center',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.ExchangeRate'),
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    align: 'center',
    width: 50,
  },
  {
    title: $t('seaImport.import.orderFee.unitPrice'),
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    minWidth: 50,
  },
  {
    title: $t('seaImport.import.orderFee.amount'),
    dataIndex: 'amount',
    key: 'amount',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.unitEmum'),
    dataIndex: 'unitEmum',
    key: 'unitEmum',
    minWidth: 90,
  },
  {
    title: $t('seaImport.import.orderFee.quantity'),
    dataIndex: 'quantity',
    key: 'quantity',
    minWidth: 50,
  },
  {
    title: $t('seaImport.import.orderFee.taxRate'),
    dataIndex: 'taxRate',
    key: 'taxRate',
    minWidth: 50,
  },
  {
    title: $t('seaImport.import.orderFee.noTaxUnitPrice'),
    dataIndex: 'noTaxUnitPrice',
    key: 'noTaxUnitPrice',
    minWidth: 50,
  },
  {
    title: $t('seaImport.import.orderFee.noTaxAmount'),
    dataIndex: 'noTaxAmount',
    key: 'noTaxAmount',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.rqstPaymentAmount'),
    dataIndex: 'rqstPaymentAmount',
    key: 'rqstPaymentAmount',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.invoicedAmount'),
    dataIndex: 'invoicedAmount',
    key: 'invoicedAmount',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.orderInvoiceAmount'),
    dataIndex: 'orderInvoiceAmount',
    key: 'orderInvoiceAmount',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.settledAmount'),
    dataIndex: 'settledAmount',
    key: 'settledAmount',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.canInvoice'),
    dataIndex: 'canInvoice',
    key: 'canInvoice',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.isConfidential'),
    dataIndex: 'isConfidential',
    key: 'isConfidential',
    minWidth: 80,
  },
  {
    title: $t('seaImport.import.orderFee.remark'),
    dataIndex: 'remark',
    key: 'feeRemark',
    minWidth: 150,
  },
  {
    title: $t('seaImport.import.orderFee.dataEntryMethod'),
    dataIndex: 'dataEntryMethod',
    key: 'dataEntryMethod',
    minWidth: 80,
  },

  {
    title: $t('auditApproval.task.creatorUserName'),
    dataIndex: ['task', 'creatorUserName'],
    key: 'creatorUserName',
    width: 110,
  },
  {
    title: $t('auditApproval.task.createTime'),
    dataIndex: ['creationTime'],
    key: 'creationTime',
    customRender: ({ text }) => {
      // 基本格式化
      return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '';
    },
    width: 180,
  },
  {
    title: $t('auditApproval.task.auditUserName'),
    dataIndex: ['task', 'auditUserName'],
    key: 'auditUserName',
    width: 110,
  },
  {
    title: $t('auditApproval.task.auditTime'),
    dataIndex: ['task', 'auditTime'],
    key: 'auditTime',
    customRender: ({ text }) => {
      // 基本格式化
      return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '';
    },
    width: 180,
  },
  {
    title: $t('auditApproval.task.AuditRemark'),
    dataIndex: ['task', 'remark'],
    key: 'remark',
    width: 150,
  },
];
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
    <div class="m-2 flex items-center justify-between font-semibold">
      <div :class="[type === 0 ? 'blue' : 'yellow']">
        {{
          type === 0
            ? $t('seaImport.import.orderFee.receivableCharges')
            : $t('seaImport.import.orderFee.payableCharges')
        }}
      </div>
      <div class="text-small font-normal">
        {{ $t('auditApproval.totalNum', [dataSource.length]) }}
      </div>
    </div>

    <Table
      :data-source="dataSource"
      :columns="columns"
      :row-selection="rowSelection"
      :pagination="false"
      size="small"
      bordered
      :scroll="{ x: 2600 }"
      row-key="_rowKey"
      :class="['my-custom-table']"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'invoiceStatus'">
          <span>{{
            feeConstants
              .getInvoiceStatusOptions()
              .find((o) => o.value === record.invoiceStatus)?.label
          }}</span>
        </template>
        <template v-if="column.key === 'feeStatus'">
          <Tag
            :color="
              feeConstants
                .getFeeStatusOptions()
                .find((o) => o.value === record.feeStatus)?.color || ''
            "
          >
            {{
              feeConstants
                .getFeeStatusOptions()
                .find((o) => o.value === record.feeStatus)?.label
            }}</Tag
          >
        </template>

        <template v-if="column.key === 'industryCategory'">
          <span>{{
            feeConstants
              .getIndustryCategoryOptions()
              .find((o) => o.value === record.industryCategory)?.label
          }}</span>
        </template>

        <template v-if="column.key === 'unitPrice'">
          <span class="money"
            >{{
              feeConstants
                .getCurrencyEnumSymbolOptions()
                .find((o) => o.value === record.currencyId)?.label
            }}{{ record.unitPrice.toLocaleString() }}</span
          >
        </template>

        <template v-if="column.key === 'amount'">
          <span class="money"
            >{{
              feeConstants
                .getCurrencyEnumSymbolOptions()
                .find((o) => o.value === record.currencyId)?.label
            }}{{ record.amount.toLocaleString() }}</span
          >
        </template>

        <template v-if="column.key === 'noTaxUnitPrice'">
          <span class="money">
            {{
              feeConstants
                .getCurrencyEnumSymbolOptions()
                .find((o) => o.value === record.currencyId)?.label
            }}{{ record.noTaxUnitPrice.toLocaleString() }}</span
          >
        </template>

        <template v-if="column.key === 'noTaxAmount'">
          <span class="money"
            >{{
              feeConstants
                .getCurrencyEnumSymbolOptions()
                .find((o) => o.value === record.currencyId)?.label
            }}{{ record.noTaxAmount.toLocaleString() }}</span
          >
        </template>

        <template v-if="column.key === 'rqstPaymentAmount'">
          <span class="money"
            >{{
              feeConstants
                .getCurrencyEnumSymbolOptions()
                .find((o) => o.value === record.currencyId)?.label
            }}{{ record.rqstPaymentAmount.toLocaleString() }}</span
          >
        </template>

        <template v-if="column.key === 'invoicedAmount'">
          <span class="money"
            >{{
              feeConstants
                .getCurrencyEnumSymbolOptions()
                .find((o) => o.value === record.currencyId)?.label
            }}{{ record.invoicedAmount.toLocaleString() }}</span
          >
        </template>

        <template v-if="column.key === 'settledAmount'">
          <span class="money"
            >{{
              feeConstants
                .getCurrencyEnumSymbolOptions()
                .find((o) => o.value === record.currencyId)?.label
            }}{{ record.settledAmount.toLocaleString() }}</span
          >
        </template>

        <template v-if="column.key === 'orderInvoiceAmount'">
          <span class="money"
            >{{
              feeConstants
                .getCurrencyEnumSymbolOptions()
                .find((o) => o.value === record.currencyId)?.label
            }}{{ record.orderInvoiceAmount.toLocaleString() }}</span
          >
        </template>

        <template v-if="column.key === 'canInvoice'">
          <span>{{
            record.canInvoice ? $t('common.yes') : $t('common.no')
          }}</span>
        </template>

        <template v-if="column.key === 'isConfidential'">
          <span>{{
            record.isConfidential ? $t('common.yes') : $t('common.no')
          }}</span>
        </template>

        <template v-if="column.key === 'taskType'">
          <span>{{
            submissionConstants
              .getTaskTypeOptions()
              .find((o) => o.value === record.task?.taskType)?.label || '--'
          }}</span>
        </template>

        <template v-if="column.key === 'taskStatus'">
          <Tag
            :color="
              submissionConstants
                .getTaskStatusOptions()
                .find((o) => o.value === record.task?.taskStatus)?.color || ''
            "
          >
            {{
              submissionConstants
                .getTaskStatusOptions()
                .find((o) => o.value === record.task?.taskStatus)?.label || '--'
            }}</Tag
          >
        </template>

        <template v-else-if="column.key === 'dataEntryMethod'">
          <span>{{
            feeConstants
              .getDataEntryMethodOptions()
              .find((o) => o.value === record.dataEntryMethod)?.label
          }}</span>
        </template>
      </template>
    </Table>
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
