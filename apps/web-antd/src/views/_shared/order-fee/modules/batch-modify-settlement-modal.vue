<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Alert, Form, FormItem, Textarea, message } from 'ant-design-vue';

import { ClientSelect } from '#/adapter/component/biz-select';
import {
  batchModifyOrderFeeSettlement,
  type ExpenseSubmissionAdminApi,
} from '#/api/audit-approval/expense-admin';

export type BatchModifySettlementPayload = {
  orderFeeIds: string[];
  paySide: 0 | 1;
  transportOrderId: string;
};

const emit = defineEmits<{
  success: [];
}>();

const paySide = ref<0 | 1>(0);
const orderFeeIds = ref<string[]>([]);
const transportOrderId = ref('');
const settlementId = ref<string | undefined>();
const remark = ref('');
const submitting = ref(false);

const isPayable = computed(() => paySide.value === 1);
const feeCount = computed(() => orderFeeIds.value.length);
const paySideLabel = computed(() => (isPayable.value ? '应付' : '应收'));

const [Modal, modalApi] = useVbenModal({
  class: 'w-[520px]',
  confirmText: '确认修改',
  destroyOnClose: true,
  async onConfirm() {
    if (!settlementId.value) {
      message.warning('请选择结算对象');
      return;
    }
    if (isPayable.value && !remark.value.trim()) {
      message.warning('申请修改原因不能为空');
      return;
    }
    if (!transportOrderId.value || orderFeeIds.value.length === 0) {
      message.warning('费用数据不完整，请重新选择后重试');
      return;
    }

    submitting.value = true;
    modalApi.setState({ confirming: true });
    try {
      const payload: ExpenseSubmissionAdminApi.BatchModifyOrderFeeSettlementDto =
        {
          orderFeeIds: [...orderFeeIds.value],
          paySide: paySide.value,
          settlementId: String(settlementId.value),
          transportOrderId: transportOrderId.value,
        };
      if (isPayable.value) {
        payload.remark = remark.value.trim();
      }

      await batchModifyOrderFeeSettlement(payload);
      message.success(
        isPayable.value
          ? `已提交 ${feeCount.value} 条应付费用的结算对象修改申请`
          : `已更新 ${feeCount.value} 条应收费用的结算对象`,
      );
      modalApi.close();
      emit('success');
    } catch (error) {
      console.error('批量修改结算对象失败:', error);
    } finally {
      submitting.value = false;
      modalApi.setState({ confirming: false });
    }
  },
  onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      settlementId.value = undefined;
      remark.value = '';
      orderFeeIds.value = [];
      transportOrderId.value = '';
      paySide.value = 0;
      return;
    }
    const data = modalApi.getData<BatchModifySettlementPayload>();
    if (!data) return;
    paySide.value = data.paySide;
    orderFeeIds.value = [...data.orderFeeIds];
    transportOrderId.value = data.transportOrderId;
    settlementId.value = undefined;
    remark.value = '';
  },
});

defineExpose({ modalApi });
</script>

<template>
  <Modal :title="`批量修改结算对象（${paySideLabel}）`">
    <div class="batch-settlement">
      <Alert
        class="mb-4"
        type="info"
        show-icon
        :message="`已选 ${feeCount} 条${paySideLabel}费用，将统一改为下方结算对象`"
        :description="
          isPayable
            ? '应付费用走申请修改工作流，修改原因必填。'
            : '应收费用直接改库，不走工作流。'
        "
      />

      <Form layout="vertical" class="batch-settlement__form">
        <FormItem label="结算对象" required>
          <ClientSelect
            v-model="settlementId"
            class="w-full"
            allow-clear
            :placeholder="$t('ui.placeholder.select')"
          />
        </FormItem>

        <FormItem v-if="isPayable" label="申请修改原因" required>
          <Textarea
            v-model:value="remark"
            :rows="3"
            :maxlength="4096"
            show-count
            placeholder="请填写申请修改原因"
          />
        </FormItem>
      </Form>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.batch-settlement {
  padding: 2px 4px 16px;
}

.batch-settlement__form {
  margin-bottom: 0;
}
</style>
