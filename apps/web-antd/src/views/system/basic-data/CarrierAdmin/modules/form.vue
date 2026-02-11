<script lang="ts" setup>
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCarrier,
  editCarrier,
  getCarrierDetail,
} from '#/api/system/base-data/carrier-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CarrierAdminApi.CarrierDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.carrier.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.carrier.name')]);
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
        await editCarrier({
          id: formData.value.id,
          cnName: values.cnName,
          cnShortName: values.cnShortName,
          enName: values.enName,
          code: values.code,
          otherCode: values.otherCode,
          countryId: values.countryId,
          ediCode: values.ediCode,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addCarrier({
          cnName: values.cnName,
          cnShortName: values.cnShortName,
          enName: values.enName,
          code: values.code,
          otherCode: values.otherCode,
          countryId: values.countryId,
          ediCode: values.ediCode,
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
        const detail = await getCarrierDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          cnName: detail.cnName,
          cnShortName: detail.cnShortName,
          enName: detail.enName,
          code: detail.code,
          otherCode: detail.otherCode,
          countryId: detail.countryId,
          ediCode: detail.ediCode,
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
