<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { GroupFieldDef } from '#/components/list-grouping';

import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSeaExport,
  getSeaExportGroupedList,
  getSeaExportPagedList,
} from '#/api/sea-export/sea-export-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { $t } from '#/locales';
import { buildAttachmentUrl, createPagedListQuery } from '#/utils';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

import { useColumns, useGridFormSchema } from './data';

const router = useRouter();

/**
 * 海运出口分组字段配置。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，
 * 也是与之互斥的搜索表单字段名（付费方式无对应搜索项，启用时不影响搜索表单）。
 */
const SEA_EXPORT_GROUP_FIELDS: GroupFieldDef[] = [
  { value: 1, label: '装运方式', paramKey: 'BLType' },
  { value: 2, label: '订单类型', paramKey: 'BillType' },
  { value: 3, label: '委托单位', paramKey: 'ClientId' },
  { value: 4, label: '船公司', paramKey: 'CarrierId' },
  { value: 5, label: '起运港', paramKey: 'POLId' },
  { value: 6, label: '目的港', paramKey: 'PODId' },
  { value: 7, label: '船名', paramKey: 'Vessel' },
  { value: 8, label: '付费方式', paramKey: 'CodeFrtId' },
  { value: 9, label: '签单方式', paramKey: 'CodeIssueTypeId' },
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
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
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
    radioConfig: {
      highlight: true,
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

const getSelectedRow = (): SeaExportAdminApi.SeaExportDto | undefined => {
  const grid = gridApi.grid as any;
  return grid?.getRadioRecord?.() ?? undefined;
};

const handleCreate = () => {
  router.push('/sea-exports/create');
};

const handleEdit = () => {
  const row = getSelectedRow();
  if (!row) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }
  router.push(`/sea-exports/${row.id}/edit`);
};

const handleDelete = () => {
  const row = getSelectedRow();
  if (!row) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const name =
    row.transportOrder?.commissionNum ||
    row.transportOrder?.mblNum ||
    `${row.id}`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('seaExport.export.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [name]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [name]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await deleteSeaExport(row.id);
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [name]),
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const handleRefresh = () => {
  gridApi.query();
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
        <Button class="mr-2" danger @click="handleDelete">
          {{ $t('common.delete') }}
        </Button>
        <Button class="mr-2" @click="handleEdit">
          {{ $t('common.edit') }}
        </Button>
        <Button class="mr-2" type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('seaExport.export.name')]) }}
        </Button>
        <GroupingSettings
          :fields="grouping.fields"
          :value="grouping.enabledField.value?.value"
          @change="onGroupFieldChange"
        />
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
  </Page>
</template>

<style scoped>
:deep(.sea-export-keyword-input input::placeholder) {
  font-size: 12px;
}
</style>
