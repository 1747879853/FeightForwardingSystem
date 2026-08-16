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
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';
import {
  getContainerTracking,
  subscribeContainerTracking,
} from '#/api/tracking/feituo-tracking-admin';
import { $t } from '#/locales';
import { sanitizeVendorText } from '#/utils/vendor-text';

import { resolveContainerTrackingViewState } from './container-tracking';
import {
  getTrackingDataStatusColor,
  getTrackingDataStatusLabel,
} from './data-status';
import { buildContainerTimelineNodes } from './timeline-nodes';
import TrackingTimeline from './tracking-timeline.vue';
import { useVendorTrackingMap } from './use-vendor-tracking-map';

/**
 * 海运集装箱运踪面板（列表运踪弹窗与编辑页运踪 Tab 共用）。
 *
 * - 摘要与预警：列表场景由调用方把行上的摘要传进来；编辑页场景置 `loadDetail` 由本组件取详情
 *   （详情才有全量预警明细）。
 * - 箱清单与轨迹页链接：统一读本地快照接口，不直接请求服务商。
 */
interface Props {
  /** 业务单 Id（海运出口 Id / 海运进口 Id） */
  orderId?: string;
  bizType: FeituoTrackingAdminApi.TrackingBizType;
  /** 运踪摘要；不传且 `loadDetail=true` 时由本组件从详情接口取 */
  summary?: FeituoTrackingAdminApi.ContainerTrackingSummaryDto | null;
  warnings?: FeituoTrackingAdminApi.ContainerTrackingWarningDto[] | null;
  isSubscribed?: boolean;
  isSubscribeSuccess?: boolean;
  /** 是否自行拉业务单详情补齐摘要与全量预警（编辑页 Tab 用） */
  loadDetail?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  orderId: '',
  summary: null,
  warnings: null,
  isSubscribed: undefined,
  isSubscribeSuccess: undefined,
  loadDetail: false,
});

const loading = ref(false);
const refreshing = ref(false);
const loadError = ref('');
const tracking = ref<FeituoTrackingAdminApi.ContainerTrackingDto | null>(null);
/** `loadDetail` 模式下从详情接口取回的摘要、预警与订阅状态 */
const detailSummary =
  ref<FeituoTrackingAdminApi.ContainerTrackingSummaryDto | null>(null);
const detailWarnings = ref<
  FeituoTrackingAdminApi.ContainerTrackingWarningDto[]
>([]);
const detailSubscribed = ref<boolean | undefined>();
const detailSubscribeSuccess = ref<boolean | undefined>();

const { hasAccessByCodes } = useAccess();
const canRefresh = computed(() => hasAccessByCodes(['Admin.ExternalApi.Use']));

const summary = computed(() => props.summary ?? detailSummary.value);
const warnings = computed(() => props.warnings ?? detailWarnings.value);
const isSubscribed = computed(
  () => props.isSubscribed ?? detailSubscribed.value,
);
const isSubscribeSuccess = computed(
  () => props.isSubscribeSuccess ?? detailSubscribeSuccess.value,
);
const result = computed(() => tracking.value?.data?.result ?? null);

const viewState = computed(() =>
  resolveContainerTrackingViewState({
    id: props.orderId,
    isFeituoSubscribed: isSubscribed.value,
    isFeituoSubscribeSuccess: isSubscribeSuccess.value,
    feituoTracking: summary.value,
  }),
);

const subscribeNo = computed(
  () =>
    summary.value?.billNo?.trim() ||
    summary.value?.containerNo?.trim() ||
    result.value?.billNo?.trim() ||
    result.value?.containerNo?.trim() ||
    '--',
);

const dataStatusLabel = computed(() =>
  getTrackingDataStatusLabel(summary.value?.statusCategory),
);
const dataStatusColor = computed(() =>
  getTrackingDataStatusColor(summary.value?.statusCategory),
);

const currentNodeText = computed(() => {
  const description = summary.value?.currentDescriptionCn?.trim();
  if (!description) {
    return '--';
  }
  return summary.value?.currentIsEsti === 'Y'
    ? `${description}${$t('tracking.status.estimatedSuffix')}`
    : description;
});

