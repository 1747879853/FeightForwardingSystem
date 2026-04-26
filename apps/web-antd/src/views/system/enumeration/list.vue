<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteEnumeration,
  getEnumerationPagedList,
} from '#/api/system/enum-admin';
import { clearEnumCache } from '#/utils/init-enum';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Detail from './modules/detail.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [DetailModal, detailModalApi] = useVbenModal({
  connectedComponent: Detail,
  destroyOnClose: true,
});

function onActionClick(
  e: OnActionClickParams<EnumerationAdminApi.EnumerationListDto>,
) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'edit': {
      onEdit(e.row);
      break;
    }
    case 'view': {
      onView(e.row);
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid<EnumerationAdminApi.EnumerationListDto>({
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
          formValues: Record<string, any>,
        ) => {
          return await getEnumerationPagedList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    checkboxConfig: {
      reserve: true,
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: true,
    },
  },
});

/**
 * 将Antd的Modal.confirm封装为promise，方便在异步函数中调用。
 * @param content 提示内容
 * @param title 提示标题
 */
function confirm(content: string, title: string) {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error('已取消'));
      },
      onOk() {
        resolve(true);
      },
      title,
    });
  });
}

function onEdit(row: EnumerationAdminApi.EnumerationListDto) {
  formModalApi.setData(row).open();
}

function onView(row: EnumerationAdminApi.EnumerationListDto) {
  detailModalApi.setData(row).open();
}

function onDelete(row: EnumerationAdminApi.EnumerationListDto) {
  const enumName = row.name || '';
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [enumName]),
    duration: 0,
    key: 'action_process_msg',
  });
  deleteEnumeration(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [enumName]),
        key: 'action_process_msg',
      });
      // 清除枚举缓存
      clearEnumCache();
      onRefresh();
    })
    .catch(() => {
      hideLoading();
    });
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords();
  if (!rows || rows.length === 0) {
    message.warning($t('ui.actionMessage.pleaseSelectData'));
    return;
  }

  Modal.confirm({
    content: $t('ui.actionMessage.confirmDeleteSelected', [rows.length]),
    onOk: async () => {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting'),
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        // 批量删除
        for (const row of rows) {
          await deleteEnumeration(row.id);
        }
        message.success({
          content: $t('ui.actionMessage.deleteSuccess'),
          key: 'action_process_msg',
        });
        // 清除枚举缓存
        clearEnumCache();
        onRefresh();
      } catch {
        hideLoading();
      }
    },
    title: $t('common.tips'),
  });
}

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  formModalApi.setData({}).open();
}

/**
 * 表单操作成功后的回调（新增或编辑）
 */
function handleFormSuccess() {
  // 清除枚举缓存
  clearEnumCache();
  onRefresh();
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleFormSuccess" />
    <DetailModal />
    <Grid :table-title="$t('system.enumeration.list')">
      <template #toolbar-tools>
        <!-- 新增按钮 -->
        <Button
          v-access:code="'Admin'"
          type="primary"
          class="mr-1"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create') }}
        </Button>
        <!-- 批量删除按钮 -->
        <!-- <Button v-access:code="'Admin'" danger type="primary" @click="onBatchDelete">
          {{ $t('ui.actionTitle.batchDelete') }}
        </Button> -->
      </template>
    </Grid>
  </Page>
</template>
