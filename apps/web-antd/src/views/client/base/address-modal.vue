<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import { useVbenForm } from '#/adapter/form';
import { useAddressFormSchema } from './data';
import { ref } from 'vue';
const [AddressForm, addressFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useAddressFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

const emits = defineEmits(['add', 'edit']);

const editId = ref('');
const isEdit = ref(false);

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    console.info('onConfirm');
    const addressValues = await addressFormApi.getValues();
    console.info('addressValues', addressValues);
    if (!isEdit.value) {
      emits('add', addressValues);
    } else {
      addressValues.id = editId.value;
      emits('edit', addressValues);
    }

    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      let data = modalApi.getData<Record<string, any>>();
      console.info('data', data);
      if (data.name) {
        editId.value = data.id;
        isEdit.value = true;
        addressFormApi.setValues(data);
      } else {
        isEdit.value = false;
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
