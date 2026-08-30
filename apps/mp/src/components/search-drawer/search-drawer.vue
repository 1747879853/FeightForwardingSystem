<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
  }>(),
  {
    modelValue: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function close() {
  if (!props.modelValue) return;
  emit('update:modelValue', false);
}
</script>

<template>
  <view v-if="modelValue" class="search-drawer" @tap="close">
    <view class="search-drawer__panel" @tap.stop>
      <slot />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.search-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  background: rgb(0 0 0 / 45%);
}

.search-drawer__panel {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
}
</style>
