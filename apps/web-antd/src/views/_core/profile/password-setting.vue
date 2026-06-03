<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, ref } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { changeMyPasswordApi } from '#/api';

const profilePasswordSettingRef = ref();
const submitting = ref(false);

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'newPassword',
      label: '新密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请输入新密码',
      },
      rules: z
        .string({ required_error: '请输入新密码' })
        .min(1, { message: '请输入新密码' })
        .max(32, { message: '密码长度不能超过32位' }),
    },
    {
      fieldName: 'confirmPassword',
      label: '确认密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请再次输入新密码',
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({ required_error: '请再次输入新密码' })
            .min(1, { message: '请再次输入新密码' })
            .refine((value) => value === newPassword, {
              message: '两次输入的密码不一致',
            });
        },
        triggerFields: ['newPassword'],
      },
    },
  ];
});

async function handleSubmit(value: Recordable<any>) {
  submitting.value = true;
  try {
    await changeMyPasswordApi({
      password: value.newPassword,
      confirmPassword: value.confirmPassword,
    });
    message.success('密码修改成功');
    profilePasswordSettingRef.value?.getFormApi?.()?.resetForm();
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <ProfilePasswordSetting
    ref="profilePasswordSettingRef"
    class="w-1/3"
    :loading="submitting"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
