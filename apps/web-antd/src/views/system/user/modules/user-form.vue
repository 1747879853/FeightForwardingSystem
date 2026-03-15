<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createOrUpdateUser, getUserForEdit } from '#/api/system/user-admin';
import { $t } from '#/locales';

import {
  combineUserAttribute,
  parseUserAttribute,
  useFormSchema,
} from '../data';

const emits = defineEmits(['success']);

const formData = ref<SystemUserAdminApi.SystemUser>();

const [Form, formApi] = useVbenForm({
  commonConfig: {
    // 所有表单项
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const id = ref<number>();

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();

    // 构建符合API要求的数据结构
    const submitData: SystemUserAdminApi.UserInAdminInputDto = {
      userName: values.userName,
      nickName: values.nickName,
      emailAddress: values.emailAddress,
      phoneNumber: values.phoneNumber,
      isActive: values.isActive,
      status: values.status,
      roleIds: values.roleIds,
      avatar: values.avatar,
      organizationId: values.organizationId,
      userAttribute: combineUserAttribute(values.userAttributeFlags ?? []),
    };

    // 新增时需要密码
    if (!id.value && values.password) {
      submitData.password = values.password;
    }

    if (id.value) {
      submitData.id = id.value;
    }

    modalApi.lock();
    createOrUpdateUser(submitData)
      .then(() => {
        message.success($t('ui.actionMessage.operationSuccess'));
        emits('success');
        modalApi.close();
      })
      .catch(() => {
        modalApi.unlock();
      });
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<
        SystemUserAdminApi.SystemUser & { focusRoles?: boolean }
      >();
      formApi.resetForm();

      if (data?.id) {
        // 编辑模式：从接口获取完整数据
        id.value = data.id;
        try {
          const userDetail = await getUserForEdit(data.id);
          formData.value = { ...data, ...userDetail };

          await nextTick();
          formApi.setValues({
            id: userDetail.id,
            userName: userDetail.userName,
            nickName: userDetail.nickName,
            emailAddress: userDetail.emailAddress,
            phoneNumber: userDetail.phoneNumber,
            isActive: userDetail.isActive,
            status: userDetail.status,
            avatar: userDetail.avatar,
            organizationId: (userDetail as any).organizationId,
            userAttributeFlags: parseUserAttribute(userDetail.userAttribute),
          });

          // 如果是从"分配角色"进入，聚焦到角色字段
          if (data.focusRoles) {
            // 可以通过 formApi 实现聚焦逻辑
          }
        } catch (error) {
          console.error('获取用户详情失败:', error);
          // 如果接口失败，使用列表数据作为降级方案
          formData.value = data;
          await nextTick();
          formApi.setValues({
            id: data.id,
            userName: data.userName,
            nickName: data.nickName,
            emailAddress: data.emailAddress,
            phoneNumber: data.phoneNumber,
            isActive: data.isActive,
            status: data.status,
            avatar: data.avatar,
            organizationId: (data as any).organizationId,
            userAttributeFlags: parseUserAttribute(data.userAttribute),
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
    ? $t('common.edit') + $t('system.user.name')
    : $t('common.create') + $t('system.user.name');
});
</script>

<template>
  <Modal :title="getModalTitle">
    <Form class="mx-4" />
  </Modal>
</template>
