<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '@vben-core/form-ui';

import type { AuthenticationProps } from './types';

import { computed, nextTick, onActivated, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { useVbenForm } from '@vben-core/form-ui';
import { VbenButton, VbenCheckbox } from '@vben-core/shadcn-ui';

import Title from './auth-title.vue';
import ThirdPartyLogin from './third-party-login.vue';

interface Props extends AuthenticationProps {
  formSchema?: VbenFormSchema[];
}

defineOptions({
  name: 'AuthenticationLogin',
});

const props = withDefaults(defineProps<Props>(), {
  codeLoginPath: '/auth/code-login',
  forgetPasswordPath: '/auth/forget-password',
  formSchema: () => [],
  loading: false,
  qrCodeLoginPath: '/auth/qrcode-login',
  registerPath: '/auth/register',
  showCodeLogin: true,
  showForgetPassword: true,
  showQrcodeLogin: true,
  showRegister: true,
  showRememberMe: true,
  showThirdPartyLogin: true,
  submitButtonText: '',
  subTitle: '',
  title: '',
});

const emit = defineEmits<{
  submit: [Recordable<any>];
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

const REMEMBER_ME_KEY = `REMEMBER_ME_USERNAME_${location.hostname}`;

const localUsername = localStorage.getItem(REMEMBER_ME_KEY) || '';

const rememberMe = ref(!!localUsername);
const loginCardRef = ref<HTMLElement>();

function syncFilledInputStyle() {
  const cardEl = loginCardRef.value;
  if (!cardEl) return;
  const inputEls = cardEl.querySelectorAll<HTMLInputElement>(
    '.auth-login-form input',
  );
  inputEls.forEach((inputEl) => {
    if (inputEl.value?.trim()) {
      inputEl.setAttribute('data-filled', 'true');
    } else {
      inputEl.removeAttribute('data-filled');
    }
  });
}

function scheduleFilledInputStyleSync() {
  nextTick(() => {
    syncFilledInputStyle();
    setTimeout(syncFilledInputStyle, 80);
    setTimeout(syncFilledInputStyle, 260);
  });
}

async function handleSubmit() {
  const { valid } = await formApi.validate();
  const values = await formApi.getValues();
  if (valid) {
    localStorage.setItem(
      REMEMBER_ME_KEY,
      rememberMe.value ? values?.username : '',
    );
    emit('submit', values);
  }
}

function handleGo(path: string) {
  router.push(path);
}

onMounted(() => {
  if (localUsername) {
    formApi.setFieldValue('username', localUsername);
  }
  scheduleFilledInputStyleSync();
});

onActivated(() => {
  scheduleFilledInputStyleSync();
});

defineExpose({
  getFormApi: () => formApi,
});
</script>

<template>
  <div
    ref="loginCardRef"
    class="auth-login-card"
    @keydown.enter.prevent="handleSubmit"
  >
    <slot name="title">
      <Title>
        <slot name="title">
          {{ title || `${$t('authentication.welcomeBack')} 👋🏻` }}
        </slot>
        <template #desc>
          <span class="text-muted-foreground">
            <slot name="subTitle">
              {{ subTitle || $t('authentication.loginSubtitle') }}
            </slot>
          </span>
        </template>
      </Title>
    </slot>

    <div class="auth-login-form">
      <Form />
    </div>

    <div
      v-if="showRememberMe || showForgetPassword"
      class="auth-login-options mb-6 flex justify-between"
    >
      <div class="flex-center">
        <VbenCheckbox
          v-if="showRememberMe"
          v-model="rememberMe"
          name="rememberMe"
        >
          {{ $t('authentication.rememberMe') }}
        </VbenCheckbox>
      </div>

      <span
        v-if="showForgetPassword"
        class="vben-link text-sm font-normal"
        @click="handleGo(forgetPasswordPath)"
      >
        {{ $t('authentication.forgetPassword') }}
      </span>
    </div>
    <VbenButton
      :class="{
        'cursor-wait': loading,
      }"
      :loading="loading"
      aria-label="login"
      class="auth-login-submit w-full"
      @click="handleSubmit"
    >
      {{ submitButtonText || $t('common.login') }}
    </VbenButton>

    <div
      v-if="showCodeLogin || showQrcodeLogin"
      class="auth-login-switcher mb-2 mt-4 flex items-center justify-between"
    >
      <VbenButton
        v-if="showCodeLogin"
        class="auth-login-ghost w-1/2"
        variant="outline"
        @click="handleGo(codeLoginPath)"
      >
        {{ $t('authentication.mobileLogin') }}
      </VbenButton>
      <VbenButton
        v-if="showQrcodeLogin"
        class="auth-login-ghost ml-4 w-1/2"
        variant="outline"
        @click="handleGo(qrCodeLoginPath)"
      >
        {{ $t('authentication.qrcodeLogin') }}
      </VbenButton>
    </div>

    <div class="auth-login-footer"></div>

    <!-- 第三方登录 -->
    <slot name="third-party-login">
      <ThirdPartyLogin v-if="showThirdPartyLogin" />
    </slot>
  </div>
</template>

<style scoped>


@media (max-width: 900px) {
  .auth-login-card :deep(h2) {
    font-size: 30px;
    letter-spacing: 4px;
  }
}

.auth-login-card {
  width: 100%;
  color: rgb(255 255 255 / 96%);
}

.auth-login-card :deep(h2) {
  margin-bottom: 10px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(255 255 255 / 96%);
  letter-spacing: 6px;
  text-shadow: 0 4px 20px rgb(0 0 0 / 25%);
}

.auth-login-card :deep(.text-muted-foreground) {
  font-size: 16px;
  color: rgb(255 255 255 / 58%);
  letter-spacing: 0.5px;
}

.auth-login-form {
  margin-top: 34px;
}

.auth-login-form :deep(.relative.flex) {
  align-items: stretch;
}

.auth-login-form :deep(.ant-input-affix-wrapper) {
  height: 48px;
  background: rgb(255 255 255 / 10%);
  border-color: rgb(255 255 255 / 24%);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 12%),
    0 10px 28px rgb(0 0 0 / 8%);
  backdrop-filter: blur(10px);
  transition:
    border-color 0.25s ease,
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.auth-login-form :deep(input) {
  height: 48px;
  font-size: 15px;
  color: rgb(255 255 255 / 96%);
  background: transparent;
  border: none;
  box-shadow: none;
  transition:
    border-color 0.25s ease,
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.auth-login-form :deep(.ant-input-affix-wrapper:hover),
.auth-login-form :deep(.ant-input-affix-wrapper-focused),
.auth-login-form :deep(.ant-input-affix-wrapper:focus-within) {
  background: rgb(255 255 255 / 16%);
  border-color: rgb(97 150 255 / 72%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 16%),
    0 0 0 3px rgb(83 138 255 / 12%),
    0 14px 34px rgb(0 0 0 / 12%);
}

.auth-login-form :deep(input::placeholder) {
  color: rgb(255 255 255 / 48%);
}

.auth-login-form :deep(input[data-filled='true']) {
  color: rgb(255 255 255 / 96%) !important;
  background: transparent !important;
  border-color: transparent !important;
}

.auth-login-form :deep(input.bg-background) {
  background: transparent !important;
}

.auth-login-form :deep(.text-foreground\/60) {
  color: rgb(255 255 255 / 72%);
}

.auth-login-form :deep(.bg-background-deep) {
  height: 46px;
  color: rgb(255 255 255 / 72%);
  background: rgb(255 255 255 / 9%);
  border-color: rgb(255 255 255 / 22%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 10%),
    0 10px 28px rgb(0 0 0 / 8%);
  backdrop-filter: blur(10px);
}

.auth-login-form :deep(.bg-success) {
  background: linear-gradient(
    135deg,
    rgb(97 150 255 / 34%),
    rgb(75 222 179 / 22%)
  );
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 14%);
  backdrop-filter: blur(10px);
}

.auth-login-form :deep([name='captcha-action']) {
  color: rgb(255 255 255 / 88%);
  background: rgb(255 255 255 / 18%);
  border-right: 1px solid rgb(255 255 255 / 22%);
  box-shadow:
    0 8px 22px rgb(0 0 0 / 16%),
    inset 0 1px 0 rgb(255 255 255 / 20%);
  backdrop-filter: blur(12px);
}

/* Chrome 自动填充：重点 */
.auth-login-form :deep(input:-webkit-autofill),
.auth-login-form :deep(input:-webkit-autofill:hover),
.auth-login-form :deep(input:-webkit-autofill:focus),
.auth-login-form :deep(input:-webkit-autofill:active) {
  caret-color: #fff !important;
  color-scheme: dark;
  background-color: transparent !important;

  /*
    用 inset 阴影盖住 Chrome 的 :-internal-autofill-selected 背景。
    注意这里会占用 box-shadow，所以外层 wrapper 的阴影要放在 .ant-input-affix-wrapper 上。
  */
  box-shadow: 0 0 0 1000px rgb(255 255 255 / 1%) inset !important;
  box-shadow: 0 0 0 1000px rgb(255 255 255 / 1%) inset !important;
  transition: background-color 99999s ease-in-out 0s !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
}

.auth-login-options {
  margin: 4px 0 26px;
  font-size: 14px;
}

.auth-login-options :deep(label),
.auth-login-options :deep(button),
.auth-login-options :deep(.text-sm),
.auth-login-options :deep(.vben-link) {
  color: rgb(255 255 255 / 75%);
}

.auth-login-options :deep(.vben-link) {
  color: rgb(190 210 255 / 86%);
  text-decoration: none;
  cursor: pointer;
}

.auth-login-options :deep(.vben-link:hover) {
  color: rgb(255 255 255 / 96%);
}

.auth-login-submit {
  height: 50px;
  font-size: 17px;
  font-weight: 600;
  color: rgb(255 255 255 / 96%);
  letter-spacing: 8px;
  background: linear-gradient(
    135deg,
    rgb(97 150 255 / 48%),
    rgb(63 111 220 / 34%)
  );
  border: 1px solid rgb(255 255 255 / 26%);
  border-radius: 8px;
  box-shadow:
    0 10px 28px rgb(63 111 220 / 20%),
    inset 0 1px 0 rgb(255 255 255 / 26%);
  backdrop-filter: blur(12px);
  transition:
    transform 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
}

.auth-login-submit:hover {
  background: linear-gradient(
    135deg,
    rgb(113 165 255 / 58%),
    rgb(71 120 232 / 42%)
  );
  border-color: rgb(255 255 255 / 26%);
  box-shadow:
    0 14px 36px rgb(63 111 220 / 28%),
    inset 0 1px 0 rgb(255 255 255 / 30%);
  transform: translateY(-1px);
}

.auth-login-submit:focus-visible {
  border-color: rgb(255 255 255 / 28%);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 18%),
    0 14px 36px rgb(63 111 220 / 24%),
    inset 0 1px 0 rgb(255 255 255 / 30%);
}

