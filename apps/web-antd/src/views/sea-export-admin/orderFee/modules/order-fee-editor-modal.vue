<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { computed, ref, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';
import * as feeConstants from '../data';
import { getCurrencyEnumOptions, getCurrencyEnumSymbolOptions } from '../data';

// 定义Props
const props = defineProps<{
  recAmountMap: Record<string, any>;
  payAmountMap: Record<string, any>;
  feeCodeList?: any[];
}>();

// 定义Emits
const emit = defineEmits(['confirm']);

// 当前编辑的费用数据
const currentFeeData = ref<OrderFeeAdminApi.OrderFeeDto | null>(null);
const originalFeeData = ref<OrderFeeAdminApi.OrderFeeDto | null>(null);

// 表单API
const [OrderFeeForm, orderFeeFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useOrderFeeFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-3',
});

// 模态框
const [Modal, modalApi] = useVbenModal({
  class: 'w-[1400px]',
  onConfirm: async () => {
    const formValues = await orderFeeFormApi.getValues();
    console.log('表单提交数据:', formValues);

    // 计算更改后的金额
    const updatedFeeData = {
      ...currentFeeData.value,
      ...formValues,
    };

    emit('confirm', {
      originalData: originalFeeData.value,
      updatedData: updatedFeeData,
    });

    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const data = modalApi.getData<OrderFeeAdminApi.OrderFeeDto>();
      console.log('当前编辑的数据1:', data);
      if (data) {
        currentFeeData.value = { ...data };
        originalFeeData.value = { ...data };
        orderFeeFormApi.setValues(data);
      }
    } else {
      currentFeeData.value = null;
      originalFeeData.value = null;
    }
  },
});

// 暴露modalApi供父组件调用
defineExpose({
  modalApi,
});

// 处理表单值变化
const handleFieldChange = async (fieldName: string) => {
  const values = await orderFeeFormApi.getValues();
  if (!values) return;

  let unitPrice = Number(values.unitPrice) || 0;
  const quantity = Number(values.quantity) || 0;
  const taxRate = Number(values.taxRate) || 0;
  let amount = Number(values.amount) || 0;

  // 根据变化的字段进行不同的计算逻辑
  if (fieldName === 'amount') {
    // 当金额变化时，根据数量和金额反推单价
    if (quantity > 0) {
      unitPrice = amount / quantity;
      // 更新单价字段
      orderFeeFormApi.setFieldValue(
        'unitPrice',
        parseFloat(unitPrice.toFixed(2)),
      );
    }
  } else if (['unitPrice', 'quantity'].includes(fieldName)) {
    // 当单价或数量变化时，重新计算金额
    amount = unitPrice * quantity;
    orderFeeFormApi.setFieldValue('amount', parseFloat(amount.toFixed(2)));
  }

  // 计算不含税单价
  const noTaxUnitPrice =
    taxRate > 0 ? unitPrice / (1 + taxRate / 100) : unitPrice;

  // 计算不含税金额
  const noTaxAmount = noTaxUnitPrice * quantity;

  // 更新不含税相关字段
  orderFeeFormApi.setFieldValue(
    'noTaxUnitPrice',
    parseFloat(noTaxUnitPrice.toFixed(4)),
  );
  orderFeeFormApi.setFieldValue(
    'noTaxAmount',
    parseFloat(noTaxAmount.toFixed(2)),
  );

  // 同步更新 currentFeeData，触发计算属性重新计算
  if (currentFeeData.value) {
    currentFeeData.value = {
      ...currentFeeData.value,
      unitPrice,
      quantity,
      amount: parseFloat(amount.toFixed(2)),
      noTaxUnitPrice: parseFloat(noTaxUnitPrice.toFixed(4)),
      noTaxAmount: parseFloat(noTaxAmount.toFixed(2)),
    };
  }

  // 如果变化的是税率，单独处理
  if (fieldName === 'taxRate') {
    if (currentFeeData.value) {
      currentFeeData.value = {
        ...currentFeeData.value,
        taxRate,
      };
    }
  }
};

