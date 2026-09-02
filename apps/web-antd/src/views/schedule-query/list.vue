<script lang="ts" setup>
import type { FeituoScheduleAdminApi } from '#/api/schedule/feituo-schedule-admin';
import type { PortCodeAdminApi } from '#/api/system/base-data/port-code-admin';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';

import { Page } from '@vben/common-ui';

import dayjs from 'dayjs';
import {
  Button,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Empty,
  Input,
  message,
  Modal,
  Popover,
  Select,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { PortSelect } from '#/adapter/component/biz-select';
import { queryScheduleAsync } from '#/api/schedule/feituo-schedule-admin';

import iconArrowRight from './assets/icon-arrow-right.svg';
import iconCalendar from './assets/icon-calendar.svg';
import iconChevronDown from './assets/icon-chevron-down.svg';
import iconChevronSm from './assets/icon-chevron-sm.svg';
import iconChevronSmDark from './assets/icon-chevron-sm-dark.svg';
import iconChevronUp from './assets/icon-chevron-up.svg';
import iconClock from './assets/icon-clock.svg';
import iconInfo from './assets/icon-info.svg';
import iconSearch from './assets/icon-search.svg';
import iconSwap from './assets/icon-swap.svg';
import {
  type ScheduleGroup,
  compareItemEtd,
  filterSchedules,
  formatDateTime,
  formatDelayLabel,
  formatDurationFigure,
  formatMonthDay,
  formatScheduleMoment,
  formatTerminalPath,
  formatWeekdayShort,
  getItemCarriers,
  getItemRouteCodes,
  getStandardTerminal,
  getTerminal,
  getTransportModeText,
  getVesselHoverFields,
  groupSchedules,
  makeScheduleRowKey,
  sanitizeScheduleItems,
  splitScheduleMoment,
  text,
} from './data';

defineOptions({ name: 'ScheduleQuery' });

type ScheduleItem = FeituoScheduleAdminApi.FeituoScheduleItemDto;

interface CachedPorts {
  podCn: string;
  podCode: string;
  podEn: string;
  polCn: string;
  polCode: string;
  polEn: string;
}

type RecentSearch = CachedPorts;

const QUERY_WEEKS = 8;
const RECENT_STORAGE_KEY = 'ffs.schedule-query.recent';
const MAX_RECENT = 6;

const queryForm = reactive<{
  etd: string;
  podCode?: string;
  polCode?: string;
}>({
  etd: dayjs().format('YYYY-MM-DD'),
});

const filters = reactive({
  carrierCodes: [] as string[],
  keyword: '',
  podTerminals: [] as string[],
  polTerminals: [] as string[],
  transitType: 'all' as 'all' | 'direct' | 'transit',
});

const allItems = ref<ScheduleItem[]>([]);
const loading = ref(false);
const searched = ref(false);
const queryFailed = ref(false);
const expandedGroupIds = ref(new Set<string>());
const selectedItem = ref<null | ScheduleItem>(null);
const detailOpen = ref(false);
const sortMode = ref<'durationAsc' | 'etdAsc' | 'etdDesc' | 'weekdayAsc'>(
  'weekdayAsc',
);
const visibleGroupCount = ref(80);
const polSelectedItems = ref<PortCodeAdminApi.PortCodeDto[]>([]);
const podSelectedItems = ref<PortCodeAdminApi.PortCodeDto[]>([]);
const recentChipsRef = ref<HTMLElement>();
const recentSearches = ref<RecentSearch[]>([]);
let recentFitObserver: ResizeObserver | undefined;

const tabCountItems = computed(() =>
  filterSchedules(allItems.value, { ...filters, transitType: 'all' }),
);
const tabCountGroups = computed(() => groupSchedules(tabCountItems.value));
const directGroupCount = computed(
  () => tabCountGroups.value.filter((group) => !group.isTransit).length,
);
const transitGroupCount = computed(
  () => tabCountGroups.value.filter((group) => group.isTransit).length,
);
const filteredItems = computed(() => filterSchedules(allItems.value, filters));
const filteredGroups = computed(() => {
  const groups = groupSchedules(filteredItems.value);
  if (sortMode.value === 'durationAsc') {
    return [...groups].sort(
      (left, right) =>
        (left.minDuration ?? Number.MAX_SAFE_INTEGER) -
        (right.minDuration ?? Number.MAX_SAFE_INTEGER),
    );
  }
  if (sortMode.value === 'etdAsc') {
    return [...groups].sort((left, right) =>
      compareItemEtd(left.items[0], right.items[0]),
    );
  }
  if (sortMode.value === 'etdDesc') {
    return [...groups].sort((left, right) =>
      compareItemEtd(right.items[0], left.items[0]),
    );
  }
  return groups;
});
const visibleGroups = computed(() =>
  filteredGroups.value.slice(0, visibleGroupCount.value),
);
const remainingGroupCount = computed(
  () => filteredGroups.value.length - visibleGroups.value.length,
);
const remainingLoadCount = computed(() =>
  Math.min(30, Math.max(remainingGroupCount.value, 0)),
);
const showResultSummary = computed(
  () => searched.value && !queryFailed.value && filteredGroups.value.length > 0,
);

watch(filters, () => (visibleGroupCount.value = 80), { deep: true });
watch(sortMode, () => (visibleGroupCount.value = 80));

const carrierOptions = computed(() =>
  uniqueOptions(allItems.value.flatMap(getItemCarriers)),
);
const polTerminalOptions = computed(() =>
  uniqueOptions(allItems.value.map((item) => getStandardTerminal(item, 'pol'))),
);
const podTerminalOptions = computed(() =>
  uniqueOptions(allItems.value.map((item) => getStandardTerminal(item, 'pod'))),
);
const activeFilterCount = computed(
  () =>
    filters.carrierCodes.length +
    filters.polTerminals.length +
    filters.podTerminals.length +
    Number(Boolean(filters.keyword)) +
    Number(filters.transitType !== 'all'),
);

const detailBasicFields = computed(() => {
  const item = selectedItem.value;
  if (!item) return [];
  return [
    ['船公司', item.carrierCd],
    ['SCAC', item.scac],
    ['船名', item.vessel],
    ['航次', item.voyage],
    ['运输方式', getTransportModeText(item.transportMode)],
    ['航线代码', item.routeCode],
    ['标准航线', item.displayName],
    ['IMO', item.imoNumber],
    ['MMSI', item.mmsi],
    ['呼号', item.callSign],
    ['母船简称', item.shipManager],
    ['母船全称', item.shipManagerEn],
  ];
});

const detailPortFields = computed(() => {
  const item = selectedItem.value;
  if (!item) return [];
  return [
    ['起运港', `${text(item.polName)} · ${text(item.polCode)}`],
    ['起运港原始名', item.pol],
    ['起运码头', getTerminal(item, 'pol')],
    ['起运港 UNCODE', item.polUnCode],
    ['起运港 UN 名', item.polUnName],
    [
      '起运港国家 / 时区',
      `${text(item.polCountry)} / ${text(item.polTimeZone)}`,
    ],
    ['目的港', `${text(item.podName)} · ${text(item.podCode)}`],
    ['目的港原始名', item.pod],
    ['目的码头', getTerminal(item, 'pod')],
    ['目的港 UNCODE', item.podUnCode],
    ['目的港 UN 名', item.podUnName],
    [
      '目的港国家 / 时区',
      `${text(item.podCountry)} / ${text(item.podTimeZone)}`,
    ],
  ];
});

const detailTimeFields = computed(() => {
  const item = selectedItem.value;
  if (!item) return [];
  return [
    ['预计离港 ETD', formatScheduleMoment(item.etd)],
    ['预计到港 ETA', formatScheduleMoment(item.eta)],
    ['计划离港', formatScheduleMoment(item.staticEtd)],
    ['计划到港', formatScheduleMoment(item.staticEta)],
    ['实际离港 ATD', formatScheduleMoment(item.atd)],
    ['实际到港 ATA', formatScheduleMoment(item.ata)],
    ['计划离港班期', item.routeEtd],
    ['计划到港班期', item.routeEta],
    ['预计航程', item.totalDuration ? `${item.totalDuration} 天` : '-'],
    ['计划航程', item.transitTime ? `${item.transitTime} 天` : '-'],
    ['业务周次', item.staticEtdWeekOfYear],
    ['最后更新', formatDateTime(item.updateTime)],
  ];
});

const detailCutoffFields = computed(() => {
  const item = selectedItem.value;
  if (!item) return [];
  return [
    ['截关', formatScheduleMoment(item.cyCutoff)],
    ['截单', formatScheduleMoment(item.siCutoff)],
    ['截 VGM', formatScheduleMoment(item.vgmCutoff)],
    ['截订舱', formatScheduleMoment(item.bookingCutoff)],
    ['截港', formatScheduleMoment(item.inlandCutoff)],
    ['截海外舱单', formatScheduleMoment(item.manifestCutoff)],
    ['截放行条', formatScheduleMoment(item.cvCutoff)],
  ];
});

const detailInternalFields = computed(() => {
  const item = selectedItem.value;
  if (!item) return [];
  return [
    ['数据唯一 ID', item.solutionCode],
    ['路径 ID', item.pathCode],
    ['路径描述', item.pathDescription],
    ['数据描述', item.solutionDescription],
  ];
});

onMounted(() => {
  recentSearches.value = readRecent();
  bindRecentFit();
});

onBeforeUnmount(() => {
  recentFitObserver?.disconnect();
});

watch(recentSearches, () => {
  void nextTick(bindRecentFit);
});

watch(showResultSummary, () => {
  void nextTick(hideOverflowingRecentChips);
});

function uniqueOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ label: value, value }));
}

