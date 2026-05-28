<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 登录页横版 Logo（由应用层 brand-assets 等传入） */
    logoSrc?: string;
    /** 附加样式类，如品牌专用宽度 */
    logoClass?: string;
  }>(),
  {
    logoClass: '',
  },
);
</script>

<template>
  <div
    v-if="logoSrc"
    class="auth-title-logo-wrap mb-7 sm:mx-auto sm:w-full sm:max-w-md"
  >
    <img :class="['auth-title-logo', logoClass]" :src="logoSrc" alt="logo" />
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
