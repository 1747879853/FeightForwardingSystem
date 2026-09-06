<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { GroupFieldDef } from '#/components/list-grouping';

import { computed, nextTick, onActivated, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
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

import { Button, message, Modal, Tag, Tooltip } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSeaExport,
  getSeaExportGroupedList,
  getSeaExportPagedList,
} from '#/api/sea-export/sea-export-admin';
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
  normalizeKeysParam,
} from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import {
  isLegacyOceanExportTracking,
  isVendorOceanExportTracking,
} from '#/utils/tracking-brand';

import {
  getSeaExportBusinessStatusMeta,
  SEA_EXPORT_BUSINESS_STATUS_COLORS,
  useColumns,
  useGridFormSchema,
} from './data';
import { stringifySeaExportListDefaultColumnSetting } from './list-column-defaults';
import {
  buildServiceTypeLabelMap,
  loadSeServiceTypeOptions,
} from './service-type';
import { useSeaExportCopy } from './use-sea-export-copy';
import {
  buildSeaExportSubscribeRow,
  useYundangOceanSubscribe,
} from './use-yundang-ocean-subscribe';
import {
  buildYundangTrackRow,
  getYundangTrackStatusColor,
  getYundangTrackStatusLabel,
  resolveOrderLabel,
  useYundangOceanTrack,
} from './use-yundang-ocean-track';
import AiBillFeeUploadModal from '#/views/_shared/order-fee/modules/ai-bill-fee-upload-modal.vue';
import { useAiBillFeeLocate } from '#/views/_shared/order-fee/use-ai-bill-fee-locate';

const perm = createAbpPermission('Admin.SeaExport');
const externalApiUseCode = 'Admin.ExternalApi.Use';
const externalApiGetCode = 'Admin.ExternalApi.Get';
const { copying, copyFrom } = useSeaExportCopy();
const { ResultModal, subscribe, subscribing } = useYundangOceanSubscribe();
const { TrackingModal, openTracking } = useYundangOceanTrack();
/**
 * 海运出口按品牌分流：sjtd 继续用已上线的运踪，其他品牌走新服务商。
 * 两套入口互斥，避免同一列表出现两个「运踪订阅」。
 */
const {
  ResultModal: VendorResultModal,
  subscribe: vendorSubscribe,
  subscribing: vendorSubscribing,
} = useContainerTrackingSubscribe(
  FeituoTrackingAdminApi.TrackingBizType.SeaExport,
);
const { TrackingModal: VendorTrackingModal, openTracking: openVendorTracking } =
  useContainerTrackingDetail();
const { hasAccessByCodes } = useAccess();
const canViewYundangTracking = computed(() =>
  hasAccessByCodes([externalApiGetCode]),
);

const router = useRouter();
const tableConfigStore = useTableConfigStore();

/** AI 识别账单费用（列表页）：上传 → 识别 → 按提单号定位业务 → 跳转到费用页确认添加 */
const { recognizing: aiRecognizing, recognizeAndLocate } = useAiBillFeeLocate();
const aiUploadOpen = ref(false);
const onAiBillFee = () => {
  aiUploadOpen.value = true;
};
const handleAiBillFeeFile = async (file: File) => {
  const ok = await recognizeAndLocate(file);
  // 仅在识别并跳转成功后关闭上传弹窗；失败时保持打开，便于用户重新选择文件
  if (ok) aiUploadOpen.value = false;
};

/** 服务项类型枚举 label 映射（用于「业务状态」列展示服务名称） */
const serviceTypeLabelMap = ref<Map<number, string>>(new Map());

onMounted(async () => {
  const options = await loadSeServiceTypeOptions();
  serviceTypeLabelMap.value = buildServiceTypeLabelMap(options);
});

/** 分组设置持久化 key（与列表 listKey 对齐，路由名 SeaExportList） */
const GROUP_CONFIG_NAME = 'group_config_SeaExportList';

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
 * 海运出口分组字段配置。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，
 * 也是与之互斥的搜索表单字段名（付费方式无对应搜索项，启用时不影响搜索表单）。
 */
