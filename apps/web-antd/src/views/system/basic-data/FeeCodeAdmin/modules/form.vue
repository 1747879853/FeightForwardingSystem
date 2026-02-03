<script lang="ts" setup>
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addFeeCode,
  editFeeCode,
  getFeeCodeDetail,
} from '#/api/system/base-data/fee-code-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<FeeCodeAdminApi.FeeCodeDto>();

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.feeCode.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.feeCode.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    drawerApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        // 编辑模式
        await editFeeCode({
          id: formData.value.id,
          code: values.code,
          cnName: values.cnName,
          enName: values.enName,
          currencyId: values.currencyId,
          defaultUnit: values.defaultUnit,
          defaultUnitName: values.defaultUnitName,
          defaultDebit: values.defaultDebit,
          defaultDebitName: values.defaultDebitName,
          defaultCredit: values.defaultCredit,
          defaultCreditName: values.defaultCreditName,
          isSea: values.isSea,
          isAir: values.isAir,
          isTrucking: values.isTrucking,
          isTruckingFixed: values.isTruckingFixed,
          isWms: values.isWms,
          isAdvancedPay: values.isAdvancedPay,
          isConfidential: values.isConfidential,
          isInvoiceProhibit: values.isInvoiceProhibit,
          taxRate: values.taxRate,
          feeGroup: values.feeGroup,
          feeFrt: values.feeFrt,
          goodName: values.goodName,
          checkingType: values.checkingType,
          defaultCurrency: values.defaultCurrency,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addFeeCode({
          code: values.code,
          cnName: values.cnName,
          enName: values.enName,
          currencyId: values.currencyId,
          defaultUnit: values.defaultUnit,
          defaultUnitName: values.defaultUnitName,
          defaultDebit: values.defaultDebit,
          defaultDebitName: values.defaultDebitName,
          defaultCredit: values.defaultCredit,
          defaultCreditName: values.defaultCreditName,
          isSea: values.isSea,
          isAir: values.isAir,
          isTrucking: values.isTrucking,
          isTruckingFixed: values.isTruckingFixed,
          isWms: values.isWms,
          isAdvancedPay: values.isAdvancedPay,
          isConfidential: values.isConfidential,
          isInvoiceProhibit: values.isInvoiceProhibit,
          taxRate: values.taxRate,
          feeGroup: values.feeGroup,
          feeFrt: values.feeFrt,
          goodName: values.goodName,
          checkingType: values.checkingType,
          defaultCurrency: values.defaultCurrency,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      drawerApi.close();
      emit('success');
    } finally {
      drawerApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    const data = drawerApi.getData<{ id?: number }>();
    if (data?.id) {
      // 编辑模式 - 加载详情
      drawerApi.lock();
      try {
        const detail = await getFeeCodeDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          code: detail.code,
          cnName: detail.cnName,
          enName: detail.enName,
          currencyId: detail.currencyId,
          defaultUnit: detail.defaultUnit,
          defaultUnitName: detail.defaultUnitName,
          defaultDebit: detail.defaultDebit,
          defaultDebitName: detail.defaultDebitName,
          defaultCredit: detail.defaultCredit,
          defaultCreditName: detail.defaultCreditName,
          isSea: detail.isSea,
          isAir: detail.isAir,
          isTrucking: detail.isTrucking,
          isTruckingFixed: detail.isTruckingFixed,
          isWms: detail.isWms,
          isAdvancedPay: detail.isAdvancedPay,
          isConfidential: detail.isConfidential,
          isInvoiceProhibit: detail.isInvoiceProhibit,
          taxRate: detail.taxRate,
          feeGroup: detail.feeGroup,
          feeFrt: detail.feeFrt,
          goodName: detail.goodName,
          checkingType: detail.checkingType,
          defaultCurrency: detail.defaultCurrency,
          enable: detail.enable,
          sortId: detail.sortId,
          remark: detail.remark,
        });
      } finally {
        drawerApi.lock(false);
      }
    } else {
      // 新增模式
      formData.value = undefined;
      formApi.resetForm();
    }
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="mx-4" />
  </Drawer>
</template>
