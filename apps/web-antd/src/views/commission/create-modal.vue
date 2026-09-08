<script lang="ts" setup>
import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';
import type { FormInstance } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import { computed, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
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
  formatAmount,
  ticketRowKey,
  useOperationTicketColumns,
  useSalesTicketColumns,
} from './data';

defineOptions({ name: 'CommissionOrderCreateModal' });

const emit = defineEmits<{ success: [] }>();

const { CommissionItemProfitType, CommissionType } = CommissionOrderAdminApi;

const [Modal, modalApi] = useVbenModal({
  class: 'w-[1300px]',
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

const ticketColumns = computed(() =>
  isSales.value ? useSalesTicketColumns() : useOperationTicketColumns(),
);

const unsettledTicketColumns = computed(() =>
  useSalesTicketColumns({ showUnsettled: true }),
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
    <div class="space-y-3">
      <!-- 基础信息筛选条 -->
      <Form
        ref="formRef"
        :model="formState"
        :rules="formRules"
        :colon="false"
        layout="horizontal"
        class="filter-card"
      >
        <div class="filter-row">
          <FormItem
            :label="$t('commissionOrder.create.user')"
            name="userId"
            class="filter-item"
          >
            <UserSelect v-model="formState.userId" allow-clear class="w-full" />
          </FormItem>
          <FormItem
            :label="$t('commissionOrder.create.org')"
            name="orgId"
            class="filter-item"
          >
            <UserOrgSelect
              v-model="formState.orgId"
              :user-id="formState.userId"
              class="w-full"
            />
          </FormItem>
          <FormItem
            :label="$t('commissionOrder.create.monthRange')"
            name="monthRange"
            class="filter-item filter-item--wide"
          >
            <DatePicker.RangePicker
              v-model:value="formState.monthRange"
              picker="month"
              :disabled-date="disabledMonth"
              class="w-full"
            />
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

      <Alert
        v-if="!preview"
        type="info"
        show-icon
        :message="$t('commissionOrder.create.noPreview')"
      />

      <!-- 按月预览结果 -->
      <div
        v-for="block in monthBlocks"
        :key="block.accountDate"
        class="space-y-3"
      >
        <Alert
          v-if="!block.canSubmit"
          type="error"
          show-icon
          :message="$t('commissionOrder.create.cannotSubmitReasons')"
        >
          <template #description>
            <ul class="list-disc pl-4">
              <li v-for="(reason, i) in block.cannotSubmitReasons" :key="i">
                {{ reason }}
              </li>
            </ul>
          </template>
        </Alert>

        <CalcPanels
          :calculation="block.calculation"
          :month="block.accountDate"
          :can-submit="block.canSubmit"
          :is-sales="isSales"
          :below-count="belowCountOf(block)"
        />

        <!-- 参与计算的票 -->
        <section class="ticket-card">
          <template v-if="block.unsettled.length > 0">
            <Alert
              type="warning"
              show-icon
              :message="$t('commissionOrder.create.part2Warning')"
              class="my-3"
            />
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
              :data-source="block.unsettled"
              :pagination="false"
              :row-key="ticketRowKey"
            />
          </template>

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
/* ---------- 筛选条 ---------- */
.filter-card {
  padding: 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.filter-item {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.filter-item--wide {
  flex: 1.5;
}

.filter-btn {
  flex-shrink: 0;
}

.filter-remark {
  margin-top: 12px;
  margin-bottom: 0;
}

/* ---------- 票卡片 ---------- */
.ticket-card {
  padding: 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.ticket-card__head {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

/* 表格贴合设计稿：浅灰表头、圆角、细分隔线 */
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
  color: #006ce6;
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
