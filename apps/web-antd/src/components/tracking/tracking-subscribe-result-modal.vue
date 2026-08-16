<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Table, Tag, Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';

import type { TrackingSubscribeResultView } from './types';

/** 运踪批量订阅结果弹窗（海运集装箱与空运共用，文案已在 composable 内清洗） */
const view = ref<TrackingSubscribeResultView>({
  total: 0,
  successCount: 0,
  failedCount: 0,
  rows: [],
});

const columns = computed(() => [
  {
    dataIndex: 'orderLabel',
    title: $t('tracking.result.orderLabel'),
    width: 180,
    ellipsis: true,
  },
  {
    dataIndex: 'referenceNo',
    title: $t('tracking.result.referenceNo'),
    width: 160,
    ellipsis: true,
  },
  {
    dataIndex: 'isSuccess',
    title: $t('tracking.result.status'),
    width: 100,
  },
  {
    dataIndex: 'message',
    title: $t('tracking.result.message'),
    minWidth: 300,
  },
]);

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('tracking.result.close'),
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    view.value = modalApi.getData<TrackingSubscribeResultView>() ?? {
      total: 0,
      successCount: 0,
      failedCount: 0,
      rows: [],
    };
  },
});
</script>

<template>
  <Modal :title="$t('tracking.result.title')" class="w-[900px]">
    <p class="mb-4 text-sm">
      {{
        $t('tracking.result.summary', [
          view.total,
          view.successCount,
          view.failedCount,
        ])
      }}
    </p>
    <Table
      :columns="columns"
      :data-source="view.rows"
      :pagination="false"
      :scroll="{ y: 360 }"
      row-key="key"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'isSuccess'">
          <Tag :color="record.isSuccess ? 'success' : 'error'">
            {{ record.statusText }}
          </Tag>
        </template>
        <template v-else-if="column.dataIndex === 'message'">
          <Tooltip :title="record.message || undefined">
            <span
              class="inline-block max-w-full whitespace-normal break-words"
              :class="
                record.isSuccess ? 'text-[rgba(0,0,0,0.45)]' : 'text-[#ff4d4f]'
              "
            >
              {{ record.message || '--' }}
            </span>
          </Tooltip>
        </template>
      </template>
    </Table>
  </Modal>
</template>
