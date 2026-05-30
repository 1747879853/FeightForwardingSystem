<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSeaExport,
  getSeaExportPagedList,
} from '#/api/sea-export/sea-export-admin';
import { $t } from '#/locales';
import { buildAttachmentUrl } from '#/utils';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

import { useColumns, useGridFormSchema } from './data';

const router = useRouter();

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

const normalizeQuery = (
  formValues: Record<string, unknown>,
): SeaExportAdminApi.GetPagedListParams => {
  const { ETDRange, CloseDocTimeRange, ...rest } = formValues;
  const [etdStart, etdEnd] = getRangeValue(ETDRange);
  const [closeDocTimeStart, closeDocTimeEnd] = getRangeValue(CloseDocTimeRange);

  return {
    ...rest,
    ETDStart: toIsoString(etdStart),
    ETDEnd: toIsoString(etdEnd),
    CloseDocTimeStart: toIsoString(closeDocTimeStart),
    CloseDocTimeEnd: toIsoString(closeDocTimeEnd),
  };
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
    wrapperClass: 'grid-cols-6',
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
  },
  gridOptions: {
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
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          const query = normalizeQuery(formValues);
          return await getSeaExportPagedList({
            PageIndex: page.currentPage,
            PageSize: page.pageSize,
            ...query,
          });
        },
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

useRefreshListOnFormReturn('SeaExportList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.export.list')">
      <template #toolbar-tools>
        <Button class="mr-2" danger @click="handleDelete">
          {{ $t('common.delete') }}
        </Button>
        <Button class="mr-2" @click="handleEdit">
          {{ $t('common.edit') }}
        </Button>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('seaExport.export.name')]) }}
        </Button>
      </template>
      <template #carrierWithLogo="{ row }">
        <span class="inline-flex items-center gap-1">
          <img
            v-if="row?.carrierLogo?.url"
            :src="buildAttachmentUrl(row.carrierLogo.url)"
            :alt="row?.carrierName || 'carrier-logo'"
            class="h-8 w-8 rounded object-contain"
          />
          <span>{{ row?.carrierName || '--' }}</span>
        </span>
      </template>
    </Grid>
  </Page>
</template>
