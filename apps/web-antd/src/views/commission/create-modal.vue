<script lang="ts" setup>
import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';
import type { FormInstance } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import { computed, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Modal as AntModal,
  Table,
  message,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { UserOrgSelect, UserSelect } from '#/adapter/component';

import {
  addCommissionOrder,
  getOperationPreview,
  getSalesPreview,
} from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';

import CalcPanels from './calc-panels.vue';
import {
  collectTicketCurrencyCodes,
  flattenUnsettledBySettlement,
  formatAmount,
  ticketRowKey,
  unsettledSettlementRowKey,
  useOperationTicketColumns,
  useSalesTicketColumns,
} from './data';

defineOptions({ name: 'CommissionOrderCreateModal' });

const emit = defineEmits<{ success: [] }>();

const { CommissionItemProfitType, CommissionType } = CommissionOrderAdminApi;

const [Modal, modalApi] = useVbenModal({
  bordered: true,
  class: 'w-[1400px] !max-h-[78vh]',
  contentClass:
    'commission-create-body !max-h-[calc(78vh-120px)] !overflow-y-auto !bg-[#f5f7fa] !px-5 !py-4',
  footerClass: 'px-5 py-3',
  fullscreenButton: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      preview.value = null;
      return;
    }
    const data = modalApi.getData<{
      commissionType?: CommissionOrderAdminApi.CommissionType;
    }>();
    commissionType.value = data?.commissionType ?? CommissionType.Sales;
    formState.userId = undefined;
    formState.orgId = undefined;
    formState.monthRange = undefined;
    formState.remark = '';
    preview.value = null;
    formRef.value?.clearValidate();
  },
});

const commissionType = ref<CommissionOrderAdminApi.CommissionType>(
  CommissionType.Sales,
);

const isSales = computed(() => commissionType.value === CommissionType.Sales);

const modalTitle = computed(() =>
  isSales.value
    ? $t('commissionOrder.create.titleSales')
    : $t('commissionOrder.create.titleOperation'),
);

// ==================== 查询表单 ====================

const formRef = ref<FormInstance>();

const formState = reactive<{
  monthRange?: [Dayjs, Dayjs];
  orgId?: number;
  remark: string;
  userId?: number;
}>({
  monthRange: undefined,
  orgId: undefined,
  remark: '',
  userId: undefined,
});

const formRules = {
  monthRange: [
    {
      message: $t('commissionOrder.create.monthRangeRequired'),
      required: true,
      type: 'array' as const,
    },
  ],
  orgId: [
    {
      message: $t('commissionOrder.create.orgRequired'),
      required: true,
    },
  ],
  userId: [
    {
      message: $t('commissionOrder.create.userRequired'),
      required: true,
    },
  ],
};

/** 只能选择当前月之前的月份 */
const disabledMonth = (current: Dayjs) =>
  current && !current.isBefore(dayjs(), 'month');

const expandMonths = (range: [Dayjs, Dayjs]): string[] => {
  const months: string[] = [];
  let cursor = range[0].startOf('month');
  const end = range[1].startOf('month');
  while (!cursor.isAfter(end, 'month')) {
    months.push(cursor.format('YYYY-MM'));
    cursor = cursor.add(1, 'month');
  }
  return months;
};

// ==================== 确认预览 ====================

const preview = ref<
  | CommissionOrderAdminApi.CommissionSalesPreviewDto
  | CommissionOrderAdminApi.CommissionOperationPreviewDto
  | null
>(null);

const previewing = ref(false);

/**
 * 确认与新建必须用同一个提成人/组织/月份组合。
 * 任一条件变动后旧预览即失效，清空以免用户拿旧结果直接新建。
 */
watch(
  () => [formState.userId, formState.orgId, formState.monthRange],
  () => {
    preview.value = null;
  },
);

const onPreview = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (!formState.userId || !formState.orgId || !formState.monthRange) return;
  const accountDates = expandMonths(formState.monthRange);
  previewing.value = true;
  try {
    preview.value = isSales.value
      ? await getSalesPreview({
          accountDates,
          orgId: formState.orgId,
          userId: formState.userId,
        })
      : await getOperationPreview({
          accountDates,
          orgId: formState.orgId,
          userId: formState.userId,
        });
  } finally {
    previewing.value = false;
  }
};

