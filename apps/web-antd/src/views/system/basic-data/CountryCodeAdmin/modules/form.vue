<script lang="ts" setup>
import type { CountryCodeAdminApi } from '#/api/system/base-data/country-code-admin';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCountryCode,
  editCountryCode,
  getCountryCodeDetail,
} from '#/api/system/base-data/country-code-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CountryCodeAdminApi.CountryCodeDto>();

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.countryCode.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.countryCode.name')]);
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
    if (!valid) return;

    drawerApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        await editCountryCode({
          id: formData.value.id,
          code: values.code,
          countryName: values.countryName,
          countryEnName: values.countryEnName,
          chau: values.chau,
          capital: values.capital,
          tariff: values.tariff,
          tonnageTax: values.tonnageTax,
          countryCode3: values.countryCode3,
          explain: values.explain,
          remark: values.remark,
          status: values.status,
        });
      } else {
        await addCountryCode({
          code: values.code,
          countryName: values.countryName,
          countryEnName: values.countryEnName,
          chau: values.chau,
          capital: values.capital,
          tariff: values.tariff,
          tonnageTax: values.tonnageTax,
          countryCode3: values.countryCode3,
          explain: values.explain,
          remark: values.remark,
          status: values.status,
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
    if (!isOpen) return;

    const data = drawerApi.getData<{ id?: number }>();
    if (!data?.id) {
      formData.value = undefined;
      formApi.resetForm();
      return;
    }

    drawerApi.lock();
    try {
      const detail = await getCountryCodeDetail(data.id);
      formData.value = detail;
      formApi.setValues({
        code: detail.code,
        countryName: detail.countryName,
        countryEnName: detail.countryEnName,
        chau: detail.chau,
        capital: detail.capital,
        tariff: detail.tariff,
        tonnageTax: detail.tonnageTax,
        countryCode3: detail.countryCode3,
        explain: detail.explain,
        remark: detail.remark,
        status: detail.status,
      });
    } finally {
      drawerApi.lock(false);
    }
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="mx-4" />
  </Drawer>
</template>