const SEA_EXPORT_GROUP_FIELDS: GroupFieldDef[] = [
  {
    value: 1,
    label: '装运方式',
    paramKey: 'BLType',
    emptyParamKey: 'BLTypeEmpty',
  },
  {
    value: 2,
    label: '订单类型',
    paramKey: 'BillType',
    emptyParamKey: 'BillTypeEmpty',
  },
  { value: 3, label: '委托单位', paramKey: 'ClientId' },
  {
    value: 4,
    label: '船公司',
    paramKey: 'CarrierId',
    emptyParamKey: 'CarrierIdEmpty',
  },
  { value: 5, label: '起运港', paramKey: 'POLId', emptyParamKey: 'POLIdEmpty' },
  { value: 6, label: '目的港', paramKey: 'PODId', emptyParamKey: 'PODIdEmpty' },
  { value: 7, label: '船名', paramKey: 'Vessel', emptyParamKey: 'VesselEmpty' },
  {
    value: 8,
    label: '付费方式',
    paramKey: 'CodeFrtId',
    emptyParamKey: 'CodeFrtIdEmpty',
  },
  {
    value: 9,
    label: '签单方式',
    paramKey: 'CodeIssueTypeId',
    emptyParamKey: 'CodeIssueTypeIdEmpty',
  },
  {
    value: 10,
    label: '场站',
    paramKey: 'YardId',
    emptyParamKey: 'YardIdEmpty',
  },
];

const toIsoString = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
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