// ==================== 预览结果归一化 ====================

interface MonthBlock {
  accountDate: string;
  calculation: CommissionOrderAdminApi.CommissionCalculationDto | null;
  canSubmit: boolean;
  cannotSubmitReasons: string[];
  settled: CommissionOrderAdminApi.CommissionTicketDto[];
  unsettled: CommissionOrderAdminApi.CommissionTicketDto[];
}

/** 销售/操作两种月结构归一为同一形状，模板只需一次循环 */
const monthBlocks = computed<MonthBlock[]>(() => {
  const current = preview.value;
  if (!current) return [];
  return current.months.map((month): MonthBlock => {
    if (isSales.value) {
      const sales = month as CommissionOrderAdminApi.CommissionSalesMonthDto;
      return {
        accountDate: sales.accountDate,
        calculation: sales.calculation ?? null,
        canSubmit: sales.canSubmit,
        cannotSubmitReasons: sales.cannotSubmitReasons,
        settled: sales.settledTickets,
        unsettled: sales.unsettledTickets,
      };
    }
    const operation =
      month as CommissionOrderAdminApi.CommissionOperationMonthDto;
    return {
      accountDate: operation.accountDate,
      calculation: operation.calculation ?? null,
      canSubmit: operation.canSubmit,
      cannotSubmitReasons: operation.cannotSubmitReasons,
      settled: operation.tickets,
      unsettled: [],
    };
  });
});

/** 未达门槛票数（销售），供「达标票数」磁贴副文案 */
const belowCountOf = (block: MonthBlock) =>
  block.settled.filter(
    (ticket) => ticket.profitType === CommissionItemProfitType.BelowThreshold,
  ).length;

/** 应发合计：各月最终应发求和 */
const totalFinal = computed(() =>
  monthBlocks.value.reduce(
    (sum, block) => sum + (block.calculation?.finalAmount ?? 0),
    0,
  ),
);

// ==================== 票表格列 ====================

const settledCurrencyCodes = computed(() =>
  collectTicketCurrencyCodes(
    monthBlocks.value.flatMap((block) => block.settled),
    'currencies',
  ),
);

const unsettledCurrencyCodes = computed(() =>
  collectTicketCurrencyCodes(
    monthBlocks.value.flatMap((block) => block.unsettled),
    'unsettled',
  ),
);

const ticketColumns = computed(() =>
  isSales.value
    ? useSalesTicketColumns({
        compact: true,
        currencyCodes: settledCurrencyCodes.value,
      })
    : useOperationTicketColumns(),
);

const unsettledTicketColumns = computed(() =>
  useSalesTicketColumns({
    showUnsettled: true,
    currencyCodes: unsettledCurrencyCodes.value,
  }),
);

// ==================== 新建 ====================

const canCreate = computed(
  () =>
    preview.value !== null &&
    monthBlocks.value.length > 0 &&
    monthBlocks.value.every((block) => block.canSubmit),
);

const onConfirmCreate = () => {
  if (!formState.monthRange || !canCreate.value) return;
  const accountDates = expandMonths(formState.monthRange);
  AntModal.confirm({
    content: $t('commissionOrder.create.createConfirm', {
      count: accountDates.length,
    }),
    title: $t('commissionOrder.create.confirmCreate'),
    async onOk() {
      await addCommissionOrder({
        accountDates,
        commissionType: commissionType.value,
        orgId: formState.orgId as number,
        remark: formState.remark || undefined,
        userId: formState.userId as number,
      });
      message.success($t('commissionOrder.create.createSuccess'));
      emit('success');
      modalApi.close();
    },
  });
};
</script>

