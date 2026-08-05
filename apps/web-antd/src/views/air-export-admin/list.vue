<script lang="ts" setup>
import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';
import type { GroupFieldDef } from '#/components/list-grouping';

import { nextTick, onActivated, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Copy, LockKeyhole, LockKeyholeOpen, Plus } from '@vben/icons';

import dayjs from 'dayjs';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteAirExport,
  getAirExportGroupedList,
  getAirExportPagedList,
} from '#/api/air-export/air-export-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { $t } from '#/locales';
import { useTableConfigStore } from '#/store/table-config';
import { createPagedListQuery } from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

import {
  AIR_EXPORT_SORT_FIELD_MAP,
  useColumns,
  useGridFormSchema,
} from './data';
import { useAirExportCopy } from './use-air-export-copy';

const perm = createAbpPermission('Admin.AirExport');
const { copying, copyFrom } = useAirExportCopy();

const router = useRouter();
const tableConfigStore = useTableConfigStore();

/** 分组设置持久化 key（与列表 listKey 对齐，路由名 AirExportList） */
const GROUP_CONFIG_NAME = 'group_config_AirExportList';

const loadGroupField = async (): Promise<number | undefined> => {
  await tableConfigStore.loadGroupConfigsOnce();
  const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
  if (!hit?.setting) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(hit.setting) as { field?: null | number };
    return typeof parsed?.field === 'number' ? parsed.field : undefined;
  } catch {
    return undefined;
  }
};

const saveGroupField = (fieldValue: number | undefined) => {
  const setting = JSON.stringify({ field: fieldValue ?? null });
  const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
  if (hit) {
    void tableConfigStore.editGroupConfig({
      id: hit.id,
      name: GROUP_CONFIG_NAME,
      setting,
    });
  } else {
    void tableConfigStore.addGroupConfig({ name: GROUP_CONFIG_NAME, setting });
  }
};

/**
 * 空运出口分组字段配置。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，
 * 也是与之互斥的搜索表单字段名。分组值沿用后端 AirExportGroupField 枚举，
 * 与海运出口不通用（传船公司的 4 会直接报「不支持的分组字段」）。
 */
const AIR_EXPORT_GROUP_FIELDS: GroupFieldDef[] = [
  { value: 3, label: $t('airExport.export.clientId'), paramKey: 'ClientId' },
  {
    value: 5,
    label: $t('airExport.export.polId'),
    paramKey: 'POLId',
    emptyParamKey: 'POLIdEmpty',
  },
  {
    value: 16,
    label: $t('airExport.export.potId'),
    paramKey: 'POTId',
    emptyParamKey: 'POTIdEmpty',
  },
  {
    value: 6,
    label: $t('airExport.export.podId'),
    paramKey: 'PODId',
    emptyParamKey: 'PODIdEmpty',
  },
  {
    value: 15,
    label: $t('airExport.export.bookingAgentId'),
    paramKey: 'BookingAgentId',
    emptyParamKey: 'BookingAgentIdEmpty',
  },
  {
    value: 12,
    label: $t('airExport.export.warehouseId'),
    paramKey: 'WarehouseId',
  },
  { value: 13, label: $t('airExport.export.teamId'), paramKey: 'TeamId' },
  {
    value: 17,
    label: $t('airExport.export.insuranceId'),
    paramKey: 'InsuranceId',
  },
  {
    value: 18,
    label: $t('airExport.export.custBrokerId'),
    paramKey: 'CustBrokerId',
  },
];

const toIsoString = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = dayjs(value as Date | string);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const getRangeValue = (
  value: unknown,
): [undefined | unknown, undefined | unknown] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

/** 搜索表单里的日期区间字段 → 接口的 xxxStart / xxxEnd 入参 */
const DATE_RANGE_FIELDS = [
  ['ETDRange', 'ETDStart', 'ETDEnd'],
  ['ATDRange', 'ATDStart', 'ATDEnd'],
  ['ETARange', 'ETAStart', 'ETAEnd'],
  ['GoodsCompleteTimeRange', 'GoodsCompleteTimeStart', 'GoodsCompleteTimeEnd'],
  ['SettlementDateRange', 'SettlementDateStart', 'SettlementDateEnd'],
  ['CreationTimeRange', 'CreationTimeStart', 'CreationTimeEnd'],
] as const;

/**
 * 报关日期与送仓日期存的是带时分秒的时间戳，筛选是按时间点闭区间比较的。
 * 结束端必须补到当天 23:59:59，否则当天 15:30 的数据会被 00:00:00 的上界排除掉。
 */
const DATE_TIME_RANGE_FIELDS = [
  [
    'CustomsDeclareDateRange',
    'CustomsDeclareDateStart',
    'CustomsDeclareDateEnd',
  ],
  [
    'DeliveryWarehouseDateRange',
    'DeliveryWarehouseDateStart',
    'DeliveryWarehouseDateEnd',
  ],
] as const;

