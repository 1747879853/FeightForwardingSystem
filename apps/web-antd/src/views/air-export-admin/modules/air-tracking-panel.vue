<script lang="ts" setup>
import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useAccess } from '@vben/access';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  message,
  Modal,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import { getAirExportDetail } from '#/api/air-export/air-export-admin';
import { resubscribeAirWaybillTracking } from '#/api/tracking/feituo-tracking-admin';
import {
  buildAirTimelineNodes,
  getTrackingDataStatusColor,
  getTrackingDataStatusLabel,
  hasAirTrackingMapConfig,
  resolveAirTrackingViewState,
  TrackingTimeline,
  useVendorTrackingMap,
} from '#/components/tracking';
import { $t } from '#/locales';
import { sanitizeVendorText } from '#/utils/vendor-text';

/**
 * 空运出口编辑页「运踪」Tab。
 *
 * 摘要、完整轨迹与全部预警都由空运出口详情接口一并下发，这里只负责展示与重新订阅，
 * 不轮询、不直接请求服务商。
 */
interface Props {
  airExportId?: string;
}

const props = defineProps<Props>();

const loading = ref(false);
const loadError = ref('');
const resubscribing = ref(false);
const isSubscribed = ref(false);
const isSubscribeSuccess = ref(false);
const summary = ref<FeituoTrackingAdminApi.AirTrackingSummaryDto | null>(null);
const warnings = ref<FeituoTrackingAdminApi.AirTrackingWarningDto[]>([]);
/** 完整轨迹（含五类事件），时间轴数据源 */
const trackingDetail = ref<FeituoTrackingAdminApi.AirDataDto | null>(null);

const { hasAccessByCodes } = useAccess();
const canResubscribe = computed(() =>
  hasAccessByCodes(['Admin.ExternalApi.Use']),
);

const viewState = computed(() =>
  resolveAirTrackingViewState({
    id: props.airExportId ?? '',
    isFeituoSubscribed: isSubscribed.value,
    isFeituoSubscribeSuccess: isSubscribeSuccess.value,
    feituoTracking: summary.value,
  }),
);

const timelineNodes = computed(() =>
  buildAirTimelineNodes(trackingDetail.value),
);

const dataStatusLabel = computed(() =>
  getTrackingDataStatusLabel(summary.value?.status),
);
const dataStatusColor = computed(() =>
  getTrackingDataStatusColor(summary.value?.status),
);

const currentNodeText = computed(() => {
  const description = summary.value?.currentDescription?.trim();
  if (!description) {
    return '--';
  }
  return summary.value?.currentEventClassifier === 'EST'
    ? `${description}${$t('tracking.status.estimatedSuffix')}`
    : description;
});

const airportText = computed(() => {
  const origin = [
    summary.value?.originCode?.trim(),
    summary.value?.originCity?.trim(),
  ]
    .filter(Boolean)
    .join('/');
  const destination = [
    summary.value?.destinationCode?.trim(),
    summary.value?.destinationCity?.trim(),
  ]
    .filter(Boolean)
    .join('/');
  return origin || destination
    ? `${origin || '--'} → ${destination || '--'}`
    : '--';
});

const subscribeFailedReason = computed(
  () =>
    sanitizeVendorText(summary.value?.errorMessage) ||
    $t('tracking.status.subscribeFailed'),
);

const { open: openVendorMap } = useVendorTrackingMap();

/** 有航司单号且 env 配置齐全才给地图入口 */
const canViewMap = computed(
  () =>
    Boolean(summary.value?.businessNumber?.trim()) && hasAirTrackingMapConfig(),
);

/** 打开全局轨迹地图弹窗（可切换语言、复制免登录分享链接） */
const handleViewMap = () => {
  const businessNumber = summary.value?.businessNumber?.trim() ?? '';
  openVendorMap({
    kind: 'air',
    referenceNo: businessNumber,
    businessNumber,
  });
};

const warningColumns = computed(() => [
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
  {
    dataIndex: 'locationName',
    title: $t('tracking.detail.eventPlace'),
    width: 180,
    ellipsis: true,
  },
  {
    dataIndex: 'description',
    title: $t('tracking.detail.warningDescription'),
    minWidth: 280,
  },
]);

const warningRows = computed(() =>
  warnings.value.map((item, index) => ({
    ...item,
    key: `${item.eventCode ?? ''}-${item.eventTime ?? ''}-${index}`,
    description: sanitizeVendorText(item.description) || '--',
    locationName: item.locationName || item.locationCode || '--',
  })),
);

