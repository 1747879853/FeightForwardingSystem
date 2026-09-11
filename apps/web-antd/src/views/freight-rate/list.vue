<script lang="ts" setup>
import type {
  SeFreiPriceOutDto,
  LaneCodeDto,
} from '#/api/sea-export/freight-rate-admin';

import { nextTick, ref, watch, onMounted, onUnmounted, computed } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import {
  Copy,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  IconifyIcon,
} from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import {
  Button,
  message,
  Modal,
  Space,
  Dropdown,
  Menu,
  Tooltip,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  changeRecommendStatus,
  deleteSeFreiPrice,
  getSeFreiPriceList,
  getAllLaneCodes,
} from '#/api/sea-export/freight-rate-admin';
import { extractSeFreiPriceByGemini } from '#/api/sea-export/gemini-admin';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';
import { useBaseStore } from '#/store/base';
import { buildAttachmentUrl, createPagedListQuery } from '#/utils';
import {
  getCurrentUserMaskedFields,
  FrightModule,
} from '#/api/system/permission';

import FreightRateAiUploadModal from './modules/freight-rate-ai-upload-modal.vue';
import FreightRateForm from './modules/freight-rate-form.vue';
import SyncUpdateForm from './modules/sync-update-form.vue';
import BatchAddModal from './modules/batch-add-modal.vue';
import CtnEditableCell from './modules/ctn-editable-cell.vue';
import {
  FREIGHT_RATE_LIST_TABLE_ID,
  useColumns,
  useGridFormSchema,
  getSurchargeFeeNames,
  getSurchargeFeeTooltip,
} from './data';

// ==================== 权限 ====================

const perm = createAbpPermission('Admin.SeFreiPrice');
const accessStore = useAccessStore();
const baseStore = useBaseStore();

const accessCodes = computed(() => accessStore.accessCodes || []);
const hasAddPermission = computed(() =>
  accessCodes.value.includes('Admin.SeFreiPrice.Add'),
);
const hasEditPermission = computed(() =>
  accessCodes.value.includes('Admin.SeFreiPrice.Edit'),
);
const hasDeletePermission = computed(() =>
  accessCodes.value.includes('Admin.SeFreiPrice.Delete'),
);

// ==================== 列表状态 ====================

const tableData = ref<SeFreiPriceOutDto[]>([]);
const selectedLineId = ref<number | undefined>(undefined);
const maskedFields = ref<string[]>([]);
const lines = ref<LaneCodeDto[]>([]);

const aiExtractModalOpen = ref(false);
const aiRecognizing = ref(false);

/** 有效状态默认 [已生效, 未生效]。仅默认值尚未写入「最近提交值」时兜底。 */
let isValidDefaultApplied = false;
const DEFAULT_IS_VALID = [0, 1];

// ==================== 弹窗 ====================

const [EditFormModal, editFormModalApi] = useVbenModal({
  connectedComponent: FreightRateForm,
  destroyOnClose: true,
});

const [SyncUpdateModal, syncUpdateModalApi] = useVbenModal({
  connectedComponent: SyncUpdateForm,
  destroyOnClose: true,
});

const [BatchAddModalComponent, batchAddModalApi] = useVbenModal({
  connectedComponent: BatchAddModal,
  destroyOnClose: true,
});

// ==================== 查询 / 表格 ====================

