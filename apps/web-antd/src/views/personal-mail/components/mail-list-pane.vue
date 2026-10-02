<script setup lang="ts">
import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Checkbox,
  DatePicker,
  Empty,
  Input,
  Pagination,
  Spin,
} from 'ant-design-vue';

import {
  formatByteSize,
  formatMailTime,
  senderInitial,
} from '#/views/personal-mail/mail-format';

const props = withDefaults(
  defineProps<{
    activeUid?: null | number;
    checkedUids: number[];
    folderTitle?: string;
    items: PersonalMailAdminApi.MailSummary[];
    loading?: boolean;
    markingAllRead?: boolean;
    pageIndex: number;
    pageSize: number;
    showMarkAllRead?: boolean;
    total: number;
    unreadCount?: null | number;
  }>(),
  {
    activeUid: null,
    folderTitle: '',
    loading: false,
    markingAllRead: false,
    showMarkAllRead: false,
    unreadCount: null,
  },
);

const keyword = defineModel<string>('keyword', { default: '' });
const unreadOnly = defineModel<boolean>('unreadOnly', { default: false });
const dateRange = defineModel<[string, string] | undefined>('dateRange');

const emit = defineEmits<{
  markAllRead: [];
  open: [mail: PersonalMailAdminApi.MailSummary];
  pageChange: [page: number];
  refresh: [];
  search: [];
  toggleAll: [checked: boolean];
  toggleCheck: [uid: number, checked: boolean];
}>();

const allChecked = computed(
  () =>
    props.items.length > 0 &&
    props.items.every((item) => props.checkedUids.includes(item.uid)),
);
const someChecked = computed(
  () =>
    props.items.some((item) => props.checkedUids.includes(item.uid)) &&
    !allChecked.value,
);

function senderText(mail: PersonalMailAdminApi.MailSummary) {
  return (
    mail.from?.name?.trim() || mail.from?.address?.trim() || '(未知发件人)'
  );
}

function avatarTone(mail: PersonalMailAdminApi.MailSummary) {
  const source = senderText(mail);
  let hash = 0;
  for (const char of source) hash = (hash + char.charCodeAt(0)) % 6;
  return `is-${hash}`;
}

function toggleUnread() {
  unreadOnly.value = !unreadOnly.value;
  emit('search');
}

function onKeywordChange(event: Event) {
  const value = (event.target as HTMLInputElement | null)?.value ?? '';
  if (!value) emit('search');
}
</script>

