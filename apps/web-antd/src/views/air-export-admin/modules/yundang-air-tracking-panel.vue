<script lang="ts" setup>
import type { YundangAirAdminApi } from '#/api/yundang/yundang-air-admin';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Tabs,
  TabPane,
  Tag,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getAirPushInfo } from '#/api/yundang/yundang-air-admin';
import { $t } from '#/locales';

import type { YundangAirViewState } from '../use-yundang-air-track';
import {
  getYundangAirTrackStatusLabel,
  resolveYundangAirViewState,
} from '../use-yundang-air-track';

const props = withDefaults(
  defineProps<{
    isYundangSubscribed?: boolean | null;
    isYundangSubscribeSuccess?: boolean | null;
    /** 无订阅状态字段时（如编辑页运踪 Tab），从推送详情的订阅记录推导四态 */
    resolveStateFromSubscription?: boolean;
    airExportId?: string;
  }>(),
  {
    isYundangSubscribed: undefined,
    isYundangSubscribeSuccess: undefined,
    resolveStateFromSubscription: false,
    airExportId: undefined,
  },
);

const POLL_INTERVAL_MS = 30_000;
const POLL_MAX_TIMES = 20;

type TimelineVisualState = 'completed' | 'estimated' | 'neutral' | 'planned';

interface TimelineVisualMeta {
  state: TimelineVisualState;
  icon: string;
  color: string;
  bg: string;
  label?: string;
}

const loading = ref(false);
const refreshing = ref(false);
const pushInfo = ref<YundangAirAdminApi.YundangAirPushInfoDto | null>(null);
const loadError = ref('');
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);
const pollCount = ref(0);

/** 展示所需的订阅状态：优先使用外部传入，否则回退到推送详情里的订阅记录 */
const effectiveFlags = computed(() => {
  if (!props.resolveStateFromSubscription) {
    return {
      isYundangSubscribed: props.isYundangSubscribed,
      isYundangSubscribeSuccess: props.isYundangSubscribeSuccess,
    };
  }
  const subscription = pushInfo.value?.subscription;
  return {
    isYundangSubscribed: Boolean(subscription),
    isYundangSubscribeSuccess: Boolean(subscription?.isSuccess),
  };
});

const viewState = computed<YundangAirViewState>(() =>
  resolveYundangAirViewState(effectiveFlags.value, pushInfo.value),
);

const statusLabel = computed(() => {
  if (!props.airExportId) {
    return '--';
  }
  return getYundangAirTrackStatusLabel(
    {
      id: props.airExportId,
      isYundangSubscribed: effectiveFlags.value.isYundangSubscribed,
      isYundangSubscribeSuccess: effectiveFlags.value.isYundangSubscribeSuccess,
    },
    pushInfo.value,
  );
});

const lastUpdatedText = computed(() => {
  const shipmentTime = pushInfo.value?.shipment?.lastPushTime;
  const subscriptionTime = pushInfo.value?.subscription?.lastPushTime;
  const raw = shipmentTime || subscriptionTime;
  if (!raw) {
    return undefined;
  }
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : String(raw);
});

/** 空运节点按 sno 升序展示 */
const nodes = computed(() =>
  [...(pushInfo.value?.shipment?.nodes ?? [])].sort(
    (a, b) => (a.sno ?? 0) - (b.sno ?? 0),
  ),
);

/** 航段按 sno 升序展示 */
const flights = computed(() =>
  [...(pushInfo.value?.shipment?.flights ?? [])].sort(
    (a, b) => (a.sno ?? 0) - (b.sno ?? 0),
  ),
);

/** 状态轨迹按事件时间升序还原时间线 */
const statuses = computed(() =>
  [...(pushInfo.value?.shipment?.statuses ?? [])].sort((a, b) => {
    const timeA = dayjs(a.eventTime);
    const timeB = dayjs(b.eventTime);
    if (!timeA.isValid() || !timeB.isValid()) {
      return 0;
    }
    return timeA.valueOf() - timeB.valueOf();
  }),
);

const nodesWithVisual = computed(() =>
  nodes.value.map((node) => ({
    node,
    visual: getAirNodeVisual(node),
  })),
);

const statusesWithVisual = computed(() =>
  statuses.value.map((status) => ({
    status,
    visual: getAirStatusVisual(status),
  })),
);

function resolveNodeTime(
  node: YundangAirAdminApi.YundangAirShipmentNodeInfoDto,
) {
  return node.actualityTime || node.estimateTime || node.planTime;
}

