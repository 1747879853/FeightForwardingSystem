<script setup lang="ts">
import type { BillAction, BillCount, BillOfLading } from '#/api/bill-of-lading';
import { computed, nextTick, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { Button, Tooltip } from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getBillCount, getBillGroups, getBillList } from '#/api/bill-of-lading';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { useTableConfigStore } from '#/store/table-config';
import { billGroupFields } from './grouping';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { buildAttachmentUrl } from '#/utils';
import {
  actionLabels,
  actionPermission,
  canAct,
  selectionError,
} from './rules';
import { billColumns, billSearchSchema, normalizeBillQuery } from './data';
import ActionModal from './action-modal.vue';
import CopyBillNo from './copy-bill-no.vue';
import DetailModal from './detail-modal.vue';
import MoneyCell from './money-cell.vue';
import StatusCell from './status-cell.vue';
defineOptions({ name: 'BillOfLadingList' });
const router = useRouter();
const actionModal = ref<InstanceType<typeof ActionModal>>();
const detailModal = ref<InstanceType<typeof DetailModal>>();
const selected = ref<BillOfLading[]>([]);
const counts = ref<BillCount>();
const cardFilter = ref<'all' | 'overdue' | 'pending'>('all');
const tableConfigStore = useTableConfigStore();
const GROUP_CONFIG_NAME = 'group_config_BillOfLadingList';
const grouping = useListGrouping({
  fields: billGroupFields,
  getGridApi: () => gridApi,
  fetchGroups: async (params, field) => {
    const items = await getBillGroups({ ...params, GroupField: field });
    return items.map((item) => ({
      ...item,
      logoUrl:
        item.logo?.url || item.logo?.fileUrl
          ? buildAttachmentUrl(item.logo.url || item.logo.fileUrl || '')
          : undefined,
    }));
  },
  persist: {
    load: async () => {
      await tableConfigStore.loadGroupConfigsOnce();
      const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
      if (!hit?.setting) return undefined;
      const parsed = JSON.parse(hit.setting) as { field?: number | null };
      return typeof parsed.field === 'number' ? parsed.field : undefined;
    },
    save: (field) => {
      const setting = JSON.stringify({ field: field ?? null });
      const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
      if (hit) {
        void tableConfigStore.editGroupConfig({
          id: hit.id,
          name: GROUP_CONFIG_NAME,
          setting,
        });
      } else {
        void tableConfigStore.addGroupConfig({
          name: GROUP_CONFIG_NAME,
          setting,
        });
      }
    },
  },
});
const actions = Object.keys(actionLabels) as BillAction[];
const visibleActions = computed(() =>
  actions.filter((action) => {
    const occasional = action.startsWith('Cancel') || action === 'UnSubmit';
    if (!selected.value.length) return !occasional;
    if (occasional) return selected.value.every((row) => canAct(row, action));
    return true;
  }),
);
const enabledActions = computed(
  () =>
    new Set(
      actions.filter((action) => !selectionError(selected.value, action)),
    ),
);
let selectionSnapshot: string[] = [];
const queryList = createPagedListQuery(
  async (params) => {
    const fromGrid = (
      (gridApi.grid?.getCheckboxRecords?.() ?? []) as BillOfLading[]
    ).map((row) => String(row.id));
    selectionSnapshot = [
      ...new Set([...selected.value.map((row) => String(row.id)), ...fromGrid]),
    ];
    return getBillList(params);
  },
  {
    mapParams: (params) =>
      grouping.decorateListParams({
        ...normalizeBillQuery(params),
        ...(cardFilter.value === 'pending'
          ? { Status: 4 }
          : cardFilter.value === 'overdue'
            ? { IsOverdueUnpaid: true }
            : {}),
      }),
  },
);
const [Grid, gridApi] = useVbenVxeGrid<BillOfLading>({
  formOptions: {
    schema: billSearchSchema(),
    submitOnChange: true,
    showCollapseButton: true,
    collapsed: true,
    compact: true,
    wrapperClass: 'grid-cols-4',
  },
  gridEvents: {
    checkboxChange: syncSelection,
    checkboxAll: syncSelection,
    cellDblclick: ({ row }: { row: BillOfLading }) =>
      detailModal.value?.open(row),
  },
  gridOptions: {
    columns: billColumns(),
    height: 'auto',
    rowConfig: { keyField: 'id', isHover: true },
    checkboxConfig: { highlight: true },
    pagerConfig: { enabled: true },
    proxyConfig: {
      autoLoad: false,
      ajax: { query: queryList, querySuccess: restoreSelection },
    },
    toolbarConfig: { custom: true, refresh: { code: 'query' }, zoom: true },
  },
});
function syncSelection() {
  selected.value = gridApi.grid.getCheckboxRecords();
}
async function restoreSelection() {
  if (!selectionSnapshot.length) return;
  const idSet = new Set(selectionSnapshot);
  selectionSnapshot = [];
  await nextTick();
  const grid = gridApi.grid;
  const rows = (grid?.getData?.() ?? []) as BillOfLading[];
  const matched = rows.filter((row) => idSet.has(String(row.id)));
  grid?.clearCheckboxRow?.();
  if (matched.length) grid?.setCheckboxRow?.(matched, true);
  selected.value = matched;
}
async function refresh() {
  grouping.refreshGroupData();
  await Promise.all([gridApi.query(), loadCounts()]);
}
async function loadCounts() {
  counts.value = await getBillCount();
}
function selectCard(value: typeof cardFilter.value) {
  cardFilter.value = value;
  gridApi.query();
}
function changeGrouping(value: number | undefined) {
  if (value === undefined) grouping.disable();
  else grouping.enableField(value);
}
function onDetailAction(payload: { action: BillAction; bill: BillOfLading }) {
  actionModal.value?.open(payload.action, [payload.bill]);
}
onMounted(async () => {
  await grouping.restorePersistedField();
  await Promise.all([gridApi.formApi.submitForm(), loadCounts()]);
});
let activated = false;
onActivated(() => {
  if (activated) refresh();
  activated = true;
});
</script>
<template>
  <Page auto-content-height content-class="flex min-h-0 flex-col">
    <div class="mb-2 grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
      <button
        type="button"
        class="bill-stat bill-stat--all"
        :class="{ 'is-active': cardFilter === 'all' }"
        :aria-pressed="cardFilter === 'all'"
        @click="selectCard('all')"
      >
        <span class="bill-stat__icon">
          <IconifyIcon icon="lucide:files" />
        </span>
        <span class="bill-stat__main">
          <span class="bill-stat__label">全部提单</span>
          <strong class="bill-stat__value">{{
            counts?.totalCount ?? '—'
          }}</strong>
        </span>
      </button>
      <button
        type="button"
        class="bill-stat bill-stat--pending"
        :class="{ 'is-active': cardFilter === 'pending' }"
        :aria-pressed="cardFilter === 'pending'"
        @click="selectCard('pending')"
      >
        <span class="bill-stat__icon">
          <IconifyIcon icon="lucide:file-output" />
        </span>
        <span class="bill-stat__main">
          <span class="bill-stat__label">待签出</span>
          <strong class="bill-stat__value">{{
            counts?.pendingSignOutCount ?? '—'
          }}</strong>
        </span>
      </button>
      <button
        type="button"
        class="bill-stat bill-stat--overdue"
        :class="{ 'is-active': cardFilter === 'overdue' }"
        :aria-pressed="cardFilter === 'overdue'"
        @click="selectCard('overdue')"
      >
        <span class="bill-stat__icon">
          <IconifyIcon icon="lucide:alarm-clock" />
        </span>
        <span class="bill-stat__main">
          <span class="bill-stat__label">超期未收</span>
          <strong
            class="bill-stat__value"
            :class="{ 'is-danger': (counts?.overdueUnReceivedCount ?? 0) > 0 }"
            >{{ counts?.overdueUnReceivedCount ?? '—' }}</strong
          >
        </span>
      </button>
      <button
        v-access:code="'Admin.BillOfLading.Audit'"
        type="button"
        class="bill-stat bill-stat--audit"
        aria-label="进入签出审核"
        @click="router.push('/audit-approval/bill-of-lading-review')"
      >
        <span class="bill-stat__icon">
          <IconifyIcon icon="lucide:clipboard-check" />
        </span>
        <span class="bill-stat__main">
          <span class="bill-stat__label">待我审核</span>
          <strong
            class="bill-stat__value"
            :class="{ 'is-warn': (counts?.pendingAuditCount ?? 0) > 0 }"
            >{{ counts?.pendingAuditCount ?? '—' }}</strong
          >
        </span>
        <span class="bill-stat__enter">
          进入
          <IconifyIcon icon="lucide:arrow-up-right" />
        </span>
      </button>
    </div>
    <div class="flex min-h-0 flex-1 gap-3 overflow-hidden">
      <div class="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        <Grid>
          <template #mblNum="{ row }">
            <CopyBillNo
              hide-icon
              :text="row.seaExport?.transportOrder?.mblNum"
            />
          </template>
          <template #blNum="{ row }">
            <CopyBillNo :text="row.seaExportSeparate?.blNum" />
          </template>
          <template #status="{ row }">
            <StatusCell :key="row.id" :row="row" />
          </template>
          <template #unReceivedAmount="{ row }">
            <MoneyCell
              :value="row.unReceivedAmount"
              :code="row.localCurrencyCode"
              :lines="row.currencies"
            />
          </template>
          <template #toolbar-actions>
            <GroupingTabs
              v-if="grouping.isGrouping.value"
              :items="grouping.groupItems.value"
              :selected-id="grouping.selectedItemId.value"
              :loading="grouping.loading.value"
              @select="grouping.selectItem"
            />
            <div v-else class="mr-1 pl-1 text-[1rem]">提单管理</div>
          </template>
          <template #toolbar-tools>
            <Tooltip
              v-for="action in visibleActions"
              :key="action"
              :title="
                enabledActions.has(action)
                  ? undefined
                  : selectionError(selected, action)
              "
            >
              <span class="mr-2 inline-flex">
                <Button
                  class="inline-flex items-center"
                  v-access:code="actionPermission(action)"
                  :disabled="!enabledActions.has(action)"
                  @click="actionModal?.open(action, selected)"
                  >{{ actionLabels[action] }}</Button
                >
              </span>
            </Tooltip>
            <GroupingSettings
              :fields="grouping.fields"
              :value="grouping.enabledField.value?.value"
              @change="changeGrouping"
            />
          </template>
        </Grid>
      </div>
    </div>
    <ActionModal ref="actionModal" @success="refresh" /><DetailModal
      ref="detailModal"
      @action="onDetailAction"
    />
  </Page>
