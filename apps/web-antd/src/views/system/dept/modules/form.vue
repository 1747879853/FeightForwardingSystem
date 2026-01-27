<script lang="ts" setup>
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createOrganizationUnit,
  moveOrganizationUnit,
  updateOrganizationUnit,
} from '#/api/system/organization-unit';
import { $t } from '#/locales';

import { useSchema } from '../data';

const emit = defineEmits(['success']);
const formData = ref<SystemOrganizationUnitApi.OrganizationUnitTreeDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.dept.name')])
    : $t('ui.actionTitle.create', [$t('system.dept.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useSchema(),
  showDefaultActions: false,
});

function resetForm() {
  formApi.resetForm();
  formApi.setValues(formData.value || {});
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (valid) {
      modalApi.lock();
      const values = await formApi.getValues();
      try {
        if (formData.value?.id) {
          // 编辑模式
          // 1. 更新 displayName
          await updateOrganizationUnit({
            id: formData.value.id,
            displayName: values.displayName,
          });
          // 2. 如果 parentId 变化，则移动
          if (values.parentId !== formData.value.parentId) {
            await moveOrganizationUnit({
              id: formData.value.id,
              newParentId: values.parentId ?? null,
            });
          }
        } else {
          // 新增模式
          await createOrganizationUnit({
            displayName: values.displayName,
            parentId: values.parentId ?? null,
          });
        }
        message.success($t('ui.actionMessage.operationSuccess'));
        modalApi.close();
        emit('success');
      } finally {
        modalApi.lock(false);
      }
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data =
        modalApi.getData<SystemOrganizationUnitApi.OrganizationUnitTreeDto>();
      if (data) {
        formData.value = data;
        formApi.setValues({
          displayName: data.displayName,
          parentId: data.parentId ?? undefined,
        });
      } else {
        formData.value = undefined;
        formApi.resetForm();
      }
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="mx-4" />
    <template #prepend-footer>
      <div class="flex-auto">
        <Button type="primary" danger @click="resetForm">
          {{ $t('common.reset') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
