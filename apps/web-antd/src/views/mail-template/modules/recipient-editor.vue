<script lang="ts" setup>
import type { MailTemplateAdminApi } from '#/api/mail-template/mail-template-admin';

import type { RecipientRow } from '../mail-template-form';

import { IconifyIcon } from '@vben/icons';

import { Input, Select } from 'ant-design-vue';

const rows = defineModel<RecipientRow[]>({ required: true });

const props = defineProps<{
  sources: MailTemplateAdminApi.RecipientSourceOption[];
  title: string;
}>();

function addRow() {
  rows.value = [
    ...rows.value,
    {
      key: `${Date.now()}-${rows.value.length}`,
      mode: 'email',
      email: '',
      recipientSource: null,
    },
  ];
}

function removeRow(key: string) {
  rows.value = rows.value.filter((row) => row.key !== key);
}

function setMode(key: string, mode: RecipientRow['mode']) {
  const row = rows.value.find((item) => item.key === key);
  if (!row || row.mode === mode) {
    return;
  }
  patchRow(key, { mode, email: '', recipientSource: null });
}

function patchRow(key: string, patch: Partial<RecipientRow>) {
  rows.value = rows.value.map((row) =>
    row.key === key ? { ...row, ...patch } : row,
  );
}
</script>

<template>
  <div class="tpl-recipient">
    <span v-if="rows.length === 0" class="tpl-recipient__empty">可以不填</span>
    <div v-for="row in rows" :key="row.key" class="tpl-recipient__item">
      <div
        class="tpl-recipient__mode"
        role="group"
        :aria-label="`${title}方式`"
      >
        <button
          type="button"
          :class="{ 'is-on': row.mode === 'email' }"
          @click="setMode(row.key, 'email')"
        >
          邮箱
        </button>
        <button
          type="button"
          :class="{ 'is-on': row.mode === 'source' }"
          @click="setMode(row.key, 'source')"
        >
          来源
        </button>
      </div>
      <Input
        v-if="row.mode === 'email'"
        :value="row.email"
        allow-clear
        class="tpl-recipient__value"
        placeholder="邮箱地址"
        @update:value="
          (email) => patchRow(row.key, { email: String(email || '') })
        "
      />
      <Select
        v-else
        :value="row.recipientSource ?? undefined"
        allow-clear
        class="tpl-recipient__value"
        placeholder="选择来源"
        :options="
          props.sources.map((item) => ({
            label: item.name || String(item.value),
            value: item.value,
          }))
        "
        @update:value="
          (value) =>
            patchRow(row.key, {
              recipientSource:
                value === undefined || value === null ? null : Number(value),
            })
        "
      />
      <button
        type="button"
        class="tpl-recipient__remove"
        :aria-label="`移除${title}`"
        @click="removeRow(row.key)"
      >
        <IconifyIcon icon="lucide:x" />
      </button>
    </div>
    <button type="button" class="tpl-recipient__add" @click="addRow">
      <IconifyIcon icon="lucide:plus" />
      <span>添加</span>
    </button>
  </div>
</template>

<style scoped>
.tpl-recipient {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 6px 0;
}

.tpl-recipient__empty {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.tpl-recipient__item {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  max-width: 100%;
  height: 32px;
  padding: 0 2px 0 3px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition: border-color 0.15s ease;
}

.tpl-recipient__item:focus-within {
  border-color: hsl(var(--primary) / 45%);
}

.tpl-recipient__mode {
  display: inline-flex;
  flex: none;
  gap: 1px;
  padding: 2px;
  background: hsl(var(--muted) / 55%);
  border-radius: 6px;
}

.tpl-recipient__mode button {
  height: 22px;
  padding: 0 7px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.tpl-recipient__mode button:hover {
  color: hsl(var(--foreground));
}

.tpl-recipient__mode button.is-on {
  font-weight: 600;
  color: hsl(var(--foreground));
  background: hsl(var(--card));
}

.tpl-recipient__value {
  width: 196px;
}

.tpl-recipient__value :deep(.ant-input),
.tpl-recipient__value :deep(.ant-select-selector) {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.tpl-recipient__remove,
.tpl-recipient__add {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 26px;
  padding: 0 6px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.tpl-recipient__remove:hover,
.tpl-recipient__add:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.tpl-recipient__add {
  color: hsl(var(--primary));
}

.tpl-recipient__add:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.tpl-recipient__remove :deep(svg),
.tpl-recipient__add :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
