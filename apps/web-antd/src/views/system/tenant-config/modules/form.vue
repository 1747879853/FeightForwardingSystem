<script lang="ts" setup>
import type { TenantConfigApi } from '#/api/system/tenant-config';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addTenantConfig,
  editTenantConfig,
  getTenantConfigDetail,
} from '#/api/system/tenant-config';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const formData = ref<TenantConfigApi.TenantConfigDto>();
const isEdit = computed(() => Boolean(formData.value?.name));
const getTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('system.tenantConfig.name')])
    : $t('ui.actionTitle.create', [$t('system.tenantConfig.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

async function setNameDisabled(disabled: boolean) {
  await formApi.updateSchema([
    {
      fieldName: 'name',
      componentProps: { disabled },
    },
  ]);
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();
    const values = await formApi.getValues();
    const name = String(values.name ?? '').trim();
    const value =
      values.value === undefined || values.value === null
        ? null
        : String(values.value);

    try {
      if (isEdit.value) {
        await editTenantConfig({ name, value });
      } else {
        await addTenantConfig({ name, value });
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

    formApi.resetForm();
    formData.value = undefined;
    await setNameDisabled(false);

    const data = modalApi.getData<{ name?: string }>();
    if (!data?.name) {
      return;
    }

    modalApi.lock();
    try {
      const detail = await getTenantConfigDetail(data.name);
      if (!detail) {
        message.error($t('system.tenantConfig.notFound'));
        modalApi.close();
        return;
      }
      formData.value = detail;
      await setNameDisabled(true);
      await formApi.setValues({
        name: detail.name,
        value: detail.value ?? '',
      });
    } finally {
      modalApi.lock(false);
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[640px]">
    <Form class="mx-4 pb-5" />
  </Modal>
</template>