function readRecent(): RecentSearch[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? (parsed as CachedPorts[])
          .filter((item) => item?.polCode && item?.podCode)
          .map((item) => ({
            podCn: item.podCn,
            podCode: item.podCode,
            podEn: item.podEn,
            polCn: item.polCn,
            polCode: item.polCode,
            polEn: item.polEn,
          }))
          .slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function collectCachedPorts(): CachedPorts | null {
  if (!queryForm.polCode || !queryForm.podCode) return null;
  const pol = polSelectedItems.value[0];
  const pod = podSelectedItems.value[0];
  return {
    podCn: pod?.cnName?.trim() || pod?.portName?.trim() || queryForm.podCode,
    podCode: queryForm.podCode,
    podEn: pod?.portName?.trim() || queryForm.podCode,
    polCn: pol?.cnName?.trim() || pol?.portName?.trim() || queryForm.polCode,
    polCode: queryForm.polCode,
    polEn: pol?.portName?.trim() || queryForm.polCode,
  };
}

function toCachedPortItem(
  code: string,
  cnName: string,
  portName: string,
): PortCodeAdminApi.PortCodeDto {
  return {
    cnName,
    ediCode: code,
    // PortSelect 的 valueKey 是 ediCode；id 必须是港口 GUID，不能填五字码
    id: '',
    portName,
  };
}

function applyPorts(ports: CachedPorts) {
  queryForm.polCode = ports.polCode;
  queryForm.podCode = ports.podCode;
  polSelectedItems.value = [
    toCachedPortItem(ports.polCode, ports.polCn, ports.polEn),
  ];
  podSelectedItems.value = [
    toCachedPortItem(ports.podCode, ports.podCn, ports.podEn),
  ];
}

function hideOverflowingRecentChips() {
  const wrap = recentChipsRef.value;
  if (!wrap) return;
  const chips = [...wrap.querySelectorAll<HTMLElement>('.recent-chip')];
  chips.forEach((chip) => chip.classList.remove('is-overflow'));
  const limit = wrap.getBoundingClientRect().right;
  let hideRest = false;
  for (const chip of chips) {
    if (hideRest || chip.getBoundingClientRect().right > limit + 1) {
      chip.classList.add('is-overflow');
      hideRest = true;
    }
  }
}

function bindRecentFit() {
  recentFitObserver?.disconnect();
  const wrap = recentChipsRef.value;
  if (!wrap || typeof ResizeObserver === 'undefined') {
    void nextTick(hideOverflowingRecentChips);
    return;
  }
  recentFitObserver = new ResizeObserver(() => hideOverflowingRecentChips());
  recentFitObserver.observe(wrap);
  void nextTick(hideOverflowingRecentChips);
}

recentSearches.value = readRecent();

function rememberCurrentQuery() {
  const ports = collectCachedPorts();
  if (!ports) return;
  const next = [
    ports,
    ...recentSearches.value.filter(
      (item) =>
        !(item.polCode === ports.polCode && item.podCode === ports.podCode),
    ),
  ].slice(0, MAX_RECENT);
  recentSearches.value = next;
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
}

function applyRecent(item: RecentSearch) {
  applyPorts(item);
  void handleQuery();
}

async function handleQuery() {
  if (!queryForm.polCode || !queryForm.podCode || !queryForm.etd) {
    message.warning('请选择起运港、目的港与预计离港日期');
    return;
  }
  loading.value = true;
  queryFailed.value = false;
  try {
    const result = await queryScheduleAsync({
      etd: queryForm.etd,
      pageNum: 1,
      pageSize: 9999,
      podCode: queryForm.podCode.trim(),
      polCode: queryForm.polCode.trim(),
      weeksOut: QUERY_WEEKS,
    });
    allItems.value = sanitizeScheduleItems(result?.items ?? []);
    searched.value = true;
    rememberCurrentQuery();
    pruneStaleFilters();
    expandedGroupIds.value = new Set();
    visibleGroupCount.value = 80;
    if (allItems.value.length === 0 || result?.statusCode === 20_001) {
      message.info('当前条件下未查询到可用船期');
    }
  } catch {
    allItems.value = [];
    searched.value = true;
    queryFailed.value = true;
  } finally {
    loading.value = false;
  }
}

function swapPorts() {
  const polCode = queryForm.polCode;
  queryForm.polCode = queryForm.podCode;
  queryForm.podCode = polCode;
  const polItems = polSelectedItems.value;
  polSelectedItems.value = podSelectedItems.value;
  podSelectedItems.value = polItems;
}

function onPortChange(
  side: 'pod' | 'pol',
  option: { raw?: PortCodeAdminApi.PortCodeDto } | undefined,
) {
  const items = option?.raw ? [option.raw] : [];
  if (side === 'pol') polSelectedItems.value = items;
  else podSelectedItems.value = items;
}

function pruneStaleFilters() {
  const carrierSet = new Set(allItems.value.flatMap(getItemCarriers));
  const polSet = new Set(
    allItems.value
      .map((item) => getStandardTerminal(item, 'pol'))
      .filter(Boolean),
  );
  const podSet = new Set(
    allItems.value
      .map((item) => getStandardTerminal(item, 'pod'))
      .filter(Boolean),
  );
  filters.carrierCodes = filters.carrierCodes.filter((code) =>
    carrierSet.has(code),
  );
  filters.polTerminals = filters.polTerminals.filter((name) =>
    polSet.has(name),
  );
  filters.podTerminals = filters.podTerminals.filter((name) =>
    podSet.has(name),
  );
}

function resetFrontendFilters() {
  filters.carrierCodes = [];
  filters.keyword = '';
  filters.podTerminals = [];
  filters.polTerminals = [];
  filters.transitType = 'all';
  sortMode.value = 'weekdayAsc';
}

function toggleGroup(id: string) {
  const next = new Set(expandedGroupIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedGroupIds.value = next;
}

async function copyGroupName(name: string) {
  try {
    await navigator.clipboard.writeText(name);
    message.success('已复制方案名称');
  } catch {
    message.warning('复制失败，请手动选择方案名称');
  }
}

function loadMoreGroups() {
  visibleGroupCount.value += remainingLoadCount.value;
}

function getGroupTerminalPath(group: {
  podTerminal: string;
  polTerminal: string;
}) {
  return formatTerminalPath(group.polTerminal, group.podTerminal);
}

function getGroupWeekdaysText(group: ScheduleGroup) {
  return formatWeekdayShort(group.departureDay);
}

function openDetails(item: ScheduleItem) {
  selectedItem.value = item;
  detailOpen.value = true;
}

function detailTitle(item: ScheduleItem) {
  const vessel = item.vessel?.trim() || '船期详情';
  const voyage = item.voyage?.trim();
  return voyage ? `${vessel} / ${voyage}` : vessel;
}

function etdDelay(item: ScheduleItem) {
  return formatDelayLabel(item.etd, item.staticEtd);
}
</script>

<template>
  <Page
    auto-content-height
    class="schedule-page"
    content-class="schedule-page__body !overflow-hidden !p-0"
  >
    <header class="schedule-toolbar">
      <div class="toolbar-query" @keyup.enter="handleQuery">
        <h1 class="toolbar-title">船期查询</h1>

        <div class="port-pair">
          <PortSelect
            v-model="queryForm.polCode"
            allow-clear
            class="port-select"
            label-key="portNameEdi"
            placeholder="起运港"
            :selected-items="polSelectedItems"
            value-key="ediCode"
            @change="(_, option) => onPortChange('pol', option)"
          />
          <button
            type="button"
            class="port-swap"
            aria-label="交换起运港与目的港"
            @click="swapPorts"
          >
            <span class="sq-icon sq-icon--16" aria-hidden="true">
              <img :src="iconSwap" alt="" width="16" height="16" />
            </span>
          </button>
          <PortSelect
            v-model="queryForm.podCode"
            allow-clear
            class="port-select"
            label-key="portNameEdi"
            placeholder="目的港"
            :selected-items="podSelectedItems"
            value-key="ediCode"
            @change="(_, option) => onPortChange('pod', option)"
          />
        </div>

        <div class="date-field">
          <span class="sq-icon sq-icon--16" aria-hidden="true">
            <img :src="iconCalendar" alt="" width="16" height="16" />
          </span>
          <DatePicker
            v-model:value="queryForm.etd"
            :allow-clear="false"
            :bordered="false"
            format="YYYY-MM-DD"
            placeholder="预计离港"
            value-format="YYYY-MM-DD"
          />
        </div>

        <Button
          class="query-submit"
          :loading="loading"
          title="回车也可查询"
          type="primary"
          @click="handleQuery"
        >
          查询
        </Button>
      </div>

      <div v-if="searched" class="toolbar-filters">
        <div class="filter-left">
          <div class="filter-tabs" role="tablist" aria-label="直达或中转">
            <button
              type="button"
              :class="{ active: filters.transitType === 'all' }"
              @click="filters.transitType = 'all'"
            >
              全部 ({{ tabCountGroups.length }})
            </button>
            <button
              type="button"
              :class="{ active: filters.transitType === 'direct' }"
              @click="filters.transitType = 'direct'"
            >
              直达 ({{ directGroupCount }})
            </button>
            <button
              type="button"
              :class="{ active: filters.transitType === 'transit' }"
              @click="filters.transitType = 'transit'"
            >
              中转 ({{ transitGroupCount }})
            </button>
          </div>

          <span class="filter-divider" aria-hidden="true" />

          <Select
            v-model:value="filters.carrierCodes"
            allow-clear
            :bordered="false"
            class="ghost-select"
            mode="multiple"
            :options="carrierOptions"
            placeholder="船公司"
          >
            <template #suffixIcon>
              <span class="sq-icon sq-icon--chevron" aria-hidden="true">
                <img :src="iconChevronSm" alt="" width="10" height="6" />
              </span>
            </template>
          </Select>
          <Select
            v-model:value="filters.polTerminals"
            allow-clear
            :bordered="false"
            class="ghost-select"
            mode="multiple"
            :options="polTerminalOptions"
            placeholder="起运码头"
          >
            <template #suffixIcon>
              <span class="sq-icon sq-icon--chevron" aria-hidden="true">
                <img :src="iconChevronSm" alt="" width="10" height="6" />
              </span>
            </template>
          </Select>
          <Select
            v-model:value="filters.podTerminals"
            allow-clear
            :bordered="false"
            class="ghost-select"
            mode="multiple"
            :options="podTerminalOptions"
            placeholder="目的码头"
          >
            <template #suffixIcon>
              <span class="sq-icon sq-icon--chevron" aria-hidden="true">
                <img :src="iconChevronSm" alt="" width="10" height="6" />
              </span>
            </template>
          </Select>

          <Button
            v-if="activeFilterCount"
            class="filter-reset"
            type="link"
            @click="resetFrontendFilters"
          >
            清除筛选
          </Button>
        </div>

        <div class="filter-right">
          <div class="keyword-field">
            <Input
              v-model:value="filters.keyword"
              allow-clear
              :bordered="false"
              placeholder="搜索关键词..."
            >
              <template #prefix>
                <span class="sq-icon sq-icon--16" aria-hidden="true">
                  <img :src="iconSearch" alt="" width="16" height="16" />
                </span>
              </template>
            </Input>
          </div>
          <Select v-model:value="sortMode" class="sort-select">
            <template #suffixIcon>
              <span class="sq-icon sq-icon--chevron" aria-hidden="true">
                <img :src="iconChevronSmDark" alt="" width="10" height="6" />
              </span>
            </template>
            <Select.Option value="weekdayAsc">按周班</Select.Option>
            <Select.Option value="etdAsc">最早离港</Select.Option>
            <Select.Option value="etdDesc">最晚离港</Select.Option>
            <Select.Option value="durationAsc">航程最短</Select.Option>
          </Select>
        </div>
      </div>
    </header>

    <div class="schedule-main">
      <div
        v-if="showResultSummary || recentSearches.length"
        class="result-toolbar"
        :class="{
          'result-toolbar--split': showResultSummary && recentSearches.length,
        }"
      >
        <p v-if="showResultSummary" class="result-count">
          找到
          <strong>{{ filteredGroups.length }}</strong>
          个共舱方案，共
          <strong>{{ filteredItems.length }}</strong>
          个班次
        </p>
        <div v-if="recentSearches.length" class="recent-bar">
          <span class="recent-label">
            <span class="sq-icon sq-icon--14" aria-hidden="true">
              <img :src="iconClock" alt="" width="14" height="14" />
            </span>
            最近查询
          </span>
          <div ref="recentChipsRef" class="recent-chips">
            <button
              v-for="item in recentSearches"
              :key="`${item.polCode}-${item.podCode}`"
              type="button"
              class="recent-chip"
              @click="applyRecent(item)"
            >
              <span class="recent-port">
                <b>{{ item.polCn }}</b>
                <small>{{ item.polEn }}</small>
              </span>
              <span class="sq-icon sq-icon--14" aria-hidden="true">
                <img :src="iconArrowRight" alt="" width="14" height="14" />
              </span>
              <span class="recent-port">
                <b>{{ item.podCn }}</b>
                <small>{{ item.podEn }}</small>
              </span>
            </button>
          </div>
        </div>
      </div>
      <Spin :spinning="loading">
        <section
          v-if="!searched"
          class="schedule-empty schedule-empty--initial"
        >
          <p>选择起运港、目的港和离港日期后查询</p>
        </section>

        <template v-else>
          <section
            v-if="queryFailed || filteredGroups.length === 0"
            class="schedule-empty"
          >
            <Empty
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              :description="
                queryFailed
                  ? '船期查询失败，请稍后重试'
                  : allItems.length === 0
                    ? '当前航线暂无可用船期'
                    : '没有符合二次筛选条件的班次'
              "
            />
            <Button v-if="queryFailed" type="primary" @click="handleQuery">
              重新查询
            </Button>
            <Button
              v-else-if="allItems.length > 0"
              @click="resetFrontendFilters"
            >
              清除筛选
            </Button>
          </section>

          <section v-else class="scheme-board">
            <div class="scheme-columns" aria-hidden="true">
              <span>共舱服务</span>
              <span>航程</span>
              <span>最近离港</span>
              <span>最早截关</span>
              <span />
            </div>

            <article
              v-for="group in visibleGroups"
              :key="group.id"
              class="scheme-card"
              :class="{ 'scheme-card--open': expandedGroupIds.has(group.id) }"
            >
              <button
                type="button"
                class="scheme-card__summary"
                :aria-expanded="expandedGroupIds.has(group.id)"
                @click="toggleGroup(group.id)"
              >
                <div class="scheme-identity">
                  <div class="scheme-identity__title">
                    <span
                      class="scheme-kind"
                      :class="
                        group.isTransit
                          ? 'scheme-kind--transit'
                          : 'scheme-kind--direct'
                      "
                    >
                      {{ group.isTransit ? '中转' : '直达' }}
                    </span>
                    <Tooltip title="点击复制方案名称">
                      <span
                        class="scheme-group-name"
                        :title="group.groupName"
                        @click.stop="copyGroupName(group.groupName)"
                      >
                        {{ group.groupName }}
                      </span>
                    </Tooltip>
                  </div>
                  <div class="scheme-identity__meta">
                    <span v-if="getGroupWeekdaysText(group)">{{
                      getGroupWeekdaysText(group)
                    }}</span>
                    <i v-if="getGroupWeekdaysText(group)" />
                    <span>{{ group.items.length }} 班次</span>
                    <template v-if="getGroupTerminalPath(group)">
                      <i />
                      <span>{{ getGroupTerminalPath(group) }}</span>
                    </template>
                  </div>
                </div>

                <div class="scheme-duration">
                  <strong>{{
                    formatDurationFigure(group.minDuration, group.duration)
                  }}</strong>
                  <em>天</em>
                </div>

                <div class="scheme-etd">
                  {{ formatMonthDay(group.nextEtd) || '—' }}
                </div>

                <div class="scheme-cutoff">
                  <strong>{{
                    formatMonthDay(group.nearestCyCutoff) || '—'
                  }}</strong>
                  <span
                    v-if="splitScheduleMoment(group.nearestCyCutoff).time"
                    >{{ splitScheduleMoment(group.nearestCyCutoff).time }}</span
                  >
                </div>

                <span class="scheme-toggle" aria-hidden="true">
                  <span class="sq-icon sq-icon--26">
                    <img
                      :src="
                        expandedGroupIds.has(group.id)
                          ? iconChevronUp
                          : iconChevronDown
                      "
                      alt=""
                      width="26"
                      height="26"
                    />
                  </span>
                </span>
              </button>

              <div v-if="expandedGroupIds.has(group.id)" class="scheme-detail">
                <table class="scheme-table">
                  <colgroup>
                    <col />
                    <col class="scheme-table__voyage" />
                    <col class="scheme-table__moment" />
                    <col class="scheme-table__moment" />
                    <col class="scheme-table__cutoff" />
                    <col class="scheme-table__duration" />
                    <col class="scheme-table__action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>船名</th>
                      <th>航次</th>
                      <th>计划离港</th>
                      <th>计划到港</th>
                      <th>截关时间</th>
                      <th class="is-center">航程</th>
                      <th class="is-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(record, rowIndex) in group.items"
                      :key="makeScheduleRowKey(record, rowIndex)"
                    >
                      <td>
                        <div class="vessel-name-row">
                          <Tooltip title="查看详情">
                            <button
                              type="button"
                              class="vessel-link"
                              @click="openDetails(record)"
                            >
                              {{ record.vessel || '-' }}
                            </button>
                          </Tooltip>
                          <Popover
                            overlay-class-name="vessel-hover-pop"
                            placement="rightTop"
                            trigger="hover"
                          >
                            <template #content>
                              <div class="vessel-hover">
                                <div
                                  v-for="field in getVesselHoverFields(record)"
                                  :key="field.label"
                                  class="vessel-hover__item"
                                >
                                  <span>{{ field.label }}</span>
                                  <strong>{{ field.value }}</strong>
                                </div>
                              </div>
                            </template>
                            <button
                              type="button"
                              class="vessel-info"
                              aria-label="船舶信息"
                              @click.stop
                            >
                              <img
                                :src="iconInfo"
                                alt=""
                                width="14"
                                height="14"
                              />
                            </button>
                          </Popover>
                        </div>
                      </td>
                      <td>
                        <span class="vessel-voyage">{{
                          record.voyage || '-'
                        }}</span>
                      </td>
                      <td>
                        <div class="moment-cell">
                          <strong>{{
                            splitScheduleMoment(record.etd || record.staticEtd)
                              .date
                          }}</strong>
                          <div class="moment-cell__sub">
                            <span>{{
                              splitScheduleMoment(
                                record.etd || record.staticEtd,
                              ).time
                            }}</span>
                            <span v-if="etdDelay(record)" class="delay-tag">
                              {{ etdDelay(record) }}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="moment-cell">
                          <strong>{{
                            splitScheduleMoment(record.eta || record.staticEta)
                              .date
                          }}</strong>
                          <span>{{
                            splitScheduleMoment(record.eta || record.staticEta)
                              .time
                          }}</span>
                        </div>
                      </td>
                      <td class="cutoff-cell">
                        {{ formatScheduleMoment(record.cyCutoff) }}
                      </td>
                      <td>
                        <div class="duration-cell">
                          <b>{{
                            record.totalDuration ?? record.transitTime ?? '—'
                          }}</b>
                          <small>天</small>
                        </div>
                      </td>
                      <td class="is-right">
                        <Button
                          type="link"
                          size="small"
                          @click="openDetails(record)"
                        >
                          详情
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <Button
              v-if="remainingGroupCount > 0"
              class="scheme-load-more"
              @click="loadMoreGroups"
            >
              再显示 {{ remainingLoadCount }} 个方案（剩余
              {{ remainingGroupCount }} 个）
            </Button>
          </section>
        </template>
      </Spin>
    </div>

    <Modal
      v-model:open="detailOpen"
      :destroy-on-close="true"
      :footer="null"
      :title="selectedItem ? detailTitle(selectedItem) : '船期完整详情'"
      :width="'min(920px, 96vw)'"
      class="schedule-detail-modal"
      wrap-class-name="schedule-detail-modal-wrap"
    >
      <div v-if="selectedItem" class="detail-sheet">
        <div class="detail-sheet__hero">
          <div>
            <span>{{
              selectedItem.carrierCd || selectedItem.scac || '船公司'
            }}</span>
            <h2>{{ selectedItem.vessel || '-' }}</h2>
            <p>
              {{ selectedItem.voyage || '-' }} ·
              {{ selectedItem.routeCode || '-' }}
            </p>
          </div>
          <Tag :color="selectedItem.isTransit ? 'default' : 'blue'">
            {{ selectedItem.isTransit ? '中转航线' : '直达航线' }}
          </Tag>
        </div>

        <h3>船舶与航线</h3>
        <Descriptions :column="{ xs: 1, sm: 2 }" bordered size="small">
          <DescriptionsItem
            v-for="field in detailBasicFields"
            :key="String(field[0])"
            :label="field[0]"
          >
            {{ text(field[1]) }}
          </DescriptionsItem>
          <DescriptionsItem label="共舱" :span="2">
            {{ getItemCarriers(selectedItem).join(' / ') || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="全部航线代码" :span="2">
            {{ getItemRouteCodes(selectedItem).join(' / ') || '-' }}
          </DescriptionsItem>
        </Descriptions>

        <h3>港口与码头</h3>
        <Descriptions :column="{ xs: 1, sm: 2 }" bordered size="small">
          <DescriptionsItem
            v-for="field in detailPortFields"
            :key="String(field[0])"
            :label="field[0]"
          >
            {{ text(field[1]) }}
          </DescriptionsItem>
        </Descriptions>

        <template v-if="selectedItem.transits?.length">
          <h3>中转路径</h3>
          <div class="transit-list">
            <div
              v-for="(transit, index) in selectedItem.transits"
              :key="`${transit.portCode}-${index}`"
            >
              <span>{{ index + 1 }}</span>
              <div>
                <strong>{{
                  transit.portName || transit.portEn || transit.portCode
                }}</strong>
                <p>
                  {{ transit.terminalCn || transit.terminal || '码头未标注' }}
                  · {{ transit.vessel || '-' }} /
                  {{ transit.voyage || '-' }}
                </p>
                <small>
                  到 {{ formatScheduleMoment(transit.eta) }} · 离
                  {{ formatScheduleMoment(transit.etd) }}
                </small>
              </div>
            </div>
          </div>
        </template>

        <h3>时间与航程</h3>
        <Descriptions :column="{ xs: 1, sm: 2 }" bordered size="small">
          <DescriptionsItem
            v-for="field in detailTimeFields"
            :key="String(field[0])"
            :label="field[0]"
          >
            {{ text(field[1]) }}
          </DescriptionsItem>
        </Descriptions>

        <h3>截点</h3>
        <Descriptions :column="{ xs: 1, sm: 2 }" bordered size="small">
          <DescriptionsItem
            v-for="field in detailCutoffFields"
            :key="String(field[0])"
            :label="field[0]"
          >
            {{ text(field[1]) }}
          </DescriptionsItem>
        </Descriptions>

        <h3>数据标识</h3>
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            v-for="field in detailInternalFields"
            :key="String(field[0])"
            :label="field[0]"
          >
            {{ text(field[1]) }}
          </DescriptionsItem>
        </Descriptions>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
/* stylelint-disable order/order, order/properties-order, hue-degree-notation, declaration-empty-line-before -- component styles are grouped by visual concern */
.schedule-page {
  --sq-ink: #1d1d1f;
  --sq-muted: #86868b;
  --sq-line: #e5e5ea;
  --sq-fill: #f5f5f7;
  --sq-chip: rgb(229 229 234 / 40%);
  --sq-blue: #0071e3;
  --sq-black: #18181b;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--sq-fill);
  color: var(--sq-ink);
}

.schedule-page :deep(.schedule-page__body) {
  display: flex;
  min-height: 0;
  flex-direction: column;
  background: var(--sq-fill);
}

.sq-icon {
  display: inline-flex;
  overflow: hidden;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.sq-icon img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.sq-icon--14 {
  width: 14px;
  height: 14px;
}

.sq-icon--16 {
  width: 16px;
  height: 16px;
}

.sq-icon--26 {
  width: 26px;
  height: 26px;
}

.sq-icon--chevron {
  width: 10px;
  height: 6px;
}

.schedule-toolbar {
  position: sticky;
  z-index: 20;
  top: 0;
  flex-shrink: 0;
  border-bottom: 1px solid var(--sq-line);
  background: rgb(255 255 255 / 92%);
  box-shadow:
    0 1px 3px rgb(0 0 0 / 10%),
    0 1px 2px rgb(0 0 0 / 10%);
  backdrop-filter: blur(12px);
}

.toolbar-query {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: 12px 24px;
}

.toolbar-title {
  margin: 0 8px 0 0;
  color: var(--sq-ink);
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  white-space: nowrap;
}

.port-pair {
  display: flex;
  flex: 1 1 420px;
  min-width: 280px;
  max-width: 720px;
  gap: 4px;
  align-items: center;
  padding: 4px;
  border: 1px solid var(--sq-line);
  border-radius: 8px;
  background: var(--sq-chip);
}

.port-select {
  min-width: 140px;
  flex: 1 1 176px;
}

.port-pair :deep(.ant-select-selector),
.date-field :deep(.ant-picker),
.date-field :deep(.ant-picker:hover),
.date-field :deep(.ant-picker-focused) {
  min-height: 28px !important;
  padding-block: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  outline: none !important;
}

.port-pair :deep(.ant-select-selector) {
  padding-inline: 12px 8px !important;
}

.port-swap {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.port-swap:hover {
  background: rgb(255 255 255 / 70%);
}

.date-field {
  display: flex;
  height: 38px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--sq-line);
  border-radius: 8px;
  background: var(--sq-chip);
}

.date-field:focus-within {
  border-color: var(--sq-line);
}

.date-field :deep(.ant-picker) {
  flex: 1;
  min-width: 118px;
  padding-inline: 0;
}

.date-field :deep(.ant-picker-input > input) {
  box-shadow: none !important;
}

.date-field :deep(.ant-picker-suffix) {
  display: none;
}

.query-submit {
  margin-left: auto;
  min-width: 88px;
  height: 38px;
  padding-inline: 24px;
  border: 0;
  border-radius: 8px;
  background: var(--sq-black) !important;
  box-shadow:
    0 1px 1.5px rgb(0 0 0 / 10%),
    0 1px 1px rgb(0 0 0 / 10%);
  font-weight: 500;
}

.query-submit:hover,
.query-submit:focus {
  background: #000 !important;
}

.toolbar-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px 12px;
}

.filter-left,
.filter-right {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 2px;
  border-radius: 6px;
  background: var(--sq-chip);
}

.filter-tabs button {
  padding: 4px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--sq-muted);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.filter-tabs button.active {
  border-color: var(--sq-line);
  background: #fff;
  box-shadow:
    0 1px 1.5px rgb(0 0 0 / 10%),
    0 1px 1px rgb(0 0 0 / 10%);
  color: var(--sq-ink);
}

.filter-divider {
  width: 1px;
  height: 16px;
  background: #e4e4e7;
}

.ghost-select {
  min-width: 88px;
  max-width: none;
}

.ghost-select :deep(.ant-select-selector) {
  min-height: 24px !important;
  height: auto !important;
  padding-inline: 4px !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--sq-muted);
}

.ghost-select :deep(.ant-select-selection-overflow) {
  flex-wrap: wrap;
}

.ghost-select :deep(.ant-select-selection-item) {
  margin-inline-end: 4px;
}

.ghost-select :deep(.ant-select-selection-placeholder) {
  color: var(--sq-muted);
}

.filter-reset {
  padding-inline: 0;
  color: var(--sq-muted);
}

.keyword-field {
  width: 224px;
}

.keyword-field :deep(.ant-input-affix-wrapper) {
  width: 224px;
  height: 32px;
  padding-inline: 10px 12px;
  border: 1px solid var(--sq-line) !important;
  border-radius: 6px;
  background: #fff !important;
  box-shadow: none !important;
}

.keyword-field :deep(.ant-input-affix-wrapper:hover),
.keyword-field :deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--sq-line) !important;
  box-shadow: none !important;
}

