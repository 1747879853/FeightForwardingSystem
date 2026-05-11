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

import { Page, useVbenModal } from '@vben/common-ui';
import { Copy, Plus, ChevronDown, IconifyIcon } from '@vben/icons';

import { Button, message, Modal, Space, Dropdown, Menu } from 'ant-design-vue';

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

onMounted(() => {
  getLines();
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
        <div
          v-html="formatSurchargeFees(row)"
          @dblclick="onEdit(row)"
          class="p-2"
        />
      </template>

      <!-- 箱型费用可编辑单元格插槽 -->
      <template #ctnEditableCell="{ row, column }">
        <CtnEditableCell :row="row" :column="column" @success="onRefresh" />
      </template>

      <template #toolbar-tools>
        <div class="flex w-[70vw] justify-between">
          <!-- 航线选择标签页 -->
          <div class="mb-4 mr-5 pt-3">
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

            <!-- 批量新增按钮 -->
            <Button v-access:code="perm.add" @click="onBatchAdd">
              <Plus class="size-5" />
              {{ $t('seaExport.freightRate.create') }}
            </Button>

            <!-- 复制按钮 -->
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
</style>
