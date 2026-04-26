<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { VbenButton } from '@vben-core/shadcn-ui';

import { useQRCode } from '@vueuse/integrations/useQRCode';

import Title from './auth-title.vue';

interface Props {
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
   * @zh_CN 描述
   */
  description?: string;
  /**
   * @zh_CN 是否显示返回按钮
   */
  showBack?: boolean;
}

defineOptions({
  name: 'AuthenticationQrCodeLogin',
});

const props = withDefaults(defineProps<Props>(), {
  description: '',
  loading: false,
  showBack: true,
  loginPath: '/auth/login',
  submitButtonText: '',
  subTitle: '',
  title: '',
});

const router = useRouter();

const text = ref('https://vben.vvbin.cn');

const qrcode = useQRCode(text, {
  errorCorrectionLevel: 'H',
  margin: 4,
});

function goToLogin() {
  router.push(props.loginPath);
}
</script>

<template>
  <div class="auth-qrcode-login-card">
    <Title>
      <slot name="title">
        {{ title || $t('authentication.welcomeBack') }} 📱
      </slot>
      <template #desc>
        <span class="text-muted-foreground">
          <slot name="subTitle">
            {{ subTitle || $t('authentication.qrcodeSubtitle') }}
          </slot>
        </span>
      </template>
    </Title>

    <div class="auth-qrcode-panel flex-col-center mt-6">
      <img :src="qrcode" alt="qrcode" class="w-1/2" />
      <p class="text-muted-foreground mt-4 text-sm">
        <slot name="description">
          {{ description || $t('authentication.qrcodePrompt') }}
        </slot>
      </p>
    </div>

    <VbenButton
      v-if="showBack"
      class="auth-qrcode-login-back mt-4 w-full"
      variant="outline"
      @click="goToLogin()"
    >
      {{ $t('common.back') }}
    </VbenButton>
  </div>
</template>

<style scoped>
.auth-qrcode-login-card {
  width: 100%;
  color: rgb(255 255 255 / 96%);
}

.auth-qrcode-login-card :deep(h2) {
  color: rgb(255 255 255 / 96%);
  text-shadow: 0 4px 20px rgb(0 0 0 / 25%);
}

.auth-qrcode-login-card :deep(.text-muted-foreground) {
  color: rgb(255 255 255 / 58%);
}

.auth-qrcode-panel {
  padding: 24px 0 18px;
  background: rgb(255 255 255 / 9%);
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 12%),
    0 10px 28px rgb(0 0 0 / 8%);
  backdrop-filter: blur(10px);
}

.auth-qrcode-panel img {
  padding: 10px;
  background: rgb(255 255 255 / 78%);
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 10px;
  box-shadow: 0 10px 26px rgb(0 0 0 / 12%);
}

.auth-qrcode-login-back {
  height: 48px;
  color: rgb(255 255 255 / 96%);
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 10px 28px rgb(0 0 0 / 10%);
  backdrop-filter: blur(12px);
}

.auth-qrcode-login-back:hover {
  background: rgb(255 255 255 / 16%);
  border-color: rgb(255 255 255 / 24%);
}

.auth-qrcode-login-back:focus-visible {
  border-color: rgb(255 255 255 / 26%);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 14%),
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 10px 28px rgb(0 0 0 / 12%);
}
</style>
