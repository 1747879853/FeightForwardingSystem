<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { Input } from 'ant-design-vue';

import type { NamedMailRow } from './named-mail-recipients';

const toRows = defineModel<NamedMailRow[]>('to', { required: true });
const ccRows = defineModel<NamedMailRow[]>('cc', { required: true });

defineProps<{
  disabled?: boolean;
  hint?: string;
}>();

const emit = defineEmits<{
  change: [];
}>();

function touch() {
  emit('change');
}

function add(target: 'cc' | 'to') {
  const rows = target === 'to' ? toRows : ccRows;
  rows.value = [...rows.value, { name: '', email: '' }];
  touch();
}

function remove(target: 'cc' | 'to', index: number) {
  const rows = target === 'to' ? toRows : ccRows;
  rows.value = rows.value.filter((_, rowIndex) => rowIndex !== index);
  touch();
}
</script>

<template>
  <div class="named-mail">
    <p v-if="hint" class="named-mail__hint">{{ hint }}</p>
    <section class="named-mail__section">
      <header class="named-mail__head">
        <span>收件人</span>
        <small>名字选填</small>
        <button
          type="button"
          class="named-mail__add"
          :disabled="disabled"
          @click="add('to')"
        >
          <IconifyIcon icon="lucide:plus" />
          添加
        </button>
      </header>
      <div class="named-mail__list">
        <p v-if="toRows.length === 0" class="named-mail__empty">还没有收件人</p>
        <div
          v-for="(row, index) in toRows"
          :key="`to-${index}`"
          class="named-mail__person"
        >
          <Input
            v-model:value="row.name"
            :bordered="false"
            :disabled="disabled"
            :maxlength="64"
            class="named-mail__name"
            placeholder="名字"
            @update:value="touch"
          />
          <Input
            v-model:value="row.email"
            :bordered="false"
            :disabled="disabled"
            :maxlength="256"
            class="named-mail__email"
            placeholder="邮箱地址"
            @update:value="touch"
          />
          <button
            type="button"
            class="named-mail__remove"
            :disabled="disabled"
            aria-label="移除收件人"
            @click="remove('to', index)"
          >
            <IconifyIcon icon="lucide:x" />
          </button>
        </div>
      </div>
    </section>
    <section class="named-mail__section">
      <header class="named-mail__head">
        <span>抄送人</span>
        <small>名字选填</small>
        <button
          type="button"
          class="named-mail__add"
          :disabled="disabled"
          @click="add('cc')"
        >
          <IconifyIcon icon="lucide:plus" />
          添加
        </button>
      </header>
      <div class="named-mail__list">
        <p v-if="ccRows.length === 0" class="named-mail__empty">还没有抄送人</p>
        <div
          v-for="(row, index) in ccRows"
          :key="`cc-${index}`"
          class="named-mail__person"
        >
          <Input
            v-model:value="row.name"
            :bordered="false"
            :disabled="disabled"
            :maxlength="64"
            class="named-mail__name"
            placeholder="名字"
            @update:value="touch"
          />
          <Input
            v-model:value="row.email"
            :bordered="false"
            :disabled="disabled"
            :maxlength="256"
            class="named-mail__email"
            placeholder="邮箱地址"
            @update:value="touch"
          />
          <button
            type="button"
            class="named-mail__remove"
            :disabled="disabled"
            aria-label="移除抄送人"
            @click="remove('cc', index)"
          >
            <IconifyIcon icon="lucide:x" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.named-mail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 2px 12px;
}

.named-mail__hint {
  padding: 0 2px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.named-mail__section {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.named-mail__head {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 40px;
  padding: 0 8px 0 14px;
  border-bottom: 1px solid hsl(var(--border));
}

.named-mail__head > span {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.named-mail__head > small {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.named-mail__add,
.named-mail__remove {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.named-mail__add {
  margin-left: auto;
  color: hsl(var(--primary));
}

.named-mail__add:hover:not(:disabled) {
  background: hsl(var(--primary) / 10%);
}

.named-mail__add:disabled,
.named-mail__remove:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.named-mail__add :deep(svg),
.named-mail__remove :deep(svg) {
  width: 14px;
  height: 14px;
}

.named-mail__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
}

.named-mail__empty {
  padding: 6px 2px;
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.named-mail__person {
  display: flex;
  gap: 4px;
  align-items: center;
  min-height: 36px;
  padding: 0 4px 0 8px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition: border-color 0.15s ease;
}

.named-mail__person:focus-within {
  border-color: hsl(var(--primary) / 45%);
}

.named-mail__name {
  flex: none;
  width: 128px;
}

.named-mail__email {
  flex: 1;
  min-width: 0;
}

.named-mail__name :deep(.ant-input),
.named-mail__email :deep(.ant-input) {
  padding-right: 4px;
  padding-left: 4px;
  background: transparent;
}

.named-mail__person :deep(.ant-input-disabled) {
  color: hsl(var(--foreground) / 55%);
}

.named-mail__remove {
  flex: none;
  width: 28px;
  padding: 0;
  color: hsl(var(--muted-foreground));
}

.named-mail__remove:hover:not(:disabled) {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}
</style>
