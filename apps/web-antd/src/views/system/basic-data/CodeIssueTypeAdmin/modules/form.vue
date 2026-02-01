<script lang="ts" setup>
import type { CodeIssueTypeAdminApi } from '#/api/system/base-data/code-issue-type-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCodeIssueType,
  editCodeIssueType,
  getCodeIssueTypeDetail,
} from '#/api/system/base-data/code-issue-type-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CodeIssueTypeAdminApi.CodeIssueTypeDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.codeIssueType.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.codeIssueType.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        // 编辑模式
        await editCodeIssueType({
          id: formData.value.id,
          billType: values.billType,
          enName: values.enName,
          noBill: values.noBill,
          copyNoBill: values.copyNoBill,
          ediCode: values.ediCode,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addCodeIssueType({
          billType: values.billType,
          enName: values.enName,
          noBill: values.noBill,
          copyNoBill: values.copyNoBill,
          ediCode: values.ediCode,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
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

    const data = modalApi.getData<{ id?: number }>();
    if (data?.id) {
      // 编辑模式 - 加载详情
      modalApi.lock();
      try {
        const detail = await getCodeIssueTypeDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          billType: detail.billType,
          enName: detail.enName,
          noBill: detail.noBill,
          copyNoBill: detail.copyNoBill,
          ediCode: detail.ediCode,
          enable: detail.enable,
          sortId: detail.sortId,
          remark: detail.remark,
        });
      } finally {
        modalApi.lock(false);
      }
    } else {
      // 新增模式
      formData.value = undefined;
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
