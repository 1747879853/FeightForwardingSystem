<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { GroupFieldDef } from '#/components/list-grouping';

import { computed, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Copy, Plus } from '@vben/icons';

import { useAccess } from '@vben/access';

import { Button, message, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getSeaExportGroupedList,
  getSeaExportPagedList,
} from '#/api/sea-export/sea-export-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { $t } from '#/locales';
import { useTableConfigStore } from '#/store/table-config';
import { buildAttachmentUrl, createPagedListQuery } from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

import {
  getSeaExportBusinessStatusText,
  useColumns,
  useGridFormSchema,
} from './data';
import {
  buildServiceTypeLabelMap,
  loadSeServiceTypeOptions,
} from './service-type';
import { useSeaExportCopy } from './use-sea-export-copy';
import {
  buildSeaExportSubscribeRow,
  useYundangOceanSubscribe,
} from './use-yundang-ocean-subscribe';
import {
  buildYundangTrackRow,
  getYundangTrackStatusColor,
  getYundangTrackStatusLabel,
  resolveOrderLabel,
  useYundangOceanTrack,
} from './use-yundang-ocean-track';

const perm = createAbpPermission('Admin.SeaExport');
const externalApiUseCode = 'Admin.ExternalApi.Use';
const externalApiGetCode = 'Admin.ExternalApi.Get';
const { copying, copyFrom } = useSeaExportCopy();
const { ResultModal, subscribe, subscribing } = useYundangOceanSubscribe();
const { TrackingModal, openTracking } = useYundangOceanTrack();
const { hasAccessByCodes } = useAccess();
const canViewYundangTracking = computed(() =>
  hasAccessByCodes([externalApiGetCode]),
);

const router = useRouter();
const tableConfigStore = useTableConfigStore();

/** 服务项类型枚举 label 映射（用于「业务状态」列展示服务名称） */
const serviceTypeLabelMap = ref<Map<number, string>>(new Map());

onMounted(async () => {
  const options = await loadSeServiceTypeOptions();
  serviceTypeLabelMap.value = buildServiceTypeLabelMap(options);
});

/** 分组设置持久化 key（与列表 listKey 对齐，路由名 SeaExportList） */
const GROUP_CONFIG_NAME = 'group_config_SeaExportList';

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
 * 海运出口分组字段配置。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，
 * 也是与之互斥的搜索表单字段名（付费方式无对应搜索项，启用时不影响搜索表单）。
 */
const SEA_EXPORT_GROUP_FIELDS: GroupFieldDef[] = [
  {
    value: 1,
    label: '装运方式',
    paramKey: 'BLType',
    emptyParamKey: 'BLTypeEmpty',
  },
  {
    value: 2,
    label: '订单类型',
    paramKey: 'BillType',
    emptyParamKey: 'BillTypeEmpty',
  },
  { value: 3, label: '委托单位', paramKey: 'ClientId' },
  {
    value: 4,
    label: '船公司',
    paramKey: 'CarrierId',
    emptyParamKey: 'CarrierIdEmpty',
  },
  { value: 5, label: '起运港', paramKey: 'POLId', emptyParamKey: 'POLIdEmpty' },
  { value: 6, label: '目的港', paramKey: 'PODId', emptyParamKey: 'PODIdEmpty' },
  { value: 7, label: '船名', paramKey: 'Vessel', emptyParamKey: 'VesselEmpty' },
  {
    value: 8,
    label: '付费方式',
    paramKey: 'CodeFrtId',
    emptyParamKey: 'CodeFrtIdEmpty',
  },
  {
    value: 9,
    label: '签单方式',
    paramKey: 'CodeIssueTypeId',
    emptyParamKey: 'CodeIssueTypeIdEmpty',
  },
];

const toIsoString = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

const grouping = useListGrouping({
  fields: SEA_EXPORT_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: (baseParams, field) =>
    getSeaExportGroupedList({
      ...baseParams,
      GroupField: field,
    } as SeaExportAdminApi.GetGroupedListParams),
  persist: {
    load: loadGroupField,
    save: saveGroupField,
  },
});

const normalizeQuery = (
  formValues: Record<string, unknown>,
): SeaExportAdminApi.GetPagedListParams => {
  const { ETDRange, CloseDocTimeRange, ...rest } = formValues;
  const [etdStart, etdEnd] = getRangeValue(ETDRange);
  const [closeDocTimeStart, closeDocTimeEnd] = getRangeValue(CloseDocTimeRange);

  const baseParams = {
    ...rest,
    ETDStart: toIsoString(etdStart),
    ETDEnd: toIsoString(etdEnd),
    CloseDocTimeStart: toIsoString(closeDocTimeStart),
    CloseDocTimeEnd: toIsoString(closeDocTimeEnd),
  };

  return grouping.decorateListParams(
    baseParams,
  ) as SeaExportAdminApi.GetPagedListParams;
};

const handleRowDblclick = ({
  row,
}: {
  row: SeaExportAdminApi.SeaExportDto;
}) => {
  const grid = gridApi.grid as any;
  if (grid?.setCheckboxRow) {
    grid.setCheckboxRow(row, true);
  }
  router.push(`/sea-exports/${row.id}/edit`);
};

