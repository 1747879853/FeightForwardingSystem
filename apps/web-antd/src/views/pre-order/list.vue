<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { GroupFieldDef } from '#/components/list-grouping';

import { onActivated, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deletePreOrder,
  getPreOrderGroupedList,
  getPreOrderPagedList,
  PreOrderStatus,
} from '#/api/pre-order/pre-order-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { useTableConfigStore } from '#/store/table-config';
import { buildAttachmentUrl } from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import {
  applyDefaultSortable,
  createPagedListQuery,
} from '#/utils/paged-list-query';

import {
  buildColumns,
  getPreOrderFormPath,
  PRE_ORDER_LIST_TABLE_ID,
  useGridFormSchema,
} from './data';

const perm = createAbpPermission('Admin.PreOrder');
const router = useRouter();
const tableConfigStore = useTableConfigStore();
const actionLoading = ref(false);

/** 分组设置持久化 key（与列表 listKey 对齐，路由名 PreOrderList） */
const GROUP_CONFIG_NAME = 'group_config_PreOrderList';

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

/**
 * 业务联系单分组字段配置。
 * value 对齐后端 PreOrderGroupField；paramKey 为点击分组项后追加的列表筛选参数。
 */
const PRE_ORDER_GROUP_FIELDS: GroupFieldDef[] = [
  { value: 3, label: '委托单位', paramKey: 'ClientId' },
  {
    value: 4,
    label: '船公司',
    paramKey: 'CarrierId',
    emptyParamKey: 'CarrierIdEmpty',
  },
  { value: 5, label: '起运港', paramKey: 'POLId', emptyParamKey: 'POLIdEmpty' },
  { value: 6, label: '目的港', paramKey: 'PODId', emptyParamKey: 'PODIdEmpty' },
  { value: 11, label: '业务类型', paramKey: 'BizType' },
];

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const grouping = useListGrouping({
  fields: PRE_ORDER_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: async (baseParams, field) => {
    const items = await getPreOrderGroupedList({
      ...baseParams,
      GroupField: field,
    } as PreOrderAdminApi.GetGroupedListParams);
    return (items ?? []).map((item) => ({
      ...item,
      logoUrl: item.logo?.url ? buildAttachmentUrl(item.logo.url) : undefined,
    }));
  },
  persist: {
    load: loadGroupField,
    save: saveGroupField,
  },
});

const normalizeMultiIds = (value: unknown) =>
  Array.isArray(value) && value.length > 0 ? value : undefined;

const normalizeQuery = (formValues: Record<string, unknown>) => {
  const range = Array.isArray(formValues.ETDRange) ? formValues.ETDRange : [];
  const remark =
    typeof formValues.Remark === 'string' ? formValues.Remark.trim() : '';
  const baseParams = {
    ...formValues,
    ETDStart: toIsoString(range[0]),
    ETDEnd: toIsoString(range[1]),
    ETDRange: undefined,
    SaleIds: normalizeMultiIds(formValues.SaleIds),
    OperatorIds: normalizeMultiIds(formValues.OperatorIds),
    Remark: remark || undefined,
  };
  return grouping.decorateListParams(baseParams);
};

const handleRowDblclick = ({ row }: { row: PreOrderAdminApi.PreOrderDto }) => {
  const grid = gridApi.grid as any;
  grid?.setRadioRow?.(row);
  router.push(getPreOrderFormPath(row.id));
};

const [Grid, gridApi] = useVbenVxeGrid<PreOrderAdminApi.PreOrderDto>({
  columnPersist: { tableId: PRE_ORDER_LIST_TABLE_ID },
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: true,
    collapsed: true,
    compact: true,
    wrapperClass: 'grid-cols-4',
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
  },
  gridOptions: {
    columns: applyDefaultSortable(buildColumns()),
    height: 'auto',
    keepSource: true,
    checkboxConfig: { highlight: true },
    rowConfig: { keyField: 'id' },
    pagerConfig: { enabled: true },
    proxyConfig: {
      // 关闭自动加载：先恢复持久化分组字段，再手动首查，避免与分组恢复竞态
      autoLoad: false,
      ajax: {
        query: createPagedListQuery(getPreOrderPagedList, {
          mapParams: normalizeQuery,
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
  await grouping.restorePersistedField();
  await gridApi.formApi.submitForm();
});

// 列表页 keepAlive，分组统计不做缓存：每次重新进入列表都拉取一遍分组数据。
let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  grouping.refreshGroupData();
});

function getSelectedRows(): PreOrderAdminApi.PreOrderDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as PreOrderAdminApi.PreOrderDto[];
}

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  router.push('/pre-order/add');
}

/** 复制：把选中单据 id 带到新建页，由新建页拉详情预填 */
function handleCopy() {
  const rows = getSelectedRows();
  if (rows.length !== 1) {
    message.warning('请选择一条业务联系单进行复制');
    return;
  }
  router.push({ path: '/pre-order/add', query: { copyFrom: rows[0]?.id } });
}

function handleDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的业务联系单');
    return;
  }
  const invalid = rows.filter(
    (row) =>
      row.status !== PreOrderStatus.Entering &&
      row.status !== PreOrderStatus.Rejected,
  );
  if (invalid.length > 0) {
    message.warning('仅「录入状态」或「驳回」的业务联系单可删除');
    return;
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条业务联系单吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        for (const row of rows) {
          await deletePreOrder(row.id);
        }
        message.success('删除成功');
        handleRefresh();
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

const onGroupFieldChange = (value: number | undefined) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};

useRefreshListOnFormReturn('PreOrderList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <GroupingTabs
          v-if="grouping.isGrouping.value"
          :items="grouping.groupItems.value"
          :selected-id="grouping.selectedItemId.value"
          :loading="grouping.loading.value"
          @select="grouping.selectItem"
        />
        <div v-else class="mr-1 pl-1 text-[1rem]">业务联系单</div>
      </template>
      <template #toolbar-tools>
        <Space>
          <Button v-access:code="perm.add" type="primary" @click="handleCreate">
            新建
          </Button>
          <Button v-access:code="perm.add" @click="handleCopy">复制</Button>
          <Button
            v-access:code="perm.delete"
            danger
            :loading="actionLoading"
            @click="handleDelete"
          >
            删除
          </Button>
          <GroupingSettings
            :fields="grouping.fields"
            :value="grouping.enabledField.value?.value"
            @change="onGroupFieldChange"
          />
        </Space>
      </template>
      <template #carrierWithLogo="{ row }">
        <span class="inline-flex items-center gap-1">
          <img
            v-if="row?.carrierLogo?.url"
            :src="buildAttachmentUrl(row.carrierLogo.url)"
            :alt="row?.carrier?.code || 'carrier-logo'"
            class="h-8 w-8 rounded object-contain"
          />
          <span>{{ row?.carrier?.code || '--' }}</span>
        </span>
      </template>
    </Grid>
  </Page>
</template>
