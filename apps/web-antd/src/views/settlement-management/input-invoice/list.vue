<script lang="ts" setup>
import { computed, nextTick, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { InputInvoiceAdminApi as Api } from '#/api/settlement-management/input-invoice-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { useTableConfigStore } from '#/store/table-config';
import { createPagedListQuery } from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';

import { INPUT_INVOICE_GROUP_FIELDS } from './constants';
import {
  columns,
  getInvoiceStatusColor,
  getInvoiceStatusLabel,
  getInvoiceTypeColor,
  getInvoiceTypeLabel,
  searchFormSchema,
} from './data';
import PullModal from './pull-modal.vue';

const router = useRouter();
const perm = createAbpPermission('Admin.InputInvoice');
const tableConfigStore = useTableConfigStore();

/** 分组设置持久化 key（与路由名 InputInvoiceList 对齐） */
const GROUP_CONFIG_NAME = 'group_config_InputInvoiceList';

const loadGroupField = async (): Promise<number | undefined> => {
  await tableConfigStore.loadGroupConfigsOnce();
  const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
  if (!hit?.setting) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(hit.setting) as { field?: null | number };
    return typeof parsed?.field === 'number' ? parsed.field : undefined;
  } catch {
    return undefined;
  }
};

const saveGroupField = (fieldValue: number | undefined) => {
  const setting = JSON.stringify({ field: fieldValue ?? null });
  const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
  if (hit) {
    void tableConfigStore.editGroupConfig({
      id: hit.id,
      name: GROUP_CONFIG_NAME,
      setting,
    });
  } else {
    void tableConfigStore.addGroupConfig({ name: GROUP_CONFIG_NAME, setting });
  }
};

const grouping = useListGrouping({
  fields: INPUT_INVOICE_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: async (baseParams, field) => {
    const items = await Api.getGroupedList({
      ...baseParams,
      groupField: field,
    } as Api.InputInvoiceGroupQueryDto);
    return items ?? [];
  },
  persist: {
    load: loadGroupField,
    save: saveGroupField,
  },
});

/** 日期起 → 当天 00:00:00 的 ISO；空值原样返回 undefined */
const toStartIso = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string);
  return parsed.isValid() ? parsed.startOf('day').toISOString() : undefined;
};

/** 日期止 → 当天 23:59:59 的 ISO，保证按日筛选含当天 */
const toEndIso = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string);
  return parsed.isValid() ? parsed.endOf('day').toISOString() : undefined;
};

const normalizeQuery = (
  formValues: Record<string, any>,
): Api.InputInvoiceQueryDto => {
  const {
    keyword,
    invoiceTimeStart,
    invoiceTimeEnd,
    creationTimeStart,
    creationTimeEnd,
    ...rest
  } = formValues;

  const baseParams = {
    ...rest,
    keyword: typeof keyword === 'string' ? keyword.trim() : keyword,
    invoiceTimeStart: toStartIso(invoiceTimeStart),
    invoiceTimeEnd: toEndIso(invoiceTimeEnd),
    creationTimeStart: toStartIso(creationTimeStart),
    creationTimeEnd: toEndIso(creationTimeEnd),
  };

  return grouping.decorateListParams(baseParams) as Api.InputInvoiceQueryDto;
};

// ==================== 详情页（新 tab 打开） ====================
const openDetail = (row: Api.InputInvoiceListDto) => {
  router.push(`/settlement-management/input-invoice/detail/${row.id}`);
};

const handleRowDblclick = ({ row }: { row: Api.InputInvoiceListDto }) => {
  openDetail(row);
};

// ==================== 手动拉取弹窗 ====================
const pullOpen = ref(false);
const openPull = () => {
  pullOpen.value = true;
};
const handlePullSuccess = () => {
  gridApi.query();
  grouping.refreshGroupData();
};

// ==================== 底部当页合计 ====================
/** 当前页表格数据，用于底部含税/不含税/税额合计 */
const currentPageData = ref<Api.InputInvoiceListDto[]>([]);

/** 当页三个金额字段合计（进项发票均为人民币，无需按币别分组） */
const pageTotals = computed(() => {
  let totalAmount = 0;
  let exTaxAmount = 0;
  let taxAmount = 0;
  currentPageData.value.forEach((row) => {
    totalAmount += Number(row.totalAmount) || 0;
    exTaxAmount += Number(row.exTaxAmount) || 0;
    taxAmount += Number(row.taxAmount) || 0;
  });
  return { exTaxAmount, taxAmount, totalAmount };
});

/** 合计金额格式化：千分位 + 两位小数 */
const formatTotalAmount = (value: number) =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** 当前页是否有数据（控制合计区空态） */
const hasPageData = computed(() => currentPageData.value.length > 0);

/**
 * 底部合计扁平项（对齐开票申请列表：
 * 「标签: 着色金额」，每两组后用分隔符）。
 */
const summaryItems = computed(() => {
  if (!hasPageData.value) return [];
  return [
    {
      color: 'total',
      name: '价税合计:',
      value: formatTotalAmount(pageTotals.value.totalAmount),
    },
    {
      color: 'amount',
      name: '金额:',
      value: formatTotalAmount(pageTotals.value.exTaxAmount),
    },
    {
      color: 'tax',
      name: '税额:',
      value: formatTotalAmount(pageTotals.value.taxAmount),
    },
  ];
});

