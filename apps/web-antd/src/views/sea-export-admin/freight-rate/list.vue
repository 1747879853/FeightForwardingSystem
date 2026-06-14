<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type {
  SeFreiPriceOutDto,
  LaneCodeDto,
} from '#/api/sea-export/freight-rate-admin';

import { nextTick, ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { getEnumItems } from '#/utils/init-enum';

import { Page, useVbenModal } from '@vben/common-ui';
import {
  Copy,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  IconifyIcon,
} from '@vben/icons';

import {
  Button,
  message,
  Modal,
  Space,
  Dropdown,
  Menu,
  Tooltip,
  Tag,
  Collapse,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  changeRecommendStatus,
  deleteSeFreiPrice,
  getSeFreiPriceDetail,
  getSeFreiPriceList,
  getAllLaneCodes,
} from '#/api/sea-export/freight-rate-admin';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';

import { useColumns, useGridFormSchema, formatSurchargeFees } from './data';
import AddCtnModal from './modules/add-ctn-modal.vue';
import Form from './modules/form.vue';
import EditForm from './modules/editForm.vue';
import BatchAddModal from './modules/batch-add-modal.vue';
import BatchEditModal from './modules/batch-edit-modal.vue';
import SyncUpdateForm from './modules/form.vue';
import CtnEditableCell from './modules/ctn-editable-cell.vue';
import { buildAttachmentUrl } from '#/utils';
import { getCurrentUserMaskedFields } from '#/api/system/permission';
import { FrightModule } from '#/api/system/permission';

// 创建运价管理的 ABP 权限对象
const perm = createAbpPermission('Admin.SeFreiPrice');

// 存储表格数据用于生成动态列
const tableData = ref<SeFreiPriceOutDto[]>([]);

// 当前选中的航线ID
const selectedLineId = ref<number | undefined>(undefined);

// 订单状态下拉框
const freightConditionItemOptions = ref<any[]>([]);
const conditionComparisonTypeOptions = ref<any[]>([]);

// 被屏蔽的字段列表（PascalCase 格式）
const maskedFields = ref<string[]>([]);

// 获取费用名称
function getFeeName(fee: any): string {
  return fee.feeCode?.cnName || fee.feeCode?.enName || `费用${fee.feeCodeId}`;
}

// 获取币别名称
function getCurrencyName(fee: any): string {
  return fee.currency?.name || fee.currency?.code || `币种${fee.currencyId}`;
}

// 获取费用详情（箱型和价格）
function getFeeDetails(fee: any, row: SeFreiPriceOutDto): string[] {
  // 如果是按票计费，直接显示统一价格
  if (fee.priceFeeType === 1 && fee.price !== undefined && fee.price !== null) {
    return [`按票: ${fee.price}`];
  }

  // 按集装箱计费，显示每个箱型的价格
  if (!fee.seFreiPriceCtnFees || fee.seFreiPriceCtnFees.length === 0) {
    return [];
  }

  const details: string[] = [];

  fee.seFreiPriceCtnFees.forEach((ctnFee: any) => {
    // 通过 seFreiPriceCtnId 查找对应的箱型信息
    const ctnInfo = row.seFreiPriceCtns?.find(
      (ctn) => ctn.id === ctnFee.seFreiPriceCtnId,
    );
    const ctnName =
      ctnInfo?.ctnCode?.ctnName || `箱型${ctnInfo?.ctnCodeId || '?'}`;

    // 检查是否有条件费用
    if (ctnFee.value !== undefined && ctnFee.value !== null) {
      // 有条件费用
      const matchedOperator = conditionComparisonTypeOptions.value.find(
        (o: any) => o.value === ctnFee.operatorType,
      );
      const matchedCondition = freightConditionItemOptions.value.find(
        (o: any) => o.value === ctnFee.conditionType,
      );
      const operator = matchedOperator ? matchedOperator.label : '';
      const condition = matchedCondition ? matchedCondition.label : '';

      if (ctnFee.otherPrice !== null) {
        details.push(
          `${ctnName}:(毛重>=${ctnFee.value}${condition}) ${ctnFee.price}/${ctnFee.otherPrice}`,
        );
      } else {
        details.push(
          `${ctnName}:(毛重>=${ctnFee.value}${condition}) ${ctnFee.price}`,
        );
      }
    } else {
      // 简单模式
      details.push(`${ctnName}: ${ctnFee.price}`);
    }
  });

  return details;
}

// 获取所有附加费名称（用逗号分隔）
function getSurchargeFeeNames(row: SeFreiPriceOutDto): string {
  if (!row.seFreiPriceFees || row.seFreiPriceFees.length === 0) {
    return '-';
  }

  const feeNames = row.seFreiPriceFees.map((fee: any) => getFeeName(fee));
  return feeNames.join(', ');
}

// 获取附加费详情文本（用于tooltip显示）
function getSurchargeFeeTooltip(row: SeFreiPriceOutDto): string {
  if (!row.seFreiPriceFees || row.seFreiPriceFees.length === 0) {
    return '无附加费';
  }

  const details: string[] = [];

  row.seFreiPriceFees.forEach((fee: any) => {
    const feeName = getFeeName(fee);
    const currency = getCurrencyName(fee);
    const feeDetails = getFeeDetails(fee, row);

    // 构建该费用的完整描述
    let feeDesc = `${feeName} (${currency})`;
    if (feeDetails.length > 0) {
      // 所有箱型价格在同一行，用逗号分隔
      feeDesc += ': ' + feeDetails.join(', ');
    }

    details.push(feeDesc);
  });

  // 每条费用之间用换行分隔
  return details.join('\n');
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [EditFormModal, editFormModalApi] = useVbenModal({
  connectedComponent: EditForm,
  destroyOnClose: true,
});

const [SyncUpdateModal, syncUpdateModalApi] = useVbenModal({
  connectedComponent: SyncUpdateForm,
  destroyOnClose: true,
});

const [AddCtnModalComponent, addCtnModalApi] = useVbenModal({
  connectedComponent: AddCtnModal,
  destroyOnClose: true,
});

const [BatchAddModalComponent, batchAddModalApi] = useVbenModal({
  connectedComponent: BatchAddModal,
  destroyOnClose: true,
});

const [BatchEditModalComponent, batchEditModalApi] = useVbenModal({
  connectedComponent: BatchEditModal,
  destroyOnClose: true,
});

/**
 * 操作按钮点击事件
 */
function onActionClick(e: OnActionClickParams<SeFreiPriceOutDto>) {
  switch (e.code) {
    case 'edit': {
      onEdit(e.row);
      break;
    }
    case 'addCtn': {
      onAddCtn(e.row);
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid<SeFreiPriceOutDto>({
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: false,
    submitOnChange: true,
    collapsed: true,
    commonConfig: {
      labelWidth: 72,
    },
    wrapperClass: 'grid-cols-6',
  },
  gridOptions: {
    columns: useColumns(onActionClick, []), // 初始化为空数组
    height: 'auto',
    keepSource: true,
    showOverflow: false, // 覆盖全局配置，允许内容完整显示
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          const result = await getSeFreiPriceList({
            pageIndex: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
            sorting: 'Id DESC',
            laneId: selectedLineId.value, // 添加航线ID作为查询参数
          });
          // 适配新的返回结构
          const items = result.items || [];
          // 更新表格数据用于生成动态列
          tableData.value = items;
          return {
            items,
            totalCount: result.totalCount || 0,
            pageIndex: result.currentPage || 1,
            pageSize: result.totalPages || 10,
          };
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    checkboxConfig: {
      highlight: true,
      reserve: true,
      checkMethod: ({ row }: { row: SeFreiPriceOutDto }) => {
        // 确保复选框可以正常选中
        return true;
      },
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: false,
    },
  },
  gridEvents: {
    cellDblclick: ({ row }: any) => {
      // 双击任意单元格时打开编辑弹窗
      onEditByDblClick(row);
    },
  },
});

// 监听表格数据和字段权限变化，动态更新列配置
watch(
  [tableData, maskedFields],
  async ([newData, newMaskedFields]) => {
    if (newData && newData.length > 0) {
      await nextTick();
      const newColumns = useColumns(onActionClick, newData, newMaskedFields);
      // 使用gridApi更新列配置
      gridApi.setGridOptions({
        columns: newColumns,
      });
    }
  },
  { deep: true },
);

/**
 * 获取选中的行
 */
function getCheckboxRecords() {
  const grid = gridApi.grid;
  if (!grid) return [];
  return grid.getCheckboxRecords() as SeFreiPriceOutDto[];
}

/**
 * 编辑运价
 */
function onEdit(row: SeFreiPriceOutDto, onlySurchargeFees = true) {
  formModalApi.setData({ id: row.id, onlySurchargeFees }).open();
}

/**
 * 添加箱型
 */
function onAddCtn(row: SeFreiPriceOutDto) {
  addCtnModalApi.setData({ row }).open();
}

/**
 * 复制运价（基于选中的第一条记录）
 */
async function onCopy() {
  const records = getCheckboxRecords();
  if (records.length === 0) {
    message.warning('请先选择一条要复制的运价记录');
    return;
  }

  // 取第一条记录进行复制
  const row = records[0];
  if (!row) {
    message.warning('未找到有效的运价记录');
    return;
  }

  try {
    const hideLoading = message.loading({
      content: '正在加载运价详情...',
      duration: 0,
      key: 'action_process_msg',
    });

    // 获取完整详情
    const detail = await getSeFreiPriceDetail(row.id);
    hideLoading();

    // 清除ID和时间戳字段，作为新记录打开
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      id,
      creationTime,
      creatorUserId,
      lastModificationTime,
      lastModifierUserId,
      ...newData
    } = detail;

    console.log('c-detail:', newData);
    formModalApi.setData(newData).open();
  } catch (error) {
    message.error('加载运价详情失败');
    console.error(error);
  }
}

/**
 * 批量编辑运价
 */
function onBatchEdit() {
  const records = getCheckboxRecords();
  if (records.length === 0) {
    message.warning('请先选择要批量编辑的运价记录');
    return;
  }
  syncUpdateModalApi
    .setData({
      ids: records.map((r) => r.id),
    })
    .open();
}

/**
 * 批量改变推荐状态
 */
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
    // 批量调用接口
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

/**
 * 批量删除运价
 */
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
      deleteSeFreiPrice({ ids: records.map((r) => r.id) })
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

/**
 * 刷新列表
 */
function onRefresh() {
  gridApi.query();
  getLines();
}

/**
 * 新增运价
 */
function onCreate() {
  editFormModalApi.setData({}).open();
}

/**
 * 编辑运价（双击单元格触发）
 */
function onEditByDblClick(row: SeFreiPriceOutDto) {
  editFormModalApi.setData({ id: row.id }).open();
}

/**
 * 批量新增运价
 */
function onBatchAdd() {
  batchAddModalApi.open();
}

/**
 * 批量编辑运价（弹窗方式）
 */
function onBatchEditModal() {
  const records = getCheckboxRecords();
  if (records.length === 0) {
    message.warning('请先选择要批量编辑的运价记录');
    return;
  }
  batchEditModalApi.setData({ rows: records }).open();
}

const lines = ref<LaneCodeDto[]>([]);
const getLines = async function () {
  const res = await getAllLaneCodes();
  if (res) {
    lines.value = res.laneCodes || [];
  }
  console.log('getLines', res);
};

/**
 * 点击航线标签
 */
function handleLineClick(lineId?: number) {
  selectedLineId.value = lineId;
  // 重新查询列表
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
let laneTabScrollIdleTimer:
  | ReturnType<typeof setTimeout>
  | NodeJS.Timeout
  | null = null;
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
  }, 120) as any;
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

/**
 * 点击推荐星星切换推荐状态
 */
async function handleRecommendClick(row: SeFreiPriceOutDto) {
  const newRecommend = !row.recommend;
  try {
    await changeRecommendStatus({ id: row.id, recommend: newRecommend });
    message.success(newRecommend ? '推荐成功' : '取消推荐成功');
    onRefresh();
  } catch (error) {
    message.error('操作失败');
    console.error(error);
  }
}

/**
 * 获取有效状态文本
 */
function getIsValidText(row: SeFreiPriceOutDto): string {
  // 如果isValid为false，直接返回无效

  //console.log('row.validTimeStart', new Date(row.validTimeStart));
  //console.log('row.validTimeEnd', new Date(row.validTimeEnd));

  // 如果isValid为true，检查有效期
  const now = new Date();
  // 获取当前日期的零点时间，用于日期比较
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 检查有效起始日期 - 如果还没开始，显示未生效
  if (row.validTimeStart) {
    // ISO 8601格式的日期字符串，直接解析即可
    const startDate = new Date(row.validTimeStart);
    // 将起始日期转换为零点时间进行比较（使用本地时间）
    const startDay = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    // console.log('startDay:', startDay);
    // console.log('today:', today);
    if (startDay > today) {
      return '未生效';
    }
  }

  // 检查有效截止日期 - 如果已过期，显示已过期
  if (row.validTimeEnd) {
    // ISO 8601格式的日期字符串，直接解析即可
    const endDate = new Date(row.validTimeEnd);
    // 将截止日期转换为零点时间进行比较（使用本地时间）
    const endDay = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
    );
    if (endDay < today) {
      return '已过期';
    }
  }

  if (!row.isValid) {
    return '无效';
  }

  return '已生效';
}

/**
 * 获取有效状态颜色
 */
function getIsValidColor(row: SeFreiPriceOutDto): string {
  const text = getIsValidText(row);
  //console.log('isValidText:', text);
  switch (text) {
    case '已生效':
      return '#389e0d'; // 绿色
    case '未生效':
      return '#faad14'; // 橙色
    case '已过期':
      return '#cf1322'; // 红色
    default:
      return '#cf1322'; // 红色（无效）
  }
}

onMounted(async () => {
  getLines();

  // 获取当前用户的字段权限
  try {
    const maskedFieldsData = await getCurrentUserMaskedFields();
    // 查找运价模块（SeFreiPrice = 7）的屏蔽字段
    const freightRateModule = maskedFieldsData.find(
      (module) => module.frightModule === FrightModule.SeFreiPrice,
    );
    if (freightRateModule && freightRateModule.fields) {
      maskedFields.value = freightRateModule.fields.map((f) => f.propName);
      console.log('[字段权限] 运价模块被屏蔽的字段:', maskedFields.value);
    } else {
      console.log('[字段权限] 运价模块没有屏蔽字段');
    }
  } catch (error) {
    console.error('[字段权限] 获取字段权限失败:', error);
  }

  // 加载枚举项用于条件费用显示
  freightConditionItemOptions.value = await getEnumItems(
    'freightConditionItem',
  );
  freightConditionItemOptions.value = freightConditionItemOptions.value.map(
    (item: any) => ({
      label: item.displayName,
      value: item.value,
      description: item.description,
    }),
  );

  conditionComparisonTypeOptions.value = await getEnumItems(
    'ConditionComparisonType',
  );
  conditionComparisonTypeOptions.value =
    conditionComparisonTypeOptions.value.map((item: any) => ({
      label: item.displayName,
      value: item.value,
    }));

  await nextTick();
  bindLaneTabScrollObserver();
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
      <!-- 船公司自定义渲染插槽 -->
      <template #carrierId="{ row }">
        <div class="flex items-center gap-2 px-2 py-1">
          <!-- 船公司 Logo -->
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
          <!-- 船公司名称 -->
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

      <!-- 起运港自定义渲染插槽 -->
      <template #polId="{ row }">
        <div class="px-2 py-1">
          {{
            `${row.pol?.portName},${row.pol?.country.countryEnName || ''}` ||
            '-'
          }}
        </div>
      </template>

      <!-- 目的港自定义渲染插槽 -->
      <template #podId="{ row }">
        <div class="px-2 py-1">
          {{
            `${row.pod?.portName},${row.pod?.country.countryEnName || ''}` ||
            '-'
          }}
        </div>
      </template>

      <!-- 币别自定义渲染插槽 -->
      <template #currencyId="{ row }">
        <div class="px-2 py-1">
          {{ row.currency?.code || '-' }}
        </div>
      </template>

      <!-- 约号自定义渲染插槽 -->
      <template #contractNo="{ row }">
        <div class="px-2 py-1 text-blue-600">
          {{ row.contractNo || '-' }}
        </div>
      </template>

      <!-- 推荐状态自定义渲染插槽 -->
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

      <!-- 附加费自定义渲染插槽 -->
      <template #surchargeFees="{ row }">
        <div class="surcharge-fees-container px-2 py-1">
          <!-- 无附加费时显示占位符 -->
          <div
            v-if="!row.seFreiPriceFees || row.seFreiPriceFees.length === 0"
            class="text-gray-300"
          >
            -
          </div>

          <!-- 有附加费时显示名称列表，悬浮显示详情 -->
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

      <!-- 目的港免箱使天数自定义渲染插槽 -->
      <template #podFreeDaysCombined="{ row }">
        <div class="flex items-center justify-center gap-2 p-2">
          <!-- 免堆期 (DEM) -->
          <div
            v-if="row.poddem !== null && row.poddem !== undefined"
            class="inline-flex min-w-[40px] items-center justify-center rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {{ row.poddem }}
          </div>
          <div
            v-else
            class="inline-flex h-[28px] w-[40px] items-center justify-center rounded border border-gray-200 bg-gray-50"
          >
            <span class="text-xs font-medium text-gray-300">DEM</span>
          </div>

          <span class="text-gray-400">+</span>

          <!-- 免用箱期 (DET) -->
          <div
            v-if="row.podFreeDays !== null && row.podFreeDays !== undefined"
            class="inline-flex min-w-[40px] items-center justify-center rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {{ row.podFreeDays }}
          </div>
          <div
            v-else
            class="inline-flex h-[28px] w-[40px] items-center justify-center rounded border border-gray-200 bg-gray-50"
          >
            <span class="text-xs font-medium text-gray-300">DET</span>
          </div>

          <span class="text-gray-400">=</span>

          <!-- 免箱使期 -->
          <div
            v-if="row.poddet !== null && row.poddet !== undefined"
            class="inline-flex min-w-[40px] items-center justify-center rounded border border-blue-300 bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700"
          >
            {{ row.poddet }}
          </div>
          <div
            v-else
            class="inline-flex h-[28px] w-[40px] items-center justify-center rounded border border-gray-200 bg-gray-50"
          >
            <span class="text-xs font-medium text-gray-300">-</span>
          </div>
        </div>
      </template>

      <!-- 目的港免箱使天数列头插槽 -->
      <template #podFreeDaysCombinedHeader>
        <div class="flex items-center gap-1">
          <span>目的港免箱使天数</span>
          <Tooltip title="免堆期 (DEM) + 免用箱期 (DET) = 免箱使期">
            <IconifyIcon
              icon="mdi:information-outline"
              class="size-4 cursor-help text-gray-500"
            />
          </Tooltip>
        </div>
      </template>

      <!-- 是否有效自定义渲染插槽 -->
      <template #isValid="{ row }">
        <div class="flex items-center justify-center">
          <Tag :color="getIsValidColor(row)">
            {{ getIsValidText(row) }}
          </Tag>
        </div>
      </template>

      <!-- 箱型费用可编辑单元格插槽 -->
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
              <!-- 全部选项 -->
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

              <!-- 航线选项 -->
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
          <!-- 新增按钮 -->
          <Button v-access:code="perm.add" type="primary" @click="onCreate">
            <Plus class="size-5" />
            {{ $t('ui.actionTitle.create') }}
          </Button>

          <!-- 批量编辑按钮 -->
          <Button v-access:code="perm.add" @click="onBatchEditModal">
            <IconifyIcon icon="mdi:square-edit-outline" class="size-5" />
            {{ $t('seaExport.freightRate.update') }}
          </Button>

          <!-- 复制按钮 -->
          <Button v-access:code="perm.add" @click="onCopy">
            <Copy class="size-5" />
            {{ $t('seaExport.freightRate.copy') }}
          </Button>

          <!-- 批量操作下拉菜单 -->
          <Dropdown v-access:code="perm.edit">
            <Button>
              {{ $t('seaExport.freightRate.batchOperation') }}
              <ChevronDown class="ml-1 size-4" />
            </Button>
            <template #overlay>
              <Menu>
                <!-- <Menu.Item key="create" @click="onCreate">
                  {{ $t('seaExport.freightRate.create') }}
                </Menu.Item>
                <Menu.Divider /> -->
                <Menu.Item key="batchAdd" @click="onBatchAdd">
                  {{ $t('seaExport.freightRate.batchAdd') }}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item key="edit" @click="onBatchEdit">
                  {{ $t('seaExport.freightRate.batchEdit') }}
                </Menu.Item>
                <Menu.Item key="recommend" @click="onBatchRecommend(true)">
                  {{ $t('seaExport.freightRate.batchRecommend') }}
                </Menu.Item>
                <Menu.Item
                  key="cancelRecommend"
                  @click="onBatchRecommend(false)"
                >
                  {{ $t('seaExport.freightRate.batchCancelRecommend') }}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  key="delete"
                  class="text-red-600"
                  @click="onBatchDelete"
                >
                  <span class="text-red-600">{{
                    $t('seaExport.freightRate.batchDelete')
                  }}</span>
                </Menu.Item>
              </Menu>
            </template>
          </Dropdown>

          <!-- 批量删除按钮 -->
          <!-- <Button v-access:code="perm.delete" danger @click="onBatchDelete">
            {{ $t('seaExport.freightRate.batchDelete') }}
          </Button> -->
        </Space>
      </template>
    </Grid>

    <!-- 运价表单弹窗（旧版，保留用于批量编辑附加费） -->
    <FormModal @success="onRefresh" />

    <!-- 运价新增/编辑弹窗（新版） -->
    <EditFormModal @success="onRefresh" />

    <!-- 同步更新弹窗 -->
    <SyncUpdateModal @success="onRefresh" />

    <!-- 添加箱型弹窗 -->
    <AddCtnModalComponent @success="onRefresh" />

    <!-- 批量新增弹窗 -->
    <BatchAddModalComponent @success="onRefresh" />

    <!-- 批量编辑弹窗 -->
    <BatchEditModalComponent @success="onRefresh" />
  </Page>
</template>

<style scoped>
/* 航线 tab 靠左展示，超出时横向滚动，不挤压右侧操作按钮 */
:deep(.vxe-toolbar) {
  flex-wrap: nowrap;
  overflow: hidden;
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

/* 附加费容器样式 */
.surcharge-fees-container {
  position: relative;
}

/* 船公司 Logo 样式 */
.carrier-logo {
  width: auto;
  height: 24px;
  object-fit: contain;
  border-radius: 2px;
}
</style>
