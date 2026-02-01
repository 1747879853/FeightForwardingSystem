<script lang="ts" setup>
import type { CodeSourceAdminApi } from '#/api/system/base-data/code-source-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCodeSource,
  editCodeSource,
  getCodeSourceDetail,
} from '#/api/system/base-data/code-source-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CodeSourceAdminApi.CodeSourceDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.codeSource.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.codeSource.name')]);
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
        await editCodeSource({
          id: formData.value.id,
          code: values.code,
          cnName: values.cnName,
          enName: values.enName,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addCodeSource({
          code: values.code,
          cnName: values.cnName,
          enName: values.enName,
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
        const detail = await getCodeSourceDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          code: detail.code,
          cnName: detail.cnName,
          enName: detail.enName,
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
