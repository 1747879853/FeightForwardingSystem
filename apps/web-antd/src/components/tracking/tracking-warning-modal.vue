<script lang="ts" setup>
import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { computed } from 'vue';

import { Empty, Modal, Table } from 'ant-design-vue';

import { $t } from '#/locales';
import { sanitizeVendorText } from '#/utils/vendor-text';

/**
 * 异常预警明细弹窗。
 *
 * 预警绝大多数票为空，所以运踪面板上只留入口按钮，明细放这里按需查看。
 * 海运按箱号维度、空运按发生地维度，列定义按 `kind` 切换。
 */
interface Props {
  open: boolean;
  kind: 'air' | 'ocean';
  oceanWarnings?: FeituoTrackingAdminApi.ContainerTrackingWarningDto[];
  airWarnings?: FeituoTrackingAdminApi.AirTrackingWarningDto[];
}

const props = withDefaults(defineProps<Props>(), {
  oceanWarnings: () => [],
  airWarnings: () => [],
});

const emit = defineEmits<{ 'update:open': [boolean] }>();

const columns = computed(() => [
  {
    dataIndex: 'eventTime',
    title: $t('tracking.detail.eventTime'),
    width: 160,
  },
  {
    dataIndex: 'eventCategory',
    title: $t('tracking.detail.warningCategory'),
    width: 120,
  },
  props.kind === 'ocean'
    ? {
        dataIndex: 'equipmentCode',
        title: $t('tracking.detail.containerNo'),
        width: 140,
      }
    : {
        dataIndex: 'locationName',
        title: $t('tracking.detail.eventPlace'),
        width: 180,
        ellipsis: true,
      },
  {
    dataIndex: 'description',
    title: $t('tracking.detail.warningDescription'),
    minWidth: 260,
  },
]);

const rows = computed(() => {
  if (props.kind === 'ocean') {
    return props.oceanWarnings.map((item, index) => ({
      ...item,
      key: `${item.eventCode ?? ''}-${item.eventTime ?? ''}-${index}`,
      description: sanitizeVendorText(item.description) || '--',
      equipmentCode: item.equipmentCode || '--',
    }));
  }
  return props.airWarnings.map((item, index) => ({
    ...item,
    key: `${item.eventCode ?? ''}-${item.eventTime ?? ''}-${index}`,
    description: sanitizeVendorText(item.description) || '--',
    locationName: item.locationName || item.locationCode || '--',
  }));
});
</script>

<template>
  <Modal
    :open="open"
    :title="$t('tracking.detail.warningTitle', [rows.length])"
    :footer="null"
    width="820px"
    @cancel="emit('update:open', false)"
  >
    <Table
      v-if="rows.length > 0"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ y: 400 }"
      row-key="key"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'description'">
          <span class="whitespace-pre-line">{{ record.description }}</span>
        </template>
      </template>
    </Table>
    <Empty v-else :description="$t('tracking.detail.warningEmpty')" />
  </Modal>
</template>
