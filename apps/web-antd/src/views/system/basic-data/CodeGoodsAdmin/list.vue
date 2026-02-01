<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { CodeGoodsAdminApi } from '#/api/system/base-data/code-goods-admin';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCodeGoods,
  getCodeGoodsPagedList,
} from '#/api/system/base-data/code-goods-admin';
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

const handleEdit = (row: CodeGoodsAdminApi.CodeGoodsDto) => {
  formDrawerApi.setData({ id: row.id }).open();
};

const handleDelete = async (row: CodeGoodsAdminApi.CodeGoodsDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name || row.code]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteCodeGoods(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [row.name || row.code]),
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
}: OnActionClickParams<CodeGoodsAdminApi.CodeGoodsDto>) => {
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

const [Grid, gridApi] = useVbenVxeGrid<CodeGoodsAdminApi.CodeGoodsDto>({
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
          return await getCodeGoodsPagedList({
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
    <Grid :table-title="$t('system.basicData.codeGoods.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [$t('system.basicData.codeGoods.name')])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
