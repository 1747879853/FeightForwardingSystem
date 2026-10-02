<script setup lang="ts">
import type { ComposeSession } from '#/views/personal-mail/compose-session';

import { computed, shallowRef, useTemplateRef, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Checkbox, message } from 'ant-design-vue';

import RichTextEditor from '#/adapter/component/rich-text-editor.vue';
import {
  downloadPersonalMailAttachment,
  forwardPersonalMail,
  getPersonalMailPagedList,
  readRequestErrorMessage,
  replyPersonalMail,
  savePersonalMailDraft,
  sendPersonalMail,
} from '#/api/personal-mail/personal-mail-admin';
import {
  fileToBase64Content,
  formatByteSize,
  MAIL_ATTACHMENT_LIMIT_BYTES,
} from '#/views/personal-mail/mail-format';

import AddressInput from './address-input.vue';
import MailHtmlFrame from './mail-html-frame.vue';

const props = withDefaults(
  defineProps<{
    canDraft?: boolean;
    canForward?: boolean;
    canReply?: boolean;
    canSend?: boolean;
    session: ComposeSession;
  }>(),
  {
    canDraft: false,
    canForward: false,
    canReply: false,
    canSend: false,
  },
);

const dirty = defineModel<boolean>('dirty', { default: false });

const emit = defineEmits<{
  close: [];
  done: [];
}>();

const toRef = useTemplateRef<InstanceType<typeof AddressInput>>('toRef');
const ccRef = useTemplateRef<InstanceType<typeof AddressInput>>('ccRef');
const bccRef = useTemplateRef<InstanceType<typeof AddressInput>>('bccRef');
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

const to = shallowRef<string[]>([]);
const cc = shallowRef<string[]>([]);
const bcc = shallowRef<string[]>([]);
const subject = shallowRef('');
const body = shallowRef('');
const kind = shallowRef(props.session.kind);
const draftUid = shallowRef<number | undefined>(props.session.draftUid);
const draftFolderName = shallowRef(props.session.draftFolderName);
const keptAttachments = shallowRef(props.session.keptAttachments);
const newFiles = shallowRef<File[]>([]);
const includeOriginal = shallowRef(props.session.includeOriginalAttachments);
const quoteHtml = shallowRef(props.session.quoteHtml);
const showCc = shallowRef(false);
const showBcc = shallowRef(false);
const quoteOpen = shallowRef(true);
const dragOver = shallowRef(false);
const submitting = shallowRef(false);
let dragDepth = 0;
const snapshot = shallowRef('');

const showQuote = computed(
  () =>
    Boolean(quoteHtml.value) &&
    (kind.value === 'reply' ||
      kind.value === 'reply-all' ||
      kind.value === 'forward'),
);
const subjectLocked = computed(
  () => kind.value === 'reply' || kind.value === 'reply-all',
);
const canSubmitSend = computed(() => {
  if (kind.value === 'reply' || kind.value === 'reply-all')
    return props.canReply;
  if (kind.value === 'forward') return props.canForward;
  return props.canSend;
});
const composeTitle = computed(() => {
  if (kind.value === 'forward') return '转发';
  if (kind.value === 'reply' || kind.value === 'reply-all') return '回复';
  if (kind.value === 'draft') return '草稿';
  return '新邮件';
});
const showFileStrip = computed(
  () =>
    keptAttachments.value.length > 0 ||
    newFiles.value.length > 0 ||
    kind.value === 'forward',
);

function addressInitial(address: string) {
  return (address.trim().slice(0, 1) || '?').toUpperCase();
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['gif', 'jpeg', 'jpg', 'png', 'webp'].includes(ext))
    return 'lucide:image';
  if (ext === 'pdf') return 'lucide:file-text';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return 'lucide:sheet';
  if (['7z', 'rar', 'zip'].includes(ext)) return 'lucide:file-archive';
  return 'lucide:file';
}

function currentSnapshot() {
  return JSON.stringify({
    bcc: bcc.value,
    body: body.value,
    cc: cc.value,
    includeOriginal: includeOriginal.value,
    kept: keptAttachments.value.map((item) => item.index),
    names: newFiles.value.map((file) => `${file.name}:${file.size}`),
    subject: subject.value,
    to: to.value,
  });
}

