<script lang="ts" setup>
import type {
  GenerateNumAdminApi,
  GenerateEnum,
} from '#/api/system/base-data/generate-num-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Checkbox,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Tooltip,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addGenerateNum,
  editGenerateNum,
  getGenerateNumDetail,
} from '#/api/system/base-data/generate-num-admin';
import { $t } from '#/locales';

import {
  buildGenerateNumPreview,
  GENERATE_ENUM,
  getTableNameLabel,
  hasAutoNumRule,
  showRuleLengthField,
  showRuleResetField,
  showRuleTextField,
  useFormSchema,
} from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<GenerateNumAdminApi.GenerateNumDto>();
const userStore = useUserStore();

type RuleRow = {
  key: string;
  generateEnum?: GenerateEnum;
  text?: string;
  length?: number;
  reset?: boolean;
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
    value: GENERATE_ENUM.AutoNum,
    label: $t('system.basicData.generateNum.generateEnumOptions.autoNum'),
  },
  {
    value: GENERATE_ENUM.Text,
    label: $t('system.basicData.generateNum.generateEnumOptions.text'),
  },
  {
    value: GENERATE_ENUM.UserName,
    label: $t('system.basicData.generateNum.generateEnumOptions.userName'),
  },
  {
    value: GENERATE_ENUM.yyyyMMdd,
    label: $t('system.basicData.generateNum.generateEnumOptions.yyyyMMdd'),
  },
  {
    value: GENERATE_ENUM.yyMMdd,
    label: $t('system.basicData.generateNum.generateEnumOptions.yyMMdd'),
  },
  {
    value: GENERATE_ENUM.yyyyMM,
    label: $t('system.basicData.generateNum.generateEnumOptions.yyyyMM'),
  },
  {
    value: GENERATE_ENUM.yyMM,
    label: $t('system.basicData.generateNum.generateEnumOptions.yyMM'),
  },
  {
    value: GENERATE_ENUM.ETDyyyyMM,
    label: $t('system.basicData.generateNum.generateEnumOptions.ETDyyyyMM'),
  },
  {
    value: GENERATE_ENUM.ETDyyMM,
    label: $t('system.basicData.generateNum.generateEnumOptions.ETDyyMM'),
  },
]);

const rulesData = ref<RuleRow[]>([]);
const userRelationsData = ref<UserRelationRow[]>([]);
let nextKey = 0;

const previewUserName = computed(
  () =>
    userStore.userInfo?.username?.trim() ||
    userStore.userInfo?.realName?.trim() ||
    '',
);

const previewText = computed(() =>
  buildGenerateNumPreview(rulesData.value, {
    userName: previewUserName.value,
    sampleNum: 1,
  }),
);

const showPreviewMissingAutoNum = computed(
  () => rulesData.value.length > 0 && !hasAutoNumRule(rulesData.value),
);

const hasAutoNumInOtherRows = (currentKey: string) =>
  rulesData.value.some(
    (rule) =>
      rule.key !== currentKey && rule.generateEnum === GENERATE_ENUM.AutoNum,
  );

const getGenerateEnumOptionsForRow = (row: RuleRow) =>
  generateEnumOptions.value.map((option) => ({
    ...option,
    disabled:
      option.value === GENERATE_ENUM.AutoNum &&
      hasAutoNumInOtherRows(row.key) &&
      row.generateEnum !== GENERATE_ENUM.AutoNum,
  }));

const getRuleTitle = (row: RuleRow, index: number) => {
  const baseTitle = `${$t('system.basicData.generateNum.ruleItem')} #${index + 1}`;
  const typeLabel = generateEnumOptions.value.find(
    (option) => option.value === row.generateEnum,
  )?.label;
  return typeLabel ? `${baseTitle} · ${typeLabel}` : baseTitle;
};

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.generateNum.tableName')])
    : $t('ui.actionTitle.create', [
        $t('system.basicData.generateNum.tableName'),
      ]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const normalizeRuleOnTypeChange = (row: RuleRow) => {
  if (row.generateEnum === GENERATE_ENUM.AutoNum) {
    row.reset = false;
    if (!Number.isInteger(row.length) || Number(row.length) <= 0) {
      row.length = 4;
    }
    return;
  }

  if (row.generateEnum !== GENERATE_ENUM.Text) {
    row.text = '';
  }
};

const addRule = () => {
  rulesData.value.push({
    key: `rule_${nextKey++}`,
    generateEnum: GENERATE_ENUM.Text,
    text: '',
    length: 4,
    reset: false,
  });
};

const moveRule = (from: number, to: number) => {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= rulesData.value.length ||
    to >= rulesData.value.length
  ) {
    return;
  }
  const [moved] = rulesData.value.splice(from, 1);
  rulesData.value.splice(to, 0, moved);
};

