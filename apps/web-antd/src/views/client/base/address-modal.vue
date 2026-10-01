<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { createAddressLocalKey } from './client-editor-context';
import { useAddressFormSchema } from './data';

const [AddressForm, addressFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useAddressFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

const emits = defineEmits(['add', 'edit']);

const editLocalKey = ref('');
const isEdit = ref(false);

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    const { valid, errors } = await addressFormApi.validate();
    if (!valid) {
      console.error('表单验证失败:', errors);
      message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
      return;
    }

    const addressValues = await addressFormApi.getValues();
    const payload = {
      ...addressValues,
      id: addressValues.id,
      _localKey: editLocalKey.value || createAddressLocalKey(),
    };

    if (!isEdit.value) {
      emits('add', payload);
    } else {
      emits('edit', payload);
    }

    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const data = modalApi.getData<Record<string, any>>();
      if (data && (data._localKey || data.id || data.name)) {
        editLocalKey.value = data._localKey || createAddressLocalKey();
        isEdit.value = true;
        addressFormApi.setValues(data);
      } else {
        isEdit.value = false;
        editLocalKey.value = createAddressLocalKey();
        addressFormApi.resetForm?.();
      }
    }
  },
});
</script>
<template>
  <Modal :title="$t('seaExport.client.addAddress')">
    <AddressForm></AddressForm>
  </Modal>
</template>
