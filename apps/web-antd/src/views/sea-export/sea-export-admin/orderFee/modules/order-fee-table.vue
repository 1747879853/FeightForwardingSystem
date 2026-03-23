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
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Textarea,
} from 'ant-design-vue';

import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import CodePackageSelect from '#/adapter/component/biz-select/code-package-select.vue';
import { $t } from '#/locales';

import * as feeConstants from '../data';

import FeeCodeSelect from '#/adapter/component/biz-select/fee-code-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import ExchangeRateSelect from '#/adapter/component/biz-select/exchange-rate-select.vue';

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
const dataSource = defineModel<OrderFeeAdminApi.OrderFeeEditDto[]>({
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

const editId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : undefined;
});

const ORDER_CTN_API_KEYS: Array<
  Extract<keyof OrderFeeAdminApi.OrderFeeEditDto, string>
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

const getTableDate = () => {
  let params = {
    TransportOrderId: editId.value ?? 0,
    PaySide: props.type ?? 0,
    PageIndex: 1,
    PageSize: 999,
  };
  getOrderFeePagedList(params).then((res) => {
    res.items.forEach((item) => {
      item.taskStatus = $t('auditApproval.task.noTasking');
      if (
        item.submitOrderFeeTasks &&
        item.submitOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus =
          $t('auditApproval.task.typeOptions.SubmitOrderFee') +
          $t('auditApproval.task.statusOptions.Auditing');
      } else if (
        item.modifyOrderFeeTasks &&
        item.modifyOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus =
          $t('auditApproval.task.typeOptions.ModifyOrderFee') +
          $t('auditApproval.task.statusOptions.Auditing');
      } else if (
        item.deleteOrderFeeTasks &&
        item.deleteOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus =
          $t('auditApproval.task.typeOptions.DeleteOrderFee') +
          $t('auditApproval.task.statusOptions.Auditing');
      } else {
        item.taskStatus = $t('auditApproval.task.noTasking');
      }
    });
    console.log('res', res.items);
    dataSource.value = normalizeOrderFeeWithRowKey(res.items);
  });
};
const addRow = () => {
  const list = [...(dataSource.value ?? [])];
  list.push({
    _rowKey: `ofee_${++rowKeyCounter}_${Date.now()}`,
    id: 0,
    transportOrderId: editId.value,
    paySide: props.type,
    feeStatus: 0,
    invoiceStatus: 0,
    canInvoice: false,
    dataEntryMethod: 0,
  } as any);
  dataSource.value = list;
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
      id: taskBaseId ?? 0,
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
    TransportOrderId: editId.value ?? 0,
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
    TransportOrderId: editId.value ?? 0,
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
    TransportOrderId: editId.value ?? 0,
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
  items: OrderFeeAdminApi.OrderFeeEditDto[] | undefined,
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
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
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

  batchDeleteOrderFee(needDelIds).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
  });
};

