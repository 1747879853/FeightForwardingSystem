<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createOrUpdateUser, getUserForEdit } from '#/api/system/user-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emits = defineEmits(['success']);

const formData = ref<SystemUserAdminApi.SystemUser>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const id = ref<number>();

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();

    // 构建符合API要求的数据结构
    const submitData: SystemUserAdminApi.UserInAdminInputDto = {
      userName: values.userName,
      nickName: values.nickName,
      email: values.email,
      phoneNumber: values.phoneNumber,
      isActive: values.isActive,
      roleIds: values.roleIds,
      avatar: values.avatar,
    };

    // 新增时需要密码
    if (!id.value && values.password) {
      submitData.password = values.password;
    }

    if (id.value) {
      submitData.id = id.value;
    }

    drawerApi.lock();
    createOrUpdateUser(submitData)
      .then(() => {
        emits('success');
        drawerApi.close();
      })
      .catch(() => {
        drawerApi.unlock();
      });
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<
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
            userName: userDetail.userName,
            nickName: userDetail.nickName,
            email: userDetail.email,
            phoneNumber: userDetail.phoneNumber,
            isActive: userDetail.isActive,
            roleIds: userDetail.roleIds,
            avatar: userDetail.avatar,
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
            userName: data.userName,
            nickName: data.nickName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            isActive: data.isActive,
            avatar: data.avatar,
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

const getDrawerTitle = computed(() => {
  return formData.value?.id
    ? $t('common.edit') + $t('system.user.name')
    : $t('common.create') + $t('system.user.name');
});
</script>

<template>
  <Drawer :title="getDrawerTitle">
    <Form />
  </Drawer>
</template>
