<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useVbenForm } from '#/adapter/form';
import {
  getClientInvoiceInfoDetail,
  type ClientInvoiceInfoAdminApi,
} from '#/api/sea-export/clinet-invoice-admin';
import type { GeminiClientInvoiceInfoDto } from '#/api/sea-export/gemini-admin';
import { getClientDetail } from '#/api/sea-export/client-admin';
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
/** 详情/默认值首次加载完成（供父级 AI 回填等待） */
let resolveReady: (() => void) | undefined;
const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

// 客户详情缓存
const clientDetail = ref<any>(null);

// 表单数据（用于传递给子组件）
const formData = ref<{
  header?: string;
  taxNum?: string;
  address?: string;
  tel?: string;
  mobile?: string;
  require?: string; // 添加开票要求字段
  isDefault?: boolean;
} | null>(null);

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
      component: 'Input',
      fieldName: 'mobile',
      label: $t('client.invoice.mobile'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Textarea',
      fieldName: 'require',
      label: '开票要求',
      componentProps: {
        allowClear: true,
        placeholder: '请输入开票要求',
        maxlength: 2048,
        rows: 3,
        showCount: true,
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
  handleValuesChange: (values) => {
    // 实时更新formData
    formData.value = {
      header: values.header,
      taxNum: values.taxNum,
      address: values.address,
      tel: values.tel,
      mobile: values.mobile,
      require: values.require,
      isDefault: values.isDefault,
    };
  },
});

/**
 * 加载客户详情
 */
const loadClientDetail = async () => {
  if (!props.clientId || clientDetail.value) return;

  try {
    const detail = await getClientDetail(props.clientId);
    clientDetail.value = detail;
  } catch (error) {
    console.error('加载客户详情失败:', error);
  }
};

/**
 * 获取默认地址
 */
const getDefaultAddress = (): string => {
  if (
    !clientDetail.value?.addresses ||
    clientDetail.value.addresses.length === 0
  ) {
    return '';
  }

  // 优先返回默认地址
  const defaultAddr = clientDetail.value.addresses.find(
    (addr: any) => addr.isDefault,
  );
  if (defaultAddr) {
    return defaultAddr.address || '';
  }

  // 如果没有默认地址，返回第一个
  return clientDetail.value.addresses[0]?.address || '';
};

/**
 * 获取默认电话
 */
const getDefaultTel = (): string => {
  if (
    !clientDetail.value?.addresses ||
    clientDetail.value.addresses.length === 0
  ) {
    return '';
  }

  // 优先返回默认地址
  const defaultAddr = clientDetail.value.addresses.find(
    (addr: any) => addr.isDefault,
  );
  if (defaultAddr) {
    return defaultAddr.mobile || '';
  }

  // 如果没有默认地址，返回第一个
  return clientDetail.value.addresses[0]?.mobile || '';
};

/**
 * 加载详情数据
 */
const loadDetail = async () => {
  // 先加载客户详情
  await loadClientDetail();

  if (!props.invoiceId) {
    // 新增模式，使用客户信息填充默认值
    const header = clientDetail.value?.fullName || '';
    const taxNum = clientDetail.value?.taxNo || '';
    const address = getDefaultAddress();
    const tel = getDefaultTel();

    await invoiceFormApi.setValues({
      header,
      taxNum,
      address,
      tel,
      mobile: '',
      require: '',
      isDefault: false,
    });

    bankList.value = [];
    await syncInvoiceSnapshot();
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
      mobile: detail.mobile,
      require: detail.require, // 添加require字段
      isDefault: detail.isDefault,
      sortId: detail.sortId,
    });

    // 填充银行信息
    bankList.value = detail.clientInvoiceBanks ?? [];
    await syncInvoiceSnapshot();
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

    // 处理银行信息的默认值逻辑
    const processedBankList = processBankDefault(bankList.value);

    if (props.invoiceId) {
      // 编辑模式
      return {
        id: props.invoiceId,
        clientId: props.clientId,
        header: formData.header,
        taxNum: formData.taxNum,
        address: formData.address,
        tel: formData.tel,
        mobile: formData.mobile,
        require: formData.require, // 添加require字段
        isDefault: formData.isDefault ?? false,
        sortId: formData.sortId ?? 0,
        clientInvoiceBanks: processedBankList,
      } as ClientInvoiceInfoAdminApi.ClientInvoiceInfoEditDto;
    } else {
      // 新增模式
      return {
        clientId: props.clientId,
        header: formData.header,
        taxNum: formData.taxNum,
        address: formData.address,
        tel: formData.tel,
        mobile: formData.mobile,
        require: formData.require, // 添加require字段
        isDefault: formData.isDefault ?? false,
        sortId: formData.sortId ?? 0,
        clientInvoiceBanks: processedBankList,
      } as ClientInvoiceInfoAdminApi.ClientInvoiceInfoAddDto;
    }
  } catch (error) {
    console.error('获取表单数据失败:', error);
    return null;
  }
};

/**
 * 处理银行信息的默认值逻辑
 * 规则：一个币别只维护了一条银行信息时，自动置为默认
 */
