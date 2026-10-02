<script setup lang="ts">
import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Empty, message, Spin, Tooltip } from 'ant-design-vue';

import {
  addressListText,
  formatByteSize,
  formatMailAddress,
  formatMailDateTime,
  senderInitial,
  visibleAttachments,
} from '#/views/personal-mail/mail-format';

import MailHtmlFrame from './mail-html-frame.vue';

const props = withDefaults(
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

const recipientsExpanded = ref(false);

const attachmentList = computed(() =>
  props.detail ? visibleAttachments(props.detail.attachments) : [],
);

const recipientPreviewLimit = 4;

function addressName(info?: null | PersonalMailAdminApi.MailAddressInfo) {
  return info?.name?.trim() || info?.address?.trim() || '未知';
}

function addressEmail(info?: null | PersonalMailAdminApi.MailAddressInfo) {
  return info?.address?.trim() || '';
}

function addressTitle(info?: null | PersonalMailAdminApi.MailAddressInfo) {
  return formatMailAddress(info) || '—';
}

async function copyAddress(info?: null | PersonalMailAdminApi.MailAddressInfo) {
  const text = addressEmail(info) || formatMailAddress(info);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制邮箱地址');
  } catch {
    message.error('复制失败，请手动选择');
  }
}

function fileExt(fileName?: null | string) {
  const name = (fileName || '').trim();
  const idx = name.lastIndexOf('.');
  if (idx < 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}

function fileIcon(fileName?: null | string) {
  const ext = fileExt(fileName);
  if (['doc', 'docx'].includes(ext)) return 'lucide:file-text';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'lucide:table';
  if (['ppt', 'pptx'].includes(ext)) return 'lucide:projector';
  if (['pdf'].includes(ext)) return 'lucide:file';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    return 'lucide:image';
  }
  if (['zip', 'rar', '7z', 'gz'].includes(ext)) return 'lucide:archive';
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) return 'lucide:music';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'lucide:video';
  return 'lucide:paperclip';
}

function fileTone(fileName?: null | string) {
  const ext = fileExt(fileName);
  if (['doc', 'docx'].includes(ext)) return 'is-word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'is-excel';
  if (['ppt', 'pptx'].includes(ext)) return 'is-ppt';
  if (['pdf'].includes(ext)) return 'is-pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    return 'is-image';
  }
  if (['zip', 'rar', '7z', 'gz'].includes(ext)) return 'is-zip';
  return 'is-file';
}

function visibleAddresses(
  list?: null | PersonalMailAdminApi.MailAddressInfo[],
  expanded = true,
) {
  const items = (list || []).filter(
    (item) => item?.address?.trim() || item?.name?.trim(),
  );
  if (expanded || items.length <= recipientPreviewLimit) return items;
  return items.slice(0, recipientPreviewLimit);
}

