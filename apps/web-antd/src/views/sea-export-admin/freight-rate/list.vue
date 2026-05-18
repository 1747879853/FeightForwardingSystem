<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type {
  SeFreiPriceOutDto,
  LaneCodeDto,
} from '#/api/sea-export/freight-rate-admin';

import { nextTick, ref, watch, onMounted, computed } from 'vue';
import { getEnumItems } from '#/utils/init-enum';

import { Page, useVbenModal } from '@vben/common-ui';
import { Copy, Plus, ChevronDown, IconifyIcon } from '@vben/icons';

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
import BatchAddModal from './modules/batch-add-modal.vue';
import BatchEditModal from './modules/batch-edit-modal.vue';
import SyncUpdateForm from './modules/sync-update-form.vue';
import CtnEditableCell from './modules/ctn-editable-cell.vue';

// 创建运价管理的 ABP 权限对象
const perm = createAbpPermission('Admin.SeFreiPrice');

// 存储表格数据用于生成动态列
const tableData = ref<SeFreiPriceOutDto[]>([]);

// 当前选中的航线ID
const selectedLineId = ref<number | undefined>(undefined);

// 控制每行附加费的展开/收起状态
const expandedRows = ref<Record<string, boolean>>({});

// 订单状态下拉框
const freightConditionItemOptions = ref<any[]>([]);
const conditionComparisonTypeOptions = ref<any[]>([]);

// 切换行的展开状态
function toggleExpand(row: SeFreiPriceOutDto) {
  const rowId = String(row.id);
  expandedRows.value[rowId] = !expandedRows.value[rowId];
}

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

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
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
      // isHover: true,
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
      zoom: true,
    },
  },
});

