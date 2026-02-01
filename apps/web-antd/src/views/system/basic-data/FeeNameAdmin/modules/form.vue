<script lang="ts" setup>
import type { FeeNameAdminApi } from '#/api/system/base-data/fee-name-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addFeeName,
  editFeeName,
  getFeeNameDetail,
} from '#/api/system/base-data/fee-name-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<FeeNameAdminApi.FeeNameDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.feeName.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.feeName.name')]);
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
        await editFeeName({
          id: formData.value.id,
          code: values.code,
          name: values.name,
          enName: values.enName,
          inOutType: values.inOutType,
          defaultCurrency: values.defaultCurrency,
          feeTypeStr: values.feeTypeStr,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addFeeName({
          code: values.code,
          name: values.name,
          enName: values.enName,
          inOutType: values.inOutType,
          defaultCurrency: values.defaultCurrency,
          feeTypeStr: values.feeTypeStr,
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
        const detail = await getFeeNameDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          code: detail.code,
          name: detail.name,
          enName: detail.enName,
          inOutType: detail.inOutType,
          defaultCurrency: detail.defaultCurrency,
          feeTypeStr: detail.feeTypeStr,
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
