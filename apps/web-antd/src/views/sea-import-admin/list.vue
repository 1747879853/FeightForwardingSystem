<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';
import type { GroupFieldDef } from '#/components/list-grouping';

import { computed, nextTick, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import {
  Copy,
  IconifyIcon,
  LockKeyhole,
  LockKeyholeOpen,
  Plus,
} from '@vben/icons';

import { useAccess } from '@vben/access';

import dayjs from 'dayjs';

import { Button, message, Modal, Tag, Tooltip } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSeaImport,
  getSeaImportGroupedList,
  getSeaImportPagedList,
} from '#/api/sea-import/sea-import-admin';
import { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import {
  buildContainerTrackingPayload,
  buildContainerWarningProps,
  getContainerTrackingStatusColor,
  getContainerTrackingStatusLabel,
  resolveContainerOrderLabel,
  TrackingWarningIcon,
  useContainerTrackingDetail,
  useContainerTrackingSubscribe,
} from '#/components/tracking';
import { $t } from '#/locales';
import { useTableConfigStore } from '#/store/table-config';
import {
  buildAttachmentUrl,
  createPagedListQuery,
  isTicketEditable,
} from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

import {
  SEA_IMPORT_SORT_FIELD_MAP,
  getTradeModeSelectComponentProps,
  loadTradeModeOptions,
  useColumns,
  useGridFormSchema,
} from './data';
import { useSeaImportCopy } from './use-sea-import-copy';

const perm = createAbpPermission('Admin.SeaImport');
const externalApiUseCode = 'Admin.ExternalApi.Use';
const externalApiGetCode = 'Admin.ExternalApi.Get';
const { copying, copyFrom } = useSeaImportCopy();
const { hasAccessByCodes } = useAccess();
/** 海运进口全品牌走新服务商运踪 */
const { ResultModal, subscribe, subscribing } = useContainerTrackingSubscribe(
  FeituoTrackingAdminApi.TrackingBizType.SeaImport,
);
const { TrackingModal, openTracking } = useContainerTrackingDetail();
const canViewTracking = computed(() => hasAccessByCodes([externalApiGetCode]));

const router = useRouter();
const tableConfigStore = useTableConfigStore();

/** 分组设置持久化 key（与列表 listKey 对齐，路由名 SeaImportList） */
const GROUP_CONFIG_NAME = 'group_config_SeaImportList';

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
 * 海运进口分组字段配置。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，
 * 也是与之互斥的搜索表单字段名。分组值沿用后端 GroupField 枚举。
 */
const SEA_IMPORT_GROUP_FIELDS: GroupFieldDef[] = [
  { value: 3, label: $t('seaImport.import.clientId'), paramKey: 'ClientId' },
  {
    value: 4,
    label: $t('seaImport.import.carrierId'),
    paramKey: 'CarrierId',
    emptyParamKey: 'CarrierIdEmpty',
  },
  {
    value: 5,
    label: $t('seaImport.import.polId'),
    paramKey: 'POLId',
    emptyParamKey: 'POLIdEmpty',
  },
  {
    value: 6,
    label: $t('seaImport.import.podId'),
    paramKey: 'PODId',
    emptyParamKey: 'PODIdEmpty',
  },
  {
    value: 7,
    label: $t('seaImport.import.vessel'),
    paramKey: 'Vessel',
    emptyParamKey: 'VesselEmpty',
  },
  {
    value: 12,
    label: $t('seaImport.import.warehouseId'),
    paramKey: 'WarehouseId',
  },
  { value: 13, label: $t('seaImport.import.teamId'), paramKey: 'TeamId' },
  {
    value: 14,
    label: $t('seaImport.import.originCountryId'),
    paramKey: 'OriginCountryId',
    emptyParamKey: 'OriginCountryIdEmpty',
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
  ['ExchangeBillDateRange', 'ExchangeBillDateStart', 'ExchangeBillDateEnd'],
  ['PickUpDateRange', 'PickUpDateStart', 'PickUpDateEnd'],
  [
    'CustomsDeclareDateRange',
    'CustomsDeclareDateStart',
    'CustomsDeclareDateEnd',
  ],
  [
    'TransferStationDateRange',
    'TransferStationDateStart',
    'TransferStationDateEnd',
  ],
  ['CtnUseDateRange', 'CtnUseDateStart', 'CtnUseDateEnd'],
] as const;

/**
 * 会计日期默认值是否已写入表单。
 * 用于兜底：在默认值写入前（如分组恢复抢先触发查询），仍按当月过滤；
 * 写入后则完全尊重表单值（允许用户清空或改月）。
 */
let accountDateDefaultApplied = false;

const normalizeQuery = (
  formValues: Record<string, unknown>,
): SeaImportAdminApi.GetPagedListParams => {
  const rest: Record<string, unknown> = { ...formValues };
  const dateParams: Record<string, string | undefined> = {};
  for (const [rangeField, startKey, endKey] of DATE_RANGE_FIELDS) {
    const [start, end] = getRangeValue(rest[rangeField]);
    delete rest[rangeField];
    dateParams[startKey] = toIsoString(start);
    dateParams[endKey] = toIsoString(end);
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
  ) as SeaImportAdminApi.GetPagedListParams;
};

const grouping = useListGrouping({
  fields: SEA_IMPORT_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: async (baseParams, field) => {
    const items = await getSeaImportGroupedList({
      ...baseParams,
      GroupField: field,
    } as SeaImportAdminApi.GetGroupedListParams);
    // 船公司分组会返回 logo 附件，解析为可访问地址供分组 Tab 展示
    return (items ?? []).map((item) => ({
      ...item,
      logoUrl: item.logo?.url ? buildAttachmentUrl(item.logo.url) : undefined,
    }));
  },
  persist: {
    load: loadGroupField,
    save: saveGroupField,
  },
});

const handleRowDblclick = ({
  row,
}: {
  row: SeaImportAdminApi.SeaImportDto;
}) => {
  const grid = gridApi.grid as any;
  if (grid?.setCheckboxRow) {
    grid.setCheckboxRow(row, true);
  }
  router.push(`/sea-imports/${row.id}/edit`);
};

const selectedRows = ref<SeaImportAdminApi.SeaImportDto[]>([]);
const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid as any)?.getCheckboxRecords?.() ?? [];
};

