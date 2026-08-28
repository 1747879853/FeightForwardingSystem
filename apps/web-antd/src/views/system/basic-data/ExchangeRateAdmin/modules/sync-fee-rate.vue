<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { ExchangeRateAdminApi } from '#/api/system/base-data/exchange-rate-admin';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Alert,
  Button,
  Input,
  Modal,
  Spin,
  Table,
  message,
} from 'ant-design-vue';

import { ClientSelect } from '#/adapter/component/biz-select';
import {
  getSyncOrderFeeRateList,
  syncOrderFeeRate,
} from '#/api/system/base-data/exchange-rate-admin';
import { $t } from '#/locales';

type SyncTicketDto = ExchangeRateAdminApi.ExchangeRateSyncTicketDto;

const emit = defineEmits<{ success: [] }>();

const rateInfo = ref<ExchangeRateAdminApi.ExchangeRateDto>();
const mblNum = ref<string>();
const clientId = ref<number | string>();
const queried = ref(false);
const loading = ref(false);
const syncableTickets = ref<SyncTicketDto[]>([]);
const blockedTickets = ref<SyncTicketDto[]>([]);
const selectedRowKeys = ref<string[]>([]);

// 最近一次成功查询的筛选参数；执行时须与查询一致传回后端重新校验
const lastQuery = ref<{ clientId?: string; mblNum?: string }>({});

/** 票行唯一键：主单原票与更改单可能同属一个主单 */
const ticketKey = (ticket: SyncTicketDto) =>
  `${ticket.transportOrderId}_${ticket.changeOrderId ?? ''}`;

const rateTitle = computed(() => {
  const rate = rateInfo.value;
  if (!rate) return '';
  const currency = rate.currency?.code || rate.currency?.cnName || '';
  return [currency, rate.startDate?.slice(0, 10), rate.endDate?.slice(0, 10)]
    .filter(Boolean)
    .join(' / ');
});

/** 会计期间文案：月初日期只显示到月 */
const formatMonth = (value?: null | string): string => {
  if (!value) return '-';
  const text = String(value);
  return text.length >= 7 ? text.slice(0, 7) : text;
};

const getTicketTypeLabel = (ticket: SyncTicketDto): string =>
  ticket.changeOrderId
    ? $t('system.basicData.exchangeRate.changeOrder')
    : $t('system.basicData.exchangeRate.originalTicket');

const buildTicketColumns = (
  blocked: boolean,
): TableColumnsType<SyncTicketDto> => {
  const columns: TableColumnsType<SyncTicketDto> = [
    {
      title: $t('system.basicData.exchangeRate.ticketType'),
      key: 'ticketType',
      width: 90,
      customRender: ({ record }) => getTicketTypeLabel(record as SyncTicketDto),
    },
    {
      title: $t('system.basicData.exchangeRate.accountDate'),
      dataIndex: 'accountDate',
      key: 'accountDate',
      width: 100,
      customRender: ({ text }) => formatMonth(text as null | string),
    },
    {
      title: $t('system.basicData.exchangeRate.mblNum'),
      key: 'mblNum',
      width: 140,
      customRender: ({ record }) =>
        (record as SyncTicketDto).transportOrder?.mblNum ?? '-',
    },
    {
      title: $t('system.basicData.exchangeRate.commissionNum'),
      key: 'commissionNum',
      width: 120,
      customRender: ({ record }) =>
        (record as SyncTicketDto).transportOrder?.commissionNum ?? '-',
    },
    {
      title: $t('system.basicData.exchangeRate.clientId'),
      key: 'clientName',
      width: 150,
      customRender: ({ record }) =>
        (record as SyncTicketDto).transportOrder?.clientName ?? '-',
    },
    {
      title: $t('system.basicData.exchangeRate.receivableFeeCount'),
      dataIndex: 'receivableFeeCount',
      key: 'receivableFeeCount',
      align: 'center',
      width: 110,
    },
    {
      title: $t('system.basicData.exchangeRate.payableFeeCount'),
      dataIndex: 'payableFeeCount',
      key: 'payableFeeCount',
      align: 'center',
      width: 110,
    },
  ];
  if (blocked) {
    columns.push({
      title: $t('system.basicData.exchangeRate.blockedReason'),
      dataIndex: 'blockedReason',
      key: 'blockedReason',
      width: 180,
    });
  }
  return columns;
};

const syncableColumns = buildTicketColumns(false);
const blockedColumns = buildTicketColumns(true);

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    await handleSync();
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    rateInfo.value = drawerApi.getData<ExchangeRateAdminApi.ExchangeRateDto>();
    // 每次打开重置筛选与结果
    mblNum.value = undefined;
    clientId.value = undefined;
    queried.value = false;
    syncableTickets.value = [];
    blockedTickets.value = [];
    selectedRowKeys.value = [];
    lastQuery.value = {};
  },
});