.keyword-field :deep(.ant-input),
.keyword-field :deep(.ant-input:hover),
.keyword-field :deep(.ant-input:focus) {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  outline: none !important;
}

.sort-select {
  width: 112px;
}

.sort-select :deep(.ant-select-selector) {
  min-height: 32px !important;
  padding-inline: 8px !important;
  border: 1px solid var(--sq-line) !important;
  border-radius: 6px;
  background: #fff !important;
}

.schedule-main {
  width: 100%;
  min-height: 0;
  max-width: none;
  flex: 1;
  overflow: auto;
  padding: 16px 24px 32px;
}

.schedule-empty {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--sq-muted);
  text-align: center;
}

.schedule-empty--initial {
  min-height: 160px;
}

.schedule-empty--initial p {
  margin: 0;
}

.scheme-board {
  display: flex;
  width: 100%;
  flex-direction: column;
}

.result-toolbar {
  display: flex;
  min-width: 0;
  gap: 16px;
  align-items: center;
  padding-bottom: 12px;
}

.result-count {
  margin: 0;
  flex-shrink: 0;
  color: var(--sq-muted);
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
}

.result-count strong {
  color: var(--sq-ink);
  font-weight: 600;
}

.recent-bar {
  display: flex;
  min-width: 0;
  flex: 1;
  gap: 12px;
  align-items: center;
}

