<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { GenerateNumAdminApi } from '#/api/system/base-data/generate-num-admin';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteGenerateNum,
  getGenerateNumPagedList,
} from '#/api/system/base-data/generate-num-admin';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema, getTableNameLabel } from './data';
import Form from './modules/form.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formModalApi.setData(null).open();
};

const handleEdit = (row: GenerateNumAdminApi.GenerateNumDto) => {
  formModalApi.setData({ id: row.id }).open();
};

const getRowDisplayName = (row: GenerateNumAdminApi.GenerateNumDto) =>
  getTableNameLabel(row.tableName) || row.name || String(row.id);

const handleDelete = async (row: GenerateNumAdminApi.GenerateNumDto) => {
  const displayName = getRowDisplayName(row);
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [displayName]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteGenerateNum(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [displayName]),
      key: 'action_process_msg',
    });
    handleRefresh();
  } catch {
    hideLoading();
  }
};

const handleActionClick = ({
  code,
  row,
}: OnActionClickParams<GenerateNumAdminApi.GenerateNumDto>) => {
  switch (code) {
    case 'delete': {
      handleDelete(row);
      break;
    }
    case 'edit': {
      handleEdit(row);
      break;
    }
  }
};

const [Grid, gridApi] = useVbenVxeGrid<GenerateNumAdminApi.GenerateNumDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useColumns(handleActionClick),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          const skipCount = (page.currentPage - 1) * page.pageSize;
          const result = await getGenerateNumPagedList({
            skipCount,
            maxResultCount: page.pageSize,
            ...formValues,
          });
          return {
            ...result,
            items: (result.items ?? []).map((item) => ({
              ...item,
              tableNameDisplay:
                getTableNameLabel(item.tableName) || item.tableName,
            })),
          };
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

const handleRefresh = () => {
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid :table-title="$t('system.basicData.generateNum.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [
              $t('system.basicData.generateNum.tableName'),
            ])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