const processBankDefault = (
  banks: ClientInvoiceInfoAdminApi.ClientInvoiceBankAddOrEditDto[],
): ClientInvoiceInfoAdminApi.ClientInvoiceBankAddOrEditDto[] => {
  if (!banks || banks.length === 0) return banks;

  // 按币别分组统计
  const currencyGroups = new Map<number, number[]>();
  banks.forEach((bank, index) => {
    const currencyId = bank.currencyId;
    if (currencyId && currencyId > 0) {
      if (!currencyGroups.has(currencyId)) {
        currencyGroups.set(currencyId, []);
      }
      currencyGroups.get(currencyId)?.push(index);
    }
  });

  // 如果某个币别只有一条银行信息，自动设为默认
  const result = banks.map((bank, index) => {
    const updatedBank = { ...bank };
    const currencyId = bank.currencyId;

    if (currencyId && currencyId > 0) {
      const groupIndices = currencyGroups.get(currencyId);
      if (
        groupIndices &&
        groupIndices.length === 1 &&
        groupIndices[0] === index
      ) {
        // 该币别只有一条记录，自动设为默认
        updatedBank.isDefault = true;
      }
    }

    return updatedBank;
  });

  return result;
};

// 监听 invoiceId 变化，重新加载数据
watch(
  () => props.invoiceId,
  async () => {
    try {
      await loadDetail();
    } finally {
      resolveReady?.();
    }
  },
  { immediate: true },
);

// 暴露方法给父组件
const invoiceSnapshot = ref<null | string>(null);

async function buildInvoiceSnapshot() {
  const formData = await invoiceFormApi.getValues();
  return JSON.stringify({
    banks: bankList.value,
    formData,
  });
}

async function syncInvoiceSnapshot() {
  invoiceSnapshot.value = await buildInvoiceSnapshot();
}

async function isInvoiceFormDirty() {
  if (!invoiceSnapshot.value) return false;
  return (await buildInvoiceSnapshot()) !== invoiceSnapshot.value;
}

/**
 * 将 Gemini 开票信息识别结果回填到当前表单（不覆盖 isDefault / sortId）
 * @returns 是否存在未匹配币别（currencyId === -1）的银行行
 */
async function applyAiResult(
  dto: GeminiClientInvoiceInfoDto,
): Promise<boolean> {
  const current = await invoiceFormApi.getValues();
  await invoiceFormApi.setValues({
    ...current,
    header: dto.header ?? current.header ?? '',
    taxNum: dto.taxNum ?? current.taxNum ?? '',
    address: dto.address ?? current.address ?? '',
    tel: dto.tel ?? current.tel ?? '',
    mobile: dto.mobile ?? current.mobile ?? '',
    require: dto.require ?? current.require ?? '',
  });

  formData.value = {
    header: dto.header ?? formData.value?.header,
    taxNum: dto.taxNum ?? formData.value?.taxNum,
    address: dto.address ?? formData.value?.address,
    tel: dto.tel ?? formData.value?.tel,
    mobile: dto.mobile ?? formData.value?.mobile,
    require: dto.require ?? formData.value?.require,
    isDefault: formData.value?.isDefault,
  };

  let hasUnmatchedCurrency = false;
  const banks = Array.isArray(dto.clientInvoiceBanks)
    ? dto.clientInvoiceBanks
    : [];
  bankList.value = banks.map((bank, index) => {
    const rawId = bank.currencyId;
    const currencyIdNum =
      rawId === undefined || rawId === null || rawId === ''
        ? undefined
        : Number(rawId);
    const unmatched =
      currencyIdNum === undefined ||
      Number.isNaN(currencyIdNum) ||
      currencyIdNum < 0;
    if (unmatched) {
      hasUnmatchedCurrency = true;
    }
    return {
      _rowKey: `ai_bank_${Date.now()}_${index}`,
      clientInvoiceInfoId: props.invoiceId || '',
      bankName: bank.bankName ?? undefined,
      bankAccount: bank.bankAccount ?? undefined,
      accountName: bank.accountName ?? dto.header ?? undefined,
      currencyId: unmatched ? (undefined as unknown as number) : currencyIdNum,
      currencyCode: bank.currencyCode ?? bank.currency?.code ?? undefined,
      swiftCode: bank.swiftCode ?? undefined,
      isDefault: bank.isDefault ?? false,
      sortId: bank.sortId ?? banks.length - index,
      _currencyUnmatched: unmatched,
    } as ClientInvoiceInfoAdminApi.ClientInvoiceBankAddOrEditDto & {
      _rowKey?: string;
      currencyCode?: string;
      _currencyUnmatched?: boolean;
    };
  });

  await syncInvoiceSnapshot();
  return hasUnmatchedCurrency;
}

defineExpose({
  getFormData,
  isInvoiceFormDirty,
  applyAiResult,
  /** 首次详情/默认值加载完成 */
  whenReady: () => readyPromise,
  // 保存成功后由父组件调用，重新记录干净快照，避免未保存守卫误判为脏
  syncSnapshot: syncInvoiceSnapshot,
  resetForm: () => {
    invoiceFormApi.resetForm();
    bankList.value = [];
    clientDetail.value = null;
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
      <BankTable
        v-model="bankList"
        :client-invoice-info-id="invoiceId"
        :invoice-header="formData?.header || ''"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.invoice-form {
  padding: 8px;
}
</style>
