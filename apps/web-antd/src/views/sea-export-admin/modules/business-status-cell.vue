<script setup lang="ts">
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref } from 'vue';

import {
  getSeaExportBusinessStatusMeta,
  resolveSeaExportBusinessStatusView,
} from '../data';
import BusinessStatusLabel from './business-status-label.vue';
import ServiceTasksPopover from './service-tasks-popover.vue';

const props = defineProps<{
  row: SeaExportAdminApi.SeaExportDto;
  labels: Map<number, string>;
  colors: Map<number, string>;
  processes: Map<number, boolean>;
}>();
const emit = defineEmits<{
  refreshed: [services: SeaExportAdminApi.SeaExportServiceDto[]];
}>();

/** 默认只画彩色文字；移入或聚焦后才挂载悬浮层 */
const armed = ref(false);
const status = computed(() =>
  resolveSeaExportBusinessStatusView(
    getSeaExportBusinessStatusMeta(props.row, props.labels),
    props.colors,
  ),
);
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
      :pending-color="status.pendingColor"
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
      :pending-color="status.pendingColor"
      tabindex="0"
    />
  </span>
</template>
