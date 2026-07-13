<script lang="ts" setup>
import { computed } from 'vue';

import { Empty, Modal } from 'ant-design-vue';

import { useTrackingMap } from './use-tracking-map';

const { visible, referenceNo, close } = useTrackingMap();

// 内嵌地址与企业编号仅来自 env，不在页面/代码中直接暴露原始 URL 与企业编号
const baseUrl = (import.meta.env.VITE_GLOB_TRACKING_MAP_URL as string) || '';
const companyId =
  (import.meta.env.VITE_GLOB_TRACKING_COMPANY_ID as string) || '';

const iframeSrc = computed(() => {
  if (!baseUrl || !companyId || !referenceNo.value) return '';
  const [path, query = ''] = baseUrl.split('?');
  const params = new URLSearchParams(query);
  params.set('companyid', companyId);
  params.set('referenceno', referenceNo.value);
  return `${path}?${params.toString()}`;
});
</script>

<template>
  <Modal
    :open="visible"
    title="货物轨迹"
    :footer="null"
    width="90vw"
    :style="{ maxWidth: '1400px' }"
    :destroy-on-close="true"
    :body-style="{ padding: '0' }"
    centered
    @cancel="close"
  >
    <div class="tracking-map">
      <iframe
        v-if="iframeSrc"
        :src="iframeSrc"
        class="tracking-map__frame"
        frameborder="0"
        allow="geolocation"
        referrerpolicy="no-referrer"
      ></iframe>
      <div v-else class="tracking-map__empty">
        <Empty description="暂无可查询的订阅号" />
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.tracking-map {
  width: 100%;
  height: 80vh;
}

.tracking-map__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}

.tracking-map__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
