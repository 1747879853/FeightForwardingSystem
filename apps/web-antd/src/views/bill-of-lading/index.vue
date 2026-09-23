<script setup lang="ts">
import type { BillAction, BillCount, BillOfLading } from '#/api/bill-of-lading';
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import { Button } from 'ant-design-vue';
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
  actions.filter((action) =>
    selected.value.length
      ? selected.value.every((row) => canAct(row, action))
      : !action.startsWith('Cancel') && action !== 'UnSubmit',
  ),
);
const enabledActions = computed(
  () =>
    new Set(
      actions.filter((action) => !selectionError(selected.value, action)),
    ),
);
const queryList = createPagedListQuery(
  async (params) => {
    selected.value = [];
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
    proxyConfig: { autoLoad: false, ajax: { query: queryList } },
    toolbarConfig: { custom: true, refresh: { code: 'query' }, zoom: true },
  },
});
function syncSelection() {
  selected.value = gridApi.grid.getCheckboxRecords();
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
      <Button
        class="!h-auto !py-4"
        :type="cardFilter === 'all' ? 'primary' : 'default'"
        @click="selectCard('all')"
        >全部提单
        <strong class="ml-3 text-xl">{{
          counts?.totalCount ?? '—'
        }}</strong></Button
      >
      <Button
        class="!h-auto !py-4"
        :type="cardFilter === 'pending' ? 'primary' : 'default'"
        @click="selectCard('pending')"
        >待签出
        <strong class="ml-3 text-xl">{{
          counts?.pendingSignOutCount ?? '—'
        }}</strong></Button
      >
      <Button
        class="!h-auto !py-4"
        :type="cardFilter === 'overdue' ? 'primary' : 'default'"
        @click="selectCard('overdue')"
        >超期未收
        <strong class="ml-3 text-xl">{{
          counts?.overdueUnReceivedCount ?? '—'
        }}</strong></Button
      >
      <Button
        v-access:code="'Admin.BillOfLading.Audit'"
        class="!h-auto !py-4"
        @click="router.push('/audit-approval/bill-of-lading-review')"
        >待我审核
        <strong class="ml-3 text-xl">{{
          counts?.pendingAuditCount ?? '—'
        }}</strong></Button
      >
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
            <Button
              v-for="action in visibleActions"
              :key="action"
              class="mr-2 inline-flex items-center"
              v-access:code="actionPermission(action)"
              :disabled="!enabledActions.has(action)"
              @click="actionModal?.open(action, selected)"
              >{{ actionLabels[action] }}</Button
            >
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
