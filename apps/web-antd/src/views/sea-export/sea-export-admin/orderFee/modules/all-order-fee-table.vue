<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
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
  },
}));

const props = defineProps<{
  type?: number; // 收付类型 0 应收 1 应付
}>();

const route = useRoute();
const router = useRouter();

const entityId = computed(() => {
  const id = route.params.entityId;
  return id ? Number(id) : 0;
});

const submissionId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : 0;
});

const transportOrderId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : 0;
});
const handleModifyTask = (
  orderFeeTasks: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  let tasks = orderFeeTasks?.filter(
    (item) => item.task?.taskType !== feeConstants.taskTypeMap.feeModify,
  );
  let modifyData = orderFeeTasks?.filter(
    (item) => item.task?.taskType === feeConstants.taskTypeMap.feeModify,
  );
  console.log('modifyData', modifyData);
  modifyData.map((item: any) => {
    console.log('item', item);
    let modifyItem = item.task as ExpenseSubmissionAdminApi.TaskItemDto;
    let info = JSON.parse(modifyItem.info as string);
    Object.keys(info).forEach((key) => {
      console.log(key, info[key], item[key]);
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
const getTableDate = async () => {
  const detail = await OrderFeeTaskDetailAsync({ id: transportOrderId.value });
  const orderFeeTasks =
    detail.orderFeeTasks?.filter((item) => item.paySide === props.type) || [];
  const modifyData = handleModifyTask(orderFeeTasks);
  dataSource.value = normalizeOrderFeeWithRowKey(modifyData);
  console.log('detail', detail);
  console.log('dataSource', dataSource.value);
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
      console.log('remark onOk:', modalRemark);
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
  console.log(OrderFeeAuditDto);
  OrderFeeAuditAsync(OrderFeeAuditDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
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

const columns = [
  {
    title: $t('auditApproval.taskName'),

    children: [
      {
        title: $t('auditApproval.task.status'),
        dataIndex: ['task', 'taskStatus'],
        key: 'taskStatus',

        width: 90,
      },
      {
        title: $t('auditApproval.task.type'),
        dataIndex: ['task', 'taskType'],
        key: 'taskType',
        width: 90,
      },
      {
        title: $t('auditApproval.task.creatorUserName'),
        dataIndex: ['task', 'creatorUserName'],
        key: 'creatorUserName',
        width: 110,
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
        title: $t('auditApproval.task.remark'),
        dataIndex: ['task', 'remark'],
        key: 'remark',
        width: 150,
      },
    ],
  },
  {
    title: $t('auditApproval.expenseName'),
    children: [
      {
        title: $t('seaExport.export.orderFee.invoiceStatus'),
        dataIndex: 'invoiceStatus',
        key: 'invoiceStatus',
        width: 80,
      },
      {
        title: $t('seaExport.export.orderFee.feeStatus'),
        dataIndex: 'feeStatus',
        key: 'feeStatus',
        width: 90,
      },
      {
        title: $t('seaExport.export.orderFee.feecodeName'),
        dataIndex: 'feeCodeName',
        key: 'feeCodeName',
        minWidth: 120,
      },
      {
        title: $t('seaExport.client.industryCategories'),
        dataIndex: 'industryCategory',
        key: 'industryCategory',
        minWidth: 110,
      },
      {
        title: $t('seaExport.export.orderFee.settlement'),
        dataIndex: 'settlementName',
        key: 'settlementName',
        minWidth: 110,
      },
      {
        title: $t('seaExport.export.orderFee.currency'),
        dataIndex: 'currencyName',
        key: 'currencyName',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.ExchangeRate'),
        dataIndex: 'exchangeRate',
        key: 'exchangeRate',
        width: 85,
      },
      {
        title: $t('seaExport.export.orderFee.unitPrice'),
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        minWidth: 50,
      },
      {
        title: $t('seaExport.export.orderFee.amount'),
        dataIndex: 'amount',
        key: 'amount',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.unitEmum'),
        dataIndex: 'unitEmum',
        key: 'unitEmum',
        minWidth: 90,
      },
      {
        title: $t('seaExport.export.orderFee.quantity'),
        dataIndex: 'quantity',
        key: 'quantity',
        minWidth: 50,
      },
      {
        title: $t('seaExport.export.orderFee.taxRate'),
        dataIndex: 'taxRate',
        key: 'taxRate',
        minWidth: 50,
      },
      {
        title: $t('seaExport.export.orderFee.noTaxUnitPrice'),
        dataIndex: 'noTaxUnitPrice',
        key: 'noTaxUnitPrice',
        minWidth: 50,
      },
      {
        title: $t('seaExport.export.orderFee.noTaxAmount'),
        dataIndex: 'noTaxAmount',
        key: 'noTaxAmount',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.rqstPaymentAmount'),
        dataIndex: 'rqstPaymentAmount',
        key: 'rqstPaymentAmount',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.invoicedAmount'),
        dataIndex: 'invoicedAmount',
        key: 'invoicedAmount',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.orderInvoiceAmount'),
        dataIndex: 'orderInvoiceAmount',
        key: 'orderInvoiceAmount',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.settledAmount'),
        dataIndex: 'settledAmount',
        key: 'settledAmount',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.canInvoice'),
        dataIndex: 'canInvoice',
        key: 'canInvoice',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.isConfidential'),
        dataIndex: 'isConfidential',
        key: 'isConfidential',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.dataEntryMethod'),
        dataIndex: 'dataEntryMethod',
        key: 'dataEntryMethod',
        minWidth: 80,
      },
      {
        title: $t('seaExport.export.orderFee.remark'),
        dataIndex: 'remark',
        key: 'feeRemark',
        minWidth: 150,
      },
    ],
  },
];
onMounted(() => {
  getTableDate();
  console.log(
    ' feeConstants.getIndustryCategoryOptions()',
    feeConstants.getIndustryCategoryOptions(),
  );
});
</script>

<template>
  <div class="order-ctn-table">
    <div class="mb-2 flex items-center justify-between">
      <Space>
        <Button
          type="primary"
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="showConfirmWithRemark(true)"
        >
          {{ $t('auditApproval.Passed') }}
        </Button>
        <Button
          type="primary"
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="showConfirmWithRemark(false)"
          >{{ $t('auditApproval.NoPassed') }}</Button
        >
        <Button
          danger
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="showRejectWithRemark"
        >
          {{ $t('auditApproval.Rejected') }}
        </Button>
      </Space>
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
          <span>{{
            feeConstants
              .getFeeStatusOptions()
              .find((o) => o.value === record.feeStatus)?.label
          }}</span>
        </template>

        <template v-if="column.key === 'industryCategory'">
          <span>{{
            feeConstants
              .getIndustryCategoryOptions()
              .find((o) => o.value === record.industryCategory)?.label
          }}</span>
        </template>

        <template v-if="column.key === 'canInvoice'">
          <span>{{
            record.industryCategory ? $t('common.yes') : $t('common.no')
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
          <span>{{
            submissionConstants
              .getTaskStatusOptions()
              .find((o) => o.value === record.task?.taskStatus)?.label || '--'
          }}</span>
        </template>
      </template>
    </Table>
  </div>
</template>
