<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import { computed, ref } from 'vue';

import { Button, Drawer } from 'ant-design-vue';

import ReceiveSettlementForm from '../../settlement-management/receive-settlement/form.vue';
import ReceiveSettlementInvoiceForm from '../../settlement-management/receive-settlement/invoice-form.vue';
import CreateSettlementFeePanel from './create-settlement-fee-panel.vue';
import CreateSettlementInvoicePanel from './create-settlement-invoice-panel.vue';

const props = defineProps<{
  bankStatementAmount: number;
  bankStatementId: string;
  bankStatementNo?: string;
  currencyCode?: string;
  currencyId?: number;
  orgId?: number;
  otherSettledAmount: number;
  settlementId?: string;
  settlementName?: string;
}>();

const emit = defineEmits<{
  changed: [];
}>();

const open = ref(false);
const action = ref<'create' | 'edit'>('create');
const createMode = ref<'fee' | 'invoice'>('fee');
const editingRow = ref<BankStatementAdminApi.ReceiveSettlementListDto | null>(
  null,
);

const drawerTitle = computed(() => {
  if (action.value === 'create') {
    return createMode.value === 'fee'
      ? '新建核销 · 按费用'
      : '新建核销 · 按发票';
  }
  return editingRow.value?.settlementNo
    ? `收费核销 · ${editingRow.value.settlementNo}`
    : '编辑收费核销';
});

const isInvoiceEdit = computed(() => Number(editingRow.value?.type ?? 0) === 1);
const remainingAmount = computed(
  () => props.bankStatementAmount - props.otherSettledAmount,
);
const switchModeText = computed(() =>
  createMode.value === 'fee' ? '切换为按发票' : '切换为按费用',
);

function formatPlain(value: number) {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function openCreate(mode: 'fee' | 'invoice' = 'fee') {
  action.value = 'create';
  createMode.value = mode;
  editingRow.value = null;
  open.value = true;
}

function openEdit(row: BankStatementAdminApi.ReceiveSettlementListDto) {
  action.value = 'edit';
  editingRow.value = row;
  open.value = true;
}

function closeDrawer() {
  open.value = false;
}

function switchCreateMode() {
  createMode.value = createMode.value === 'fee' ? 'invoice' : 'fee';
}

function handleChanged(closeAfterChange = false) {
  emit('changed');
  if (closeAfterChange) closeDrawer();
}

defineExpose({ openCreate, openEdit });
</script>

<template>
  <Drawer
    v-model:open="open"
    :title="drawerTitle"
    :width="'min(1440px, 96vw)'"
    destroy-on-close
    placement="right"
    class="settlement-workbench-drawer"
  >
    <template #extra>
      <Button v-if="action === 'create'" type="link" @click="switchCreateMode">
        {{ switchModeText }}
      </Button>
    </template>

    <div class="statement-strip">
      <span class="statement-strip__badge">流水</span>
      <strong>{{ bankStatementNo || '-' }}</strong>
      <span class="statement-strip__sep">｜</span>
      <span>付款方: {{ settlementName || '-' }}</span>
      <span class="statement-strip__sep">｜</span>
      <span>总额: {{ formatPlain(bankStatementAmount) }}</span>
      <span class="statement-strip__sep">｜</span>
      <span>已核: {{ formatPlain(otherSettledAmount) }}</span>
      <span class="statement-strip__sep">｜</span>
      <span
        class="statement-remain"
        :class="{ 'is-over': remainingAmount < 0 }"
      >
        剩余可用: {{ formatPlain(remainingAmount) }}
        {{ currencyCode || '' }}
      </span>
    </div>

    <CreateSettlementFeePanel
      v-if="action === 'create' && createMode === 'fee'"
      :bank-statement-id="bankStatementId"
      :bank-statement-amount="bankStatementAmount"
      :org-id="orgId"
      :other-settled-amount="otherSettledAmount"
      :settlement-id="settlementId"
      :settlement-name="settlementName"
      :currency-id="currencyId"
      :currency-code="currencyCode"
      @cancel="closeDrawer"
      @created="handleChanged(true)"
    />
    <CreateSettlementInvoicePanel
      v-else-if="action === 'create'"
      :bank-statement-id="bankStatementId"
      :bank-statement-amount="bankStatementAmount"
      :org-id="orgId"
      :other-settled-amount="otherSettledAmount"
      :settlement-id="settlementId"
      :settlement-name="settlementName"
      :currency-id="currencyId"
      :currency-code="currencyCode"
      @cancel="closeDrawer"
      @created="handleChanged(true)"
    />

    <ReceiveSettlementInvoiceForm
      v-else-if="editingRow && isInvoiceEdit"
      :embedded-id="editingRow.id"
      embedded
      @changed="handleChanged()"
      @close="closeDrawer"
    />
    <ReceiveSettlementForm
      v-else-if="editingRow"
      :embedded-id="editingRow.id"
      embedded
      @changed="handleChanged()"
      @close="closeDrawer"
    />
  </Drawer>
</template>

<style scoped lang="scss">
.settlement-workbench-drawer {
  :deep(.ant-drawer-body) {
    padding: 12px;
    background: #f5f7fa;
  }

  :deep(.vben-page) {
    min-height: auto;
  }
}

.statement-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 0;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #344054;
  background: #fbfcfe;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.statement-strip__badge {
  padding: 0 6px;
  margin-right: 6px;
  font-size: 12px;
  line-height: 20px;
  color: #1d4ed8;
  background: #eff6ff;
  border-radius: 4px;
}

.statement-strip strong {
  font-variant-numeric: tabular-nums;
  color: #1d2939;
}

.statement-strip__sep {
  margin: 0 8px;
  color: #d0d5dd;
}

.statement-remain {
  padding: 1px 8px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #b45309;
  background: #fff7e6;
  border-radius: 999px;
}

.statement-remain.is-over {
  color: #cf1322;
  background: #fff1f0;
}
</style>
