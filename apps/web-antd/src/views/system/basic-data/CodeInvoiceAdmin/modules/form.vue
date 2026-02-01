<script lang="ts" setup>
import type { CodeInvoiceAdminApi } from '#/api/system/base-data/code-invoice-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCodeInvoice,
  editCodeInvoice,
  getCodeInvoiceDetail,
} from '#/api/system/base-data/code-invoice-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CodeInvoiceAdminApi.CodeInvoiceDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.codeInvoice.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.codeInvoice.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const handleReset = () => {
  formApi.resetForm();
  if (formData.value?.id) {
    formApi.setValues(formData.value);
  }
};

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        // 编辑模式
        await editCodeInvoice({
          id: formData.value.id,
          code: values.code,
          name: values.name,
          taxCategory: values.taxCategory,
          taxRate: values.taxRate,
          zeroTaxRateEnum: values.zeroTaxRateEnum,
          taxClassificationCode: values.taxClassificationCode,
          taxClassificationName: values.taxClassificationName,
          isIncludingTax: values.isIncludingTax,
          hasPreferentialPolicy: values.hasPreferentialPolicy,
          preferentialPolicyDescription: values.preferentialPolicyDescription,
          isDefault: values.isDefault,
          defaultCurrency: values.defaultCurrency,
          specification: values.specification,
          unit: values.unit,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addCodeInvoice({
          code: values.code,
          name: values.name,
          taxCategory: values.taxCategory,
          taxRate: values.taxRate,
          zeroTaxRateEnum: values.zeroTaxRateEnum,
          taxClassificationCode: values.taxClassificationCode,
          taxClassificationName: values.taxClassificationName,
          isIncludingTax: values.isIncludingTax,
          hasPreferentialPolicy: values.hasPreferentialPolicy,
          preferentialPolicyDescription: values.preferentialPolicyDescription,
          isDefault: values.isDefault,
          defaultCurrency: values.defaultCurrency,
          specification: values.specification,
          unit: values.unit,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      modalApi.close();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    const data = modalApi.getData<{ id?: number }>();
    if (data?.id) {
      // 编辑模式 - 加载详情
      modalApi.lock();
      try {
        const detail = await getCodeInvoiceDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          code: detail.code,
          name: detail.name,
          taxCategory: detail.taxCategory,
          taxRate: detail.taxRate,
          zeroTaxRateEnum: detail.zeroTaxRateEnum,
          taxClassificationCode: detail.taxClassificationCode,
          taxClassificationName: detail.taxClassificationName,
          isIncludingTax: detail.isIncludingTax,
          hasPreferentialPolicy: detail.hasPreferentialPolicy,
          preferentialPolicyDescription: detail.preferentialPolicyDescription,
          isDefault: detail.isDefault,
          defaultCurrency: detail.defaultCurrency,
          specification: detail.specification,
          unit: detail.unit,
          enable: detail.enable,
          sortId: detail.sortId,
          remark: detail.remark,
        });
      } finally {
        modalApi.lock(false);
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
  <Modal :title="getTitle">
    <Form class="mx-4" />
    <template #prepend-footer>
      <div class="flex-auto">
        <Button type="primary" danger @click="handleReset">
          {{ $t('common.reset') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
