<script lang="ts" setup>
import type { YundangAdminApi } from '#/api/yundang/yundang-admin';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Table,
  Tabs,
  TabPane,
  Tag,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getOceanPushInfo } from '#/api/yundang/yundang-admin';
import { $t } from '#/locales';

import type {
  YundangTrackingOpenPayload,
  YundangViewState,
} from '../use-yundang-ocean-track';
import {
  getYundangTrackStatusLabel,
  resolveYundangViewState,
} from '../use-yundang-ocean-track';

const POLL_INTERVAL_MS = 30_000;
const POLL_MAX_TIMES = 20;

type TimelineVisualState =
  | 'completed'
  | 'current'
  | 'estimated'
  | 'pending'
  | 'planned';

interface TimelineVisualMeta {
  state: TimelineVisualState;
  icon: string;
  color: string;
  bg: string;
  label: string;
}

const loading = ref(false);
const refreshing = ref(false);
const pushInfo = ref<YundangAdminApi.YundangOceanPushInfoDto | null>(null);
const loadError = ref('');
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);
const pollCount = ref(0);

const payload = ref<YundangTrackingOpenPayload | null>(null);

const viewState = computed<YundangViewState>(() =>
  resolveYundangViewState(
    {
      isYundangSubscribed: payload.value?.isYundangSubscribed,
      isYundangSubscribeSuccess: payload.value?.isYundangSubscribeSuccess,
    },
    pushInfo.value,
  ),
);

const modalTitle = computed(() => {
  const label = payload.value?.orderLabel;
  return label
    ? $t('seaExport.yundang.tracking.titleWithOrder', [label])
    : $t('seaExport.yundang.tracking.title');
});

