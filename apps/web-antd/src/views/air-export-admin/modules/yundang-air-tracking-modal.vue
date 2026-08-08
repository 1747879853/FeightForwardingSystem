<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { $t } from '#/locales';

import type { YundangAirTrackingOpenPayload } from '../use-yundang-air-track';
import YundangAirTrackingPanel from './yundang-air-tracking-panel.vue';

const payload = ref<YundangAirTrackingOpenPayload | null>(null);

const modalTitle = computed(() => {
  const label = payload.value?.orderLabel;
  return label
    ? $t('airExport.yundang.tracking.titleWithOrder', [label])
    : $t('airExport.yundang.tracking.title');
});

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('airExport.yundang.tracking.close'),
  onOpenChange(isOpen) {
    if (!isOpen) {
      payload.value = null;
      return;
    }
    payload.value = modalApi.getData<YundangAirTrackingOpenPayload>() ?? null;
  },
});
</script>

<template>
  <Modal :title="modalTitle" class="w-[960px]">
    <YundangAirTrackingPanel
      v-if="payload"
      :air-export-id="payload.airExportId"
      :is-yundang-subscribed="payload.isYundangSubscribed"
      :is-yundang-subscribe-success="payload.isYundangSubscribeSuccess"
    />
  </Modal>
</template>