const grouping = useListGrouping({
  fields: SEA_EXPORT_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: async (baseParams, field) => {
    const items = await getSeaExportGroupedList({
      ...baseParams,
      GroupField: field,
    } as SeaExportAdminApi.GetGroupedListParams);
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

const normalizeQuery = (
  formValues: Record<string, unknown>,
): SeaExportAdminApi.GetPagedListParams => {
  const { ETDRange, CloseDocTimeRange, AccountDateRange, ...rest } = formValues;
  const [etdStart, etdEnd] = getRangeValue(ETDRange);
  const [closeDocTimeStart, closeDocTimeEnd] = getRangeValue(CloseDocTimeRange);
  const [accountDateStart, accountDateEnd] = getRangeValue(AccountDateRange);

  const baseParams = {
    ...rest,
    Keyword:
      typeof rest.Keyword === 'string' ? rest.Keyword.trim() : rest.Keyword,
    // Keys 精确搜索：去空白去重后作为 List<string> 传后端（repeat 序列化）
    Keys: normalizeKeysParam(rest.Keys),
    ETDStart: toIsoString(etdStart),
    ETDEnd: toIsoString(etdEnd),
    CloseDocTimeStart: toIsoString(closeDocTimeStart),
    CloseDocTimeEnd: toIsoString(closeDocTimeEnd),
    AccountDateStart: accountDateStart
      ? dayjs(accountDateStart as string | Date)
          .startOf('month')
          .toISOString()
      : undefined,
    AccountDateEnd: accountDateEnd
      ? dayjs(accountDateEnd as string | Date)
          .endOf('month')
          .toISOString()
      : undefined,
  };

  return grouping.decorateListParams(
    baseParams,
  ) as SeaExportAdminApi.GetPagedListParams;
};

const handleRowDblclick = ({
  row,
}: {
  row: SeaExportAdminApi.SeaExportDto;
}) => {
  const grid = gridApi.grid as any;
  if (grid?.setCheckboxRow) {
    grid.setCheckboxRow(row, true);
  }
  router.push(`/sea-exports/${row.id}/edit`);
};

const selectedRows = ref<SeaExportAdminApi.SeaExportDto[]>([]);
const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid as any)?.getCheckboxRecords?.() ?? [];
};

const [Grid, gridApi] = useVbenVxeGrid<SeaExportAdminApi.SeaExportDto>({
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
      // 关闭自动加载：由 onMounted 先恢复分组字段再 submitForm 首查，
      // 避免分组恢复与首查竞态。
      autoLoad: false,
      ajax: {
        query: createPagedListQuery(getSeaExportPagedList, {
          defaultSort: 'TransportOrder.Etd DESC',
          mapParams: normalizeQuery,
          fieldMap: {
            'transportOrder.etd': 'TransportOrder.ETD',
            'transportOrder.clientName': 'TransportOrder.Client.Name',
            'transportOrder.codeSourceName': 'TransportOrder.CodeSource.CnName',
            'transportOrder.codeFrtName': 'TransportOrder.CodeFrt.CnName',
            carrierCode: 'Carrier.CnName',
            bookingAgentName: 'BookingAgent.Name',
            yardName: 'Yard.Name',
            receivePortName: 'ReceivePort.PortName',
            polName: 'POL.PortName',
            poT1Name: 'POT1.PortName',
            poT2Name: 'POT2.PortName',
            podName: 'POD.PortName',
            deliverPortName: 'DeliverPort.PortName',
            codeIssueTypeName: 'CodeIssueType.BillType',
            laneName: 'POD.Lane.LaneName',
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
  columnPersist: {
    load: async ({ keyword }) => {
      await tableConfigStore.loadTableConfigsOnce();
      const hit = tableConfigStore.getTableConfigByName(keyword);
      if (hit?.setting) {
        return { id: hit.id, setting: hit.setting };
      }
      // 无用户配置：套代码默认 JSON，不带 id，避免写成用户设置
      return { setting: stringifySeaExportListDefaultColumnSetting() };
    },
  },
});

onMounted(async () => {
  // 先恢复持久化的分组字段（仅设置状态，不查询），确保首查即带上分组维度，
  // 从而在同一次查询中拉取分组数据，避免恢复与首查竞态导致分组只剩「全部」。
  await grouping.restorePersistedField();
  // 用 submitForm 触发首查：它会把当前表单值写入「最近提交值」，
  // 后续分页/排序走 gridApi.query 时才能带上同一套条件。
  await gridApi.formApi.submitForm();
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

const getCheckboxRecords = (): SeaExportAdminApi.SeaExportDto[] => {
  const grid = gridApi.grid as any;
  return grid?.getCheckboxRecords?.() ?? [];
};

const requireExactlyOneRow = (): SeaExportAdminApi.SeaExportDto | undefined => {
  const rows = getCheckboxRecords();
  if (rows.length !== 1) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
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
  router.push('/sea-exports/create');
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
    bookingNum: row.transportOrder?.bookingNum,
    contractNum: row.transportOrder?.contractNum,
    clientName: row.transportOrder?.client?.name,
  });
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
    title: $t('ui.actionTitle.delete', [$t('seaExport.export.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [name]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [name]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await deleteSeaExport(row.id);
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

const handleRefresh = () => {
  gridApi.query();
};

const handleYundangSubscribe = async () => {
  const rows = getCheckboxRecords();
  await subscribe(rows.map((row) => buildSeaExportSubscribeRow(row)));
  if (rows.length > 0) {
    gridApi.query();
  }
};

const handleOpenYundangTracking = (row: SeaExportAdminApi.SeaExportDto) => {
  const trackRow = buildYundangTrackRow(row);
  openTracking({
    seaExportId: trackRow.id,
    orderLabel: resolveOrderLabel(trackRow),
    isYundangSubscribed: trackRow.isYundangSubscribed,
    isYundangSubscribeSuccess: trackRow.isYundangSubscribeSuccess,
  });
};

const handleVendorSubscribe = async () => {
  const rows = getCheckboxRecords();
  await vendorSubscribe(
    rows.map((row) => ({
      id: String(row.id),
      orderLabel: resolveContainerOrderLabel(row),
    })),
  );
  if (rows.length > 0) {
    gridApi.query();
  }
};

const handleOpenVendorTracking = (row: SeaExportAdminApi.SeaExportDto) => {
  if (!canViewYundangTracking.value) {
    return;
  }
  openVendorTracking(
    buildContainerTrackingPayload(
      row,
      FeituoTrackingAdminApi.TrackingBizType.SeaExport,
    ),
  );
};

/** 「业务状态」列：计算最新服务进度文案 + 对应状态色（与详情页服务项目一致） */
const resolveBusinessStatus = (row: SeaExportAdminApi.SeaExportDto) => {
  const meta = getSeaExportBusinessStatusMeta(row, serviceTypeLabelMap.value);
  return { ...meta, colors: SEA_EXPORT_BUSINESS_STATUS_COLORS[meta.state] };
};

const onGroupFieldChange = (value: number | undefined) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};

useRefreshListOnFormReturn('SeaExportList', handleRefresh);
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
          {{ $t('seaExport.export.list') }}
        </div>
      </template>
      <template #toolbar-tools>
        <span v-access:code="externalApiUseCode" class="mr-2 inline-flex">
          <Button :loading="aiRecognizing" @click="onAiBillFee">
            <template #icon>
              <IconifyIcon icon="mdi:robot-outline" class="size-4" />
            </template>
            AI识别
          </Button>
        </span>
        <span
          v-if="isLegacyOceanExportTracking"
          v-access:code="externalApiUseCode"
          class="mr-2 inline-flex items-center gap-1"
        >
          <Button :loading="subscribing" @click="handleYundangSubscribe">
            {{ $t('seaExport.yundang.subscribe') }}
          </Button>
          <Tooltip>
            <template #title>
              <div class="whitespace-pre-line text-left">
                {{ $t('seaExport.yundang.subscribeRules') }}
              </div>
            </template>
            <IconifyIcon
              icon="ant-design:question-circle-outlined"
              class="size-3.5 cursor-help text-[rgba(0,0,0,0.45)]"
              :aria-label="$t('seaExport.yundang.subscribeRulesTitle')"
            />
          </Tooltip>
        </span>
        <span
          v-else
          v-access:code="externalApiUseCode"
          class="mr-2 inline-flex items-center gap-1"
        >
          <Button :loading="vendorSubscribing" @click="handleVendorSubscribe">
            {{ $t('tracking.subscribe') }}
          </Button>
          <Tooltip>
            <template #title>
              <div class="whitespace-pre-line text-left">
                {{ $t('tracking.subscribeRules.seaExport') }}
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
          {{ $t('seaExport.export.copy') }}
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
      <template #businessStatus="{ row }">
        <span
          v-if="resolveBusinessStatus(row).text === '-'"
          class="text-gray-400"
        >
          -
        </span>
        <span
          v-else
          class="inline-flex items-center rounded px-2 py-0.5 text-xs leading-5"
          :style="{
            color: resolveBusinessStatus(row).colors.color,
            backgroundColor: resolveBusinessStatus(row).colors.background,
          }"
        >
          {{ resolveBusinessStatus(row).text }}
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
      <template #yundangTrackStatus="{ row }">
        <template v-if="isVendorOceanExportTracking">
          <Tag
            v-if="canViewYundangTracking"
            class="cursor-pointer"
            :color="getContainerTrackingStatusColor(row)"
            @click.stop="handleOpenVendorTracking(row)"
          >
            {{ getContainerTrackingStatusLabel(row) }}
          </Tag>
          <span v-else class="text-[rgba(0,0,0,0.65)]">
            {{ getContainerTrackingStatusLabel(row) }}
          </span>
        </template>
        <template v-else>
          <Tag
            v-if="canViewYundangTracking"
            class="cursor-pointer"
            :color="getYundangTrackStatusColor(buildYundangTrackRow(row))"
            @click.stop="handleOpenYundangTracking(row)"
          >
            {{ getYundangTrackStatusLabel(buildYundangTrackRow(row)) }}
          </Tag>
          <span v-else class="text-[rgba(0,0,0,0.65)]">
            {{ getYundangTrackStatusLabel(buildYundangTrackRow(row)) }}
          </span>
        </template>
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
    </Grid>
    <template v-if="isLegacyOceanExportTracking">
      <ResultModal />
      <TrackingModal />
    </template>
    <template v-else>
      <VendorResultModal />
      <VendorTrackingModal />
    </template>
    <AiBillFeeUploadModal
      v-model:open="aiUploadOpen"
      :recognizing="aiRecognizing"
      @file="handleAiBillFeeFile"
    />
  </Page>
</template>

<style scoped>
:deep(.sea-export-keyword-input input::placeholder) {
  font-size: 12px;
}
</style>
