<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Empty } from 'ant-design-vue';

import { AIS_IFRAME_CONFIG, buildAisIframeUrl } from '../data';

interface VesselAisModalData {
  /** MMSI 号或船名 */
  mmsi?: string;
  /** 弹窗标题展示用的船名/航次 */
  title?: string;
}

const modalData = ref<VesselAisModalData>({});

/** 是否已配置密钥（未配置时无法加载 Iframe） */
const hasKey = computed(() => Boolean(AIS_IFRAME_CONFIG.key));

const iframeUrl = computed(() => buildAisIframeUrl(modalData.value.mmsi));

const modalTitle = computed(() => {
  const name = modalData.value.title || modalData.value.mmsi;
  return name ? `船舶定位 - ${name}` : '船舶定位';
});

const [Modal, modalApi] = useVbenModal({
  footer: false,
  fullscreenButton: true,
  onOpenChange(isOpen) {
    if (isOpen) {
      modalData.value = modalApi.getData<VesselAisModalData>() ?? {};
    }
  },
});
</script>

<template>
  <Modal :title="modalTitle" class="w-[1200px]">
    <div class="h-[70vh] w-full">
      <template v-if="hasKey && modalData.mmsi">
        <iframe
          :src="iframeUrl"
          class="h-full w-full border-0"
          allow="geolocation"
          referrerpolicy="no-referrer"
          title="船舶 AIS 定位"
        ></iframe>
      </template>
      <div v-else class="flex h-full items-center justify-center">
        <Empty
          :description="
            hasKey
              ? '当前船期缺少船名/MMSI，无法定位'
              : '船舶定位服务未配置，请联系管理员'
          "
        />
      </div>
    </div>
  </Modal>
</template>
