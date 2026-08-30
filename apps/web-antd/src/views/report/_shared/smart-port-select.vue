<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import AirPortSelect from '#/adapter/component/biz-select/air-port-select.vue';

const props = defineProps({
  modelValue: [String, Number],
  bizType: {
    type: [Number, String],
    default: null,
  },
  placeholder: {
    type: String,
    default: '请选择港口',
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

// 使用ref来跟踪当前值，避免在组件切换时丢失值
const currentValue = ref(props.modelValue);

// 监听props变化
watch(
  () => props.modelValue,
  (newValue) => {
    currentValue.value = newValue;
  },
);

const isAirPort = computed(() => {
  return props.bizType === 2; // 空运业务类型为2
});

const handleValueChange = (value: any) => {
  currentValue.value = value;
  emit('update:modelValue', value);
};

const handleChange = (value: any, option: any) => {
  emit('change', value, option);
};
</script>

<template>
  <div v-if="isAirPort">
    <AirPortSelect
      :model-value="currentValue"
      :placeholder="placeholder"
      style="width: 100%"
      @update:model-value="handleValueChange"
      @change="handleChange"
    />
  </div>
  <div v-else>
    <PortSelect
      :model-value="currentValue"
      :placeholder="placeholder"
      style="width: 100%"
      @update:model-value="handleValueChange"
      @change="handleChange"
    />
  </div>
</template>
