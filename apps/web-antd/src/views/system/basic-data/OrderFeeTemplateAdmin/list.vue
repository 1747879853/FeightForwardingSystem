<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';

import { nextTick, ref, computed, onMounted, onUnmounted, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus, Trash2, ChevronLeft, ChevronRight } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteOrderFeeTemplate,
  getOrderFeeTemplatePagedList,
  getPolGroupList,
} from '#/api/sea-export/order-fee-template-admin';
import { getFeeCodeListAsync } from '#/api/system/base-data/fee-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import { getClientPagedList } from '#/api/common/client';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';
import { useUserStore, useAccessStore } from '@vben/stores';
import { createPagedListQuery } from '#/utils';

import {
  ORDER_FEE_TEMPLATE_LIST_TABLE_ID,
  useColumns,
  useGridFormSchema,
} from './data';
import Form from './modules/form.vue';

// 创建权限对象
const perm = createAbpPermission('Admin.OrderFeeTemplate');

// 获取用户store
const userStore = useUserStore();
// 获取权限store
const accessStore = useAccessStore();

// 用户功能权限
const userFunctionPermissions = ref<string[]>([]);

// 计算属性：判断用户是否有特定权限
const hasAddPermission = computed(() =>
  userFunctionPermissions.value.includes('Admin.OrderFeeTemplate.Add'),
);

const hasEditPermission = computed(() =>
  userFunctionPermissions.value.includes('Admin.OrderFeeTemplate.Edit'),
);

const hasDeletePermission = computed(() =>
  userFunctionPermissions.value.includes('Admin.OrderFeeTemplate.Delete'),
);

// 当前选中的起运港ID（用于分组筛选）
const selectedPolId = ref<number | undefined>(undefined);

// 起运港分组统计数据
const polGroupList = ref<
  OrderFeeTemplateAdminApi.OrderFeeTemplatePolGroupDto[]
>([]);

// ✅ 新增：下拉数据源（在列表页面加载一次）
const dropdownData = ref({
  feeCodeList: [] as Array<{
    label: string;
    value: number;
    currencyId?: number;
    unit?: string;
    taxRate?: number;
  }>,
  currencyList: [] as Array<{ label: string; value: number }>,
  clientListByIndustry: {} as Record<
    string,
    Array<{ label: string; value: any }>
  >,
  allClientsByIndustry: {} as Record<
    string,
    Array<{ label: string; value: any }>
  >,
});

// ✅ 新增：加载下拉数据（只在列表页面加载一次）
async function loadDropdownData() {
  try {
    console.log('🔄 [list.vue] 开始加载下拉数据...');

    // 1. 加载费用代码列表
    const feeCodeData = await getFeeCodeListAsync({ isSea: true });
    if (feeCodeData && Array.isArray(feeCodeData)) {
      dropdownData.value.feeCodeList = feeCodeData.map((item: any) => {
        const surLabel = item.cnName || item.enName || '';
        const label = item.code ? `${item.code}-${surLabel}` : surLabel;
        return {
          label: label || item.cnName || item.enName || item.code || '',
          value: Number(item.id),
          currencyId: item.currencyId ? Number(item.currencyId) : undefined,
          unit: item.defaultUnit || undefined,
          taxRate:
            item.taxRate !== undefined ? Number(item.taxRate) : undefined,
        };
      });
      console.log(
        `✅ [list.vue] 费用代码加载完成，共 ${dropdownData.value.feeCodeList.length} 条`,
      );
    }

    // 2. 加载币别列表
    const currencyRes = await getCurrencyPagedList({
      PageIndex: 1,
      PageSize: 100,
    });
    if (currencyRes?.items) {
      dropdownData.value.currencyList = currencyRes.items.map((item: any) => ({
        label: item.code || item.cnName || item.enName || '',
        value: Number(item.id),
      }));
      console.log(
        `✅ [list.vue] 币别加载完成，共 ${dropdownData.value.currencyList.length} 条`,
      );
    }

    // 3. 加载客户列表（按行业类别分组）
    const clientDataP = await getClientPagedList({
      pageSize: 1000,
      pageIndex: 1,
      industryCategory: 'p' as any,
    });
    if (clientDataP?.items) {
      dropdownData.value.clientListByIndustry['p'] = clientDataP.items.map(
        (item: any) => ({
          label: item.name || item.clientName || '',
          value: item.id,
        }),
      );
    }

    const clientDataO = await getClientPagedList({
      pageSize: 1000,
      pageIndex: 1,
      industryCategory: 'o' as any,
    });
    if (clientDataO?.items) {
      dropdownData.value.clientListByIndustry['o'] = clientDataO.items.map(
        (item: any) => ({
          label: item.name || item.clientName || '',
          value: item.id,
        }),
      );
    }

    // 4. ✅ 关键修复：加载全部客户数据（用于结算对象下拉框）
    const { getClientGroupedByIndustryCategory } =
      await import('#/api/common/client');
    const groupedData = await getClientGroupedByIndustryCategory();
    if (groupedData && Array.isArray(groupedData)) {
      let totalClientCount = 0;
      groupedData.forEach((group) => {
        if (group.key && group.value && group.value.length > 0) {
          const clients = group.value.map((client: any) => ({
            label: `${client.code}-${client.name}`,
            value: client.id,
            industryCategory: group.key,
            ...client,
          }));
          dropdownData.value.allClientsByIndustry[group.key] = clients;
          totalClientCount += clients.length;
        }
      });
      console.log(
        `✅ [list.vue] 全部客户缓存加载完成，共 ${Object.keys(dropdownData.value.allClientsByIndustry).length} 个行业类别，总计 ${totalClientCount} 个客户`,
      );
    }

    console.log('✅ [list.vue] 所有下拉数据加载完成');
  } catch (error) {
    console.error('❌ [list.vue] 加载下拉数据失败:', error);
    message.error('加载下拉数据失败');
  }
}

