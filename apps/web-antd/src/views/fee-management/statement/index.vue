<script lang="ts" setup>
import type { StatementAdminApi } from '#/api/settlement-management/statement-admin';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteStatement,
  getStatementPagedList,
} from '#/api/settlement-management/statement-admin';
import { $t } from '#/locales';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';

const router = useRouter();

/** 当前页表格数据，用于底部合计统计 */
const currentPageData = ref<StatementAdminApi.StatementDto[]>([]);

/** 按币种汇总当前页的应收/应付合计金额（含发票/结算已占用额度） */
const currencyTotals = computed(() => {
  const map = new Map<
    string,
    {
      currencyCode: string;
      payAmount: number;
      receiveAmount: number;
      receiveInvoiceOccupiedAmount: number;
      payInvoiceOccupiedAmount: number;
      receiveSettlementOccupiedAmount: number;
      paySettlementOccupiedAmount: number;
    }
  >();
  currentPageData.value.forEach((row) => {
    row.statementCurrencyGroup?.forEach((group) => {
      const code = group.currency?.code || '未知';
      const item = map.get(code) ?? {
        currencyCode: code,
        payAmount: 0,
        receiveAmount: 0,
        receiveInvoiceOccupiedAmount: 0,
        payInvoiceOccupiedAmount: 0,
        receiveSettlementOccupiedAmount: 0,
        paySettlementOccupiedAmount: 0,
      };
      item.receiveAmount += Number(group.receiveAmount) || 0;
      item.payAmount += Number(group.payAmount) || 0;
      // 占用合计：收/付按费用自身 paySide 拆分，后端已算好，此处仅跨对账单累加
      item.receiveInvoiceOccupiedAmount +=
        Number(group.receiveInvoiceOccupiedAmount) || 0;
      item.payInvoiceOccupiedAmount +=
        Number(group.payInvoiceOccupiedAmount) || 0;
      item.receiveSettlementOccupiedAmount +=
        Number(group.receiveSettlementOccupiedAmount) || 0;
      item.paySettlementOccupiedAmount +=
        Number(group.paySettlementOccupiedAmount) || 0;
      map.set(code, item);
    });
  });
  return Array.from(map.values());
});

/** 金额格式化：千分位 + 两位小数 */
const formatAmount = (value: number) =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * 底部合计扁平项（对齐开票申请列表：
 * 「标签: 着色金额」，每两组后用分隔符）。
 */
const summaryItems = computed(() => {
  const list: Array<{ color: string; name: string; value: string }> = [];
  currencyTotals.value.forEach((item) => {
    const code = item.currencyCode;
    list.push(
      {
        color: 'receive',
        name: `${code}应收:`,
        value: formatAmount(item.receiveAmount),
      },
      {
        color: 'pay',
        name: `${code}应付:`,
        value: formatAmount(item.payAmount),
      },
      {
        color: 'occupied',
        name: `${code}发票占用收:`,
        value: formatAmount(item.receiveInvoiceOccupiedAmount),
      },
      {
        color: 'occupied',
        name: `${code}发票占用付:`,
        value: formatAmount(item.payInvoiceOccupiedAmount),
      },
      {
        color: 'occupied',
        name: `${code}结算占用收:`,
        value: formatAmount(item.receiveSettlementOccupiedAmount),
      },
      {
        color: 'occupied',
        name: `${code}结算占用付:`,
        value: formatAmount(item.paySettlementOccupiedAmount),
      },
    );
  });
  return list;
});

const handleRowDblclick = ({
  row,
}: {
  row: StatementAdminApi.StatementDto;
}) => {
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  router.push(`/fee-management/statement/${row.id}/edit`);
};

const [Grid, gridApi] = useVbenVxeGrid<StatementAdminApi.StatementDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: true,
    collapsed: true,
    compact: true,
    wrapperClass: 'grid-cols-5',
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
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
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getStatementPagedList, {
          defaultSort: 'CreationTime DESC',
          afterFetch: (result: any) => {
            // 拦截当前页数据，驱动底部合计统计
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
});

const getSelectedRows = (): StatementAdminApi.StatementDto[] | undefined => {
  const grid = gridApi.grid as any;
  return grid?.getCheckboxRecords?.() ?? undefined;
};

const handleCreate = () => {
  router.push('/fee-management/statement/add');
};

const handleDelete = () => {
  const rows = getSelectedRows();
  if (!rows || rows.length === 0) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const name = rows[0]?.client?.name ?? `${rows[0]?.id}`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [
      $t('seaExport.export.statement.title'),
    ]),
    content: $t('seaExport.export.statement.deleteConfirm', [name]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('seaExport.export.statement.deleting', [name]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await deleteStatement({
          ids: rows.map((r) => r.id),
        });
        message.success({
          content: $t('seaExport.export.statement.deleteSuccess', [name]),
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const handleRefresh = () => {
  gridApi.query();
};

useRefreshListOnFormReturn('StatementList', handleRefresh);
</script>

<template>
  <Page auto-content-height content-class="flex flex-col">
    <Grid
      class="min-h-0 flex-1"
      :table-title="$t('seaExport.export.statement.list')"
    >
      <template #toolbar-tools>
        <Button class="mr-2" type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create') }}
        </Button>

        <Button danger @click="handleDelete">
          {{ $t('common.delete') }}
        </Button>
      </template>

      <!-- 我司银行列自定义渲染 -->
      <template #orgBankAccount="{ row }">
        <span v-if="row.orgBankAccount">
          {{ row.orgBankAccount.bankShortName }} -
          {{ row.orgBankAccount.accountName }}
        </span>
        <span v-else>-</span>
      </template>
    </Grid>

    <!-- 合计放在内容区内：Page 的 p-4 形成相对页面左右与底部的外边距 -->
    <div v-if="summaryItems.length > 0" class="statement-footer-summary">
      <div
        v-for="(item, index) in summaryItems"
        :key="`${item.name}-${index}`"
        class="statement-footer-summary__pair"
      >
        <span class="statement-footer-summary__name">{{ item.name }}</span>
        <span
          class="statement-footer-summary__value"
          :class="`statement-footer-summary__value--${item.color}`"
        >
          {{ item.value }}
        </span>
        <span
          v-show="(index + 1) % 2 === 0 && index < summaryItems.length - 1"
          class="statement-footer-summary__split"
        >
          |
        </span>
      </div>
    </div>
    <div
      v-else
      class="statement-footer-summary statement-footer-summary--empty"
    >
      <span class="statement-footer-summary__name">当页合计：</span>
      <span class="statement-footer-summary__empty-text">暂无数据</span>
    </div>
  </Page>
</template>

<style scoped>
/* 内容区内合计：相对页面的外边距由 Page p-4 提供，自身仅与表格留间距 */
.statement-footer-summary {
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
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 6%) 0%,
    hsl(var(--background)) 55%,
    hsl(var(--primary) / 6%) 100%
  );
  border: 1px solid #e8ecf3;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
}

.statement-footer-summary--empty {
  color: #94a3b8;
}

.statement-footer-summary__pair {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-right: 12px;
}

.statement-footer-summary__name {
  flex-shrink: 0;
}

.statement-footer-summary__value {
  font-weight: 600;
}

.statement-footer-summary__value--receive {
  color: #00a862;
}

.statement-footer-summary__value--pay {
  color: #f59e0b;
}

.statement-footer-summary__value--occupied {
  color: #1890ff;
}

.statement-footer-summary__split {
  margin: 0 4px;
  color: #d9dee8;
}

.statement-footer-summary__empty-text {
  color: #94a3b8;
}
</style>
