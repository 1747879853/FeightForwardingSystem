<script setup lang="ts">
import type { VbenFormSchema } from '@vben-core/form-ui';

import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { useVbenForm } from '@vben-core/form-ui';
import { VbenButton } from '@vben-core/shadcn-ui';

import Title from './auth-title.vue';

interface Props {
  formSchema: VbenFormSchema[];
  /**
   * @zh_CN 是否处于加载处理状态
   */
  loading?: boolean;
  /**
   * @zh_CN 登录路径
   */
  loginPath?: string;
  /**
   * @zh_CN 标题
   */
  title?: string;
  /**
   * @zh_CN 描述
   */
  subTitle?: string;
  /**
   * @zh_CN 按钮文本
   */
  submitButtonText?: string;
}

defineOptions({
  name: 'ForgetPassword',
});

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loginPath: '/auth/login',
  submitButtonText: '',
  subTitle: '',
  title: '',
});

const emit = defineEmits<{
  submit: [Record<string, any>];
}>();

const [Form, formApi] = useVbenForm(
  reactive({
    commonConfig: {
      hideLabel: true,
      hideRequiredMark: true,
    },
    schema: computed(() => props.formSchema),
    showDefaultActions: false,
  }),
);

const router = useRouter();

async function handleSubmit() {
  const { valid } = await formApi.validate();
  const values = await formApi.getValues();
  if (valid) {
    emit('submit', values);
  }
}

function goToLogin() {
  router.push(props.loginPath);
}

defineExpose({
  getFormApi: () => formApi,
});
</script>

<template>
  <div class="auth-forget-password-card">
    <Title>
      <slot name="title">
        {{ title || $t('authentication.forgetPassword') }} 🤦🏻‍♂️
      </slot>
      <template #desc>
        <slot name="subTitle">
          {{ subTitle || $t('authentication.forgetPasswordSubtitle') }}
        </slot>
      </template>
    </Title>
    <Form />

    <div>
      <VbenButton
        :class="{
          'cursor-wait': loading,
        }"
        aria-label="submit"
        class="auth-forget-password-submit mt-2 w-full"
        @click="handleSubmit"
      >
        <slot name="submitButtonText">
          {{ submitButtonText || $t('authentication.sendResetLink') }}
        </slot>
      </VbenButton>
      <VbenButton
        class="auth-forget-password-back mt-4 w-full"
        variant="outline"
        @click="goToLogin()"
      >
        {{ $t('common.back') }}
      </VbenButton>
    </div>
  </div>
</template>

<style scoped>
.auth-forget-password-card {
  width: 100%;
  color: rgb(255 255 255 / 96%);
}

.auth-forget-password-card :deep(h2) {
  color: rgb(255 255 255 / 96%);
  text-shadow: 0 4px 20px rgb(0 0 0 / 25%);
}

.auth-forget-password-card :deep(.text-muted-foreground),
.auth-forget-password-card :deep(p) {
  color: rgb(255 255 255 / 58%);
}

.auth-forget-password-card :deep(input) {
  height: 48px;
  color: rgb(255 255 255 / 96%);
  background: rgb(255 255 255 / 10%);
  border-color: rgb(255 255 255 / 24%);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 12%),
    0 10px 28px rgb(0 0 0 / 8%);
  backdrop-filter: blur(10px);
}

.auth-forget-password-card :deep(input:hover),
.auth-forget-password-card :deep(input:focus),
.auth-forget-password-card :deep(input:focus-visible) {
  background: rgb(255 255 255 / 16%);
  border-color: rgb(97 150 255 / 72%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 16%),
    0 0 0 3px rgb(83 138 255 / 12%),
    0 14px 34px rgb(0 0 0 / 12%);
}

.auth-forget-password-card :deep(input::placeholder) {
  color: rgb(255 255 255 / 48%);
}

.auth-forget-password-card :deep(.border-input) {
  border-color: rgb(255 255 255 / 24%);
}

.auth-forget-password-submit,
.auth-forget-password-back {
  height: 48px;
  color: rgb(255 255 255 / 96%);
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 10px 28px rgb(0 0 0 / 10%);
  backdrop-filter: blur(12px);
}

.auth-forget-password-submit {
  background: linear-gradient(
    135deg,
    rgb(97 150 255 / 48%),
    rgb(63 111 220 / 34%)
  );
}

.auth-forget-password-submit:hover {
  background: linear-gradient(
    135deg,
    rgb(113 165 255 / 58%),
    rgb(71 120 232 / 42%)
  );
  border-color: rgb(255 255 255 / 26%);
}

.auth-forget-password-submit:focus-visible {
  border-color: rgb(255 255 255 / 28%);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 18%),
    0 14px 36px rgb(63 111 220 / 24%),
    inset 0 1px 0 rgb(255 255 255 / 30%);
}

.auth-forget-password-back {
  background: rgb(255 255 255 / 10%);
}

.auth-forget-password-back:hover {
  background: rgb(255 255 255 / 16%);
  border-color: rgb(255 255 255 / 24%);
}

.auth-forget-password-back:focus-visible {
  border-color: rgb(255 255 255 / 26%);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 14%),
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 10px 28px rgb(0 0 0 / 12%);
}
</style>
