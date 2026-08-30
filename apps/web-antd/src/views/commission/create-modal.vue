<script lang="ts" setup>
import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';
import type { FormInstance } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import { computed, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Modal as AntModal,
  Table,
  Tag,
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

import CalcView from './calc-view.vue';
import {
  formatMonth,
  ticketRowKey,
  useOperationTicketColumns,
  useSalesTicketColumns,
} from './data';

defineOptions({ name: 'CommissionOrderCreateModal' });

const emit = defineEmits<{ success: [] }>();

const { CommissionType } = CommissionOrderAdminApi;

const [Modal, modalApi] = useVbenModal({
  class: 'w-[1300px]',
  footer: false,
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

const salesMonths = computed(() =>
  isSales.value
    ? ((
        preview.value as CommissionOrderAdminApi.CommissionSalesPreviewDto | null
      )?.months ?? [])
    : [],
);

const operationMonths = computed(() =>
  !isSales.value
    ? ((
        preview.value as CommissionOrderAdminApi.CommissionOperationPreviewDto | null
      )?.months ?? [])
    : [],
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
    preview.value.months.length > 0 &&
    preview.value.months.every((month) => month.canSubmit),
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
    <div class="space-y-4">
      <!-- 查询条件 -->
      <Form
        ref="formRef"
        :model="formState"
        :rules="formRules"
        layout="vertical"
      >
        <div class="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-4">
          <FormItem :label="$t('commissionOrder.create.user')" name="userId">
            <UserSelect v-model="formState.userId" allow-clear class="w-full" />
          </FormItem>
          <FormItem :label="$t('commissionOrder.create.org')" name="orgId">
            <UserOrgSelect
              v-model="formState.orgId"
              :user-id="formState.userId"
              class="w-full"
            />
          </FormItem>
          <FormItem
            :label="$t('commissionOrder.create.monthRange')"
            name="monthRange"
            :extra="$t('commissionOrder.create.monthRangeHint')"
          >
            <DatePicker.RangePicker
              v-model:value="formState.monthRange"
              picker="month"
              :disabled-date="disabledMonth"
              class="w-full"
            />
          </FormItem>
          <div class="flex items-end pb-0">
            <Button type="primary" :loading="previewing" @click="onPreview">
              {{
                preview
                  ? $t('commissionOrder.create.repreview')
                  : $t('commissionOrder.create.preview')
              }}
            </Button>
          </div>
        </div>
        <FormItem :label="$t('commissionOrder.create.remark')" name="remark">
          <Input.TextArea
            v-model:value="formState.remark"
            :maxlength="1024"
            :rows="2"
            show-count
            :placeholder="$t('commissionOrder.create.remarkPlaceholder')"
          />
        </FormItem>
      </Form>

      <Alert
        v-if="!preview"
        type="info"
        show-icon
        :message="$t('commissionOrder.create.noPreview')"
      />

      <!-- 预览结果：销售提成 -->
      <div v-if="isSales && salesMonths.length > 0" class="space-y-3">
        <Card
          v-for="month in salesMonths"
          :key="month.accountDate"
          size="small"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <span>{{ formatMonth(month.accountDate) }}</span>
              <Tag :color="month.canSubmit ? 'success' : 'error'">
                {{
                  month.canSubmit
                    ? $t('commissionOrder.create.canSubmit')
                    : $t('commissionOrder.create.cannotSubmit')
                }}
              </Tag>
            </div>
          </template>
          <div class="space-y-3">
            <Alert
              v-if="!month.canSubmit"
              type="error"
              show-icon
              :message="$t('commissionOrder.create.cannotSubmitReasons')"
            >
              <ul class="list-disc pl-4">
                <li v-for="(reason, i) in month.cannotSubmitReasons" :key="i">
                  {{ reason }}
                </li>
              </ul>
            </Alert>

            <CalcView :calculation="month.calculation" />

            <div>
              <div class="mb-2 font-medium">
                {{
                  $t('commissionOrder.create.part1Title', {
                    count: month.settledTickets.length,
                  })
                }}
              </div>
              <Table
                bordered
                size="small"
                :columns="ticketColumns"
                :data-source="month.settledTickets"
                :pagination="false"
                :row-key="ticketRowKey"
              />
            </div>

            <template v-if="month.unsettledTickets.length > 0">
              <Alert
                type="warning"
                show-icon
                :message="$t('commissionOrder.create.part2Warning')"
              />
              <div>
                <div class="mb-2 font-medium">
                  {{
                    $t('commissionOrder.create.part2Title', {
                      count: month.unsettledTickets.length,
                    })
                  }}
                </div>
                <Table
                  bordered
                  size="small"
                  :columns="unsettledTicketColumns"
                  :data-source="month.unsettledTickets"
                  :pagination="false"
                  :row-key="ticketRowKey"
                />
              </div>
            </template>
          </div>
        </Card>
      </div>

      <!-- 预览结果：操作提成 -->
      <div v-else-if="!isSales && operationMonths.length > 0" class="space-y-3">
        <Card
          v-for="month in operationMonths"
          :key="month.accountDate"
          size="small"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <span>{{ formatMonth(month.accountDate) }}</span>
              <Tag :color="month.canSubmit ? 'success' : 'error'">
                {{
                  month.canSubmit
                    ? $t('commissionOrder.create.canSubmit')
                    : $t('commissionOrder.create.cannotSubmit')
                }}
              </Tag>
            </div>
          </template>
          <div class="space-y-3">
            <Alert
              v-if="!month.canSubmit"
              type="error"
              show-icon
              :message="$t('commissionOrder.create.cannotSubmitReasons')"
            >
              <ul class="list-disc pl-4">
                <li v-for="(reason, i) in month.cannotSubmitReasons" :key="i">
                  {{ reason }}
                </li>
              </ul>
            </Alert>

            <CalcView :calculation="month.calculation" />

            <div>
              <div class="mb-2 font-medium">
                {{
                  $t('commissionOrder.create.ticketsTitle', {
                    count: month.tickets.length,
                  })
                }}
              </div>
              <Table
                bordered
                size="small"
                :columns="ticketColumns"
                :data-source="month.tickets"
                :pagination="false"
                :row-key="ticketRowKey"
              />
            </div>
          </div>
        </Card>
      </div>

      <!-- 底部操作 -->
      <div
        v-if="preview && preview.months.length > 0"
        class="flex items-center justify-end gap-2 border-t pt-3"
      >
        <Alert
          v-if="!canCreate"
          type="warning"
          show-icon
          :message="$t('commissionOrder.create.notAllCanSubmit')"
          class="mr-auto border-none"
        />
        <Button :disabled="!canCreate" @click="modalApi.close()">
          {{ $t('common.cancel') }}
        </Button>
        <Button type="primary" :disabled="!canCreate" @click="onConfirmCreate">
          {{ $t('commissionOrder.create.confirmCreate') }}
        </Button>
      </div>
    </div>
  </Modal>
</template>
