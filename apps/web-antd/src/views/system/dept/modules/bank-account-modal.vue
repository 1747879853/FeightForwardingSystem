<script lang="ts" setup>
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createOrgBankAccount,
  getOrgBankAccount,
  updateOrgBankAccount,
} from '#/api/system/organization-unit';
import { $t } from '#/locales';

import { useBankAccountSchema } from '../data';

const emit = defineEmits(['success']);

const editId = ref<string>();
const organizationUnitId = ref<number>(0);

const getTitle = computed(() => {
  return editId.value
    ? $t('ui.actionTitle.edit', [$t('system.dept.bankAccount.name')])
    : $t('ui.actionTitle.create', [$t('system.dept.bankAccount.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useBankAccountSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

function collectSubmitData(values: Record<string, any>) {
  return {
    organizationUnitId: organizationUnitId.value,
    currencyId: values.currencyId,
    accountName: values.accountName || null,
    bankShortName: values.bankShortName,
    bankName: values.bankName,
    bankAddress: values.bankAddress || null,
    bankAccount: values.bankAccount,
    cnapsCode: values.cnapsCode || null,
    swiftCode: values.swiftCode || null,
    default: values.default ?? false,
    enable: values.enable ?? true,
    sortId: values.sortId ?? 0,
    remark: values.remark || null,
  };
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.lock();
    const values = await formApi.getValues();
    try {
      const submitData = collectSubmitData(values);

      if (editId.value) {
        await updateOrgBankAccount({
          id: editId.value,
          ...submitData,
        });
      } else {
        await createOrgBankAccount(submitData);
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      modalApi.close();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;

    const data = modalApi.getData<{
      organizationUnitId: number;
      id?: string;
    }>();

    organizationUnitId.value = data?.organizationUnitId ?? 0;

    if (data?.id) {
      editId.value = data.id;
      modalApi.lock();
      try {
        const detail = await getOrgBankAccount(data.id);
        formApi.setValues({
          currencyId: detail.currencyId,
          accountName: detail.accountName,
          bankShortName: detail.bankShortName,
          bankName: detail.bankName,
          bankAddress: detail.bankAddress,
          bankAccount: detail.bankAccount,
          cnapsCode: detail.cnapsCode,
          swiftCode: detail.swiftCode,
          default: detail.default,
          enable: detail.enable,
          remark: detail.remark,
        });
      } finally {
        modalApi.lock(false);
      }
    } else {
      editId.value = undefined;
      formApi.resetForm();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="mx-4" />
  </Modal>
</template>
