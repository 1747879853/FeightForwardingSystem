<script lang="ts" setup>
import type { YundangAdminApi } from '#/api/yundang/yundang-admin';

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
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useTrackingMap } from '#/components/tracking-map';

import { getOceanPushInfo } from '#/api/yundang/yundang-admin';
import { $t } from '#/locales';

import type { YundangViewState } from '../use-yundang-ocean-track';
import {
  getYundangTrackStatusLabel,
  resolveYundangViewState,
} from '../use-yundang-ocean-track';

const props = withDefaults(
  defineProps<{
    isYundangSubscribed?: boolean | null;
    isYundangSubscribeSuccess?: boolean | null;
    /** 订阅号（提单号 mblNo），用于查看轨迹地图；未传时从推送详情派生 */
    mblNo?: null | string;
    /** 无订阅状态字段时（如编辑页运踪 Tab），从推送详情的订阅记录推导四态 */
    resolveStateFromSubscription?: boolean;
    seaExportId?: string;
  }>(),
  {
    isYundangSubscribed: undefined,
    isYundangSubscribeSuccess: undefined,
    mblNo: undefined,
    resolveStateFromSubscription: false,
    seaExportId: undefined,
  },
);

const { open: openTrackingMap } = useTrackingMap();

const POLL_INTERVAL_MS = 30_000;
const POLL_MAX_TIMES = 20;

type TimelineVisualState =
  | 'completed'
  | 'current'
  | 'estimated'
  | 'neutral'
  | 'planned';

interface TimelineVisualMeta {
  state: TimelineVisualState;
  icon: string;
  color: string;
  bg: string;
  label?: string;
}

const loading = ref(false);
const refreshing = ref(false);
const pushInfo = ref<YundangAdminApi.YundangOceanPushInfoDto | null>(null);
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

const viewState = computed<YundangViewState>(() =>
  resolveYundangViewState(effectiveFlags.value, pushInfo.value),
);

const statusLabel = computed(() => {
  if (!props.seaExportId) {
    return '--';
  }
  return getYundangTrackStatusLabel(
    {
      id: props.seaExportId,
      isYundangSubscribed: effectiveFlags.value.isYundangSubscribed,
      isYundangSubscribeSuccess: effectiveFlags.value.isYundangSubscribeSuccess,
    },
    pushInfo.value,
  );
});

/** 查看轨迹地图使用的订阅号：优先外部传入，其次从推送详情（订阅号/提单号）派生 */
const mapReferenceNo = computed(() => {
  const external = props.mblNo?.trim();
  if (external) {
    return external;
  }
  const subscriptionRef = pushInfo.value?.subscription?.referenceNo?.trim();
  if (subscriptionRef) {
    return subscriptionRef;
  }
  const shipment = pushInfo.value?.shipment;
  return (
    shipment?.blNo?.trim() ||
    shipment?.referenceNo?.trim() ||
    shipment?.bkgNo?.trim() ||
    ''
  );
});

const handleViewMap = () => {
  if (!mapReferenceNo.value) {
    return;
  }
  openTrackingMap({ mblNo: mapReferenceNo.value });
};

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

const oceanNodes = computed(() => pushInfo.value?.shipment?.oceanNodes ?? []);

/** 航段按 sno 升序展示 */
const carriages = computed(() =>
  [...(pushInfo.value?.shipment?.carriages ?? [])].sort(
    (a, b) => (a.sno ?? 0) - (b.sno ?? 0),
  ),
);

const oceanNodesWithVisual = computed(() =>
  oceanNodes.value.map((node) => ({
    node,
    visual: getOceanNodeVisual(node),
  })),
);

function resolveNodeTime(
  node: YundangAdminApi.YundangShipmentOceanNodeInfoDto,
) {
  return node.actualityTime || node.estimateTime || node.planTime;
}

