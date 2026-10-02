<script setup lang="ts">
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed } from 'vue';

import { Popover, Tag } from 'ant-design-vue';

import {
  formatSeaExportBillStatusSummary,
  SEA_EXPORT_BILL_STATUS_INLINE_LIMIT,
  toSeaExportBillStatusItems,
} from './bill-of-lading-status';

const props = defineProps<{
  bills?: null | SeaExportAdminApi.SeaExportBillOfLadingSimpleDto[];
}>();

const items = computed(() => toSeaExportBillStatusItems(props.bills));
const inlineItems = computed(() =>
  items.value.slice(0, SEA_EXPORT_BILL_STATUS_INLINE_LIMIT),
);
const extraCount = computed(
  () => items.value.length - inlineItems.value.length,
);
const summary = computed(() => formatSeaExportBillStatusSummary(items.value));

function popupContainer() {
  return document.body;
}
</script>

<template>
  <span v-if="items.length === 0">--</span>
  <span
    v-else
    class="bill-status-cell"
    :title="extraCount > 0 ? undefined : summary"
  >
    <span
      v-for="item in inlineItems"
      :key="item.key"
      class="bill-status-cell__item"
    >
      <span class="bill-status-cell__role">{{
        item.role === '主单' ? '主' : '分'
      }}</span>
      <Tag :color="item.color" class="!mr-0">{{ item.label }}</Tag>
    </span>
    <Popover
      v-if="extraCount > 0"
      trigger="hover"
      placement="bottomLeft"
      :mouse-enter-delay="0.2"
      :get-popup-container="popupContainer"
      :overlay-style="{ zIndex: 2100 }"
    >
      <template #content>
        <div class="bill-status-pop">
          <div
            v-for="item in items"
            :key="item.key"
            class="bill-status-pop__row"
          >
            <span class="bill-status-pop__role">{{ item.role }}</span>
            <Tag :color="item.color" class="!mr-0">{{ item.label }}</Tag>
          </div>
        </div>
      </template>
      <span class="bill-status-cell__more" @click.stop>+{{ extraCount }}</span>
    </Popover>
  </span>
</template>

<style scoped>
.bill-status-cell {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
}

.bill-status-cell__item {
  display: inline-flex;
  flex: none;
  gap: 4px;
  align-items: center;
}

.bill-status-cell__role,
.bill-status-pop__role {
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

.bill-status-cell__more {
  flex: none;
  font-size: 12px;
  color: #1677ff;
  cursor: default;
}

.bill-status-pop {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bill-status-pop__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.bill-status-pop__role {
  width: 28px;
}
</style>
