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
    pageIndex: number;
    pageSize: number;
    total: number;
  }>(),
  {
    activeUid: null,
    folderTitle: '',
    loading: false,
  },
);

const keyword = defineModel<string>('keyword', { default: '' });
const unreadOnly = defineModel<boolean>('unreadOnly', { default: false });
const dateRange = defineModel<[string, string] | undefined>('dateRange');

const emit = defineEmits<{
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
</script>

<template>
  <section class="mail-list">
    <header class="mail-list__head">
      <div class="mail-list__title">
        <Checkbox
          :checked="allChecked"
          :indeterminate="someChecked"
          @change="emit('toggleAll', Boolean($event.target?.checked))"
        />
        <span>{{ folderTitle || '邮件' }}</span>
        <button
          type="button"
          class="mail-list__refresh"
          @click="emit('refresh')"
        >
          <IconifyIcon icon="lucide:refresh-cw" />
        </button>
      </div>
      <Input.Search
        v-model:value="keyword"
        allow-clear
        placeholder="搜索主题或发件人"
        @search="emit('search')"
      />
      <div class="mail-list__filters">
        <Checkbox v-model:checked="unreadOnly" @change="emit('search')">
          只看未读
        </Checkbox>
        <DatePicker.RangePicker
          v-model:value="dateRange"
          value-format="YYYY-MM-DD"
          @change="emit('search')"
        />
      </div>
    </header>
    <Spin :spinning="loading" class="mail-list__spin">
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
          <span class="mail-list__avatar">{{ senderInitial(mail.from) }}</span>
          <span class="mail-list__main">
            <span class="mail-list__line">
              <span class="mail-list__from">{{ senderText(mail) }}</span>
              <span class="mail-list__time">{{
                formatMailTime(mail.date)
              }}</span>
            </span>
            <span class="mail-list__subject">
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
              {{ mail.subject || '(无主题)' }}
            </span>
            <span class="mail-list__size">{{ formatByteSize(mail.size) }}</span>
          </span>
        </button>
        <Empty
          v-if="!loading && items.length === 0"
          description="这个文件夹里没有邮件"
        />
      </div>
    </Spin>
    <footer v-if="total > pageSize" class="mail-list__pager">
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
  min-height: 0;
  background: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
}

.mail-list__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.mail-list__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
}

.mail-list__refresh {
  margin-left: auto;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
}

.mail-list__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.mail-list__spin {
  flex: 1;
  min-height: 0;
}

.mail-list__spin :deep(.ant-spin-nested-loading),
.mail-list__spin :deep(.ant-spin-container) {
  height: 100%;
}

.mail-list__body {
  height: 100%;
  overflow: auto;
}

.mail-list__row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid hsl(var(--border));
}

.mail-list__row.is-active {
  background: hsl(var(--primary) / 8%);
}

.mail-list__row.is-unread .mail-list__from,
.mail-list__row.is-unread .mail-list__subject {
  font-weight: 650;
  color: hsl(var(--foreground));
}

.mail-list__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 50%;
}

.mail-list__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mail-list__line,
.mail-list__subject {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.mail-list__from,
.mail-list__subject {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-list__from {
  flex: 1;
  color: hsl(var(--foreground));
}

.mail-list__subject,
.mail-list__size,
.mail-list__time {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.mail-list__subject {
  flex: 1;
}

.mail-list__time {
  flex: none;
}

.mail-list__flag {
  flex: none;
  color: hsl(var(--primary));
}

.mail-list__pager {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
  border-top: 1px solid hsl(var(--border));
}
</style>
