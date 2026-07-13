<script lang="ts" setup>
import { ref, watch } from 'vue';

import { Select } from 'ant-design-vue';

import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';

interface ClientBankOption {
  id: string;
  label: string;
  value: string;
  bankName: string;
  bankAccount: string;
  currencyCode: string;
}

const props = defineProps<{
  value?: string;
  clientId?: string;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:value': [value: string | undefined];
  change: [value: string | undefined, option: ClientBankOption | undefined];
}>();

const loading = ref(false);
const options = ref<ClientBankOption[]>([]);
const selectedValue = ref<string | undefined>(props.value);

watch(
  () => props.value,
  (newVal) => {
    selectedValue.value = newVal;
  },
);

watch(
  () => props.clientId,
  async (newClientId) => {
    if (!newClientId) {
      options.value = [];
      return;
    }

    loading.value = true;
    try {
      const invoices = await getClientInvoiceInfoList({
        ClientId: newClientId,
      });

      const bankOptions: ClientBankOption[] = [];
      invoices?.forEach((invoice) => {
        invoice.clientInvoiceBanks?.forEach((bank) => {
          bankOptions.push({
            id: bank.id,
            value: bank.id,
            label: `${bank.bankName} - ${bank.accountName} (${bank.currencyCode})`,
            bankName: bank.bankName || '',
            bankAccount: bank.bankAccount || '',
            currencyCode: bank.currencyCode || '',
          });
        });
      });

      options.value = bankOptions;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

function handleChange(value: string | undefined) {
  selectedValue.value = value;
  const option = options.value.find((opt) => opt.value === value);
  emit('update:value', value);
  emit('change', value, option);
}

defineExpose({
  options,
});
</script>

<template>
  <Select
    class="biz-select w-full"
    :value="selectedValue"
    :options="options"
    :loading="loading"
    :placeholder="placeholder || '请选择对方银行'"
    :allow-clear="allowClear"
    :disabled="disabled || !clientId"
    @update:value="handleChange"
  />
</template>
