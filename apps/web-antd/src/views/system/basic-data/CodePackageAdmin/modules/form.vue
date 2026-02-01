<script lang="ts" setup>
import type { CodePackageAdminApi } from '#/api/system/base-data/code-package-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCodePackage,
  editCodePackage,
  getCodePackageDetail,
} from '#/api/system/base-data/code-package-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CodePackageAdminApi.CodePackageDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.codePackage.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.codePackage.name')]);
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
        await editCodePackage({
          id: formData.value.id,
          name: values.name,
          description: values.description,
          afrCode: values.afrCode,
          ediCode: values.ediCode,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addCodePackage({
          name: values.name,
          description: values.description,
          afrCode: values.afrCode,
          ediCode: values.ediCode,
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
        const detail = await getCodePackageDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          name: detail.name,
          description: detail.description,
          afrCode: detail.afrCode,
          ediCode: detail.ediCode,
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
