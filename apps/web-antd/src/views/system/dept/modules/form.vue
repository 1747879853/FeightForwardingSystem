<script lang="ts" setup>
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createOrganizationUnit,
  getOrganizationUnit,
  moveOrganizationUnit,
  updateOrganizationUnit,
} from '#/api/system/organization-unit';
import { $t } from '#/locales';

import { useSchema } from '../data';

const emit = defineEmits(['success']);
const formData = ref<SystemOrganizationUnitApi.OrganizationUnitDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.dept.name')])
    : $t('ui.actionTitle.create', [$t('system.dept.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

function resetForm() {
  formApi.resetForm();
  if (formData.value) {
    formApi.setValues(mapDtoToFormValues(formData.value));
  }
}

function mapDtoToFormValues(
  data: Partial<SystemOrganizationUnitApi.OrganizationUnitDto>,
) {
  return {
    displayName: data.displayName,
    parentId: data.parentId ?? undefined,
    isCompany: data.isCompany ?? false,
    shortName: data.shortName ?? undefined,
    enName: data.enName ?? undefined,
    localCurrencyId: data.localCurrencyId ?? undefined,
    chargeUserId: data.chargeUserId ?? undefined,
    contactPhone: data.contactPhone ?? undefined,
    email: data.email ?? undefined,
    address: data.address ?? undefined,
    webUrl: data.webUrl ?? undefined,
    enable: data.enable ?? true,
    unifiedSocialCreditCode: data.unifiedSocialCreditCode ?? undefined,
    invoiceAddress: data.invoiceAddress ?? undefined,
    invoiceTel: data.invoiceTel ?? undefined,
  };
}

function collectSubmitData(values: Record<string, any>) {
  return {
    displayName: values.displayName,
    isCompany: values.isCompany ?? false,
    localCurrencyId: values.localCurrencyId || null,
    shortName: values.shortName || null,
    enName: values.enName || null,
    chargeUserId: values.chargeUserId || null,
    contactPhone: values.contactPhone || null,
    email: values.email || null,
    address: values.address || null,
    webUrl: values.webUrl || null,
    enable: values.enable ?? true,
    unifiedSocialCreditCode: values.unifiedSocialCreditCode || null,
    invoiceAddress: values.invoiceAddress || null,
    invoiceTel: values.invoiceTel || null,
  };
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (valid) {
      modalApi.lock();
      const values = await formApi.getValues();
      try {
        if (formData.value?.id) {
          await updateOrganizationUnit({
            id: formData.value.id,
            ...collectSubmitData(values),
          });
          if (values.parentId !== formData.value.parentId) {
            await moveOrganizationUnit({
              id: formData.value.id,
              newParentId: values.parentId ?? null,
            });
          }
        } else {
          await createOrganizationUnit({
            parentId: values.parentId ?? null,
            ...collectSubmitData(values),
          });
        }
        message.success($t('ui.actionMessage.operationSuccess'));
        modalApi.close();
        emit('success');
      } finally {
        modalApi.lock(false);
      }
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<
        | (SystemOrganizationUnitApi.OrganizationUnitDto & {
            parentId?: number | null;
          })
        | null
      >();
      if (data?.id) {
        modalApi.lock();
        try {
          const detail = await getOrganizationUnit(data.id);
          formData.value = detail;
          formApi.setValues(mapDtoToFormValues(detail));
        } finally {
          modalApi.lock(false);
        }
      } else if (data?.parentId) {
        formData.value = undefined;
        formApi.resetForm();
        formApi.setValues({ parentId: data.parentId });
      } else {
        formData.value = undefined;
        formApi.resetForm();
      }
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[800px]">
    <Form class="mx-4" />
    <template #prepend-footer>
      <div class="flex-auto">
        <Button type="primary" danger @click="resetForm">
          {{ $t('common.reset') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
