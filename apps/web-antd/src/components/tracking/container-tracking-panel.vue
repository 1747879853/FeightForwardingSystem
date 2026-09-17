<script lang="ts" setup>
import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useAccess } from '@vben/access';

import { Alert, Button, Empty, message, Spin, Tag } from 'ant-design-vue';

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
import { buildContainerTimelineGroups } from './timeline-nodes';
import TrackingTimeline from './tracking-timeline.vue';
import TrackingWarningModal from './tracking-warning-modal.vue';
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
const warningModalOpen = ref(false);
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
    result.value?.billNo?.trim() ||
    result.value?.containerNo?.trim() ||
    summary.value?.billNo?.trim() ||
    summary.value?.containerNo?.trim() ||
    '--',
);

const dataStatusLabel = computed(() =>
  (result.value?.statusCategory ?? summary.value?.statusCategory) === 'COMPLETE'
    ? $t('tracking.overview.ended')
    : getTrackingDataStatusLabel(
        result.value?.statusCategory ?? summary.value?.statusCategory,
      ),
);
const dataStatusColor = computed(() =>
  getTrackingDataStatusColor(
    result.value?.statusCategory ?? summary.value?.statusCategory,
  ),
);

/** 仅展示当前完整快照中的航段，不用整票摘要拼凑港口和船期。 */
function textField(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '--';
}
const routeRows = computed(() =>
  (result.value?.routes ?? []).map((route) => {
    const details =
      route.modeDetails && typeof route.modeDetails === 'object'
        ? (route.modeDetails as Record<string, unknown>)
        : {};
    return {
      origin: textField(route.polName || route.polCode),
      destination: textField(route.podName || route.podCode),
      mode: textField(route.transportMode),
      vessel:
        [details.vessel, details.voyage]
          .filter((value) => typeof value === 'string' && value.trim())
          .join(' / ') || '--',
      etd: textField(details.polEtd),
      atd: textField(details.polAtd),
      eta: textField(details.podEta),
      ata: textField(details.podAta),
    };
  }),
);
const updatedAt = computed(
  () => result.value?.updateTime || summary.value?.updateTime,
);
const carrierName = computed(
  () =>
    result.value?.carrier?.nameCn ||
    result.value?.carrier?.nameEn ||
    result.value?.carrier?.code ||
    '--',
);

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

