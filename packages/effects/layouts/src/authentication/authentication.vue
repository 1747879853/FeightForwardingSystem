<script setup lang="ts">
import type { ToolbarType } from './types';

import { computed } from 'vue';

import { preferences, usePreferences } from '@vben/preferences';

import { Copyright } from '../basic/copyright';
import AuthenticationFormView from './form.vue';
import SloganIcon from './icons/slogan.vue';
import Toolbar from './toolbar.vue';

interface Props {
  appName?: string;
  logo?: string;
  logoDark?: string;
  pageTitle?: string;
  pageDescription?: string;
  sloganImage?: string;
  toolbar?: boolean;
  copyright?: boolean;
  toolbarList?: ToolbarType[];
  clickLogo?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  appName: '',
  copyright: true,
  logo: '',
  logoDark: '',
  pageDescription: '',
  pageTitle: '',
  sloganImage: '',
  toolbar: true,
  toolbarList: () => ['color', 'language', 'layout', 'theme'],
  clickLogo: () => {},
});

const { isDark } = usePreferences();

/**
 * @zh_CN 根据主题选择合适的 logo 图标
 */
const logoSrc = computed(() => {
  // 如果是暗色主题且提供了 logoDark，则使用暗色主题的 logo
  if (isDark.value && props.logoDark) {
    return props.logoDark;
  }
  // 否则使用默认的 logo
  return props.logo;
});
</script>

<template>
  <div
    :class="[isDark ? 'dark' : '']"
    class="flex min-h-full flex-1 select-none overflow-x-hidden"
  >
    <!-- <template v-if="toolbar">
      <slot name="toolbar">
        <Toolbar :toolbar-list="toolbarList" />
      </slot>
    </template> -->
    <!-- 左侧认证面板 -->

    <!-- 中心认证面板 -->
    <div class="auth-page-content flex-center relative w-full justify-end">
      <div class="login-background absolute left-0 top-0 size-full">
        <video
          class="login-background-video"
          src="../../../common-ui/src/ui/authentication/background.mp4"
          autoplay
          loop
          muted
          playsinline
          preload="auto"
        ></video>
        <div class="login-background-mask"></div>
      </div>
      <AuthenticationFormView
        class="auth-form-bg shadow-primary/5 shadow-float w-full max-w-[430px] rounded-[18px]"
        data-side="bottom"
      >
        <template v-if="copyright" #copyright>
          <slot name="copyright">
            <Copyright
              v-if="preferences.copyright.enable"
              v-bind="preferences.copyright"
            />
          </slot>
        </template>
      </AuthenticationFormView>
    </div>
  </div>
</template>

<style scoped>
.auth-page-content {
  min-height: 100vh;
  padding: 0 96px;
  padding-left: 24px;
}

.login-background {
  overflow: hidden;
  background: #071427;
}

.login-background-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.login-background-mask {
  position: absolute;
  inset: 0;

  /* background:
    radial-gradient(
      circle at 72% 48%,
      rgb(65 110 190 / 18%),
      transparent 34%
    ),
    linear-gradient(
      90deg,
      rgb(5 12 28 / 55%),
      rgb(5 12 28 / 30%) 42%,
      rgb(5 12 28 / 70%)
    ),
    rgb(3 10 24 / 28%);
  backdrop-filter: blur(1px); */
}

.auth-form-bg {
  z-index: 1;
  padding: 48px 48px 40px !important;
  color: rgb(255 255 255 / 96%);
  background: transparent;
  border: 1px solid rgb(255 255 255 / 22%);
  backdrop-filter: blur(4px);
}

.auth-form-bg :deep(input:-webkit-autofill),
.auth-form-bg :deep(input:-webkit-autofill:hover),
.auth-form-bg :deep(input:-webkit-autofill:focus),
.auth-form-bg :deep(input:-webkit-autofill:active) {
  -webkit-text-fill-color: rgb(255 255 255 / 96%) !important;
  caret-color: #fff !important;
  background-color: transparent !important;
  box-shadow: 0 0 0 1000px rgb(255 255 255 / 10%) inset !important;
  box-shadow: 0 0 0 1000px rgb(255 255 255 / 10%) inset !important;
  transition: background-color 99999s ease-in-out 0s !important;
}

@media (max-width: 900px) {
  .auth-page-content {
    justify-content: center;
    padding: 24px;
  }

  .auth-form-bg {
    max-width: 420px;
    padding: 42px 32px 36px !important;
  }
}
</style>