const [Grid, gridApi] = useVbenVxeGrid<SeaImportAdminApi.SeaImportDto>({
  formOptions: {
    schema: useGridFormSchema(),
    // 搜索条件变更不自动查：需点「查询」；首屏 onMounted / 从表单返回刷新除外
    submitOnChange: false,
    showCollapseButton: true,
    collapsed: true,
    commonConfig: {
      labelWidth: 86,
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
    checkboxChange: syncSelectedRows,
    checkboxAll: syncSelectedRows,
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
        query: createPagedListQuery(getSeaImportPagedList, {
          defaultSort: 'CreationTime DESC',
          mapParams: normalizeQuery,
          fieldMap: SEA_IMPORT_SORT_FIELD_MAP,
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
  await loadTradeModeOptions();
  await gridApi.formApi.updateSchema([
    {
      fieldName: 'TradeMode',
      componentProps: getTradeModeSelectComponentProps(),
    },
  ]);
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

const getCheckboxRecords = (): SeaImportAdminApi.SeaImportDto[] => {
  const grid = gridApi.grid as any;
  return grid?.getCheckboxRecords?.() ?? [];
};

const requireExactlyOneRow = (): SeaImportAdminApi.SeaImportDto | undefined => {
  const rows = getCheckboxRecords();
  if (rows.length !== 1) {
    message.warning($t('seaImport.import.pleaseSelectOne'));
    return undefined;
  }
  return rows[0];
};

/** 未选或未恰好 1 条时保持可点，由点击提示「请先选择一条」；仅在选中票 isEditable=false 时禁用 */
const canDeleteSelected = computed(() => {
  if (selectedRows.value.length !== 1) return true;
  return isTicketEditable(selectedRows.value[0]);
});
const deleteDisabledTip = computed(() =>
  canDeleteSelected.value ? '' : '当前记录没有编辑权限，不能删除',
);

const handleCreate = () => {
  router.push('/sea-imports/create');
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
    contractNum: row.transportOrder?.contractNum,
    clientName: row.transportOrder?.client?.name,
  });
};

const handleRefresh = () => {
  gridApi.query();
};

const handleSubscribeTracking = async () => {
  const rows = getCheckboxRecords();
  await subscribe(
    rows.map((row) => ({
      id: String(row.id),
      orderLabel: resolveContainerOrderLabel(row),
    })),
  );
  if (rows.length > 0) {
    handleRefresh();
  }
};

const handleOpenTracking = (row: SeaImportAdminApi.SeaImportDto) => {
  if (!canViewTracking.value) {
    return;
  }
  openTracking(
    buildContainerTrackingPayload(
      row,
      FeituoTrackingAdminApi.TrackingBizType.SeaImport,
    ),
  );
};

const handleDelete = () => {
  const row = requireExactlyOneRow();
  if (!row || !isTicketEditable(row)) {
    return;
  }

  const name =
    row.transportOrder?.commissionNum ||
    row.transportOrder?.mblNum ||
    `${row.id}`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('seaImport.import.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [name]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [name]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await deleteSeaImport(row.id);
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [name]),
          key: 'action_process_msg',
        });
        const grid = gridApi.grid as any;
        grid?.clearCheckboxRow?.();
        syncSelectedRows();
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

useRefreshListOnFormReturn('SeaImportList', handleRefresh);
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
          {{ $t('seaImport.import.list') }}
        </div>
      </template>
      <template #toolbar-tools>
        <span
          v-access:code="externalApiUseCode"
          class="mr-2 inline-flex items-center gap-1"
        >
          <Button :loading="subscribing" @click="handleSubscribeTracking">
            {{ $t('tracking.subscribe') }}
          </Button>
          <Tooltip>
            <template #title>
              <div class="whitespace-pre-line text-left">
                {{ $t('tracking.subscribeRules.seaImport') }}
              </div>
            </template>
            <IconifyIcon
              icon="ant-design:question-circle-outlined"
              class="size-3.5 cursor-help text-[rgba(0,0,0,0.45)]"
              :aria-label="$t('tracking.subscribeRulesTitle')"
            />
          </Tooltip>
        </span>
        <Tooltip :title="deleteDisabledTip">
          <span v-access:code="perm.delete" class="mr-2 inline-flex">
            <Button danger :disabled="!canDeleteSelected" @click="handleDelete">
              {{ $t('common.delete') }}
            </Button>
          </span>
        </Tooltip>
        <Button
          v-access:code="perm.add"
          class="mr-2 inline-flex items-center gap-1"
          :loading="copying"
          @click="handleCopy"
        >
          <template #icon>
            <Copy class="size-4" />
          </template>
          {{ $t('seaImport.import.copy') }}
        </Button>
        <Button
          v-access:code="perm.add"
          class="mr-2 inline-flex items-center gap-1"
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
      <template #carrierWithLogo="{ row }">
        <span class="inline-flex items-center gap-1">
          <img
            v-if="row?.carrierLogo?.url"
            :src="buildAttachmentUrl(row.carrierLogo.url)"
            :alt="row?.carrier?.code || 'carrier-logo'"
            class="h-8 w-8 rounded object-contain"
          />
          <span>{{ row?.carrier?.code || '--' }}</span>
        </span>
      </template>
      <template #mblNum="{ row }">
        <span class="inline-flex min-w-0 items-center">
          <TrackingWarningIcon v-bind="buildContainerWarningProps(row)" />
          <span class="truncate">{{
            row?.transportOrder?.mblNum || '--'
          }}</span>
        </span>
      </template>
      <template #feituoTrackStatus="{ row }">
        <Tag
          v-if="canViewTracking"
          class="cursor-pointer"
          :color="getContainerTrackingStatusColor(row)"
          @click.stop="handleOpenTracking(row)"
        >
          {{ getContainerTrackingStatusLabel(row) }}
        </Tag>
        <span v-else class="text-[rgba(0,0,0,0.65)]">
          {{ getContainerTrackingStatusLabel(row) }}
        </span>
      </template>
    </Grid>
    <ResultModal />
    <TrackingModal />
  </Page>
</template>

<style scoped>
:deep(.sea-import-keyword-input input::placeholder) {
  font-size: 12px;
}
</style>
