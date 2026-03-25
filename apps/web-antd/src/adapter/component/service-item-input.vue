<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';

import { Checkbox } from 'ant-design-vue';

const ClientSelect = defineAsyncComponent(
  () => import('./biz-select/client-select.vue'),
);

interface Props {
  value?: number | string;
  disabled?: boolean;
  industryCategory?: string;
  placeholder?: string;
  allowClear?: boolean;
  selectedItems?: any[];
  formContext?: { setFieldValue: (field: string, value: any) => void };
  secondFieldName?: string;
  secondFieldValue?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  disabled: false,
  industryCategory: '',
  placeholder: '请选择',
  allowClear: true,
  selectedItems: () => [],
  secondFieldName: '',
  secondFieldValue: false,
  title: '',
});

const emit = defineEmits<{
  'update:value': [value: number | string | undefined];
}>();

const checked = computed(() => !!props.secondFieldValue);

const handleCheckedChange = (event: any) => {
  const nextChecked = !!event?.target?.checked;
  if (props.secondFieldName) {
    props.formContext?.setFieldValue(props.secondFieldName, nextChecked);
  }
  if (!nextChecked) {
    emit('update:value', undefined);
  }
};

const handleValueChange = (value: number | string | undefined) => {
  emit('update:value', value);
  if (
    value !== undefined &&
    value !== null &&
    value !== '' &&
    props.secondFieldName
  ) {
    props.formContext?.setFieldValue(props.secondFieldName, true);
  }
};
</script>

<template>
  <div
    class="service-item-card__inner"
    :class="{ 'service-item-card__inner--active': checked }"
  >
    <div class="service-item-card__toggle">
      <Checkbox
        :checked="checked"
        :disabled="props.disabled"
        @change="handleCheckedChange"
      >
        {{ props.title }}
      </Checkbox>
    </div>
    <div
      class="service-item-card__input"
      :class="{ 'service-item-card__input--hidden': !checked }"
    >
      <ClientSelect
        :model-value="props.value"
        :disabled="props.disabled"
        :industry-category="props.industryCategory"
        :placeholder="props.placeholder"
        :allow-clear="props.allowClear"
        :selected-items="props.selectedItems || []"
        class="w-full"
        @update:model-value="handleValueChange"
      />
    </div>
  </div>
</template>
