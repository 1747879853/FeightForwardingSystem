<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { AirPortAdminApi } from '#/api/system/base-data/air-port-admin';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteAirPort,
  getAirPortAdminPagedList,
} from '#/api/system/base-data/air-port-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formModalApi.setData(null).open();
};

const handleEdit = (row: AirPortAdminApi.AirPortDto) => {
  formModalApi.setData({ id: row.id }).open();
};

const getRowName = (row: AirPortAdminApi.AirPortDto) => {
  return row.cnName || row.enName || row.iataCode || `${row.id}`;
};

const handleDelete = async (row: AirPortAdminApi.AirPortDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [getRowName(row)]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteAirPort(row.id);
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
}: OnActionClickParams<AirPortAdminApi.AirPortDto>) => {
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

const [Grid, gridApi] = useVbenVxeGrid<AirPortAdminApi.AirPortDto>({
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
        query: createPagedListQuery(getAirPortAdminPagedList),
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
    <Grid :table-title="$t('system.basicData.airPort.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [$t('system.basicData.airPort.name')])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
