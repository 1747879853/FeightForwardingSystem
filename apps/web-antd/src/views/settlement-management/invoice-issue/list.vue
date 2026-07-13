<script lang="ts" setup>
import { h, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Button, message, Modal, Space, Input } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteInvoiceIssue,
  getInvoiceIssuePagedList,
  InvoiceIssueApi,
} from '#/api/Invoice/InvoiceIssue';
import { $t } from '#/locales';

import { columns, searchFormSchema } from './data';

const router = useRouter();

// 选中的行
const selectedRows = ref<any[]>([]);

/** 处理行双击事件 */
function handleRowDblClick({ row }: any) {
  handleEdit(row);
}

/** 处理复选框选择变化 */
function handleCheckboxChange({ records }: any) {
  selectedRows.value = records;
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: searchFormSchema,
  },
  gridOptions: {
    columns,
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          const params = {
            ...formValues,
            pageIndex: page.currentPage,
            pageSize: page.pageSize,
          };

          const result = await getInvoiceIssuePagedList(params);
          return {
            items: result.items,
            total: result.totalCount,
          };
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
      resizable: true,
      search: true,
      zoom: true,
    },
  },
  gridEvents: {
    cellDblclick: handleRowDblClick,
    checkboxChange: handleCheckboxChange,
  },
});

/** 新增 */
function handleAdd() {
  router.push('/settlement-management/invoice-issue/add');
}

/** 编辑 */
function handleEdit(row: any) {
  router.push(`/settlement-management/invoice-issue/${row.id}/edit`);
}

/** 删除 */
async function handleDelete(row: any) {
  try {
    await deleteInvoiceIssue(row.id);
    message.success('删除成功');
    gridApi.query();
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
}

/** 批量删除 */
async function handleBatchDelete() {
  if (!selectedRows.value || selectedRows.value.length === 0) {
    message.warning('请至少选择一条数据');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedRows.value.length} 条数据吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 逐个删除选中的记录
        for (const row of selectedRows.value) {
          await deleteInvoiceIssue(row.id);
        }
        message.success('批量删除成功');
        selectedRows.value = [];
        gridApi.query();
      } catch (error) {
        console.error('批量删除失败:', error);
        message.error('批量删除失败');
      }
    },
  });
}

/** 查看详情 */
function handleView(row: any) {
  router.push(`/settlement-management/invoice-issue/${row.id}/edit`);
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="发票开出列表">
      <template #toolbar-tools>
        <Button type="primary" @click="handleAdd"> 新建 </Button>
        <Button danger @click="handleBatchDelete" style="margin-left: 8px">
          <IconifyIcon
            icon="ant-design:delete-outlined"
            style="margin-right: 4px"
          />
          批量删除
        </Button>
      </template>

      <template #clientInvoiceInfoHeader="{ row }">
        {{ row.clientInvoiceInfo?.header || '-' }}
      </template>
      <template #clientInvoiceInfoTaxNum="{ row }">
        {{ row.clientInvoiceInfo?.taxNum || '-' }}
      </template>

      <template #actions="{ row }">
        <a-space>
          <a-button type="link" size="small" @click="handleView(row)">
            查看
          </a-button>
          <a-button type="link" size="small" @click="handleEdit(row)">
            编辑
          </a-button>
          <a-popconfirm
            title="确定要删除吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete(row)"
          >
            <a-button type="link" size="small" danger> 删除 </a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </Grid>
  </Page>
</template>
