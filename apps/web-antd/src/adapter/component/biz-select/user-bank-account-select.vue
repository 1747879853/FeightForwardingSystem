<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { Select } from 'ant-design-vue';

import { getUserBankAccountList } from '#/api/system/user-admin';
import { useUserStore } from '@vben/stores';

interface BankAccountOption {
  id: string;
  label: string;
  value: string;
  bankName: string;
  bankAccount: string;
  currencyCode: string;
}

const props = defineProps<{
  value?: string;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:value': [value: string | undefined];
  change: [value: string | undefined, option: BankAccountOption | undefined];
}>();

const userStore = useUserStore();
const loading = ref(false);
const options = ref<BankAccountOption[]>([]);
const selectedValue = ref<string | undefined>(props.value);

watch(
  () => props.value,
  (newVal) => {
    selectedValue.value = newVal;
  },
);

async function loadBankAccounts() {
  const userId = userStore.userInfo?.userId;
  console.log('加载银行信息的userId', userId);
  if (!userId) return;

  loading.value = true;
  try {
    const accounts = await getUserBankAccountList(userId);
    options.value = (accounts || []).map((account) => ({
      id: account.id,
      value: account.id,
      label: `${account.bankShortName} - ${account.accountName} (${account.currencyCode})`,
      bankName: account.bankName,
      bankAccount: account.bankAccount,
      currencyCode: account.currencyCode,
    }));
  } finally {
    loading.value = false;
  }
}

function handleChange(value: string | undefined) {
  selectedValue.value = value;
  const option = options.value.find((opt) => opt.value === value);
  emit('update:value', value);
  emit('change', value, option);
}

onMounted(() => {
  loadBankAccounts();
});

defineExpose({
  options,
  reload: loadBankAccounts,
});
</script>

<template>
  <Select
    class="biz-select w-full"
    :value="selectedValue"
    :options="options"
    :loading="loading"
    :placeholder="placeholder || '请选择我司银行'"
    :allow-clear="allowClear"
    :disabled="disabled"
    @update:value="handleChange"
  />
</template>
