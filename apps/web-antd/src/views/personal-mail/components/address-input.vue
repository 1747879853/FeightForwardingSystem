<script setup lang="ts">
import { shallowRef } from 'vue';

import { isEmailAddress } from '#/views/personal-mail/mail-format';

const model = defineModel<string[]>({ default: () => [] });

withDefaults(
  defineProps<{
    borderless?: boolean;
    placeholder?: string;
  }>(),
  {
    borderless: false,
    placeholder: '',
  },
);

function addressInitial(address: string) {
  return (address.trim().slice(0, 1) || '?').toUpperCase();
}

const draft = shallowRef('');
const invalid = shallowRef(false);

function commit() {
  const parts = draft.value
    .split(/[,;，；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    invalid.value = false;
    return true;
  }
  if (parts.some((item) => !isEmailAddress(item))) {
    invalid.value = true;
    return false;
  }
  const next = [...model.value];
  for (const item of parts) {
    if (!next.some((exist) => exist.toLowerCase() === item.toLowerCase())) {
      next.push(item);
    }
  }
  model.value = next;
  draft.value = '';
  invalid.value = false;
  return true;
}

function remove(address: string) {
  model.value = model.value.filter((item) => item !== address);
}

function onKeydown(event: KeyboardEvent) {
  if (['Enter', ',', ';', '，', '；'].includes(event.key)) {
    event.preventDefault();
    commit();
    return;
  }
  if (event.key === 'Backspace' && !draft.value && model.value.length > 0) {
    model.value = model.value.slice(0, -1);
  }
}

defineExpose({ commit });
</script>

<template>
  <div
    class="mail-address"
    :class="{ 'is-borderless': borderless, 'is-invalid': invalid }"
  >
    <span
      v-for="address in model"
      :key="address"
      class="mail-address__tag"
      :title="address"
    >
      <i class="mail-address__avatar">{{ addressInitial(address) }}</i>
      <span class="mail-address__text">{{ address }}</span>
      <button
        type="button"
        class="mail-address__remove"
        @click="remove(address)"
      >
        ×
      </button>
    </span>
    <input
      v-model="draft"
      class="mail-address__input"
      :placeholder="model.length ? '' : placeholder"
      @blur="commit"
      @keydown="onKeydown"
    />
  </div>
</template>

<style scoped>
.mail-address {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 32px;
  padding: 4px 8px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.mail-address.is-borderless {
  min-height: 28px;
  padding: 0;
  background: transparent;
  border-color: transparent;
}

.mail-address.is-invalid {
  border-color: #ff4d4f;
}

.mail-address.is-borderless.is-invalid {
  border-color: transparent;
  border-bottom-color: #ff4d4f;
}

.mail-address__tag {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 240px;
  height: 26px;
  padding: 0 6px 0 3px;
  font-size: 13px;
  line-height: 26px;
  color: hsl(var(--foreground));
  background: hsl(var(--primary) / 10%);
  border-radius: 13px;
}

.mail-address__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--card));
  border-radius: 50%;
}

.mail-address__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-address__remove {
  line-height: 1;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
}

.mail-address__input {
  flex: 1;
  min-width: 120px;
  font-size: 13px;
  outline: none;
  background: transparent;
  border: 0;
}
</style>
