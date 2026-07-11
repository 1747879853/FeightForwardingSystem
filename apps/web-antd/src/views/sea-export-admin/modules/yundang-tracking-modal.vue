<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { $t } from '#/locales';

import type { YundangTrackingOpenPayload } from '../use-yundang-ocean-track';
import YundangTrackingPanel from './yundang-tracking-panel.vue';

const payload = ref<YundangTrackingOpenPayload | null>(null);

const modalTitle = computed(() => {
  const label = payload.value?.orderLabel;
  return label
    ? $t('seaExport.yundang.tracking.titleWithOrder', [label])
    : $t('seaExport.yundang.tracking.title');
});

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('seaExport.yundang.tracking.close'),
  onOpenChange(isOpen) {
    if (!isOpen) {
      payload.value = null;
      return;
    }
    payload.value = modalApi.getData<YundangTrackingOpenPayload>() ?? null;
  },
});
</script>

<template>
  <Modal :title="modalTitle" class="w-[960px]">
    <YundangTrackingPanel
      v-if="payload"
      :sea-export-id="payload.seaExportId"
      :is-yundang-subscribed="payload.isYundangSubscribed"
      :is-yundang-subscribe-success="payload.isYundangSubscribeSuccess"
    />
  </Modal>
</template>