const moveUp = (index: number) => {
  moveRule(index, index - 1);
};

const moveDown = (index: number) => {
  moveRule(index, index + 1);
};

const removeRule = (index: number) => {
  rulesData.value.splice(index, 1);
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
    (rule) => rule.generateEnum === GENERATE_ENUM.AutoNum,
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

    if (
      row.generateEnum === GENERATE_ENUM.AutoNum &&
      (!Number.isInteger(row.length) || Number(row.length) <= 0)
    ) {
      message.error(`第${rowNo}行自增序号长度必须大于0`);
      return false;
    }

    if (
      row.generateEnum === GENERATE_ENUM.Text &&
      !String(row.text ?? '').trim()
    ) {
      message.error(`第${rowNo}行固定字符串不能为空`);
      return false;
    }
  }

  return true;
};

const mapRuleToAdd = (
  rule: RuleRow,
  index: number,
): GenerateNumAdminApi.GenerateNumRuleAddDto => ({
  generateEnum: rule.generateEnum,
  text: rule.generateEnum === GENERATE_ENUM.Text ? rule.text : undefined,
  length: rule.generateEnum === GENERATE_ENUM.AutoNum ? rule.length : undefined,
  reset:
    rule.generateEnum === GENERATE_ENUM.AutoNum ? false : Boolean(rule.reset),
  sortId: index,
});

