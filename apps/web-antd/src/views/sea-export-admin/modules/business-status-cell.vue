<script setup lang="ts">
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref } from 'vue';

import {
  getSeaExportBusinessStatusMeta,
  SEA_EXPORT_BUSINESS_STATUS_COLORS,
} from '../data';
import BusinessStatusLabel from './business-status-label.vue';
import ServiceTasksPopover from './service-tasks-popover.vue';

const props = defineProps<{
  row: SeaExportAdminApi.SeaExportDto;
  labels: Map<number, string>;
  processes: Map<number, boolean>;
}>();
const emit = defineEmits<{
  refreshed: [services: SeaExportAdminApi.SeaExportServiceDto[]];
}>();

/** 默认只画彩色文字；移入或聚焦后才挂载悬浮层 */
const armed = ref(false);
const status = computed(() => {
  const meta = getSeaExportBusinessStatusMeta(props.row, props.labels);
  return { ...meta, colors: SEA_EXPORT_BUSINESS_STATUS_COLORS[meta.state] };
});
</script>

<template>
  <ServiceTasksPopover
    v-if="armed"
    open-on-mount
    :sea-export-id="String(row.id)"
    :commission-num="row.transportOrder?.commissionNum"
    :labels="labels"
    :processes="processes"
    @refreshed="emit('refreshed', $event)"
  >
    <BusinessStatusLabel
      :text="status.text"
      :state="status.state"
      :colors="status.colors"
    />
  </ServiceTasksPopover>
  <span
    v-else
    class="inline-flex"
    @mouseenter="armed = true"
    @focusin="armed = true"
  >
    <BusinessStatusLabel
      :text="status.text"
      :state="status.state"
      :colors="status.colors"
      tabindex="0"
    />
  </span>
</template>
