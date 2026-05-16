<script lang="ts" setup>
import type {
  GenerateNumAdminApi,
  GenerateEnum,
} from '#/api/system/base-data/generate-num-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  message,
  Select,
} from 'ant-design-vue';

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
  reset?: boolean;
  sortId?: number;
  id?: number;
  generateNumId?: number;
};

type UserRelationRow = {
  id?: number;
  generateNumId?: number;
  userId: number;
  nickName?: string;
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
const userRelationsData = ref<UserRelationRow[]>([]);
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
      reset: false,
      sortId: rulesData.value.length,
    },
  ];
};

const removeRule = (key: string) => {
  rulesData.value = rulesData.value.filter((r) => r.key !== key);
};

const validateBeforeSubmit = (values: Record<string, any>) => {
  const applyScope = values.applyScope ?? 'none';
  const hasOrg =
    applyScope === 'org' &&
    values.orgId !== null &&
    values.orgId !== undefined &&
    values.orgId !== '';
  const userIds =
    applyScope === 'user' && Array.isArray(values.generateNumUserIds)
      ? values.generateNumUserIds
      : [];

  if (hasOrg && userIds.length > 0) {
    message.error('组织和适用用户不能同时设置');
    return false;
  }

  if (applyScope === 'org' && !hasOrg) {
    message.error('请选择适用组织');
    return false;
  }

  if (applyScope === 'user' && userIds.length === 0) {
    message.error('请选择适用用户');
    return false;
  }

  if (!Array.isArray(rulesData.value) || rulesData.value.length === 0) {
    message.error('子表规则不能为空');
    return false;
  }

  const autoNumCount = rulesData.value.filter(
    (r) => r.generateEnum === 0,
  ).length;
  if (autoNumCount > 1) {
    message.error('自增编号数量不可超过1');
    return false;
  }

  for (let i = 0; i < rulesData.value.length; i++) {
    const row = rulesData.value[i];
    const rowNo = i + 1;

    if (row.generateEnum === undefined || row.generateEnum === null) {
      message.error(`第${rowNo}行规则缺少生成类型`);
      return false;
    }

    if (!Number.isInteger(row.length) || Number(row.length) <= 0) {
      message.error(`第${rowNo}行规则长度必须大于0`);
      return false;
    }

    if (row.generateEnum === 1 && !String(row.text ?? '').trim()) {
      message.error(`第${rowNo}行固定字符串不能为空`);
      return false;
    }
  }

  return true;
};

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();
    const values = await formApi.getValues();
    if (!validateBeforeSubmit(values)) {
      modalApi.lock(false);
      return;
    }

    const applyScope = values.applyScope ?? 'none';
    const submitOrgId = applyScope === 'org' ? (values.orgId ?? null) : null;
    const submitUserIds =
      applyScope === 'user' && Array.isArray(values.generateNumUserIds)
        ? values.generateNumUserIds
        : [];

    const mapRulesToAdd = (): GenerateNumAdminApi.GenerateNumRuleAddDto[] =>
      rulesData.value.map((r) => ({
        generateEnum: r.generateEnum,
        text: r.generateEnum === 1 ? r.text : undefined,
        length: r.length,
        reset: Boolean(r.reset),
        sortId: r.sortId ?? 0,
      }));

    const mapRulesToEdit = (): GenerateNumAdminApi.GenerateNumRuleEditDto[] =>
      rulesData.value.map((r) => ({
        id: r.id,
        generateNumId: r.generateNumId ?? formData.value?.id,
        generateEnum: r.generateEnum,
        text: r.generateEnum === 1 ? r.text : undefined,
        length: r.length,
        reset: Boolean(r.reset),
        sortId: r.sortId ?? 0,
      }));

    const mapUsersToAdd = (): GenerateNumAdminApi.GenerateNumUserAddDto[] => {
      return submitUserIds.map((userId: number) => ({ userId }));
    };

    const mapUsersToEdit = (): GenerateNumAdminApi.GenerateNumUserEditDto[] => {
      return submitUserIds.map((userId: number) => {
        const existed = userRelationsData.value.find(
          (u) => u.userId === userId,
        );
        return {
          id: existed?.id,
          generateNumId: existed?.generateNumId ?? formData.value?.id,
          userId,
        };
      });
    };

    try {
      if (formData.value?.id) {
        await editGenerateNum({
          id: formData.value.id,
          name: values.name,
          tableName: values.tableName,
          orgId: submitOrgId,
          generateNumRules: mapRulesToEdit(),
          generateNumUsers: mapUsersToEdit(),
        });
      } else {
        await addGenerateNum({
          name: values.name,
          tableName: values.tableName,
          orgId: submitOrgId,
          generateNumRules: mapRulesToAdd(),
          generateNumUsers: mapUsersToAdd(),
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
        const hasOrg =
          detail.orgId !== null &&
          detail.orgId !== undefined &&
          detail.orgId !== '';
        const hasUsers = Array.isArray(detail.generateNumUsers)
          ? detail.generateNumUsers.length > 0
          : false;
        const applyScope = hasOrg ? 'org' : hasUsers ? 'user' : 'none';
        formApi.setValues({
          name: detail.name,
          tableName: detail.tableName,
          applyScope,
          orgId: detail.orgId,
          generateNumUserIds: (detail.generateNumUsers ?? []).map(
            (u) => u.userId,
          ),
        });
        rulesData.value = (detail.generateNumRules ?? []).map((r, i) => ({
          key: `rule_${r.id ?? nextKey++}`,
          id: r.id,
          generateNumId: r.generateNumId,
          generateEnum: r.generateEnum,
          text: r.text,
          length: r.length,
          reset: r.reset,
          sortId: r.sortId ?? i,
        }));
        userRelationsData.value = detail.generateNumUsers ?? [];
      } finally {
        modalApi.lock(false);
      }
    } else {
      formData.value = undefined;
      formApi.resetForm();
      formApi.setValues({
        applyScope: 'none',
        orgId: null,
        generateNumUserIds: [],
      });
      rulesData.value = [];
      userRelationsData.value = [];
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[1000px]">
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
                {{ $t('system.basicData.generateNum.reset') }}
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
                  :min="1"
                  :precision="0"
                  class="w-full"
                  size="small"
                />
              </td>
              <td class="px-3 py-2">
                <Checkbox v-model:checked="row.reset" />
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
