<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import { useVbenForm } from '#/adapter/form';
import { useBillFormSchema } from './data';
import dayjs from 'dayjs';
import { ref, computed } from 'vue';
const [paymentForm, paymentFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBillFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-3',
  handleValuesChange: (values) => {
    if (values.settlementType !== undefined) {
      if (values.settlementType === 1) {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: false },
          { fieldName: 'settlementDay', hide: false },
          { fieldName: 'days', hide: true },
        ]);
      } else if (values.settlementType === 2) {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: false },
        ]);
      } else {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: true },
        ]);
      }
    }
    if (values.permanent !== undefined && values.permanent) {
      paymentFormApi.updateSchema([
        { fieldName: 'expiringTime', disabled: true },
      ]);
      paymentFormApi.setValues({ expiringTime: '' });
    } else if (values.permanent !== undefined && !values.permanent) {
      paymentFormApi.updateSchema([
        { fieldName: 'expiringTime', disabled: false },
      ]);
    }
  },
});

const emits = defineEmits(['add', 'edit']);

const editId = ref('');
const isEdit = ref(false);

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    console.info('onConfirm');
    const paymentValues = await paymentFormApi.getValues();
    console.info('paymentValues', paymentValues);
    if (!isEdit.value) {
      emits('add', paymentValues);
    } else {
      paymentValues.id = editId.value;
      emits('edit', paymentValues);
    }

    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      let data = modalApi.getData<Record<string, any>>();
      console.info('data', data);
      if (data.id) {
        editId.value = data.id;
        isEdit.value = true;
        const formData = {
          permanent: data.permanent,
          effectiveTime: toDayjs(data.effectiveTime),
          expiringTime: toDayjs(data.expiringTime),
          bizTypes: data.bizTypes,
          settlementType: data.settlementType,
          months: data.months,
          settlementDay: data.settlementDay,
          days: data.days,
          remark: data.remark,
          codeSourceIds:
            data.cbpCodeSources?.map((item) => item?.codeSourceId) || [],
          organizationUnitIds:
            data.cbpOrgs?.map((item) => item?.organizationUnitId) || [],
          userIds: data.cbpUsers?.map((item) => item?.userId) || [],
        };
        paymentFormApi.setValues(formData);
      } else {
        isEdit.value = false;
        paymentFormApi.resetForm();
      }
    }
  },
});
const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.client.paymentTerms.title')])
    : $t('ui.actionTitle.create', [$t('seaExport.client.paymentTerms.title')]);
});
</script>
<template>
  <Modal :title="pageTitle">
    <paymentForm></paymentForm>
  </Modal>
</template>
