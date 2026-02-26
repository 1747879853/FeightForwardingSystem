<script lang="ts" setup>
import type {
  GenerateNumAdminApi,
  GenerateEnum,
} from '#/api/system/base-data/generate-num-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Input, InputNumber, message, Select } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addGenerateNum,
  editGenerateNum,
  getGenerateNumDetail,
} from '#/api/system/base-data/generate-num-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<GenerateNumAdminApi.GenerateNumDto>();

type RuleRow = {
  key: string;
  generateEnum?: GenerateEnum;
  text?: string;
  length?: number;
  sortId?: number;
  id?: number;
  generateNumId?: number;
};

const generateEnumOptions = computed(() => [
  {
    value: 0 as GenerateEnum,
    label: $t('system.basicData.generateNum.generateEnumOptions.autoNum'),
  },
  {
    value: 1 as GenerateEnum,
    label: $t('system.basicData.generateNum.generateEnumOptions.text'),
  },
  {
    value: 2 as GenerateEnum,
    label: $t('system.basicData.generateNum.generateEnumOptions.userName'),
  },
  {
    value: 3 as GenerateEnum,
    label: $t('system.basicData.generateNum.generateEnumOptions.yyyyMMdd'),
  },
  {
    value: 4 as GenerateEnum,
    label: $t('system.basicData.generateNum.generateEnumOptions.yyMMdd'),
  },
]);

const rulesData = ref<RuleRow[]>([]);
let nextKey = 0;

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.generateNum.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.generateNum.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const addRule = () => {
  rulesData.value = [
    ...rulesData.value,
    {
      key: `rule_${nextKey++}`,
      generateEnum: 0,
      text: '',
      length: 4,
      sortId: rulesData.value.length,
    },
  ];
};

const removeRule = (key: string) => {
  rulesData.value = rulesData.value.filter((r) => r.key !== key);
};

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();
    const values = await formApi.getValues();

    const mapRulesToAdd = (): GenerateNumAdminApi.GenerateNumRuleAddDto[] =>
      rulesData.value.map((r) => ({
        generateEnum: r.generateEnum,
        text: r.text,
        length: r.length,
        sortId: r.sortId ?? 0,
      }));

    const mapRulesToEdit = (): GenerateNumAdminApi.GenerateNumRuleEditDto[] =>
      rulesData.value.map((r) => ({
        id: r.id,
        generateNumId: r.generateNumId ?? formData.value?.id,
        generateEnum: r.generateEnum,
        text: r.text,
        length: r.length,
        sortId: r.sortId ?? 0,
      }));

    try {
      if (formData.value?.id) {
        await editGenerateNum({
          id: formData.value.id,
          name: values.name,
          tableName: values.tableName,
          userId: values.userId,
          generateNumRules: mapRulesToEdit(),
        });
      } else {
        await addGenerateNum({
          name: values.name,
          tableName: values.tableName,
          userId: values.userId,
          generateNumRules: mapRulesToAdd(),
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
      modalApi.lock();
      try {
        const detail = await getGenerateNumDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          name: detail.name,
          tableName: detail.tableName,
          userId: detail.userId,
        });
        rulesData.value = (detail.generateNumRules ?? []).map((r, i) => ({
          key: `rule_${r.id ?? nextKey++}`,
          id: r.id,
          generateNumId: r.generateNumId,
          generateEnum: r.generateEnum,
          text: r.text,
          length: r.length,
          sortId: r.sortId ?? i,
        }));
      } finally {
        modalApi.lock(false);
      }
    } else {
      formData.value = undefined;
      formApi.resetForm();
      rulesData.value = [];
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="mx-4" />
    <div class="mx-4 mt-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">
          {{ $t('system.basicData.generateNum.rules') }}
        </span>
        <Button type="dashed" size="small" @click="addRule">
          {{ $t('system.basicData.generateNum.addRule') }}
        </Button>
      </div>
      <div class="overflow-x-auto rounded border">
        <table class="w-full min-w-[500px] text-sm">
          <thead>
            <tr class="border-b bg-gray-50">
              <th class="px-3 py-2 text-left font-medium">
                {{ $t('system.basicData.generateNum.generateEnum') }}
              </th>
              <th class="px-3 py-2 text-left font-medium">
                {{ $t('system.basicData.generateNum.text') }}
              </th>
              <th class="px-3 py-2 text-left font-medium">
                {{ $t('system.basicData.generateNum.length') }}
              </th>
              <th class="px-3 py-2 text-left font-medium">
                {{ $t('system.basicData.generateNum.sortId') }}
              </th>
              <th class="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rulesData"
              :key="row.key"
              class="border-b last:border-b-0"
            >
              <td class="px-3 py-2">
                <Select
                  v-model:value="row.generateEnum"
                  :options="generateEnumOptions"
                  allow-clear
                  class="w-full"
                  size="small"
                />
              </td>
              <td class="px-3 py-2">
                <Input
                  v-model:value="row.text"
                  :placeholder="$t('ui.placeholder.input')"
                  size="small"
                />
              </td>
              <td class="px-3 py-2">
                <InputNumber
                  v-model:value="row.length"
                  :min="0"
                  :precision="0"
                  class="w-full"
                  size="small"
                />
              </td>
              <td class="px-3 py-2">
                <InputNumber
                  v-model:value="row.sortId"
                  :min="0"
                  :precision="0"
                  class="w-full"
                  size="small"
                />
              </td>
              <td class="px-3 py-2">
                <Button
                  type="link"
                  danger
                  size="small"
                  @click="removeRule(row.key)"
                >
                  {{ $t('common.delete') }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Modal>
</template>