function hiddenAddressCount(
  list?: null | PersonalMailAdminApi.MailAddressInfo[],
) {
  const total = (list || []).filter(
    (item) => item?.address?.trim() || item?.name?.trim(),
  ).length;
  return Math.max(0, total - recipientPreviewLimit);
}
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
            <div class="mail-read__header">
              <h2 class="mail-read__subject">
                {{ detail.subject || '(无主题)' }}
              </h2>

              <div class="mail-read__people">
                <div class="mail-read__sender">
                  <span class="mail-read__avatar" aria-hidden="true">
                    {{ senderInitial(detail.from) }}
                  </span>
                  <div class="mail-read__sender-main">
                    <div class="mail-read__sender-row">
                      <Tooltip :title="addressTitle(detail.from)">
                        <button
                          type="button"
                          class="mail-read__person is-primary"
                          @click="copyAddress(detail.from)"
                        >
                          <span class="mail-read__person-name">
                            {{ addressName(detail.from) }}
                          </span>
                          <span
                            v-if="addressEmail(detail.from)"
                            class="mail-read__person-email"
                          >
                            {{ addressEmail(detail.from) }}
                          </span>
                        </button>
                      </Tooltip>
                      <span class="mail-read__time">
                        {{ formatMailDateTime(detail.date) || '—' }}
                      </span>
                    </div>
                    <div class="mail-read__meta-row">
                      <span class="mail-read__meta-label">收件人</span>
                      <div class="mail-read__chips">
                        <Tooltip
                          v-for="(person, index) in visibleAddresses(
                            detail.to,
                            recipientsExpanded,
                          )"
                          :key="`to-${index}-${person.address || person.name}`"
                          :title="addressTitle(person)"
                        >
                          <button
                            type="button"
                            class="mail-read__chip"
                            @click="copyAddress(person)"
                          >
                            {{ addressName(person) }}
                          </button>
                        </Tooltip>
                        <button
                          v-if="
                            !recipientsExpanded && hiddenAddressCount(detail.to)
                          "
                          type="button"
                          class="mail-read__more"
                          @click="recipientsExpanded = true"
                        >
                          +{{ hiddenAddressCount(detail.to) }}
                        </button>
                        <button
                          v-else-if="
                            recipientsExpanded &&
                            hiddenAddressCount(detail.to) > 0
                          "
                          type="button"
                          class="mail-read__more"
                          @click="recipientsExpanded = false"
                        >
                          收起
                        </button>
                        <span
                          v-if="!addressListText(detail.to)"
                          class="mail-read__empty"
                        >
                          —
                        </span>
                      </div>
                    </div>
                    <div
                      v-if="addressListText(detail.cc)"
                      class="mail-read__meta-row"
                    >
                      <span class="mail-read__meta-label">抄送</span>
                      <div class="mail-read__chips">
                        <Tooltip
                          v-for="(person, index) in detail.cc || []"
                          :key="`cc-${index}-${person.address || person.name}`"
                          :title="addressTitle(person)"
                        >
                          <button
                            type="button"
                            class="mail-read__chip"
                            @click="copyAddress(person)"
                          >
                            {{ addressName(person) }}
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div
                      v-if="addressListText(detail.bcc)"
                      class="mail-read__meta-row"
                    >
                      <span class="mail-read__meta-label">密送</span>
                      <div class="mail-read__chips">
                        <Tooltip
                          v-for="(person, index) in detail.bcc || []"
                          :key="`bcc-${index}-${person.address || person.name}`"
                          :title="addressTitle(person)"
                        >
                          <button
                            type="button"
                            class="mail-read__chip"
                            @click="copyAddress(person)"
                          >
                            {{ addressName(person) }}
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="attachmentList.length" class="mail-read__files">
                <div class="mail-read__files-head">
                  <IconifyIcon icon="lucide:paperclip" />
                  <span>附件</span>
                  <span class="mail-read__files-count">
                    {{ attachmentList.length }}
                  </span>
                </div>
                <div class="mail-read__files-list">
                  <button
                    v-for="file in attachmentList"
                    :key="file.index"
                    type="button"
                    class="mail-read__file"
                    :class="fileTone(file.fileName)"
                    :disabled="!canDownload"
                    :title="
                      canDownload
                        ? `下载 ${file.fileName || '附件'}`
                        : file.fileName || '附件'
                    "
                    @click="canDownload && emit('download', file)"
                  >
                    <span class="mail-read__file-icon">
                      <IconifyIcon :icon="fileIcon(file.fileName)" />
                    </span>
                    <span class="mail-read__file-main">
                      <span class="mail-read__file-name">
                        {{ file.fileName || '附件' }}
                      </span>
                      <span class="mail-read__file-meta">
                        {{ formatByteSize(file.size) || '未知大小' }}
                        <template v-if="canDownload"> · 点击下载</template>
                      </span>
                    </span>
                    <IconifyIcon
                      v-if="canDownload"
                      class="mail-read__file-dl"
                      icon="lucide:download"
                    />
                  </button>
                </div>
              </div>
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
  padding: 0;
  overflow: hidden;
}

