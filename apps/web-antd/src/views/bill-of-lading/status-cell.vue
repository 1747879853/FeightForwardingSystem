<script setup lang="ts">
import type { BillOfLading } from '#/api/bill-of-lading';

import { computed } from 'vue';

import { Popover, Tag } from 'ant-design-vue';

import { billStatusOptions } from './rules';
import { rejectMeta, rejectReasonOf, rejectReasonText } from './reject-reason';

const props = defineProps<{ row: BillOfLading }>();

const option = computed(() => billStatusOptions[props.row.status]);
const reason = computed(() => rejectReasonOf(props.row));
const meta = computed(() => rejectMeta(reason.value));

function popupContainer() {
  return document.body;
}
</script>

<template>
  <Popover
    v-if="reason"
    trigger="hover"
    placement="rightTop"
    :mouse-enter-delay="0.2"
    :get-popup-container="popupContainer"
    :overlay-style="{ zIndex: 2100 }"
  >
    <template #content>
      <div class="reject-pop">
        <div class="reject-pop__label">驳回原因：</div>
        <div class="reject-pop__text">{{ rejectReasonText(reason) }}</div>
        <div v-if="meta" class="reject-pop__meta">{{ meta }}</div>
      </div>
    </template>
    <Tag :color="option?.color" class="!mr-0 cursor-default">{{
      option?.label
    }}</Tag>
  </Popover>
  <Tag v-else :color="option?.color" class="!mr-0">{{ option?.label }}</Tag>
</template>

<style scoped>
.reject-pop {
  width: 240px;
  font-size: 12px;
  line-height: 18px;
  color: #cf1322;
  word-break: break-all;
  white-space: pre-wrap;
}

.reject-pop__text {
  margin-top: 2px;
}

.reject-pop__meta {
  margin-top: 6px;
  color: #8c95a3;
}
</style>
