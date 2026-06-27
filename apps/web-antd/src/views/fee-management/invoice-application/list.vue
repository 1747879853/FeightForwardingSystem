<script lang="ts" setup>
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';

import { ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Input } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';

const router = useRouter();
const actionLoading = ref(false);
const rejectReasonVisible = ref(false);
const currentRejectId = ref<string>('');
const rejectReasonValue = ref<string>('');

// 从命名空间中解构 API 函数
const {
  deleteAsync: deleteInvoiceApplication,
  auditAsync,
  submitAsync,
  withdrawAsync,
  getPagedListAsync,
} = InvoiceApplicationApi;

/** 处理新建 */
function handleCreate() {
  router.push('/fee-management/invoice-application/add');
}

/** 处理编辑 */
function handleEdit(row: InvoiceApplicationApi.InvoiceApplicationListDto) {
  // 只有录入和驳回状态可以编辑
  if (
    row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Entering &&
    row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
  ) {
    message.warning('只有录入或驳回状态的申请可以编辑');
    return;
  }
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  router.push(`/fee-management/invoice-application/${row.id}/edit`);
}

/** 处理查看详情 */
function handleViewDetail(
  row: InvoiceApplicationApi.InvoiceApplicationListDto,
) {
  // TODO: 后续实现详情页面
  message.info('详情功能待实现');
}