/**
 * 会计日期默认值是否已写入表单。
 * 用于兜底：在默认值写入前（如分组恢复抢先触发查询），仍按当月过滤；
 * 写入后则完全尊重表单值（允许用户清空或改月）。
 */
let accountDateDefaultApplied = false;

const normalizeQuery = (
  formValues: Record<string, unknown>,
): AirExportAdminApi.GetPagedListParams => {
  const rest: Record<string, unknown> = { ...formValues };
  const dateParams: Record<string, string | undefined> = {};
  for (const [rangeField, startKey, endKey] of DATE_RANGE_FIELDS) {
    const [start, end] = getRangeValue(rest[rangeField]);
    delete rest[rangeField];
    dateParams[startKey] = toIsoString(start);
    dateParams[endKey] = toIsoString(end);
  }
  for (const [rangeField, startKey, endKey] of DATE_TIME_RANGE_FIELDS) {
    const [start, end] = getRangeValue(rest[rangeField]);
    delete rest[rangeField];
    dateParams[startKey] = start
      ? dayjs(start as Date | string)
          .startOf('day')
          .toISOString()
      : undefined;
    dateParams[endKey] = end
      ? dayjs(end as Date | string)
          .endOf('day')
          .toISOString()
      : undefined;
  }

  const { AccountDateRange, ...others } = rest;
  let [accountDateStart, accountDateEnd] = getRangeValue(AccountDateRange);
  // 默认值尚未写入表单前的早期查询，兜底按当月过滤，避免首屏漏掉默认会计期间
  if (!accountDateStart && !accountDateEnd && !accountDateDefaultApplied) {
    const currentMonth = dayjs().startOf('month');
    accountDateStart = currentMonth;
    accountDateEnd = currentMonth;
  }

  const baseParams = {
    ...others,
    ...dateParams,
    Keyword:
      typeof others.Keyword === 'string'
        ? others.Keyword.trim()
        : others.Keyword,
    AccountDateStart: accountDateStart
      ? dayjs(accountDateStart as Date | string)
          .startOf('month')
          .toISOString()
      : undefined,
    AccountDateEnd: accountDateEnd
      ? dayjs(accountDateEnd as Date | string)
          .endOf('month')
          .toISOString()
      : undefined,
  };

  return grouping.decorateListParams(
    baseParams,
  ) as AirExportAdminApi.GetPagedListParams;
};

const grouping = useListGrouping({
  fields: AIR_EXPORT_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: async (baseParams, field) => {
    // 空运分组结果没有 logo（只有海运出口按船公司分组才有），直接透传
    return await getAirExportGroupedList({
      ...baseParams,
      GroupField: field,
    } as AirExportAdminApi.GetGroupedListParams);
  },
  persist: {
    load: loadGroupField,
    save: saveGroupField,
  },
});

const handleRowDblclick = ({
  row,
}: {
  row: AirExportAdminApi.AirExportDto;
}) => {
  const grid = gridApi.grid as any;
  if (grid?.setCheckboxRow) {
    grid.setCheckboxRow(row, true);
  }
  router.push(`/air-exports/${row.id}/edit`);
};