// 费用表单Schema - 与useOrderFeeColumns保持一致的可编辑字段
function useOrderFeeFormSchema() {
  return [
    {
      component: 'FeeCodeSelect',
      fieldName: 'feeCodeId',
      label: $t('seaExport.export.orderFee.feecodeName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'industryCategory',
      label: $t('seaExport.client.industryCategories'),
      componentProps: {
        options: feeConstants.getIndustryCategoryOptions(),
        style: { width: '100%' },
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'settlementId',
      label: $t('seaExport.export.orderFee.settlement'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'currencyId',
      label: $t('seaExport.export.orderFee.currency'),
      componentProps: {
        options: getCurrencyEnumOptions().filter((item) => item.value !== 9999),
        style: { width: '100%' },
      },
    },
    {
      component: 'ExchangeRateSelect',
      fieldName: 'exchangeRate',
      label: $t('seaExport.export.orderFee.ExchangeRate'),
      componentProps: {
        valueKey: originalFeeData.value?.paySide === 0 ? 'drValue' : 'crValue',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'unitPrice',
      label: $t('seaExport.export.orderFee.unitPrice'),
      componentProps: {
        min: 0,
        precision: 2,
        style: { width: '100%' },
        onChange: () => handleFieldChange('unitPrice'),
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'quantity',
      label: $t('seaExport.export.orderFee.quantity'),
      componentProps: {
        min: 0,
        precision: 2,
        style: { width: '100%' },
        onChange: () => handleFieldChange('quantity'),
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'amount',
      label: $t('seaExport.export.orderFee.amount'),
      componentProps: {
        min: 0,
        precision: 2,
        style: { width: '100%' },
        onChange: () => handleFieldChange('amount'),
      },
    },
    {
      component: 'Select',
      fieldName: 'unitEmum',
      label: $t('seaExport.export.orderFee.unitEmum'),
      componentProps: {
        options: feeConstants.getUnitEmumOptions(),
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'taxRate',
      label: $t('seaExport.export.orderFee.taxRate'),
      componentProps: {
        min: 0,
        max: 100,
        precision: 2,
        style: { width: '100%' },
        onChange: () => handleFieldChange('taxRate'),
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'noTaxUnitPrice',
      label: $t('seaExport.export.orderFee.noTaxUnitPrice'),
      componentProps: {
        min: 0,
        precision: 4,
        disabled: true,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'noTaxAmount',
      label: $t('seaExport.export.orderFee.noTaxAmount'),
      componentProps: {
        min: 0,
        precision: 2,
        disabled: true,
        style: { width: '100%' },
      },
    },

    {
      component: 'Switch',
      fieldName: 'canInvoice',
      label: $t('seaExport.export.orderFee.canInvoice'),
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
    },
    {
      component: 'Switch',
      fieldName: 'isConfidential',
      label: $t('seaExport.export.orderFee.isConfidential'),
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('seaExport.export.orderFee.remark'),
      componentProps: {
        rows: 3,
        maxlength: 200,
        showCount: true,
      },
    },
  ];
}

// 计算更改前的利润
const originalProfit = computed(() => {
  let totalRec = 0;
  let totalPay = 0;

  Object.values(props.recAmountMap).forEach((item: any) => {
    totalRec += (item.totalRecAmount || 0) * (item.exchangeRate || 1);
  });

  Object.values(props.payAmountMap).forEach((item: any) => {
    totalPay += (item.totalPayAmount || 0) * (item.exchangeRate || 1);
  });

  return totalRec - totalPay;
});

// 计算更改后的利润
const updatedProfit = computed(() => {
  console.log('currentFeeData', currentFeeData.value);

  if (!currentFeeData.value || !originalFeeData.value) {
    return originalProfit.value;
  }

  let totalRec = 0;
  let totalPay = 0;

  // 计算原有的应收应付总额
  Object.values(props.recAmountMap).forEach((item: any) => {
    totalRec += (item.totalRecAmount || 0) * (item.exchangeRate || 1);
  });

  Object.values(props.payAmountMap).forEach((item: any) => {
    totalPay += (item.totalPayAmount || 0) * (item.exchangeRate || 1);
  });

  // 获取原费用和更新后费用的金额差值
  const originalAmount = originalFeeData.value.amount || 0;
  const updatedAmount = currentFeeData.value.amount || 0;
  const amountDiff = updatedAmount - originalAmount;

  // 根据收付类型计算新利润
  if (originalFeeData.value.paySide === 0) {
    // 应收：加上差额
    return originalProfit.value + amountDiff;
  } else {
    // 应付：减去差额
    return originalProfit.value - amountDiff;
  }
});

// 利润变化
const profitChange = computed(() => {
  return updatedProfit.value - originalProfit.value;
});

// 格式化货币显示
const formatCurrency = (amount: number, currencyId: number = 1) => {
  const symbol =
    getCurrencyEnumSymbolOptions().find((item) => item.value === currencyId)
      ?.label || '￥';
  return `${symbol}${amount.toFixed(2)}`;
};
</script>

<template>
  <Modal :title="$t('seaExport.export.orderFee.editFee')" width="1400px">
    <div class="flex gap-4">
      <!-- 左侧区域 -->
      <div class="flex flex-1 flex-col gap-4">
        <!-- 左上：原费用数据展示 -->
        <div class="rounded border border-gray-200 p-4">
          <h3 class="mb-3 text-base font-semibold">
            {{ $t('seaExport.export.orderFee.originalFeeData') }}
          </h3>
          <div class="grid grid-cols-3 gap-3 text-sm">
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.feecodeName') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.feeCodeName || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.client.industryCategories') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getIndustryCategoryOptions()
                  .find(
                    (item) => item.value === originalFeeData?.industryCategory,
                  )?.label || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.settlement') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.settlementName || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.currency') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.currencyName || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.ExchangeRate') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.exchangeRate?.toFixed(4) || '1.0000'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.unitPrice') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.unitPrice?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.quantity') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.quantity?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.amount') }}:</span
              >
              <span class="font-medium text-blue-600">{{
                originalFeeData?.amount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.unitEmum') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getUnitEmumOptions()
                  .find((item) => item.value === originalFeeData?.unitEmum)
                  ?.label || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.taxRate') }}:</span
              >
              <span class="font-medium"
                >{{ originalFeeData?.taxRate?.toFixed(2) || '0.00' }}%</span
              >
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.noTaxUnitPrice') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.noTaxUnitPrice?.toFixed(4) || '0.0000'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.noTaxAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.noTaxAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.rqstPaymentAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.rqstPaymentAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.invoicedAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.invoicedAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.orderInvoiceAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.orderInvoiceAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.settledAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.settledAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.canInvoice') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.canInvoice ? '是' : '否'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.isConfidential') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.isConfidential ? '是' : '否'
              }}</span>
            </div>
            <div class="col-span-3 flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.remark') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.remark || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.feeStatus') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getFeeStatusOptions()
                  .find((item) => item.value === originalFeeData?.feeStatus)
                  ?.label || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.invoiceStatus') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getInvoiceStatusOptions()
                  .find((item) => item.value === originalFeeData?.invoiceStatus)
                  ?.label || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.dataEntryMethod') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getDataEntryMethodOptions()
                  .find(
                    (item) => item.value === originalFeeData?.dataEntryMethod,
                  )?.label || '--'
              }}</span>
            </div>
          </div>
        </div>

        <!-- 左下：费用编辑表单 -->
        <div class="flex-1 rounded border border-gray-200 p-4">
          <h3 class="mb-3 text-base font-semibold">
            {{ $t('seaExport.export.orderFee.editFeeInfo') }}
          </h3>
          <OrderFeeForm />
        </div>
      </div>

      <!-- 右侧：利润变化展示 -->
      <div class="w-80 rounded border border-gray-200 p-4">
        <h3 class="mb-3 text-base font-semibold">
          {{ $t('seaExport.export.orderFee.profitChange') }}
        </h3>
        <div class="space-y-4">
          <div class="rounded bg-gray-50 p-3">
            <div class="mb-1 text-sm text-gray-600">
              {{ $t('seaExport.export.orderFee.originalProfit') }}
            </div>
            <div class="text-lg font-semibold text-blue-600">
              {{ formatCurrency(originalProfit) }}
            </div>
          </div>

          <div class="rounded bg-gray-50 p-3">
            <div class="mb-1 text-sm text-gray-600">
              {{ $t('seaExport.export.orderFee.updatedProfit') }}
            </div>
            <div
              class="text-lg font-semibold"
              :class="updatedProfit >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ formatCurrency(updatedProfit) }}
            </div>
          </div>

          <div class="rounded bg-gray-50 p-3">
            <div class="mb-1 text-sm text-gray-600">
              {{ $t('seaExport.export.orderFee.profitDifference') }}
            </div>
            <div
              class="text-lg font-semibold"
              :class="profitChange >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ profitChange >= 0 ? '+' : ''
              }}{{ formatCurrency(profitChange) }}
            </div>
          </div>

          <div class="mt-4 rounded bg-blue-50 p-3 text-xs text-blue-700">
            <div class="mb-1 font-medium">💡 说明：</div>
            <div v-if="originalFeeData?.paySide === 0">
              • 应收费用：增加金额会提升利润，减少金额会降低利润
            </div>
            <div v-else>• 应付费用：增加金额会降低利润，减少金额会提升利润</div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
:deep(.ant-form-item) {
  margin-bottom: 12px;
}
</style>