<template>
  <Modal :title="modalTitle">
    <div class="create-body">
      <!-- 基础信息筛选条：标签内嵌在白色圆角控件内 -->
      <Form
        ref="formRef"
        :model="formState"
        :rules="formRules"
        :colon="false"
        class="filter-form"
      >
        <div class="filter-row">
          <FormItem name="userId" class="filter-item">
            <div class="filter-field">
              <span class="filter-field__label">
                <i class="filter-field__req">*</i>
                {{ $t('commissionOrder.create.user') }}
              </span>
              <UserSelect
                v-model="formState.userId"
                allow-clear
                class="filter-field__control"
              />
            </div>
          </FormItem>
          <FormItem name="orgId" class="filter-item">
            <div class="filter-field">
              <span class="filter-field__label">
                <i class="filter-field__req">*</i>
                {{ $t('commissionOrder.create.org') }}
              </span>
              <UserOrgSelect
                v-model="formState.orgId"
                :user-id="formState.userId"
                class="filter-field__control"
              />
            </div>
          </FormItem>
          <FormItem name="monthRange" class="filter-item filter-item--wide">
            <div class="filter-field">
              <span class="filter-field__label">
                <i class="filter-field__req">*</i>
                {{ $t('commissionOrder.create.monthRange') }}
              </span>
              <DatePicker.RangePicker
                v-model:value="formState.monthRange"
                picker="month"
                :disabled-date="disabledMonth"
                :bordered="false"
                class="filter-field__control"
              />
            </div>
          </FormItem>
          <Button
            type="primary"
            :loading="previewing"
            class="filter-btn"
            @click="onPreview"
          >
            <IconifyIcon icon="mdi:refresh" class="mr-1 size-3.5" />
            {{
              preview
                ? $t('commissionOrder.create.repreview')
                : $t('commissionOrder.create.preview')
            }}
          </Button>
        </div>
      </Form>

      <div v-if="!preview" class="hint-banner">
        {{ $t('commissionOrder.create.noPreview') }}
      </div>

      <!-- 按月预览结果 -->
      <div
        v-for="block in monthBlocks"
        :key="block.accountDate"
        class="create-body__month"
      >
        <div v-if="!block.canSubmit" class="reason-banner">
          <span class="reason-banner__icon">
            <IconifyIcon icon="mdi:close-circle" />
          </span>
          <div class="reason-banner__content">
            <div class="reason-banner__title">
              {{ $t('commissionOrder.create.cannotSubmitReasons') }}
            </div>
            <p
              v-for="(reason, i) in block.cannotSubmitReasons"
              :key="i"
              class="reason-banner__text"
            >
              {{ reason }}
            </p>
          </div>
        </div>

        <CalcPanels
          :calculation="block.calculation"
          :month="block.accountDate"
          :can-submit="block.canSubmit"
          :is-sales="isSales"
          :below-count="belowCountOf(block)"
        />

        <div v-if="block.unsettled.length > 0" class="warn-banner">
          <span class="warn-banner__icon">
            <IconifyIcon icon="mdi:alert-circle" />
          </span>
          <span>{{ $t('commissionOrder.create.part2Warning') }}</span>
        </div>

        <section v-if="block.unsettled.length > 0" class="ticket-card">
          <header class="ticket-card__head">
            {{
              $t('commissionOrder.create.part2Title', {
                count: block.unsettled.length,
              })
            }}
          </header>
          <Table
            class="design-table"
            size="small"
            :scroll="{ x: 'max-content' }"
            :columns="unsettledTicketColumns"
            :data-source="flattenUnsettledBySettlement(block.unsettled)"
            :pagination="false"
            :row-key="unsettledSettlementRowKey"
          />
        </section>

        <section class="ticket-card">
          <header class="ticket-card__head">
            {{
              $t('commissionOrder.create.ticketsTitle', {
                count: block.settled.length,
              })
            }}
          </header>
          <Table
            class="design-table"
            size="small"
            :scroll="{ x: 'max-content' }"
            :columns="ticketColumns"
            :data-source="block.settled"
            :pagination="false"
            :row-key="ticketRowKey"
          />
        </section>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <template #footer>
      <div class="modal-footer">
        <div class="modal-footer__left">
          <template v-if="preview">
            <span class="modal-footer__gen">
              {{
                $t('commissionOrder.create.willGenerate', {
                  count: monthBlocks.length,
                })
              }}
            </span>
            <span class="modal-footer__total-label">
              {{ $t('commissionOrder.create.finalTotal') }}
            </span>
            <span class="modal-footer__total">
              ¥{{ formatAmount(totalFinal) }}
            </span>
            <span v-if="!canCreate" class="modal-footer__warn">
              {{ $t('commissionOrder.create.notAllCanSubmit') }}
            </span>
          </template>
        </div>
        <div class="modal-footer__right">
          <Button @click="modalApi.close()">
            {{ $t('common.cancel') }}
          </Button>
          <Button
            type="primary"
            :disabled="!canCreate"
            @click="onConfirmCreate"
          >
            {{ $t('commissionOrder.create.confirmCreate') }}
          </Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.create-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.create-body :deep(.panel) {
  border: none;
}

