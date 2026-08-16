<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { $t } from '#/locales';

import type { ContainerTrackingOpenPayload } from './container-tracking';
import ContainerTrackingPanel from './container-tracking-panel.vue';

/**
 * 海运集装箱运踪详情弹窗（列表运踪状态列点击后打开）。
 * 摘要直接用列表行上的数据，面板内部再补箱清单与轨迹页链接。
 */
const payload = ref<ContainerTrackingOpenPayload | null>(null);

const modalTitle = computed(() => {
  const label = payload.value?.orderLabel;
  return label
    ? $t('tracking.detail.titleWithOrder', [label])
    : $t('tracking.detail.title');
});

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('tracking.detail.close'),
  onOpenChange(isOpen) {
    if (!isOpen) {
      payload.value = null;
      return;
    }
    payload.value = modalApi.getData<ContainerTrackingOpenPayload>() ?? null;
  },
});
</script>

<template>
  <Modal :title="modalTitle" class="w-[960px]">
    <ContainerTrackingPanel
      v-if="payload"
      :biz-type="payload.bizType"
      :is-subscribe-success="payload.isSubscribeSuccess"
      :is-subscribed="payload.isSubscribed"
      :order-id="payload.orderId"
      :summary="payload.summary"
    />
  </Modal>
</template>
