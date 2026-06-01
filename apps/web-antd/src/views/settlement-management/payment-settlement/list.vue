<script lang="ts" setup>
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deletePaymentSettlement,
  getPaymentSettlementPagedList,
  lockPaymentSettlement,
  unlockPaymentSettlement,
} from '#/api/sea-export/payment-settlement-admin';

import { useColumns, useGridFormSchema } from './data';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

const router = useRouter();
const actionLoading = ref(false);

/** 格式化日期时间到分钟 */
const formatDateTime = (value: string | undefined) => {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
};

/** 获取结算状态标签颜色 */
const getStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    0: 'default',
    1: 'processing',
    2: 'error',
    3: 'success',
    4: 'warning',
    5: 'success',
  };
  return colorMap[status] || 'default';
};

/** 获取结算状态文本 */
const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    0: '录入中',
    1: '审核中',
    2: '已驳回',
    3: '审核通过',
    4: '部分结算',
    5: '已结算',
  };
  return textMap[status] || '未知';
};

/** 获取付款方式文本 */
const getPayTypeText = (payType: number | undefined) => {
  if (payType === undefined || payType === null) return '-';
  const typeMap: Record<number, string> = {
    1: '现金',
    2: '支票',
    3: '电汇',
    4: '其他',
  };
  return typeMap[payType] || '-';
};

/** 将时间范围转换为起止时间 */
const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

const normalizeQuery = (formValues: Record<string, unknown>) => {
  const [settlementTimeStart, settlementTimeEnd] = getRangeValue(
    formValues.settlementTimeRange,
  );

  return {
    ...formValues,
    settlementTimeStart: toIsoString(settlementTimeStart),
    settlementTimeEnd: toIsoString(settlementTimeEnd),
    settlementTimeRange: undefined,
  };
};

const [Grid, gridApi] =
  useVbenVxeGrid<PaymentSettlementAdminApi.PaymentSettlementListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-4',
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
        isHover: true, // 启用行悬停效果
      },

      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: async (
            { page }: { page: { currentPage: number; pageSize: number } },
            formValues: Record<string, unknown>,
          ) => {
            return await getPaymentSettlementPagedList({
              pageIndex: page.currentPage,
              pageSize: page.pageSize,
              ...normalizeQuery(formValues),
            });
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
    gridEvents: {
      cellDblclick: handleRowDblClick,
    },
  });

function getSelectedRows(): PaymentSettlementAdminApi.PaymentSettlementListDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as PaymentSettlementAdminApi.PaymentSettlementListDto[];
}

/** 双击行进入编辑页面 */
function handleRowDblClick({
  row,
}: {
  row: PaymentSettlementAdminApi.PaymentSettlementListDto;
}) {
  if (!row) {
    console.warn('双击事件未获取到行数据');
    return;
  }

  if (row.locked) {
    message.warning('该结算单已锁定，无法编辑');
    return;
  }
  router.push(`/settlement-management/payment-settlement/edit/${row.id}`);
}

/** 删除 */
async function handleDelete(
  row: PaymentSettlementAdminApi.PaymentSettlementListDto,
) {
  if (row.locked) {
    message.warning('该结算单已锁定，无法删除');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除结算单"${row.settlementNo}"吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        await deletePaymentSettlement({ id: row.id });
        message.success('删除成功');
        gridApi.query();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 批量删除 */
function handleBatchDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }

  const lockedItems = rows.filter((r) => r.locked);
  if (lockedItems.length > 0) {
    message.warning('选中的记录中有已锁定的结算单，无法删除');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条结算单吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        await Promise.all(
          rows.map((r) => deletePaymentSettlement({ id: r.id })),
        );
        message.success('删除成功');
        gridApi.query();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 锁定 */
async function handleLock(
  row: PaymentSettlementAdminApi.PaymentSettlementListDto,
) {
  if (row.locked) {
    message.warning('该结算单已锁定');
    return;
  }

  Modal.confirm({
    title: '确认锁定',
    content: `确定要锁定结算单"${row.settlementNo}"吗？锁定后将无法编辑和删除。`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await lockPaymentSettlement({ id: row.id });
        message.success('锁定成功');
        gridApi.query();
      } catch (error: any) {
        message.error(error.message || '锁定失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 解锁 */
async function handleUnlock(
  row: PaymentSettlementAdminApi.PaymentSettlementListDto,
) {
  if (!row.locked) {
    message.warning('该结算单未锁定');
    return;
  }

  Modal.confirm({
    title: '确认解锁',
    content: `确定要解锁结算单"${row.settlementNo}"吗？`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await unlockPaymentSettlement({ id: row.id });
        message.success('解锁成功');
        gridApi.query();
      } catch (error: any) {
        message.error(error.message || '解锁失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 新建 */
function handleCreate() {
  router.push('/settlement-management/payment-settlement/add');
}

function handleRefresh() {
  gridApi.query();
}

useRefreshListOnFormReturn('PaymentSettlementList', handleRefresh);

/** 导出 */
function handleExport() {
  // TODO: 实现导出功能
  message.info('导出功能待实现');
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="付费结算列表">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleCreate"> 新建 </Button>
          <Button @click="handleBatchDelete" :loading="actionLoading">
            批量删除
          </Button>
          <Button @click="handleExport"> 导出 </Button>
        </Space>
      </template>

      <template #status="{ row }">
        <Tag :color="getStatusColor(row.status)">
          {{ getStatusText(row.status) }}
        </Tag>
      </template>

      <template #payType="{ row }">
        {{ getPayTypeText(row.payType) }}
      </template>

      <template #locked="{ row }">
        <Tag :color="row.locked ? 'red' : 'green'">
          {{ row.locked ? '已锁定' : '未锁定' }}
        </Tag>
      </template>
    </Grid>
  </Page>
</template>