.auth-login-ghost {
  color: rgb(220 232 255 / 90%);
  background: rgb(255 255 255 / 10%);
  border-color: rgb(255 255 255 / 22%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 12%),
    0 8px 22px rgb(0 0 0 / 8%);
  backdrop-filter: blur(10px);
}

.auth-login-ghost:hover {
  color: rgb(255 255 255 / 96%);
  background: rgb(255 255 255 / 16%);
  border-color: rgb(255 255 255 / 24%);
}

.auth-login-ghost:focus-visible {
  border-color: rgb(255 255 255 / 26%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 12%),
    0 0 0 2px rgb(255 255 255 / 14%),
    0 8px 22px rgb(0 0 0 / 10%);
}

.auth-login-footer {
  margin-top: 32px;
  text-align: center;
}

.auth-login-divider {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: rgb(255 255 255 / 52%);
}

.auth-login-divider span {
  width: 64px;
  height: 1px;
  background: rgb(255 255 255 / 22%);
}

.auth-login-divider em {
  font-style: normal;
  letter-spacing: 4px;
}

.auth-login-footer p {
  margin-top: 14px;
  margin-bottom: 0;
  font-size: 14px;
  color: rgb(255 255 255 / 48%);
  letter-spacing: 2px;
}

.auth-login-card :deep(.border-input) {
  border-color: rgb(255 255 255 / 24%);
}
</style>