.result-toolbar--split .recent-bar {
  justify-content: flex-end;
}

.recent-label {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  color: var(--sq-muted);
  font-size: 14px;
  font-weight: 500;
}

.recent-chips {
  display: flex;
  min-width: 0;
  flex: 0 1 auto;
  gap: 12px;
  align-items: center;
  overflow: hidden;
}

.recent-chip {
  display: inline-flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid var(--sq-line);
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
}

.recent-chip.is-overflow {
  display: none;
}

.recent-chip:hover {
  border-color: #d2d2d7;
}

.recent-port {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
}

.recent-port b {
  color: var(--sq-ink);
  font-size: 14px;
  font-weight: 600;
  line-height: 21px;
}

.recent-port small {
  color: var(--sq-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
}

.scheme-columns,
.scheme-card__summary {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr) minmax(88px, 12%) minmax(108px, 14%) minmax(156px, 16%)
    40px;
  gap: 16px;
  align-items: center;
}

.scheme-columns {
  padding: 0 32px 8px;
  color: var(--sq-muted);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.7px;
  line-height: 20px;
}

.scheme-card {
  overflow: hidden;
  margin-top: 12px;
  border: 1px solid var(--sq-line);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 6px rgb(0 0 0 / 3%);
}

.scheme-card--open {
  border-color: transparent;
  box-shadow:
    0 0 0 1px rgb(0 113 227 / 20%),
    0 8px 24px rgb(0 0 0 / 6%);
}

