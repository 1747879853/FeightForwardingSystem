<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { FeituoPortCongestionApi } from '#/api/port-congestion/feituo-port-congestion-admin';

import { computed, nextTick, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import {
  Card,
  Descriptions,
  DescriptionsItem,
  Divider,
  Empty,
  message,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { PortSelect } from '#/adapter/component/biz-select';
import { queryPortCongestionAsync } from '#/api/port-congestion/feituo-port-congestion-admin';

import {
  formatCoordinate,
  formatCount,
  formatDays,
  formatHours,
  formatHoursWithDays,
  formatHumidity,
  formatMeasure,
  formatWind,
  getPortStatusMeta,
  getPortWeatherMeta,
  getWeatherTypeText,
  sortRowsByDate,
  useDailyColumns,
} from './data';

defineOptions({ name: 'PortCongestionAnalysis' });

type PortCongestionResultDto = FeituoPortCongestionApi.PortCongestionResultDto;
type PortCongestionRowDto = FeituoPortCongestionApi.PortCongestionRowDto;

const loading = ref(false);
const searched = ref(false);
const queryFailed = ref(false);
const portCode = ref<string>();
const result = ref<null | PortCongestionResultDto>(null);
const expandedRowKeys = ref<string[]>([]);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const dailyColumns = useDailyColumns();

const rows = computed<PortCongestionRowDto[]>(() => result.value?.rows ?? []);
const hasRows = computed(() => rows.value.length > 0);
/** 表格最新在前 */
const dailyRows = computed(() => sortRowsByDate(rows.value, 'desc'));
const latestRow = computed<PortCongestionRowDto | undefined>(
  () => dailyRows.value[0],
);
const latestStatus = computed(() =>
  getPortStatusMeta(latestRow.value?.portStatus),
);
const latestWeather = computed(() =>
  getPortWeatherMeta(latestRow.value?.portWeather),
);

const emptyDescription = computed(() => {
  if (queryFailed.value) return '查询失败，请稍后重试';
  return searched.value ? '该港口最近 15 天暂无拥堵数据' : '请选择港口';
});

function resetResult() {
  searched.value = false;
  queryFailed.value = false;
  result.value = null;
  expandedRowKeys.value = [];
}

/** 标题栏选港即查；清空则回到空态 */
async function handlePortChange(value: unknown) {
  const code = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!code) {
    resetResult();
    return;
  }
  await fetchData(code);
}

async function fetchData(code: string) {
  loading.value = true;
  expandedRowKeys.value = [];
  try {
    const data = await queryPortCongestionAsync({
      portCode: code,
      // 本页需展示展开行船舶 MMSI，固定拉取明细
      includeMmsi: true,
    });
    result.value = data ?? null;
    searched.value = true;
    queryFailed.value = false;
  } catch {
    // 业务错误已由请求层统一弹窗，这里只清掉上一次结果，避免与新港口混淆
    result.value = null;
    queryFailed.value = true;
    return;
  } finally {
    loading.value = false;
  }

  if (rows.value.length === 0) {
    message.info('该港口最近 15 天暂无拥堵数据');
    return;
  }
  // 图表需等容器可见后再渲染，不阻塞查询 loading
  void renderTrendChart();
}

/** 近 15 天趋势：船舶数走左轴柱状，时长走右轴折线；缺采集的天为 null，由图表跳过 */
async function renderTrendChart() {
  await nextTick();
  const ascRows = sortRowsByDate(rows.value, 'asc');
  const dates = ascRows.map((row) => row.key ?? '');
  const pick = (key: keyof PortCongestionRowDto) =>
    ascRows.map((row) => (row[key] ?? null) as null | number);

  await renderEcharts({
    grid: { left: 8, right: 8, bottom: 8, top: 64, containLabel: true },
    legend: { top: 0, type: 'scroll' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: dates, axisTick: { show: false } },
    yAxis: [
      { type: 'value', name: '船舶数(艘)', minInterval: 1 },
      { type: 'value', name: '时长(小时)', splitLine: { show: false } },
    ],
    series: [
      {
        name: '在港船数',
        type: 'bar',
        barMaxWidth: 16,
        data: pick('ataVesselCount'),
      },
      {
        name: '靠泊船数',
        type: 'bar',
        barMaxWidth: 16,
        data: pick('atbVesselCount'),
      },
      {
        name: '离港船数',
        type: 'bar',
        barMaxWidth: 16,
        data: pick('atdVesselCount'),
      },
      {
        name: '平均候泊时长',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        connectNulls: false,
        data: pick('avgAtbA'),
      },
      {
        name: '平均作业时长',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        connectNulls: false,
        data: pick('avgAtbD'),
      },
      {
        name: '平均在港时长',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        connectNulls: false,
        data: pick('avgAtd'),
      },
    ],
  });
}

function getVesselGroups(row: PortCongestionRowDto) {
  return [
    { label: '在港船舶', list: row.ataVessels ?? [] },
    { label: '在泊船舶', list: row.atbVessels ?? [] },
    { label: '离港船舶', list: row.atdVessels ?? [] },
  ].filter((group) => group.list.length > 0);
}

function hasVesselDetail(row: PortCongestionRowDto): boolean {
  return getVesselGroups(row).length > 0;
}
</script>

<template>
  <Page>
    <Card title="港口拥堵分析">
      <template #extra>
        <div class="w-[280px]">
          <PortSelect
            v-model="portCode"
            allow-clear
            label-key="ediPortCountry"
            placeholder="请选择港口"
            value-key="ediCode"
            @change="handlePortChange"
          />
        </div>
      </template>

      <Spin :spinning="loading">
        <div v-show="hasRows">
          <div class="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div class="flex flex-col">
              <span class="text-xs text-gray-500">港口代码</span>
              <span class="text-lg font-semibold">
                {{ result?.portCode || '-' }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-gray-500">经纬度（纬,经）</span>
              <span class="text-sm">
                {{ formatCoordinate(result?.lat, result?.lon) }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-gray-500">统计日期</span>
              <span class="text-sm">{{ latestRow?.key || '-' }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-gray-500">拥堵状态</span>
              <span>
                <Tag :color="latestStatus.color">{{ latestStatus.text }}</Tag>
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-gray-500">天气影响</span>
              <span>
                <Tag :color="latestWeather.color">
                  {{ latestWeather.text }}
                </Tag>
                <span class="text-sm text-gray-600">
                  {{
                    getWeatherTypeText(
                      latestRow?.portWeatherDetails?.weatherType,
                    )
                  }}
                </span>
              </span>
            </div>
          </div>

          <div
            class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6"
          >
            <div class="rounded-md bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <div class="text-xs text-gray-500">在港总船数</div>
              <div class="text-xl font-semibold">
                {{ formatCount(latestRow?.ataVesselCount) }}
              </div>
            </div>
            <div class="rounded-md bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <div class="text-xs text-gray-500">靠泊总船数</div>
              <div class="text-xl font-semibold">
                {{ formatCount(latestRow?.atbVesselCount) }}
              </div>
            </div>
            <div class="rounded-md bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <div class="text-xs text-gray-500">离港总船数</div>
              <div class="text-xl font-semibold">
                {{ formatCount(latestRow?.atdVesselCount) }}
              </div>
            </div>
            <div class="rounded-md bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <div class="text-xs text-gray-500">平均候泊时长</div>
              <div class="text-xl font-semibold">
                {{ formatHours(latestRow?.avgAtbA) }}
              </div>
            </div>
            <div class="rounded-md bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <div class="text-xs text-gray-500">平均作业时长</div>
              <div class="text-xl font-semibold">
                {{ formatHours(latestRow?.avgAtbD) }}
              </div>
            </div>
            <div class="rounded-md bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <div class="text-xs text-gray-500">平均在港时长</div>
              <div class="text-xl font-semibold">
                {{ formatHours(latestRow?.avgAtd) }}
              </div>
              <div class="text-xs text-gray-500">
                {{ formatDays(latestRow?.avgAtd) }}
              </div>
            </div>
          </div>

          <div
            v-if="latestRow?.portStatusDetails"
            class="mt-4 rounded-md border-l-4 border-blue-400 bg-blue-50 px-4 py-3 text-sm leading-relaxed dark:bg-gray-800"
          >
            {{ latestRow.portStatusDetails }}
          </div>

          <Divider orientation="left">近 15 天趋势</Divider>
          <EchartsUI ref="chartRef" height="340px" />

          <Divider orientation="left">每日明细</Divider>
          <Table
            v-model:expanded-row-keys="expandedRowKeys"
            :columns="dailyColumns"
            :data-source="dailyRows"
            :pagination="false"
            :row-key="(record) => record.key ?? ''"
            :scroll="{ x: 1480 }"
            bordered
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'portStatus'">
                <Tag :color="getPortStatusMeta(record.portStatus).color">
                  {{ getPortStatusMeta(record.portStatus).text }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'ataVesselCount'">
                {{ formatCount(record.ataVesselCount) }}
              </template>
              <template v-else-if="column.key === 'atbVesselCount'">
                {{ formatCount(record.atbVesselCount) }}
              </template>
              <template v-else-if="column.key === 'atdVesselCount'">
                {{ formatCount(record.atdVesselCount) }}
              </template>
              <template v-else-if="column.key === 'avgAtbA'">
                {{ formatHours(record.avgAtbA) }}
              </template>
              <template v-else-if="column.key === 'avgAtbD'">
                {{ formatHours(record.avgAtbD) }}
              </template>
              <template v-else-if="column.key === 'avgAtd'">
                {{ formatHoursWithDays(record.avgAtd) }}
              </template>
              <template v-else-if="column.key === 'portWeather'">
                <Tag :color="getPortWeatherMeta(record.portWeather).color">
                  {{ getPortWeatherMeta(record.portWeather).text }}
                </Tag>
                <span class="text-gray-600">
                  {{
                    getWeatherTypeText(record.portWeatherDetails?.weatherType)
                  }}
                </span>
              </template>
              <template v-else-if="column.key === 'portStatusDetails'">
                <Tooltip
                  v-if="record.portStatusDetails"
                  :overlay-style="{ maxWidth: '420px' }"
                >
                  <template #title>{{ record.portStatusDetails }}</template>
                  <span class="cursor-help">
                    {{ record.portStatusDetails }}
                  </span>
                </Tooltip>
                <span v-else class="text-gray-400">-</span>
              </template>
            </template>

            <template #expandedRowRender="{ record }">
              <div class="flex flex-col gap-3 px-2 py-1">
                <Descriptions
                  :column="{ xs: 1, sm: 2, xl: 4 }"
                  size="small"
                  bordered
                  title="天气详情"
                >
                  <DescriptionsItem label="天气类型">
                    {{
                      getWeatherTypeText(record.portWeatherDetails?.weatherType)
                    }}
                  </DescriptionsItem>
                  <DescriptionsItem label="观测时间">
                    {{ record.portWeatherDetails?.date || '-' }}
                  </DescriptionsItem>
                  <DescriptionsItem label="气温">
                    {{
                      formatMeasure(record.portWeatherDetails?.temperature, '℃')
                    }}
                  </DescriptionsItem>
                  <DescriptionsItem label="能见度">
                    {{
                      formatMeasure(record.portWeatherDetails?.visibility, 'm')
                    }}
                  </DescriptionsItem>
                  <DescriptionsItem label="相对湿度">
                    {{ formatHumidity(record.portWeatherDetails?.humidity) }}
                  </DescriptionsItem>
                  <DescriptionsItem label="气压">
                    {{
                      formatMeasure(
                        record.portWeatherDetails?.atmosphericPressure,
                        'Pa',
                        0,
                      )
                    }}
                  </DescriptionsItem>
                  <DescriptionsItem label="小时降水">
                    {{
                      formatMeasure(record.portWeatherDetails?.rainfall, 'mm')
                    }}
                  </DescriptionsItem>
                  <DescriptionsItem label="风">
                    {{ formatWind(record.portWeatherDetails?.wind) }}
                  </DescriptionsItem>
                  <DescriptionsItem label="天气现象" :span="4">
                    {{ record.portWeatherDetails?.portWeatherDetails || '-' }}
                  </DescriptionsItem>
                </Descriptions>

                <div v-if="record.portStatusDetailsEn">
                  <div class="mb-1 text-xs text-gray-500">
                    拥堵原因分析（英文）
                  </div>
                  <div class="text-sm leading-relaxed">
                    {{ record.portStatusDetailsEn }}
                  </div>
                </div>

                <div v-if="hasVesselDetail(record)">
                  <div class="mb-1 text-xs text-gray-500">船舶明细（MMSI）</div>
                  <div class="flex flex-col gap-2">
                    <div
                      v-for="group in getVesselGroups(record)"
                      :key="group.label"
                    >
                      <div class="mb-1 text-xs text-gray-500">
                        {{ group.label }}（{{ group.list.length }}）
                      </div>
                      <div class="max-h-24 overflow-y-auto">
                        <Tag
                          v-for="mmsi in group.list"
                          :key="mmsi"
                          class="mb-1"
                        >
                          {{ mmsi }}
                        </Tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </Table>
        </div>

        <Empty v-if="!hasRows" :description="emptyDescription" />
      </Spin>
    </Card>
  </Page>
</template>