const mapRuleToEdit = (
  rule: RuleRow,
  index: number,
): GenerateNumAdminApi.GenerateNumRuleEditDto => ({
  id: rule.id,
  generateNumId: rule.generateNumId ?? formData.value?.id,
  generateEnum: rule.generateEnum,
  text: rule.generateEnum === GENERATE_ENUM.Text ? rule.text : undefined,
  length: rule.generateEnum === GENERATE_ENUM.AutoNum ? rule.length : undefined,
  reset:
    rule.generateEnum === GENERATE_ENUM.AutoNum ? false : Boolean(rule.reset),
  sortId: index,
});

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

    const mapUsersToAdd = (): GenerateNumAdminApi.GenerateNumUserAddDto[] => {
      return submitUserIds.map((userId: number) => ({ userId }));
    };

    const mapUsersToEdit = (): GenerateNumAdminApi.GenerateNumUserEditDto[] => {
      return submitUserIds.map((userId: number) => {
        const existed = userRelationsData.value.find(
          (user) => user.userId === userId,
        );
        return {
          id: existed?.id,
          generateNumId: existed?.generateNumId ?? formData.value?.id,
          userId,
        };
      });
    };

    try {
      const ruleName =
        getTableNameLabel(values.tableName) || values.tableName || '';
      if (formData.value?.id) {
        await editGenerateNum({
          id: formData.value.id,
          name: ruleName,
          tableName: values.tableName,
          orgId: submitOrgId,
          generateNumRules: rulesData.value.map((rule, index) =>
            mapRuleToEdit(rule, index),
          ),
          generateNumUsers: mapUsersToEdit(),
        });
      } else {
        await addGenerateNum({
          name: ruleName,
          tableName: values.tableName,
          orgId: submitOrgId,
          generateNumRules: rulesData.value.map((rule, index) =>
            mapRuleToAdd(rule, index),
          ),
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
          tableName: detail.tableName,
          applyScope,
          orgId: detail.orgId,
          generateNumUserIds: (detail.generateNumUsers ?? []).map(
            (user) => user.userId,
          ),
        });
        rulesData.value = (detail.generateNumRules ?? [])
          .slice()
          .sort(
            (a, b) =>
              Number(a.sortId ?? Number.MAX_SAFE_INTEGER) -
              Number(b.sortId ?? Number.MAX_SAFE_INTEGER),
          )
          .map((rule) => ({
            key: `rule_${rule.id ?? nextKey++}`,
            id: rule.id,
            generateNumId: rule.generateNumId,
            generateEnum: rule.generateEnum,
            text: rule.text,
            length: rule.length,
            reset: rule.reset,
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
  <Modal :title="getTitle" class="w-[920px]">
    <Form class="mx-4" />
    <div class="mx-4 mt-4">
      <div
        class="mb-4 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3"
      >
        <div class="text-sm text-gray-500">
          {{ $t('system.basicData.generateNum.preview') }}
        </div>
        <div
          class="mt-1 break-all font-mono text-xl font-semibold text-blue-700"
        >
          {{ previewText || $t('system.basicData.generateNum.previewEmpty') }}
        </div>
        <div class="mt-1 text-xs text-gray-500">
          {{ $t('system.basicData.generateNum.previewHint') }}
        </div>
        <Alert
          v-if="showPreviewMissingAutoNum"
          class="mt-3"
          type="warning"
          show-icon
          :message="$t('system.basicData.generateNum.previewMissingAutoNum')"
        />
      </div>

      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">
          {{ $t('system.basicData.generateNum.rules') }}
        </span>
        <Button type="dashed" size="small" @click="addRule">
          {{ $t('system.basicData.generateNum.addRule') }}
        </Button>
      </div>

      <div
        v-if="rulesData.length === 0"
        class="rounded border border-dashed px-4 py-8 text-center text-sm text-gray-400"
      >
        {{ $t('system.basicData.generateNum.previewEmpty') }}
      </div>

      <div v-else class="space-y-2">
        <TransitionGroup name="generate-num-rule" tag="div" class="space-y-2">
          <div
            v-for="(row, index) in rulesData"
            :key="row.key"
            class="group rounded border border-gray-200 bg-white px-3 py-2.5"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <div
                class="min-w-0 border-l-4 border-blue-500 pl-2 text-sm font-semibold text-slate-800"
              >
                {{ getRuleTitle(row, index) }}
              </div>
              <Space :size="4" class="shrink-0">
                <Button
                  type="text"
                  size="small"
                  :disabled="index === 0"
                  @click="moveUp(index)"
                >
                  {{ $t('system.basicData.generateNum.moveUp') }}
                </Button>
                <Button
                  type="text"
                  size="small"
                  :disabled="index === rulesData.length - 1"
                  @click="moveDown(index)"
                >
                  {{ $t('system.basicData.generateNum.moveDown') }}
                </Button>
                <button
                  type="button"
                  class="flex size-6 items-center justify-center rounded text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  :title="$t('common.delete')"
                  @click="removeRule(index)"
                >
                  <IconifyIcon icon="mdi:delete-outline" class="size-4" />
                </button>
              </Space>
            </div>

            <div class="flex flex-wrap items-end gap-x-3 gap-y-2">
              <div class="w-[168px] shrink-0">
                <div class="mb-1 text-xs text-gray-500">
                  {{ $t('system.basicData.generateNum.generateEnum') }}
                </div>
                <Select
                  v-model:value="row.generateEnum"
                  :options="getGenerateEnumOptionsForRow(row)"
                  allow-clear
                  class="w-full"
                  size="small"
                  @change="normalizeRuleOnTypeChange(row)"
                />
              </div>

              <div
                v-if="showRuleTextField(row.generateEnum)"
                class="min-w-[120px] flex-1"
              >
                <div class="mb-1 text-xs text-gray-500">
                  {{ $t('system.basicData.generateNum.text') }}
                </div>
                <Input
                  v-model:value="row.text"
                  :placeholder="$t('ui.placeholder.input')"
                  size="small"
                />
              </div>

              <div
                v-if="showRuleLengthField(row.generateEnum)"
                class="w-24 shrink-0"
              >
                <div class="mb-1 text-xs text-gray-500">
                  {{ $t('system.basicData.generateNum.length') }}
                </div>
                <InputNumber
                  v-model:value="row.length"
                  :min="1"
                  :precision="0"
                  class="w-full"
                  size="small"
                />
              </div>

              <div
                v-if="showRuleResetField(row.generateEnum)"
                class="shrink-0 pb-0.5"
              >
                <Tooltip :title="$t('system.basicData.generateNum.resetHint')">
                  <label
                    class="inline-flex cursor-pointer items-center gap-2 text-sm leading-6"
                  >
                    <Checkbox v-model:checked="row.reset" />
                    <span>{{ $t('system.basicData.generateNum.reset') }}</span>
                  </label>
                </Tooltip>
              </div>
            </div>
          </div>
        </TransitionGroup>

        <div class="text-xs text-gray-500">
          {{ $t('system.basicData.generateNum.sortTip') }}
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.generate-num-rule-move,
.generate-num-rule-enter-active,
.generate-num-rule-leave-active {
  transition:
    transform 260ms cubic-bezier(0.25, 1, 0.5, 1),
    opacity 220ms cubic-bezier(0.25, 1, 0.5, 1);
}

.generate-num-rule-enter-from,
.generate-num-rule-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (prefers-reduced-motion: reduce) {
  .generate-num-rule-move,
  .generate-num-rule-enter-active,
  .generate-num-rule-leave-active {
    transition: none;
  }

  .generate-num-rule-enter-from,
  .generate-num-rule-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