.scheme-card__summary {
  width: 100%;
  padding: 20px 32px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.scheme-identity {
  min-width: 0;
  padding-right: 16px;
}

.scheme-identity__title {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.scheme-kind {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.7px;
  line-height: 21px;
}

.scheme-kind--direct {
  background: #e5f0ff;
  color: var(--sq-blue);
}

.scheme-kind--transit {
  background: var(--sq-fill);
  color: var(--sq-muted);
}

.scheme-group-name {
  overflow: hidden;
  min-width: 0;
  color: var(--sq-ink);
  font-size: 19px;
  font-weight: 600;
  line-height: 28.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scheme-identity__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
  color: var(--sq-muted);
  font-size: 16px;
  line-height: 24px;
}

.scheme-identity__meta span:first-child {
  font-weight: 500;
}

.scheme-identity__meta i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #d4d4d8;
  font-style: normal;
}

.scheme-duration {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.scheme-duration strong {
  color: var(--sq-ink);
  font-size: 28px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 42px;
}

.scheme-duration em {
  color: var(--sq-muted);
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
}

.scheme-etd,
.scheme-cutoff strong {
  color: var(--sq-ink);
  font-family: Consolas, 'SF Mono', ui-monospace, monospace;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  line-height: 33px;
}

.scheme-cutoff {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: baseline;
  white-space: nowrap;
}

.scheme-cutoff span {
  color: var(--sq-muted);
  font-family: Consolas, 'SF Mono', ui-monospace, monospace;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  line-height: 24px;
}

.scheme-toggle {
  display: flex;
  justify-content: flex-end;
}

.scheme-detail {
  overflow-x: auto;
  padding: 24px 32px;
  border-top: 1px solid var(--sq-line);
  background: var(--sq-fill);
}

.scheme-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.scheme-table__voyage {
  width: 12%;
}

.scheme-table__moment {
  width: 16%;
}

.scheme-table__cutoff {
  width: 18%;
}

.scheme-table__duration {
  width: 72px;
}

.scheme-table__action {
  width: 72px;
}

.scheme-table th,
.scheme-table td {
  padding: 18px 16px;
  vertical-align: top;
  text-align: left;
}

.scheme-table th {
  padding-block: 6px;
  border-bottom: 1px solid var(--sq-line);
  color: var(--sq-muted);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.7px;
}

.scheme-table td {
  border-bottom: 1px solid var(--sq-line);
}

.scheme-table tbody tr:last-child td {
  border-bottom: 0;
}

.scheme-table .is-center {
  text-align: center;
}

.scheme-table .is-right {
  text-align: right;
}

.vessel-name-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.vessel-info {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: help;
  line-height: 0;
  opacity: 0.72;
}

.vessel-info:hover {
  opacity: 1;
}

.vessel-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--sq-ink);
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  line-height: 23px;
  text-align: left;
}

