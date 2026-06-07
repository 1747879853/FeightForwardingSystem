<script lang="ts" setup>
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';
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
  getSeServiceTaskPagedList,
  transferSeServiceTask,
} from '#/api/sea-export/se-service-task-admin';
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
const rawGroups = ref<SeServiceTaskAdminApi.SeServiceTaskConfigGroupDto[]>([]);
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

function matchEtdRange(
  etd: string | undefined,
  etdRange: typeof appliedFilterModel.etdRange,
) {
  if (!etdRange || !etdRange[0] || !etdRange[1]) return true;
  if (!etd) return false;
  const etdDate = dayjs(etd);
  if (!etdDate.isValid()) return false;
  const [start, end] = etdRange;
  return (
    !etdDate.isBefore(dayjs(start), 'day') &&
    !etdDate.isAfter(dayjs(end), 'day')
  );
}

function matchTask(task: SeServiceTaskAdminApi.SeServiceTaskDto) {
  const status = activeProcessingTab.value === 'processed' ? 1 : 0;
  if (task.serviceTaskStatus !== status) return false;

  const seaExport = task.seaExport;
  const transportOrder = seaExport?.transportOrder;
  if (
    appliedFilterModel.clientId &&
    String(transportOrder?.clientId ?? '') !==
      String(appliedFilterModel.clientId)
  ) {
    return false;
  }
  if (
    appliedFilterModel.carrierId != null &&
    seaExport?.carrierId !== appliedFilterModel.carrierId
  ) {
    return false;
  }
  if (
    appliedFilterModel.podId != null &&
    seaExport?.podId !== appliedFilterModel.podId
  ) {
    return false;
  }
  const mblKeyword = appliedFilterModel.mblNum.trim().toLowerCase();
  if (
    mblKeyword &&
    !String(transportOrder?.mblNum ?? '')
      .toLowerCase()
      .includes(mblKeyword)
  ) {
    return false;
  }
  if (!matchEtdRange(transportOrder?.etd, appliedFilterModel.etdRange)) {
    return false;
  }

  return true;
}

function filterGroups(
  source: SeServiceTaskAdminApi.SeServiceTaskConfigGroupDto[],
) {
  return source.reduce<SeServiceTaskAdminApi.SeServiceTaskConfigGroupDto[]>(
    (result, group) => {
      const configItems: SeServiceTaskAdminApi.SeServiceConfigItemTaskGroupDto[] =
        [];
      for (const item of group.seServiceConfigItems ?? []) {
        const tasks = (item.seServiceTasks ?? []).filter(matchTask);
        if (!tasks.length) continue;
        configItems.push({
          ...item,
          seServiceTasks: tasks,
        });
      }

      if (!configItems.length) return result;

      const taskCount = configItems.reduce(
        (count, item) => count + (item.seServiceTasks?.length ?? 0),
        0,
      );
      result.push({
        ...group,
        seServiceConfigItems: configItems,
        taskCount,
      });
      return result;
    },
    [],
  );
}

const groups = computed<SeServiceTaskAdminApi.SeServiceTaskConfigGroupDto[]>(
  () => filterGroups(rawGroups.value),
);

const allPortTabs = computed<PortTab[]>(() => groups.value.map(toPortTab));

const activePortMeta = computed(
  () =>
    allPortTabs.value.find((item) => item.key === activePort.value) ?? {
      count: 0,
      key: '',
      label: '暂无港口',
    },
);

const activePortGroup = computed(() => {
  if (!activePort.value) return groups.value[0];
  return groups.value.find((item) => {
    const key = String(item.polId ?? item.seServiceConfigId);
    return key === activePort.value;
  });
});

const currentConfigItems = computed(
  () => activePortGroup.value?.seServiceConfigItems ?? [],
);

function configItemKey(
  item: SeServiceTaskAdminApi.SeServiceConfigItemTaskGroupDto,
  index: number,
) {
  return item.id ? String(item.id) : `assigned-${index}`;
}

const stageSteps = computed<StageStep[]>(() =>
  currentConfigItems.value.map((item, index) => ({
    count: item.seServiceTasks?.length ?? 0,
    key: configItemKey(item, index),
    label: serviceTypeLabel(item.serviceType, serviceTypeTextMap.value),
  })),
);

const activeConfigItem = computed(() => {
  const found = currentConfigItems.value.find(
    (item, index) => configItemKey(item, index) === activeStageKey.value,
  );
  return found ?? currentConfigItems.value[0];
});

const seaExportDynamicColumns = computed(() =>
  buildDynamicColumns(
    activeConfigItem.value?.seServiceShows,
    seaExportPropLabelMap.value,
  ),
);

const businessRows = computed(() => {
  const tasks = activeConfigItem.value?.seServiceTasks ?? [];
  return tasks.map((task) => {
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
      status: 'pending' as const,
      taskUsersText:
        users
          .map((item) => item.userNickName)
          .filter(Boolean)
          .join('、') || '--',
      vesselVoyage:
        [seaExport?.vessel, seaExport?.innerVoyno]
          .filter(Boolean)
          .join(' / ') || '--',
    };
  });
});

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
    const firstStage = stageSteps.value[0];
    activeStageKey.value = firstStage ? firstStage.key : '';
  }
}

watch([groups, activePort], () => {
  ensureActiveStage();
});

watch(activeStageKey, () => {
  selectedRowKeys.value = [];
});

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

watch(allPortTabs, (tabs) => {
  if (!tabs.length) {
    activePort.value = '';
    selectedRowKeys.value = [];
    return;
  }
  if (!tabs.some((item) => item.key === activePort.value)) {
    activePort.value = tabs[0]?.key ?? '';
    selectedRowKeys.value = [];
  }
});

async function loadSeaExportWorkbench() {
  const [etdStartRaw, etdEndRaw] = appliedFilterModel.etdRange ?? [];
  const etdStartDate = etdStartRaw ? dayjs(etdStartRaw) : null;
  const etdEndDate = etdEndRaw ? dayjs(etdEndRaw) : null;
  const etdStart = etdStartDate?.isValid()
    ? etdStartDate.format('YYYY-MM-DD')
    : undefined;
  const etdEnd = etdEndDate?.isValid()
    ? etdEndDate.format('YYYY-MM-DD')
    : undefined;
  const mblNum = appliedFilterModel.mblNum.trim();
  loading.value = true;
  try {
    const result = await getSeServiceTaskPagedList({
      carrierId: appliedFilterModel.carrierId,
      clientId: appliedFilterModel.clientId,
      etdEnd,
      etdStart,
      isAssigned: false,
      mblNum: mblNum || undefined,
      podId: appliedFilterModel.podId,
      serviceTaskStatus: activeProcessingTab.value === 'processed' ? 1 : 0,
    });
    rawGroups.value = result.items ?? [];
    selectedRowKeys.value = [];
  } finally {
    loading.value = false;
  }
}

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
    await loadSeaExportWorkbench();
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
    await loadWorkbench();
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
          @update:active-port="activePort = $event"
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
