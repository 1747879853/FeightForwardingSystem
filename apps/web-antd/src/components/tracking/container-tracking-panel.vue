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

const ticketMeta = computed(() =>
  [
    carrierName.value,
    result.value?.booking?.bookingStatusCn || '--',
    result.value?.booking?.totalContainers || '--',
  ].join(' · '),
);

function isBlankTime(value: string) {
  return !value || value === '--';
}

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
          <header class="shipment-ticket">
            <strong class="shipment-ticket__no">{{ subscribeNo }}</strong>
            <span class="shipment-ticket__meta">{{ ticketMeta }}</span>
          </header>
          <div class="ticket-perforation" aria-hidden="true">
            <span></span>
          </div>
          <div v-if="routeRows.length" class="voyage-list">
            <article
              v-for="(route, index) in routeRows"
              :key="index"
              class="voyage"
            >
              <div class="voyage-board">
                <div class="voyage-port voyage-port--from">
                  <strong>{{ route.origin }}</strong>
                </div>
                <div class="voyage-spine" aria-hidden="true">
                  <i class="voyage-spine__dot"></i>
                  <span class="voyage-spine__track">
                    <i class="voyage-spine__rail"></i>
                    <span class="voyage-spine__mark">
                      <IconifyIcon icon="ph:boat-fill" />
                    </span>
                  </span>
                  <i class="voyage-spine__dot voyage-spine__dot--end"></i>
                </div>
                <div class="voyage-port voyage-port--to">
                  <strong>{{ route.destination }}</strong>
                </div>
                <p class="voyage-vessel">
                  {{ route.mode }} · {{ route.vessel }}
                </p>
                <dl class="voyage-times voyage-times--from">
                  <div>
                    <dt>{{ $t('tracking.overview.etd') }}</dt>
                    <dd :class="{ 'is-empty': isBlankTime(route.etd) }">
                      {{ route.etd }}
                    </dd>
                  </div>
                  <div>
                    <dt>{{ $t('tracking.overview.atd') }}</dt>
                    <dd :class="{ 'is-empty': isBlankTime(route.atd) }">
                      {{ route.atd }}
                    </dd>
                  </div>
                </dl>
                <dl class="voyage-times voyage-times--to">
                  <div>
                    <dt>{{ $t('tracking.overview.eta') }}</dt>
                    <dd :class="{ 'is-empty': isBlankTime(route.eta) }">
                      {{ route.eta }}
                    </dd>
                  </div>
                  <div>
                    <dt>{{ $t('tracking.overview.ata') }}</dt>
                    <dd :class="{ 'is-empty': isBlankTime(route.ata) }">
                      {{ route.ata }}
                    </dd>
                  </div>
                </dl>
              </div>
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
            :open="index === 0"
          >
            <summary class="container-track__header">
              <div class="container-track__lead">
                <IconifyIcon
                  icon="ph:shipping-container"
                  class="container-track__icon"
                />
                <div class="container-track__identity">
                  <strong class="container-track__number">{{
                    group.containerNo
                  }}</strong>
                  <Tag v-if="group.containerType">{{
                    group.containerType
                  }}</Tag>
                  <Tag v-if="group.rolled" color="warning">{{
                    $t('tracking.detail.rolledYes')
                  }}</Tag>
                </div>
              </div>
              <div class="container-track__progress">
                <span class="container-track__status">{{
                  group.currentStatus
                }}</span>
                <span v-if="group.currentPlace" class="container-track__place">
                  {{ group.currentPlace }}
                </span>
              </div>
              <span class="container-track__count">{{
                $t('tracking.timeline.nodeCount', [group.nodes.length])
              }}</span>
              <IconifyIcon
                icon="ph:caret-down"
                class="container-track__chevron"
              />
            </summary>
            <TrackingTimeline :nodes="group.nodes" />
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
  padding: 0;
  -webkit-font-smoothing: antialiased;
  container-type: inline-size;
  color: rgb(0 0 0 / 88%);
}

.tracking-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tracking-updated,
.route-note,
.route-empty {
  font-size: 12px;
  line-height: 1.4;
  color: rgb(60 60 67 / 56%);
}

.shipment-overview,
.container-track {
  overflow: hidden;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
}

.shipment-ticket {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  align-items: baseline;
  justify-content: space-between;
  padding: 16px 20px 12px;
}

.shipment-ticket__no {
  font-size: 22px;
  font-weight: 620;
  line-height: 1.15;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}

.shipment-ticket__meta {
  font-size: 13px;
  line-height: 1.35;
  color: rgb(60 60 67 / 56%);
}

.ticket-perforation {
  position: relative;
  height: 16px;
}

.ticket-perforation::before,
.ticket-perforation::after {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  content: '';
  background: #f2f2f7;
  border: 0;
  border-radius: 50%;
  transform: translateY(-50%);
}

.ticket-perforation::before {
  left: -8px;
}

.ticket-perforation::after {
  right: -8px;
}

.ticket-perforation span {
  position: absolute;
  inset: 50% 16px auto;
  border-top: 0.5px dashed rgb(60 60 67 / 22%);
}

.voyage {
  padding: 6px 20px 18px;
}

