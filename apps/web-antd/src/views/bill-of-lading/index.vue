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
import DetailModal from './detail-modal.vue';
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
    <div class="mb-3 grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
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
            :class="{ 'is-hot': (counts?.overdueUnReceivedCount ?? 0) > 0 }"
            >{{ counts?.overdueUnReceivedCount ?? '—' }}</strong
          >
        </span>
      </button>
      <button
        v-access:code="'Admin.BillOfLading.Audit'"
        type="button"
        class="bill-stat bill-stat--audit"
        @click="router.push('/audit-approval/bill-of-lading-review')"
      >
        <span class="bill-stat__icon">
          <IconifyIcon icon="lucide:clipboard-check" />
        </span>
        <span class="bill-stat__main">
          <span class="bill-stat__label">待我审核</span>
          <strong
            class="bill-stat__value"
            :class="{ 'is-hot': (counts?.pendingAuditCount ?? 0) > 0 }"
            >{{ counts?.pendingAuditCount ?? '—' }}</strong
          >
        </span>
        <IconifyIcon class="bill-stat__go" icon="lucide:arrow-up-right" />
      </button>
    </div>
    <div class="flex min-h-0 flex-1 gap-3 overflow-hidden">
      <div class="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        <Grid>
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
  --stat-color: hsl(var(--primary));
  --stat-soft: hsl(var(--primary) / 10%);
  --stat-icon-bg: hsl(var(--primary) / 12%);

  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-width: 0;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.bill-stat--pending {
  --stat-color: #13c2c2;
  --stat-soft: rgb(19 194 194 / 10%);
  --stat-icon-bg: rgb(19 194 194 / 14%);
}

.bill-stat--overdue {
  --stat-color: #ff4d4f;
  --stat-soft: rgb(255 77 79 / 10%);
  --stat-icon-bg: rgb(255 77 79 / 12%);
}

.bill-stat--audit {
  --stat-color: #d48806;
  --stat-soft: rgb(250 173 20 / 14%);
  --stat-icon-bg: rgb(250 173 20 / 18%);
}

.bill-stat:hover {
  border-color: color-mix(in srgb, var(--stat-color) 42%, hsl(var(--border)));
  box-shadow: 0 6px 16px rgb(15 23 42 / 7%);
}

.bill-stat.is-active {
  background: var(--stat-soft);
  border-color: var(--stat-color);
  box-shadow: inset 3px 0 0 var(--stat-color);
}

.bill-stat:focus-visible {
  outline: 2px solid var(--stat-color);
  outline-offset: 2px;
}

.bill-stat__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: var(--stat-color);
  background: var(--stat-icon-bg);
  border-radius: 10px;
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
  font-size: 13px;
  line-height: 1.2;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.bill-stat__value {
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: hsl(var(--foreground));
}

.bill-stat__value.is-hot {
  color: var(--stat-color);
}

.bill-stat__go {
  flex: none;
  font-size: 16px;
  color: hsl(var(--muted-foreground));
}

.bill-stat--audit:hover .bill-stat__go {
  color: var(--stat-color);
}
</style>