</template>

<style scoped>
.bill-stat {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 72px;
  padding: 12px 16px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.bill-stat:hover {
  border-color: #d1d5db;
  box-shadow: 0 8px 18px rgb(15 23 42 / 8%);
  transform: translateY(-2px);
}

.bill-stat.is-active,
.bill-stat.is-active:hover {
  background: #fff;
  border-color: #2563eb;
  box-shadow:
    0 0 0 1px #2563eb,
    0 1px 2px rgb(15 23 42 / 4%);
}

.bill-stat.is-active:hover {
  box-shadow:
    0 0 0 1px #2563eb,
    0 8px 18px rgb(15 23 42 / 8%);
  transform: translateY(-2px);
}

.bill-stat:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.bill-stat__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  border-radius: 8px;
}

.bill-stat--all .bill-stat__icon {
  color: #2563eb;
  background: #eff6ff;
}

.bill-stat--pending .bill-stat__icon {
  color: #059669;
  background: #ecfdf5;
}

.bill-stat--overdue .bill-stat__icon {
  color: #dc2626;
  background: #fef2f2;
}

.bill-stat--audit .bill-stat__icon {
  color: #d97706;
  background: #fffbeb;
}

.bill-stat__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bill-stat__label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 16px;
  color: #6b7280;
  white-space: nowrap;
}