function applySession(session: ComposeSession) {
  to.value = [...session.to];
  cc.value = [...session.cc];
  bcc.value = [...session.bcc];
  subject.value = session.subject;
  body.value = session.body || '<p><br></p>';
  kind.value = session.kind;
  draftUid.value = session.draftUid;
  draftFolderName.value = session.draftFolderName;
  keptAttachments.value = [...session.keptAttachments];
  newFiles.value = [];
  includeOriginal.value = session.includeOriginalAttachments;
  quoteHtml.value = session.quoteHtml;
  showCc.value = session.cc.length > 0 || session.lockedCc.length > 0;
  showBcc.value = session.bcc.length > 0;
  quoteOpen.value = true;
  snapshot.value = currentSnapshot();
  dirty.value = false;
}

watch(
  () => props.session.id,
  () => applySession(props.session),
  { immediate: true },
);

watch(
  [to, cc, bcc, subject, body, includeOriginal, keptAttachments, newFiles],
  () => {
    dirty.value = currentSnapshot() !== snapshot.value;
  },
);

function commitAddresses() {
  const toOk = toRef.value?.commit() ?? true;
  const ccOk = ccRef.value?.commit() ?? true;
  const bccOk = bccRef.value?.commit() ?? true;
  return toOk && ccOk && bccOk;
}

function attachmentBytes() {
  const kept = keptAttachments.value.reduce(
    (sum, item) => sum + (item.size || 0),
    0,
  );
  const added = newFiles.value.reduce((sum, file) => sum + file.size, 0);
  const originals = includeOriginal.value
    ? props.session.sourceAttachments.reduce(
        (sum, item) => sum + (item.size || 0),
        0,
      )
    : 0;
  return (
    kept +
    added +
    (kind.value === 'forward' && draftUid.value == null ? originals : 0)
  );
}

async function toAttachmentDto(files: File[]) {
  const result = [];
  for (const file of files) {
    result.push({
      fileName: file.name,
      content: await fileToBase64Content(file),
    });
  }
  return result;
}

async function downloadSourceAttachments() {
  if (!includeOriginal.value || props.session.sourceAttachments.length === 0) {
    return [];
  }
  const result = [];
  for (const file of props.session.sourceAttachments) {
    const blob = await downloadPersonalMailAttachment({
      attachmentIndex: file.index,
      folderName: props.session.folderName,
      uid: props.session.uid,
    });
    result.push({
      fileName: file.fileName,
      content: await fileToBase64Content(blob),
    });
  }
  return result;
}

async function resolveDraftUid(result: {
  folderName?: null | string;
  messageId?: null | string;
  uid?: null | number;
}) {
  if (result.uid != null) return result.uid;
  const folderName = result.folderName || draftFolderName.value;
  if (!folderName) return undefined;
  const page = await getPersonalMailPagedList({
    folderName,
    keyword: subject.value.trim() || undefined,
    pageIndex: 1,
    pageSize: 50,
  });
  return page.items?.find(
    (item) => item.messageId && item.messageId === result.messageId,
  )?.uid;
}

function mergedBody() {
  if (!quoteHtml.value || kind.value === 'draft' || kind.value === 'new') {
    return body.value;
  }
  return `${body.value || ''}${quoteHtml.value}`;
}

