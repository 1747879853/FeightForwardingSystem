<script lang="ts" setup>
import { h, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Button, message, Modal, Space, Input, Tag } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteInvoiceIssue,
  getInvoiceIssuePagedList,
  InvoiceIssueApi,
} from '#/api/Invoice/InvoiceIssue';
import { $t } from '#/locales';

import { columns, searchFormSchema } from './data';
import InvoiceDetailModal from './invoice-detail-modal.vue';

const router = useRouter();

// 选中的行
const selectedRows = ref<any[]>([]);

/** 同步选中行（单行勾选与全选/取消全选均触发） */
const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid as any)?.getCheckboxRecords?.() ?? [];
};

// 发票详情弹窗
const detailModalOpen = ref(false);
const detailModalData = ref<InvoiceIssueApi.InvoiceIssueListDto | null>(null);

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

/** 获取诺诺开票状态的 Tag 配置 */
function getIssueStatusTag(status: number | undefined | null) {
  if (status === undefined || status === null) {
    return { text: '-', color: 'default' };
  }

  const configMap: Record<number, { text: string; color: string }> = {
    0: { text: '待开票', color: 'default' },
    1: { text: '开票中', color: 'processing' },
    2: { text: '开票完成', color: 'success' },
    3: { text: '开票失败', color: 'error' },
  };

  return configMap[status] || { text: String(status), color: 'default' };
}

/** 获取红冲状态的 Tag 配置 */
function getRedStatusTag(status: number | undefined | null) {
  if (status === undefined || status === null) {
    return { text: '-', color: 'default' };
  }

  const configMap: Record<number, { text: string; color: string }> = {
    // 初始/本地状态
    0: { text: '未冲红', color: 'default' },

    // 进行中 / 待确认
    1: { text: '无需确认', color: 'processing' },
    2: { text: '待购方确认', color: 'processing' },
    3: { text: '待销方确认', color: 'processing' },
    15: { text: '申请中', color: 'processing' },

    // 成功 / 已确认
    4: { text: '双方已确认', color: 'success' },
    99: { text: '冲红完成', color: 'success' },

    // 失败 / 作废终态
    5: { text: '已作废(购方否认)', color: 'error' },
    6: { text: '已作废(销方否认)', color: 'error' },
    7: { text: '已作废(超时未确认)', color: 'error' },
    8: { text: '已作废(发起方撤销)', color: 'error' },
    9: { text: '已作废(确认后撤销)', color: 'error' },
    16: { text: '申请失败', color: 'error' },
  };

  return configMap[status] || { text: String(status), color: 'default' };
}

/** 获取锁定状态的 Tag 配置 */
function getLockedTag(locked: boolean | undefined | null) {
  if (locked) {
    return { text: '是', color: 'error' };
  }
  return { text: '否', color: 'success' };
}

/** 处理诺诺开票状态点击 */
function handleIssueStatusClick(row: any) {
  detailModalData.value = row;
  detailModalOpen.value = true;
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

      <template #issueStatus="{ row }">
        <Tag
          :color="getIssueStatusTag(row.issueStatus).color"
          class="status-clickable"
          @click.stop="handleIssueStatusClick(row)"
        >
          {{ getIssueStatusTag(row.issueStatus).text }}
        </Tag>
      </template>

      <template #redStatus="{ row }">
        <Tag :color="getRedStatusTag(row.redStatus).color">
          {{ getRedStatusTag(row.redStatus).text }}
        </Tag>
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

    <!-- 发票详情弹窗 -->
    <InvoiceDetailModal
      v-model:open="detailModalOpen"
      :invoice-data="detailModalData"
    />
  </Page>
</template>

<style scoped>
.status-clickable {
  cursor: pointer;
}

.status-clickable:hover {
  opacity: 0.85;
}
</style>
