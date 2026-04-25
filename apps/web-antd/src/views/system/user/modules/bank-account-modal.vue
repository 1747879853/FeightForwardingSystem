<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createUserBankAccount,
  getUserBankAccount,
  updateUserBankAccount,
} from '#/api/system/user-admin';
import { $t } from '#/locales';

import { useUserBankAccountSchema } from '../data';

const emit = defineEmits(['success']);

const editId = ref<number>();
const userId = ref<number>(0);

const getTitle = computed(() => {
  return editId.value
    ? $t('ui.actionTitle.edit', [$t('system.user.bankAccount.name')])
    : $t('ui.actionTitle.create', [$t('system.user.bankAccount.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useUserBankAccountSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

function collectSubmitData(
  values: Record<string, any>,
): SystemUserAdminApi.CreateUserBankAccountInputDto {
  return {
    userId: userId.value,
    currencyId: values.currencyId,
    accountName: values.accountName || undefined,
    bankShortName: values.bankShortName,
    bankName: values.bankName,
    bankAddress: values.bankAddress || undefined,
    bankAccount: values.bankAccount,
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
        await updateUserBankAccount({
          id: editId.value,
          ...submitData,
        });
      } else {
        await createUserBankAccount(submitData);
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
      userId: number;
      id?: number;
    }>();

    userId.value = data?.userId ?? 0;

    if (data?.id) {
      editId.value = data.id;
      modalApi.lock();
      try {
        const detail = await getUserBankAccount(data.id);
        formApi.setValues({
          currencyId: detail.currencyId,
          accountName: detail.accountName,
          bankShortName: detail.bankShortName,
          bankName: detail.bankName,
          bankAddress: detail.bankAddress,
          bankAccount: detail.bankAccount,
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
