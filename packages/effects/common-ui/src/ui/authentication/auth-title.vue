<script setup lang="ts">
import defaultLoginLogo from './login-logo.png';

const props = withDefaults(
  defineProps<{
    /** 登录页横版 Logo，未传则使用 common-ui 内置 login-logo.png */
    logoSrc?: string;
    /** 附加样式类，如品牌专用宽度 */
    logoClass?: string;
  }>(),
  {
    logoSrc: defaultLoginLogo,
    logoClass: '',
  },
);
</script>

<template>
  <div class="auth-title-logo-wrap mb-7 sm:mx-auto sm:w-full sm:max-w-md">
    <img
      :class="['auth-title-logo', props.logoClass]"
      :src="props.logoSrc"
      alt="logo"
    />
  </div>
</template>

<style scoped>
.auth-title-logo-wrap {
  display: flex;
  justify-content: center;
}

.auth-title-logo {
  width: min(100%, 320px);
  height: auto;
  object-fit: contain;
}

.auth-title-logo--brand-jht {
  width: 220px;
  max-width: 100%;
}

.auth-title-logo--brand-jiayue {
  width: 72px;
  max-width: 100%;
}
</style>