function getOceanNodeVisual(
  node: YundangAdminApi.YundangShipmentOceanNodeInfoDto,
): TimelineVisualMeta {
  if (node.isCurrent) {
    return {
      state: 'current',
      icon: 'ph:navigation-arrow-fill',
      color: '#007aff',
      bg: '#007aff',
      label: $t('seaExport.yundang.tracking.nodeState.current'),
    };
  }
  if (node.actualityTime?.trim()) {
    return {
      state: 'completed',
      icon: 'ph:check-bold',
      color: '#34c759',
      bg: '#34c759',
      label: $t('seaExport.yundang.tracking.nodeState.completed'),
    };
  }
  if (node.estimateTime?.trim()) {
    return {
      state: 'estimated',
      icon: 'ph:clock',
      color: '#ff9500',
      bg: '#ff9500',
      label: $t('seaExport.yundang.tracking.nodeState.estimated'),
    };
  }
  if (node.planTime?.trim()) {
    return {
      state: 'planned',
      icon: 'ph:circle',
      color: '#8e8e93',
      bg: '#c7c7cc',
      label: $t('seaExport.yundang.tracking.nodeState.planned'),
    };
  }
  return {
    state: 'neutral',
    icon: 'ph:circle',
    color: '#8e8e93',
    bg: '#c7c7cc',
  };
}

function getContainerStatusVisual(
  status: YundangAdminApi.YundangShipmentContainerStatusInfoDto,
): TimelineVisualMeta {
  if (status.isEstimate) {
    return {
      state: 'estimated',
      icon: 'ph:clock',
      color: '#ff9500',
      bg: '#ff9500',
      label: $t('seaExport.yundang.tracking.nodeState.estimated'),
    };
  }
  return {
    state: 'completed',
    icon: 'ph:check-bold',
    color: '#34c759',
    bg: '#34c759',
  };
}

function getContainerStatusesWithVisual(
  container: YundangAdminApi.YundangShipmentContainerInfoDto,
) {
  // 后端未对箱轨迹排序，前端按事件时间升序还原时间线
  const statuses = [...(container.statuses ?? [])].sort((a, b) => {
    const timeA = dayjs(a.eventTime);
    const timeB = dayjs(b.eventTime);
    if (!timeA.isValid() || !timeB.isValid()) {
      return 0;
    }
    return timeA.valueOf() - timeB.valueOf();
  });
  return statuses.map((status) => ({
    status,
    visual: getContainerStatusVisual(status),
  }));
}

/** 航段航线：中文名优先，回退英文名 / 港口代码 */
function resolveCarriageRoute(
  carriage: YundangAdminApi.YundangShipmentCarriageInfoDto,
) {
  const from = carriage.polNameCn || carriage.polNameEn || carriage.polCd;
  const to = carriage.podNameCn || carriage.podNameEn || carriage.podCd;
  return [from, to].filter(Boolean).join(' → ') || '--';
}

/** 航段类型：1=大船，2=驳船，3=陆运 */
function translateCarriageType(type?: string) {
  switch (type) {
    case '1': {
      return $t('seaExport.yundang.tracking.carriage.typeMainVessel');
    }
    case '2': {
      return $t('seaExport.yundang.tracking.carriage.typeBarge');
    }
    case '3': {
      return $t('seaExport.yundang.tracking.carriage.typeTruck');
    }
    default: {
      return type || '--';
    }
  }
}

/** 箱轨迹数据来源：1=船东，2=码头，4=云当计算 */
function translateSource(sourceCd?: string) {
  switch (sourceCd) {
    case '1': {
      return $t('seaExport.yundang.tracking.container.sourceCarrier');
    }
    case '2': {
      return $t('seaExport.yundang.tracking.container.sourceTerminal');
    }
    case '4': {
      return $t('seaExport.yundang.tracking.container.sourceYundang');
    }
    default: {
      return sourceCd || '';
    }
  }
}

/** 集装箱异常标识：1=甩柜，2=异常 */
function resolveRolledTag(isRolled?: string) {
  if (isRolled === '1') {
    return {
      color: 'error',
      label: $t('seaExport.yundang.tracking.container.rolled'),
    };
  }
  if (isRolled === '2') {
    return {
      color: 'warning',
      label: $t('seaExport.yundang.tracking.container.abnormal'),
    };
  }
  return null;
}

