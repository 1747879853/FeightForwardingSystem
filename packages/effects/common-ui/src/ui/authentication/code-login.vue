<script setup lang="ts">
import type { Recordable } from '@vben/types';

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
  /**
   * @zh_CN 是否显示返回按钮
   */
  showBack?: boolean;
}

defineOptions({
  name: 'AuthenticationCodeLogin',
});

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showBack: true,
  loginPath: '/auth/login',
  submitButtonText: '',
  subTitle: '',
  title: '',
});

const emit = defineEmits<{
  submit: [Recordable<any>];
}>();

const router = useRouter();

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
  <div class="auth-code-login-card">
    <Title>
      <slot name="title">
        {{ title || $t('authentication.welcomeBack') }} 📲
      </slot>
      <template #desc>
        <span class="text-muted-foreground">
          <slot name="subTitle">
            {{ subTitle || $t('authentication.codeSubtitle') }}
          </slot>
        </span>
      </template>
    </Title>
    <Form />
    <VbenButton
      :class="{
        'cursor-wait': loading,
      }"
      :loading="loading"
      class="auth-code-login-submit w-full"
      @click="handleSubmit"
    >
      <slot name="submitButtonText">
        {{ submitButtonText || $t('common.login') }}
      </slot>
    </VbenButton>
    <VbenButton
      v-if="showBack"
      class="auth-code-login-back mt-4 w-full"
      variant="outline"
      @click="goToLogin()"
    >
      {{ $t('common.back') }}
    </VbenButton>
  </div>
</template>

<style scoped>
.auth-code-login-card {
  width: 100%;
  color: rgb(255 255 255 / 96%);
}

.auth-code-login-card :deep(h2) {
  color: rgb(255 255 255 / 96%);
  text-shadow: 0 4px 20px rgb(0 0 0 / 25%);
}

.auth-code-login-card :deep(.text-muted-foreground) {
  color: rgb(255 255 255 / 58%);
}

.auth-code-login-card :deep(input) {
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

.auth-code-login-card :deep(input:hover),
.auth-code-login-card :deep(input:focus),
.auth-code-login-card :deep(input:focus-visible) {
  background: rgb(255 255 255 / 16%);
  border-color: rgb(97 150 255 / 72%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 16%),
    0 0 0 3px rgb(83 138 255 / 12%),
    0 14px 34px rgb(0 0 0 / 12%);
}

.auth-code-login-card :deep(input::placeholder) {
  color: rgb(255 255 255 / 48%);
}

.auth-code-login-card :deep(.border-input) {
  border-color: rgb(255 255 255 / 24%);
}

.auth-code-login-card :deep(button.flex-grow) {
  color: rgb(255 255 255 / 90%);
  background: rgb(255 255 255 / 10%);
  border-color: rgb(255 255 255 / 24%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 12%),
    0 10px 28px rgb(0 0 0 / 8%);
  backdrop-filter: blur(10px);
}

.auth-code-login-card :deep(button.flex-grow:hover) {
  background: rgb(255 255 255 / 16%);
  border-color: rgb(255 255 255 / 24%);
}

.auth-code-login-card :deep(button.flex-grow:focus-visible) {
  border-color: rgb(255 255 255 / 26%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 12%),
    0 0 0 2px rgb(255 255 255 / 14%),
    0 10px 28px rgb(0 0 0 / 10%);
}

.auth-code-login-card :deep(.relative.flex.w-full) {
  gap: 6px;
}

.auth-code-login-card :deep(.mr-2) {
  margin-right: 0;
}

.auth-code-login-card :deep(.mr-2 > *) {
  background: rgb(255 255 255 / 10%) !important;
  border: 1px solid rgb(255 255 255 / 24%) !important;
  border-radius: 8px !important;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 12%),
    0 10px 28px rgb(0 0 0 / 8%);
  backdrop-filter: blur(10px);
}

.auth-code-login-card :deep(.mr-2 > *:hover),
.auth-code-login-card :deep(.mr-2 > *:focus),
.auth-code-login-card :deep(.mr-2 > *:focus-visible) {
  outline: none;
  background: rgb(255 255 255 / 14%) !important;
  border-color: rgb(255 255 255 / 28%) !important;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 16%),
    0 0 0 2px rgb(255 255 255 / 14%),
    0 12px 30px rgb(0 0 0 / 10%);
}

.auth-code-login-card :deep(.mr-2 > *::selection) {
  color: rgb(255 255 255 / 96%);
  background: rgb(255 255 255 / 24%);
}

.auth-code-login-submit,
.auth-code-login-back {
  height: 48px;
  color: rgb(255 255 255 / 96%);
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 10px 28px rgb(0 0 0 / 10%);
  backdrop-filter: blur(12px);
}

.auth-code-login-submit {
  background: linear-gradient(
    135deg,
    rgb(97 150 255 / 48%),
    rgb(63 111 220 / 34%)
  );
}

.auth-code-login-submit:hover {
  background: linear-gradient(
    135deg,
    rgb(113 165 255 / 58%),
    rgb(71 120 232 / 42%)
  );
  border-color: rgb(255 255 255 / 26%);
}

.auth-code-login-submit:focus-visible {
  border-color: rgb(255 255 255 / 28%);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 18%),
    0 14px 36px rgb(63 111 220 / 24%),
    inset 0 1px 0 rgb(255 255 255 / 30%);
}

.auth-code-login-back {
  background: rgb(255 255 255 / 10%);
}

.auth-code-login-back:hover {
  background: rgb(255 255 255 / 16%);
  border-color: rgb(255 255 255 / 24%);
}

.auth-code-login-back:focus-visible {
  border-color: rgb(255 255 255 / 26%);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 14%),
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 10px 28px rgb(0 0 0 / 12%);
}
</style>
