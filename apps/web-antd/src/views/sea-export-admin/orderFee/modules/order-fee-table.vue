<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';

import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import {
  Button,
  Space,
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

import * as feeConstants from '../data';
import * as clientConstants from '#/views/client/data';

import { getFeeCodePagedList } from '#/api/system/base-data/fee-code-admin';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';
import {
  batchEditOrderFee,
  getOrderFeePagedList,
  batchDeleteOrderFee,
} from '#/api/sea-export/order-fee-admin';

import {
  submitOrderFee,
  modifyOrderFee,
  deleteOrderFee,
  submitOrderFeeWithdrawAsync,
  OrderFeeTaskWithdraw,
} from '#/api/audit-approval/expense-admin';

import { GetDetail } from '#/api/sea-export/change-order-admin';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useOrderFeeColumns } from '../data';

const dataSource = defineModel<OrderFeeAdminApi.OrderFeeDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);

const props = defineProps<{
  type: number; // 收付类型 0 应收 1 应付
  mode?: string; // changeOrder 更改单
  parentChangeOrderId?: string; //更改单Id
}>();

const emit = defineEmits(['sync-fee']);

const route = useRoute();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const ORDER_CTN_API_KEYS: Array<
  Extract<keyof OrderFeeAdminApi.OrderFeeDto, string>
> = [
  'id',
  'transportOrderId',
  'paySide',
  'feeCodeId',
  'industryCategory',
  'settlementId',
  'currencyId',
  'exchangeRate',
  'unitPrice',
  'amount',
  'unitEmum',
  'quantity',
  'taxRate',
  'noTaxUnitPrice',
  'noTaxAmount',
  'rqstPaymentAmount',
  'invoicedAmount',
  'orderInvoiceAmount',
  'settledAmount',
  'canInvoice',
  'isConfidential',
  'dataEntryMethod',
  'remark',
];
let rowKeyCounter = 0;

const setChangeOrderFee = async (id: string) => {
  if (id) {
    let res = await GetDetail(id);
    console.log(
      'res',
      res.orderFees.filter((item) => item.paySide === props.type),
    );
    let orderFees = res.orderFees.filter((item) => item.paySide === props.type);
    orderFees.forEach((item) => {
      item.taskStatus = '';
      if (
        item.modifyOrderFeeTasks &&
        item.modifyOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus = $t('auditApproval.task.typeOptions.ModifyOrderFee');
      } else if (
        item.deleteOrderFeeTasks &&
        item.deleteOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus = $t('auditApproval.task.typeOptions.DeleteOrderFee');
      } else {
        item.taskStatus = '';
      }
    });

    dataSource.value = normalizeOrderFeeWithRowKey(orderFees);
    //更改单使用
    syncFee();
  } else {
    dataSource.value = [];
  }
};
const changeOrderId = ref('');

const getTableDate = async (id = '') => {
  if (id) {
    changeOrderId.value = id;
  }
  gridApi.query();
};

const queryTableData = async () => {
  if (props.mode === 'changeOrder') {
    return await setChangeOrderFee(changeOrderId.value);
  }
  let params = {
    TransportOrderId: editId.value,
    PaySide: props.type ?? 0,
    PageIndex: 1,
    PageSize: 999,
  };
  const res = await getOrderFeePagedList(params);
  res.items.forEach((item) => {
    item.taskStatus = '';
    if (
      item.modifyOrderFeeTasks &&
      item.modifyOrderFeeTasks[0]?.taskStatus === 0
    ) {
      item.taskStatus = $t('auditApproval.task.typeOptions.ModifyOrderFee');
    } else if (
      item.deleteOrderFeeTasks &&
      item.deleteOrderFeeTasks[0]?.taskStatus === 0
    ) {
      item.taskStatus = $t('auditApproval.task.typeOptions.DeleteOrderFee');
    } else {
      item.taskStatus = '';
    }
  });
  console.log('res', res.items);
  dataSource.value = normalizeOrderFeeWithRowKey(res.items);
};
const tmpAdd = ref(false);