.voyage + .voyage {
  border-top: 0.5px solid rgb(60 60 67 / 8%);
}

.voyage-board {
  display: grid;
  grid-template-areas:
    'from spine to'
    'fromTime vessel toTime';
  grid-template-columns: minmax(0, 1fr) minmax(88px, 1.05fr) minmax(0, 1fr);
  gap: 6px 10px;
  align-items: center;
}

.voyage-port--from {
  grid-area: from;
}

.voyage-port--to {
  grid-area: to;
  text-align: right;
}

.voyage-port strong {
  font-size: 20px;
  font-weight: 590;
  line-height: 1.25;
  letter-spacing: -0.028em;
  overflow-wrap: anywhere;
}

.voyage-spine {
  display: flex;
  grid-area: spine;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 28px;
  padding: 0 2px;
}

.voyage-spine__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  background: #007aff;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(0 122 255 / 12%);
}

.voyage-spine__dot--end {
  background: #34c759;
  box-shadow: 0 0 0 4px rgb(52 199 89 / 12%);
}

.voyage-spine__track {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
}

.voyage-spine__rail {
  position: absolute;
  inset: 50% 0 auto;
  height: 2px;
  background: linear-gradient(
    90deg,
    #007aff 0%,
    rgb(0 122 255 / 28%) 24%,
    rgb(60 60 67 / 14%) 50%,
    rgb(52 199 89 / 32%) 76%,
    #34c759 100%
  );
  border-radius: 2px;
  transform: translateY(-50%);
}

.voyage-spine__mark {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  color: #007aff;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 122 255 / 16%);
}

.voyage-times {
  display: grid;
  gap: 4px 16px;
  margin: 0;
}

.voyage-times--from {
  grid-area: fromTime;
}

.voyage-times--to {
  grid-area: toTime;
  justify-items: end;
  text-align: right;
}

.voyage-times > div {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.voyage-times dt {
  margin: 0;
  font-size: 11px;
  font-weight: 510;
  color: rgb(60 60 67 / 48%);
}

.voyage-times dd {
  margin: 0;
  font-size: 13px;
  font-weight: 590;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.voyage-times dd.is-empty {
  font-weight: 400;
  color: rgb(60 60 67 / 36%);
}

.voyage-vessel {
  grid-area: vessel;
  align-self: start;
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  color: rgb(60 60 67 / 52%);
  text-align: center;
  overflow-wrap: anywhere;
}

.route-note {
  margin-left: auto;
  font-weight: 400;
}

.route-empty {
  padding: 8px 20px 18px;
  margin: 0;
}

.container-tracks {
  margin: 18px 0 4px;
}

.container-tracks__title {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: baseline;
  padding: 0 4px;
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 590;
  color: rgb(60 60 67 / 56%);
}

.container-track {
  margin-bottom: 8px;
}

.container-track__header {
  display: grid;
  grid-template-columns: minmax(160px, 1.1fr) minmax(120px, 1.3fr) auto auto;
  gap: 6px 14px;
  align-items: center;
  padding: 11px 14px;
  cursor: pointer;
  list-style: none;
  transition: background 0.15s ease;
}

.container-track__header::-webkit-details-marker {
  display: none;
}

.container-track__header:hover {
  background: rgb(120 120 128 / 6%);
}

.container-track__header:focus-visible {
  outline: 2px solid #007aff;
  outline-offset: -3px;
}

.container-track[open] > summary {
  background: rgb(120 120 128 / 5%);
  border-bottom: 0.5px solid rgb(60 60 67 / 10%);
}

.container-track__lead {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.container-track__icon {
  flex-shrink: 0;
  font-size: 18px;
  color: #007aff;
}

.container-track__identity {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  align-items: center;
  min-width: 0;
}

.container-track__number {
  font-size: 14px;
  font-weight: 590;
  letter-spacing: 0.02em;
  overflow-wrap: anywhere;
}

.container-track__progress {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.container-track__count {
  font-size: 12px;
  color: rgb(60 60 67 / 56%);
  white-space: nowrap;
}

.container-track__status {
  font-size: 13px;
  font-weight: 590;
  overflow-wrap: anywhere;
}

.container-track__place {
  font-size: 12px;
  color: rgb(60 60 67 / 56%);
  overflow-wrap: anywhere;
}

.container-track__chevron {
  flex-shrink: 0;
  color: rgb(60 60 67 / 36%);
  transition: transform 0.18s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.container-track[open] .container-track__chevron {
  transform: rotate(180deg);
}

@container (max-width: 720px) {
  .container-track__header {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .container-track__progress {
    grid-column: 1 / -2;
  }
}

@container (max-width: 560px) {
  .shipment-ticket {
    padding: 14px 14px 10px;
  }

  .voyage {
    padding-right: 14px;
    padding-left: 14px;
  }

  .voyage-port strong {
    font-size: 17px;
  }

  .route-note {
    margin-left: 0;
  }

  .container-track__header {
    grid-template-columns: minmax(0, 1fr) auto;
    padding-right: 12px;
    padding-left: 12px;
  }

  .container-track__progress,
  .container-track__count {
    grid-column: 1;
  }
}
</style>
