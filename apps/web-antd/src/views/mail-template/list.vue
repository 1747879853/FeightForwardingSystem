<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { MailTemplateAdminApi } from '#/api/mail-template/mail-template-admin';

import { onMounted, shallowRef } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteMailTemplates,
  getMailTemplateModuleOptions,
  getMailTemplatePagedList,
} from '#/api/mail-template/mail-template-admin';
import { getEnumItems } from '#/utils/init-enum';
import { createAbpPermission } from '#/utils/abp-permission';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { mapMailTemplateQuery, useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'MailTemplateList' });

const perm = createAbpPermission('Admin.MailTemplate');
const { hasAccessByCodes } = useAccess();
const canEdit = hasAccessByCodes([perm.edit]);
const canDelete = hasAccessByCodes([perm.delete]);

const moduleOptions = shallowRef<MailTemplateAdminApi.ModuleOption[]>([]);
const serviceOptions = shallowRef<Array<{ label: string; value: number }>>([]);

const moduleName = (value?: null | number) => {
  if (value === null || value === undefined) {
    return '';
  }
  return (
    moduleOptions.value.find((item) => item.frightModule === value)
      ?.frightModuleName || String(value)
  );
};

const serviceName = (value?: null | number) => {
  if (value === null || value === undefined) {
    return '通用';
  }
  return (
    serviceOptions.value.find((item) => item.value === value)?.label ||
    String(value)
  );
};

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function openCreate() {
  formModalApi
    .setData({
      moduleOptions: moduleOptions.value,
      serviceOptions: serviceOptions.value,
    })
    .open();
}

function openEdit(row: MailTemplateAdminApi.MailTemplateDto) {
  formModalApi
    .setData({
      id: row.id,
      moduleOptions: moduleOptions.value,
      serviceOptions: serviceOptions.value,
    })
    .open();
}

async function removeRows(rows: MailTemplateAdminApi.MailTemplateDto[]) {
  const ids = rows.map((row) => row.id).filter(Boolean);
  if (ids.length === 0) {
    return;
  }
  await deleteMailTemplates(ids);
  message.success('删除成功');
  gridApi.query();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<MailTemplateAdminApi.MailTemplateDto>) {
  if (code === 'edit') {
    openEdit(row);
    return;
  }
  if (code === 'delete') {
    void removeRows([row]);
  }
}

const [Grid, gridApi] = useVbenVxeGrid<MailTemplateAdminApi.MailTemplateDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useColumns({
      canDelete,
      canEdit,
      moduleName,
      onActionClick,
      serviceName,
    }),
    height: 'auto',
    rowConfig: {
      keyField: 'id',
      height: 40,
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getMailTemplatePagedList, {
          mapParams: mapMailTemplateQuery,
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
  gridEvents: {
    cellDblclick: ({ row }) => {
      if (canEdit && row?.id) {
        openEdit(row);
      }
    },
  },
});

function selectedRows() {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as MailTemplateAdminApi.MailTemplateDto[];
}

function onBatchDelete() {
  const rows = selectedRows();
  if (rows.length === 0) {
    message.warning('请选择要删除的邮件模板');
    return;
  }
  Modal.confirm({
    title: '删除邮件模板',
    content: `确定删除选中的 ${rows.length} 条模板？有一条不存在时整批都不会删除。`,
    okType: 'danger',
    onOk: () => removeRows(rows),
  });
}

onMounted(async () => {
  const [modules, services] = await Promise.all([
    getMailTemplateModuleOptions(),
    getEnumItems('ServiceType', false),
  ]);
  moduleOptions.value = modules ?? [];
  serviceOptions.value = (services ?? [])
    .filter((item) => item.enable !== false)
    .map((item) => ({
      label: item.displayName || String(item.value),
      value: item.value,
    }));
  await gridApi.query();
  gridApi.formApi.updateSchema([
    {
      fieldName: 'frightModule',
      componentProps: {
        allowClear: true,
        placeholder: '请选择',
        options: moduleOptions.value.map((item) => ({
          label: item.frightModuleName || String(item.frightModule),
          value: item.frightModule,
        })),
      },
    },
    {
      fieldName: 'serviceType',
      componentProps: {
        allowClear: true,
        placeholder: '请选择',
        options: serviceOptions.value,
      },
    },
  ]);
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="gridApi.query()" />
    <Grid table-title="邮件模板">
      <template #toolbar-tools>
        <Button
          v-access:code="perm.delete"
          class="mr-2"
          danger
          @click="onBatchDelete"
        >
          删除
        </Button>
        <Button v-access:code="perm.add" type="primary" @click="openCreate">
          <Plus class="size-5" />
          新增邮件模板
        </Button>
      </template>
    </Grid>
  </Page>
</template>