/** 查询可同步的票：由用户显式触发，不自动查询 */
const handleQuery = async () => {
  const id = rateInfo.value?.id;
  if (id === undefined || id === null || id === '') return;
  loading.value = true;
  selectedRowKeys.value = [];
  try {
    const params = {
      Id: id,
      MblNum: mblNum.value?.trim() || undefined,
      ClientId: clientId.value ? String(clientId.value) : undefined,
    };
    const res = await getSyncOrderFeeRateList(params);
    syncableTickets.value = res?.syncableTickets ?? [];
    blockedTickets.value = res?.blockedTickets ?? [];
    lastQuery.value = { clientId: params.ClientId, mblNum: params.MblNum };
    queried.value = true;
  } catch {
    syncableTickets.value = [];
    blockedTickets.value = [];
    queried.value = false;
  } finally {
    loading.value = false;
  }
};

/** 执行同步：把筛选参数原样带回，后端重新校验后取交集执行 */
const handleSync = async () => {
  const id = rateInfo.value?.id;
  if (id === undefined || id === null || id === '' || !queried.value) return;
  if (selectedRowKeys.value.length === 0) {
    message.warning($t('system.basicData.exchangeRate.selectTicketFirst'));
    return;
  }
  const selected = syncableTickets.value.filter((ticket) =>
    selectedRowKeys.value.includes(ticketKey(ticket)),
  );
  Modal.confirm({
    title: $t('system.basicData.exchangeRate.syncConfirmTitle'),
    content: $t('system.basicData.exchangeRate.syncConfirm', [selected.length]),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onOk: async () => {
      drawerApi.lock();
      try {
        const result = await syncOrderFeeRate({
          id,
          mblNum: lastQuery.value.mblNum,
          clientId: lastQuery.value.clientId,
          tickets: selected.map((ticket) => ({
            transportOrderId: ticket.transportOrderId,
            changeOrderId: ticket.changeOrderId ?? undefined,
          })),
        });
        message.success(
          $t('system.basicData.exchangeRate.syncSuccess', [
            result.ticketCount,
            result.receivableFeeCount,
            result.payableFeeCount,
          ]),
        );
        drawerApi.close();
        emit('success');
      } finally {
        drawerApi.lock(false);
      }
    },
  });
};

const onSelectChange = (keys: (number | string)[]) => {
  selectedRowKeys.value = keys.map((key) => String(key));
};
</script>

<template>
  <Drawer
    class="w-[900px]"
    :title="$t('system.basicData.exchangeRate.syncFeeRateTitle')"
    :confirm-text="$t('system.basicData.exchangeRate.executeSync')"
  >
    <div class="flex flex-col gap-3 px-4">
      <Alert
        type="info"
        show-icon
        :message="$t('system.basicData.exchangeRate.syncTip')"
      />

      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-gray-500">
          {{ $t('system.basicData.exchangeRate.name') }}：
        </span>
        <span>{{ rateTitle || '-' }}</span>
        <span class="ml-4 text-gray-500">
          {{ $t('system.basicData.exchangeRate.drValue') }}：
        </span>
        <span>{{ rateInfo?.drValue ?? '-' }}</span>
        <span class="ml-4 text-gray-500">
          {{ $t('system.basicData.exchangeRate.crValue') }}：
        </span>
        <span>{{ rateInfo?.crValue ?? '-' }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Input
          v-model:value="mblNum"
          class="!w-52"
          allow-clear
          :placeholder="$t('system.basicData.exchangeRate.mblNum')"
          @press-enter="handleQuery"
        />
        <ClientSelect
          v-model:value="clientId"
          class="!w-60"
          allow-clear
          :placeholder="$t('system.basicData.exchangeRate.clientId')"
        />
        <Button type="primary" :loading="loading" @click="handleQuery">
          {{ $t('common.query') }}
        </Button>
      </div>

      <Spin :spinning="loading">
        <template v-if="queried">
          <div class="mb-1 font-medium">
            {{
              $t('system.basicData.exchangeRate.syncableTickets', [
                syncableTickets.length,
              ])
            }}
            <span class="ml-2 text-xs font-normal text-gray-400">
              {{
                $t('system.basicData.exchangeRate.selectedCount', [
                  selectedRowKeys.length,
                ])
              }}
            </span>
          </div>
          <Table
            :columns="syncableColumns"
            :data-source="syncableTickets"
            :pagination="false"
            :row-key="(row: SyncTicketDto) => ticketKey(row)"
            :row-selection="{
              selectedRowKeys,
              onChange: onSelectChange,
            }"
            :scroll="{ y: 320 }"
            size="small"
          />

          <template v-if="blockedTickets.length > 0">
            <div class="mb-1 mt-3 font-medium">
              {{
                $t('system.basicData.exchangeRate.blockedTickets', [
                  blockedTickets.length,
                ])
              }}
            </div>
            <Table
              :columns="blockedColumns"
              :data-source="blockedTickets"
              :pagination="false"
              :row-key="(row: SyncTicketDto) => ticketKey(row)"
              :row-class-name="() => 'sync-blocked-row'"
              :scroll="{ y: 200 }"
              size="small"
            />
          </template>
        </template>
      </Spin>
    </div>
  </Drawer>
</template>

<style scoped>
:deep(.sync-blocked-row) td {
  opacity: 0.55;
}
</style>
