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
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.export.statement.list')">
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

    <!-- 表格下方：当前页按币种的应收/应付合计 -->
    <template #footer>
      <div v-if="currencyTotals.length > 0" class="statement-footer-summary">
        <span class="statement-footer-summary__label">当页合计：</span>
        <div class="statement-footer-summary__list">
          <div
            v-for="item in currencyTotals"
            :key="item.currencyCode"
            class="statement-footer-summary__item"
          >
            <span class="statement-footer-summary__currency">
              {{ item.currencyCode }}
            </span>
            <span class="statement-footer-summary__cell">
              <span class="statement-footer-summary__cell-label">应收</span>
              <span class="statement-footer-summary__receive">
                {{ formatAmount(item.receiveAmount) }}
              </span>
            </span>
            <span class="statement-footer-summary__cell">
              <span class="statement-footer-summary__cell-label">应付</span>
              <span class="statement-footer-summary__pay">
                {{ formatAmount(item.payAmount) }}
              </span>
            </span>
            <span class="statement-footer-summary__cell">
              <span class="statement-footer-summary__cell-label"
                >发票占用收</span
              >
              <span class="statement-footer-summary__invoice-occupied">
                {{ formatAmount(item.receiveInvoiceOccupiedAmount) }}
              </span>
            </span>
            <span class="statement-footer-summary__cell">
              <span class="statement-footer-summary__cell-label"
                >发票占用付</span
              >
              <span class="statement-footer-summary__invoice-occupied">
                {{ formatAmount(item.payInvoiceOccupiedAmount) }}
              </span>
            </span>
            <span class="statement-footer-summary__cell">
              <span class="statement-footer-summary__cell-label"
                >结算占用收</span
              >
              <span class="statement-footer-summary__settlement-occupied">
                {{ formatAmount(item.receiveSettlementOccupiedAmount) }}
              </span>
            </span>
            <span class="statement-footer-summary__cell">
              <span class="statement-footer-summary__cell-label"
                >结算占用付</span
              >
              <span class="statement-footer-summary__settlement-occupied">
                {{ formatAmount(item.paySettlementOccupiedAmount) }}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div
        v-else
        class="statement-footer-summary statement-footer-summary--empty"
      >
        <span class="statement-footer-summary__label">当页合计：</span>
        <span class="text-muted-foreground">暂无数据</span>
      </div>
    </template>
  </Page>
</template>

<style scoped>
.statement-footer-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  width: 100%;
  font-size: 13px;
}

.statement-footer-summary--empty {
  color: rgb(0 0 0 / 45%);
}

.statement-footer-summary__label {
  font-weight: 600;
  color: rgb(0 0 0 / 85%);
}

.statement-footer-summary__list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.statement-footer-summary__item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
  background: rgb(24 144 255 / 6%);
  border: 1px solid rgb(24 144 255 / 20%);
  border-radius: 4px;
}

.statement-footer-summary__currency {
  padding-right: 8px;
  font-weight: 600;
  color: #1890ff;
  border-right: 1px solid rgb(24 144 255 / 20%);
}

.statement-footer-summary__cell {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.statement-footer-summary__cell-label {
  color: rgb(0 0 0 / 45%);
}

.statement-footer-summary__receive {
  font-weight: 600;
  color: #cf1322;
}

.statement-footer-summary__pay {
  font-weight: 600;
  color: #389e0d;
}

.statement-footer-summary__invoice-occupied {
  font-weight: 600;
  color: #722ed1;
}

.statement-footer-summary__settlement-occupied {
  font-weight: 600;
  color: #13c2c2;
}
</style>