const statusLabel = computed(() => {
  if (!payload.value) {
    return '--';
  }
  return getYundangTrackStatusLabel(
    {
      id: payload.value.seaExportId,
      isYundangSubscribed: payload.value.isYundangSubscribed,
      isYundangSubscribeSuccess: payload.value.isYundangSubscribeSuccess,
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

const sortedOceanNodes = computed(() => {
  const nodes = pushInfo.value?.shipment?.oceanNodes ?? [];
  return [...nodes].sort((a, b) => {
    const timeA = resolveNodeTime(a);
    const timeB = resolveNodeTime(b);
    if (!timeA && !timeB) {
      return 0;
    }
    if (!timeA) {
      return 1;
    }
    if (!timeB) {
      return -1;
    }
    return dayjs(timeA).valueOf() - dayjs(timeB).valueOf();
  });
});

const oceanNodesWithVisual = computed(() =>
  sortedOceanNodes.value.map((node) => ({
    node,
    visual: getOceanNodeVisual(node),
  })),
);

const sortedCarriages = computed(() => {
  const carriages = pushInfo.value?.shipment?.carriages ?? [];
  return [...carriages].sort((a, b) => (a.sno ?? 0) - (b.sno ?? 0));
});

const carriageColumns = computed(() => [
  {
    dataIndex: 'sno',
    title: $t('seaExport.yundang.tracking.carriage.sno'),
    width: 56,
    align: 'center' as const,
  },
  {
    dataIndex: 'route',
    title: $t('seaExport.yundang.tracking.carriage.route'),
    width: 130,
    ellipsis: true,
  },
  {
    dataIndex: 'vesselName',
    title: $t('seaExport.yundang.tracking.carriage.vessel'),
    width: 150,
    ellipsis: true,
  },
  {
    dataIndex: 'voy',
    title: $t('seaExport.yundang.tracking.carriage.voyage'),
    width: 80,
    ellipsis: true,
  },
  {
    dataIndex: 'etd',
    title: 'ETD',
    width: 168,
    className: 'yundang-tracking-time-cell',
  },
  {
    dataIndex: 'atd',
    title: 'ATD',
    width: 168,
    className: 'yundang-tracking-time-cell',
  },
  {
    dataIndex: 'eta',
    title: 'ETA',
    width: 168,
    className: 'yundang-tracking-time-cell',
  },
  {
    dataIndex: 'ata',
    title: 'ATA',
    width: 168,
    className: 'yundang-tracking-time-cell',
  },
]);

const TIME_COLUMN_KEYS = new Set(['etd', 'atd', 'eta', 'ata']);

const carriageRows = computed(() =>
  sortedCarriages.value.map((item) => ({
    ...item,
    route: [item.polCd, item.podCd].filter(Boolean).join(' → ') || '--',
    key: item.id,
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
    state: 'pending',
    icon: 'ph:circle',
    color: '#8e8e93',
    bg: '#c7c7cc',
    label: $t('seaExport.yundang.tracking.nodeState.pending'),
  };
}

function getContainerStatusVisual(
  status: YundangAdminApi.YundangShipmentContainerStatusInfoDto,
  index: number,
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
  if (index === 0) {
    return {
      state: 'current',
      icon: 'ph:navigation-arrow-fill',
      color: '#007aff',
      bg: '#007aff',
      label: $t('seaExport.yundang.tracking.nodeState.current'),
    };
  }
  return {
    state: 'completed',
    icon: 'ph:check-bold',
    color: '#34c759',
    bg: '#34c759',
    label: $t('seaExport.yundang.tracking.nodeState.completed'),
  };
}

function sortContainerStatuses(
  statuses: YundangAdminApi.YundangShipmentContainerStatusInfoDto[],
) {
  return [...statuses].sort(
    (a, b) => dayjs(b.eventTime).valueOf() - dayjs(a.eventTime).valueOf(),
  );
}

function getSortedContainerStatusesWithVisual(
  statuses: YundangAdminApi.YundangShipmentContainerStatusInfoDto[],
) {
  return sortContainerStatuses(statuses).map((status, index) => ({
    status,
    visual: getContainerStatusVisual(status, index),
  }));
}

function formatCarriageTime(value?: string) {
  if (!value?.trim()) {
    return '--';
  }
  return value.trim();
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
  const seaExportId = payload.value?.seaExportId;
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

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('seaExport.yundang.tracking.close'),
  onOpenChange(isOpen) {
    if (!isOpen) {
      stopPolling();
      pushInfo.value = null;
      loadError.value = '';
      payload.value = null;
      return;
    }
    const data = modalApi.getData<YundangTrackingOpenPayload>();
    payload.value = data ?? null;
    void fetchPushInfo().then(() => {
      startPollingIfNeeded();
    });
  },
});

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
  <Modal :title="modalTitle" class="w-[960px]">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <Tag :color="viewState === 'has_shipment' ? 'processing' : 'default'">
          {{ statusLabel }}
        </Tag>
        <span v-if="lastUpdatedText" class="text-xs text-[rgba(0,0,0,0.45)]">
          {{ $t('seaExport.yundang.tracking.lastUpdated', [lastUpdatedText]) }}
        </span>
      </div>
      <Button
        size="small"
        :loading="refreshing"
        :disabled="loading"
        @click="handleRefresh"
      >
        {{ $t('seaExport.yundang.tracking.refresh') }}
      </Button>
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
            :label="$t('seaExport.yundang.tracking.trackStatus')"
          >
            {{ pushInfo.shipment.trackStatus || '--' }}
          </DescriptionsItem>
        </Descriptions>

        <Tabs>
          <TabPane
            key="nodes"
            :tab="$t('seaExport.yundang.tracking.tabs.nodes')"
          >
            <Empty
              v-if="sortedOceanNodes.length === 0"
              :description="$t('seaExport.yundang.tracking.emptyNodes')"
            />
            <Timeline v-else class="track-timeline mt-2">
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
                      class="track-timeline-card__pill"
                      :class="`track-timeline-card__pill--${visual.state}`"
                    >
                      {{ visual.label }}
                    </span>
                  </div>
                  <div v-if="node.place" class="track-timeline-card__place">
                    {{ node.place }}
                  </div>
                  <div class="track-timeline-card__time">
                    {{ formatMaybeDateTime(resolveNodeTime(node)) }}
                  </div>
                </div>
              </TimelineItem>
            </Timeline>
          </TabPane>

          <TabPane
            key="carriages"
            :tab="$t('seaExport.yundang.tracking.tabs.carriages')"
          >
            <Table
              v-if="carriageRows.length > 0"
              class="yundang-carriage-table"
              :columns="carriageColumns"
              :data-source="carriageRows"
              :pagination="false"
              size="small"
              :scroll="{ x: 1068 }"
            >
              <template #bodyCell="{ column, record, text }">
                <template v-if="TIME_COLUMN_KEYS.has(String(column.dataIndex))">
                  <span class="yundang-tracking-time-text">
                    {{ formatCarriageTime(text) }}
                  </span>
                </template>
                <template v-else-if="column.dataIndex === 'route'">
                  <span class="yundang-carriage-route">{{ record.route }}</span>
                </template>
              </template>
            </Table>
            <Empty
              v-else
              :description="$t('seaExport.yundang.tracking.emptyCarriages')"
            />
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

                <Timeline class="track-timeline">
                  <TimelineItem
                    v-for="{
                      status,
                      visual,
                    } in getSortedContainerStatusesWithVisual(
                      container.statuses ?? [],
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
                        'track-timeline-card--current':
                          visual.state === 'current',
                        'track-timeline-card--estimated':
                          visual.state === 'estimated',
                      }"
                    >
                      <div class="track-timeline-card__header">
                        <span class="track-timeline-card__title">
                          {{ status.statusDesc || status.statusDescEn || '--' }}
                        </span>
                        <span
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
                    </div>
                  </TimelineItem>
                </Timeline>
              </TabPane>
            </Tabs>
          </TabPane>
        </Tabs>
      </template>
    </Spin>
  </Modal>
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
.track-timeline-card__pill--pending {
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

.yundang-carriage-table {
  :deep(.yundang-tracking-time-cell) {
    white-space: nowrap;
  }

  :deep(.ant-table-cell) {
    vertical-align: middle;
  }
}

.yundang-tracking-time-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.yundang-carriage-route {
  white-space: nowrap;
}
</style>