const [Grid, gridApi] = useVbenVxeGrid<SeaExportAdminApi.SeaExportDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: true,
    collapsed: true,
    commonConfig: {
      labelWidth: 72,
    },
    wrapperClass: 'grid-cols-6',
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
  },
  gridOptions: {
    align: 'left',
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    checkboxConfig: {
      highlight: true,
      reserve: true,
      trigger: 'row',
    },
    rowConfig: {
      keyField: 'id',
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getSeaExportPagedList, {
          defaultSort: 'CreationTime DESC',
          mapParams: normalizeQuery,
          fieldMap: {
            'transportOrder.clientName': 'TransportOrder.Client.Name',
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

const getCheckboxRecords = (): SeaExportAdminApi.SeaExportDto[] => {
  const grid = gridApi.grid as any;
  return grid?.getCheckboxRecords?.() ?? [];
};

const requireExactlyOneRow = (): SeaExportAdminApi.SeaExportDto | undefined => {
  const rows = getCheckboxRecords();
  if (rows.length !== 1) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return undefined;
  }
  return rows[0];
};

const handleCreate = () => {
  router.push('/sea-exports/create');
};

const handleCopy = () => {
  const row = requireExactlyOneRow();
  if (!row) {
    return;
  }
  void copyFrom({
    id: row.id,
    commissionNum: row.transportOrder?.commissionNum,
    mblNum: row.transportOrder?.mblNum,
    bookingNum: row.transportOrder?.bookingNum,
    clientName: row.transportOrder?.clientName,
  });
};

const handleRefresh = () => {
  gridApi.query();
};

const handleYundangSubscribe = async () => {
  const rows = getCheckboxRecords();
  await subscribe(rows.map((row) => buildSeaExportSubscribeRow(row)));
  if (rows.length > 0) {
    gridApi.query();
  }
};

const handleOpenYundangTracking = (row: SeaExportAdminApi.SeaExportDto) => {
  const trackRow = buildYundangTrackRow(row);
  openTracking({
    seaExportId: trackRow.id,
    orderLabel: resolveOrderLabel(trackRow),
    isYundangSubscribed: trackRow.isYundangSubscribed,
    isYundangSubscribeSuccess: trackRow.isYundangSubscribeSuccess,
  });
};

const onGroupFieldChange = (value: number | undefined) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};

useRefreshListOnFormReturn('SeaExportList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid
      :table-title="
        grouping.isGrouping.value ? '' : $t('seaExport.export.list')
      "
    >
      <template v-if="grouping.isGrouping.value" #toolbar-actions>
        <GroupingTabs
          :items="grouping.groupItems.value"
          :selected-id="grouping.selectedItemId.value"
          :loading="grouping.loading.value"
          @select="grouping.selectItem"
        />
      </template>
      <template #toolbar-tools>
        <Button
          v-access:code="externalApiUseCode"
          class="mr-2"
          :loading="subscribing"
          @click="handleYundangSubscribe"
        >
          {{ $t('seaExport.yundang.subscribe') }}
        </Button>
        <Button
          v-access:code="perm.add"
          class="mr-2"
          :loading="copying"
          @click="handleCopy"
        >
          <Copy class="size-5" />
          {{ $t('seaExport.export.copy') }}
        </Button>
        <Button
          v-access:code="perm.add"
          class="mr-2"
          type="primary"
          @click="handleCreate"
        >
          <Plus class="size-5" />
          {{ $t('common.create') }}
        </Button>
        <GroupingSettings
          :fields="grouping.fields"
          :value="grouping.enabledField.value?.value"
          @change="onGroupFieldChange"
        />
      </template>
      <template #businessStatus="{ row }">
        {{ getSeaExportBusinessStatusText(row, serviceTypeLabelMap) }}
      </template>
      <template #yundangTrackStatus="{ row }">
        <Tag
          v-if="canViewYundangTracking"
          class="cursor-pointer"
          :color="getYundangTrackStatusColor(buildYundangTrackRow(row))"
          @click.stop="handleOpenYundangTracking(row)"
        >
          {{ getYundangTrackStatusLabel(buildYundangTrackRow(row)) }}
        </Tag>
        <span v-else class="text-[rgba(0,0,0,0.65)]">
          {{ getYundangTrackStatusLabel(buildYundangTrackRow(row)) }}
        </span>
      </template>
      <template #carrierWithLogo="{ row }">
        <span class="inline-flex items-center gap-1">
          <img
            v-if="row?.carrierLogo?.url"
            :src="buildAttachmentUrl(row.carrierLogo.url)"
            :alt="row?.carrierCode || row?.carrier?.code || 'carrier-logo'"
            class="h-8 w-8 rounded object-contain"
          />
          <span>{{ row?.carrierCode || row?.carrier?.code || '--' }}</span>
        </span>
      </template>
    </Grid>
    <ResultModal />
    <TrackingModal />
  </Page>
</template>

<style scoped>
:deep(.sea-export-keyword-input input::placeholder) {
  font-size: 12px;
}
</style>
