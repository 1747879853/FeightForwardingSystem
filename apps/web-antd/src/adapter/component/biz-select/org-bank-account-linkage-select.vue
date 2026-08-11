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
  async (newVal, oldVal) => {
    // 只有在 orgId 真正改变时才清空选中值（排除初始化情况）
    if (oldVal !== undefined && newVal !== oldVal) {
      selectedValue.value = undefined;
    }
    await loadBankAccounts();
  },
);

async function loadBankAccounts() {
  loading.value = true;
  try {
    // 如果传入了orgId，则只获取指定公司的银行列表
    if (props.orgId) {
      console.log('✅ 获取指定公司的银行列表，公司ID:', props.orgId);
      const accounts = await getOrgBankAccountList(props.orgId);
      console.log('📋 银行列表原始数据:', accounts);

      const newOptions = (accounts || []).map((account) => ({
        id: account.id,
        value: account.id,
        label: `${account.bankShortName} - ${account.accountName ?? ''} (${account.currencyCode ?? ''})`,
        bankName: account.bankName ?? '',
        bankAccount: account.bankAccount ?? '',
        currencyCode: account.currencyCode ?? '',
      }));

      console.log('📋 转换后的银行选项:', newOptions);
      console.log('📌 当前选中的值 (selectedValue):', selectedValue.value);

      options.value = newOptions;

      // 如果当前有选中值，但该值不在新加载的选项中，则清空选中值
      // 注意：这个检查必须在 options 更新之后进行
      if (selectedValue.value) {
        const found = newOptions.find(
          (opt) => opt.value === selectedValue.value,
        );
        console.log('🔍 查找选中的值:', {
          selectedValue: selectedValue.value,
          found: found,
        });

        if (!found) {
          console.warn('⚠️ 选中的值不在银行列表中，将被清空');
          selectedValue.value = undefined;
          emit('update:value', undefined);
          emit('change', undefined, undefined);
        } else {
          console.log('✅ 选中的值在银行列表中，将正确显示');
        }
      }
      return;
    } else {
      options.value = [];
      // 如果没有orgId，清空选项和选中值
      if (selectedValue.value) {
        selectedValue.value = undefined;
        emit('update:value', undefined);
        emit('change', undefined, undefined);
      }
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
