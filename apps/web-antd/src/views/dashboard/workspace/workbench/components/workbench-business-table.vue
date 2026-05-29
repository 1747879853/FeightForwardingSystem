<script lang="ts">
export default {
  name: 'WorkbenchBusinessTable',
};
</script>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { Spin } from 'ant-design-vue';

import type { BusinessRow, StageStep } from '../../workbench-data';

interface Props {
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
  return step.subLabel ?? `${step.label}控制节点`;
});

function selectStage(key: string) {
  if (key === activeStageKey.value) return;
  activeStageKey.value = key;
  emit('update:activeStageKey', key);
}

const showSelection = computed(() => props.enableTaskActions !== false);

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
        <div class="stage-steps">
          <span
            v-for="(step, index) in stageStepsView"
            :key="step.key"
            class="stage-steps__item"
          >
            <button
              type="button"
              :class="['stage-step', { 'is-active': step.active }]"
              :aria-current="step.active ? 'step' : undefined"
              @click="selectStage(step.key)"
            >
              {{ step.label }}
              <span class="stage-step__count">{{ step.count }}</span>
            </button>
            <IconifyIcon
              v-if="index !== stageStepsView.length - 1"
              class="stage-steps__arrow"
              icon="formkit:right"
              aria-hidden="true"
            />
          </span>
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
              <th>船名/航次</th>
              <th>起运/目的港</th>
              <th>箱量/箱型</th>
              <th>ETD</th>
              <th>处理人</th>
              <th>被转交人</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length">
              <td class="table-empty" :colspan="showSelection ? 8 : 7">
                暂无任务
              </td>
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
              <td>{{ row.vesselVoyage }}</td>
              <td>{{ row.route }}</td>
              <td>{{ row.containerInfo }}</td>
              <td>{{ row.etd }}</td>
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
  height: 32px;
  background: #f3f4f6;
}

.stage-steps {
  display: flex;
  gap: 4px;
  align-items: center;
}

.stage-steps__item {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.stage-step {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: #555d6d;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.stage-step:hover:not(.is-active) {
  background: rgb(85 93 109 / 6%);
}

.stage-step.is-active {
  color: #258cf4;
  background: rgb(37 140 244 / 10%);
  border: 1px solid rgb(37 140 244 / 20%);
}

.stage-step__count {
  min-width: 20px;
  height: 17px;
  font-size: 10px;
  line-height: 17px;
  color: #555d6d;
  text-align: center;
  background: rgb(85 93 109 / 10%);
  border-radius: 8px;
}

.stage-step.is-active .stage-step__count {
  color: #fff;
  background: #258cf4;
}

.stage-steps__arrow {
  flex-shrink: 0;
  font-size: 12px;
  color: rgb(85 93 109 / 30%);
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