.bill-stat__value {
  font-family:
    'Segoe UI', Roboto, 'DIN Alternate', ui-sans-serif, system-ui, sans-serif;
  font-size: 26px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 28px;
  color: #111827;
}

.bill-stat__value.is-danger {
  color: #ef4444;
}

.bill-stat__value.is-warn {
  color: #d97706;
}

.bill-stat__enter {
  display: inline-flex;
  flex: none;
  gap: 2px;
  align-items: center;
  height: 22px;
  padding: 0 6px;
  font-size: 12px;
  line-height: 1;
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.bill-stat--audit:hover .bill-stat__enter {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.dark .bill-stat {
  background: hsl(var(--card));
  border-color: hsl(var(--border));
}

.dark .bill-stat.is-active,
.dark .bill-stat.is-active:hover {
  background: hsl(var(--card));
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.dark .bill-stat__label,
.dark .bill-stat__enter {
  color: hsl(var(--muted-foreground));
}

.dark .bill-stat__value {
  color: hsl(var(--foreground));
}

.dark .bill-stat__enter {
  background: transparent;
  border-color: hsl(var(--border));
}

.dark .bill-stat__value.is-danger {
  color: #f87171;
}

.dark .bill-stat__value.is-warn {
  color: #fbbf24;
}
</style>
