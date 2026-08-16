<script lang="ts" setup>
import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Tag,
} from 'ant-design-vue';

import { getAirExportDetail } from '#/api/air-export/air-export-admin';
import { $t } from '#/locales';
import { sanitizeVendorText } from '#/utils/vendor-text';

import type { AirTrackingOpenPayload } from './air-tracking';
import { resolveAirTrackingViewState } from './air-tracking';
import { hasAirTrackingMapConfig } from './build-air-tracking-map-src';
import {
  getTrackingDataStatusColor,
  getTrackingDataStatusLabel,
} from './data-status';
import { buildAirTimelineNodes } from './timeline-nodes';
import TrackingTimeline from './tracking-timeline.vue';
import { useVendorTrackingMap } from './use-vendor-tracking-map';

/**
 * 空运运踪详情弹窗。
 *
 * 摘要来自列表行（空运没有独立的轨迹查询接口）；轨迹节点只在详情里下发，
 * 因此打开弹窗时再补一次业务单详情。轨迹地图走全局地图弹窗（可切换语言、复制免登录分享链接）。
 */
const payload = ref<AirTrackingOpenPayload | null>(null);
const timelineLoading = ref(false);
const trackingDetail = ref<FeituoTrackingAdminApi.AirDataDto | null>(null);

const summary = computed(() => payload.value?.summary ?? null);

const timelineNodes = computed(() =>
  buildAirTimelineNodes(trackingDetail.value),
);

const viewState = computed(() =>
  resolveAirTrackingViewState({
    id: payload.value?.airExportId ?? '',
    isFeituoSubscribed: payload.value?.isSubscribed,
    isFeituoSubscribeSuccess: payload.value?.isSubscribeSuccess,
    feituoTracking: summary.value,
  }),
);

const modalTitle = computed(() => {
  const label = payload.value?.orderLabel;
  return label
    ? $t('tracking.detail.titleWithOrder', [label])
    : $t('tracking.detail.title');
});

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

const flightText = computed(() => {
  const parts = [
    summary.value?.firstFlight?.trim(),
    summary.value?.lastFlight?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? [...new Set(parts)].join(' / ') : '--';
});

const cargoText = computed(() => {
  const pieces = summary.value?.cargoPieces;
  const weight = summary.value?.cargoWeight;
  const parts: string[] = [];
  if (pieces !== null && pieces !== undefined) {
    parts.push($t('tracking.detail.cargoPieces', [pieces]));
  }
  if (weight !== null && weight !== undefined) {
    parts.push($t('tracking.detail.cargoWeight', [weight]));
  }
  return parts.length > 0 ? parts.join(' / ') : '--';
});

const warningText = computed(() =>
  sanitizeVendorText(summary.value?.latestWarningDescription),
);

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

/** 轨迹节点仅详情下发；取不到时只是没有时间轴，不影响摘要展示 */
async function fetchTimeline() {
  const airExportId = payload.value?.airExportId;
  if (!airExportId || !payload.value?.isSubscribed) {
    return;
  }
  timelineLoading.value = true;
  try {
    const detail = await getAirExportDetail(airExportId);
    trackingDetail.value = detail.feituoTrackingDetail ?? null;
  } catch {
    trackingDetail.value = null;
  } finally {
    timelineLoading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('tracking.detail.close'),
  onOpenChange(isOpen) {
    trackingDetail.value = null;
    if (!isOpen) {
      payload.value = null;
      return;
    }
    payload.value = modalApi.getData<AirTrackingOpenPayload>() ?? null;
    void fetchTimeline();
  },
});
</script>

<template>
  <Modal :title="modalTitle" class="w-[900px]">
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

      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <Tag v-if="dataStatusLabel" :color="dataStatusColor">
            {{ dataStatusLabel }}
          </Tag>
          <span
            v-if="summary?.updateTime"
            class="text-xs text-[rgba(0,0,0,0.45)]"
          >
            {{ $t('tracking.detail.updateTime') }}：{{ summary.updateTime }}
          </span>
        </div>
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
      </div>

      <Alert
        v-if="summary?.hasWarning"
        type="warning"
        show-icon
        class="mb-4"
        :message="
          $t('tracking.detail.warningTitle', [summary.warningCount ?? 1])
        "
      >
        <template #description>
          <div class="whitespace-pre-line">
            {{ warningText || $t('tracking.warning.noDescription') }}
            <span v-if="summary?.latestWarningTime" class="block text-xs">
              {{ $t('tracking.warning.timeLabel') }}：{{
                summary.latestWarningTime
              }}
            </span>
          </div>
        </template>
      </Alert>

      <Descriptions bordered size="small" :column="2">
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
            summary?.currentLocationName || summary?.currentLocationCode || '--'
          }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('tracking.detail.currentFlight')">
          {{ summary?.currentFlight || '--' }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('tracking.detail.airports')">
          {{ airportText }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('tracking.detail.flights')">
          {{ flightText }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('tracking.detail.destinationEta')">
          {{ summary?.destinationEta || '--' }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('tracking.detail.destinationAta')">
          {{ summary?.destinationAta || '--' }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('tracking.detail.cargo')">
          {{ cargoText }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('tracking.detail.transitType')">
          {{
            summary?.direct === null || summary?.direct === undefined
              ? '--'
              : summary.direct
                ? $t('tracking.detail.direct')
                : $t('tracking.detail.transit')
          }}
        </DescriptionsItem>
      </Descriptions>

      <div class="mb-1 mt-4 text-sm font-medium">
        {{ $t('tracking.timeline.title') }}
      </div>
      <Spin :spinning="timelineLoading">
        <TrackingTimeline :nodes="timelineNodes" />
      </Spin>
    </template>
  </Modal>
</template>