const [Grid, gridApi] = useVbenVxeGrid<AirExportAdminApi.AirExportDto>({
  formOptions: {
    schema: useGridFormSchema(),
    // 搜索条件变更不自动查：需点「查询」；首屏 onMounted / 从表单返回刷新除外
    submitOnChange: false,
    showCollapseButton: true,
    collapsed: true,
    commonConfig: {
      labelWidth: 96,
    },
    wrapperClass: 'grid-cols-6',
    /** 重置：清空全部条件（含会计期间），不自动查询 */
    handleReset: async () => {
      await gridApi.formApi.resetForm();
      // filterFields=false：避免 merge 把 undefined 盖回重置前的旧值
      await gridApi.formApi.setValues({ AccountDateRange: undefined }, false);
      await nextTick();
    },
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
  },
  gridOptions: {
    align: 'left',
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    checkboxConfig: {
      highlight: true,
      reserve: true,
      trigger: 'default',
    },
    rowConfig: {
      keyField: 'id',
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      // 关闭自动加载：改由 onMounted 里先写入「会计日期」默认值（当月）再手动查询，
      // 否则首查在表单模型尚未落入默认值时触发，会漏掉默认会计期间。
      autoLoad: false,
      ajax: {
        query: createPagedListQuery(getAirExportPagedList, {
          defaultSort: 'CreationTime DESC',
          mapParams: normalizeQuery,
          fieldMap: AIR_EXPORT_SORT_FIELD_MAP,
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

/** 默认会计期间：当月（起止均为当月，配合 normalizeQuery 扩展为整月区间） */
const applyDefaultAccountDate = async () => {
  const currentMonth = dayjs().startOf('month');
  await gridApi.formApi.setValues({
    AccountDateRange: [currentMonth, currentMonth],
  });
};

onMounted(async () => {
  await applyDefaultAccountDate();
  // 先恢复持久化的分组字段（仅设置状态，不查询），确保首查即带上分组维度，
  // 从而在同一次查询中拉取分组数据，避免恢复与首查竞态导致分组只剩「全部」。
  await grouping.restorePersistedField();
  // 用 submitForm 触发首查：它会把当前表单值写入「最近提交值」，
  // 从而让首查及后续分页/排序都带上默认会计期间（gridApi.query 用的是最近提交值）。
  await gridApi.formApi.submitForm();
  accountDateDefaultApplied = true;
});

// 列表页 keepAlive，分组统计不做缓存：每次重新进入列表都拉取一遍分组数据。
// 首次激活与 onMounted 首查重合，跳过以避免重复请求。
let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  grouping.refreshGroupData();
});

const getCheckboxRecords = (): AirExportAdminApi.AirExportDto[] => {
  const grid = gridApi.grid as any;
  return grid?.getCheckboxRecords?.() ?? [];
};

const requireExactlyOneRow = (): AirExportAdminApi.AirExportDto | undefined => {
  const rows = getCheckboxRecords();
  if (rows.length !== 1) {
    message.warning($t('airExport.export.pleaseSelectOne'));
    return undefined;
  }
  return rows[0];
};

const handleCreate = () => {
  router.push('/air-exports/create');
};

const handleCopy = () => {
  const row = requireExactlyOneRow();
  if (!row) {
    return;
  }
  void copyFrom({
    id: row.id,
    commissionNum: row.transportOrder?.commissionNum,
    mblNum: row.transportOrder?.mblNum,
    flightNo: row.flightNo,
    contractNum: row.transportOrder?.contractNum,
    clientName: row.transportOrder?.client?.name,
  });
};

const handleRefresh = () => {
  gridApi.query();
};

const handleDelete = () => {
  const row = requireExactlyOneRow();
  if (!row) {
    return;
  }

  // 有费用的票后端会直接拒绝删除，这里提前拦一层，省一次必然失败的请求
  if (row.transportOrder?.orderFees?.length) {
    message.warning($t('airExport.export.deleteWithFeeTip'));
    return;
  }

  const name =
    row.transportOrder?.commissionNum ||
    row.transportOrder?.mblNum ||
    `${row.id}`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('airExport.export.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [name]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [name]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await deleteAirExport(row.id);
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [name]),
          key: 'action_process_msg',
        });
        const grid = gridApi.grid as any;
        grid?.clearCheckboxRow?.();
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const onGroupFieldChange = (value: number | undefined) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};

useRefreshListOnFormReturn('AirExportList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <!-- 工具栏左侧插槽始终挂载，避免开启分组时 table-title 与插槽切换导致 vxe options 重算并重置列设置 -->
      <template #toolbar-actions>
        <GroupingTabs
          v-if="grouping.isGrouping.value"
          :items="grouping.groupItems.value"
          :selected-id="grouping.selectedItemId.value"
          :loading="grouping.loading.value"
          @select="grouping.selectItem"
        />
        <div v-else class="mr-1 pl-1 text-[1rem]">
          {{ $t('airExport.export.list') }}
        </div>
      </template>
      <template #toolbar-tools>
        <Button
          v-access:code="perm.delete"
          class="mr-2"
          danger
          @click="handleDelete"
        >
          {{ $t('common.delete') }}
        </Button>
        <Button
          v-access:code="perm.add"
          class="mr-2"
          :loading="copying"
          @click="handleCopy"
        >
          <template #icon>
            <Copy class="size-4" />
          </template>
          {{ $t('airExport.export.copy') }}
        </Button>
        <Button
          v-access:code="perm.add"
          class="mr-2"
          type="primary"
          @click="handleCreate"
        >
          <template #icon>
            <Plus class="size-4" />
          </template>
          {{ $t('common.create') }}
        </Button>
        <GroupingSettings
          :fields="grouping.fields"
          :value="grouping.enabledField.value?.value"
          @change="onGroupFieldChange"
        />
      </template>
      <template #feeLocked="{ row }">
        <LockKeyhole
          v-if="row?.transportOrder?.feeLocked"
          class="mx-auto size-4 text-red-500"
        />
        <LockKeyholeOpen v-else class="mx-auto size-4 text-gray-300" />
      </template>
      <template #businessLocked="{ row }">
        <LockKeyhole
          v-if="row?.transportOrder?.isBusinessLocking"
          class="mx-auto size-4 text-red-500"
        />
        <LockKeyholeOpen v-else class="mx-auto size-4 text-gray-300" />
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
:deep(.air-export-keyword-input input::placeholder) {
  font-size: 12px;
}
</style>
