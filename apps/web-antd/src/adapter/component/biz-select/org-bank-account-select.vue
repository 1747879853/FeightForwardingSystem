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
    }

    // 未传入orgId，获取当前用户有权限的所有公司的银行列表
    const companies = await getMyPermissionCompanies();
    console.log('✅ 当前用户有权限的公司列表:', companies);
    if (!companies || companies.length === 0) {
      console.warn('当前用户没有关联的公司');
      options.value = [];
      return;
    }

    // 遍历所有公司，获取每个公司的银行列表
    const allAccounts: SystemOrganizationUnitApi.OrgBankAccountDto[] = [];
    
    for (const company of companies) {
      try {
        const accounts = await getOrgBankAccountList(company.id);
        if (accounts && accounts.length > 0) {
          allAccounts.push(...accounts);
        }
      } catch (error) {
        console.error(`加载公司 ${company.name} 的银行列表失败:`, error);
      }
    }

    // 去重：根据 id 去重
    const uniqueAccounts = allAccounts.filter(
      (account, index, self) =>
        index === self.findIndex((a) => a.id === account.id),
    );

    console.log('✅ 合并后的银行列表（去重后）:', uniqueAccounts);

    options.value = uniqueAccounts.map((account) => ({
      id: account.id,
      value: account.id,
      label: `${account.bankShortName} - ${account.accountName ?? ''} (${account.currencyCode ?? ''})`,
      bankName: account.bankName ?? '',
      bankAccount: account.bankAccount ?? '',
      currencyCode: account.currencyCode ?? '',
    }));
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