const vesselVoyageText = computed(() => {
  const parts = [
    summary.value?.firstVesselName?.trim(),
    summary.value?.firstVesselVoyage?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : '--';
});

const rolledContainers = computed(
  () => summary.value?.offLoadContainerNos ?? [],
);

const latestWarningText = computed(() =>
  sanitizeVendorText(summary.value?.latestWarningDescription),
);

const subscribeFailedReason = computed(
  () =>
    sanitizeVendorText(summary.value?.errorMessage) ||
    sanitizeVendorText(tracking.value?.errorMessage) ||
    $t('tracking.status.subscribeFailed'),
);

const { open: openVendorMap } = useVendorTrackingMap();

/** 轨迹页链接：优先摘要，其次本地快照；都没有则不展示地图入口 */
const mapUrl = computed(
  () =>
    summary.value?.iframeUrl?.trim() || result.value?.iframeUrl?.trim() || '',
);
const mapShortUrl = computed(
  () =>
    summary.value?.iframeShortUrl?.trim() ||
    result.value?.iframeShortUrl?.trim() ||
    '',
);

/** 打开全局轨迹地图弹窗（可切换语言、复制免登录分享链接） */
const handleViewMap = () => {
  openVendorMap({
    kind: 'ocean',
    referenceNo: subscribeNo.value === '--' ? '' : subscribeNo.value,
    iframeUrl: mapUrl.value,
    iframeShortUrl: mapShortUrl.value,
  });
};

const containerColumns = computed(() => [
  {
    dataIndex: 'containerNo',
    title: $t('tracking.detail.containerNo'),
    width: 150,
  },
  {
    dataIndex: 'containerTypeGroup',
    title: $t('tracking.detail.containerType'),
    width: 110,
  },
  {
    dataIndex: 'currentStatusDescriptionCn',
    title: $t('tracking.detail.containerStatus'),
    minWidth: 160,
  },
  {
    dataIndex: 'eventPlace',
    title: $t('tracking.detail.eventPlace'),
    minWidth: 140,
  },
  {
    dataIndex: 'offLoadOfCarrier',
    title: $t('tracking.detail.rolled'),
    width: 90,
  },
]);

const containerRows = computed(() => result.value?.containers ?? []);

/** 整票时间轴：各箱节点合并去重后按时间升序 */
const timelineNodes = computed(() => buildContainerTimelineNodes(result.value));

const warningColumns = computed(() => [
  {
    dataIndex: 'eventTime',
    title: $t('tracking.detail.eventTime'),
    width: 160,
  },
  {
    dataIndex: 'eventCategory',
    title: $t('tracking.detail.warningCategory'),
    width: 110,
  },
  {
    dataIndex: 'equipmentCode',
    title: $t('tracking.detail.containerNo'),
    width: 140,
  },
  {
    dataIndex: 'description',
    title: $t('tracking.detail.warningDescription'),
    minWidth: 260,
  },
]);

const warningRows = computed(() =>
  warnings.value.map((item, index) => ({
    ...item,
    key: `${item.eventCode ?? ''}-${item.eventTime ?? ''}-${index}`,
    description: sanitizeVendorText(item.description) || '--',
    equipmentCode: item.equipmentCode || '--',
  })),
);

async function fetchModuleDetail() {
  if (!props.loadDetail || !props.orderId) {
    return;
  }
  const detail = await (props.bizType === 1
    ? getSeaImportDetail(props.orderId)
    : getSeaExportDetail(props.orderId));
  detailSubscribed.value = Boolean(detail.isFeituoSubscribed);
  detailSubscribeSuccess.value = Boolean(detail.isFeituoSubscribeSuccess);
  detailSummary.value = detail.feituoTracking ?? null;
  detailWarnings.value = detail.feituoTrackingWarnings ?? [];
}

async function fetchTracking() {
  if (!props.orderId) {
    return;
  }
  tracking.value = await getContainerTracking({
    bizType: props.bizType,
    orderId: props.orderId,
  });
}

async function loadAll() {
  if (!props.orderId) {
    return;
  }
  loading.value = true;
  loadError.value = '';
  try {
    await fetchModuleDetail();
    // 未订阅的票没有快照可读，省掉一次请求
    if (props.loadDetail ? detailSubscribed.value : props.isSubscribed) {
      await fetchTracking();
    }
  } catch (error) {
    loadError.value = sanitizeVendorText(
      error instanceof Error ? error.message : $t('tracking.detail.loadFailed'),
    );
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.orderId, props.bizType],
  () => {
    tracking.value = null;
    detailSummary.value = null;
    detailWarnings.value = [];
    detailSubscribed.value = undefined;
    detailSubscribeSuccess.value = undefined;
    void loadAll();
  },
  { immediate: true },
);

/**
 * 手动刷新运踪：服务商的订阅与查询是同一个接口，重复订阅等同于刷新最新快照，
 * 一票只保留一条订阅记录，不会产生重复订阅。
 */
const handleRefresh = async () => {
  if (!props.orderId || refreshing.value) {
    return;
  }
  refreshing.value = true;
  try {
    const res = await subscribeContainerTracking({
      bizType: props.bizType,
      orderIds: [props.orderId],
    });
    const item = res.items?.[0];
    if (item && !item.isSuccess) {
      message.error(
        sanitizeVendorText(item.errorMessage || item.message) ||
          $t('tracking.detail.subscribeFailed'),
      );
    } else {
      message.success($t('tracking.detail.refreshSuccess'));
    }
    await loadAll();
  } finally {
    refreshing.value = false;
  }
};
</script>

<template>
  <div class="container-tracking-panel bg-white">
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
      <div class="flex items-center gap-2">
        <Button
          v-if="mapUrl || mapShortUrl"
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
          v-if="canRefresh && viewState !== 'never_subscribed'"
          size="small"
          :loading="refreshing"
          :disabled="loading"
          @click="handleRefresh"
        >
          {{ $t('tracking.detail.refresh') }}
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

        <Alert
          v-if="summary?.hasOffLoadOfCarrier"
          type="warning"
          show-icon
          class="mb-4"
          :message="$t('tracking.detail.rolledTitle')"
          :description="
            rolledContainers.length > 0
              ? $t('tracking.detail.rolledContainers', [
                  rolledContainers.join('、'),
                ])
              : undefined
          "
        />

        <!-- 列表场景只有最近一条预警；编辑页场景下方有全量明细表，这里不重复提示 -->
        <Alert
          v-if="summary?.hasWarning && warningRows.length === 0"
          type="warning"
          show-icon
          class="mb-4"
          :message="
            $t('tracking.detail.warningTitle', [summary.warningCount ?? 1])
          "
        >
          <template #description>
            <div class="whitespace-pre-line">
              {{ latestWarningText || $t('tracking.warning.noDescription') }}
              <span v-if="summary?.latestWarningTime" class="block text-xs">
                {{ $t('tracking.warning.timeLabel') }}：{{
                  summary.latestWarningTime
                }}
              </span>
            </div>
          </template>
        </Alert>

        <Descriptions bordered size="small" :column="2" class="mb-4">
          <DescriptionsItem :label="$t('tracking.detail.subscribeNo')">
            {{ subscribeNo }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.dataStatus')">
            {{ dataStatusLabel || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.currentNode')">
            {{ currentNodeText }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.eventTime')">
            {{ summary?.currentEventTime || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.eventPlace')">
            {{ summary?.currentEventPlace || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.firstVessel')">
            {{ vesselVoyageText }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.polEtd')">
            {{ summary?.polEtd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.polAtd')">
            {{ summary?.polAtd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.podEta')">
            {{ summary?.podEta || summary?.podSta || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.podAta')">
            {{ summary?.podAta || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.bookingStatus')">
            {{ summary?.bookingStatusCn || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('tracking.detail.totalContainers')">
            {{ summary?.bookingTotalContainers || '--' }}
          </DescriptionsItem>
        </Descriptions>

        <div class="mb-1 mt-4 text-sm font-medium">
          {{ $t('tracking.timeline.title') }}
        </div>
        <TrackingTimeline :nodes="timelineNodes" class="mb-4" />

        <Table
          v-if="containerRows.length > 0"
          :columns="containerColumns"
          :data-source="containerRows"
          :pagination="false"
          :scroll="{ y: 240 }"
          size="small"
          :row-key="(record, index) => `${record.containerNo ?? ''}-${index}`"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'offLoadOfCarrier'">
              <Tag v-if="record.offLoadOfCarrier" color="warning">
                {{ $t('tracking.detail.rolledYes') }}
              </Tag>
              <span v-else class="text-[rgba(0,0,0,0.45)]">--</span>
            </template>
          </template>
        </Table>

        <template v-if="loadDetail">
          <div class="mb-2 mt-4 text-sm font-medium">
            {{ $t('tracking.detail.warningTitle', [warningRows.length]) }}
          </div>
          <Table
            v-if="warningRows.length > 0"
            :columns="warningColumns"
            :data-source="warningRows"
            :pagination="false"
            :scroll="{ y: 240 }"
            row-key="key"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'description'">
                <span class="whitespace-pre-line">{{
                  record.description
                }}</span>
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
      </template>
    </Spin>
  </div>
</template>
