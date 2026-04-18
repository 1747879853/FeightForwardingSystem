<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useVbenForm } from '#/adapter/form';
import {
  getClientInvoiceInfoDetail,
  type ClientInvoiceInfoAdminApi,
} from '#/api/sea-export/clinet-invoice-admin';
import BankTable from './bank-table.vue';
import { $t } from '#/locales';

interface Props {
  /** 开票信息ID，用于编辑模式 */
  invoiceId?: string;
  /** 客户ID */
  clientId: string;
}

const props = withDefaults(defineProps<Props>(), {
  invoiceId: '',
});

const emit = defineEmits<{
  /** 表单数据变化 */
  change: [
    data:
      | ClientInvoiceInfoAdminApi.ClientInvoiceInfoAddDto
      | ClientInvoiceInfoAdminApi.ClientInvoiceInfoEditDto,
  ];
}>();

const route = useRoute();
const loading = ref(false);

// 银行信息列表
const bankList = ref<ClientInvoiceInfoAdminApi.ClientInvoiceBankAddOrEditDto[]>(
  [],
);

// 表单 API
const [InvoiceForm, invoiceFormApi] = useVbenForm({
  layout: 'vertical',
  schema: [
    {
      component: 'Input',
      fieldName: 'header',
      label: $t('client.invoice.header'),
      rules: 'required',
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Input',
      fieldName: 'taxNum',
      label: $t('client.invoice.taxNum'),
      rules: 'required',
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Input',
      fieldName: 'address',
      label: $t('client.invoice.address'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Input',
      fieldName: 'tel',
      label: $t('client.invoice.tel'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Switch',
      fieldName: 'isDefault',
      label: $t('client.invoice.isDefault'),
      defaultValue: false,
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-5',
});

/**
 * 加载详情数据
 */
const loadDetail = async () => {
  if (!props.invoiceId) {
    // 新增模式，重置表单
    await invoiceFormApi.resetForm();
    bankList.value = [];
    return;
  }

  loading.value = true;
  try {
    const detail = await getClientInvoiceInfoDetail(props.invoiceId);

    // 填充表单数据
    await invoiceFormApi.setValues({
      header: detail.header,
      taxNum: detail.taxNum,
      address: detail.address,
      tel: detail.tel,
      isDefault: detail.isDefault,
      sortId: detail.sortId,
    });

    // 填充银行信息
    bankList.value = detail.clientInvoiceBanks ?? [];
  } catch (error) {
    console.error('加载详情失败:', error);
  } finally {
    loading.value = false;
  }
};

/**
 * 获取表单数据
 */
const getFormData = async (): Promise<
  | ClientInvoiceInfoAdminApi.ClientInvoiceInfoAddDto
  | ClientInvoiceInfoAdminApi.ClientInvoiceInfoEditDto
  | null
> => {
  try {
    const { valid } = await invoiceFormApi.validate();
    if (!valid) return null;

    const formData = await invoiceFormApi.getValues();

    if (props.invoiceId) {
      // 编辑模式
      return {
        id: props.invoiceId,
        clientId: props.clientId,
        header: formData.header,
        taxNum: formData.taxNum,
        address: formData.address,
        tel: formData.tel,
        isDefault: formData.isDefault ?? false,
        sortId: formData.sortId ?? 0,
        clientInvoiceBanks: bankList.value,
      } as ClientInvoiceInfoAdminApi.ClientInvoiceInfoEditDto;
    } else {
      // 新增模式
      return {
        clientId: props.clientId,
        header: formData.header,
        taxNum: formData.taxNum,
        address: formData.address,
        tel: formData.tel,
        isDefault: formData.isDefault ?? false,
        sortId: formData.sortId ?? 0,
        clientInvoiceBanks: bankList.value,
      } as ClientInvoiceInfoAdminApi.ClientInvoiceInfoAddDto;
    }
  } catch (error) {
    console.error('获取表单数据失败:', error);
    return null;
  }
};

// 监听 invoiceId 变化，重新加载数据
watch(
  () => props.invoiceId,
  () => {
    loadDetail();
  },
  { immediate: true },
);

// 暴露方法给父组件
defineExpose({
  getFormData,
  resetForm: () => {
    invoiceFormApi.resetForm();
    bankList.value = [];
  },
});
</script>

<template>
  <div class="invoice-form" v-loading="loading">
    <!-- 基本信息 -->
    <div class="mb-4">
      <!-- <h3 class="text-base font-medium mb-3">{{ $t('client.invoice.basicInfo') }}</h3> -->
      <InvoiceForm />
    </div>

    <!-- 银行信息 -->
    <div>
      <!-- <h3 class="text-base font-medium mb-3">{{ $t('client.invoice.bankInfoTitle') }}</h3> -->
      <BankTable v-model="bankList" :client-invoice-info-id="invoiceId" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.invoice-form {
  padding: 8px;
}
</style>
