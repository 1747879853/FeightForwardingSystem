<script lang="ts" setup>
import type { ExchangeRateAdminApi } from '#/api/system/base-data/exchange-rate-admin';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addExchangeRate,
  editExchangeRate,
  getExchangeRateDetail,
} from '#/api/system/base-data/exchange-rate-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<ExchangeRateAdminApi.ExchangeRateDto>();

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.exchangeRate.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.exchangeRate.name')]);
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
        await editExchangeRate({
          id: formData.value.id,
          currencyId: values.currencyId,
          drValue: values.drValue,
          crValue: values.crValue,
          customValue: values.customValue,
          calculateValue: values.calculateValue,
          invoiceValue: values.invoiceValue,
          startDate: values.startDate,
          endDate: values.endDate,
          localCurrency: values.localCurrency,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addExchangeRate({
          currencyId: values.currencyId,
          drValue: values.drValue,
          crValue: values.crValue,
          customValue: values.customValue,
          calculateValue: values.calculateValue,
          invoiceValue: values.invoiceValue,
          startDate: values.startDate,
          endDate: values.endDate,
          localCurrency: values.localCurrency,
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
        const detail = await getExchangeRateDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          currencyId: detail.currencyId,
          drValue: detail.drValue,
          crValue: detail.crValue,
          customValue: detail.customValue,
          calculateValue: detail.calculateValue,
          invoiceValue: detail.invoiceValue,
          startDate: detail.startDate,
          endDate: detail.endDate,
          localCurrency: detail.localCurrency,
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