<template>
  <section class="mail-list">
    <header class="mail-list__head">
      <div class="mail-list__title">
        <h2>{{ folderTitle || '邮件' }}</h2>
        <span v-if="total > 0" class="mail-list__count">{{ total }}</span>
        <button
          type="button"
          class="mail-list__refresh"
          title="刷新"
          @click="emit('refresh')"
        >
          <IconifyIcon icon="lucide:refresh-cw" />
        </button>
      </div>
      <Input
        v-model:value="keyword"
        allow-clear
        class="mail-list__search"
        placeholder="搜索主题或发件人"
        @change="onKeywordChange"
        @press-enter="emit('search')"
      >
        <template #prefix>
          <IconifyIcon class="mail-list__search-icon" icon="lucide:search" />
        </template>
      </Input>
      <div class="mail-list__tools">
        <Checkbox
          :checked="allChecked"
          :indeterminate="someChecked"
          title="全选"
          @change="emit('toggleAll', Boolean($event.target?.checked))"
        />
        <button
          type="button"
          class="mail-list__unread"
          :class="{ 'is-on': unreadOnly }"
          @click="toggleUnread"
        >
          <span class="mail-list__unread-dot" aria-hidden="true"></span>
          未读
          <span
            v-if="unreadCount != null && unreadCount > 0"
            class="mail-list__unread-count"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </button>
        <button
          v-if="showMarkAllRead"
          type="button"
          class="mail-list__mark"
          :disabled="markingAllRead || unreadCount === 0"
          @click="emit('markAllRead')"
        >
          <IconifyIcon icon="lucide:check-check" />
          {{ markingAllRead ? '正在标记…' : '一键已读' }}
        </button>
      </div>
      <div class="mail-list__filters">
        <DatePicker.RangePicker
          v-model:value="dateRange"
          class="mail-list__dates"
          :placeholder="['开始', '结束']"
          size="small"
          value-format="YYYY-MM-DD"
          @change="emit('search')"
        />
      </div>
    </header>
    <div class="mail-list__spin">
      <Spin :spinning="loading">
        <div class="mail-list__body">
          <button
            v-for="mail in items"
            :key="mail.uid"
            type="button"
            class="mail-list__row"
            :class="{
              'is-active': mail.uid === activeUid,
              'is-unread': !mail.isRead,
            }"
            @click="emit('open', mail)"
          >
            <Checkbox
              :checked="checkedUids.includes(mail.uid)"
              @click.stop
              @change="
                emit('toggleCheck', mail.uid, Boolean($event.target?.checked))
              "
            />
            <span
              class="mail-list__dot"
              :class="{ 'is-on': !mail.isRead }"
              aria-hidden="true"
            ></span>
            <span class="mail-list__avatar" :class="avatarTone(mail)">
              {{ senderInitial(mail.from) }}
            </span>
            <span class="mail-list__main">
              <span class="mail-list__line">
                <span class="mail-list__from">{{ senderText(mail) }}</span>
                <span class="mail-list__aside">
                  <span class="mail-list__time">{{
                    formatMailTime(mail.date)
                  }}</span>
                  <span v-if="mail.size" class="mail-list__size">{{
                    formatByteSize(mail.size)
                  }}</span>
                </span>
              </span>
              <span class="mail-list__subject-row">
                <span class="mail-list__subject">
                  {{ mail.subject || '(无主题)' }}
                </span>
                <IconifyIcon
                  v-if="mail.isAnswered"
                  class="mail-list__flag"
                  icon="lucide:reply"
                />
                <IconifyIcon
                  v-if="mail.hasAttachment"
                  class="mail-list__flag"
                  icon="lucide:paperclip"
                />
              </span>
            </span>
          </button>
          <div v-if="!loading && items.length === 0" class="mail-list__empty">
            <Empty description="这个文件夹里没有邮件" />
          </div>
        </div>
      </Spin>
    </div>
    <footer v-if="total > 0" class="mail-list__pager">
      <Pagination
        :current="pageIndex"
        :page-size="pageSize"
        :total="total"
        size="small"
        :show-size-changer="false"
        @change="emit('pageChange', $event)"
      />
    </footer>
  </section>
</template>

<style scoped>
.mail-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
}

.mail-list__head {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 10px;
  padding: 14px 12px 12px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
}