function getAirNodeVisual(
  node: YundangAirAdminApi.YundangAirShipmentNodeInfoDto,
): TimelineVisualMeta {
  if (node.actualityTime?.trim()) {
    return {
      state: 'completed',
      icon: 'ph:check-bold',
      color: '#34c759',
      bg: '#34c759',
      label: $t('airExport.yundang.tracking.nodeState.completed'),
    };
  }
  if (node.estimateTime?.trim()) {
    return {
      state: 'estimated',
      icon: 'ph:clock',
      color: '#ff9500',
      bg: '#ff9500',
      label: $t('airExport.yundang.tracking.nodeState.estimated'),
    };
  }
  if (node.planTime?.trim()) {
    return {
      state: 'planned',
      icon: 'ph:circle',
      color: '#8e8e93',
      bg: '#c7c7cc',
      label: $t('airExport.yundang.tracking.nodeState.planned'),
    };
  }
  return {
    state: 'neutral',
    icon: 'ph:circle',
    color: '#8e8e93',
    bg: '#c7c7cc',
  };
}

function getAirStatusVisual(
  status: YundangAirAdminApi.YundangAirShipmentStatusInfoDto,
): TimelineVisualMeta {
  if (status.isEstimate) {
    return {
      state: 'estimated',
      icon: 'ph:clock',
      color: '#ff9500',
      bg: '#ff9500',
      label: $t('airExport.yundang.tracking.nodeState.estimated'),
    };
  }
  return {
    state: 'completed',
    icon: 'ph:check-bold',
    color: '#34c759',
    bg: '#34c759',
  };
}

/** 航段航线：名称优先，回退三字码 */
function resolveFlightRoute(
  flight: YundangAirAdminApi.YundangAirShipmentFlightInfoDto,
) {
  const from = flight.org || flight.orgCd;
  const to = flight.dest || flight.destCd;
  return [from, to].filter(Boolean).join(' → ') || '--';
}

