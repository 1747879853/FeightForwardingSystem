<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Button, message, Modal, Tag } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { useFieldPermission } from '#/composables/use-field-permission';
import { invoiceIssueFieldPermission } from '#/composables/field-permission-profiles';
import {
  deleteInvoiceIssue,
  getInvoiceIssuePagedList,
} from '#/api/Invoice/InvoiceIssue';

import { columns, searchFormSchema } from './data';

const { usePermissionGrid: useVbenVxeGrid } = useFieldPermission(
  invoiceIssueFieldPermission,
);

const router = useRouter();

// 选中的行
const selectedRows = ref<any[]>([]);

/** 同步选中行（单行勾选与全选/取消全选均触发） */
const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid as any)?.getCheckboxRecords?.() ?? [];
};

/** 处理行双击事件 */
function handleRowDblClick({ row }: any) {
  handleEdit(row);
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: searchFormSchema,
    collapsed: true,
    submitOnChange: true,
    showCollapseButton: true,
    wrapperClass: 'grid-cols-6',
  },
  gridOptions: {
    columns,
    height: 'auto',
    // 分页改大时只绘制视口内行列，避免整表插槽一次挂载
    virtualXConfig: { enabled: true, gt: 0 },
    virtualYConfig: { enabled: true, gt: 0 },
    // 拖宽一列时固定其余列宽，避免自适应模式挤压邻列（TAPD #1001037）
    resizableConfig: {
      dragMode: 'fixed',
      minWidth: 0,
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          const result = await getInvoiceIssuePagedList({
            ...formValues,
            pageIndex: page.currentPage,
            pageSize: page.pageSize,
          });
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
      // 虚拟滚动按这个高度算总高；不写会用约 21px，滚不到后面的行
      height: 40,
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
    // 单行勾选触发 checkbox-change；表头全选/取消全选只触发 checkbox-all，需同时监听
    checkboxChange: syncSelectedRows,
    checkboxAll: syncSelectedRows,
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
    // 使用批量删除接口，传入单个ID的数组
    await deleteInvoiceIssue([row.id]);
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

  // ✅ 检查是否有被锁定的记录
  const lockedItems = selectedRows.value.filter((row) => row.editLocked);
  if (lockedItems.length > 0) {
    const lockedNos = lockedItems.map((item) => item.applicationNo).join('；');
    message.error(`选中的以下发票开出已锁定，无法删除：${lockedNos}`);
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedRows.value.length} 条数据吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 使用批量删除接口，一次性传入所有ID
        await deleteInvoiceIssue(selectedRows.value.map((row) => row.id));
        message.success('批量删除成功');
        const grid = gridApi.grid as any;
        grid?.clearCheckboxRow?.();
        syncSelectedRows();
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

/** 获取锁定状态的 Tag 配置 */
function getLockedTag(locked: boolean | undefined | null) {
  if (locked) {
    return { text: '是', color: 'error' };
  }
  return { text: '否', color: 'success' };
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

      <template #editLocked="{ row }">
        <Tag :color="getLockedTag(row.editLocked).color">
          {{ getLockedTag(row.editLocked).text }}
        </Tag>
      </template>

      <template #redLocked="{ row }">
        <Tag :color="getLockedTag(row.redLocked).color">
          {{ getLockedTag(row.redLocked).text }}
        </Tag>
      </template>

      <template #actions="{ row }">
        <a-space>
          <a-button type="link" size="small" @click="handleView(row)">
            查看
          </a-button>
          <a-button
            type="link"
            size="small"
            @click="handleEdit(row)"
            :disabled="row.editLocked"
          >
            编辑
          </a-button>
          <a-popconfirm
            title="确定要删除吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete(row)"
          >
            <a-button
              type="link"
              size="small"
              danger
              :disabled="row.editLocked"
            >
              删除
            </a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </Grid>
  </Page>
</template>
