<script lang="ts" setup>
import type { SystemRoleApi } from '#/api/system/role';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createRole, getRoleForEdit, updateRole } from '#/api/system/role';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emits = defineEmits(['success']);

const formData = ref<SystemRoleApi.SystemRole>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const id = ref();
const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();

    // 构建符合API要求的数据结构
    const submitData: SystemRoleApi.RoleInputDto = {
      name: values.name,
      displayName: values.displayName,
      isDefault: values.isDefault,
      description: values.description,
    };

    if (id.value) {
      submitData.id = id.value;
    }

    modalApi.lock();
    (id.value ? updateRole(id.value, submitData) : createRole(submitData))
      .then(() => {
        emits('success');
        modalApi.close();
      })
      .catch(() => {
        modalApi.unlock();
      });
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<SystemRoleApi.SystemRole>();
      formApi.resetForm();

      if (data?.id) {
        // 编辑模式：从接口获取完整数据
        id.value = data.id;
        try {
          const roleDetail = await getRoleForEdit(data.id);
          formData.value = { ...data, ...roleDetail };

          // Wait for Vue to flush DOM updates (form fields mounted)
          await nextTick();
          // 设置表单值，确保字段映射正确
          formApi.setValues({
            name: roleDetail.name,
            displayName: roleDetail.displayName,
            isDefault: roleDetail.isDefault ?? false,
            description: roleDetail.description,
          });
        } catch (error) {
          console.error('获取角色详情失败:', error);
          // 如果接口失败，使用列表数据作为降级方案
          formData.value = data;
          await nextTick();
          formApi.setValues({
            name: data.name,
            displayName: data.displayName,
            isDefault: data.isDefault ?? false,
            description: data.description,
          });
        }
      } else {
        // 新增模式
        id.value = undefined;
        formData.value = undefined;
      }
    }
  },
});

const getModalTitle = computed(() => {
  return formData.value?.id
    ? $t('common.edit', $t('system.role.name'))
    : $t('common.create', $t('system.role.name'));
});
</script>
<template>
  <Modal :title="getModalTitle">
    <Form class="mx-4"> </Form>
  </Modal>
</template>
<style lang="css" scoped>
:deep(.ant-tree-title) {
  .tree-actions {
    display: none;
    margin-left: 20px;
  }
}

:deep(.ant-tree-title:hover) {
  .tree-actions {
    display: flex;
    flex: auto;
    justify-content: flex-end;
    margin-left: 20px;
  }
}
</style>
