<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { FeituoScheduleAdminApi } from '#/api/schedule/feituo-schedule-admin';

import { Page, useVbenModal } from '@vben/common-ui';

import { message, Tag, Tooltip } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { queryScheduleAsync } from '#/api/schedule/feituo-schedule-admin';

import { getTransportModeText, useColumns, useGridFormSchema } from './data';
import VesselAisModal from './modules/vessel-ais-modal.vue';

type FeituoScheduleItemDto = FeituoScheduleAdminApi.FeituoScheduleItemDto;
type FeituoScheduleTransitDto = FeituoScheduleAdminApi.FeituoScheduleTransitDto;

/** 表单必填项校验，缺失时提示并阻止查询 */
function validateQueryParams(
  formValues: Record<string, any>,
): null | Record<string, any> {
  const { polCode, podCode, etd, weeksOut } = formValues;
  if (!polCode || !podCode || !etd) {
    message.warning('请填写起始港、目的港与预计离港日期');
    return null;
  }
  if (!weeksOut) {
    message.warning('请选择范围(周)');
    return null;
  }
  return formValues;
}

const [AisModal, aisModalApi] = useVbenModal({
  connectedComponent: VesselAisModal,
  destroyOnClose: true,
});

/** 双击行：弹窗展示该船舶的 AIS 定位（优先 MMSI，缺失回退船名） */
function handleRowDblclick({ row }: { row: FeituoScheduleItemDto }) {
  const mmsi = row.mmsi?.trim() || row.vessel?.trim();
  if (!mmsi) {
    message.warning('该船期缺少 MMSI 与船名，无法定位');
    return;
  }
  const voyage = row.voyage ? `/${row.voyage}` : '';
  const title = row.vessel ? `${row.vessel}${voyage}` : mmsi;
  aisModalApi.setData({ mmsi, title }).open();
}

const [Grid] = useVbenVxeGrid<FeituoScheduleItemDto>({
  gridEvents: {
    cellDblclick: handleRowDblclick,
  },
  formOptions: {
    schema: useGridFormSchema(),
    // 实时外部接口，避免字段变化即触发查询，改为点击查询按钮
    submitOnChange: false,
    showCollapseButton: true,
    collapsed: true,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6',
    commonConfig: {
      labelWidth: 92,
    },
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    showOverflow: false,
    pagerConfig: {
      enabled: true,
      pageSize: 100,
      pageSizes: [20, 50, 100, 200, 500, 1000],
    },
    proxyConfig: {
      // 必填项校验后才查询，禁止初始空查询
      autoLoad: false,
      ajax: {
        query: async ({ page }, formValues: Record<string, any>) => {
          const validated = validateQueryParams(formValues);
          if (!validated) {
            return { items: [], totalCount: 0 };
          }

          const params: FeituoScheduleAdminApi.FeituoScheduleQueryInputDto = {
            polCode: String(validated.polCode).trim(),
            podCode: String(validated.podCode).trim(),
            etd: validated.etd,
            weeksOut: Number(validated.weeksOut),
            pageNum: page.currentPage,
            pageSize: page.pageSize,
          };

          if (validated.eta) params.eta = validated.eta;
          if (validated.carrierCd) params.carrierCd = validated.carrierCd;
          if (validated.routeCode) params.routeCode = validated.routeCode;
          if (
            validated.isTransit !== null &&
            validated.isTransit !== undefined
          ) {
            params.isTransit = Number(validated.isTransit);
          }
          if (validated.transitPortEn) {
            params.transitPortEn = validated.transitPortEn;
          }
          if (validated.vessel) params.vessel = validated.vessel;

          const result = await queryScheduleAsync(params);

          // statusCode=20001 表示查询成功但无数据，属正常情况
          if (result?.statusCode === 20_001) {
            message.info('未查询到船期数据');
          }

          return {
            items: result?.items ?? [],
            totalCount: result?.total ?? 0,
          };
        },
      },
    },
    rowConfig: {
      isHover: true,
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: false,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<FeituoScheduleItemDto>,
});

/** 中转港明细文本（用于 tooltip 展示） */
function getTransitTooltip(transits?: FeituoScheduleTransitDto[]): string {
  if (!transits || transits.length === 0) return '直达';
  return transits
    .map((t, index) => {
      const name = t.portName || t.portCode || '-';
      const vesselVoyage = [t.vessel, t.voyage].filter(Boolean).join('/');
      const mode = getTransportModeText(t.transportMode);
      const eta = t.eta ? `到 ${t.eta}` : '';
      const etd = t.etd ? `离 ${t.etd}` : '';
      const parts = [
        `${index + 1}. ${name}`,
        vesselVoyage && `船名/航次: ${vesselVoyage}`,
        mode !== '-' && `方式: ${mode}`,
        [eta, etd].filter(Boolean).join(' / '),
        (t.terminalCn || t.terminal) && `码头: ${t.terminalCn || t.terminal}`,
      ].filter(Boolean);
      return parts.join('  ');
    })
    .join('\n');
}

function getTransitSummary(transits?: FeituoScheduleTransitDto[]): string {
  if (!transits || transits.length === 0) return '直达';
  return transits.map((t) => t.portName || t.portCode || '-').join(' → ');
}
</script>

<template>
  <Page auto-content-height>
    <AisModal />
    <Grid>
      <!-- 船名/航次 -->
      <template #vesselVoyage="{ row }">
        <div class="flex flex-col leading-tight">
          <span class="font-medium">{{ row.vessel || '-' }}</span>
          <span class="text-xs text-gray-500">{{ row.voyage || '-' }}</span>
        </div>
      </template>

      <!-- 直达/中转 -->
      <template #isTransit="{ row }">
        <Tag :color="row.isTransit ? 'orange' : 'green'">
          {{ row.isTransit ? '中转' : '直达' }}
        </Tag>
      </template>

      <!-- 起运港 -->
      <template #pol="{ row }">
        <div class="flex flex-col leading-tight">
          <span>
            {{ row.polName || '-' }}
            <span v-if="row.polCode" class="text-gray-500"
              >（{{ row.polCode }}）</span
            >
          </span>
          <span
            v-if="row.polTerminalCn || row.polTerminal"
            class="text-xs text-gray-500"
          >
            {{ row.polTerminalCn || row.polTerminal }}
          </span>
        </div>
      </template>

      <!-- 目的港 -->
      <template #pod="{ row }">
        <div class="flex flex-col leading-tight">
          <span>
            {{ row.podName || '-' }}
            <span v-if="row.podCode" class="text-gray-500"
              >（{{ row.podCode }}）</span
            >
          </span>
          <span
            v-if="row.podTerminalCn || row.podTerminal"
            class="text-xs text-gray-500"
          >
            {{ row.podTerminalCn || row.podTerminal }}
          </span>
        </div>
      </template>

      <!-- 中转港 -->
      <template #transits="{ row }">
        <div v-if="!row.transits || row.transits.length === 0">
          <span class="text-gray-400">直达</span>
        </div>
        <Tooltip
          v-else
          placement="topLeft"
          :overlay-style="{ maxWidth: 'none' }"
        >
          <template #title>
            <div class="whitespace-pre text-sm leading-relaxed">
              {{ getTransitTooltip(row.transits) }}
            </div>
          </template>
          <span class="cursor-help text-blue-600">
            {{ getTransitSummary(row.transits) }}
          </span>
        </Tooltip>
      </template>
    </Grid>
  </Page>
</template>