// 加载起运港分组统计
async function loadPolGroupList() {
  try {
    const formValues = gridApi.formApi.form.values;
    const result = await getPolGroupList(formValues);
    polGroupList.value = result || [];
  } catch (error) {
    console.error('加载起运港分组统计失败:', error);
  }
}

// 初始化用户权限
function initUserPermissions() {
  const accessCodes = accessStore.accessCodes || [];
  userFunctionPermissions.value = accessCodes;
  console.log('[功能权限] 当前用户的功能权限:', userFunctionPermissions.value);
}

// 表单弹窗
const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

/**
 * 操作按钮点击事件
 */
function onActionClick(
  e: OnActionClickParams<OrderFeeTemplateAdminApi.OrderFeeTemplateListDto>,
) {
  switch (e.code) {
    case 'edit': {
      onEdit(e.row);
      break;
    }
  }
}

/**
 * 新建模板
 */
function onCreate() {
  if (!hasAddPermission.value) {
    message.warning('您没有新建权限');
    return;
  }
  formModalApi
    .setData({
      mode: 'create',
      dropdownData: dropdownData.value,
    })
    .open();
}

/**
 * 编辑模板
 */
function onEdit(row: OrderFeeTemplateAdminApi.OrderFeeTemplateListDto) {
  if (!hasEditPermission.value) {
    message.warning('您没有编辑权限');
    return;
  }
  formModalApi
    .setData({
      mode: 'edit',
      id: row.id,
      dropdownData: dropdownData.value,
    })
    .open();
}

/**
 * 双击行编辑
 */
function onRowDblClick({ row }: any) {
  onEdit(row);
}

/**
 * 批量删除
 */
async function onBatchDelete() {
  if (!hasDeletePermission.value) {
    message.warning('您没有删除权限');
    return;
  }

  const records = getCheckboxRecords();
  if (records.length === 0) {
    message.warning('请先选择要删除的模板');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${records.length} 条模板吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      const hideLoading = message.loading({
        content: '正在删除...',
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        const ids = records.map((r) => r.id).filter(Boolean) as string[];
        await deleteOrderFeeTemplate({ ids });
        message.success({
          content: '删除成功',
          key: 'action_process_msg',
        });
        handleRefresh();
        loadPolGroupList();
      } catch (error) {
        hideLoading();
        message.error('删除失败');
        console.error(error);
      }
    },
  });
}

/**
 * 获取选中的行
 */
function getCheckboxRecords() {
  const grid = gridApi.grid;
  if (!grid) return [];
  return grid.getCheckboxRecords() as OrderFeeTemplateAdminApi.OrderFeeTemplateListDto[];
}

/**
 * 刷新列表
 */
function handleRefresh() {
  gridApi.query();
}

/**
 * 处理起运港分组点击
 */
function handlePolGroupClick(polId?: number | null) {
  selectedPolId.value = polId ?? undefined;
  // 重新查询列表
  gridApi.query();
}

