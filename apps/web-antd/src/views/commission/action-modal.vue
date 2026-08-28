<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Form,
  FormItem,
  Input,
  InputNumber,
  Radio,
  RadioGroup,
  message,
} from 'ant-design-vue';

import {
  auditCommissionOrder,
  grantCommissionOrder,
  rejectCommissionOrder,
} from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';

import { formatAmount } from './data';

defineOptions({ name: 'CommissionOrderActionModal' });

const emit = defineEmits<{ success: [] }>();

type ActionMode = 'audit' | 'grant' | 'reject';

const modalTitleMap: Record<ActionMode, string> = {
  audit: $t('commissionOrder.action.auditTitle'),
  grant: $t('commissionOrder.action.grantTitle'),
  reject: $t('commissionOrder.action.rejectTitle'),
};

const mode = ref<ActionMode>('audit');

/** 通过=false 时为驳回 */
const success = ref(true);

const remark = ref('');

const grantAmount = ref<number | undefined>();

const finalAmount = ref<number>();

const modalTitle = computed(() => modalTitleMap[mode.value]);

const isAudit = computed(() => mode.value === 'audit');
const isGrant = computed(() => mode.value === 'grant');

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (isGrant.value) {
      if (grantAmount.value == null || Number.isNaN(grantAmount.value)) {
        message.warning($t('commissionOrder.action.grantAmountRequired'));
        return;
      }
    }
    if (
      (isAudit.value && !success.value && !remark.value.trim()) ||
      (mode.value === 'reject' && !remark.value.trim())
    ) {
      message.warning(
        isAudit.value
          ? $t('commissionOrder.action.auditRemarkRequired')
          : $t('commissionOrder.action.rejectRemarkRequired'),
      );
      return;
    }
    try {
      if (isGrant.value) {
        await grantCommissionOrder({
          grantAmount: grantAmount.value as number,
          id: modalApi.getData<{ id: string }>()?.id ?? '',
          remark: remark.value || undefined,
        });
        message.success($t('commissionOrder.action.grantSuccess'));
      } else if (isAudit.value) {
        await auditCommissionOrder({
          id: modalApi.getData<{ id: string }>()?.id ?? '',
          remark: remark.value || undefined,
          success: success.value,
        });
        message.success($t('commissionOrder.action.auditSuccess'));
      } else {
        await rejectCommissionOrder({
          id: modalApi.getData<{ id: string }>()?.id ?? '',
          remark: remark.value,
        });
        message.success($t('commissionOrder.action.rejectSuccess'));
      }
      emit('success');
      modalApi.close();
    } catch {
      // 请求失败由全局拦截器统一提示
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData<{
      finalAmount?: number;
      id?: string;
      mode?: ActionMode;
    }>();
    mode.value = data?.mode ?? 'audit';
    success.value = true;
    remark.value = '';
    finalAmount.value = data?.finalAmount;
    grantAmount.value = data?.finalAmount;
  },
});
</script>

<template>
  <Modal :title="modalTitle" class="w-[520px]">
    <div class="space-y-4">
      <!-- 发放金额提示 -->
      <Alert
        v-if="isGrant"
        type="info"
        show-icon
        :message="`${$t('commissionOrder.columns.finalAmount')}：${formatAmount(finalAmount)}`"
      />

      <Form layout="vertical">
        <!-- 审核结果 -->
        <FormItem
          v-if="isAudit"
          :label="$t('commissionOrder.action.auditResult')"
        >
          <RadioGroup v-model:value="success">
            <Radio :value="true">{{
              $t('commissionOrder.action.approve')
            }}</Radio>
            <Radio :value="false">{{
              $t('commissionOrder.action.reject')
            }}</Radio>
          </RadioGroup>
        </FormItem>

        <!-- 发放金额 -->
        <FormItem
          v-if="isGrant"
          :label="$t('commissionOrder.action.grantAmount')"
          required
        >
          <InputNumber
            v-model:value="grantAmount"
            :precision="2"
            class="w-full"
            :placeholder="$t('commissionOrder.action.grantAmountRequired')"
          />
        </FormItem>

        <!-- 意见/原因/备注 -->
        <FormItem
          :label="
            isGrant
              ? $t('commissionOrder.action.grantRemark')
              : isAudit
                ? $t('commissionOrder.action.auditRemark')
                : $t('commissionOrder.action.rejectRemark')
          "
          :required="!isGrant && (!isAudit || !success)"
        >
          <Input.TextArea
            v-model:value="remark"
            :maxlength="1024"
            :rows="3"
            show-count
            :placeholder="
              isGrant
                ? $t('commissionOrder.action.grantRemarkPlaceholder')
                : isAudit
                  ? $t('commissionOrder.action.auditRemarkPlaceholder')
                  : $t('commissionOrder.action.rejectRemarkPlaceholder')
            "
          />
        </FormItem>
      </Form>
    </div>
  </Modal>
</template>
