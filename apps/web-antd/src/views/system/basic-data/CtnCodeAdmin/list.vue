<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { CtnCodeAdminApi } from '#/api/system/base-data/ctn-code-admin';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCtnCode,
  getCtnCodePagedList,
} from '#/api/system/base-data/ctn-code-admin';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formDrawerApi.setData(null).open();
};

const handleEdit = (row: CtnCodeAdminApi.CtnCodeDto) => {
  formDrawerApi.setData({ id: row.id }).open();
};

const getRowName = (row: CtnCodeAdminApi.CtnCodeDto) => {
  return row.ctnName || `${row.id}`;
};

const handleDelete = async (row: CtnCodeAdminApi.CtnCodeDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [getRowName(row)]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteCtnCode(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [getRowName(row)]),
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
}: OnActionClickParams<CtnCodeAdminApi.CtnCodeDto>) => {
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

const [Grid, gridApi] = useVbenVxeGrid<CtnCodeAdminApi.CtnCodeDto>({
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
          return await getCtnCodePagedList({
            PageIndex: page.currentPage,
            PageSize: page.pageSize,
            ...formValues,
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

const handleRefresh = () => {
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="handleRefresh" />
    <Grid :table-title="$t('system.basicData.ctnCode.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [$t('system.basicData.ctnCode.name')])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