async function handleSend() {
  if (!commitAddresses()) {
    message.warning('请检查邮箱地址格式');
    return;
  }
  if (attachmentBytes() > MAIL_ATTACHMENT_LIMIT_BYTES) {
    message.warning('附件合计不要超过约 20MB');
    return;
  }
  const hasRecipient =
    props.session.lockedTo.length > 0 ||
    to.value.length > 0 ||
    cc.value.length > 0 ||
    bcc.value.length > 0;
  if (kind.value !== 'reply' && kind.value !== 'reply-all' && !hasRecipient) {
    message.warning('请至少填写一个收件人、抄送或密送');
    return;
  }
  submitting.value = true;
  try {
    const attachments = await toAttachmentDto(newFiles.value);
    if (kind.value === 'reply' || kind.value === 'reply-all') {
      await replyPersonalMail({
        attachments,
        bccAddresses: bcc.value,
        body: body.value,
        ccAddresses: cc.value,
        folderName: props.session.folderName,
        isBodyHtml: true,
        messageId: props.session.messageId || undefined,
        replyAll: kind.value === 'reply-all',
        toAddresses: to.value,
        uid: props.session.uid,
      });
    } else if (kind.value === 'forward' && draftUid.value == null) {
      await forwardPersonalMail({
        attachments,
        bccAddresses: bcc.value,
        body: body.value,
        ccAddresses: cc.value,
        folderName: props.session.folderName,
        includeOriginalAttachments: includeOriginal.value,
        isBodyHtml: true,
        messageId: props.session.messageId || undefined,
        subject: subject.value,
        toAddresses: to.value,
        uid: props.session.uid,
      });
    } else {
      await sendPersonalMail({
        attachments,
        bccAddresses: bcc.value,
        body: kind.value === 'draft' ? body.value : mergedBody(),
        ccAddresses: cc.value,
        draftUid: draftUid.value,
        inReplyToMessageId: props.session.inReplyToMessageId || undefined,
        isBodyHtml: true,
        keepDraftAttachmentIndexes: draftUid.value
          ? keptAttachments.value.map((item) => item.index)
          : undefined,
        subject: subject.value,
        toAddresses:
          kind.value === 'draft'
            ? to.value
            : [...props.session.lockedTo, ...to.value],
      });
    }
    message.success('邮件已发送');
    dirty.value = false;
    emit('done');
  } finally {
    submitting.value = false;
  }
}

async function saveDraft() {
  if (!commitAddresses()) {
    message.warning('请检查邮箱地址格式');
    return false;
  }
  if (attachmentBytes() > MAIL_ATTACHMENT_LIMIT_BYTES) {
    message.warning('附件合计不要超过约 20MB');
    return false;
  }
  submitting.value = true;
  try {
    const attachments = [
      ...(await toAttachmentDto(newFiles.value)),
      ...(kind.value === 'forward' && draftUid.value == null
        ? await downloadSourceAttachments()
        : []),
    ];
    const savingReply =
      (kind.value === 'reply' || kind.value === 'reply-all') &&
      draftUid.value == null;
    const savingForward = kind.value === 'forward' && draftUid.value == null;
    const result = await savePersonalMailDraft({
      attachments,
      bccAddresses: bcc.value,
      body: savingReply || savingForward ? mergedBody() : body.value,
      ccAddresses: savingReply
        ? [...props.session.lockedCc, ...cc.value]
        : cc.value,
      draftUid: draftUid.value,
      inReplyToMessageId: savingReply
        ? props.session.inReplyToMessageId || undefined
        : undefined,
      isBodyHtml: true,
      keepDraftAttachmentIndexes: draftUid.value
        ? keptAttachments.value.map((item) => item.index)
        : undefined,
      subject: subject.value,
      toAddresses: savingReply
        ? [...props.session.lockedTo, ...to.value]
        : to.value,
    });
    const uid = await resolveDraftUid(result);
    if (uid == null) {
      dirty.value = false;
      message.success('草稿已保存');
      return true;
    }
    draftUid.value = uid;
    draftFolderName.value = result.folderName || draftFolderName.value;
    kind.value = 'draft';
    if (savingReply || savingForward) {
      to.value = savingReply
        ? [...props.session.lockedTo, ...to.value]
        : to.value;
      cc.value = savingReply
        ? [...props.session.lockedCc, ...cc.value]
        : cc.value;
      body.value = mergedBody();
      quoteHtml.value = '';
    }
    keptAttachments.value = [];
    newFiles.value = [];
    snapshot.value = currentSnapshot();
    dirty.value = false;
    message.success('草稿已保存');
    return true;
  } catch (error) {
    const skipped = (error as { config?: { skipErrorMessage?: boolean } })
      ?.config?.skipErrorMessage;
    if (!skipped) return false;
    const text = await readRequestErrorMessage(error);
    message.error(text || '附件读取失败');
    return false;
  } finally {
    submitting.value = false;
  }
}

