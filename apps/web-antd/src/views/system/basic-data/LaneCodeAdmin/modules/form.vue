<script lang="ts" setup>
import type { LaneCodeAdminApi } from '#/api/system/base-data/lane-code-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addLaneCode,
  editLaneCode,
  getLaneCodeDetail,
} from '#/api/system/base-data/lane-code-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<LaneCodeAdminApi.LaneCodeDto>();

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.laneCode.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.laneCode.name')]);
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
        await editLaneCode({
          id: formData.value.id,
          code: values.code,
          laneName: values.laneName,
          laneEnName: values.laneEnName,
          ediCode: values.ediCode,
          status: values.status,
        });
      } else {
        await addLaneCode({
          code: values.code,
          laneName: values.laneName,
          laneEnName: values.laneEnName,
          ediCode: values.ediCode,
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
      const detail = await getLaneCodeDetail(data.id);
      formData.value = detail;
      formApi.setValues({
        code: detail.code,
        laneName: detail.laneName,
        laneEnName: detail.laneEnName,
        ediCode: detail.ediCode,
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