.vessel-link:hover {
  color: var(--sq-blue);
}

.vessel-voyage {
  color: var(--sq-ink);
  font-family: Consolas, 'SF Mono', ui-monospace, monospace;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  line-height: 23px;
  white-space: nowrap;
}

.moment-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  font-family: Consolas, 'SF Mono', ui-monospace, monospace;
}

.moment-cell strong {
  color: var(--sq-ink);
  font-size: 18px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  line-height: 26px;
}

.cutoff-cell {
  color: var(--sq-ink);
  font-family: Consolas, 'SF Mono', ui-monospace, monospace;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 26px;
  white-space: nowrap;
}

.moment-cell span,
.moment-cell__sub {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--sq-muted);
  font-size: 16px;
  line-height: 23px;
}

.moment-cell .delay-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: #ffe2e2;
  color: #c10007;
  font-family: Consolas, 'SF Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.6px;
  line-height: 12px;
}

.duration-cell {
  color: var(--sq-muted);
  text-align: center;
}

.duration-cell b {
  font-size: 16px;
  font-weight: 600;
  line-height: 23px;
}

.duration-cell small {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 400;
}

.scheme-load-more {
  margin-top: 16px;
  min-height: 44px;
  border-style: dashed;
  color: var(--sq-muted);
}

.detail-sheet__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
  padding: 20px 22px;
  border: 1px solid var(--sq-line);
  border-radius: 12px;
  background: var(--sq-fill);
}

