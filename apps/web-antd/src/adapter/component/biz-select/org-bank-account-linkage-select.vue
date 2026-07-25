<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { Select } from 'ant-design-vue';

import {
  getMyPermissionCompanies,
  getOrgBankAccountList,
} from '#/api/system/organization-unit';

import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

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
  orgId?: number; // 公司ID，如果传入则只获取该公司的银行列表
}>();

const emit = defineEmits<{
  'update:value': [value: string | undefined];
  change: [value: string | undefined, option: BankAccountOption | undefined];
}>();

const loading = ref(false);
const options = ref<BankAccountOption[]>([]);
const selectedValue = ref<string | undefined>(props.value);

watch(
  () => props.value,
  (newVal) => {
    selectedValue.value = newVal;
  },
);

// 监听orgId变化，重新加载银行列表
watch(
  () => props.orgId,
  () => {
    selectedValue.value = undefined;
    loadBankAccounts();
  },
);

async function loadBankAccounts() {
  loading.value = true;
  try {
    // 如果传入了orgId，则只获取指定公司的银行列表
    if (props.orgId) {
      console.log('✅ 获取指定公司的银行列表，公司ID:', props.orgId);
      const accounts = await getOrgBankAccountList(props.orgId);

      options.value = (accounts || []).map((account) => ({
        id: account.id,
        value: account.id,
        label: `${account.bankShortName} - ${account.accountName ?? ''} (${account.currencyCode ?? ''})`,
        bankName: account.bankName ?? '',
        bankAccount: account.bankAccount ?? '',
        currencyCode: account.currencyCode ?? '',
      }));
      return;
    } else {
      options.value = [];
    }
  } catch (error) {
    console.error('加载组织银行列表失败:', error);
    options.value = [];
  } finally {
    loading.value = false;
  }
}

function handleChange(value: any) {
  const strValue = value != null ? String(value) : undefined;
  selectedValue.value = strValue;
  const option = options.value.find((opt) => opt.value === strValue);
  emit('update:value', strValue);
  emit('change', strValue, option);
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
