<script lang="ts" setup>
import type { ClientInvoiceInfoAdminApi } from '#/api/sea-export/clinet-invoice-admin';

import { computed, ref, watch } from 'vue';

import { Button, Input, Switch, Table, Tooltip } from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import { $t } from '#/locales';

interface Props {
  /** 客户开票信息表id */
  clientInvoiceInfoId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  clientInvoiceInfoId: '',
});

const modelValue = defineModel<
  ClientInvoiceInfoAdminApi.ClientInvoiceBankAddOrEditDto[]
>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
});

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys;
  },
}));

let rowKeyCounter = 0;
const addRow = () => {
  const list = [...(modelValue.value ?? [])];
  list.push({
    _rowKey: `bank_${++rowKeyCounter}_${Date.now()}`,
    clientInvoiceInfoId: props.clientInvoiceInfoId || '',
    currencyId: 0,
    isDefault: false,
    sortId: list.length + 1,
  } as any);
  modelValue.value = list;
};

const removeSelectedRows = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (modelValue.value ?? []).filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  modelValue.value = list;
  selectedRowKeys.value = [];
};

const updateRow = (
  index: number,
  field: keyof ClientInvoiceInfoAdminApi.ClientInvoiceBankAddOrEditDto,
  value: any,
) => {
  const list = [...(modelValue.value ?? [])];
  if (!list[index]) {
    list[index] = {
      _rowKey: `bank_${++rowKeyCounter}_${Date.now()}`,
      clientInvoiceInfoId: props.clientInvoiceInfoId || '',
      currencyId: 0,
      isDefault: false,
      sortId: index + 1,
    } as any;
  }
  const updatedRow = { ...list[index], [field]: value };
  // 确保必填字段存在
  if (!updatedRow.clientInvoiceInfoId) {
    updatedRow.clientInvoiceInfoId = props.clientInvoiceInfoId || '';
  }
  if (updatedRow.currencyId === undefined || updatedRow.currencyId === null) {
    updatedRow.currencyId = 0;
  }
  list[index] =
    updatedRow as ClientInvoiceInfoAdminApi.ClientInvoiceBankAddOrEditDto & {
      _rowKey?: string;
    };
  modelValue.value = list;
};

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};

watch(
  () => modelValue.value,
  (val) => {
    if (val === undefined || val === null) {
      modelValue.value = [];
    }
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
  },
  { immediate: true },
);
</script>

<template>
  <div class="bank-table">
    <div class="mb-2 flex items-center gap-2">
      <span class="text-sm font-medium text-gray-600">
        {{ $t('client.invoice.bankInfo') }}
      </span>
      <Tooltip :title="$t('client.invoice.addBank')">
        <Button
          type="text"
          size="small"
          class="!flex !h-7 !w-7 !items-center !justify-center !rounded-md !bg-[#e6f4ff] !p-0 transition-all hover:scale-105 hover:!bg-[#bae0ff]"
          @click="addRow"
        >
          <IconifyIcon icon="mdi:add-box" class="text-[18px] text-[#1677ff]" />
        </Button>
      </Tooltip>
      <Tooltip :title="$t('common.delete')">
        <Button
          type="text"
          size="small"
          :class="[
            '!flex !h-7 !w-7 !items-center !justify-center !rounded-md !p-0 transition-all',
            selectedRowKeys.length
              ? '!bg-[#fff1f0] hover:scale-105 hover:!bg-[#ffccc7]'
              : '!bg-[#f5f5f5]',
          ]"
          :disabled="!selectedRowKeys.length"
          @click="removeSelectedRows"
        >
          <IconifyIcon
            icon="mdi:close-box"
            :class="[
              'text-[18px]',
              selectedRowKeys.length ? 'text-[#ff4d4f]' : 'text-[#bfbfbf]',
            ]"
          />
        </Button>
      </Tooltip>
    </div>
    <Table
      :data-source="dataSource"
      :row-selection="rowSelection"
      :pagination="false"
      size="small"
      bordered
      row-key="_rowKey"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'bankName'">
          <Input
            :value="record.bankName"
            :placeholder="$t('client.invoice.bankName')"
            allow-clear
            @update:value="(v) => updateRow(index, 'bankName', v)"
          />
        </template>
        <template v-else-if="column.key === 'bankAccount'">
          <Input
            :value="record.bankAccount"
            :placeholder="$t('client.invoice.bankAccount')"
            allow-clear
            @update:value="(v) => updateRow(index, 'bankAccount', v)"
          />
        </template>
        <template v-else-if="column.key === 'accountName'">
          <Input
            :value="record.accountName"
            :placeholder="$t('client.invoice.accountName')"
            allow-clear
            @update:value="(v) => updateRow(index, 'accountName', v)"
          />
        </template>
        <template v-else-if="column.key === 'currencyId'">
          <CurrencySelect
            :model-value="record.currencyId"
            :selected-items="
              toSelectedItems(record.currencyId, record.currencyCode)
            "
            class="w-full min-w-[100px]"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'currencyId', v)"
          />
        </template>
        <template v-else-if="column.key === 'swiftCode'">
          <Input
            :value="record.swiftCode"
            :placeholder="$t('client.invoice.swiftCode')"
            allow-clear
            @update:value="(v) => updateRow(index, 'swiftCode', v)"
          />
        </template>
        <template v-else-if="column.key === 'isDefault'">
          <Switch
            :checked="record.isDefault"
            @update:checked="(v) => updateRow(index, 'isDefault', v)"
          />
        </template>
      </template>
      <Table.Column
        key="bankName"
        :title="$t('client.invoice.bankName')"
        width="150"
      />
      <Table.Column
        key="bankAccount"
        :title="$t('client.invoice.bankAccount')"
        width="150"
      />
      <Table.Column
        key="accountName"
        :title="$t('client.invoice.accountName')"
        width="150"
      />
      <Table.Column
        key="currencyId"
        :title="$t('client.invoice.currency')"
        width="120"
      />
      <Table.Column
        key="swiftCode"
        :title="$t('client.invoice.swiftCode')"
        width="120"
      />
      <Table.Column
        key="isDefault"
        :title="$t('client.invoice.isDefault')"
        width="100"
      />
    </Table>
  </div>
</template>
