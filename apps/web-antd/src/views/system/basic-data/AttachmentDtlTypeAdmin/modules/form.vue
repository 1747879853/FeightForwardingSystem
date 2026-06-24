<script lang="ts" setup>
import type { AttachmentDtlTypeAdminApi } from '#/api/system/attachment-dtl-type-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { FormItem, message, Select } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getModuleTypeOptions } from '#/api/common/lookup';
import {
  addAttachmentDtlType,
  editAttachmentDtlType,
  getAttachmentDtlTypeDetail,
} from '#/api/system/attachment-dtl-type-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

type ModuleTypeOption = { label: string; value: number };

const emit = defineEmits<{ success: [] }>();
const formData = ref<AttachmentDtlTypeAdminApi.AttachmentDtlTypeDto>();
const moduleTypeOptions = ref<ModuleTypeOption[]>([]);
const selectedModuleTypes = ref<number[]>([]);

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.attachmentDtlType.name')])
    : $t('ui.actionTitle.create', [
        $t('system.basicData.attachmentDtlType.name'),
      ]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const loadModuleTypeOptions = async () => {
  moduleTypeOptions.value = await getModuleTypeOptions();
};

const buildDefaultModulesPayload = () => {
  return selectedModuleTypes.value.map((moduleType) => ({ moduleType }));
};

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();
    const values = await formApi.getValues();
    const attachmentDefaultModules = buildDefaultModulesPayload();

    try {
      if (formData.value?.id) {
        await editAttachmentDtlType({
          id: formData.value.id,
          name: values.name,
          attachmentDefaultModules,
        });
      } else {
        await addAttachmentDtlType({
          name: values.name,
          attachmentDefaultModules,
        });
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      modalApi.close();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    await loadModuleTypeOptions();

    const data = modalApi.getData<{ id?: number }>();
    if (data?.id) {
      modalApi.lock();
      try {
        const detail = await getAttachmentDtlTypeDetail(data.id);
        formData.value = detail;
        selectedModuleTypes.value =
          detail.attachmentDefaultModules?.map((item) => item.moduleType) ?? [];
        formApi.setValues({
          name: detail.name,
        });
      } finally {
        modalApi.lock(false);
      }
    } else {
      formData.value = undefined;
      selectedModuleTypes.value = [];
      formApi.resetForm();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="mx-4" />
    <div class="mx-4 mt-2">
      <FormItem
        :label="$t('system.basicData.attachmentDtlType.defaultModules')"
        class="mb-0"
      >
        <Select
          v-model:value="selectedModuleTypes"
          mode="multiple"
          allow-clear
          show-search
          option-filter-prop="label"
          :options="moduleTypeOptions"
          :placeholder="
            $t('system.basicData.attachmentDtlType.defaultModulesPlaceholder')
          "
          style="width: 100%"
        />
      </FormItem>
      <div class="mt-1 text-xs text-gray-400">
        {{ $t('system.basicData.attachmentDtlType.defaultModulesTip') }}
      </div>
    </div>
  </Modal>
</template>