const [Grid, gridApi] =
  useVbenVxeGrid<OrderFeeTemplateAdminApi.OrderFeeTemplateListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      showCollapseButton: true,
      submitOnChange: true,
      collapsed: true,
      commonConfig: {
        labelWidth: 100,
      },
      wrapperClass: 'grid-cols-4',
    },
    gridOptions: {
      id: ORDER_FEE_TEMPLATE_LIST_TABLE_ID,
      columns: useColumns(onActionClick),
      height: 'auto',
      keepSource: true,
      sortConfig: {
        remote: true,
        defaultSort: { field: 'creationTime', order: 'desc' },
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        sort: true,
        ajax: {
          query: createPagedListQuery(getOrderFeeTemplatePagedList, {
            defaultSort: 'CreationTime DESC',
            mapParams: (
              formValues: Record<string, any>,
              sortParams?: Record<string, any>,
            ) => {
              const queryParams: Record<string, any> = {
                polId: selectedPolId.value,
              };

              // 处理表单查询参数
              Object.keys(formValues).forEach((key) => {
                if (formValues[key] !== null && formValues[key] !== undefined) {
                  queryParams[key] = formValues[key];
                }
              });

              // 处理排序参数
              if (sortParams && Object.keys(sortParams).length > 0) {
                const sortField = sortParams.field;
                const sortOrder = sortParams.order;
                if (sortField && sortOrder) {
                  queryParams.sorting = `${sortField} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
                }
              }

              return queryParams;
            },
            afterFetch: (result) => {
              // 每次查询后重新加载分组统计
              loadPolGroupList();
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
      cellDblclick: onRowDblClick,
    },
  });

// 航线标签相关引用和状态
const polTabBarRef = ref<HTMLElement | null>(null);
const polTabTrackRef = ref<HTMLElement | null>(null);
const canScrollPolTabLeft = ref(false);
const canScrollPolTabRight = ref(false);
const polTabScrollable = ref(false);
const POL_TAB_SCROLL_STEP = 240;
const POL_TAB_SCROLL_DURATION = 280;
let polTabResizeObserver: ResizeObserver | null = null;
let polTabScrollAnimationId: number | null = null;
let polTabScrollIdleTimer:
  | ReturnType<typeof setTimeout>
  | NodeJS.Timeout
  | null = null;
let isPolTabAnimating = false;

function updatePolTabScrollState() {
  const el = polTabBarRef.value;
  if (!el) {
    canScrollPolTabLeft.value = false;
    canScrollPolTabRight.value = false;
    polTabScrollable.value = false;
    return;
  }

  const { scrollLeft, scrollWidth, clientWidth } = el;
  polTabScrollable.value = scrollWidth > clientWidth + 1;
  canScrollPolTabLeft.value = scrollLeft > 1;
  canScrollPolTabRight.value = scrollLeft + clientWidth < scrollWidth - 1;
}

function onPolTabScroll() {
  if (isPolTabAnimating) return;

  if (polTabScrollIdleTimer) {
    window.clearTimeout(polTabScrollIdleTimer);
  }

  polTabScrollIdleTimer = window.setTimeout(() => {
    polTabScrollIdleTimer = null;
    updatePolTabScrollState();
  }, 120) as any;
}

function stopPolTabScrollAnimation() {
  if (polTabScrollAnimationId !== null) {
    window.cancelAnimationFrame(polTabScrollAnimationId);
    polTabScrollAnimationId = null;
  }
  isPolTabAnimating = false;
}

function animatePolTabScroll(targetLeft: number) {
  const el = polTabBarRef.value;
  if (!el) return;

  stopPolTabScrollAnimation();
  isPolTabAnimating = true;

  const startLeft = el.scrollLeft;
  const distance = targetLeft - startLeft;
  if (Math.abs(distance) < 1) {
    stopPolTabScrollAnimation();
    updatePolTabScrollState();
    return;
  }

  const startTime = performance.now();

  function step(currentTime: number) {
    const progress = Math.min(
      (currentTime - startTime) / POL_TAB_SCROLL_DURATION,
      1,
    );
    const eased = 1 - (1 - progress) ** 3;
    if (el) {
      el.scrollLeft = startLeft + distance * eased;
    }

    if (progress < 1) {
      polTabScrollAnimationId = window.requestAnimationFrame(step);
      return;
    }

    polTabScrollAnimationId = null;
    isPolTabAnimating = false;
    updatePolTabScrollState();
  }

  polTabScrollAnimationId = window.requestAnimationFrame(step);
}

function scrollPolTabs(direction: 'left' | 'right') {
  const el = polTabBarRef.value;
  if (!el) return;

  const step = Math.max(POL_TAB_SCROLL_STEP, el.clientWidth * 0.6);
  const maxScrollLeft = el.scrollWidth - el.clientWidth;
  const targetLeft = Math.max(
    0,
    Math.min(
      maxScrollLeft,
      el.scrollLeft + (direction === 'left' ? -step : step),
    ),
  );

  if (Math.abs(targetLeft - el.scrollLeft) < 1) return;

  animatePolTabScroll(targetLeft);
}

function bindPolTabScrollObserver() {
  polTabResizeObserver?.disconnect();
  polTabResizeObserver = null;

  const el = polTabBarRef.value;
  if (!el) return;

  el.removeEventListener('scroll', onPolTabScroll);
  el.addEventListener('scroll', onPolTabScroll, { passive: true });

  polTabResizeObserver = new ResizeObserver(() => {
    updatePolTabScrollState();
  });
  polTabResizeObserver.observe(el);
  if (polTabTrackRef.value) {
    polTabResizeObserver.observe(polTabTrackRef.value);
  }
  updatePolTabScrollState();
}

watch(
  () => polGroupList.value.length,
  async () => {
    await nextTick();
    bindPolTabScrollObserver();
  },
);

onMounted(() => {
  initUserPermissions();
  loadPolGroupList();
  loadDropdownData();
});

onUnmounted(() => {
  polTabBarRef.value?.removeEventListener('scroll', onPolTabScroll);
  if (polTabScrollIdleTimer) {
    window.clearTimeout(polTabScrollIdleTimer);
  }
  stopPolTabScrollAnimation();
  polTabResizeObserver?.disconnect();
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <div
          class="pol-tab-wrapper flex min-w-0 flex-1 items-center overflow-hidden"
        >
          <div
            ref="polTabBarRef"
            class="pol-tab-bar min-w-0 flex-1 overflow-x-auto"
          >
            <div
              ref="polTabTrackRef"
              class="pol-tab-track inline-flex flex-nowrap items-center gap-1"
            >
              <!-- 全部选项 -->
              <!-- <div
                class="pol-tab-item cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-all duration-200"
                :class="
                  selectedPolId === undefined
                    ? 'border-blue-500 text-blue-500'
                    : 'border-none text-gray-600 hover:text-gray-900'
                "
                @click="handlePolGroupClick(undefined)"
              >
                全部
              </div> -->

              <!-- 起运港选项 -->
              <div
                v-for="(group, index) in polGroupList"
                :key="index"
                class="pol-tab-item cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-all duration-200"
                :class="
                  selectedPolId === group.polId
                    ? 'border-blue-500 text-blue-500'
                    : 'border-none text-gray-600 hover:text-gray-900'
                "
                @click="handlePolGroupClick(group.polId ?? undefined)"
              >
                {{
                  group.isTotal
                    ? '全部'
                    : group.pol?.portName || group.pol?.cnName || '未设置'
                }}
                <span class="ml-1 text-xs text-gray-400"
                  >({{ group.count }})</span
                >
              </div>
            </div>
          </div>

          <div
            v-if="polTabScrollable"
            class="pol-tab-scroll-actions flex shrink-0 items-center"
          >
            <button
              type="button"
              class="pol-tab-scroll-btn"
              :class="{ 'is-disabled': !canScrollPolTabLeft }"
              :aria-disabled="!canScrollPolTabLeft"
              title="向左滚动"
              @click="scrollPolTabs('left')"
            >
              <ChevronLeft class="size-4" />
            </button>
            <button
              type="button"
              class="pol-tab-scroll-btn"
              :class="{ 'is-disabled': !canScrollPolTabRight }"
              :aria-disabled="!canScrollPolTabRight"
              title="向右滚动"
              @click="scrollPolTabs('right')"
            >
              <ChevronRight class="size-4" />
            </button>
          </div>
        </div>
      </template>

      <template #toolbar-tools>
        <Space class="shrink-0">
          <Button
            danger
            :disabled="!hasDeletePermission"
            @click="onBatchDelete"
            class="mr-2"
          >
            删除
          </Button>
          <Button
            type="primary"
            :disabled="!hasAddPermission"
            @click="onCreate"
          >
            <Plus />
            新建
          </Button>
        </Space>
      </template>
    </Grid>

    <FormModal />
  </Page>
</template>

<style scoped>
/* 起运港 tab 靠左展示，超出时横向滚动，不挤压右侧操作按钮 */
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

.pol-tab-wrapper {
  flex: 1 1 0%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.pol-tab-bar {
  flex: 1 1 0%;
  width: 0;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.pol-tab-track {
  width: max-content;
}

.pol-tab-item {
  flex-shrink: 0;
}

.pol-tab-bar::-webkit-scrollbar {
  display: none;
}

.pol-tab-scroll-btn {
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

.pol-tab-scroll-btn:hover:not(.is-disabled) {
  background: rgb(0 0 0 / 4%);
}

.pol-tab-scroll-btn.is-disabled {
  color: rgb(0 0 0 / 25%);
  pointer-events: none;
  cursor: not-allowed;
}
</style>