const [Grid, gridApi] = useVbenVxeGrid<Api.InputInvoiceListDto>({
  formOptions: {
    schema: searchFormSchema,
    // 搜索条件变更不自动查：需点「查询」；首屏 onMounted 统一触发首查
    submitOnChange: false,
    showCollapseButton: true,
    collapsed: true,
    commonConfig: { labelWidth: 90 },
    wrapperClass: 'grid-cols-6',
    handleReset: async () => {
      await gridApi.formApi.resetForm();
      await nextTick();
    },
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
  },
  gridOptions: {
    align: 'left',
    columns,
    height: '100%',
    keepSource: true,
    rowConfig: { keyField: 'id', isHover: true },
    pagerConfig: { enabled: true },
    proxyConfig: {
      // 关闭自动加载：由 onMounted 先恢复分组字段再 submitForm 首查，避免竞态
      autoLoad: false,
      ajax: {
        query: createPagedListQuery(Api.getPagedList, {
          defaultSort: 'InvoiceTime DESC',
          mapParams: normalizeQuery,
          fieldMap: {
            invoiceTime: 'InvoiceTime',
            totalAmount: 'TotalAmount',
            creationTime: 'CreationTime',
          },
          afterFetch: (result: any) => {
            // 拦截当前页数据，驱动底部含税/不含税/税额合计
            currentPageData.value = result?.items ?? [];
            return result;
          },
        }),
      },
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      zoom: true,
    },
  },
});

onMounted(async () => {
  // 先恢复持久化分组字段（仅设置状态，不查询），确保首查即带上分组维度
  await grouping.restorePersistedField();
  await gridApi.formApi.submitForm();
});

// 列表页 keepAlive，分组统计不做缓存：每次重新进入都拉一遍（首次激活与首查重合，跳过）
let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  grouping.refreshGroupData();
});

const onGroupFieldChange = (value: number | undefined) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};
</script>

<template>
  <Page auto-content-height content-class="flex flex-col">
    <Grid class="min-h-0 flex-1">
      <!-- 工具栏左侧插槽始终挂载，避免开启分组时 title 与插槽切换导致列设置重置 -->
      <template #toolbar-actions>
        <GroupingTabs
          v-if="grouping.isGrouping.value"
          :items="grouping.groupItems.value"
          :selected-id="grouping.selectedItemId.value"
          :loading="grouping.loading.value"
          @select="grouping.selectItem"
        />
        <div v-else class="mr-1 pl-1 text-[1rem]">进项发票列表</div>
      </template>
      <template #toolbar-tools>
        <Button
          v-access:code="perm.add"
          type="primary"
          class="mr-2 inline-flex items-center gap-1"
          @click="openPull"
        >
          <template #icon>
            <IconifyIcon icon="mdi:cloud-download-outline" class="size-4" />
          </template>
          手动拉取
        </Button>
        <GroupingSettings
          :fields="grouping.fields"
          :value="grouping.enabledField.value?.value"
          @change="onGroupFieldChange"
        />
      </template>

      <template #invoiceStatus="{ row }">
        <Tag
          v-if="row.invoiceStatus"
          :color="getInvoiceStatusColor(row.invoiceStatus)"
        >
          {{ getInvoiceStatusLabel(row.invoiceStatus) }}
        </Tag>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #isUsed="{ row }">
        <Tag v-if="row.isUsed" color="processing">已使用</Tag>
        <span v-else class="text-gray-400">未使用</span>
      </template>

      <template #invoiceType="{ row }">
        <Tag
          v-if="row.invoiceType"
          :color="getInvoiceTypeColor(row.invoiceType)"
        >
          {{ getInvoiceTypeLabel(row.invoiceType) }}
        </Tag>
        <span v-else class="text-gray-400">-</span>
      </template>
    </Grid>

    <!-- 合计放在内容区内：Page 的 p-4 形成相对页面左右与底部的外边距 -->
    <div v-if="summaryItems.length > 0" class="input-invoice-footer-summary">
      <div
        v-for="(item, index) in summaryItems"
        :key="`${item.name}-${index}`"
        class="input-invoice-footer-summary__pair"
      >
        <span class="input-invoice-footer-summary__name">{{ item.name }}</span>
        <span
          class="input-invoice-footer-summary__value"
          :class="`input-invoice-footer-summary__value--${item.color}`"
        >
          {{ item.value }}
        </span>
        <span
          v-show="(index + 1) % 2 === 0 && index < summaryItems.length - 1"
          class="input-invoice-footer-summary__split"
        >
          |
        </span>
      </div>
    </div>
    <div
      v-else
      class="input-invoice-footer-summary input-invoice-footer-summary--empty"
    >
      <span class="input-invoice-footer-summary__name">当页合计：</span>
      <span class="input-invoice-footer-summary__empty-text">暂无数据</span>
    </div>

    <PullModal v-model:open="pullOpen" @success="handlePullSuccess" />
  </Page>
</template>

<style scoped>
/* 内容区内合计：相对页面的外边距由 Page p-4 提供，自身仅与表格留间距 */
.input-invoice-footer-summary {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0 4px;
  align-items: center;
  width: 100%;
  min-height: 40px;
  padding: 8px 16px;
  margin-top: 12px;
  font-size: 13px;
  color: #52607a;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 6%) 0%,
    hsl(var(--background)) 55%,
    hsl(var(--primary) / 6%) 100%
  );
  border: 1px solid #e8ecf3;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
}

.input-invoice-footer-summary--empty {
  color: #94a3b8;
}

.input-invoice-footer-summary__pair {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-right: 12px;
}

.input-invoice-footer-summary__name {
  flex-shrink: 0;
}

.input-invoice-footer-summary__value {
  font-weight: 600;
}

.input-invoice-footer-summary__value--total {
  color: #00a862;
}

.input-invoice-footer-summary__value--amount {
  color: #f59e0b;
}

.input-invoice-footer-summary__value--tax {
  color: #1890ff;
}

.input-invoice-footer-summary__split {
  margin: 0 4px;
  color: #d9dee8;
}

.input-invoice-footer-summary__empty-text {
  color: #94a3b8;
}
</style>