async function fetchDetail() {
  const airExportId = props.airExportId;
  if (!airExportId) {
    return;
  }
  loading.value = true;
  loadError.value = '';
  try {
    const detail = await getAirExportDetail(airExportId);
    isSubscribed.value = Boolean(detail.isFeituoSubscribed);
    isSubscribeSuccess.value = Boolean(detail.isFeituoSubscribeSuccess);
    summary.value = detail.feituoTracking ?? null;
    warnings.value = detail.feituoTrackingWarnings ?? [];
    trackingDetail.value = detail.feituoTrackingDetail ?? null;
  } catch (error) {
    loadError.value = sanitizeVendorText(
      error instanceof Error ? error.message : $t('tracking.detail.loadFailed'),
    );
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.airExportId,
  () => {
    void fetchDetail();
  },
  { immediate: true },
);

const handleResubscribe = () => {
  const airExportId = props.airExportId;
  if (!airExportId || resubscribing.value) {
    return;
  }
  Modal.confirm({
    title: $t('tracking.detail.resubscribe'),
    content: $t('tracking.detail.resubscribeConfirm'),
    async onOk() {
      resubscribing.value = true;
      try {
        const result = await resubscribeAirWaybillTracking({ airExportId });
        if (result.isSuccess) {
          message.success(
            result.trackingLoaded === false
              ? $t('tracking.result.dataLoading')
              : $t('tracking.detail.resubscribeSuccess'),
          );
        } else {
          message.error(
            sanitizeVendorText(result.errorMessage || result.message) ||
              $t('tracking.detail.subscribeFailed'),
          );
        }
        await fetchDetail();
      } finally {
        resubscribing.value = false;
      }
    },
  });
};
</script>

<template>
  <div class="air-tracking-panel bg-white">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <Tag v-if="dataStatusLabel" :color="dataStatusColor">{{
          dataStatusLabel
        }}</Tag>
        <span
          v-if="summary?.updateTime"
          class="text-xs text-[rgba(0,0,0,0.45)]"
        >
          {{ $t('tracking.detail.updateTime') }}：{{ summary.updateTime }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="canViewMap"
          ghost
          size="small"
          type="primary"
          @click="handleViewMap"
        >
          <template #icon>
            <IconifyIcon class="mr-1 inline-block" icon="ph:map-trifold" />
          </template>
          {{ $t('tracking.detail.viewMap') }}
        </Button>
        <Button
          v-if="canResubscribe"
          size="small"
          :loading="resubscribing"
          @click="handleResubscribe"
        >
          {{ $t('tracking.detail.resubscribe') }}
        </Button>
      </div>
    </div>

    <Spin :spinning="loading">
      <Alert
        v-if="loadError"
        type="error"
        show-icon
        class="mb-4"
        :message="loadError"
      />

      <Empty
        v-if="viewState === 'never_subscribed'"
        :description="$t('tracking.detail.neverSubscribed')"
      />

      <template v-else>
        <Alert
          v-if="viewState === 'subscribe_failed'"
          type="error"
          show-icon
          class="mb-4"
          :message="$t('tracking.detail.subscribeFailed')"
          :description="subscribeFailedReason"
        />
        <Alert
          v-else-if="viewState === 'waiting_data'"
          type="info"
          show-icon
          class="mb-4"
          :message="$t('tracking.detail.waitingData')"
          :description="$t('tracking.detail.waitingDataDesc')"
        />

        <Descriptions bordered size="small" :column="2" class="mb-4">
          <DescriptionsItem :label="$t('tracking.detail.awbNo')">
            {{ summary?.businessNumber || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.airline')">
            {{ summary?.carrierName || summary?.carrierNameEn || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.currentNode')">
            {{ currentNodeText }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.eventTime')">
            {{ summary?.currentEventTime || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.eventPlace')">
            {{
              summary?.currentLocationName ||
              summary?.currentLocationCode ||
              '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.currentFlight')">
            {{ summary?.currentFlight || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.airports')">
            {{ airportText }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.flights')">
            {{
              [summary?.firstFlight, summary?.lastFlight]
                .filter(Boolean)
                .join(' / ') || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.destinationEta')">
            {{ summary?.destinationEta || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.destinationAta')">
            {{ summary?.destinationAta || '--' }}
          </DescriptionsItem>
        </Descriptions>

        <div class="mb-1 text-sm font-medium">
          {{ $t('tracking.timeline.title') }}
        </div>
        <TrackingTimeline :nodes="timelineNodes" class="mb-4" />

        <div class="mb-2 text-sm font-medium">
          {{ $t('tracking.detail.warningTitle', [warningRows.length]) }}
        </div>
        <Table
          v-if="warningRows.length > 0"
          :columns="warningColumns"
          :data-source="warningRows"
          :pagination="false"
          :scroll="{ y: 260 }"
          row-key="key"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'description'">
              <span class="whitespace-pre-line">{{ record.description }}</span>
            </template>
          </template>
        </Table>
        <Empty
          v-else
          :description="$t('tracking.detail.warningEmpty')"
          :image="undefined"
          class="!my-2"
        />
      </template>
    </Spin>
  </div>
</template>