async function handleDraft() {
  const saved = await saveDraft();
  if (saved) emit('done');
}

defineExpose({ saveDraft });

function appendFiles(files: File[]) {
  if (files.length === 0 || submitting.value) return;
  newFiles.value = [...newFiles.value, ...files];
}

function addFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files || [])];
  input.value = '';
  appendFiles(files);
}

function isFileDrag(event: DragEvent) {
  return [...(event.dataTransfer?.types || [])].includes('Files');
}

function filesFromDrop(event: DragEvent) {
  const items = [...(event.dataTransfer?.items || [])];
  const files: File[] = [];
  for (const item of items) {
    if (item.kind !== 'file') continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry && !entry.isFile) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files.length > 0 ? files : [...(event.dataTransfer?.files || [])];
}

function onDragEnter(event: DragEvent) {
  if (!isFileDrag(event) || submitting.value) return;
  event.preventDefault();
  dragDepth += 1;
  dragOver.value = true;
}

function onDragOver(event: DragEvent) {
  if (!isFileDrag(event) || submitting.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
}

function onDragLeave(event: DragEvent) {
  if (!isFileDrag(event)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0 || event.relatedTarget == null) {
    dragDepth = event.relatedTarget == null ? 0 : dragDepth;
    dragOver.value = dragDepth > 0;
  }
}

function onDrop(event: DragEvent) {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  event.stopPropagation();
  dragDepth = 0;
  dragOver.value = false;
  appendFiles(filesFromDrop(event));
}

function removeKept(index: number) {
  keptAttachments.value = keptAttachments.value.filter(
    (item) => item.index !== index,
  );
}

function removeNew(name: string, size: number) {
  newFiles.value = newFiles.value.filter(
    (file) => !(file.name === name && file.size === size),
  );
}
</script>

<template>
  <section
    class="mail-compose"
    :class="{ 'is-dragging': dragOver }"
    @dragenter.capture="onDragEnter"
    @dragleave="onDragLeave"
    @dragover.capture="onDragOver"
    @drop.capture="onDrop"
  >
    <header class="mail-compose__head">
      <i class="mail-compose__mark" />
      <strong>{{ composeTitle }}</strong>
      <button
        type="button"
        class="mail-compose__icon-btn"
        aria-label="关闭"
        @click="emit('close')"
      >
        <IconifyIcon icon="lucide:x" />
      </button>
    </header>

    <div class="mail-compose__actions">
      <button
        v-if="canSubmitSend"
        type="button"
        class="mail-compose__action is-send"
        :disabled="submitting"
        @click="handleSend"
      >
        <IconifyIcon icon="lucide:send" />
        <span>发送</span>
      </button>
      <button
        v-if="canDraft"
        type="button"
        class="mail-compose__action"
        :disabled="submitting"
        @click="handleDraft"
      >
        <IconifyIcon icon="lucide:save" />
        <span>存草稿</span>
      </button>
      <button
        type="button"
        class="mail-compose__action"
        :disabled="submitting"
        @click="fileInputRef?.click()"
      >
        <IconifyIcon icon="lucide:paperclip" />
        <span>附件</span>
      </button>
      <i class="mail-compose__split"></i>
      <button
        type="button"
        class="mail-compose__action is-danger"
        :disabled="submitting"
        @click="emit('close')"
      >
        <IconifyIcon icon="lucide:trash-2" />
        <span>丢弃</span>
      </button>
    </div>

    <div class="mail-compose__fields">
      <div class="mail-compose__row">
        <span class="mail-compose__label">收件人</span>
        <div class="mail-compose__addresses">
          <span
            v-for="address in session.lockedTo"
            :key="address"
            class="mail-pill"
            :title="address"
          >
            <i>{{ addressInitial(address) }}</i>
            <span>{{ address }}</span>
          </span>
          <AddressInput
            ref="toRef"
            v-model="to"
            borderless
            placeholder="输入邮箱，回车添加"
          />
        </div>
        <div class="mail-compose__links">
          <button
            type="button"
            :class="{ 'is-on': showCc }"
            @click="showCc = !showCc"
          >
            抄送
          </button>
          <button
            type="button"
            :class="{ 'is-on': showBcc }"
            @click="showBcc = !showBcc"
          >
            密送
          </button>
        </div>
      </div>
      <div v-if="showCc" class="mail-compose__row">
        <span class="mail-compose__label">抄送</span>
        <div class="mail-compose__addresses">
          <span
            v-for="address in session.lockedCc"
            :key="address"
            class="mail-pill"
            :title="address"
          >
            <i>{{ addressInitial(address) }}</i>
            <span>{{ address }}</span>
          </span>
          <AddressInput
            ref="ccRef"
            v-model="cc"
            borderless
            placeholder="抄送"
          />
        </div>
      </div>
      <div v-if="showBcc" class="mail-compose__row">
        <span class="mail-compose__label">密送</span>
        <div class="mail-compose__addresses">
          <AddressInput
            ref="bccRef"
            v-model="bcc"
            borderless
            placeholder="密送"
          />
        </div>
      </div>
      <label class="mail-compose__row">
        <span class="mail-compose__label">主题</span>
        <input
          v-model="subject"
          class="mail-compose__subject"
          :class="{ 'is-locked': subjectLocked }"
          :readonly="subjectLocked"
          placeholder="邮件主题"
        />
      </label>
    </div>

    <div v-if="showFileStrip" class="mail-compose__files">
      <Checkbox v-if="kind === 'forward'" v-model:checked="includeOriginal">
        带上原邮件附件
      </Checkbox>
      <span
        v-for="file in session.sourceAttachments"
        v-show="kind === 'forward' && includeOriginal"
        :key="`source-${file.index}`"
        class="mail-compose__file is-source"
      >
        <IconifyIcon :icon="fileIcon(file.fileName)" />
        <span class="mail-compose__file-name" :title="file.fileName">{{
          file.fileName
        }}</span>
        <small>{{ formatByteSize(file.size) }}</small>
      </span>
      <span
        v-for="file in keptAttachments"
        :key="file.index"
        class="mail-compose__file"
      >
        <IconifyIcon :icon="fileIcon(file.fileName)" />
        <span class="mail-compose__file-name" :title="file.fileName">{{
          file.fileName
        }}</span>
        <small>{{ formatByteSize(file.size) }}</small>
        <button
          type="button"
          aria-label="移除附件"
          @click="removeKept(file.index)"
        >
          ×
        </button>
      </span>
      <span
        v-for="file in newFiles"
        :key="`${file.name}-${file.size}`"
        class="mail-compose__file"
      >
        <IconifyIcon :icon="fileIcon(file.name)" />
        <span class="mail-compose__file-name" :title="file.name">{{
          file.name
        }}</span>
        <small>{{ formatByteSize(file.size) }}</small>
        <button
          type="button"
          aria-label="移除附件"
          @click="removeNew(file.name, file.size)"
        >
          ×
        </button>
      </span>
      <span v-if="attachmentBytes() > 0" class="mail-compose__file-size">
        约 {{ formatByteSize(attachmentBytes()) }}
      </span>
    </div>

    <div class="mail-compose__editor">
      <RichTextEditor
        v-model="body"
        fill
        image-insert="base64"
        placeholder="写下邮件内容"
      />
    </div>

    <div v-if="showQuote" class="mail-compose__quote">
      <button
        type="button"
        class="mail-compose__quote-toggle"
        @click="quoteOpen = !quoteOpen"
      >
        <IconifyIcon
          :icon="quoteOpen ? 'lucide:chevron-down' : 'lucide:chevron-right'"
        />
        原始邮件
      </button>
      <div v-show="quoteOpen" class="mail-compose__quote-body">
        <MailHtmlFrame :html-body="quoteHtml" />
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="mail-compose__file-input"
      @change="addFiles"
    />
    <div
      v-if="dragOver"
      class="mail-compose__drop"
      @dragover="onDragOver"
      @drop="onDrop"
    >
      <IconifyIcon icon="lucide:paperclip" />
      <span>松开即可添加附件</span>
    </div>
  </section>
</template>

<style scoped>
.mail-compose {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border-left: 1px solid hsl(var(--border));
}

.mail-compose__drop {
  position: absolute;
  inset: 8px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
  border: 2px dashed hsl(var(--primary));
  border-radius: 10px;
}

.mail-compose__drop :deep(svg) {
  width: 28px;
  height: 28px;
}

.mail-compose__head {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 48px;
  padding: 0 8px 0 16px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 16%) 0%,
    hsl(var(--primary) / 5%) 42%,
    hsl(var(--card)) 100%
  );
  border-bottom: 1px solid hsl(var(--border));
}