/** 每个箱独立展示轨迹，保留后端返回顺序。 */
const timelineGroups = computed(() =>
  buildContainerTimelineGroups(result.value).map((group, index) => {
    const box = result.value?.containers?.[index];
    return {
      ...group,
      currentStatus:
        box?.currentStatusDescriptionCn ||
        box?.currentStatusDescriptionEn ||
        box?.currentStatusCode ||
        $t('tracking.timeline.state.unknown'),
      currentPlace: box?.eventPlace || box?.portCode,
      rolled: box?.offLoadOfCarrier === true,
    };
  }),
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
  <div class="container-tracking-panel">
    <div class="tracking-toolbar">
      <div class="flex flex-wrap items-center gap-2">
        <Tag v-if="dataStatusLabel" :color="dataStatusColor">
          {{ dataStatusLabel }}
        </Tag>
        <span v-if="updatedAt" class="tracking-updated">
          {{ $t('tracking.detail.updateTime') }}：{{ updatedAt }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- 无预警不显示入口；列表场景拿不到全量明细，warnings 恒空也就不会出现 -->
        <Button
          v-if="warnings.length > 0"
          danger
          size="small"
          @click="warningModalOpen = true"
        >
          <template #icon>
            <IconifyIcon class="mr-1 inline-block" icon="ph:warning" />
          </template>
          {{ $t('tracking.detail.warningEntry') }} ({{ warnings.length }})
        </Button>
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
          v-else-if="
            viewState === 'waiting_data' &&
            !result?.routes?.length &&
            !result?.containers?.some((box) => box.status?.length)
          "
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

        <!-- 列表场景只有最近一条预警；编辑页场景走「异常预警」按钮看全量明细，这里不重复提示 -->
        <Alert
          v-if="summary?.hasWarning && warnings.length === 0"
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

        <section class="shipment-overview">
          <div class="shipment-identity">
            <div>
              <span class="eyebrow">{{
                $t('tracking.detail.subscribeNo')
              }}</span>
              <h2>{{ subscribeNo }}</h2>
            </div>
            <div class="shipment-meta">
              <span
                ><span class="eyebrow">{{
                  $t('tracking.overview.carrier')
                }}</span
                >{{ carrierName }}</span
              >
              <span
                ><span class="eyebrow">{{
                  $t('tracking.detail.bookingStatus')
                }}</span
                >{{ result?.booking?.bookingStatusCn || '--' }}</span
              >
              <span
                ><span class="eyebrow">{{
                  $t('tracking.detail.totalContainers')
                }}</span
                >{{ result?.booking?.totalContainers || '--' }}</span
              >
            </div>
          </div>
          <div v-if="routeRows.length" class="route-list">
            <article
              v-for="(route, index) in routeRows"
              :key="index"
              class="route-row"
            >
              <div class="route-summary">
                <div class="route-heading">
                  <span class="route-index">{{
                    String(index + 1).padStart(2, '0')
                  }}</span
                  ><strong>{{ route.origin }}</strong
                  ><IconifyIcon icon="ph:arrow-right" /><strong>{{
                    route.destination
                  }}</strong>
                </div>
                <div class="route-vessel">
                  {{ route.mode }} <span>·</span> {{ route.vessel }}
                </div>
              </div>
              <dl class="route-times">
                <div>
                  <dt>{{ $t('tracking.overview.etd') }}</dt>
                  <dd>{{ route.etd }}</dd>
                </div>
                <div>
                  <dt>{{ $t('tracking.overview.atd') }}</dt>
                  <dd>{{ route.atd }}</dd>
                </div>
                <div>
                  <dt>{{ $t('tracking.overview.eta') }}</dt>
                  <dd>{{ route.eta }}</dd>
                </div>
                <div>
                  <dt>{{ $t('tracking.overview.ata') }}</dt>
                  <dd>{{ route.ata }}</dd>
                </div>
              </dl>
            </article>
          </div>
          <p v-else class="route-empty">
            {{ $t('tracking.overview.noRoute') }}
          </p>
        </section>

        <section class="container-tracks">
          <h3 class="container-tracks__title">
            {{ $t('tracking.timeline.title') }}
            <span class="route-note">{{
              $t('tracking.overview.localTime')
            }}</span>
          </h3>
          <Empty
            v-if="timelineGroups.length === 0"
            :description="$t('tracking.timeline.empty')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
          <details
            v-for="(group, index) in timelineGroups"
            :key="`${orderId}-${group.containerNo}-${index}`"
            class="container-track"
          >
            <summary class="container-track__header">
              <IconifyIcon
                icon="ph:shipping-container"
                class="text-xl text-primary"
              />
              <strong class="container-track__number">{{
                group.containerNo
              }}</strong>
              <Tag v-if="group.containerType">{{ group.containerType }}</Tag>
              <span class="container-track__count">{{
                $t('tracking.timeline.nodeCount', [group.nodes.length])
              }}</span>
              <span class="container-track__status">{{
                group.currentStatus
              }}</span>
              <span v-if="group.currentPlace" class="container-track__place">{{
                group.currentPlace
              }}</span>
              <Tag v-if="group.rolled" color="warning">{{
                $t('tracking.detail.rolledYes')
              }}</Tag>
              <IconifyIcon
                icon="ph:caret-down"
                class="container-track__chevron"
              />
            </summary>
            <TrackingTimeline :nodes="group.nodes" layout="vertical" />
          </details>
        </section>
      </template>
    </Spin>

    <TrackingWarningModal
      v-model:open="warningModalOpen"
      kind="ocean"
      :ocean-warnings="warnings"
    />
  </div>
</template>

<style scoped>
.container-tracking-panel {
  padding: 4px;
  container-type: inline-size;
  color: hsl(var(--foreground));
}

.tracking-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tracking-updated,
.eyebrow,
.route-note,
.route-empty {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.eyebrow {
  display: block;
  margin-bottom: 6px;
  font-weight: 400;
}

.shipment-overview {
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.shipment-identity {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  align-items: center;
  padding: 16px 20px;
  background: hsl(var(--muted) / 35%);
}

.shipment-identity h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: 0.02em;
  overflow-wrap: anywhere;
}

.shipment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  font-size: 13px;
}

.route-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(480px, 1.4fr);
  gap: 20px 32px;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid hsl(var(--border));
}

.route-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 15px;
}

.route-index {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--primary));
}

.route-vessel {
  margin: 6px 0 0 28px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.route-vessel span {
  margin: 0 8px;
}

.route-times {
  display: grid;
  grid-template-rows: repeat(2, auto);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-flow: column;
  gap: 8px 28px;
  margin: 0;
}

.route-times > div {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
}

.route-times dt {
  margin-bottom: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.route-times dd {
  margin: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.route-note {
  margin-left: auto;
  font-weight: 400;
}

.route-empty {
  padding: 20px 24px;
  margin: 0;
}

.container-tracks {
  margin: 20px 0 12px;
}

.container-tracks__title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: baseline;
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
}

.container-track {
  margin-bottom: 10px;
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.container-track__header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 18px 20px;
  cursor: pointer;
  list-style: none;
  transition: background 0.15s;
}

.container-track__header::-webkit-details-marker {
  display: none;
}

.container-track__header:hover {
  background: hsl(var(--muted) / 45%);
}

.container-track__header:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: -3px;
}

.container-track[open] > summary {
  background: hsl(var(--muted) / 25%);
  border-bottom: 1px solid hsl(var(--border));
}

.container-track__number {
  font-size: 14px;
  letter-spacing: 0.04em;
  overflow-wrap: anywhere;
}

.container-track__count {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.container-track__status {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
}

.container-track__place {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.container-track__chevron {
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
}

.container-track[open] .container-track__chevron {
  transform: rotate(180deg);
}

@container (max-width: 900px) {
  .route-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
}

@container (max-width: 560px) {
  .route-times {
    grid-template-rows: auto;
    grid-template-columns: minmax(0, 1fr);
    grid-auto-flow: row;
  }

  .route-note {
    margin-left: 0;
  }
}

@media (max-width: 640px) {
  .shipment-identity,
  .route-row {
    padding: 18px 16px;
  }

  .container-track__header {
    padding: 16px 12px;
  }

  .container-track__status {
    margin-left: 0;
  }
}
</style>