.detail-sheet__hero span,
.detail-sheet__hero p {
  color: var(--sq-muted);
  font-size: 12px;
}

.detail-sheet__hero h2 {
  margin: 3px 0;
  font-size: 24px;
}

.detail-sheet__hero p {
  margin: 0;
}

.detail-sheet h3 {
  margin: 28px 0 10px;
  color: var(--sq-ink);
  font-size: 14px;
}

.transit-list {
  display: flex;
  flex-direction: column;
}

.transit-list > div {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 0 0 22px;
}

.transit-list > div::after {
  position: absolute;
  top: 24px;
  bottom: 0;
  left: 11px;
  width: 1px;
  background: var(--sq-line);
  content: '';
}

.transit-list > div:last-child::after {
  display: none;
}

.transit-list > div > span {
  z-index: 1;
  display: inline-flex;
  width: 23px;
  height: 23px;
  flex: 0 0 23px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--sq-black);
  color: white;
  font-size: 10px;
}

.transit-list p {
  margin: 2px 0;
  color: var(--sq-muted);
  font-size: 12px;
}

.transit-list small {
  color: var(--sq-muted);
}

.detail-sheet {
  padding: 8px 20px 20px;
}

@media (max-width: 1280px) {
  .scheme-columns,
  .scheme-card__summary {
    grid-template-columns: minmax(0, 1fr) 110px 120px 168px 32px;
    gap: 12px;
    padding-inline: 20px;
  }

  .scheme-group-name {
    font-size: 16px;
  }

  .scheme-duration strong,
  .scheme-etd,
  .scheme-cutoff strong {
    font-size: 20px;
    line-height: 28px;
  }
}

