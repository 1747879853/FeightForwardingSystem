<script lang="ts" setup>
import type { PortCodeAdminApi } from '#/api/system/base-data/port-code-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addPortCode,
  editPortCode,
  getPortCodeDetail,
} from '#/api/system/base-data/port-code-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<PortCodeAdminApi.PortCodeDto>();

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.portCode.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.portCode.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        await editPortCode({
          id: formData.value.id,
          portName: values.portName,
          cnName: values.cnName,
          chau: values.chau,
          explain: values.explain,
          portType: values.portType,
          countryId: values.countryId,
          laneId: values.laneId,
          ediCode: values.ediCode,
          statisticalArea: values.statisticalArea,
          status: values.status,
        });
      } else {
        await addPortCode({
          portName: values.portName,
          cnName: values.cnName,
          chau: values.chau,
          explain: values.explain,
          portType: values.portType,
          countryId: values.countryId,
          laneId: values.laneId,
          ediCode: values.ediCode,
          statisticalArea: values.statisticalArea,
          status: values.status,
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
    if (!isOpen) return;

    const data = modalApi.getData<{ id?: number }>();
    if (!data?.id) {
      formData.value = undefined;
      formApi.resetForm();
      return;
    }

    modalApi.lock();
    try {
      const detail = await getPortCodeDetail(data.id);
      formData.value = detail;
      formApi.setValues({
        portName: detail.portName,
        cnName: detail.cnName,
        chau: detail.chau,
        explain: detail.explain,
        portType: detail.portType,
        countryId: detail.countryId,
        laneId: detail.laneId,
        ediCode: detail.ediCode,
        statisticalArea: detail.statisticalArea,
        status: detail.status,
      });
    } finally {
      modalApi.lock(false);
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="mx-4" />
  </Modal>
</template>
