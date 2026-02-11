<script lang="ts" setup>
import type { CtnCodeAdminApi } from '#/api/system/base-data/ctn-code-admin';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCtnCode,
  editCtnCode,
  getCtnCodeDetail,
} from '#/api/system/base-data/ctn-code-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CtnCodeAdminApi.CtnCodeDto>();

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.ctnCode.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.ctnCode.name')]);
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
        await editCtnCode({
          id: formData.value.id,
          ctnSize: values.ctnSize,
          ctnType: values.ctnType,
          ctnName: values.ctnName,
          ediCode: values.ediCode,
          ctnWeight: values.ctnWeight,
          cnExplain: values.cnExplain,
          enExplain: values.enExplain,
          afrCode: values.afrCode,
          limitWeight: values.limitWeight,
          teu: values.teu,
          orderNo: values.orderNo,
          status: values.status,
          isDefault: values.isDefault,
          remark: values.remark,
        });
      } else {
        await addCtnCode({
          ctnSize: values.ctnSize,
          ctnType: values.ctnType,
          ctnName: values.ctnName,
          ediCode: values.ediCode,
          ctnWeight: values.ctnWeight,
          cnExplain: values.cnExplain,
          enExplain: values.enExplain,
          afrCode: values.afrCode,
          limitWeight: values.limitWeight,
          teu: values.teu,
          orderNo: values.orderNo,
          status: values.status,
          isDefault: values.isDefault,
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
    if (!isOpen) return;

    const data = drawerApi.getData<{ id?: number }>();
    if (!data?.id) {
      formData.value = undefined;
      formApi.resetForm();
      return;
    }

    drawerApi.lock();
    try {
      const detail = await getCtnCodeDetail(data.id);
      formData.value = detail;
      formApi.setValues({
        ctnSize: detail.ctnSize,
        ctnType: detail.ctnType,
        ctnName: detail.ctnName,
        ediCode: detail.ediCode,
        ctnWeight: detail.ctnWeight,
        cnExplain: detail.cnExplain,
        enExplain: detail.enExplain,
        afrCode: detail.afrCode,
        limitWeight: detail.limitWeight,
        teu: detail.teu,
        orderNo: detail.orderNo,
        status: detail.status,
        isDefault: detail.isDefault,
        remark: detail.remark,
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