const [Grid, gridApi] = useVbenVxeGrid<OrderFeeAdminApi.OrderFeeDto>({
  gridOptions: {
    columns: useOrderFeeColumns(props.type),
    height: '300px',
    keepSource: true,
    radioConfig: {
      highlight: true,
      trigger: 'row',
    },
    rowConfig: {
      keyField: '_rowKey',
    },
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async () => {
          console.log('addRowData', tmpAdd.value);
          if (tmpAdd.value) {
            tmpAdd.value = false;
            console.log('addRowDataing');
            addRowData();
            return dataSource.value;
          }
          await queryTableData();
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

      selectedRowKeys.value = records.map((r: any) => r._rowKey);

      // 可以在这里处理业务逻辑
    },

    // 全选/取消全选事件
    checkboxAll: ({ checked }) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      selectedRowKeys.value = records.map((r: any) => r._rowKey);
    },

    // 单选模式下的选择事件（如果使用 radio 类型）
    radioChange: ({ row }) => {
      console.log('单选选中:', row);
    },
  },
});
const addRowData = () => {
  const list = [...(dataSource.value ?? [])];
  list.push({
    _rowKey: `ofee_${++rowKeyCounter}_${Date.now()}`,
    id: '',
    transportOrderId: editId.value,
    paySide: props.type,
    feeStatus: 0,
    taskStatus: '',
    invoiceStatus: 0,
    canInvoice: false,
    dataEntryMethod: 0,
  } as any);
  dataSource.value = list;
};
const addRow = () => {
  tmpAdd.value = true;
  gridApi.query();
};
const showModifyWithRemark = () => {
  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: $t('auditApproval.task.okModify'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkModifyPlaceholder'),
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
      submitModify(modalRemark);
    },
    onCancel() {
      modalRemark = '';
    },
  });
};
const showDeleteWithRemark = () => {
  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: $t('auditApproval.task.okDelete'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkDeletePlaceholder'),
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
      submitDelete(modalRemark);
    },
    onCancel() {
      modalRemark = '';
    },
  });
};
const SubmittedOther = async (e: any) => {
  console.log('SubmittedOther', e);
  switch (e.key) {
    case 'modify': {
      showModifyWithRemark();
      break;
    }
    case 'delete': {
      showDeleteWithRemark();
      break;
    }
  }
};
const submitOrderFeeWithdraw = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  const okList = list.filter(
    (item) => item?.submitOrderFeeTasks[0]?.taskStatus === 0,
  );
  if (okList.length === 0) {
    console.log('no_task_status', list);
    message.error({
      content: $t('ui.actionMessage.operationFailed'),
      key: 'action_process_msg',
    });
    return;
  }
  let taskBaseId = okList[0]?.submitOrderFeeTasks[0]?.taskBaseId;
  let submitOrderFeeWithdrawDto: ExpenseSubmissionAdminApi.SubmitOrderFeeWithdrawDto =
    {
      id: taskBaseId ?? '',
      orderFeeIds: list.map((item) => item.id),
    };
  submitOrderFeeWithdrawAsync(submitOrderFeeWithdrawDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const orderFeeWithdraw = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  // const okList = list.filter(
  //   (item) => item?.submitOrderFeeTasks[0]?.taskStatus === 0,
  // );
  // if (okList.length === 0) {
  //   console.log('no_task_status', list);
  //   message.error({
  //     content: $t('ui.actionMessage.operationFailed'),
  //     key: 'action_process_msg',
  //   });
  //   return;
  // }
  // let taskBaseId = okList[0]?.submitOrderFeeTasks[0]?.taskBaseId;
  let orderFeeWithdrawDto: ExpenseSubmissionAdminApi.OrderFeeTaskWithdrawDto = {
    orderFeeIds: list.map((item) => item.id),
  };
  OrderFeeTaskWithdraw(orderFeeWithdrawDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
const Submitted = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let SubmitOrderFeeDto = {
    TransportOrderId: editId.value,
    PaySide: props.type ?? 0,
    orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(SubmitOrderFeeDto);
  submitOrderFee(SubmitOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
const submitModify = (remark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let ModifyOrderFeeDto = {
    remark: remark,
    TransportOrderId: editId.value,
    orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(ModifyOrderFeeDto);
  modifyOrderFee(ModifyOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const submitDelete = (remark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let DeleteOrderFeeDto = {
    remark: remark,
    TransportOrderId: editId.value,
    orderFeeIds: list.map((item) => item.id),
    //orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(DeleteOrderFeeDto);
  deleteOrderFee(DeleteOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderFeeWithRowKey = (
  items: OrderFeeAdminApi.OrderFeeDto[] | undefined,
) => {
  if (!items?.length) return [];
  console.log('rrr', items);
  return items.map((item, i) => ({
    ...item,
    _rowKey: `ofee_${i}_${Date.now()}`,
  })) as any[];
};

/** 提交时移除 _rowKey 等非 API 字段，仅保留 OrderCtnAddDto 字段 */
const sanitizeOrderFee = (
  items: any[] | undefined,
): OrderFeeAdminApi.OrderFeeEditDto[] => {
  if (!items?.length) return [];
  return items.map((item) => {
    const dto: Record<string, any> = {};
    for (const key of ORDER_CTN_API_KEYS) {
      const val = item[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val === '') continue;
        dto[key] = val;
      }
    }
    return dto as OrderFeeAdminApi.OrderFeeEditDto;
  });
};
const saveRow = () => {
  const list = (dataSource.value ?? []).filter(
    (row) => row.feeStatus === feeConstants.getFeeStatusValue.Entering,
  );

  console.log(list);
  batchEditOrderFee(list).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
const removeSelectedRows = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  const needDelIds = (dataSource.value ?? [])
    .filter((row) => keysSet.has((row as any)._rowKey))
    .filter((row) => (row as any).id !== 0)
    .map((row) => (row as any).id);
  console.log(needDelIds);
  dataSource.value = list;
  selectedRowKeys.value = [];
  if (props.mode !== 'changeOrder') {
    batchDeleteOrderFee(needDelIds).then(() => {
      message.success({
        content: $t('ui.actionMessage.operationSuccess'),
        key: 'action_process_msg',
      });
    });
  }
};

const syncFee = () => {
  // const list = (dataSource.value ?? []).filter(
  //   (row) => row.feeStatus === feeConstants.getFeeStatusValue.Entering,
  // );
  const list = dataSource.value ?? [];
  const syncFeeDto = {
    type: props.type ?? 0,
    orderFees: list,
  };
  console.log('费用同步', syncFeeDto);
  emit('sync-fee', syncFeeDto);
};

watch(
  () => dataSource.value,
  (val) => {
    if (val === undefined || val === null) {
      dataSource.value = [];
    }
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
    syncFee();
  },
  { immediate: true },
);
const feeCodeList = ref<FeeCodeAdminApi.FeeCodeDto[]>([]);
const getFeeCodeList = async () => {
  let res = (await getFeeCodePagedList({ PageIndex: 1, PageSize: 1000 })) || {};
  feeCodeList.value = res.items || [];
  console.log('feeCodeList', feeCodeList.value);
};
onMounted(() => {
  getTableDate();
  getFeeCodeList();
});
defineExpose({
  getTableDate,
});
</script>

<template>
  <Card class="order-fee-card">
    <div class="px-1">
      <div class="mt-4">
        <div class="order-ctn-table">
          <Grid
            :table-title="
              type === 0
                ? $t('seaExport.export.orderFee.receivableCharges')
                : $t('seaExport.export.orderFee.payableCharges')
            "
          >
            <template #toolbar-tools>
              <Space>
                <Button type="primary" @click="addRow">
                  {{ $t('common.create') }}
                </Button>
                <Button
                  type="primary"
                  @click="saveRow"
                  v-show="props.mode !== 'changeOrder'"
                >
                  {{ $t('common.save') }}
                </Button>
                <Button
                  danger
                  :disabled="!selectedRowKeys.length"
                  @click="removeSelectedRows"
                >
                  {{ $t('common.delete') }}
                </Button>

                <DropdownButton
                  @click="Submitted"
                  type="primary"
                  :disabled="!selectedRowKeys.length"
                >
                  {{ $t('auditApproval.status.Submitted') }}
                  <template #overlay>
                    <Menu @click="SubmittedOther">
                      <MenuItem key="modify">
                        {{ $t('auditApproval.ApplyModification') }}
                      </MenuItem>
                      <MenuItem key="delete">
                        {{ $t('auditApproval.ApplyDeletion') }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <Button
                  type="primary"
                  :disabled="!selectedRowKeys.length"
                  @click="orderFeeWithdraw"
                  >{{ $t('auditApproval.withdraw') }}</Button
                >
              </Space>
            </template>
          </Grid>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped lang="scss">
.order-fee-card {
  :deep(.ant-card-body) {
    padding: 0 20px 20px !important;
  }

  :deep(.ant-table-content) {
    min-height: 270px;
    // max-height: 500px;
    // overflow-y: auto;
  }
}

// .custom-table {
//   min-height: 300px;
// }
</style>
