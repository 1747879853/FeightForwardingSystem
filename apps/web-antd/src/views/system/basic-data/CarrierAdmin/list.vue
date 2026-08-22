<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCarrier,
  getCarrierPagedList,
} from '#/api/system/base-data/carrier-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { buildAttachmentUrl } from '#/utils';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formDrawerApi.setData(null).open();
};

const handleEdit = (row: CarrierAdminApi.CarrierDto) => {
  formDrawerApi.setData({ id: row.id }).open();
};

const handleDelete = async (row: CarrierAdminApi.CarrierDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.cnName || row.enName]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteCarrier(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [row.cnName || row.enName]),
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
}: OnActionClickParams<CarrierAdminApi.CarrierDto>) => {
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

const [Grid, gridApi] = useVbenVxeGrid<CarrierAdminApi.CarrierDto>({
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
        query: createPagedListQuery(getCarrierPagedList),
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
    <Grid :table-title="$t('system.basicData.carrier.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [$t('system.basicData.carrier.name')])
          }}
        </Button>
      </template>
      <template #logo="{ row }">
        <span class="flex w-full justify-center">
          <img
            v-if="row?.logo?.url"
            :src="buildAttachmentUrl(row.logo.url)"
            :alt="row?.cnName || row?.enName || 'carrier-logo'"
            class="h-8 w-8 rounded object-contain"
          />
          <span v-else>-</span>
        </span>
      </template>
    </Grid>
  </Page>
</template>
