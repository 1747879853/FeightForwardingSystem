<script lang="ts" setup>
import type { AnnouncementAdminApi } from '#/api/system/announcement-admin';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteAnnouncement,
  getAnnouncementPagedList,
} from '#/api/system/announcement-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const actionLoading = ref(false);
const isModalOpen = ref(false);
/** 屏蔽表格双击打开弹窗（确定按钮点击穿透） */
const BLOCK_ROW_DBLCLICK_MS = 800;
let suppressRowDblClickUntil = 0;

function blockRowDblClick() {
  suppressRowDblClickUntil = Date.now() + BLOCK_ROW_DBLCLICK_MS;
}

function canOpenRowEdit() {
  return !isModalOpen.value && Date.now() >= suppressRowDblClickUntil;
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
  onOpenChange(isOpen) {
    isModalOpen.value = isOpen;
    if (!isOpen) {
      blockRowDblClick();
    }
  },
});

const handleCreate = () => {
  if (!canOpenRowEdit()) {
    return;
  }
  formModalApi.setData(null).open();
};

const handleEdit = (row: AnnouncementAdminApi.AnnouncementDto) => {
  if (!canOpenRowEdit()) {
    return;
  }
  formModalApi.setData({ id: row.id }).open();
};

function onFormConfirmStart() {
  blockRowDblClick();
}

function onFormSuccess() {
  blockRowDblClick();
  window.setTimeout(() => {
    handleRefresh();
  }, 350);
}

const [Grid, gridApi] = useVbenVxeGrid<AnnouncementAdminApi.AnnouncementDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    checkboxConfig: {
      highlight: true,
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getAnnouncementPagedList, {
          defaultSort: 'SortId ASC, CreationTime DESC',
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
      if (!canOpenRowEdit()) {
        return;
      }
      if (row?.id) {
        handleEdit(row);
      }
    },
  },
});

function getSelectedRows(): AnnouncementAdminApi.AnnouncementDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as AnnouncementAdminApi.AnnouncementDto[];
}

const handleRefresh = () => {
  gridApi.query();
};

const handleBatchDelete = () => {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning($t('system.announcement.selectBeforeDelete'));
    return;
  }

  Modal.confirm({
    title: $t('system.announcement.batchDeleteTitle'),
    content: $t('system.announcement.batchDeleteConfirm', [rows.length]),
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        await Promise.all(rows.map((row) => deleteAnnouncement(row.id)));
        message.success($t('system.announcement.batchDeleteSuccess'));
        handleRefresh();
      } finally {
        actionLoading.value = false;
      }
    },
  });
};
</script>

<template>
  <Page auto-content-height>
    <FormModal @confirm-start="onFormConfirmStart" @success="onFormSuccess" />
    <Grid :table-title="$t('system.announcement.list')">
      <template #toolbar-tools>
        <Button
          class="mr-2"
          danger
          :loading="actionLoading"
          @click="handleBatchDelete"
        >
          {{ $t('system.announcement.batchDelete') }}
        </Button>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.announcement.name')]) }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