function formatMaybeDateTime(value?: string) {
  if (!value?.trim()) {
    return '--';
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value;
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

function startPollingIfNeeded() {
  stopPolling();
  pollCount.value = 0;
  if (viewState.value !== 'waiting_push') {
    return;
  }
  pollTimer.value = setInterval(() => {
    if (pollCount.value >= POLL_MAX_TIMES) {
      stopPolling();
      return;
    }
    pollCount.value += 1;
    void fetchPushInfo({ silent: true });
  }, POLL_INTERVAL_MS);
}

async function fetchPushInfo(options?: { silent?: boolean }) {
  const airExportId = props.airExportId;
  if (!airExportId) {
    return;
  }

  if (options?.silent) {
    refreshing.value = true;
  } else {
    loading.value = true;
  }
  loadError.value = '';
  try {
    const result = await getAirPushInfo(airExportId);
    pushInfo.value = result;
    if (result.shipment) {
      stopPolling();
    }
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? error.message
        : $t('airExport.yundang.tracking.loadFailed');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

watch(
  () => props.airExportId,
  (id) => {
    stopPolling();
    pushInfo.value = null;
    loadError.value = '';
    if (!id) {
      return;
    }
    void fetchPushInfo().then(() => {
      startPollingIfNeeded();
    });
  },
  { immediate: true },
);

watch(viewState, (state) => {
  if (state === 'waiting_push' && !pollTimer.value) {
    startPollingIfNeeded();
  }
  if (state === 'has_shipment') {
    stopPolling();
  }
});

onBeforeUnmount(() => {
  stopPolling();
});

const handleRefresh = async () => {
  await fetchPushInfo();
  if (viewState.value === 'waiting_push') {
    startPollingIfNeeded();
  }
};
</script>

<template>
  <div class="yundang-tracking-panel bg-white">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <Tag :color="viewState === 'has_shipment' ? 'processing' : 'default'">
          {{ statusLabel }}
        </Tag>
        <span v-if="lastUpdatedText" class="text-xs text-[rgba(0,0,0,0.45)]">
          {{ $t('airExport.yundang.tracking.lastUpdated', [lastUpdatedText]) }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <Button
          size="small"
          :loading="refreshing"
          :disabled="loading"
          @click="handleRefresh"
        >
          {{ $t('airExport.yundang.tracking.refresh') }}
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

      <template v-if="viewState === 'never_subscribed'">
        <Empty
          :description="$t('airExport.yundang.tracking.neverSubscribed')"
        />
      </template>

      <template v-else-if="viewState === 'subscribe_failed'">
        <Alert
          type="error"
          show-icon
          class="mb-4"
          :message="$t('airExport.yundang.tracking.subscribeFailedTitle')"
          :description="
            pushInfo?.subscription?.itemMessage ||
            pushInfo?.subscription?.itemCodeDesc ||
            $t('airExport.yundang.trackStatus.subscribeFailed')
          "
        />
        <Descriptions
          v-if="pushInfo?.subscription"
          bordered
          size="small"
          :column="2"
        >
          <DescriptionsItem
            :label="$t('airExport.yundang.tracking.referenceNo')"
          >
            {{ pushInfo.subscription.referenceNo || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('airExport.yundang.tracking.carrier')">
            {{ pushInfo.subscription.carrierCd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('airExport.yundang.tracking.orgDest')">
            {{
              [pushInfo.subscription.org, pushInfo.subscription.dest]
                .filter(Boolean)
                .join(' → ') || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('airExport.yundang.tracking.subscribeTime')"
          >
            {{ formatMaybeDateTime(pushInfo.subscription.subscribeTime) }}
          </DescriptionsItem>
        </Descriptions>
      </template>

      <template v-else-if="viewState === 'waiting_push'">
        <Alert
          type="info"
          show-icon
          class="mb-4"
          :message="$t('airExport.yundang.tracking.waitingPushTitle')"
          :description="$t('airExport.yundang.tracking.waitingPushDesc')"
        />
        <Descriptions
          v-if="pushInfo?.subscription"
          bordered
          size="small"
          :column="2"
        >
          <DescriptionsItem
            :label="$t('airExport.yundang.tracking.referenceNo')"
          >
            {{ pushInfo.subscription.referenceNo || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('airExport.yundang.tracking.carrier')">
            {{ pushInfo.subscription.carrierCd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('airExport.yundang.tracking.orgDest')">
            {{
              [pushInfo.subscription.org, pushInfo.subscription.dest]
                .filter(Boolean)
                .join(' → ') || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('airExport.yundang.tracking.subscribeTime')"
          >
            {{ formatMaybeDateTime(pushInfo.subscription.subscribeTime) }}
          </DescriptionsItem>
        </Descriptions>
      </template>

      <template v-else-if="pushInfo?.shipment">
        <Descriptions bordered size="small" :column="2" class="mb-4">
          <DescriptionsItem
            :label="$t('airExport.yundang.tracking.referenceNo')"
          >
            {{
              pushInfo.shipment.awbNo || pushInfo.shipment.referenceNo || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('airExport.yundang.tracking.carrier')">
            {{
              pushInfo.shipment.carrier || pushInfo.shipment.carrierCd || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('airExport.yundang.tracking.flightNo')">
            {{ pushInfo.shipment.flightNo || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('airExport.yundang.tracking.orgDest')">
            {{
              [
                pushInfo.shipment.org || pushInfo.shipment.orgCd,
                pushInfo.shipment.dest || pushInfo.shipment.destCd,
              ]
                .filter(Boolean)
                .join(' → ') || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem label="ETD">
            {{ pushInfo.shipment.etd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem label="ATD">
            {{ pushInfo.shipment.atd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem label="ETA">
            {{ pushInfo.shipment.eta || '--' }}
          </DescriptionsItem>
          <DescriptionsItem label="ATA">
            {{ pushInfo.shipment.ata || '--' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('airExport.yundang.tracking.currentStatus')"
          >
            {{ pushInfo.shipment.currentStatus || '--' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('airExport.yundang.tracking.trackStatus')"
          >
            {{ pushInfo.shipment.trackStatus || '--' }}
          </DescriptionsItem>
        </Descriptions>

        <Tabs>
          <TabPane
            key="nodes"
            :tab="$t('airExport.yundang.tracking.tabs.nodes')"
          >
            <Empty
              v-if="nodes.length === 0"
              :description="$t('airExport.yundang.tracking.emptyNodes')"
            />
            <Timeline
              v-else
              class="track-timeline track-timeline--horizontal mt-2"
            >
              <TimelineItem
                v-for="{ node, visual } in nodesWithVisual"
                :key="node.id"
                :color="visual.color"
              >
                <template #dot>
                  <div
                    class="track-timeline-dot"
                    :class="`track-timeline-dot--${visual.state}`"
                    :style="{ backgroundColor: visual.bg }"
                  >
                    <IconifyIcon
                      :icon="visual.icon"
                      class="track-timeline-dot__icon"
                    />
                  </div>
                </template>
                <div class="track-timeline-card">
                  <div class="track-timeline-card__header">
                    <span class="track-timeline-card__title">
                      {{
                        node.stateDescCN ||
                        node.stateDesc ||
                        node.stateCode ||
                        '--'
                      }}
                    </span>
                    <span
                      v-if="visual.label"
                      class="track-timeline-card__pill"
                      :class="`track-timeline-card__pill--${visual.state}`"
                    >
                      {{ visual.label }}
                    </span>
                  </div>
                  <div v-if="node.transport" class="track-timeline-card__place">
                    {{ node.transport }}
                  </div>
                  <div
                    v-if="resolveNodeTime(node)"
                    class="track-timeline-card__time"
                  >
                    {{ formatMaybeDateTime(resolveNodeTime(node)) }}
                  </div>
                </div>
              </TimelineItem>
            </Timeline>
          </TabPane>

          <TabPane
            key="flights"
            :tab="$t('airExport.yundang.tracking.tabs.flights')"
          >
            <Empty
              v-if="flights.length === 0"
              :description="$t('airExport.yundang.tracking.emptyFlights')"
            />
            <table v-else class="carriage-table">
              <thead>
                <tr>
                  <th>{{ $t('airExport.yundang.tracking.flight.sno') }}</th>
                  <th>
                    {{ $t('airExport.yundang.tracking.flight.flightNo') }}
                  </th>
                  <th>
                    {{ $t('airExport.yundang.tracking.flight.flightDate') }}
                  </th>
                  <th>{{ $t('airExport.yundang.tracking.flight.route') }}</th>
                  <th>{{ $t('airExport.yundang.tracking.flight.etd') }}</th>
                  <th>{{ $t('airExport.yundang.tracking.flight.atd') }}</th>
                  <th>{{ $t('airExport.yundang.tracking.flight.eta') }}</th>
                  <th>{{ $t('airExport.yundang.tracking.flight.ata') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="flight in flights" :key="flight.id">
                  <td>{{ flight.sno ?? '--' }}</td>
                  <td>{{ flight.flightNo || '--' }}</td>
                  <td>{{ flight.flightDate || '--' }}</td>
                  <td class="carriage-table__route">
                    {{ resolveFlightRoute(flight) }}
                  </td>
                  <td>{{ flight.etd || '--' }}</td>
                  <td>{{ flight.atd || '--' }}</td>
                  <td>{{ flight.eta || '--' }}</td>
                  <td>{{ flight.ata || '--' }}</td>
                </tr>
              </tbody>
            </table>
          </TabPane>

          <TabPane
            key="statuses"
            :tab="$t('airExport.yundang.tracking.tabs.statuses')"
          >
            <Empty
              v-if="statuses.length === 0"
              :description="$t('airExport.yundang.tracking.emptyStatuses')"
            />
            <Timeline
              v-else
              class="track-timeline track-timeline--horizontal mt-2"
            >
              <TimelineItem
                v-for="{ status, visual } in statusesWithVisual"
                :key="status.id"
                :color="visual.color"
              >
                <template #dot>
                  <div
                    class="track-timeline-dot"
                    :class="`track-timeline-dot--${visual.state}`"
                    :style="{ backgroundColor: visual.bg }"
                  >
                    <IconifyIcon
                      :icon="visual.icon"
                      class="track-timeline-dot__icon"
                    />
                  </div>
                </template>
                <div class="track-timeline-card">
                  <div class="track-timeline-card__header">
                    <span class="track-timeline-card__title">
                      {{ status.statusDesc || status.statusDescEn || '--' }}
                    </span>
                    <span
                      v-if="visual.label"
                      class="track-timeline-card__pill"
                      :class="`track-timeline-card__pill--${visual.state}`"
                    >
                      {{ visual.label }}
                    </span>
                  </div>
                  <div v-if="status.place" class="track-timeline-card__place">
                    {{ status.place }}
                  </div>
                  <div class="track-timeline-card__time">
                    {{ status.eventTime || '--' }}
                  </div>
                </div>
              </TimelineItem>
            </Timeline>
          </TabPane>
        </Tabs>
      </template>
    </Spin>
  </div>
</template>

<style scoped lang="scss">
/* 苹果风时间轴：留白充足、细分隔线、柔和圆点
   对齐基准：圆点中心与分割线统一落在中轴 12px 上 */
.track-timeline {
  padding: 12px 4px 0;

  :deep(.ant-timeline-item) {
    padding-bottom: 28px;
  }

  :deep(.ant-timeline-item:last-child) {
    padding-bottom: 4px;
  }

  /* 分割线：借助 translateX(-50%) 让 1.5px 线条中心精确对齐到 12px 中轴 */
  :deep(.ant-timeline-item-tail) {
    inset-block-start: 12px;
    inset-inline-start: 12px;
    height: calc(100% - 12px);
    border-inline-start: 1.5px solid rgb(60 60 67 / 12%);
    transform: translateX(-50%);
  }

  :deep(.ant-timeline-item-head) {
    padding: 0;
    background: transparent;
    border: none;
  }

  /* 自定义圆点：以 (12px, 12px) 为中心，translate 抵消自身尺寸 */
  :deep(.ant-timeline-item-head-custom) {
    inset-block-start: 12px;
    inset-inline-start: 12px;
    padding: 0;
    transform: translate(-50%, -50%);
  }

  :deep(.ant-timeline-item-content) {
    inset-block-start: 2px;
    min-height: 40px;
    margin-inline-start: 32px;
  }
}

.track-timeline-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.track-timeline-dot--current {
  box-shadow:
    0 0 0 5px rgb(0 122 255 / 14%),
    0 1px 3px rgb(0 122 255 / 30%);
}

.track-timeline-dot__icon {
  font-size: 13px;
}

.track-timeline-card {
  padding: 2px 0 0;
}

.track-timeline-card__header {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 3px;
}

.track-timeline-card__title {
  font-size: 15px;
  font-weight: 590;
  line-height: 1.35;
  color: rgb(0 0 0 / 88%);
  letter-spacing: -0.01em;
}

.track-timeline-card__pill {
  flex-shrink: 0;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 510;
  line-height: 1.6;
  color: #8e8e93;
  background: rgb(120 120 128 / 12%);
  border-radius: 100px;
}

.track-timeline-card__pill--current {
  color: #007aff;
  background: rgb(0 122 255 / 12%);
}

.track-timeline-card__pill--completed {
  color: #34c759;
  background: rgb(52 199 89 / 14%);
}

.track-timeline-card__pill--estimated {
  color: #ff9500;
  background: rgb(255 149 0 / 14%);
}

.track-timeline-card__pill--planned,
.track-timeline-card__pill--neutral {
  color: #8e8e93;
  background: rgb(120 120 128 / 12%);
}

.track-timeline-card__place {
  margin-bottom: 1px;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(60 60 67 / 60%);
}

.track-timeline-card__time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  color: rgb(60 60 67 / 45%);
}

/* 航段表格：细边框、留白、数字等宽 */
.carriage-table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;

  th,
  td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid rgb(60 60 67 / 8%);
  }

  th {
    font-weight: 590;
    color: rgb(60 60 67 / 60%);
    white-space: nowrap;
    background: rgb(120 120 128 / 5%);
  }

  td {
    font-variant-numeric: tabular-nums;
    color: rgb(0 0 0 / 82%);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
}

.carriage-table__route {
  font-weight: 510;
  white-space: nowrap;
}

/* 水平时间轴：里程碑 / 状态轨迹从左到右展示 */
.track-timeline--horizontal {
  display: flex;
  flex-flow: row nowrap;
  padding: 16px 4px 8px;
  margin: 0;
  overflow-x: auto;

  :deep(.ant-timeline-item) {
    position: relative;
    flex: 1 0 168px;
    min-width: 168px;
    max-width: 220px;
    padding-bottom: 0 !important;
    margin: 0;
  }

  :deep(.ant-timeline-item-tail) {
    position: absolute;
    inset-block-start: 12px;
    inset-inline-start: calc(50% + 14px);
    top: 12px;
    left: calc(50% + 14px);
    width: calc(100% - 28px);
    height: 0;
    border: none;
    border-top: 1.5px solid rgb(60 60 67 / 12%);
    transform: none;
  }

  :deep(.ant-timeline-item:last-child .ant-timeline-item-tail) {
    display: none;
  }

  :deep(.ant-timeline-item-head),
  :deep(.ant-timeline-item-head-custom) {
    position: relative;
    inset: auto;
    top: auto;
    left: auto;
    width: fit-content;
    margin: 0 auto 10px;
    transform: none;
  }

  :deep(.ant-timeline-item-content) {
    position: relative;
    inset: auto;
    top: auto;
    min-height: 0;
    padding: 0 6px;
    margin: 0 !important;
    margin-inline-start: 0 !important;
    text-align: center;
  }

  .track-timeline-card__header {
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }

  .track-timeline-card__title {
    font-size: 13px;
  }
}

.yundang-tracking-panel {
  min-height: 100%;
}
</style>
