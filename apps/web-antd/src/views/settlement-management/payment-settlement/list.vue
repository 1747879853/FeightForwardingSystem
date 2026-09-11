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

/**
 * 底部合计扁平项（对齐开票申请列表：
 * 「{币别}结算金额: 着色金额」，项间用分隔符）。
 */
const summaryItems = computed(() =>
  currencyTotals.value.map((item) => ({
    color: 'settled',
    name: `${item.currencyCode}结算金额:`,
    value: formatAmount(item.settledAmount),
  })),
);

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
      height: '100%',
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
  <Page auto-content-height content-class="flex flex-col">
    <Grid table-title="付费结算列表" class="min-h-0 flex-1">
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

    <!-- 合计放在内容区内：Page 的 p-4 形成相对页面左右与底部的外边距 -->
    <div
      v-if="summaryItems.length > 0"
      class="payment-settlement-footer-summary"
    >
      <div
        v-for="(item, index) in summaryItems"
        :key="`${item.name}-${index}`"
        class="payment-settlement-footer-summary__pair"
      >
        <span class="payment-settlement-footer-summary__name">{{
          item.name
        }}</span>
        <span
          class="payment-settlement-footer-summary__value"
          :class="`payment-settlement-footer-summary__value--${item.color}`"
        >
          {{ item.value }}
        </span>
        <span
          v-show="index < summaryItems.length - 1"
          class="payment-settlement-footer-summary__split"
        >
          |
        </span>
      </div>
    </div>
    <div
      v-else
      class="payment-settlement-footer-summary payment-settlement-footer-summary--empty"
    >
      <span class="payment-settlement-footer-summary__name">当页合计：</span>
      <span class="payment-settlement-footer-summary__empty-text"
        >暂无数据</span
      >
    </div>
  </Page>
</template>

<style scoped>
/* 内容区内合计：相对页面的外边距由 Page p-4 提供，自身仅与表格留间距 */
.payment-settlement-footer-summary {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0 4px;
  align-items: center;
  width: 100%;
  min-height: 40px;
  padding: 8px 16px;
  margin-top: 12px;
  font-size: 13px;
  color: #52607a;
  background: linear-gradient(90deg, #f7faff 0%, #fff 55%, #f7faff 100%);
  border: 1px solid #e8ecf3;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
}

.payment-settlement-footer-summary--empty {
  color: #94a3b8;
}

.payment-settlement-footer-summary__pair {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-right: 12px;
}

.payment-settlement-footer-summary__name {
  flex-shrink: 0;
}

.payment-settlement-footer-summary__value {
  font-weight: 600;
}

.payment-settlement-footer-summary__value--settled {
  color: #00a862;
}

.payment-settlement-footer-summary__split {
  margin: 0 4px;
  color: #d9dee8;
}

.payment-settlement-footer-summary__empty-text {
  color: #94a3b8;
}
</style>