.mail-list__title {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.mail-list__title h2 {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.3;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.mail-list__count {
  flex: none;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: hsl(var(--primary));
  text-align: center;
  background: hsl(var(--primary) / 12%);
  border-radius: 999px;
}

.mail-list__refresh {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: auto;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.mail-list__refresh:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.mail-list__refresh :deep(svg) {
  width: 15px;
  height: 15px;
}

.mail-list__search :deep(.ant-input-affix-wrapper) {
  height: 32px;
  background: hsl(var(--card));
  border-color: hsl(var(--border));
  border-radius: 8px;
}

.mail-list__search :deep(.ant-input-affix-wrapper:hover),
.mail-list__search :deep(.ant-input-affix-wrapper-focused) {
  border-color: hsl(var(--primary) / 45%);
}

.mail-list__search-icon {
  color: hsl(var(--muted-foreground));
}

.mail-list__tools {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.mail-list__unread,
.mail-list__mark {
  display: inline-flex;
  flex: none;
  gap: 6px;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 8px;
}

.mail-list__unread {
  color: hsl(var(--foreground) / 78%);
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
}

.mail-list__unread-dot {
  flex: none;
  width: 7px;
  height: 7px;
  background: hsl(var(--muted-foreground) / 55%);
  border-radius: 50%;
}

.mail-list__unread-count {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 11px;
  font-weight: 650;
  line-height: 16px;
  color: hsl(var(--primary));
  text-align: center;
  background: hsl(var(--primary) / 12%);
  border-radius: 999px;
}

.mail-list__unread:hover,
.mail-list__unread.is-on {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 32%);
}

.mail-list__unread.is-on {
  font-weight: 650;
}

.mail-list__unread.is-on .mail-list__unread-dot {
  background: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 18%);
}

.mail-list__unread.is-on .mail-list__unread-count {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
}

.mail-list__mark {
  margin-left: auto;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border: 1px solid hsl(var(--primary) / 24%);
}

.mail-list__mark:hover:not(:disabled) {
  background: hsl(var(--primary) / 16%);
}

.mail-list__mark:disabled {
  color: hsl(var(--muted-foreground));
  cursor: not-allowed;
  background: hsl(var(--muted) / 45%);
  border-color: hsl(var(--border));
}

.mail-list__mark :deep(svg) {
  width: 14px;
  height: 14px;
}

.mail-list__filters {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.mail-list__dates {
  flex: 1;
  min-width: 0;
}

.mail-list__dates :deep(.ant-picker) {
  width: 100%;
  border-radius: 8px;
}

.mail-list__spin {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.mail-list__spin :deep(.ant-spin-nested-loading),
.mail-list__spin :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.mail-list__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: hsl(var(--card));
}

.mail-list__row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
  padding: 12px 12px 12px 10px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  box-shadow: inset 0 -1px 0 hsl(var(--border) / 70%);
  transition: background 0.15s ease;
}

.mail-list__row:hover {
  background: hsl(var(--primary) / 8%);
}

.mail-list__row.is-active,
.mail-list__row.is-active:hover {
  background: hsl(var(--primary) / 12%);
  box-shadow: inset 3px 0 0 hsl(var(--primary));
}

.mail-list__dot {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 14px;
  background: transparent;
  border-radius: 50%;
}

.mail-list__dot.is-on {
  background: hsl(var(--primary));
}

.mail-list__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-top: 1px;
  font-size: 14px;
  font-weight: 650;
  border-radius: 50%;
}

.mail-list__avatar.is-0 {
  color: #1d4ed8;
  background: rgb(29 78 216 / 12%);
}

.mail-list__avatar.is-1 {
  color: #0f766e;
  background: rgb(15 118 110 / 12%);
}

.mail-list__avatar.is-2 {
  color: #7c3aed;
  background: rgb(124 58 237 / 12%);
}

.mail-list__avatar.is-3 {
  color: #b45309;
  background: rgb(180 83 9 / 12%);
}

.mail-list__avatar.is-4 {
  color: #be185d;
  background: rgb(190 24 93 / 12%);
}

.mail-list__avatar.is-5 {
  color: #475569;
  background: rgb(71 85 105 / 12%);
}

.mail-list__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding-top: 1px;
}

.mail-list__line,
.mail-list__subject-row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.mail-list__from,
.mail-list__subject {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-list__from {
  font-size: 13px;
  font-weight: 550;
  line-height: 1.3;
  color: hsl(var(--foreground) / 82%);
}

.mail-list__row.is-unread .mail-list__from {
  font-weight: 700;
  color: hsl(var(--foreground));
}

.mail-list__aside {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
}

.mail-list__time {
  font-size: 12px;
  line-height: 1.3;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.mail-list__row.is-unread .mail-list__time {
  font-weight: 650;
  color: hsl(var(--primary));
}

.mail-list__size {
  font-size: 11px;
  line-height: 1.2;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.mail-list__subject {
  font-size: 12px;
  line-height: 1.35;
  color: hsl(var(--muted-foreground));
}

.mail-list__row.is-unread .mail-list__subject {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.mail-list__flag {
  flex: none;
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
}

.mail-list__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.mail-list__pager {
  display: flex;
  flex: none;
  justify-content: flex-end;
  padding: 8px 12px;
  background: hsl(var(--background));
  border-top: 1px solid hsl(var(--border));
}
</style>
