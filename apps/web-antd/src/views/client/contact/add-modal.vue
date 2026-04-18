<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import { useVbenForm } from '#/adapter/form';
import { useAddFormSchema } from './data';
import { ref, computed } from 'vue';
const [ContactForm, ContactFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useAddFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-3',
});

const emits = defineEmits(['add', 'edit']);

const editId = ref('');
const isEdit = ref(false);

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    console.info('onConfirm');
    const addressValues = await ContactFormApi.getValues();
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
        ContactFormApi.setValues(data);
      } else {
        isEdit.value = false;
      }
    }
  },
});
const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.client.contactPerson.title')])
    : $t('ui.actionTitle.create', [$t('seaExport.client.contactPerson.title')]);
});
</script>
<template>
  <Modal :title="pageTitle">
    <ContactForm></ContactForm>
  </Modal>
</template>
