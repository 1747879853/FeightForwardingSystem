<script lang="ts" setup>
import { useContentSpinner } from '@vben/layouts';

import { LogoProgressSpinner } from '#/components/logo-progress-spinner';

defineOptions({ name: 'RouteContentSpinner' });

const { spinning } = useContentSpinner();
</script>

<template>
  <LogoProgressSpinner :spinning="spinning" />
</template>
