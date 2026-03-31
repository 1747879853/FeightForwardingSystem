<script lang="ts" setup>
import type { FeeLockAdminApi } from '#/api/sea-export/fee-lock-admin';

import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  feeLockAsync,
  feeUnLockAsync,
  getFeeLockPagedList as getFeeLockPagedListApi,
} from '#/api/sea-export/fee-lock-admin';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';

import {
  type FeeLockTreeRow,
  useFeeLockColumns,
  useFeeLockGridFormSchema,
} from './fee-lock-data';

const perm = createAbpPermission('Admin.OrderFee.Lock');

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
  const [accountDateStart, accountDateEnd] = getRangeValue(
    formValues.AccountDateRange,
  );
  const [etdStart, etdEnd] = getRangeValue(formValues.BizDateRange);

  return {
    ...formValues,
    AccountDateStart: toIsoString(accountDateStart),
    AccountDateEnd: toIsoString(accountDateEnd),
    ETDStart: toIsoString(etdStart),
    ETDEnd: toIsoString(etdEnd),
    AccountDateRange: undefined,
    BizDateRange: undefined,
  };
};

const buildTreeRows = (
  items: FeeLockAdminApi.TransportOrderFeeLockDto[] = [],
): FeeLockTreeRow[] => {
  return items.map((item) => {
    const transportOrderId = item.id;
    return {
      id: `order-${transportOrderId}`,
      rowType: 'order',
      transportOrderId,
      bizType: item.bizType,
      commissionNum: item.commissionNum,
      mblNum: item.mblNum,
      bookingNum: item.bookingNum,
      clientName: item.clientName,
      accountDate: item.accountDate,
      etd: item.etd,
      feeLocked: item.feeLocked,
      feeLockedTime: item.feeLockedTime,
      feeUnLockedTime: item.feeUnLockedTime,
      remark: item.remark,
      children: (item.changeOrders ?? []).map((changeOrder) => ({
        id: `change-${transportOrderId}-${changeOrder.id}`,
        rowType: 'change',
        transportOrderId,
        changeOrderId: changeOrder.id,
        bizType: item.bizType,
        commissionNum: item.commissionNum,
        mblNum: item.mblNum,
        bookingNum: item.bookingNum,
        clientName: item.clientName,
        accountDate: changeOrder.accountDate ?? item.accountDate,
        etd: item.etd,
        feeLocked: changeOrder.feeLocked,
        feeLockedTime: changeOrder.feeLockedTime,
        feeUnLockedTime: changeOrder.feeUnLockedTime,
        reason: changeOrder.reason,
        remark: changeOrder.remark,
      })),
    };
  });
};

const [Grid, gridApi] = useVbenVxeGrid<FeeLockTreeRow>({
  formOptions: {
    schema: useFeeLockGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: true,
    collapsed: true,
    compact: true,
    wrapperClass: 'grid-cols-4',
  },
  gridOptions: {
    columns: useFeeLockColumns(),
    height: 'auto',
    keepSource: true,
    rowConfig: {
      keyField: 'id',
    },
    checkboxConfig: {
      checkStrictly: true,
      highlight: true,
      trigger: 'row',
    },
    treeConfig: {
      rowField: 'id',
      transform: false,
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
          const result = await getFeeLockPagedListApi({
            PageIndex: page.currentPage,
            PageSize: page.pageSize,
            ...normalizeQuery(formValues),
          });

          return {
            ...result,
            items: buildTreeRows(result.items ?? []),
          };
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
});

const getSelectedItems = (): FeeLockAdminApi.TransportOrderFeeLockItem[] => {
  const records = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as FeeLockTreeRow[];
  const unique = new Map<string, FeeLockAdminApi.TransportOrderFeeLockItem>();

  records.forEach((record) => {
    const key = `${record.transportOrderId}-${record.changeOrderId ?? 0}`;
    if (!unique.has(key)) {
      unique.set(key, {
        transportOrderId: record.transportOrderId,
        changeOrderId: record.changeOrderId,
      });
    }
  });

  return [...unique.values()];
};

const executeBatchAction = async (lock: boolean) => {
  const selectedItems = getSelectedItems();
  if (selectedItems.length === 0) {
    message.warning($t('seaExport.export.feeLock.pleaseSelectRecords'));
    return;
  }

  const title = lock
    ? $t('seaExport.export.feeLock.batchLock')
    : $t('seaExport.export.feeLock.batchUnlock');
  const processingContent = lock
    ? $t('seaExport.export.feeLock.locking')
    : $t('seaExport.export.feeLock.unlocking');
  const successContent = lock
    ? $t('seaExport.export.feeLock.lockSuccess')
    : $t('seaExport.export.feeLock.unlockSuccess');

  Modal.confirm({
    title,
    content: $t('seaExport.export.feeLock.batchActionConfirm', [
      selectedItems.length,
    ]),
    async onOk() {
      const hideLoading = message.loading({
        content: processingContent,
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        const payload = { items: selectedItems };
        if (lock) {
          await feeLockAsync(payload);
        } else {
          await feeUnLockAsync(payload);
        }
        message.success({
          content: successContent,
          key: 'action_process_msg',
        });
        gridApi.query();
      } catch {
        hideLoading();
      }
    },
  });
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.export.feeLock.list')">
      <template #toolbar-tools>
        <Button
          v-access:code="perm.edit"
          class="mr-2"
          @click="executeBatchAction(false)"
        >
          {{ $t('seaExport.export.feeLock.batchUnlock') }}
        </Button>
        <Button
          v-access:code="perm.edit"
          type="primary"
          @click="executeBatchAction(true)"
        >
          {{ $t('seaExport.export.feeLock.batchLock') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
