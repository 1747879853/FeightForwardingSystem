<script lang="ts" setup>
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCurrency,
  editCurrency,
  getCurrencyDetail,
} from '#/api/system/base-data/currency-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CurrencyAdminApi.CurrencyDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.currency.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.currency.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

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
        await editCurrency({
          id: formData.value.id,
          code: values.code,
          cnName: values.cnName,
          enName: values.enName,
          description: values.description,
          financeSoftCode: values.financeSoftCode,
          defaultRate: values.defaultRate,
          alias: values.alias,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addCurrency({
          code: values.code,
          cnName: values.cnName,
          enName: values.enName,
          description: values.description,
          financeSoftCode: values.financeSoftCode,
          defaultRate: values.defaultRate,
          alias: values.alias,
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
        const detail = await getCurrencyDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          code: detail.code,
          cnName: detail.cnName,
          enName: detail.enName,
          description: detail.description,
          financeSoftCode: detail.financeSoftCode,
          defaultRate: detail.defaultRate,
          alias: detail.alias,
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
  </Modal>
</template>