function formatMaybeDateTime(value?: string) {
  if (!value?.trim()) {
    return '--';
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value;
}

function translateBlType(blType?: string) {
  switch (blType) {
    case 'BL': {
      return $t('seaExport.yundang.tracking.blType.bl');
    }
    case 'BK': {
      return $t('seaExport.yundang.tracking.blType.bk');
    }
    case 'CN': {
      return $t('seaExport.yundang.tracking.blType.cn');
    }
    default: {
      return blType || '--';
    }
  }
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
  const seaExportId = props.seaExportId;
  if (!seaExportId) {
    return;
  }

  if (options?.silent) {
    refreshing.value = true;
  } else {
    loading.value = true;
  }
  loadError.value = '';
  try {
    const result = await getOceanPushInfo(seaExportId);
    pushInfo.value = result;
    if (result.shipment) {
      stopPolling();
    }
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? error.message
        : $t('seaExport.yundang.tracking.loadFailed');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

watch(
  () => props.seaExportId,
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
          {{ $t('seaExport.yundang.tracking.lastUpdated', [lastUpdatedText]) }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <Tooltip
          v-if="!mapReferenceNo"
          :title="$t('seaExport.yundang.tracking.viewMapEmpty')"
        >
          <Button size="small" type="primary" ghost disabled>
            <template #icon>
              <IconifyIcon icon="ph:map-trifold" class="mr-1 inline-block" />
            </template>
            {{ $t('seaExport.yundang.tracking.viewMap') }}
          </Button>
        </Tooltip>
        <Button v-else size="small" type="primary" ghost @click="handleViewMap">
          <template #icon>
            <IconifyIcon icon="ph:map-trifold" class="mr-1 inline-block" />
          </template>
          {{ $t('seaExport.yundang.tracking.viewMap') }}
        </Button>
        <Button
          size="small"
          :loading="refreshing"
          :disabled="loading"
          @click="handleRefresh"
        >
          {{ $t('seaExport.yundang.tracking.refresh') }}
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
          :description="$t('seaExport.yundang.tracking.neverSubscribed')"
        />
      </template>

      <template v-else-if="viewState === 'subscribe_failed'">
        <Alert
          type="error"
          show-icon
          class="mb-4"
          :message="$t('seaExport.yundang.tracking.subscribeFailedTitle')"
          :description="
            pushInfo?.subscription?.errorMessage ||
            pushInfo?.subscription?.resultType ||
            $t('seaExport.yundang.trackStatus.subscribeFailed')
          "
        />
        <Descriptions
          v-if="pushInfo?.subscription"
          bordered
          size="small"
          :column="2"
        >
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.referenceNo')"
          >
            {{ pushInfo.subscription.referenceNo || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('seaExport.yundang.tracking.carrier')">
            {{ pushInfo.subscription.carrierCd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.blTypeLabel')"
          >
            {{ translateBlType(pushInfo.subscription.blType) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.subscribeTime')"
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
          :message="$t('seaExport.yundang.tracking.waitingPushTitle')"
          :description="$t('seaExport.yundang.tracking.waitingPushDesc')"
        />
        <Descriptions
          v-if="pushInfo?.subscription"
          bordered
          size="small"
          :column="2"
        >
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.referenceNo')"
          >
            {{ pushInfo.subscription.referenceNo || '--' }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('seaExport.yundang.tracking.carrier')">
            {{ pushInfo.subscription.carrierCd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.trackStatus')"
          >
            {{ pushInfo.subscription.trackStatus || '--' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.subscribeTime')"
          >
            {{ formatMaybeDateTime(pushInfo.subscription.subscribeTime) }}
          </DescriptionsItem>
        </Descriptions>
      </template>

      <template v-else-if="pushInfo?.shipment">
        <Descriptions bordered size="small" :column="2" class="mb-4">
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.referenceNo')"
          >
            {{
              pushInfo.shipment.blNo ||
              pushInfo.shipment.referenceNo ||
              pushInfo.shipment.bkgNo ||
              '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('seaExport.yundang.tracking.carrier')">
            {{
              pushInfo.shipment.carrier || pushInfo.shipment.carrierCd || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.vesselVoyage')"
          >
            {{
              [pushInfo.shipment.vesselName, pushInfo.shipment.voyage]
                .filter(Boolean)
                .join(' / ') || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('seaExport.yundang.tracking.polPod')">
            {{
              [
                pushInfo.shipment.pol || pushInfo.shipment.polCd,
                pushInfo.shipment.pod || pushInfo.shipment.podCd,
              ]
                .filter(Boolean)
                .join(' → ') || '--'
            }}
          </DescriptionsItem>
          <DescriptionsItem label="ETD">
            {{ pushInfo.shipment.etd || '--' }}
          </DescriptionsItem>
          <DescriptionsItem label="ETA">
            {{ pushInfo.shipment.eta || '--' }}
          </DescriptionsItem>
          <DescriptionsItem label="ATA">
            {{ pushInfo.shipment.ata || '--' }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="pushInfo.shipment.aisEta"
            :label="$t('seaExport.yundang.tracking.aisEta')"
          >
            {{ pushInfo.shipment.aisEta }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="pushInfo.shipment.firstEta"
            :label="$t('seaExport.yundang.tracking.firstEta')"
          >
            {{ pushInfo.shipment.firstEta }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="pushInfo.shipment.pld || pushInfo.shipment.pldCd"
            :label="$t('seaExport.yundang.tracking.deliveryPlace')"
          >
            {{ pushInfo.shipment.pld || pushInfo.shipment.pldCd }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="pushInfo.shipment.etaPld"
            :label="$t('seaExport.yundang.tracking.etaPld')"
          >
            {{ pushInfo.shipment.etaPld }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="pushInfo.shipment.ataPld"
            :label="$t('seaExport.yundang.tracking.ataPld')"
          >
            {{ pushInfo.shipment.ataPld }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('seaExport.yundang.tracking.trackStatus')"
          >
            {{ pushInfo.shipment.trackStatus || '--' }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="pushInfo.shipment.remark"
            :label="$t('seaExport.yundang.tracking.remark')"
            :span="2"
          >
            {{ pushInfo.shipment.remark }}
          </DescriptionsItem>
        </Descriptions>

        <Tabs>
          <TabPane
            key="nodes"
            :tab="$t('seaExport.yundang.tracking.tabs.nodes')"
          >
            <Empty
              v-if="oceanNodes.length === 0"
              :description="$t('seaExport.yundang.tracking.emptyNodes')"
            />
            <Timeline
              v-else
              class="track-timeline track-timeline--horizontal mt-2"
            >
              <TimelineItem
                v-for="{ node, visual } in oceanNodesWithVisual"
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
                <div
                  class="track-timeline-card"
                  :class="{
                    'track-timeline-card--current': visual.state === 'current',
                  }"
                >
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
                  <div v-if="node.place" class="track-timeline-card__place">
                    {{ node.place }}
                  </div>
                  <div
                    v-if="resolveNodeTime(node)"
                    class="track-timeline-card__time"
                  >
                    {{ formatMaybeDateTime(resolveNodeTime(node)) }}
                  </div>
                  <div v-if="node.total" class="track-timeline-card__meta">
                    {{ $t('seaExport.yundang.tracking.node.progress') }}
                    {{ node.count ?? 0 }}/{{ node.total }}
                  </div>
                </div>
              </TimelineItem>
            </Timeline>
          </TabPane>

          <TabPane
            key="carriages"
            :tab="$t('seaExport.yundang.tracking.tabs.carriages')"
          >
            <Empty
              v-if="carriages.length === 0"
              :description="$t('seaExport.yundang.tracking.emptyCarriages')"
            />
            <table v-else class="carriage-table">
              <thead>
                <tr>
                  <th>{{ $t('seaExport.yundang.tracking.carriage.sno') }}</th>
                  <th>{{ $t('seaExport.yundang.tracking.carriage.type') }}</th>
                  <th>{{ $t('seaExport.yundang.tracking.carriage.route') }}</th>
                  <th>
                    {{ $t('seaExport.yundang.tracking.carriage.vessel') }}
                  </th>
                  <th>{{ $t('seaExport.yundang.tracking.carriage.etd') }}</th>
                  <th>{{ $t('seaExport.yundang.tracking.carriage.atd') }}</th>
                  <th>{{ $t('seaExport.yundang.tracking.carriage.eta') }}</th>
                  <th>{{ $t('seaExport.yundang.tracking.carriage.ata') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="carriage in carriages" :key="carriage.id">
                  <td>{{ carriage.sno ?? '--' }}</td>
                  <td>{{ translateCarriageType(carriage.type) }}</td>
                  <td class="carriage-table__route">
                    {{ resolveCarriageRoute(carriage) }}
                  </td>
                  <td>
                    {{
                      [carriage.vesselName, carriage.voy]
                        .filter(Boolean)
                        .join(' / ') || '--'
                    }}
                  </td>
                  <td>{{ carriage.etd || '--' }}</td>
                  <td>{{ carriage.atd || '--' }}</td>
                  <td>{{ carriage.eta || carriage.aisEta || '--' }}</td>
                  <td>{{ carriage.ata || carriage.aisAta || '--' }}</td>
                </tr>
              </tbody>
            </table>
          </TabPane>

          <TabPane
            key="containers"
            :tab="$t('seaExport.yundang.tracking.tabs.containers')"
          >
            <Empty
              v-if="(pushInfo.shipment.containers?.length ?? 0) === 0"
              :description="$t('seaExport.yundang.tracking.emptyContainers')"
            />
            <Tabs v-else type="card" size="small">
              <TabPane
                v-for="container in pushInfo.shipment.containers"
                :key="container.id"
                :tab="container.ctnrNo || container.id"
              >
                <div v-if="resolveRolledTag(container.isRolled)" class="mb-2">
                  <Tag :color="resolveRolledTag(container.isRolled)!.color">
                    {{ resolveRolledTag(container.isRolled)!.label }}
                  </Tag>
                </div>
                <Descriptions bordered size="small" :column="2" class="mb-3">
                  <DescriptionsItem
                    :label="$t('seaExport.yundang.tracking.container.sizeType')"
                  >
                    {{
                      [container.ctnrSize, container.ctnrType]
                        .filter(Boolean)
                        .join('') || '--'
                    }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('seaExport.yundang.tracking.container.sealNo')"
                  >
                    {{ container.sealNo || '--' }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="container.pkgs != null"
                    :label="$t('seaExport.yundang.tracking.container.pkgs')"
                  >
                    {{ container.pkgs }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="container.gwgt != null"
                    :label="$t('seaExport.yundang.tracking.container.gwgt')"
                  >
                    {{ container.gwgt }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="container.vgm != null"
                    :label="$t('seaExport.yundang.tracking.container.vgm')"
                  >
                    {{ container.vgm }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('seaExport.yundang.tracking.container.currentStatus')
                    "
                  >
                    {{ container.currentStatus || '--' }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('seaExport.yundang.tracking.container.currentPlace')
                    "
                  >
                    {{ container.currentPlace || '--' }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t(
                        'seaExport.yundang.tracking.container.currentStatusTime',
                      )
                    "
                    :span="2"
                  >
                    {{ container.currentStatusTime || '--' }}
                  </DescriptionsItem>
                </Descriptions>

                <div
                  v-if="(container.charges?.length ?? 0) > 0"
                  class="charge-block mb-3"
                >
                  <div class="charge-block__title">
                    {{ $t('seaExport.yundang.tracking.container.chargeTitle') }}
                  </div>
                  <table class="carriage-table">
                    <thead>
                      <tr>
                        <th>
                          {{
                            $t(
                              'seaExport.yundang.tracking.container.chargeType',
                            )
                          }}
                        </th>
                        <th>
                          {{ $t('seaExport.yundang.tracking.container.lfd') }}
                        </th>
                        <th>
                          {{
                            $t(
                              'seaExport.yundang.tracking.container.freeDayDesc',
                            )
                          }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="charge in container.charges" :key="charge.id">
                        <td>{{ charge.chargeType || '--' }}</td>
                        <td>{{ charge.lfd || '--' }}</td>
                        <td>{{ charge.freeDayDesc || '--' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Timeline class="track-timeline track-timeline--horizontal">
                  <TimelineItem
                    v-for="{ status, visual } in getContainerStatusesWithVisual(
                      container,
                    )"
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
                    <div
                      class="track-timeline-card"
                      :class="{
                        'track-timeline-card--estimated':
                          visual.state === 'estimated',
                      }"
                    >
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
                      <div
                        v-if="status.place"
                        class="track-timeline-card__place"
                      >
                        {{ status.place }}
                      </div>
                      <div class="track-timeline-card__time">
                        {{ status.eventTime || '--' }}
                      </div>
                      <div
                        v-if="translateSource(status.sourceCd)"
                        class="track-timeline-card__meta"
                      >
                        {{
                          $t('seaExport.yundang.tracking.container.source')
                        }}：{{ translateSource(status.sourceCd) }}
                      </div>
                    </div>
                  </TimelineItem>
                </Timeline>
              </TabPane>
            </Tabs>
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

.track-timeline-card__meta {
  margin-top: 1px;
  font-size: 11px;
  line-height: 1.5;
  color: rgb(60 60 67 / 40%);
}

/* 航段 / 费用表格：细边框、留白、数字等宽 */
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

.charge-block__title {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 590;
  color: rgb(0 0 0 / 82%);
}

/* 水平时间轴：里程碑 / 集装箱轨迹从左到右展示 */
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
