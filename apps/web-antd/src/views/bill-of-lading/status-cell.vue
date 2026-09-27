<script setup lang="ts">
import type { BillOfLading } from '#/api/bill-of-lading';

import { computed, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Popover, Tag } from 'ant-design-vue';

import { billStatusOptions } from './rules';
import {
  loadRejectReason,
  rejectMeta,
  rejectReasonText,
  type RejectReason,
} from './reject-reason';

const props = defineProps<{ row: BillOfLading }>();

const { hasAccessByCodes } = useAccess();
const reason = ref<RejectReason>();
const loading = ref(false);
let loaded = false;

const option = computed(() => billStatusOptions[props.row.status]);
const rejected = computed(() => props.row.status === 2);
const meta = computed(() => rejectMeta(reason.value));

function popupContainer() {
  return document.body;
}

async function onOpen(open: boolean) {
  if (!open || !rejected.value || loaded || loading.value) return;
  loading.value = true;
  try {
    reason.value = await loadRejectReason(
      props.row,
      hasAccessByCodes(['Admin.BillOfLading.Audit']),
    );
    loaded = true;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Popover
    v-if="rejected"
    trigger="hover"
    placement="rightTop"
    :mouse-enter-delay="0.2"
    :get-popup-container="popupContainer"
    :overlay-style="{ zIndex: 2100 }"
    @open-change="onOpen"
  >
    <template #content>
      <div class="reject-pop">
        <div class="reject-pop__label">驳回原因：</div>
        <div class="reject-pop__text">
          {{ rejectReasonText(reason, loading) }}
        </div>
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
