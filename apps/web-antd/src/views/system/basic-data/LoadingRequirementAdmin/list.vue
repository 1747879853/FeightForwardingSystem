<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { LoadingRequirementAdminApi } from '#/api/system/base-data/loading-requirement-admin';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteLoadingRequirement,
  getLoadingRequirementPagedList,
} from '#/api/system/base-data/loading-requirement-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formDrawerApi.setData(null).open();
};

const handleEdit = (row: LoadingRequirementAdminApi.LoadingRequirementDto) => {
  formDrawerApi.setData({ id: row.id }).open();
};

const handleDelete = async (
  row: LoadingRequirementAdminApi.LoadingRequirementDto,
) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteLoadingRequirement(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [row.name]),
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
}: OnActionClickParams<LoadingRequirementAdminApi.LoadingRequirementDto>) => {
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

const [Grid, gridApi] =
  useVbenVxeGrid<LoadingRequirementAdminApi.LoadingRequirementDto>({
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
          // 主表排序由前端维护，默认按 SortId 升序，不同于其它基础资料的创建时间倒序
          query: createPagedListQuery(getLoadingRequirementPagedList, {
            defaultSort: 'SortId ASC',
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

const handleRefresh = () => {
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="handleRefresh" />
    <Grid :table-title="$t('system.basicData.loadingRequirement.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [
              $t('system.basicData.loadingRequirement.name'),
            ])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