function mapFreightRateParams(
  formValues: Record<string, any>,
  sortParams?: Record<string, any>,
) {
  const nextValues = { ...formValues };
  if (!isValidDefaultApplied && nextValues.isValid === undefined) {
    nextValues.isValid = [...DEFAULT_IS_VALID];
  }
  isValidDefaultApplied = true;

  const queryParams: Record<string, any> = {
    laneId: selectedLineId.value,
  };

  Object.keys(nextValues).forEach((key) => {
    if (key === 'creationTimeRange') {
      const rangeValue = nextValues[key];
      if (Array.isArray(rangeValue) && rangeValue.length === 2) {
        queryParams.creationTimeStart = rangeValue[0];
        queryParams.creationTimeEnd = rangeValue[1];
      }
      return;
    }

    if (key === 'isValid') {
      const value = nextValues[key];
      if (Array.isArray(value)) {
        if (value.length > 0) queryParams[key] = value;
      } else if (value !== null && value !== undefined) {
        queryParams[key] = value;
      }
      return;
    }

    if (nextValues[key] !== null && nextValues[key] !== undefined) {
      queryParams[key] = nextValues[key];
    }
  });

  if (sortParams && Object.keys(sortParams).length > 0) {
    const { field: sortField, order: sortOrder } = sortParams;
    if (sortField && sortOrder) {
      queryParams.sorting = `${sortField} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    }
  }

  return queryParams;
}

const [Grid, gridApi] = useVbenVxeGrid<SeFreiPriceOutDto>({
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: true,
    submitOnChange: true,
    collapsed: true,
    commonConfig: {
      labelWidth: 86,
    },
    wrapperClass: 'grid-cols-6',
  },
  gridOptions: {
    id: FREIGHT_RATE_LIST_TABLE_ID,
    columns: useColumns([]),
    height: 'auto',
    keepSource: true,
    showOverflow: false,
    sortConfig: {
      remote: true,
      defaultSort: { field: 'creationTime', order: 'desc' },
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      // 关闭自动加载：挂载后 submitForm 首查，保证 isValid 默认值写入最近提交值
      autoLoad: false,
      sort: true,
      ajax: {
        query: createPagedListQuery(getSeFreiPriceList, {
          defaultSort: 'CreationTime DESC',
          mapParams: mapFreightRateParams,
          fieldMap: {
            creationTime: 'CreationTime',
            'carrier.enName': 'CarrierId',
            'pol.portName': 'PolId',
            'pod.portName': 'PodId',
            'currency.code': 'CurrencyId',
            isDirect: 'IsDirect',
          },
          afterFetch: (result: any) => {
            tableData.value = result.items || [];
            return result;
          },
        }),
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    checkboxConfig: {
      highlight: true,
      reserve: true,
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      zoom: true,
    },
  },
  gridEvents: {
    cellDblclick: ({ row }: { row: SeFreiPriceOutDto }) => {
      onEditByDblClick(row);
    },
  },
});

watch(
  [tableData, maskedFields],
  async ([newData, newMaskedFields]) => {
    if (!newData?.length) return;
    await nextTick();
    gridApi.setGridOptions({
      columns: useColumns(newData, newMaskedFields),
    });
  },
  { deep: true },
);

// ==================== 行操作 ====================

function getCheckboxRecords() {
  return (gridApi.grid?.getCheckboxRecords() || []) as SeFreiPriceOutDto[];
}

function onRefresh() {
  gridApi.query();
  void getLines();
}

function onCreate() {
  editFormModalApi.setData({ permission: hasAddPermission.value }).open();
}

function onEditByDblClick(row: SeFreiPriceOutDto) {
  editFormModalApi
    .setData({ id: row.id, permission: hasEditPermission.value })
    .open();
}

/** 复制选中第一条：打开新增表单并预填原单数据 */
async function onCopy() {
  const records = getCheckboxRecords();
  const row = records[0];
  if (!row) {
    message.warning('请先选择一条要复制的运价记录');
    return;
  }

  editFormModalApi
    .setData({
      copyId: row.id,
      permission: hasAddPermission.value,
    })
    .open();
}

/** 工具栏「更新」：Handsontable 批量编辑选中行 */
function onBatchUpdate() {
  const records = getCheckboxRecords();
  if (records.length === 0) {
    message.warning('请先选择要更新的运价');
    return;
  }

  const editData = records.map((row) => {
    const dayData = row.seFreiPriceDays?.[0];
    const weekDayData = row.seFreiPriceWeekDays?.[0];

    return {
      id: row.id,
      recommend: row.recommend,
      carrierId: row.carrierId,
      polId: row.polId,
      podId: row.podId,
      isDirect: row.isDirect,
      poT1Id: row.poT1Id,
      poT2Id: row.poT2Id,
      pol: row.pol,
      pod: row.pod,
      poT1: row.poT1,
      poT2: row.poT2,
      carrier: row.carrier,
      bookingAgent: row.bookingAgent,
      polFreeDays: row.polFreeDays,
      podFreeDays: row.podFreeDays,
      poddem: row.poddem,
      poddet: row.poddet,
      voyage: row.voyage || '',
      contractNo: row.contractNo || '',
      etd: dayData?.etd || '',
      closeDocTime: dayData?.closeDocTime || '',
      closingTime: dayData?.closingTime || '',
      etdDayOfWeek: weekDayData?.etdDayOfWeek,
      etdDayTime: weekDayData?.etdDayTime || '',
      closeDocDayOfWeek: weekDayData?.closeDocDayOfWeek,
      closeDocDayTime: weekDayData?.closeDocDayTime || '',
      closingDayOfWeek: weekDayData?.closingDayOfWeek,
      closingDayTime: weekDayData?.closingDayTime || '',
      validTimeStart: row.validTimeStart || '',
      validTimeEnd: row.validTimeEnd || '',
      remark: row.remark || '',
      currencyId: row.currencyId,
      bookingAgentId: row.bookingAgentId,
      seFreiPriceCtns: (row.seFreiPriceCtns || []).map((ctn) => ({
        ctnCodeId: ctn.ctnCodeId,
        cost: ctn.cost,
      })),
    };
  });

  batchAddModalApi.setData({ aiData: editData, isEditMode: true }).open();
}

/** 菜单「批量更改」：同步字段到多条记录 */
function onBatchSyncUpdate() {
  const records = getCheckboxRecords();
  if (records.length === 0) {
    message.warning('请先选择要批量编辑的运价记录');
    return;
  }
  syncUpdateModalApi.setData({ ids: records.map((r) => r.id) }).open();
}

function onBatchAdd() {
  if (!hasAddPermission.value) {
    message.warning('您没有批量新增运价的权限');
    return;
  }
  batchAddModalApi.open();
}

async function onBatchRecommend(recommend: boolean) {
  const records = getCheckboxRecords();
  if (records.length === 0) {
    message.warning('请先选择要操作的运价记录');
    return;
  }

  const hideLoading = message.loading({
    content: `正在批量${recommend ? '推荐' : '取消推荐'}...`,
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await Promise.all(
      records.map((row) => changeRecommendStatus({ id: row.id, recommend })),
    );
    message.success({
      content: `批量${recommend ? '推荐' : '取消推荐'}成功`,
      key: 'action_process_msg',
    });
    onRefresh();
  } catch {
    hideLoading();
  }
}

function onBatchDelete() {
  const records = getCheckboxRecords();
  if (records.length === 0) {
    message.warning('请先选择要删除的运价记录');
    return;
  }

  Modal.confirm({
    title: '确认批量删除',
    content: `确定要删除选中的 ${records.length} 条运价记录吗？`,
    onOk() {
      const hideLoading = message.loading({
        content: '正在批量删除...',
        duration: 0,
        key: 'action_process_msg',
      });
      return deleteSeFreiPrice({ ids: records.map((r) => r.id) })
        .then(() => {
          message.success({
            content: '批量删除成功',
            key: 'action_process_msg',
          });
          onRefresh();
        })
        .catch(() => {
          hideLoading();
        });
    },
  });
}

async function handleRecommendClick(row: SeFreiPriceOutDto) {
  const newRecommend = !row.recommend;
  try {
    await changeRecommendStatus({ id: row.id, recommend: newRecommend });
    message.success(newRecommend ? '推荐成功' : '取消推荐成功');
    onRefresh();
  } catch {
    message.error('操作失败');
  }
}

// ==================== 有效状态展示 ====================

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getIsValidText(row: SeFreiPriceOutDto): string {
  const today = startOfLocalDay(new Date());

  if (row.validTimeStart) {
    const startDay = startOfLocalDay(new Date(row.validTimeStart));
    if (startDay > today) return '未生效';
  }

  if (row.validTimeEnd) {
    const endDay = startOfLocalDay(new Date(row.validTimeEnd));
    if (endDay < today) return '已过期';
  }

  if (!row.isValid) return '无效';
  return '已生效';
}

function getIsValidColor(row: SeFreiPriceOutDto): string {
  switch (getIsValidText(row)) {
    case '已生效':
      return '#389e0d';
    case '未生效':
      return '#faad14';
    default:
      return '#cf1322';
  }
}

// ==================== 航线 Tab ====================

async function getLines() {
  const res = await getAllLaneCodes();
  if (res) {
    lines.value = res.laneCodes || [];
  }
}

function handleLineClick(lineId?: number) {
  selectedLineId.value = lineId;
  gridApi.query();
}

const laneTabBarRef = ref<HTMLElement | null>(null);
const laneTabTrackRef = ref<HTMLElement | null>(null);
const canScrollLaneTabLeft = ref(false);
const canScrollLaneTabRight = ref(false);
const laneTabScrollable = ref(false);
const LANE_TAB_SCROLL_STEP = 240;
const LANE_TAB_SCROLL_DURATION = 280;
let laneTabResizeObserver: ResizeObserver | null = null;
let laneTabScrollAnimationId: number | null = null;
let laneTabScrollIdleTimer: ReturnType<typeof setTimeout> | number | null =
  null;
let isLaneTabAnimating = false;

function updateLaneTabScrollState() {
  const el = laneTabBarRef.value;
  if (!el) {
    canScrollLaneTabLeft.value = false;
    canScrollLaneTabRight.value = false;
    laneTabScrollable.value = false;
    return;
  }

  const { scrollLeft, scrollWidth, clientWidth } = el;
  laneTabScrollable.value = scrollWidth > clientWidth + 1;
  canScrollLaneTabLeft.value = scrollLeft > 1;
  canScrollLaneTabRight.value = scrollLeft + clientWidth < scrollWidth - 1;
}

function onLaneTabScroll() {
  if (isLaneTabAnimating) return;
  if (laneTabScrollIdleTimer) {
    window.clearTimeout(laneTabScrollIdleTimer);
  }
  laneTabScrollIdleTimer = window.setTimeout(() => {
    laneTabScrollIdleTimer = null;
    updateLaneTabScrollState();
  }, 120);
}

function stopLaneTabScrollAnimation() {
  if (laneTabScrollAnimationId !== null) {
    window.cancelAnimationFrame(laneTabScrollAnimationId);
    laneTabScrollAnimationId = null;
  }
  isLaneTabAnimating = false;
}

function animateLaneTabScroll(targetLeft: number) {
  const el = laneTabBarRef.value;
  if (!el) return;

  stopLaneTabScrollAnimation();
  isLaneTabAnimating = true;

  const startLeft = el.scrollLeft;
  const distance = targetLeft - startLeft;
  if (Math.abs(distance) < 1) {
    stopLaneTabScrollAnimation();
    updateLaneTabScrollState();
    return;
  }

  const startTime = performance.now();

  function step(currentTime: number) {
    const progress = Math.min(
      (currentTime - startTime) / LANE_TAB_SCROLL_DURATION,
      1,
    );
    const eased = 1 - (1 - progress) ** 3;
    if (el) {
      el.scrollLeft = startLeft + distance * eased;
    }

    if (progress < 1) {
      laneTabScrollAnimationId = window.requestAnimationFrame(step);
      return;
    }

    laneTabScrollAnimationId = null;
    isLaneTabAnimating = false;
    updateLaneTabScrollState();
  }

  laneTabScrollAnimationId = window.requestAnimationFrame(step);
}

function scrollLaneTabs(direction: 'left' | 'right') {
  const el = laneTabBarRef.value;
  if (!el) return;

  const step = Math.max(LANE_TAB_SCROLL_STEP, el.clientWidth * 0.6);
  const maxScrollLeft = el.scrollWidth - el.clientWidth;
  const targetLeft = Math.max(
    0,
    Math.min(
      maxScrollLeft,
      el.scrollLeft + (direction === 'left' ? -step : step),
    ),
  );

  if (Math.abs(targetLeft - el.scrollLeft) < 1) return;
  animateLaneTabScroll(targetLeft);
}

function bindLaneTabScrollObserver() {
  laneTabResizeObserver?.disconnect();
  laneTabResizeObserver = null;

  const el = laneTabBarRef.value;
  if (!el) return;

  el.removeEventListener('scroll', onLaneTabScroll);
  el.addEventListener('scroll', onLaneTabScroll, { passive: true });

  laneTabResizeObserver = new ResizeObserver(() => {
    updateLaneTabScrollState();
  });
  laneTabResizeObserver.observe(el);
  if (laneTabTrackRef.value) {
    laneTabResizeObserver.observe(laneTabTrackRef.value);
  }
  updateLaneTabScrollState();
}

watch(
  () => lines.value.length,
  async () => {
    await nextTick();
    bindLaneTabScrollObserver();
  },
);

// ==================== AI 批量新增 ====================

function safeIdToString(
  id: string | number | undefined | null,
): string | undefined {
  if (id === undefined || id === null) return undefined;
  if (typeof id === 'string') {
    return /^\d+$/.test(id) ? id : undefined;
  }
  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id);
  }
  return undefined;
}

function onAIBatchAdd() {
  if (!hasAddPermission.value) {
    message.warning('您没有AI批量新增运价的权限');
    return;
  }
  aiExtractModalOpen.value = true;
}

async function handleAiExtractFile(file: File) {
  await performAiRecognition({ file });
}

async function handleAiExtractText(text: string) {
  await performAiRecognition({ text });
}

async function performAiRecognition(params: { file?: File; text?: string }) {
  if (aiRecognizing.value) return;

  aiRecognizing.value = true;

  try {
    const hideLoading = message.loading({
      content: '正在识别内容...',
      duration: 0,
      key: 'ai_recognition_msg',
    });

    const recognitionResult = await extractSeFreiPriceByGemini(
      params.file,
      params.text,
    );
    hideLoading();

    if (!recognitionResult || recognitionResult.length === 0) {
      message.warning('未能从内容中识别出有效的运价数据');
      return;
    }

    const convertedData = recognitionResult.map((item, index) => ({
      _rowKey: `ai_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 11)}`,
      _isCopied: false,
      recommend: false,
      carrierId: undefined,
      polId: undefined,
      podId: safeIdToString(item.podId),
      isDirect: item.isDirect ?? true,
      poT1Id: safeIdToString(item.pot1Id),
      poT2Id: safeIdToString(item.pot2Id),
      polFreeDays: undefined,
      podFreeDays: undefined,
      poddem: undefined,
      poddet: undefined,
      voyage: '',
      contractNo: '',
      etd: '',
      closeDocTime: '',
      closingTime: '',
      etdDayOfWeek: undefined,
      etdDayTime: '',
      closeDocDayOfWeek: undefined,
      closeDocDayTime: '',
      closingDayOfWeek: undefined,
      closingDayTime: '',
      validTimeStart: item.validTimeStart || '',
      validTimeEnd: item.validTimeEnd || '',
      remark: item.remark || '',
      currencyId: safeIdToString(item.currencyId),
      bookingAgentId: undefined,
      seFreiPriceCtns: item.seFreiPriceCtns
        ? item.seFreiPriceCtns
            .map((ctn) => {
              const ctnCodeId = safeIdToString(ctn.ctnCodeId);
              const cost =
                ctn.price !== undefined && ctn.price !== null
                  ? Number(ctn.price)
                  : 0;
              return { ctnCodeId, cost };
            })
            .filter((ctn) => ctn.ctnCodeId)
        : [],
    }));

    aiExtractModalOpen.value = false;
    batchAddModalApi.setData({ aiData: convertedData }).open();
    message.success(
      `AI识别完成，共识别出 ${recognitionResult.length} 条运价数据`,
    );
  } catch {
    message.error('AI识别失败，请稍后重试');
  } finally {
    aiRecognizing.value = false;
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  void getLines();

  try {
    await baseStore.fetchFreightRateDropdownData();
  } catch {
    // 下拉缓存失败不阻塞列表
  }

  try {
    const maskedFieldsData = await getCurrentUserMaskedFields();
    const freightRateModule = maskedFieldsData.find(
      (module) => module.frightModule === FrightModule.SeFreiPrice,
    );
    if (freightRateModule?.fields) {
      // only alwaysMasked 字段可整列隐藏（条件规则只能逐行判定）
      maskedFields.value = freightRateModule.fields
        .filter((f) => f.alwaysMasked)
        .map((f) => f.propName);
    }
  } catch {
    // 字段权限失败时按全量列展示
  }

  await nextTick();
  bindLaneTabScrollObserver();
  await gridApi.formApi.submitForm();
});

onUnmounted(() => {
  laneTabBarRef.value?.removeEventListener('scroll', onLaneTabScroll);
  if (laneTabScrollIdleTimer) {
    window.clearTimeout(laneTabScrollIdleTimer);
  }
  stopLaneTabScrollAnimation();
  laneTabResizeObserver?.disconnect();
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #carrierId="{ row }">
        <div class="flex items-center gap-2 px-2 py-1">
          <img
            v-if="row.carrier?.logo?.url"
            :src="buildAttachmentUrl(row.carrier.logo.url)"
            :alt="
              row.carrier.cnShortName ||
              row.carrier.cnName ||
              row.carrier.code ||
              'carrier-logo'
            "
            class="carrier-logo"
          />
          <span>{{
            row.carrier?.code
              ? `${row.carrier.code}(${row.carrier.cnShortName || row.carrier.cnName || row.carrier.enName || ''})`
              : row.carrier?.cnShortName ||
                row.carrier?.cnName ||
                row.carrier?.enName ||
                '-'
          }}</span>
        </div>
      </template>

      <template #polId="{ row }">
        <div class="px-2 py-1">
          {{
            row.pol?.portName
              ? `${row.pol.portName},${row.pol?.country?.countryEnName || ''}`
              : '-'
          }}
        </div>
      </template>

      <template #podId="{ row }">
        <div class="px-2 py-1">
          {{
            row.pod?.portName
              ? `${row.pod.portName},${row.pod?.country?.countryEnName || ''}`
              : '-'
          }}
        </div>
      </template>

      <template #currencyId="{ row }">
        <div class="px-2 py-1">
          {{ row.currency?.code || '-' }}
        </div>
      </template>

      <template #bookingAgentId="{ row }">
        <div class="px-2 py-1">
          {{ row.bookingAgent?.name || '-' }}
        </div>
      </template>

      <template #contractNo="{ row }">
        <div
          class="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-blue-600"
          :title="row.contractNo || '-'"
        >
          {{ row.contractNo || '-' }}
        </div>
      </template>

      <template #recommend="{ row }">
        <div class="flex items-center justify-center">
          <IconifyIcon
            :icon="row.recommend ? 'mdi:star' : 'mdi:star-outline'"
            class="size-5 cursor-pointer transition-all duration-200 hover:scale-110"
            :class="row.recommend ? 'text-yellow-500' : 'text-gray-300'"
            @click="handleRecommendClick(row)"
          />
        </div>
      </template>

      <template #surchargeFees="{ row }">
        <div class="surcharge-fees-container px-2 py-1">
          <div
            v-if="!row.seFreiPriceFees || row.seFreiPriceFees.length === 0"
            class="text-gray-300"
          >
            -
          </div>
          <Tooltip
            v-else
            placement="topLeft"
            :overlay-style="{ maxWidth: 'none' }"
          >
            <template #title>
              <div class="whitespace-pre text-sm leading-relaxed">
                {{ getSurchargeFeeTooltip(row) }}
              </div>
            </template>
            <div class="cursor-help truncate text-sm">
              {{ getSurchargeFeeNames(row) }}
            </div>
          </Tooltip>
        </div>
      </template>

      <template #isValid="{ row }">
        <div class="flex items-center justify-center">
          <Tag :color="getIsValidColor(row)">
            {{ getIsValidText(row) }}
          </Tag>
        </div>
      </template>

      <template #ctnEditableCell="{ row, column }">
        <CtnEditableCell :row="row" :column="column" @success="onRefresh" />
      </template>

      <template #toolbar-actions>
        <div
          class="lane-tab-wrapper flex min-w-0 flex-1 items-center overflow-hidden"
        >
          <div
            ref="laneTabBarRef"
            class="lane-tab-bar min-w-0 flex-1 overflow-x-auto"
          >
            <div
              ref="laneTabTrackRef"
              class="lane-tab-track inline-flex flex-nowrap items-center gap-1"
            >
              <div
                class="lane-tab-item cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-all duration-200"
                :class="
                  selectedLineId === undefined
                    ? 'border-blue-500 text-blue-500'
                    : 'border-none text-gray-600 hover:text-gray-900'
                "
                @click="handleLineClick(undefined)"
              >
                全部
              </div>
              <div
                v-for="line in lines"
                :key="line.id"
                class="lane-tab-item cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-all duration-200"
                :class="
                  selectedLineId === line.id
                    ? 'border-blue-500 text-blue-500'
                    : 'border-none text-gray-600 hover:text-gray-900'
                "
                @click="handleLineClick(line.id)"
              >
                {{ line.laneName || line.code || '-' }}
              </div>
            </div>
          </div>

          <div
            v-if="laneTabScrollable"
            class="lane-tab-scroll-actions flex shrink-0 items-center"
          >
            <button
              type="button"
              class="lane-tab-scroll-btn"
              :class="{ 'is-disabled': !canScrollLaneTabLeft }"
              :aria-disabled="!canScrollLaneTabLeft"
              title="向左滚动"
              @click="scrollLaneTabs('left')"
            >
              <ChevronLeft class="size-4" />
            </button>
            <button
              type="button"
              class="lane-tab-scroll-btn"
              :class="{ 'is-disabled': !canScrollLaneTabRight }"
              :aria-disabled="!canScrollLaneTabRight"
              title="向右滚动"
              @click="scrollLaneTabs('right')"
            >
              <ChevronRight class="size-4" />
            </button>
          </div>
        </div>
      </template>

      <template #toolbar-tools>
        <Space class="shrink-0">
          <Button
            type="primary"
            :disabled="!hasAddPermission"
            @click="onCreate"
          >
            <Plus class="size-5" />
            {{ $t('ui.actionTitle.create') }}
          </Button>

          <Button
            type="primary"
            ghost
            :disabled="!hasAddPermission"
            @click="onAIBatchAdd"
          >
            <IconifyIcon icon="mdi:robot-outline" class="size-5" />
            AI批量新增
          </Button>

          <Button :disabled="!hasEditPermission" @click="onBatchUpdate">
            <IconifyIcon icon="mdi:square-edit-outline" class="size-5" />
            {{ $t('seaExport.freightRate.update') }}
          </Button>

          <Button :disabled="!hasAddPermission" @click="onCopy">
            <Copy class="size-5" />
            {{ $t('seaExport.freightRate.copy') }}
          </Button>

          <Dropdown
            v-access:code="perm.edit"
            :disabled="!hasEditPermission && !hasDeletePermission"
          >
            <Button :disabled="!hasEditPermission && !hasDeletePermission">
              {{ $t('seaExport.freightRate.batchOperation') }}
              <ChevronDown class="ml-1 size-4" />
            </Button>
            <template #overlay>
              <Menu>
                <Menu.Item
                  key="batchAdd"
                  :disabled="!hasAddPermission"
                  @click="onBatchAdd"
                >
                  {{ $t('seaExport.freightRate.batchAdd') }}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  key="edit"
                  :disabled="!hasEditPermission"
                  @click="onBatchSyncUpdate"
                >
                  {{ $t('seaExport.freightRate.batchEdit') }}
                </Menu.Item>
                <Menu.Item
                  key="recommend"
                  :disabled="!hasEditPermission"
                  @click="onBatchRecommend(true)"
                >
                  {{ $t('seaExport.freightRate.batchRecommend') }}
                </Menu.Item>
                <Menu.Item
                  key="cancelRecommend"
                  :disabled="!hasEditPermission"
                  @click="onBatchRecommend(false)"
                >
                  {{ $t('seaExport.freightRate.batchCancelRecommend') }}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  key="delete"
                  :disabled="!hasDeletePermission"
                  class="text-red-600"
                  @click="onBatchDelete"
                >
                  <span
                    :class="{
                      'text-red-600': hasDeletePermission,
                      'text-gray-400': !hasDeletePermission,
                    }"
                  >
                    {{ $t('seaExport.freightRate.batchDelete') }}
                  </span>
                </Menu.Item>
              </Menu>
            </template>
          </Dropdown>
        </Space>
      </template>
    </Grid>

    <EditFormModal @success="onRefresh" />
    <SyncUpdateModal @success="onRefresh" />
    <BatchAddModalComponent @success="onRefresh" />

    <FreightRateAiUploadModal
      v-model:open="aiExtractModalOpen"
      :recognizing="aiRecognizing"
      @file="handleAiExtractFile"
      @text="handleAiExtractText"
    />
  </Page>
</template>

<style scoped>
:deep(.vxe-toolbar) {
  flex-wrap: nowrap;
  overflow: visible;
}

:deep(.vxe-buttons--wrapper:not(:empty)) {
  flex: 1 1 0%;
  min-width: 0;
  max-width: 100%;
  margin-right: 120px;
  overflow: hidden;
}

:deep(.vxe-buttons--wrapper:not(:empty) > *) {
  min-width: 0;
  max-width: 100%;
}

:deep(.vxe-tools--operate) {
  flex: 0 0 auto;
}

:deep(.vxe-tools--wrapper:not(:empty)) {
  flex: 0 0 auto;
}

.lane-tab-wrapper {
  flex: 1 1 0%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.lane-tab-bar {
  flex: 1 1 0%;
  width: 0;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.lane-tab-track {
  width: max-content;
}

.lane-tab-item {
  flex-shrink: 0;
}

.lane-tab-bar::-webkit-scrollbar {
  display: none;
}

.lane-tab-scroll-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  color: rgb(0 0 0 / 65%);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.lane-tab-scroll-btn:hover:not(.is-disabled) {
  background: rgb(0 0 0 / 4%);
}

.lane-tab-scroll-btn.is-disabled {
  color: rgb(0 0 0 / 25%);
  pointer-events: none;
  cursor: not-allowed;
}

.surcharge-fees-container {
  position: relative;
}

.carrier-logo {
  width: auto;
  height: 24px;
  object-fit: contain;
  border-radius: 2px;
}
</style>