const updateRow = (
  index: number,
  field: keyof OrderFeeAdminApi.OrderFeeAddDto,
  value: any,
) => {
  const list = [...(dataSource.value ?? [])];

  if (!list[index]) {
    list[index] = { _rowKey: `ofee_${++rowKeyCounter}_${Date.now()}` } as any;
  }

  list[index] = { ...list[index], [field]: value };
  // 含税单价 变化 同时更新 含税金额 不含税单价 不含税金额
  if (field === 'unitPrice' && value !== '') {
    if (list[index]['quantity']) {
      // 同时更新 含税金额 字段
      let amount = value * list[index]['quantity'];
      list[index] = { ...list[index], amount: amount };
    }
    // 税率变化 或者 税率已存在 都需要更新 不含税单价 和 不含税金额
    if (list[index]['taxRate']) {
      // 同时更新 不含税单价 字段
      list[index] = {
        ...list[index],
        noTaxUnitPrice: value / (1 + list[index]['taxRate'] / 100),
      };
      if (list[index]['quantity']) {
        // 同时更新 不含税金额 字段
        list[index] = {
          ...list[index],
          noTaxAmount:
            (value / (1 + list[index]['taxRate'] / 100)) *
            list[index]['quantity'],
        };
      }
    }
  }
  if (field === 'quantity' && value !== '') {
    if (list[index]['unitPrice']) {
      // 同时更新 含税金额 字段
      list[index] = {
        ...list[index],
        amount: list[index]['unitPrice'] * value,
      };
    }
    if (list[index]['unitPrice'] && list[index]['taxRate'] !== undefined) {
      // 同时更新 不含税金额 字段
      const noTaxUnitPrice =
        list[index]['unitPrice'] / (1 + (list[index]['taxRate'] || 0) / 100);
      list[index] = { ...list[index], noTaxAmount: noTaxUnitPrice * value };
    }
  }
  if (field === 'taxRate' && value !== '') {
    if (list[index]['unitPrice']) {
      // 同时更新 不含税单价 字段
      list[index] = {
        ...list[index],
        noTaxUnitPrice: list[index]['unitPrice'] / (1 + value / 100),
      };
      // 同时更新 不含税金额 字段
      list[index] = {
        ...list[index],
        noTaxAmount: list[index]['noTaxUnitPrice'] * value,
      };
    }
  }
  dataSource.value = list;
};

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};
const getSettlementIndustryCategory = (industryCategory?: number) => {
  if (industryCategory == null || industryCategory < 0) return 'b';
  return feeConstants.industryCategoryMap[industryCategory] || 'b';
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
onMounted(() => {
  getTableDate();
});
</script>

<template>
  <div class="order-ctn-table">
    <div class="mb-2 flex items-center justify-between">
      <Space>
        <Button type="primary" size="small" @click="addRow">
          {{ $t('common.create') }}
        </Button>
        <Button
          type="primary"
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="saveRow"
        >
          {{ $t('common.save') }}
        </Button>
        <Button
          danger
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="removeSelectedRows"
        >
          {{ $t('common.delete') }}
        </Button>

        <DropdownButton @click="Submitted" size="small" type="primary">
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
        <!-- <Button type="primary" size="small" :disabled="!selectedRowKeys.length" @click="submitOrderFeeWithdraw">{{
          $t('auditApproval.withdraw') }}</Button> -->
        <Button
          type="primary"
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="orderFeeWithdraw"
          >{{ $t('auditApproval.withdraw') }}</Button
        >
        <!-- <Button type="primary" size="small" :disabled="!selectedRowKeys.length" @click="Submitted">{{
          $t('auditApproval.status.Submitted') }}</Button>
        <Button type="primary" size="small" :disabled="!selectedRowKeys.length" @click="submitOrderFeeWithdraw">{{
          $t('auditApproval.withdraw') }}</Button>
        <Button type="primary" size="small" :disabled="!selectedRowKeys.length" @click="submitOrderFeeWithdraw">{{
          $t('auditApproval.ApplyModification') }}</Button>
        <Button type="primary" size="small" :disabled="!selectedRowKeys.length" @click="submitOrderFeeWithdraw">{{
          $t('auditApproval.ApplyDeletion') }}</Button> -->
      </Space>
    </div>
    <Table
      :data-source="dataSource"
      :row-selection="rowSelection"
      :pagination="false"
      size="small"
      bordered
      :scroll="{ x: 2800 }"
      row-key="_rowKey"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'invoiceStatus'">
          <span>{{
            feeConstants
              .getInvoiceStatusOptions()
              .find((o) => o.value === record.invoiceStatus)?.label
          }}</span>
          <!-- <Select v-model:value="record.feeStatus" :options="getFeeStatusOptions()" class="w-full min-w-[100px]"
            :placeholder="$t('ui.placeholder.select')" @change="(v) => updateRow(index, 'feeStatus', v)" /> -->
        </template>
        <template v-if="column.key === 'feeStatus'">
          <span>{{
            feeConstants
              .getFeeStatusOptions()
              .find((o) => o.value === record.feeStatus)?.label
          }}</span>
          <!-- <Select v-model:value="record.feeStatus" :options="getFeeStatusOptions()" class="w-full min-w-[100px]"
            :placeholder="$t('ui.placeholder.select')" @change="(v) => updateRow(index, 'feeStatus', v)" /> -->
        </template>
        <template v-if="column.key === 'taskStatus'">
          <span>{{ record.taskStatus }}</span>
          <!-- <Select v-model:value="record.feeStatus" :options="getFeeStatusOptions()" class="w-full min-w-[100px]"
            :placeholder="$t('ui.placeholder.select')" @change="(v) => updateRow(index, 'feeStatus', v)" /> -->
        </template>
        <template v-else-if="column.key === 'feeCodeId'">
          <FeeCodeSelect
            :model-value="record.feeCodeId"
            class="w-full min-w-[90px]"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'feeCodeId', v)"
          />
        </template>
        <template v-else-if="column.key === 'industryCategory'">
          <Select
            v-model:value="record.industryCategory"
            :options="feeConstants.getIndustryCategoryOptions()"
            class="w-full min-w-[100px]"
            :placeholder="$t('ui.placeholder.select')"
            @change="(v) => updateRow(index, 'industryCategory', v)"
          />
        </template>
        <template v-else-if="column.key === 'settlementId'">
          <ClientSelect
            :industryCategory="
              getSettlementIndustryCategory(record.industryCategory)
            "
            v-if="record.industryCategory > -1"
            :model-value="record.settlementId"
            class="w-full min-w-[90px]"
            :selected-items="
              toSelectedItems(record.settlementId, record.settlementName)
            "
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'settlementId', v)"
          />
          <span v-else>--</span>
        </template>

        <template v-else-if="column.key === 'currencyId'">
          <CurrencySelect
            :model-value="record.currencyId"
            class="w-full min-w-[80px]"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'currencyId', v)"
          />
        </template>
        <template v-else-if="column.key === 'exchangeRate'">
          <ExchangeRateSelect
            :model-value="record.exchangeRate"
            class="w-full min-w-[70px]"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'exchangeRate', v)"
          />
        </template>
        <template v-else-if="column.key === 'unitPrice'">
          <InputNumber
            :value="record.unitPrice"
            :placeholder="$t('seaExport.export.orderFee.unitPrice')"
            class="w-full"
            :min="0"
            :precision="4"
            :controls="false"
            @update:value="(v) => updateRow(index, 'unitPrice', v)"
          />
        </template>
        <template v-else-if="column.key === 'amount'">
          <InputNumber
            :value="record.amount"
            :placeholder="$t('seaExport.export.orderFee.amount')"
            class="w-full"
            :min="0"
            :controls="false"
            :precision="2"
            @update:value="(v) => updateRow(index, 'amount', v)"
          />
        </template>
        <template v-else-if="column.key === 'unitEmum'">
          <Select
            v-model:value="record.unitEmum"
            :options="feeConstants.getUnitEmumOptions()"
            class="w-full min-w-[100px]"
            :placeholder="$t('ui.placeholder.select')"
            @change="(v) => updateRow(index, 'unitEmum', v)"
          />
        </template>
        <template v-else-if="column.key === 'quantity'">
          <InputNumber
            :value="record.quantity"
            :placeholder="$t('seaExport.export.orderFee.quantity')"
            class="w-full"
            :min="0"
            :controls="false"
            :precision="2"
            @update:value="(v) => updateRow(index, 'quantity', v)"
          />
        </template>
        <template v-else-if="column.key === 'taxRate'">
          <InputNumber
            :value="record.taxRate"
            :placeholder="$t('seaExport.export.orderFee.taxRate')"
            class="w-full"
            :min="0"
            :controls="false"
            :precision="4"
            @update:value="(v) => updateRow(index, 'taxRate', v)"
          />
        </template>
        <template v-else-if="column.key === 'noTaxUnitPrice'">
          <span>{{
            record.noTaxUnitPrice ? record.noTaxUnitPrice.toFixed(2) : '--'
          }}</span>
        </template>
        <template v-else-if="column.key === 'noTaxAmount'">
          <span>{{
            record.noTaxAmount ? record.noTaxAmount.toFixed(4) : '--'
          }}</span>
        </template>
        <template v-else-if="column.key === 'canInvoice'">
          <Checkbox v-model:checked="record.canInvoice"> </Checkbox>
        </template>
        <template v-else-if="column.key === 'isConfidential'">
          <Checkbox v-model:checked="record.isConfidential"> </Checkbox>
        </template>
        <template v-else-if="column.key === 'dataEntryMethod'">
          <span>{{
            feeConstants
              .getDataEntryMethodOptions()
              .find((o) => o.value === record.dataEntryMethod)?.label
          }}</span>
        </template>
        <template v-else-if="column.key === 'remark'">
          <Input
            :value="record.remark"
            :placeholder="$t('seaExport.export.remark')"
            allow-clear
            @update:value="(v) => updateRow(index, 'remark', v)"
          />
        </template>
      </template>
      <Table.Column
        key="invoiceStatus"
        :title="$t('seaExport.export.orderFee.invoiceStatus')"
        :width="80"
        fixed="left"
      />
      <Table.Column
        key="feeStatus"
        :title="$t('seaExport.export.orderFee.feeStatus')"
        :width="90"
        fixed="left"
      />
      <Table.Column
        key="taskStatus"
        :title="$t('auditApproval.task.status')"
        :min-width="120"
      />
      <Table.Column
        key="feeCodeId"
        :title="$t('seaExport.export.orderFee.feecodeName')"
        :min-width="120"
      />

      <Table.Column
        key="industryCategory"
        :title="$t('seaExport.client.industryCategories')"
        :min-width="110"
      />
      <Table.Column
        key="settlementId"
        :title="$t('seaExport.export.orderFee.settlement')"
        :min-width="110"
      />
      <Table.Column
        key="currencyId"
        :title="$t('seaExport.export.orderFee.currency')"
        :min-width="80"
      />
      <Table.Column
        key="exchangeRate"
        :title="$t('seaExport.export.orderFee.ExchangeRate')"
        :width="85"
      />
      <Table.Column
        key="unitPrice"
        :title="$t('seaExport.export.orderFee.unitPrice')"
        :min-width="50"
      />
      <Table.Column
        key="amount"
        :title="$t('seaExport.export.orderFee.amount')"
        :min-width="80"
      />
      <Table.Column
        key="unitEmum"
        :title="$t('seaExport.export.orderFee.unitEmum')"
        :min-width="90"
      />
      <Table.Column
        key="quantity"
        :title="$t('seaExport.export.orderFee.quantity')"
        :min-width="50"
      />
      <Table.Column
        key="taxRate"
        :title="$t('seaExport.export.orderFee.taxRate')"
        :min-width="50"
      />
      <Table.Column
        key="noTaxUnitPrice"
        :title="$t('seaExport.export.orderFee.noTaxUnitPrice')"
        :min-width="50"
      />
      <Table.Column
        key="noTaxAmount"
        :title="$t('seaExport.export.orderFee.noTaxAmount')"
        :min-width="80"
      />
      <Table.Column
        key="rqstPaymentAmount"
        :title="$t('seaExport.export.orderFee.rqstPaymentAmount')"
        :min-width="80"
      />
      <Table.Column
        key="invoicedAmount"
        :title="$t('seaExport.export.orderFee.invoicedAmount')"
        :min-width="80"
      />
      <Table.Column
        key="orderInvoiceAmount"
        :title="$t('seaExport.export.orderFee.orderInvoiceAmount')"
        :min-width="80"
      />
      <Table.Column
        key="settledAmount"
        :title="$t('seaExport.export.orderFee.settledAmount')"
        :min-width="80"
      />
      <Table.Column
        key="canInvoice"
        :title="$t('seaExport.export.orderFee.canInvoice')"
        :min-width="80"
      />
      <Table.Column
        key="isConfidential"
        :title="$t('seaExport.export.orderFee.isConfidential')"
        :min-width="80"
      />
      <Table.Column
        key="dataEntryMethod"
        :title="$t('seaExport.export.orderFee.dataEntryMethod')"
        :min-width="80"
      />
      <Table.Column
        key="remark"
        :title="$t('seaExport.export.orderFee.remark')"
        :min-width="80"
      />
    </Table>
  </div>
</template>
