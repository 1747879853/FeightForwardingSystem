<script lang="ts" setup>
import type { CodeGoodsAdminApi } from '#/api/system/base-data/code-goods-admin';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCodeGoods,
  editCodeGoods,
  getCodeGoodsDetail,
} from '#/api/system/base-data/code-goods-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CodeGoodsAdminApi.CodeGoodsDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.codeGoods.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.codeGoods.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    drawerApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        // 编辑模式
        await editCodeGoods({
          id: formData.value.id,
          code: values.code,
          name: values.name,
          goodNo: values.goodNo,
          enName: values.enName,
          description: values.description,
          hsCode: values.hsCode,
          ruleUnit: values.ruleUnit,
          ruleUnit1: values.ruleUnit1,
          ruleUnit2: values.ruleUnit2,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      } else {
        // 新增模式
        await addCodeGoods({
          code: values.code,
          name: values.name,
          goodNo: values.goodNo,
          enName: values.enName,
          description: values.description,
          hsCode: values.hsCode,
          ruleUnit: values.ruleUnit,
          ruleUnit1: values.ruleUnit1,
          ruleUnit2: values.ruleUnit2,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
        });
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      drawerApi.close();
      emit('success');
    } finally {
      drawerApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    const data = drawerApi.getData<{ id?: number }>();
    if (data?.id) {
      // 编辑模式 - 加载详情
      drawerApi.lock();
      try {
        const detail = await getCodeGoodsDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          code: detail.code,
          name: detail.name,
          goodNo: detail.goodNo,
          enName: detail.enName,
          description: detail.description,
          hsCode: detail.hsCode,
          ruleUnit: detail.ruleUnit,
          ruleUnit1: detail.ruleUnit1,
          ruleUnit2: detail.ruleUnit2,
          enable: detail.enable,
          sortId: detail.sortId,
          remark: detail.remark,
        });
      } finally {
        drawerApi.lock(false);
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
  <Drawer :title="getTitle">
    <Form class="mx-4" />
  </Drawer>
</template>