@media (max-width: 900px) {
  .query-submit {
    margin-left: 0;
  }

  .scheme-columns {
    display: none;
  }

  .scheme-card__summary {
    grid-template-columns: minmax(0, 1fr) 32px;
  }

  .scheme-duration,
  .scheme-etd,
  .scheme-cutoff {
    display: none;
  }

  .scheme-table,
  .scheme-table tbody,
  .scheme-table tr,
  .scheme-table td {
    display: block;
    width: 100%;
  }

  .scheme-table thead {
    display: none;
  }

  .scheme-table td {
    padding: 8px 0;
  }
}

@media (max-width: 640px) {
  .toolbar-query,
  .toolbar-filters,
  .schedule-main {
    padding-inline: 12px;
  }

  .port-select,
  .keyword-field,
  .sort-select {
    width: 100%;
  }

  .port-pair {
    width: 100%;
    max-width: none;
  }
}
</style>

<style>
.schedule-detail-modal-wrap {
  --sq-ink: #1d1d1f;
  --sq-muted: #86868b;
  --sq-line: #e5e5ea;
  --sq-fill: #f5f5f7;
}

.schedule-detail-modal-wrap .ant-modal {
  max-width: 96vw;
  padding-bottom: 0;
}

.schedule-detail-modal-wrap .ant-modal-content {
  overflow: hidden;
}

.schedule-detail-modal-wrap .ant-modal-body {
  max-height: 78vh;
  overflow: auto;
  padding: 12px 16px 20px;
}

.vessel-hover-pop .ant-popover-inner {
  padding: 14px 16px;
  border: 0;
  background: #18181b;
  box-shadow: 0 12px 32px rgb(0 0 0 / 22%);
  color: #fff;
}

.vessel-hover-pop .ant-popover-arrow::after,
.vessel-hover-pop .ant-popover-arrow::before {
  background: #18181b;
}

.vessel-hover {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr);
  gap: 12px 28px;
  min-width: 280px;
}

.vessel-hover__item span {
  display: block;
  color: rgb(255 255 255 / 62%);
  font-size: 12px;
  line-height: 18px;
}

.vessel-hover__item strong {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  overflow-wrap: anywhere;
}
</style>
