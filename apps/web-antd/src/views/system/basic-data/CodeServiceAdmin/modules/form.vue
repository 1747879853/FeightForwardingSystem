<script lang="ts" setup>
import type { CodeServiceAdminApi } from '#/api/system/base-data/code-service-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCodeService,
  editCodeService,
  getCodeServiceDetail,
} from '#/api/system/base-data/code-service-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CodeServiceAdminApi.CodeServiceDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.codeService.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.codeService.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const handleReset = () => {
  formApi.resetForm();
  if (formData.value?.id) {
    formApi.setValues(formData.value);
  }
};

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
        await editCodeService({
          id: formData.value.id,
          cnName: values.cnName,
          enName: values.enName,
          ediCode: values.ediCode,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addCodeService({
          cnName: values.cnName,
          enName: values.enName,
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
        const detail = await getCodeServiceDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          cnName: detail.cnName,
          enName: detail.enName,
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
    <template #prepend-footer>
      <div class="flex-auto">
        <Button type="primary" danger @click="handleReset">
          {{ $t('common.reset') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
