<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SeServiceConfigAdminApi } from '#/api/system/base-data/se-service-config-admin';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSeServiceConfig,
  getSeServiceConfigPagedList,
} from '#/api/system/base-data/se-service-config-admin';
import { $t } from '#/locales';
import {
  loadSeServiceTypeOptions,
  type SelectOption,
  useColumns,
  useGridFormSchema,
} from './data';
import Form from './modules/form.vue';

const serviceTypeOptions = ref<SelectOption[]>([]);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formModalApi
    .setData({
      serviceTypeOptions: serviceTypeOptions.value,
    })
    .open();
};

const handleEdit = (row: SeServiceConfigAdminApi.SeServiceConfigListDto) => {
  formModalApi
    .setData({
      id: row.id,
      serviceTypeOptions: serviceTypeOptions.value,
      polId: row.polId,
      polPortName: row.pol?.portName,
      polCnName: row.pol?.cnName,
    })
    .open();
};

const getRowName = (row: SeServiceConfigAdminApi.SeServiceConfigListDto) => {
  return row.pol?.cnName || row.pol?.portName || row.id;
};

const handleDelete = async (
  row: SeServiceConfigAdminApi.SeServiceConfigListDto,
) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [getRowName(row)]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteSeServiceConfig({ ids: [row.id] });
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
}: OnActionClickParams<SeServiceConfigAdminApi.SeServiceConfigListDto>) => {
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
  useVbenVxeGrid<SeServiceConfigAdminApi.SeServiceConfigListDto>({
    formOptions: {
      schema: useGridFormSchema(serviceTypeOptions.value),
      submitOnChange: true,
      showCollapseButton: false,
    },
    gridOptions: {
      columns: useColumns(serviceTypeOptions.value, handleActionClick),
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
            const result = await getSeServiceConfigPagedList({
              pageIndex: page.currentPage,
              pageSize: page.pageSize,
              ...formValues,
            });
            return result;
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

const loadServiceTypeOptions = async () => {
  const options = await loadSeServiceTypeOptions();
  serviceTypeOptions.value.splice(
    0,
    serviceTypeOptions.value.length,
    ...options,
  );

  gridApi.setGridOptions({
    columns: useColumns(serviceTypeOptions.value, handleActionClick),
  });
  gridApi.setFormOptions({
    schema: useGridFormSchema(serviceTypeOptions.value),
  });
  gridApi.query();
};

const handleRefresh = () => {
  gridApi.query();
};

onMounted(async () => {
  await loadServiceTypeOptions();
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid :table-title="$t('system.basicData.seServiceConfig.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [
              $t('system.basicData.seServiceConfig.name'),
            ])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
