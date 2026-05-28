<script lang="ts" setup>
import { AuthenticationQrCodeLogin } from '@vben/common-ui';
import { LOGIN_PATH } from '@vben/constants';

import {
  brandLoginTitleLogo,
  brandLoginTitleLogoClass,
} from '#/utils/brand-assets';

defineOptions({ name: 'QrCodeLogin' });
</script>

<template>
  <AuthenticationQrCodeLogin
    :login-path="LOGIN_PATH"
    :title-logo="brandLoginTitleLogo"
    :title-logo-class="brandLoginTitleLogoClass"
  />
</template>
