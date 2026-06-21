<script setup lang="ts">
import type { PinInputProps } from './types';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { Input } from '../../ui';
import { VbenButton } from '../button';

defineOptions({
  inheritAttrs: false,
});

const {
  codeLength = 6,
  createText = async () => {},
  disabled = false,
  handleSendCode = async () => {},
  loading = false,
  maxTime = 60,
  placeholder = '',
} = defineProps<PinInputProps>();

const emit = defineEmits<{
  complete: [];
  sendError: [error: any];
}>();

const timer = ref<ReturnType<typeof setTimeout>>();
const modelValue = defineModel<string>();
const countdown = ref(0);

const btnText = computed(() => {
  return createText?.(countdown.value);
});

const btnDisabled = computed(() => {
  return disabled || loading || countdown.value > 0;
});

watch(modelValue, (value) => {
  if (value?.length === codeLength) {
    emit('complete');
  }
});

async function handleSend(e: Event) {
  try {
    e?.preventDefault();
    countdown.value = maxTime;
    startCountdown();
    await handleSendCode();
  } catch (error) {
    countdown.value = 0;
    clearTimeout(timer.value);
    console.error('Failed to send code:', error);
    emit('sendError', error);
  }
}

function startCountdown() {
  if (countdown.value > 0) {
    timer.value = setTimeout(() => {
      countdown.value--;
      startCountdown();
    }, 1000);
  }
}

onBeforeUnmount(() => {
  countdown.value = 0;
  clearTimeout(timer.value);
});
</script>

<template>
  <div class="vben-sms-code-input flex w-full items-center gap-2">
    <Input
      v-model="modelValue"
      :disabled="disabled"
      :maxlength="codeLength"
      :placeholder="placeholder"
      class="min-w-0 flex-1"
    />
    <VbenButton
      :disabled="btnDisabled"
      :loading="loading"
      class="vben-sms-code-input__send flex-shrink-0"
      size="lg"
      variant="outline"
      @click="handleSend"
    >
      {{ btnText }}
    </VbenButton>
  </div>
</template>