.mail-read__header {
  flex: none;
  padding: 18px 22px 14px;
  background: linear-gradient(
    180deg,
    hsl(var(--background)) 0%,
    hsl(var(--card)) 100%
  );
  border-bottom: 1px solid hsl(var(--border) / 80%);
}

.mail-read__subject {
  margin: 0 0 16px;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.35;
  color: hsl(var(--foreground));
  letter-spacing: -0.01em;
}

.mail-read__people {
  min-width: 0;
}

.mail-read__sender {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
}

.mail-read__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-top: 2px;
  font-size: 15px;
  font-weight: 650;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 50%;
}

.mail-read__sender-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.mail-read__sender-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: baseline;
}

.mail-read__person {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  max-width: 100%;
  padding: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.mail-read__person:hover .mail-read__person-name {
  color: hsl(var(--primary));
}

.mail-read__person-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: hsl(var(--foreground));
  transition: color 0.15s ease;
}

.mail-read__person-email {
  font-size: 12px;
  line-height: 1.3;
  color: hsl(var(--muted-foreground));
}

.mail-read__time {
  margin-left: auto;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.mail-read__meta-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.mail-read__meta-label {
  padding-top: 4px;
  font-size: 12px;
  line-height: 22px;
  color: hsl(var(--muted-foreground));
}

.mail-read__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.mail-read__chip {
  display: inline-flex;
  max-width: 220px;
  height: 24px;
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 24px;
  color: hsl(var(--foreground));
  white-space: nowrap;
  cursor: pointer;
  background: hsl(var(--muted) / 55%);
  border: 1px solid transparent;
  border-radius: 999px;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.mail-read__chip:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 25%);
}

.mail-read__more {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 24px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.mail-read__more:hover {
  background: hsl(var(--primary) / 8%);
}

.mail-read__empty {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.mail-read__files {
  padding: 12px;
  margin-top: 14px;
  background: hsl(var(--background) / 70%);
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.mail-read__files-head {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.mail-read__files-head :deep(svg) {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
}

.mail-read__files-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 999px;
}

.mail-read__files-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}

.mail-read__file {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.mail-read__file:hover:not(:disabled) {
  border-color: hsl(var(--primary) / 35%);
  box-shadow: 0 4px 14px rgb(15 23 42 / 6%);
  transform: translateY(-1px);
}

.mail-read__file:disabled {
  cursor: default;
}

.mail-read__file-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 45%);
  border-radius: 8px;
}

.mail-read__file.is-word .mail-read__file-icon {
  color: #2b579a;
  background: rgb(43 87 154 / 12%);
}

.mail-read__file.is-excel .mail-read__file-icon {
  color: #217346;
  background: rgb(33 115 70 / 12%);
}

.mail-read__file.is-ppt .mail-read__file-icon {
  color: #c43e1c;
  background: rgb(196 62 28 / 12%);
}

.mail-read__file.is-pdf .mail-read__file-icon {
  color: #e11d48;
  background: rgb(225 29 72 / 12%);
}

.mail-read__file.is-image .mail-read__file-icon {
  color: #7c3aed;
  background: rgb(124 58 237 / 12%);
}

.mail-read__file.is-zip .mail-read__file-icon {
  color: #b45309;
  background: rgb(180 83 9 / 12%);
}

.mail-read__file-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.mail-read__file-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mail-read__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 550;
  line-height: 1.35;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.mail-read__file-meta {
  font-size: 12px;
  line-height: 1.3;
  color: hsl(var(--muted-foreground));
}

.mail-read__file-dl {
  flex: none;
  width: 15px;
  height: 15px;
  color: hsl(var(--muted-foreground));
  opacity: 0;
  transition: opacity 0.15s ease;
}

.mail-read__file:hover:not(:disabled) .mail-read__file-dl {
  color: hsl(var(--primary));
  opacity: 1;
}

.mail-read__body {
  flex: 1;
  min-height: 0;
  margin: 12px 16px 16px;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}
</style>
