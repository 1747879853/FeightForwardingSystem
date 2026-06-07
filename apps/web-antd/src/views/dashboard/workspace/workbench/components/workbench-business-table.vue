<script lang="ts">
export default {
  name: 'WorkbenchBusinessTable',
};
</script>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { Spin } from 'ant-design-vue';

import type { BusinessRow, StageStep } from '../../workbench-data';
import type { SeServiceShowColumn } from '../se-service-show-columns';

interface Props {
  dynamicColumns?: SeServiceShowColumn[];
  enableTaskActions?: boolean;
  loading?: boolean;
  rows: BusinessRow[];
  selectedRowKeys: string[];
  stageSteps: StageStep[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:selectedRowKeys': [string[]];
  'update:activeStageKey': [string];
  transfer: [string[]];
  complete: [string[]];
  refresh: [];
  'open-sea-export': [string];
}>();

function resolveInitialStageKey(steps: StageStep[]) {
  return steps.find((item) => item.active)?.key ?? steps[0]?.key ?? '';
}

const activeStageKey = ref(resolveInitialStageKey(props.stageSteps));

watch(
  () => props.stageSteps,
  (steps) => {
    if (!steps.some((item) => item.key === activeStageKey.value)) {
      activeStageKey.value = resolveInitialStageKey(steps);
    }
  },
);

const stageStepsView = computed(() =>
  props.stageSteps.map((step) => ({
    ...step,
    active: step.key === activeStageKey.value,
  })),
);

const activeSubLabel = computed(() => {
  const step = props.stageSteps.find(
    (item) => item.key === activeStageKey.value,
  );
  if (!step) return '';
  return step.subLabel ?? `${step.label}`;
});

function selectStage(key: string) {
  if (key === activeStageKey.value) return;
  activeStageKey.value = key;
  emit('update:activeStageKey', key);
}

type StageStepView = StageStep & { active: boolean };

function getStageStepState(step: StageStepView) {
  return step.active ? 'active' : 'upcoming';
}

function isChevronStepLast(index: number, total: number) {
  return total > 1 && index === total - 1;
}

const showSelection = computed(() => props.enableTaskActions !== false);

const useDynamicColumns = computed(() => props.dynamicColumns !== undefined);

const tableDynamicColumns = computed(() => props.dynamicColumns ?? []);

const tableColspan = computed(() => {
  const fixedCount = 3;
  if (useDynamicColumns.value) {
    return (
      (showSelection.value ? 1 : 0) +
      fixedCount +
      tableDynamicColumns.value.length
    );
  }
  return showSelection.value ? 8 : 7;
});

const allSelected = computed(
  () =>
    showSelection.value &&
    props.rows.length > 0 &&
    props.selectedRowKeys.length === props.rows.length,
);

const selectedRows = computed(() =>
  !showSelection.value
    ? []
    : props.rows.filter((item) => props.selectedRowKeys.includes(item.id)),
);

function toggleAll(checked: boolean) {
  emit(
    'update:selectedRowKeys',
    checked ? props.rows.map((item) => item.id) : [],
  );
}

function toggleOne(id: string, checked: boolean) {
  const next = checked
    ? [...props.selectedRowKeys, id]
    : props.selectedRowKeys.filter((item) => item !== id);
  emit('update:selectedRowKeys', next);
}

function onToggleAll(event: Event) {
  const target = event.target as HTMLInputElement | null;
  toggleAll(Boolean(target?.checked));
}

function onToggleOne(id: string, event: Event) {
  const target = event.target as HTMLInputElement | null;
  toggleOne(id, Boolean(target?.checked));
}

function handleBatchTransfer() {
  if (!selectedRows.value.length) return;
  emit(
    'transfer',
    selectedRows.value
      .filter((item) => item.serviceTaskStatus === 0)
      .map((item) => item.id),
  );
}

function handleBatchComplete() {
  if (!selectedRows.value.length) return;
  emit(
    'complete',
    selectedRows.value
      .filter((item) => item.serviceTaskStatus === 0)
      .map((item) => item.id),
  );
}

function handleOpenSeaExport(seaExportId: string, event: MouseEvent) {
  event.preventDefault();
  if (!seaExportId) return;
  emit('open-sea-export', seaExportId);
}
</script>

<template>
  <section class="table-card">
    <header class="table-card__header">
      <div class="table-card__title-group">
        <div class="table-card__heading">
          <h3 class="table-card__title">业务列表</h3>
          <span class="table-card__sub">{{ activeSubLabel }}</span>
        </div>
        <span class="table-card__divider" aria-hidden="true" />
        <div class="service-chevron-flow">
          <button
            v-for="(step, index) in stageStepsView"
            :key="step.key"
            type="button"
            class="chevron-step"
            :class="[
              `chevron-step--${getStageStepState(step)}`,
              {
                'chevron-step--first': index === 0,
                'chevron-step--last': isChevronStepLast(
                  index,
                  stageStepsView.length,
                ),
              },
            ]"
            :aria-current="step.active ? 'step' : undefined"
            @click="selectStage(step.key)"
          >
            <div class="chevron-step__inner">
              <span class="chevron-step__label">{{ step.label }}</span>
              <span v-if="step.count > 0" class="chevron-step__count">
                {{ step.count }}
              </span>
            </div>
          </button>
        </div>
      </div>
      <div class="table-card__actions">
        <button class="btn btn-light" type="button" @click="emit('refresh')">
          刷新
        </button>
        <button
          v-if="showSelection"
          class="btn btn-light"
          type="button"
          :disabled="!selectedRows.length"
          @click="handleBatchTransfer"
        >
          批量转交
        </button>
        <button
          v-if="showSelection"
          class="btn btn-primary"
          type="button"
          :disabled="!selectedRows.length"
          @click="handleBatchComplete"
        >
          批量完成
        </button>
      </div>
    </header>

    <Spin :spinning="Boolean(loading)">
      <div class="table-wrap">
        <table class="business-table">
          <thead>
            <tr>
              <th v-if="showSelection" class="checkbox-col">
                <input
                  :checked="allSelected"
                  type="checkbox"
                  @change="onToggleAll"
                />
              </th>
              <th>委托单号</th>
              <template v-if="useDynamicColumns">
                <th v-for="column in tableDynamicColumns" :key="column.key">
                  {{ column.label }}
                </th>
              </template>
              <template v-else>
                <th>船名/航次</th>
                <th>起运/目的港</th>
                <th>箱量/箱型</th>
                <th>ETD</th>
              </template>
              <th>处理人</th>
              <th>被转交人</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length">
              <td class="table-empty" :colspan="tableColspan">暂无任务</td>
            </tr>
            <tr v-for="row in rows" :key="row.id">
              <td v-if="showSelection" class="checkbox-col">
                <input
                  :checked="selectedRowKeys.includes(row.id)"
                  type="checkbox"
                  @change="onToggleOne(row.id, $event)"
                />
              </td>
              <td>
                <a
                  class="booking-link"
                  href="#"
                  @click="handleOpenSeaExport(row.seaExportId, $event)"
                >
                  {{ row.bookingNo }}
                </a>
              </td>
              <template v-if="useDynamicColumns">
                <td v-for="column in tableDynamicColumns" :key="column.key">
                  {{ column.getValue(row) }}
                </td>
              </template>
              <template v-else>
                <td>{{ row.vesselVoyage }}</td>
                <td>{{ row.route }}</td>
                <td>{{ row.containerInfo }}</td>
                <td>{{ row.etd }}</td>
              </template>
              <td>{{ row.taskUsersText || '--' }}</td>
              <td>{{ row.assigneeUserName || '--' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Spin>
  </section>
</template>

<style scoped>
.table-card {
  margin-top: 24px;
  overflow: hidden;
  background: #fff;
  border: 0.5px solid #eff0f2;
  border-radius: 16px;
  box-shadow: 0 2px 8px 0 rgb(150 199 217 / 6%);
}

.table-card__header {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  min-height: 63px;
  padding: 12px 24px 11px;
  border-bottom: 1px solid #f3f4f6;
}

.table-card__title-group {
  display: flex;
  gap: 14px;
  align-items: center;
}

.table-card__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.table-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  color: #181b20;
}

.table-card__sub {
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  color: #258cf4;
}

.table-card__divider {
  flex-shrink: 0;
  width: 1px;
  height: 28px;
  background: #f3f4f6;
}

.service-chevron-flow {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: auto hidden;
  border-radius: 8px;
}

.chevron-step {
  position: relative;
  display: flex;
  flex: 0 0 140px;
  align-items: center;
  justify-content: center;
  width: 140px;
  min-width: 140px;
  height: 36px;
  padding: 0 8px 0 16px;
  margin: 0 0 0 -8px;
  font: inherit;
  color: inherit;
  appearance: none;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgb(255 255 255 / 20%);
  clip-path: polygon(
    0% 0%,
    calc(100% - 12px) 0%,
    100% 50%,
    calc(100% - 12px) 100%,
    0% 100%,
    12px 50%
  );
  transition:
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.chevron-step--first {
  padding-left: 12px;
  margin-left: 0;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  clip-path: polygon(
    0% 0%,
    calc(100% - 12px) 0%,
    100% 50%,
    calc(100% - 12px) 100%,
    0% 100%
  );
}

.chevron-step--last {
  padding-right: 12px;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 12px 50%);
}

.chevron-step:hover {
  z-index: 30;
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
  filter: brightness(1.03);
}

.chevron-step--active {
  color: #00325b;
  background: #d1e9ff;
}

.chevron-step--upcoming {
  color: #414752;
  background: #f2f2f2;
  opacity: 0.8;
}

.chevron-step__inner {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  height: 16px;
}

.chevron-step__label {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.chevron-step__count {
  box-sizing: border-box;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  background: rgb(0 0 0 / 12%);
  border-radius: 8px;
}

.chevron-step--active .chevron-step__count {
  color: #00325b;
  background: rgb(0 50 91 / 15%);
}

.table-card__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.btn-light {
  min-width: 62px;
  color: #181b20;
  background: #fff;
  border-color: #dee1e6;
}

.btn-primary {
  min-width: 80px;
  color: #fff;
  background: #258cf4;
  box-shadow: 0 2px 4px rgb(37 140 244 / 20%);
}

.table-wrap {
  overflow-x: auto;
}

.business-table {
  width: 100%;
  font-size: 12px;
  color: #181b20;
  border-collapse: collapse;
}

.business-table th {
  height: 48px;
  font-weight: 700;
  color: #555d6d;
  text-align: left;
  white-space: nowrap;
  background: rgb(243 244 246 / 50%);
  border-bottom: 1px solid #f3f4f6;
}

.business-table tbody tr {
  transition: background-color 0.15s ease;
}

.business-table tbody tr:hover td {
  background: rgb(37 140 244 / 5%);
}

.business-table td {
  height: 65px;
  white-space: nowrap;
  border-bottom: 1px solid #f3f4f6;
}

.checkbox-col {
  width: 36px;
  padding-left: 16px;
  line-height: 0;
  vertical-align: middle;
}

.checkbox-col input[type='checkbox'] {
  display: block;
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
}

.booking-link {
  font-weight: 500;
  color: #258cf4;
  text-decoration: none;
}

.table-empty {
  height: 72px;
  color: #8b93a5;
  text-align: center;
}
</style>