// 监听表格数据变化，动态更新列配置
watch(
  tableData,
  async (newData) => {
    if (newData && newData.length > 0) {
      await nextTick();
      const newColumns = useColumns(onActionClick, newData);
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
  formModalApi.setData({}).open();
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
    console.log('startDay:', startDay);
    console.log('today:', today);
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

  return '有效';
}

/**
 * 获取有效状态颜色
 */
function getIsValidColor(row: SeFreiPriceOutDto): string {
  const text = getIsValidText(row);
  console.log('isValidText:', text);
  switch (text) {
    case '有效':
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
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <AddCtnModalComponent @success="onRefresh" />
    <BatchAddModalComponent @success="onRefresh" />
    <BatchEditModalComponent @success="onRefresh" />
    <SyncUpdateModal @success="onRefresh" />
    <Grid>
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
        <div class="surcharge-fees-container">
          <!-- 无附加费时显示占位符和编辑按钮 -->
          <div
            v-if="!row.seFreiPriceFees || row.seFreiPriceFees.length === 0"
            class="flex items-center justify-between py-2"
          >
            <span class="text-gray-300">-</span>
            <Button
              type="link"
              size="small"
              @click.stop="onEdit(row)"
              class="edit-surcharge-btn"
            >
              <IconifyIcon icon="mdi:pencil-outline" class="size-4" />
              {{ $t('common.edit') }}
            </Button>
          </div>

          <!-- 有附加费时显示折叠面板 -->
          <div v-else class="space-y-2">
            <!-- 第一个附加费卡片始终显示 -->
            <div class="surcharge-fee-card">
              <div class="fee-card-content">
                <div class="fee-header">
                  <span class="fee-name">{{
                    getFeeName(row.seFreiPriceFees[0])
                  }}</span>
                  <span class="fee-currency">{{
                    getCurrencyName(row.seFreiPriceFees[0])
                  }}</span>
                </div>
                <div class="fee-details">
                  <span
                    v-for="(detail, idx) in getFeeDetails(
                      row.seFreiPriceFees[0],
                      row,
                    )"
                    :key="idx"
                    class="fee-detail-item"
                  >
                    {{ detail }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 如果有多个附加费，显示展开按钮和编辑按钮 -->
            <div
              v-if="row.seFreiPriceFees.length > 1"
              class="flex items-center justify-end gap-2"
            >
              <button class="expand-button" @click.stop="toggleExpand(row)">
                <span>{{ expandedRows[row.id] ? '收起' : '展开' }}</span>
                <IconifyIcon
                  :icon="
                    expandedRows[row.id] ? 'mdi:chevron-up' : 'mdi:chevron-down'
                  "
                  class="ml-1 size-4"
                />
              </button>
              <Button
                type="link"
                size="small"
                @click.stop="onEdit(row)"
                class="edit-surcharge-btn"
              >
                <IconifyIcon icon="mdi:pencil-outline" class="size-4" />
                {{ $t('common.edit') }}
              </Button>
            </div>

            <!-- 如果只有一个附加费，只显示编辑按钮 -->
            <div v-else class="flex items-center justify-end">
              <Button
                type="link"
                size="small"
                @click.stop="onEdit(row)"
                class="edit-surcharge-btn"
              >
                <IconifyIcon icon="mdi:pencil-outline" class="size-4" />
                {{ $t('common.edit') }}
              </Button>
            </div>

            <!-- 展开后显示所有附加费（从第二个开始） -->
            <div v-show="expandedRows[row.id]" class="mt-2 space-y-2">
              <div
                v-for="(fee, index) in row.seFreiPriceFees.slice(1)"
                :key="fee.id || index"
                class="surcharge-fee-card"
              >
                <div class="fee-card-content">
                  <div class="fee-header">
                    <span class="fee-name">{{ getFeeName(fee) }}</span>
                    <span class="fee-currency">{{ getCurrencyName(fee) }}</span>
                  </div>
                  <div class="fee-details">
                    <span
                      v-for="(detail, idx) in getFeeDetails(fee, row)"
                      :key="idx"
                      class="fee-detail-item"
                    >
                      {{ detail }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

      <template #toolbar-tools>
        <div class="flex w-[71vw] justify-between">
          <!-- 航线选择标签页 -->
          <div class="mb-4 mr-5 w-[47vw] pt-3">
            <div class="flex items-center space-x-1 overflow-x-auto">
              <!-- 全部选项 -->
              <div
                class="cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-all duration-200"
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
                class="cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-all duration-200"
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
          <Space>
            <!-- 新增按钮 -->
            <!-- <Button v-access:code="perm.add" type="primary" @click="onCreate">
              <Plus class="size-5" />
              {{
                $t('ui.actionTitle.create', [$t('seaExport.freightRate.name')])
              }}
            </Button> -->

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
        </div>
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
/* 确保附加费列的行高可以自适应内容 */
:deep(.vxe-table .vxe-body--column[col-field='surchargeFees']) {
  height: auto !important;
  min-height: 60px !important;
}

:deep(.vxe-table .vxe-body--row) {
  height: auto !important;
}

/* 淡化表格悬浮后的行背景色，确保复选框可见 */
:deep(.vxe-table .vxe-body--row.is--hover) {
  background-color: rgb(245 247 250 / 30%) !important;
}

/* 确保复选框在悬浮时仍然清晰可见 */
:deep(.vxe-table .vxe-body--row.is--hover .vxe-checkbox) {
  opacity: 1 !important;
}

/* 选中行的背景色保持不变或稍微调整 */
:deep(.vxe-table .vxe-body--row.row--checkbox) {
  background-color: rgb(230 240 255 / 50%) !important;
}

/* 选中且悬浮时的背景色 */
:deep(.vxe-table .vxe-body--row.row--checkbox.is--hover) {
  background-color: rgb(220 235 255 / 60%) !important;
}

/* 可编辑单元格的样式 */
:deep(.cell-editable-number) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 28px;
}

:deep(.cell-editable-number:hover) {
  outline: 1px dashed #4096ff;
  background-color: rgb(239 246 255) !important;
}

/* 新增按钮渐变背景样式 */
.gradient-primary-btn {
  color: white !important;
  background: linear-gradient(
    109.04deg,
    #4e83fe 9.09%,
    #0f66fd 100%
  ) !important;
  border: none !important;
}

.gradient-primary-btn:hover {
  background: linear-gradient(
    109.04deg,
    #5d8ffe 9.09%,
    #1e72fd 100%
  ) !important;
  opacity: 0.9;
}

.gradient-primary-btn:active {
  background: linear-gradient(
    109.04deg,
    #3d77fe 9.09%,
    #005aed 100%
  ) !important;
}

/* 附加费容器样式 */
.surcharge-fees-container {
  position: relative;
  min-height: 60px;
}

/* 附加费卡片样式 */
.surcharge-fee-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.surcharge-fee-card:hover {
  border-color: #d0d5dd;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.fee-card-content {
  padding: 12px;
}

.fee-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.fee-name {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.fee-currency {
  font-size: 12px;
  color: #6b7280;
  text-transform: lowercase;
}

.fee-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fee-detail-item {
  font-size: 13px;
  line-height: 1.4;
  color: #2563eb;
}

/* 展开按钮样式 */
.expand-button {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 6px 12px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.expand-button:hover {
  color: #2563eb;
  background: #f0f7ff;
  border-color: #2563eb;
}

.expand-button:active {
  transform: scale(0.98);
}

/* 编辑附加费按钮样式 */
.edit-surcharge-btn {
  height: auto;
  padding: 0;
}
</style>
