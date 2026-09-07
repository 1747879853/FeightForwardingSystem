<script lang="ts" setup>
import { nextTick, onActivated, onMounted, ref } from 'vue';

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
  searchFormSchema,
} from './data';
import DetailModal from './detail-modal.vue';
import PullModal from './pull-modal.vue';

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

// ==================== 详情弹窗 ====================
const detailOpen = ref(false);
const detailId = ref<string>('');

const openDetail = (row: Api.InputInvoiceListDto) => {
  detailId.value = row.id;
  detailOpen.value = true;
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
};

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
    height: 'auto',
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
  <Page auto-content-height>
    <Grid>
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

      <template #actions="{ row }">
        <Button type="link" size="small" @click="openDetail(row)">查看</Button>
      </template>
    </Grid>

    <DetailModal v-model:open="detailOpen" :id="detailId" />
    <PullModal v-model:open="pullOpen" @success="handlePullSuccess" />
  </Page>
</template>
