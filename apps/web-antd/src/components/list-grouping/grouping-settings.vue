<script lang="ts" setup generic="TField extends number = number">
import type { GroupFieldDef } from './types';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Popover, Radio, RadioGroup } from 'ant-design-vue';

const props = defineProps<{
  /** 可选分组字段 */
  fields: GroupFieldDef<TField>[];
  /** 当前启用的分组字段值，undefined 表示不分组 */
  value?: TField | undefined;
}>();

const emit = defineEmits<{
  /** 切换分组字段，value 为 undefined 表示关闭分组 */
  (e: 'change', value: TField | undefined): void;
}>();

const open = ref(false);

const NONE = '__none__';

const radioValue = computed<string>(() =>
  props.value === undefined ? NONE : String(props.value),
);

function onRadioChange(event: any) {
  const next = event?.target?.value;
  if (next === NONE) {
    emit('change', undefined);
  } else {
    const field = props.fields.find((item) => String(item.value) === next);
    if (field) {
      emit('change', field.value);
    }
  }
  open.value = false;
}
</script>

<template>
  <Popover
    v-model:open="open"
    trigger="click"
    placement="bottomRight"
    :arrow="false"
  >
    <template #content>
      <div class="w-40">
        <RadioGroup :value="radioValue" @change="onRadioChange">
          <div class="flex flex-col gap-1">
            <Radio :value="NONE">不分组</Radio>
            <Radio
              v-for="field in fields"
              :key="field.value"
              :value="String(field.value)"
            >
              {{ field.label }}
            </Radio>
          </div>
        </RadioGroup>
      </div>
    </template>
    <Button
      shape="circle"
      :type="value === undefined ? 'default' : 'primary'"
      title="分组设置"
    >
      <IconifyIcon icon="lucide:layers" class="size-4" />
    </Button>
  </Popover>
</template>