/** 处理提交审核 */
function handleSubmit(row: InvoiceApplicationApi.InvoiceApplicationListDto) {
  // 只有录入和驳回状态可以提交
  if (
    row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Entering &&
    row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
  ) {
    message.warning('只有录入或驳回状态的申请可以提交审核');
    return;
  }
  Modal.confirm({
    title: '确认提交',
    content: `确定要提交申请单 "${row.applicationNo}" 进行审核吗？`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await submitAsync({ id: row.id });
        message.success('提交成功');
        handleRefresh();
      } catch (error) {
        console.error('提交失败:', error);
        message.error('提交失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 处理撤回审核 */
function handleWithdraw(row: InvoiceApplicationApi.InvoiceApplicationListDto) {
  // 只有待审核状态可以撤回
  if (row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Auditing) {
    message.warning('只有待审核状态的申请可以撤回');
    return;
  }
  Modal.confirm({
    title: '确认撤回',
    content: `确定要撤回申请单 "${row.applicationNo}" 吗？`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await withdrawAsync({ id: row.id });
        message.success('撤回成功');
        handleRefresh();
      } catch (error) {
        console.error('撤回失败:', error);
        message.error('撤回失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 处理审核驳回 */
function handleAudit(row: InvoiceApplicationApi.InvoiceApplicationListDto) {
  // 只有待审核状态可以驳回
  if (row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Auditing) {
    message.warning('只有待审核状态的申请可以驳回');
    return;
  }
  currentRejectId.value = row.id;
  rejectReasonValue.value = '';
  rejectReasonVisible.value = true;
}

/** 确认驳回 */
async function handleConfirmReject() {
  if (!rejectReasonValue.value.trim()) {
    message.warning('请输入驳回原因');
    return;
  }
  actionLoading.value = true;
  try {
    await auditAsync({
      id: currentRejectId.value,
      rejectReason: rejectReasonValue.value,
    });
    message.success('驳回成功');
    rejectReasonVisible.value = false;
    handleRefresh();
  } catch (error) {
    console.error('驳回失败:', error);
    message.error('驳回失败');
  } finally {
    actionLoading.value = false;
  }
}

/** 取消驳回 */
function handleCancelReject() {
  rejectReasonVisible.value = false;
  rejectReasonValue.value = '';
  currentRejectId.value = '';
}

/** 双击行处理 */
const handleRowDblclick = ({
  row,
}: {
  row: InvoiceApplicationApi.InvoiceApplicationListDto;
}) => {
  handleEdit(row);
};

/** 转换日期为 ISO 字符串 */
const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

/** 获取范围值 */
const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

/** 标准化查询参数 */
const normalizeQuery = (formValues: Record<string, unknown>) => {
  const [applyTimeStart, applyTimeEnd] = getRangeValue(
    formValues.applyTimeRange,
  );

  return {
    ...formValues,
    applyTimeStart: toIsoString(applyTimeStart),
    applyTimeEnd: toIsoString(applyTimeEnd),
    applyTimeRange: undefined,
  };
};

/** 初始化表格 */
const [Grid, gridApi] =
  useVbenVxeGrid<InvoiceApplicationApi.InvoiceApplicationListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-4',
    },
    gridEvents: {
      cellDblclick: handleRowDblclick,
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
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(getPagedListAsync, {
            mapParams: normalizeQuery,
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
  });

/** 获取选中的行 */
function getSelectedRows(): InvoiceApplicationApi.InvoiceApplicationListDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as InvoiceApplicationApi.InvoiceApplicationListDto[];
}

/** 批量删除 */
function handleBatchDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }

  // 检查是否有已开票状态的记录
  const invoicedRows = rows.filter(
    (row) =>
      row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Invoiced,
  );
  if (invoicedRows.length > 0) {
    message.warning('已开票状态的申请不能删除');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条开票申请记录吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        // 注意：后端接口只支持单个删除，需要循环调用
        for (const row of rows) {
          await deleteInvoiceApplication({ id: row.id });
        }
        message.success('删除成功');
        handleRefresh();
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 批量提交审核 */
function handleBatchSubmit() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要提交的记录');
    return;
  }

  // 过滤出可以提交的记录（录入或驳回状态）
  const canSubmitRows = rows.filter(
    (row) =>
      row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Entering ||
      row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Rejected,
  );

  if (canSubmitRows.length === 0) {
    message.warning('选中的记录中没有可以提交的申请');
    return;
  }

  if (canSubmitRows.length < rows.length) {
    message.warning(
      `选中的 ${rows.length} 条记录中，只有 ${canSubmitRows.length} 条可以提交`,
    );
  }

  Modal.confirm({
    title: '确认提交',
    content: `确定要提交选中的 ${canSubmitRows.length} 条开票申请进行审核吗？`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        for (const row of canSubmitRows) {
          await submitAsync({ id: row.id });
        }
        message.success('提交成功');
        handleRefresh();
      } catch (error) {
        console.error('提交失败:', error);
        message.error('提交失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 刷新列表 */
function handleRefresh() {
  gridApi.query();
}

useRefreshListOnFormReturn('InvoiceApplicationList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="开票申请列表">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleCreate"> 新建 </Button>
          <Button @click="handleBatchSubmit"> 批量提交 </Button>
          <Button danger :loading="actionLoading" @click="handleBatchDelete">
            删除
          </Button>
        </Space>
      </template>
      <template #action="{ row }">
        <Space>
          <Button
            v-if="
              row.status ===
                InvoiceApplicationApi.InvoiceApplicationStatus.Entering ||
              row.status ===
                InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
            "
            type="link"
            size="small"
            @click.stop="handleEdit(row)"
          >
            编辑
          </Button>
          <Button
            v-if="
              row.status ===
                InvoiceApplicationApi.InvoiceApplicationStatus.Entering ||
              row.status ===
                InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
            "
            type="link"
            size="small"
            @click.stop="handleSubmit(row)"
          >
            提交
          </Button>
          <Button
            v-if="
              row.status ===
              InvoiceApplicationApi.InvoiceApplicationStatus.Auditing
            "
            type="link"
            size="small"
            @click.stop="handleWithdraw(row)"
          >
            撤回
          </Button>
          <Button
            v-if="
              row.status ===
              InvoiceApplicationApi.InvoiceApplicationStatus.Auditing
            "
            type="link"
            size="small"
            danger
            @click.stop="handleAudit(row)"
          >
            驳回
          </Button>
        </Space>
      </template>
    </Grid>

    <!-- 驳回原因对话框 -->
    <Modal
      v-model:open="rejectReasonVisible"
      title="驳回原因"
      :confirm-loading="actionLoading"
      @ok="handleConfirmReject"
      @cancel="handleCancelReject"
    >
      <Input.TextArea
        v-model:value="rejectReasonValue"
        placeholder="请输入驳回原因"
        :rows="4"
        :maxlength="500"
        show-count
      />
    </Modal>
  </Page>
</template>
