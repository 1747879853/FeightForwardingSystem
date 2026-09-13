<script lang="ts" setup>
import { Page } from '@vben/common-ui';

// Isolate the SDK's #app mount, global styles and hash router.
const key = String(import.meta.env.VITE_GLOB_FREIGHTOWER_SCHEDULE_KEY || '');
const src = `${import.meta.env.BASE_URL}schedule-sdk.html`;
function initialize(event: Event) {
  (event.target as HTMLIFrameElement).contentWindow?.postMessage(
    { type: 'schedule-sdk-init', key },
    window.location.origin,
  );
}
</script>

<template>
  <Page auto-content-height content-class="!p-0 overflow-hidden">
    <iframe
      title="船期查询"
      :src="src"
      class="h-full w-full border-0"
      referrerpolicy="strict-origin-when-cross-origin"
      @load="initialize"
    ></iframe>
  </Page>
</template>
