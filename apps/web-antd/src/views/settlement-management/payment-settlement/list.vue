<script lang="ts" setup>
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { computed, ref } from 'vue';
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
import { normalizeKeysParam } from '#/utils/keys-search';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';

const router = useRouter();
const actionLoading = ref(false);

/** 当前页表格数据，用于底部按结算币别合计 */
const currentPageData = ref<
  PaymentSettlementAdminApi.PaymentSettlementListDto[]
>([]);

/** 按结算币别汇总当前页的结算金额合计（totalSettledPrice 已是结算币别金额） */
const currencyTotals = computed(() => {
  const map = new Map<
    string,
    { currencyCode: string; settledAmount: number }
  >();
  currentPageData.value.forEach((row) => {
    const code = row.currency?.code || '未知';
    const item = map.get(code) ?? { currencyCode: code, settledAmount: 0 };
    item.settledAmount += Number(row.totalSettledPrice) || 0;
    map.set(code, item);
  });
  // 币别按代码排序，翻页时合计胶囊顺序不跳动
  return [...map.values()].sort((a, b) =>
    a.currencyCode.localeCompare(b.currencyCode),
  );
});

/** 金额格式化：千分位 + 两位小数（与开票申请列表合计样式一致） */
const formatAmount = (value: number) =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
    // Keys 精确搜索：去空白去重后作为 List<string>（repeat 序列化）
    keys: normalizeKeysParam(formValues.keys),
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
      wrapperClass: 'grid-cols-6',
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
          query: createPagedListQuery(getPaymentSettlementPagedList, {
            mapParams: normalizeQuery,
            afterFetch: (result: any) => {
              // 拦截当前页数据，驱动底部按币别合计
              currentPageData.value = result?.items ?? [];
              return result;
            },
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

    <!-- 表格下方：当前页按结算币别的结算金额合计（样式参考开票申请列表） -->
    <template #footer>
      <div
        v-if="currencyTotals.length > 0"
        class="payment-settlement-footer-summary"
      >
        <span class="payment-settlement-footer-summary__label">当页合计：</span>
        <div class="payment-settlement-footer-summary__list">
          <div
            v-for="item in currencyTotals"
            :key="item.currencyCode"
            class="payment-settlement-footer-summary__item"
          >
            <span class="payment-settlement-footer-summary__currency">
              {{ item.currencyCode }}
            </span>
            <span class="payment-settlement-footer-summary__cell">
              <span class="payment-settlement-footer-summary__cell-label">
                结算金额
              </span>
              <span class="payment-settlement-footer-summary__settled">
                {{ formatAmount(item.settledAmount) }}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div
        v-else
        class="payment-settlement-footer-summary payment-settlement-footer-summary--empty"
      >
        <span class="payment-settlement-footer-summary__label">当页合计：</span>
        <span class="text-muted-foreground">暂无数据</span>
      </div>
    </template>
  </Page>
</template>

<style scoped>
/* 表格下方：当页按币别合计（样式与开票申请列表合计保持一致） */
.payment-settlement-footer-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  width: 100%;

  /* Page 只在挂载时量一次 footer 高度，空/有数据两态保持等高，避免表格高度跳变 */
  min-height: 32px;
  font-size: 13px;
}

.payment-settlement-footer-summary--empty {
  color: rgb(0 0 0 / 45%);
}

.payment-settlement-footer-summary__label {
  font-weight: 600;
  color: rgb(0 0 0 / 85%);
}

.payment-settlement-footer-summary__list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.payment-settlement-footer-summary__item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
  background: rgb(24 144 255 / 6%);
  border: 1px solid rgb(24 144 255 / 20%);
  border-radius: 4px;
}

.payment-settlement-footer-summary__currency {
  padding-right: 8px;
  font-weight: 600;
  color: #1890ff;
  border-right: 1px solid rgb(24 144 255 / 20%);
}

.payment-settlement-footer-summary__cell {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.payment-settlement-footer-summary__cell-label {
  color: rgb(0 0 0 / 45%);
}

.payment-settlement-footer-summary__settled {
  font-weight: 600;
  color: #cf1322;
}
</style>
