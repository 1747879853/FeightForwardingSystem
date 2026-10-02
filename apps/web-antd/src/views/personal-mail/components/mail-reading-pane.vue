<script setup lang="ts">
import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { IconifyIcon } from '@vben/icons';

import { Empty, Spin } from 'ant-design-vue';

import {
  addressListText,
  formatByteSize,
  formatMailDateTime,
  visibleAttachments,
} from '#/views/personal-mail/mail-format';

import MailHtmlFrame from './mail-html-frame.vue';

withDefaults(
  defineProps<{
    canDelete?: boolean;
    canDownload?: boolean;
    canForward?: boolean;
    canMove?: boolean;
    canReply?: boolean;
    canSetRead?: boolean;
    detail: null | PersonalMailAdminApi.MailDetail;
    loading?: boolean;
    showBack?: boolean;
  }>(),
  {
    canDelete: false,
    canDownload: false,
    canForward: false,
    canMove: false,
    canReply: false,
    canSetRead: false,
    loading: false,
    showBack: false,
  },
);

const emit = defineEmits<{
  back: [];
  download: [attachment: PersonalMailAdminApi.MailAttachmentSummary];
  forward: [];
  move: [];
  remove: [];
  reply: [];
  replyAll: [];
  toggleRead: [];
}>();
</script>

<template>
  <section class="mail-read">
    <div class="mail-read__spin">
      <Spin :spinning="loading">
        <Empty v-if="!detail && !loading" description="选择一封邮件" />
        <template v-else-if="detail">
          <header class="mail-read__toolbar">
            <button
              v-if="showBack"
              type="button"
              class="mail-read__action"
              @click="emit('back')"
            >
              <IconifyIcon icon="lucide:arrow-left" />
              <span>返回</span>
            </button>
            <button
              v-if="canReply"
              type="button"
              class="mail-read__action"
              @click="emit('reply')"
            >
              <IconifyIcon icon="lucide:reply" />
              <span>回复</span>
            </button>
            <button
              v-if="canReply"
              type="button"
              class="mail-read__action"
              @click="emit('replyAll')"
            >
              <IconifyIcon icon="lucide:reply-all" />
              <span>回复全部</span>
            </button>
            <button
              v-if="canForward"
              type="button"
              class="mail-read__action"
              @click="emit('forward')"
            >
              <IconifyIcon icon="lucide:forward" />
              <span>转发</span>
            </button>
            <i v-if="canReply || canForward" class="mail-read__split"></i>
            <button
              v-if="canDelete"
              type="button"
              class="mail-read__action is-danger"
              @click="emit('remove')"
            >
              <IconifyIcon icon="lucide:trash-2" />
              <span>删除</span>
            </button>
            <button
              v-if="canMove"
              type="button"
              class="mail-read__action"
              @click="emit('move')"
            >
              <IconifyIcon icon="lucide:folder-input" />
              <span>移动</span>
            </button>
            <button
              v-if="canSetRead"
              type="button"
              class="mail-read__action"
              @click="emit('toggleRead')"
            >
              <IconifyIcon
                :icon="detail.isRead ? 'lucide:mail' : 'lucide:mail-open'"
              />
              <span>{{ detail.isRead ? '标为未读' : '标为已读' }}</span>
            </button>
          </header>
          <div class="mail-read__scroll">
            <h2 class="mail-read__subject">
              {{ detail.subject || '(无主题)' }}
            </h2>
            <dl class="mail-read__meta">
              <div>
                <dt>发件人</dt>
                <dd>
                  {{ addressListText(detail.from ? [detail.from] : []) || '—' }}
                </dd>
              </div>
              <div>
                <dt>收件人</dt>
                <dd>{{ addressListText(detail.to) || '—' }}</dd>
              </div>
              <div v-if="addressListText(detail.cc)">
                <dt>抄送</dt>
                <dd>{{ addressListText(detail.cc) }}</dd>
              </div>
              <div v-if="addressListText(detail.bcc)">
                <dt>密送</dt>
                <dd>{{ addressListText(detail.bcc) }}</dd>
              </div>
              <div>
                <dt>时间</dt>
                <dd>{{ formatMailDateTime(detail.date) || '—' }}</dd>
              </div>
            </dl>
            <div
              v-if="visibleAttachments(detail.attachments).length"
              class="mail-read__files"
            >
              <button
                v-for="file in visibleAttachments(detail.attachments)"
                :key="file.index"
                type="button"
                class="mail-read__file"
                :disabled="!canDownload"
                @click="canDownload && emit('download', file)"
              >
                <IconifyIcon v-if="canDownload" icon="lucide:download" />
                <span>{{ file.fileName || '附件' }}</span>
                <span class="mail-read__size">{{
                  formatByteSize(file.size)
                }}</span>
              </button>
            </div>
            <div class="mail-read__body">
              <MailHtmlFrame
                :html-body="detail.htmlBody"
                :text-body="detail.textBody"
              />
            </div>
          </div>
        </template>
      </Spin>
    </div>
  </section>
</template>

<style scoped>
.mail-read {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--card));
}

.mail-read__spin {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.mail-read__spin :deep(.ant-spin-nested-loading),
.mail-read__spin :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.mail-read__spin :deep(.ant-empty) {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.mail-read__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
  padding: 6px 12px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
}

.mail-read__action {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  color: hsl(var(--foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.mail-read__action:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.mail-read__action.is-danger:hover {
  color: #cf1322;
  background: rgb(255 77 79 / 12%);
}

.mail-read__action :deep(svg) {
  width: 16px;
  height: 16px;
}

.mail-read__split {
  flex: none;
  width: 1px;
  height: 16px;
  margin: 0 6px;
  background: hsl(var(--border));
}

.mail-read__scroll {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 16px 20px;
  overflow: hidden;
}

.mail-read__subject {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.4;
}

.mail-read__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 12px;
}

.mail-read__meta div {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px;
  font-size: 13px;
}

.mail-read__meta dt {
  color: hsl(var(--muted-foreground));
}

.mail-read__meta dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.mail-read__files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.mail-read__file {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 100%;
  padding: 6px 10px;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.mail-read__file:disabled {
  cursor: default;
}

.mail-read__size {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.mail-read__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}
</style>
