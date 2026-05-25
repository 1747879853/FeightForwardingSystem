<script lang="ts">
export default {
  name: 'WorkbenchBusinessTable',
};
</script>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import type { BusinessRow, StageStep } from '../../workbench-data';

interface Props {
  rows: BusinessRow[];
  selectedRowKeys: string[];
  stageSteps: StageStep[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:selectedRowKeys': [string[]];
  'update:activeStageKey': [string];
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

const allSelected = computed(
  () =>
    props.rows.length > 0 && props.selectedRowKeys.length === props.rows.length,
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

function statusText(status: BusinessRow['status']) {
  return status === 'urgent'
    ? '紧急待审'
    : status === 'supplement'
      ? '补充资料'
      : '待审';
}

function onToggleAll(event: Event) {
  const target = event.target as HTMLInputElement | null;
  toggleAll(Boolean(target?.checked));
}

function onToggleOne(id: string, event: Event) {
  const target = event.target as HTMLInputElement | null;
  toggleOne(id, Boolean(target?.checked));
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
          <template v-for="(step, index) in stageStepsView" :key="step.key">
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
          </template>
        </div>
      </div>
      <div class="table-card__actions">
        <button class="btn btn-light" type="button">导出</button>
        <button class="btn btn-primary" type="button">批量放舱处理</button>
      </div>
    </header>

    <div class="table-wrap">
      <table class="business-table">
        <thead>
          <tr>
            <th class="checkbox-col">
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
            <th>状态</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td class="checkbox-col">
              <input
                :checked="selectedRowKeys.includes(row.id)"
                type="checkbox"
                @change="onToggleOne(row.id, $event)"
              />
            </td>
            <td>
              <a class="booking-link" href="#">{{ row.bookingNo }}</a>
            </td>
            <td>{{ row.vesselVoyage }}</td>
            <td>{{ row.route }}</td>
            <td>{{ row.containerInfo }}</td>
            <td>{{ row.etd }}</td>
            <td>
              <span :class="['status-tag', `is-${row.status}`]">
                {{ statusText(row.status) }}
              </span>
            </td>
            <td class="action-col">
              <button class="detail-btn" type="button">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
}

.btn {
  height: 32px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
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

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 22px;
  padding: 0 8px;
  font-size: 10px;
  color: #fff;
  border-radius: 11px;
}

.status-tag.is-pending {
  background: #bfc8d4;
}

.status-tag.is-supplement {
  background: #f59f00;
}

.status-tag.is-urgent {
  background: #eb4747;
}

.action-col {
  padding-right: 16px;
  text-align: right;
}

.detail-btn {
  font-size: 12px;
  font-weight: 700;
  color: #258cf4;
  cursor: pointer;
  background: transparent;
  border: 0;
}
</style>
