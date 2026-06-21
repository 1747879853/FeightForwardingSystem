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
import {
  avatarUrlToFormValue,
  normalizeAvatarSubmitValue,
} from '../avatar-utils';

const emits = defineEmits(['success']);

const formData = ref<SystemUserAdminApi.SystemUser>();

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const id = ref<number>();

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();

    const submitData: SystemUserAdminApi.UserInAdminInputDto = {
      userName: values.userName,
      nickName: values.nickName,
      emailAddress: values.emailAddress,
      phoneNumber: values.phoneNumber,
      isActive: values.isActive,
      status: values.status,
      roleIds: values.roleIds,
      avatar: normalizeAvatarSubmitValue(values.avatar, formData.value?.avatar),
      organizationId: values.organizationId,
      userAttribute: combineUserAttribute(values.userAttributeFlags ?? []),
      enName: values.enName || undefined,
      qq: values.qq || undefined,
      employeeID: values.employeeID || undefined,
      gender: values.gender ?? null,
      enable: values.enable,
      idNumber: values.idNumber || undefined,
      remark: values.remark || undefined,
      emailPwd: values.emailPwd || undefined,
      receiveAddrPort: values.receiveAddrPort || undefined,
      sendAddrPort: values.sendAddrPort || undefined,
      officeTel: values.officeTel || undefined,
      senderDisplayName: values.senderDisplayName || undefined,
    };

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
            avatar: avatarUrlToFormValue(userDetail.avatar),
            organizationId: (userDetail as any).organizationId,
            userAttributeFlags: parseUserAttribute(userDetail.userAttribute),
            enName: userDetail.enName,
            qq: userDetail.qq,
            employeeID: userDetail.employeeID,
            gender:
              userDetail.gender === 1 || userDetail.gender === 2
                ? userDetail.gender
                : undefined,
            enable: userDetail.enable ?? true,
            idNumber: userDetail.idNumber,
            remark: userDetail.remark,
            emailPwd: userDetail.emailPwd,
            receiveAddrPort: userDetail.receiveAddrPort,
            sendAddrPort: userDetail.sendAddrPort,
            officeTel: userDetail.officeTel,
            senderDisplayName: userDetail.senderDisplayName,
          });

          if (data.focusRoles) {
            // 可以通过 formApi 实现聚焦逻辑
          }
        } catch (error) {
          console.error('获取用户详情失败:', error);
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
            avatar: avatarUrlToFormValue(data.avatar),
            organizationId: (data as any).organizationId,
            userAttributeFlags: parseUserAttribute(data.userAttribute),
            enName: data.enName,
            qq: data.qq,
            employeeID: data.employeeID,
            gender:
              data.gender === 1 || data.gender === 2 ? data.gender : undefined,
            enable: data.enable ?? true,
            idNumber: data.idNumber,
            remark: data.remark,
            emailPwd: data.emailPwd,
            receiveAddrPort: data.receiveAddrPort,
            sendAddrPort: data.sendAddrPort,
            officeTel: data.officeTel,
            senderDisplayName: data.senderDisplayName,
          });
        }
      } else {
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
  <Modal :title="getModalTitle" class="w-[800px]">
    <Form class="mx-4" />
  </Modal>
</template>
