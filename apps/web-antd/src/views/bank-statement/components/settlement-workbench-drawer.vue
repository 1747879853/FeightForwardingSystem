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
      : '新建核销 · 按开票申请';
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
  createMode.value === 'fee' ? '切换为按开票申请' : '切换为按费用',
);

function formatMoney(value: number) {
  const text = value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return props.currencyCode ? `${text} ${props.currencyCode}` : text;
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
    :width="'min(1280px, 94vw)'"
    destroy-on-close
    placement="right"
    class="settlement-workbench-drawer"
  >
    <template #extra>
      <Button v-if="action === 'create'" type="link" @click="switchCreateMode">
        {{ switchModeText }}
      </Button>
    </template>

    <div class="settlement-context">
      <div class="settlement-context__payer">
        <span>付款方</span>
        <strong>{{ settlementName || '-' }}</strong>
      </div>
      <div class="settlement-context__metrics">
        <div>
          <span>流水金额</span>
          <strong>{{ formatMoney(bankStatementAmount) }}</strong>
        </div>
        <div>
          <span>已核销</span>
          <strong>{{ formatMoney(otherSettledAmount) }}</strong>
        </div>
        <div>
          <span>本次最多可核销</span>
          <strong :class="{ 'text-red-600': remainingAmount < 0 }">
            {{ formatMoney(remainingAmount) }}
          </strong>
        </div>
      </div>
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

.settlement-context {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: #fbfcfe;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.settlement-context__payer,
.settlement-context__metrics > div {
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    font-size: 12px;
    color: #7a8797;
  }

  strong {
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #283442;
  }
}

.settlement-context__payer {
  min-width: 260px;
}

.settlement-context__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(130px, 1fr));
  gap: 24px;
}

@media (max-width: 900px) {
  .settlement-context {
    flex-direction: column;
    align-items: flex-start;
  }

  .settlement-context__metrics {
    width: 100%;
  }
}
</style>