.create-body__month {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---------- 筛选条：标签内嵌 ---------- */
.filter-form {
  margin: 0;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.filter-item {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.filter-item :deep(.ant-form-item-control-input) {
  min-height: 40px;
}

.filter-item--wide {
  flex: 1.4;
}

.filter-field {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #e8edf3;
  border-radius: 8px;
}

.filter-field__label {
  flex-shrink: 0;
  padding-right: 12px;
  margin-right: 4px;
  font-size: 13px;
  line-height: 1;
  color: #8c95a3;
  white-space: nowrap;
  border-right: 1px solid #e8edf3;
}

.filter-field__req {
  margin-right: 2px;
  font-style: normal;
  color: #ff4d4f;
}

.filter-field__control {
  flex: 1;
  min-width: 0;
}

.filter-field :deep(.ant-select),
.filter-field :deep(.ant-picker) {
  width: 100%;
}

.filter-field :deep(.ant-select-selector),
.filter-field :deep(.ant-picker) {
  padding-inline: 8px !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.filter-field :deep(.ant-select-focused .ant-select-selector),
.filter-field :deep(.ant-picker-focused) {
  box-shadow: none !important;
}

.filter-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  font-weight: 500;
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  border-radius: 8px;
}

.filter-btn:hover,
.filter-btn:focus {
  background: hsl(var(--primary) / 85%);
  border-color: hsl(var(--primary) / 85%);
}

/* ---------- 提示条 ---------- */
.hint-banner {
  padding: 10px 14px;
  font-size: 13px;
  color: #8c95a3;
  background: #fff;
  border-radius: 8px;
}

.reason-banner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 16px;
  background: #fff1f0;
  border-radius: 8px;
}

.reason-banner__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  font-size: 20px;
  line-height: 1;
  color: #ff4d4f;
}

.reason-banner__content {
  min-width: 0;
}

.reason-banner__title {
  margin-bottom: 2px;
  font-size: 14px;
  font-weight: 600;
  color: #cf1322;
}

.reason-banner__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #a8071a;
}

.warn-banner {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  color: #d48806;
  background: #fffbe6;
  border-radius: 8px;
}

.warn-banner__icon {
  display: flex;
  flex-shrink: 0;
  font-size: 18px;
  color: #faad14;
}

/* ---------- 票卡片 ---------- */
.ticket-card {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.ticket-card__head {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.design-table :deep(.ant-table) {
  background: transparent;
}

.design-table :deep(.ant-table-thead > tr > th) {
  font-weight: 600;
  color: #3d3d3d;
  background: #f5f7fa;
}

.design-table :deep(.ant-table-thead > tr > th::before) {
  display: none;
}

.design-table :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid #f2f2f2;
}

.design-table :deep(.ant-table-container) {
  border-radius: 8px;
}

/* ---------- 底部操作栏 ---------- */
.modal-footer {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.modal-footer__left {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.modal-footer__gen {
  font-size: 13px;
  color: #8c95a3;
}

.modal-footer__total-label {
  margin-left: 8px;
  font-size: 13px;
  color: #3d3d3d;
}

.modal-footer__total {
  font-size: 16px;
  font-weight: 700;
  color: hsl(var(--primary));
}

.modal-footer__warn {
  margin-left: 8px;
  font-size: 12px;
  color: #faad14;
}

.modal-footer__right {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
