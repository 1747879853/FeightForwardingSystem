<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, markRaw } from 'vue';

import { AuthenticationLogin, SliderCaptcha, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';
import {
  brandLoginTitleLogo,
  brandLoginTitleLogoClass,
} from '#/utils/brand-assets';
import { getBrandRememberMeStorageKey } from '#/utils/brand-storage';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

/** 开发模式跳过滑动验证，方便本地联调 */
const enableSliderCaptcha = !import.meta.env.DEV;

const formSchema = computed((): VbenFormSchema[] => {
  const schema: VbenFormSchema[] = [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];

  if (enableSliderCaptcha) {
    schema.push({
      component: markRaw(SliderCaptcha),
      fieldName: 'captcha',
      rules: z.boolean().refine((value) => value, {
        message: $t('authentication.verifyRequiredTip'),
      }),
    });
  }

  return schema;
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :title-logo="brandLoginTitleLogo"
    :title-logo-class="brandLoginTitleLogoClass"
    :remember-me-storage-key="getBrandRememberMeStorageKey()"
    sub-title="Freight Forwarding System"
    title="货代管理系统"
    @submit="authStore.authLogin"
  />
</template>