.mail-compose__head strong {
  font-size: 15px;
  font-weight: 600;
}

.mail-compose__mark {
  width: 3px;
  height: 16px;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 70%),
    hsl(var(--primary))
  );
  border-radius: 2px;
}

.mail-compose__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: auto;
  font-size: 16px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.mail-compose__icon-btn:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.mail-compose__actions {
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 6px 12px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
}

.mail-compose__action {
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

.mail-compose__action:hover:not(:disabled) {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.mail-compose__action.is-send {
  padding: 0 14px;
  font-weight: 600;
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
}

.mail-compose__action.is-send:hover:not(:disabled) {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary) / 88%);
}

.mail-compose__action.is-danger:hover:not(:disabled) {
  color: #cf1322;
  background: rgb(255 77 79 / 12%);
}

.mail-compose__action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.mail-compose__action :deep(svg) {
  width: 16px;
  height: 16px;
}

.mail-compose__split {
  flex: none;
  width: 1px;
  height: 16px;
  margin: 0 6px 0 auto;
  background: hsl(var(--border));
}

.mail-compose__fields {
  flex: none;
}

.mail-compose__row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding: 4px 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.mail-compose__label {
  flex: none;
  width: 52px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.mail-compose__addresses {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.mail-compose__addresses :deep(.mail-address) {
  flex: 1;
  min-width: 160px;
}

.mail-compose__links {
  display: flex;
  flex: none;
  gap: 12px;
}

.mail-compose__links button {
  padding: 0;
  font-size: 13px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: transparent;
  border: 0;
}

.mail-compose__links button.is-on {
  font-weight: 600;
}

.mail-pill {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 240px;
  height: 26px;
  padding: 0 10px 0 3px;
  font-size: 13px;
  background: hsl(var(--primary) / 10%);
  border-radius: 13px;
}

.mail-pill i {
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

.mail-pill span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-compose__subject {
  flex: 1;
  min-width: 0;
  height: 32px;
  font-size: 14px;
  outline: none;
  background: transparent;
  border: 0;
}

.mail-compose__subject.is-locked {
  color: hsl(var(--muted-foreground));
}

.mail-compose__files {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  max-height: 96px;
  padding: 8px 16px;
  overflow: auto;
  background: hsl(var(--primary) / 4%);
  border-bottom: 1px solid hsl(var(--border));
}

.mail-compose__file {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 280px;
  height: 32px;
  padding: 0 8px;
  font-size: 12px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.mail-compose__file.is-source {
  border-style: dashed;
}

.mail-compose__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-compose__file small,
.mail-compose__file-size {
  flex: none;
  color: hsl(var(--muted-foreground));
}

.mail-compose__file button {
  flex: none;
  padding: 0 2px;
  font-size: 14px;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
}

.mail-compose__file-input {
  display: none;
}

.mail-compose__editor {
  flex: 1;
  min-height: 220px;
  overflow: hidden;
}

.mail-compose__editor :deep(.rich-text-editor) {
  background: transparent;
  border: 0;
  border-radius: 0;
}

.mail-compose__quote {
  flex: none;
  border-top: 1px solid hsl(var(--border));
}

.mail-compose__quote-toggle {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: hsl(var(--muted) / 40%);
  border: 0;
}

.mail-compose__quote-body {
  height: 140px;
  border-left: 3px solid hsl(var(--primary) / 45%);
}
</style>
