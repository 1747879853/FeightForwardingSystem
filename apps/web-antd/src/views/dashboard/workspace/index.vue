<script lang="ts" setup>
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';
import type { SeServiceConfigAdminApi } from '#/api/system/base-data/se-service-config-admin';
import type { SeServiceTaskAdminApi } from '#/api/sea-export/se-service-task-admin';
import type { BusinessRow, PortTab, StageStep } from './workbench-data';

import dayjs from 'dayjs';
import {
  computed,
  defineAsyncComponent,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';

import { message, Modal } from 'ant-design-vue';

import UserSelect from '#/adapter/component/biz-select/user-select.vue';
import { getOrderFeeTaskList } from '#/api/audit-approval/expense-admin';
import {
  getPayAppTaskList,
  TaskStatus as PaymentTaskStatus,
} from '#/api/audit-approval/payment-review-admin';
import {
  completeSeServiceTask,
  getSeServiceTaskWorkbenchCount,
  getSeServiceTaskWorkbenchPagedList,
  transferSeServiceTask,
} from '#/api/sea-export/se-service-task-admin';
import {
  getSeServiceConfigDetail,
  getSeServiceConfigPagedList,
} from '#/api/system/base-data/se-service-config-admin';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import {
  buildServiceTypeLabelMap,
  loadSeServiceTypeOptions,
} from '#/views/sea-export-admin/service-type';

import {
  emergencyTasks,
  exceptionSummary,
  filterModelDefaults,
  processingTabs,
  serviceTabs,
  serviceTypeLabel,
  toPortTab,
} from './workbench-data';
import {
  buildDynamicColumns,
  loadSeaExportPropLabelMap,
} from './workbench/se-service-show-columns';

const WorkbenchTopNav = defineAsyncComponent(
  () => import('./workbench/components/workbench-top-nav.vue'),
);
const WorkbenchPortHeader = defineAsyncComponent(
  () => import('./workbench/components/workbench-port-header.vue'),
);
const WorkbenchFilterBar = defineAsyncComponent(
  () => import('./workbench/components/workbench-filter-bar.vue'),
);
const WorkbenchReviewFilterBar = defineAsyncComponent(
  () => import('./workbench/components/workbench-review-filter-bar.vue'),
);
const WorkbenchEmergencyQueue = defineAsyncComponent(
  () => import('./workbench/components/workbench-emergency-queue.vue'),
);
const WorkbenchBusinessTable = defineAsyncComponent(
  () => import('./workbench/components/workbench-business-table.vue'),
);
const WorkbenchExceptionPanel = defineAsyncComponent(
  () => import('./workbench/components/workbench-exception-panel.vue'),
);

const SEA_EXPORT_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const SEA_EXPORT_DEFAULT_PAGE_SIZE = 20;

const activeServiceTab = ref('sea-export');
const activePort = ref('');
const activeProcessingTab = ref('processing');
const activeStageKey = ref('');
const loading = ref(false);
const router = useRouter();

const filterModel = reactive({ ...filterModelDefaults });
const appliedFilterModel = reactive({ ...filterModelDefaults });
const arApReviewFilterDefaults = {
  remark: '',
};
const paymentReviewFilterDefaults = {
  applicationNo: '',
  auditUserId: undefined as number | undefined,
  creatorUserId: undefined as number | undefined,
  currencyId: undefined as number | undefined,
  keyword: '',
  settlementId: undefined as string | undefined,
  submitTimeRange: null as [string, string] | [any, any] | null,
};
const arApReviewFilterModel = reactive({ ...arApReviewFilterDefaults });
const appliedArApReviewFilterModel = reactive({ ...arApReviewFilterDefaults });
const paymentReviewFilterModel = reactive({ ...paymentReviewFilterDefaults });
const appliedPaymentReviewFilterModel = reactive({
  ...paymentReviewFilterDefaults,
});
const selectedRowKeys = ref<string[]>([]);
const countGroups = ref<
  SeServiceTaskAdminApi.SeServiceTaskWorkbenchCountGroupDto[]
>([]);
const pagedTasks = ref<SeServiceTaskAdminApi.SeServiceTaskWorkbenchItemDto[]>(
  [],
);
const activePortConfig =
  ref<SeServiceConfigAdminApi.SeServiceConfigDetailDto | null>(null);
const portConfigCache = new Map<
  number,
  SeServiceConfigAdminApi.SeServiceConfigDetailDto | null
>();
const seaExportPagination = reactive({
  current: 1,
  pageSize: SEA_EXPORT_DEFAULT_PAGE_SIZE,
  total: 0,
});
const serviceTypeTextMap = ref<Map<number, string>>(new Map());
const seaExportPropLabelMap = ref<Map<number, string>>(new Map());

const transferVisible = ref(false);
const transferSubmitting = ref(false);
const transferTaskIds = ref<string[]>([]);
const transferUserId = ref<number>();
const reviewRawRows = ref<BusinessRow[]>([]);

const REVIEW_TAB_KEYS = new Set(['ar-ap-review', 'payment-review']);

const isSeaExportTab = computed(() => activeServiceTab.value === 'sea-export');
const isReviewTab = computed(() => REVIEW_TAB_KEYS.has(activeServiceTab.value));
const reviewFilterMode = computed(() =>
  activeServiceTab.value === 'ar-ap-review' ? 'ar-ap-review' : 'payment-review',
);

function toDateText(value?: string | null) {
  if (!value) return '--';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '--';
}

function buildSeaExportFilterParams(): SeServiceTaskAdminApi.GetWorkbenchFilterParams {
  const [etdStartRaw, etdEndRaw] = appliedFilterModel.etdRange ?? [];
  const etdStartDate = etdStartRaw ? dayjs(etdStartRaw) : null;
  const etdEndDate = etdEndRaw ? dayjs(etdEndRaw) : null;
  const mblNum = appliedFilterModel.mblNum.trim();

  return {
    CarrierId: appliedFilterModel.carrierId,
    ClientId: appliedFilterModel.clientId,
    ETDEnd: etdEndDate?.isValid()
      ? etdEndDate.endOf('day').toISOString()
      : undefined,
    ETDStart: etdStartDate?.isValid()
      ? etdStartDate.startOf('day').toISOString()
      : undefined,
    MblNum: mblNum || undefined,
    PODId: appliedFilterModel.podId,
    ServiceTaskStatus: activeProcessingTab.value === 'processed' ? 1 : 0,
  };
}

function getActivePortGroup() {
  if (!activePort.value) return countGroups.value[0];
  return countGroups.value.find(
    (item) => String(item.polId) === activePort.value,
  );
}

function normalizeCountGroups(
  raw:
    | SeServiceTaskAdminApi.SeServiceTaskWorkbenchCountResultDto
    | Record<string, unknown>,
): SeServiceTaskAdminApi.SeServiceTaskWorkbenchCountGroupDto[] {
  const items =
    (raw as SeServiceTaskAdminApi.SeServiceTaskWorkbenchCountResultDto).items ??
    (raw as { Items?: unknown[] }).Items ??
    [];

  return (items as Record<string, unknown>[]).map((group) => {
    const serviceItemsRaw =
      (group.serviceItems as Record<string, unknown>[] | undefined) ??
      (group.ServiceItems as Record<string, unknown>[] | undefined) ??
      [];

    return {
      polId: Number(group.polId ?? group.PolId ?? 0),
      pol: (group.pol ?? group.Pol) as
        | SeServiceTaskAdminApi.PortCodeDto
        | null
        | undefined,
      totalCount: Number(group.totalCount ?? group.TotalCount ?? 0),
      serviceItems: serviceItemsRaw.map((item) => ({
        count: Number(item.count ?? item.Count ?? 0),
        serviceType: item.serviceType ?? item.ServiceType ?? null,
      })),
    };
  });
}

function buildServiceItemCountMap(
  group?: SeServiceTaskAdminApi.SeServiceTaskWorkbenchCountGroupDto,
) {
  const countMap = new Map<number | 'assigned', number>();
  for (const item of group?.serviceItems ?? []) {
    if (item.serviceType == null) {
      countMap.set('assigned', item.count);
      continue;
    }
    countMap.set(Number(item.serviceType), item.count);
  }
  return countMap;
}

function buildStageSteps(
  group?: SeServiceTaskAdminApi.SeServiceTaskWorkbenchCountGroupDto,
): StageStep[] {
  if (!group) return [];

  const countMap = buildServiceItemCountMap(group);
  const configItems = [
    ...(activePortConfig.value?.seServiceConfigItems ?? []),
  ].sort((left, right) => (left.sortId ?? 0) - (right.sortId ?? 0));
  const steps: StageStep[] = [];
  const usedServiceTypes = new Set<number>();

  for (const configItem of configItems) {
    const serviceType = Number(configItem.serviceType);
    const count = countMap.get(serviceType) ?? 0;
    if (count <= 0) continue;
    usedServiceTypes.add(serviceType);
    steps.push({
      count,
      key: String(serviceType),
      label: serviceTypeLabel(serviceType, serviceTypeTextMap.value),
    });
  }

  const countServiceItems = [...(group.serviceItems ?? [])]
    .filter((item) => item.serviceType != null && item.count > 0)
    .sort(
      (left, right) => Number(left.serviceType) - Number(right.serviceType),
    );

  for (const item of countServiceItems) {
    const serviceType = Number(item.serviceType);
    if (usedServiceTypes.has(serviceType)) continue;
    usedServiceTypes.add(serviceType);
    steps.push({
      count: item.count,
      key: String(serviceType),
      label: serviceTypeLabel(serviceType, serviceTypeTextMap.value),
    });
  }

  const assignedCount = countMap.get('assigned') ?? 0;
  if (assignedCount > 0) {
    steps.push({
      count: assignedCount,
      key: 'assigned',
      label: serviceTypeLabel(null, serviceTypeTextMap.value),
    });
  }

  return steps;
}

const allPortTabs = computed<PortTab[]>(() => countGroups.value.map(toPortTab));

const activePortMeta = computed(
  () =>
    allPortTabs.value.find((item) => item.key === activePort.value) ?? {
      count: 0,
      key: '',
      label: '暂无港口',
    },
);

const stageSteps = computed<StageStep[]>(() =>
  buildStageSteps(getActivePortGroup()),
);

const activeConfigItem = computed(() => {
  if (activeStageKey.value === 'assigned') return undefined;
  const serviceType = Number(activeStageKey.value);
  if (Number.isNaN(serviceType)) return undefined;
  return activePortConfig.value?.seServiceConfigItems?.find(
    (item) => item.serviceType === serviceType,
  );
});

const seaExportDynamicColumns = computed(() => {
  if (activeStageKey.value === 'assigned') return undefined;
  const shows = activeConfigItem.value?.seServiceShows?.map((item) => ({
    seaExportPropEnum: item.seaExportPropEnum,
  }));
  return buildDynamicColumns(shows, seaExportPropLabelMap.value);
});

function mapWorkbenchItemToBusinessRow(
  task: SeServiceTaskAdminApi.SeServiceTaskWorkbenchItemDto,
): BusinessRow {
  const seaExport = task.seaExport;
  const users = task.seServiceTaskUsers ?? [];
  const assignee =
    users.find((item) => item.userId === task.assigneeUserId)?.userNickName ??
    (task.assigneeUserId ? `用户${task.assigneeUserId}` : '');

  return {
    assigneeUserId: task.assigneeUserId,
    assigneeUserName: assignee,
    bookingNo:
      seaExport?.transportOrder?.commissionNum || String(task.seaExportId),
    containerInfo: seaExport?.transportOrder?.totalCtn || '--',
    etd: seaExport?.transportOrder?.etd
      ? dayjs(seaExport.transportOrder.etd).format('YYYY-MM-DD')
      : '--',
    id: task.id,
    route: `${seaExport?.polName || '--'} / ${seaExport?.podName || '--'}`,
    seaExport,
    seaExportId: String(task.seaExportId),
    serviceTaskStatus: task.serviceTaskStatus,
    status: 'pending',
    taskUsersText:
      users
        .map((item) => item.userNickName)
        .filter(Boolean)
        .join('、') || '--',
    vesselVoyage:
      [seaExport?.vessel, seaExport?.innerVoyno].filter(Boolean).join(' / ') ||
      '--',
  };
}

const businessRows = computed(() =>
  pagedTasks.value.map(mapWorkbenchItemToBusinessRow),
);

const reviewBusinessRows = computed(() => reviewRawRows.value);

const displayBusinessRows = computed(() =>
  isSeaExportTab.value ? businessRows.value : reviewBusinessRows.value,
);

const reviewStageSteps = computed<StageStep[]>(() => [
  {
    count: reviewBusinessRows.value.length,
    key: 'review-tasks',
    label: '审核任务',
    subLabel: '审核任务控制节点',
  },
]);

const displayStageSteps = computed<StageStep[]>(() =>
  isSeaExportTab.value ? stageSteps.value : reviewStageSteps.value,
);

function ensureActiveStage() {
  if (!stageSteps.value.length) {
    activeStageKey.value = '';
    return;
  }
  if (!stageSteps.value.some((item) => item.key === activeStageKey.value)) {
    activeStageKey.value = stageSteps.value[0]?.key ?? '';
  }
}

async function loadPortConfig(polId: number) {
  if (portConfigCache.has(polId)) {
    activePortConfig.value = portConfigCache.get(polId) ?? null;
    return activePortConfig.value;
  }

  const listResult = await getSeServiceConfigPagedList({
    PageIndex: 1,
    PageSize: 1,
    polId,
    PolId: polId,
  });
  const configId = listResult.items?.[0]?.id;
  if (!configId) {
    portConfigCache.set(polId, null);
    activePortConfig.value = null;
    return null;
  }

  const detail = await getSeServiceConfigDetail(configId);
  portConfigCache.set(polId, detail);
  activePortConfig.value = detail;
  return detail;
}

async function loadSeaExportCount(resetSelection: boolean) {
  const result = await getSeServiceTaskWorkbenchCount(
    buildSeaExportFilterParams(),
  );
  countGroups.value = normalizeCountGroups(result);

  if (resetSelection) {
    activePort.value = countGroups.value[0]
      ? String(countGroups.value[0].polId)
      : '';
    return;
  }

  if (
    activePort.value &&
    !countGroups.value.some((item) => String(item.polId) === activePort.value)
  ) {
    activePort.value = countGroups.value[0]
      ? String(countGroups.value[0].polId)
      : '';
  }
}

async function loadSeaExportTaskList(options?: {
  keepPage?: boolean;
  resetPage?: boolean;
}) {
  const polId = Number(activePort.value);
  if (!polId || !activeStageKey.value) {
    pagedTasks.value = [];
    seaExportPagination.total = 0;
    return;
  }

  if (options?.resetPage) {
    seaExportPagination.current = 1;
  }

  const requestParams: SeServiceTaskAdminApi.GetWorkbenchPagedListParams = {
    ...buildSeaExportFilterParams(),
    MaxResultCount: seaExportPagination.pageSize,
    POLId: polId,
    SkipCount: (seaExportPagination.current - 1) * seaExportPagination.pageSize,
  };

  if (activeStageKey.value !== 'assigned') {
    const serviceType = Number(activeStageKey.value);
    if (!Number.isNaN(serviceType)) {
      requestParams.ServiceType = serviceType;
    }
  }

  const result = await getSeServiceTaskWorkbenchPagedList(requestParams);

  pagedTasks.value = result.items ?? [];
  seaExportPagination.total = result.totalCount ?? 0;

  if (!pagedTasks.value.length && seaExportPagination.current > 1) {
    seaExportPagination.current -= 1;
    await loadSeaExportTaskList({ keepPage: true });
  }
}

async function loadSeaExportWorkbenchFull() {
  loading.value = true;
  selectedRowKeys.value = [];
  try {
    await loadSeaExportCount(true);
    ensureActiveStage();
    const polId = Number(activePort.value);
    if (!polId) {
      activePortConfig.value = null;
      activeStageKey.value = '';
      pagedTasks.value = [];
      seaExportPagination.total = 0;
      seaExportPagination.current = 1;
      return;
    }

    await loadPortConfig(polId);
    ensureActiveStage();
    await loadSeaExportTaskList({ resetPage: true });
  } finally {
    loading.value = false;
  }
}

async function refreshSeaExportAfterAction() {
  loading.value = true;
  try {
    await loadSeaExportCount(false);
    ensureActiveStage();
    const polId = Number(activePort.value);
    if (!polId) {
      activePortConfig.value = null;
      activeStageKey.value = '';
      pagedTasks.value = [];
      seaExportPagination.total = 0;
      return;
    }

    if (!portConfigCache.has(polId)) {
      await loadPortConfig(polId);
    } else {
      activePortConfig.value = portConfigCache.get(polId) ?? null;
    }
    ensureActiveStage();
    await loadSeaExportTaskList({ keepPage: true });
  } finally {
    loading.value = false;
  }
}

async function handlePortChange(portKey: string) {
  if (portKey === activePort.value) return;
  activePort.value = portKey;
  selectedRowKeys.value = [];
  loading.value = true;
  try {
    const polId = Number(portKey);
    if (!polId) {
      activePortConfig.value = null;
      activeStageKey.value = '';
      pagedTasks.value = [];
      seaExportPagination.total = 0;
      seaExportPagination.current = 1;
      return;
    }
    await loadPortConfig(polId);
    ensureActiveStage();
    await loadSeaExportTaskList({ resetPage: true });
  } finally {
    loading.value = false;
  }
}

async function handleStageChange(stageKey: string) {
  if (stageKey === activeStageKey.value) return;
  activeStageKey.value = stageKey;
  selectedRowKeys.value = [];
  loading.value = true;
  try {
    await loadSeaExportTaskList({ resetPage: true });
  } finally {
    loading.value = false;
  }
}

async function handleSeaExportPaginationChange(page: number, pageSize: number) {
  seaExportPagination.current = page;
  seaExportPagination.pageSize = pageSize;
  selectedRowKeys.value = [];
  loading.value = true;
  try {
    await loadSeaExportTaskList({ keepPage: true });
  } finally {
    loading.value = false;
  }
}

watch(activeProcessingTab, () => {
  selectedRowKeys.value = [];
  void loadWorkbench();
});

watch(activeServiceTab, (tab) => {
  selectedRowKeys.value = [];
  if (!isSeaExportTab.value) {
    activeStageKey.value = 'review-tasks';
  }
  if (tab) void loadWorkbench();
});

function mapOrderFeeTaskToBusinessRow(
  item: ExpenseSubmissionAdminApi.OrderFeeTaskListDto,
): BusinessRow {
  const order = item.transportOrder;
  return {
    assigneeUserId: undefined,
    assigneeUserName: '--',
    bookingNo: order?.commissionNum || item.entityId || item.id,
    containerInfo: '--',
    etd: toDateText(order?.etd),
    id: item.id,
    route: `${order?.seaExportPOLCnName || '--'} / ${order?.seaExportPODCnName || '--'}`,
    seaExportId: `${order?.id || ''}::${item.entityId || ''}`,
    serviceTaskStatus: (item.orderFeeTasks ?? []).some(
      (feeTask) => feeTask.task?.taskStatus === 0,
    )
      ? 0
      : 1,
    status: 'pending',
    taskUsersText: item.creatorUserName || '--',
    vesselVoyage:
      [order?.seaExportVessel, order?.seaExportInnerVoyno]
        .filter(Boolean)
        .join(' / ') || '--',
  };
}

function mapPaymentTaskToBusinessRow(
  item: PaymentReviewAdminApi.PayAppTaskItemDto,
): BusinessRow {
  return {
    assigneeUserId: item.auditUserId,
    assigneeUserName: item.auditUserName || '--',
    bookingNo: item.applicationNo || item.id,
    containerInfo:
      item.currencyCode && item.totalPayPrice != null
        ? `${item.currencyCode} ${item.totalPayPrice}`
        : '--',
    etd: toDateText(item.submitTime),
    id: item.id,
    route:
      item.companys
        ?.map((company) => company.name)
        .filter(Boolean)
        .join(' / ') ||
      item.settlementName ||
      '--',
    seaExportId: item.paymentApplicationId,
    serviceTaskStatus: item.taskStatus === PaymentTaskStatus.Auditing ? 0 : 1,
    status: 'pending',
    taskUsersText: item.creatorUserName || '--',
    vesselVoyage: item.settlementName || '--',
  };
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
}

function getRangeValue(
  value: unknown,
): [unknown | undefined, unknown | undefined] {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
}

async function loadReviewWorkbench() {
  if (!isReviewTab.value) return;
  loading.value = true;
  try {
    if (activeServiceTab.value === 'ar-ap-review') {
      const remark = appliedArApReviewFilterModel.remark.trim();
      const result = await getOrderFeeTaskList({
        Processed: activeProcessingTab.value === 'processed',
        Remark: remark || undefined,
        PageIndex: 1,
        PageSize: 200,
      });
      reviewRawRows.value = (result.items ?? []).map(
        mapOrderFeeTaskToBusinessRow,
      );
      return;
    }
    if (activeServiceTab.value === 'payment-review') {
      const [submitTimeStart, submitTimeEnd] = getRangeValue(
        appliedPaymentReviewFilterModel.submitTimeRange,
      );
      const result = await getPayAppTaskList({
        ApplicationNo:
          appliedPaymentReviewFilterModel.applicationNo.trim() || undefined,
        AuditUserId: appliedPaymentReviewFilterModel.auditUserId,
        CreatorUserId: appliedPaymentReviewFilterModel.creatorUserId,
        CurrencyId: appliedPaymentReviewFilterModel.currencyId,
        Keyword: appliedPaymentReviewFilterModel.keyword.trim() || undefined,
        SettlementId: appliedPaymentReviewFilterModel.settlementId,
        SubmitTimeEnd: toIsoString(submitTimeEnd),
        SubmitTimeStart: toIsoString(submitTimeStart),
        PageIndex: 1,
        PageSize: 200,
      });
      reviewRawRows.value = (result.items ?? [])
        .filter((item) =>
          activeProcessingTab.value === 'processed'
            ? item.taskStatus !== PaymentTaskStatus.Auditing
            : item.taskStatus === PaymentTaskStatus.Auditing,
        )
        .map(mapPaymentTaskToBusinessRow);
      return;
    }
    reviewRawRows.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadWorkbench() {
  if (isSeaExportTab.value) {
    await loadSeaExportWorkbenchFull();
    return;
  }
  await loadReviewWorkbench();
}

async function loadServiceTypeEnumMap() {
  const [options, propLabelMap] = await Promise.all([
    loadSeServiceTypeOptions(),
    loadSeaExportPropLabelMap(),
  ]);
  serviceTypeTextMap.value = buildServiceTypeLabelMap(options);
  seaExportPropLabelMap.value = propLabelMap;
}

async function handleSearch() {
  if (isSeaExportTab.value) {
    Object.assign(appliedFilterModel, filterModel);
  } else if (activeServiceTab.value === 'ar-ap-review') {
    Object.assign(appliedArApReviewFilterModel, arApReviewFilterModel);
  } else if (activeServiceTab.value === 'payment-review') {
    Object.assign(appliedPaymentReviewFilterModel, paymentReviewFilterModel);
  }
  selectedRowKeys.value = [];
  await loadWorkbench();
}

function handleReset() {
  if (isSeaExportTab.value) {
    Object.assign(filterModel, filterModelDefaults);
    Object.assign(appliedFilterModel, filterModelDefaults);
  } else if (activeServiceTab.value === 'ar-ap-review') {
    Object.assign(arApReviewFilterModel, arApReviewFilterDefaults);
    Object.assign(appliedArApReviewFilterModel, arApReviewFilterDefaults);
  } else if (activeServiceTab.value === 'payment-review') {
    Object.assign(paymentReviewFilterModel, paymentReviewFilterDefaults);
    Object.assign(appliedPaymentReviewFilterModel, paymentReviewFilterDefaults);
  }
  selectedRowKeys.value = [];
  void loadWorkbench();
}

function handleTransfer(ids: string[]) {
  if (!ids.length) {
    message.warning('请先选择要转交的任务');
    return;
  }
  transferTaskIds.value = ids;
  transferUserId.value = undefined;
  transferVisible.value = true;
}

async function submitTransfer() {
  if (!transferTaskIds.value.length) return;
  if (!transferUserId.value) {
    message.warning('请选择被转交人');
    return;
  }
  transferSubmitting.value = true;
  try {
    await transferSeServiceTask({
      assigneeUserId: transferUserId.value,
      ids: transferTaskIds.value,
    });
    message.success('转交成功');
    transferVisible.value = false;
    await refreshSeaExportAfterAction();
  } finally {
    transferSubmitting.value = false;
  }
}

function handleComplete(ids: string[]) {
  if (!ids.length) {
    message.warning('请先选择要完成的任务');
    return;
  }
  Modal.confirm({
    title: '确认完成',
    content: `确定完成选中的 ${ids.length} 条任务吗？`,
    async onOk() {
      await Promise.all(ids.map((id) => completeSeServiceTask({ id })));
      message.success('任务已完成');
      if (isSeaExportTab.value) {
        await refreshSeaExportAfterAction();
        return;
      }
      await loadWorkbench();
    },
  });
}

function handleOpenSeaExport(seaExportId: string) {
  if (!seaExportId) return;
  if (activeServiceTab.value === 'ar-ap-review') {
    const [transportOrderId, entityId] = seaExportId.split('::');
    if (!transportOrderId || !entityId) return;
    void router.push(
      `/audit-approval/expense-review/${transportOrderId}/expense-detail/${entityId}`,
    );
    return;
  }
  if (activeServiceTab.value === 'payment-review') {
    void router.push({
      name: 'PaymentApplicationEdit',
      params: { id: seaExportId },
    });
    return;
  }
  void router.push({
    name: 'SeaExportEdit',
    params: { id: seaExportId },
  });
}

async function handleSeaExportRefresh() {
  if (isSeaExportTab.value) {
    await refreshSeaExportAfterAction();
    return;
  }
  await loadWorkbench();
}

useRefreshListOnFormReturn('Workspace', () => {
  if (isSeaExportTab.value) {
    void refreshSeaExportAfterAction();
  }
});

onMounted(() => {
  void Promise.all([loadServiceTypeEnumMap(), loadWorkbench()]);
});
</script>

<template>
  <div class="workbench-page">
    <WorkbenchTopNav v-model="activeServiceTab" :tabs="serviceTabs" />
    <template v-if="isSeaExportTab || isReviewTab">
      <WorkbenchFilterBar
        v-if="isSeaExportTab"
        :model-value="filterModel"
        :active-processing-tab="activeProcessingTab"
        :processing-tabs="processingTabs"
        @update:model-value="Object.assign(filterModel, $event)"
        @update:active-processing-tab="activeProcessingTab = $event"
        @reset="handleReset"
        @search="handleSearch"
      />
      <WorkbenchReviewFilterBar
        v-else
        :active-processing-tab="activeProcessingTab"
        :mode="reviewFilterMode"
        :model-value="
          activeServiceTab === 'ar-ap-review'
            ? arApReviewFilterModel
            : paymentReviewFilterModel
        "
        :processing-tabs="processingTabs"
        @update:active-processing-tab="activeProcessingTab = $event"
        @update:model-value="
          activeServiceTab === 'ar-ap-review'
            ? Object.assign(arApReviewFilterModel, $event)
            : Object.assign(paymentReviewFilterModel, $event)
        "
        @reset="handleReset"
        @search="handleSearch"
      />
      <div v-if="isSeaExportTab" class="workbench-port-wrap">
        <WorkbenchPortHeader
          :active-port="activePort"
          :active-port-meta="activePortMeta"
          :ports="allPortTabs"
          @update:active-port="handlePortChange"
        />
      </div>
    </template>
    <div class="workbench-layout">
      <template v-if="isSeaExportTab">
        <main class="workbench-main">
          <WorkbenchEmergencyQueue :tasks="emergencyTasks" />
          <WorkbenchBusinessTable
            :enable-task-actions="true"
            :dynamic-columns="seaExportDynamicColumns"
            :loading="loading"
            :pagination="seaExportPagination"
            :pagination-page-size-options="SEA_EXPORT_PAGE_SIZE_OPTIONS"
            :rows="displayBusinessRows"
            :selected-row-keys="selectedRowKeys"
            :stage-steps="displayStageSteps"
            :active-stage-key="activeStageKey"
            @update:selected-row-keys="selectedRowKeys = $event"
            @update:active-stage-key="handleStageChange"
            @pagination-change="handleSeaExportPaginationChange"
            @refresh="handleSeaExportRefresh"
            @transfer="handleTransfer"
            @complete="handleComplete"
            @open-sea-export="handleOpenSeaExport"
          />
        </main>
        <WorkbenchExceptionPanel :summary="exceptionSummary" />
      </template>
      <template v-else-if="isReviewTab">
        <main class="workbench-main workbench-main--review">
          <WorkbenchBusinessTable
            :enable-task-actions="false"
            :loading="loading"
            :rows="displayBusinessRows"
            :selected-row-keys="selectedRowKeys"
            :stage-steps="displayStageSteps"
            @update:selected-row-keys="selectedRowKeys = $event"
            @update:active-stage-key="activeStageKey = $event"
            @refresh="loadWorkbench"
            @transfer="handleTransfer"
            @complete="handleComplete"
            @open-sea-export="handleOpenSeaExport"
          />
        </main>
      </template>
      <div v-else class="workbench-coming-soon">该工作台模块暂未对接</div>
    </div>

    <Modal
      :open="transferVisible"
      title="批量转交任务"
      :confirm-loading="transferSubmitting"
      @update:open="transferVisible = $event"
      @ok="submitTransfer"
    >
      <div class="transfer-modal">
        <div class="transfer-modal__desc">
          共选择 <strong>{{ transferTaskIds.length }}</strong> 条任务
        </div>
        <div class="transfer-modal__field">
          <label class="transfer-modal__label">被转交人</label>
          <UserSelect
            v-model="transferUserId"
            :selected-items="[]"
            label-key="nickName"
            placeholder="请选择用户"
          />
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.workbench-page {
  min-height: calc(100vh - 104px);
  background: #f7f8fa;
}

.workbench-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  padding-top: 16px;
  margin-right: 20px;
}

.workbench-port-wrap {
  padding: 16px 20px 0;
}

.workbench-main {
  flex: 1;
  min-width: 760px;
  margin-left: 20px;
}

.workbench-main--review {
  margin-bottom: 20px;
}

.workbench-coming-soon {
  display: grid;
  flex: 1;
  place-items: center;
  min-height: 280px;
  margin: 0 20px;
  font-size: 16px;
  color: #8b93a5;
  background: #fff;
  border-radius: 8px;
}

.transfer-modal__desc {
  margin-bottom: 12px;
  color: #555d6d;
}

.transfer-modal__field {
  display: flex;
  gap: 10px;
  align-items: center;
}

.transfer-modal__label {
  flex: none;
  width: 68px;
  color: #181b20;
}

@media (max-width: 1400px) {
  .workbench-layout {
    flex-direction: column;
  }

  .workbench-main {
    min-width: 100%;
    max-width: 100%;
  }
}
</style>
