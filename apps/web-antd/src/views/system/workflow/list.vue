<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { WorkFlowAdminApi } from '#/api/system/workflow-admin';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteWorkFlow, getWorkFlowList } from '#/api/system/workflow-admin';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';

const router = useRouter();

function onActionClick(e: OnActionClickParams<WorkFlowAdminApi.WorkFlowDto>) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'edit': {
      onEdit(e.row);
      break;
    }
    default: {
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid<WorkFlowAdminApi.WorkFlowDto>({
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: false,
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown>,
        ) => {
          return await getWorkFlowList({
            pageIndex: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions,
});

function confirm(content: string, title: string) {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error('cancel'));
      },
      onOk() {
        resolve(true);
      },
      title,
    });
  });
}

function onEdit(row: WorkFlowAdminApi.WorkFlowDto) {
  router.push({ name: 'SystemWorkflowEdit', params: { id: row.id } });
}

function onCreate() {
  router.push({ name: 'SystemWorkflowCreate' });
}

async function onDelete(row: WorkFlowAdminApi.WorkFlowDto) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name || '']),
    duration: 0,
    key: 'workflow_delete',
  });
  deleteWorkFlow({ ids: [row.id] })
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name || '']),
        key: 'workflow_delete',
      });
      gridApi.query();
    })
    .catch(() => {
      hideLoading();
    });
}
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('system.workflow.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="onCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.workflow.name')]) }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
