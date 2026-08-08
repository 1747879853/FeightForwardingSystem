<script setup>
import { computed } from 'vue';
import { InputNumber as AInputNumber, Select as ASelect } from 'ant-design-vue';
import { OrganizationSelect, UserSelect } from '#/adapter/component';
import {
  getConditionEnumOptions,
  getConditionFieldLabel,
  getConditionValueKind,
} from '#/api/system/workflow-admin';

const props = defineProps({
  condition: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update']);

const kind = computed(() =>
  getConditionValueKind(props.condition.taskTypeCondition),
);

const enumOptions = computed(() =>
  getConditionEnumOptions(props.condition.taskTypeCondition),
);

const fieldLabel = computed(() =>
  getConditionFieldLabel(props.condition.taskTypeCondition),
);

const placeholder = computed(() => {
  if (kind.value === 'number') return `请输入${fieldLabel.value}`;
  return `请选择${fieldLabel.value}`;
});

/** UserSelect 编辑回显：详情只回传 value/valueText，需要补一条已选项 */
const userSelectedItems = computed(() => {
  const { value, valueText } = props.condition;
  if (value == null || value === '') return [];
  return [{ id: value, nickName: valueText || String(value) }];
});

function emitUpdate(value, valueText) {
  emit('update', { value, valueText });
}

function pickOptionLabel(option, keys) {
  const target = Array.isArray(option) ? option[0] : option;
  if (!target) return '';
  for (const key of keys) {
    if (target[key]) return target[key];
  }
  return '';
}

function onUserChange(val, option) {
  if (val == null || val === '') {
    emitUpdate(undefined, undefined);
    return;
  }
  emitUpdate(
    val,
    pickOptionLabel(option, ['nickName', 'label']) || String(val),
  );
}

function onOptionChange(val, option) {
  if (val == null || val === '') {
    emitUpdate(undefined, undefined);
    return;
  }
  emitUpdate(val, pickOptionLabel(option, ['label']) || String(val));
}

function onNumberChange(val) {
  if (val == null || val === '') {
    emitUpdate(undefined, undefined);
    return;
  }
  emitUpdate(val, String(val));
}
</script>

<template>
  <UserSelect
    v-if="kind === 'user'"
    :model-value="condition.value"
    :placeholder="placeholder"
    use-rich-option-label
    option-label-prop="nickName"
    :selected-items="userSelectedItems"
    style="width: 100%"
    :allow-clear="false"
    @change="onUserChange"
  />
  <OrganizationSelect
    v-else-if="kind === 'org'"
    :model-value="condition.value"
    :placeholder="placeholder"
    style="width: 100%"
    :allow-clear="false"
    @change="onOptionChange"
  />
  <ASelect
    v-else-if="kind === 'enum'"
    :value="condition.value"
    :options="enumOptions"
    :placeholder="placeholder"
    style="width: 100%"
    @change="onOptionChange"
  />
  <AInputNumber
    v-else-if="kind === 'number'"
    :value="condition.value"
    :placeholder="placeholder"
    :precision="2"
    style="width: 100%"
    @change="onNumberChange"
  />
  <span v-else class="no-value-tip">此条件无需填写值</span>
</template>

<style scoped>
.no-value-tip {
  display: inline-block;
  font-size: 12px;
  line-height: 32px;
  color: #999;
}
</style>
