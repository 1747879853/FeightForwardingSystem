<script lang="ts" setup>
import type { MailTemplateApi } from '#/api/mail-template/mail-template';

import { computed, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { message, Modal, Select, Upload } from 'ant-design-vue';

import RichTextEditor from '#/adapter/component/rich-text-editor.vue';
import { PERSONAL_MAIL_PERMISSION } from '#/api/personal-mail/personal-mail-admin';
import {
  generateMail,
  getUsableMailTemplates,
  saveMailDraft,
  sendMail,
} from '#/api/mail-template/mail-template';
import {
  getPrintAsync,
  getPrintFormatList,
} from '#/api/system/print-format-admin';
import {
  PrintExportFormat,
  type PrintFormatBizType,
  type PrintJsonType,
} from '#/components/print-format';
import AddressInput from '#/views/personal-mail/components/address-input.vue';
import { isEmailAddress } from '#/views/personal-mail/mail-format';

import {
  formatByteSize,
  LOCAL_UPLOAD_LIMIT_BYTES,
  NO_MAILBOX_HINT,
  readAbpErrorMessage,
  TOTAL_ATTACHMENT_LIMIT_BYTES,
} from './mail-template-form';
import SendRecordPane from './send-record-pane.vue';

interface PrintFilter {
  carrierId?: null | number;
  codeIssueTypeId?: null | number;
  orgId?: null | number | string;
}

interface OpenData {
  bizType?: null | PrintFormatBizType;
  entityId: string;
  frightModule: number;
  printJsonType?: PrintJsonType;
  resolvePrintFilter?: () => Promise<null | PrintFilter>;
}

const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canDraft = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.draft]),
);
const canSend = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.send]),
);

const openData = shallowRef<OpenData | null>(null);
const activeTab = ref('compose');
const loadingTemplates = ref(false);
const generating = ref(false);
const templates = shallowRef<MailTemplateApi.UsableTemplate[]>([]);
const selectedTemplateId = ref<string>();
const generatedTemplateId = ref('');
const subject = ref('');
const body = ref('');
const toAddresses = ref<string[]>([]);
const ccAddresses = ref<string[]>([]);
const invalidAddresses = ref<string[]>([]);
const systemAttachments = shallowRef<MailTemplateApi.SystemAttachment[]>([]);
const selectedAttachmentIds = ref<string[]>([]);
const printFiles = ref<Array<{ fileName: string; label: string }>>([]);
const localFiles = ref<
  Array<{ content: string; fileName: string; size: number }>
>([]);
const printTemplates = shallowRef<Array<{ label: string; value: string }>>([]);
const selectedPrintFormatId = ref<string>();
const printing = ref(false);
const submitting = ref(false);
const generatedSnapshot = ref('');
const recordPaneRef = ref<{ reload: () => void }>();
const toInputRef = ref<{ commit: () => boolean }>();
const ccInputRef = ref<{ commit: () => boolean }>();
const fileInputRef = ref<HTMLInputElement>();
const showCc = ref(false);

watch(ccAddresses, (list) => {
  if (list.length > 0) {
    showCc.value = true;
  }
});

const hasPrint = computed(
  () =>
    openData.value?.printJsonType !== undefined &&
    openData.value?.printJsonType !== null,
);

const templateOptions = computed(() =>
  templates.value.map((item) => ({
    label:
      item.serviceType === null || item.serviceType === undefined
        ? `${item.name || '未命名'}（通用）`
        : item.name || '未命名',
    value: item.id,
  })),
);

function snapshot() {
  return JSON.stringify({
    subject: subject.value,
    body: body.value,
    toAddresses: toAddresses.value,
    ccAddresses: ccAddresses.value,
  });
}

function resetCompose() {
  templates.value = [];
  selectedTemplateId.value = undefined;
  generatedTemplateId.value = '';
  subject.value = '';
  body.value = '';
  toAddresses.value = [];
  ccAddresses.value = [];
  invalidAddresses.value = [];
  systemAttachments.value = [];
  selectedAttachmentIds.value = [];
  printFiles.value = [];
  localFiles.value = [];
  printTemplates.value = [];
  selectedPrintFormatId.value = undefined;
  generatedSnapshot.value = '';
  activeTab.value = 'compose';
  showCc.value = false;
}

function notifyRequestError(error: unknown) {
  const text = readAbpErrorMessage(error);
  if (String(text).includes(NO_MAILBOX_HINT)) {
    Modal.confirm({
      title: NO_MAILBOX_HINT,
      content: '请先在个人设置里配置个人邮箱，再存草稿或发送。',
      okText: '去配置',
      cancelText: '关闭',
      onOk: () => {
        void router.push('/profile?tab=mail');
      },
    });
    return;
  }
  message.error(text);
}

async function loadTemplates() {
  const data = openData.value;
  if (!data?.entityId) {
    return;
  }
  loadingTemplates.value = true;
  try {
    templates.value =
      (await getUsableMailTemplates({
        frightModule: data.frightModule,
        entityId: data.entityId,
      })) ?? [];
  } finally {
    loadingTemplates.value = false;
  }
}

async function applyGenerate(templateId: string) {
  const data = openData.value;
  if (!data) {
    return;
  }
  generating.value = true;
  try {
    const result = await generateMail({
      mailTemplateId: templateId,
      frightModule: data.frightModule,
      entityId: data.entityId,
    });
    generatedTemplateId.value = result.mailTemplateId || templateId;
    subject.value = result.subject || '';
    body.value = result.body || '';
    toAddresses.value = [...(result.toAddresses ?? [])];
    ccAddresses.value = [...(result.ccAddresses ?? [])];
    invalidAddresses.value = [...(result.invalidAddresses ?? [])];
    systemAttachments.value = result.systemAttachments ?? [];
    selectedAttachmentIds.value = [];
    generatedSnapshot.value = snapshot();
  } finally {
    generating.value = false;
  }
}

function onTemplateChange(value: unknown) {
  const templateId = value ? String(value) : '';
  if (!templateId) {
    selectedTemplateId.value = undefined;
    return;
  }
  const apply = async () => {
    selectedTemplateId.value = templateId;
    await applyGenerate(templateId);
  };
  if (generatedSnapshot.value && snapshot() !== generatedSnapshot.value) {
    Modal.confirm({
      title: '重新生成邮件',
      content: '当前内容已修改，换模板会覆盖这些修改。',
      onOk: apply,
    });
    return;
  }
  void apply();
}

function attachmentKey(item: MailTemplateApi.SystemAttachment) {
  if (item.attachmentId === null || item.attachmentId === undefined) {
    return '';
  }
  return String(item.attachmentId);
}

function attachmentTypeName(item: MailTemplateApi.SystemAttachment) {
  return item.attachmentDtlType?.cnName || item.attachmentDtlType?.name || '';
}

function toggleAttachment(id: string, checked: boolean) {
  selectedAttachmentIds.value = checked
    ? [...selectedAttachmentIds.value, id]
    : selectedAttachmentIds.value.filter((item) => item !== id);
}

async function loadPrintTemplates() {
  const data = openData.value;
  if (
    !data ||
    data.printJsonType === undefined ||
    data.printJsonType === null
  ) {
    return;
  }
  const filter = data.resolvePrintFilter ? await data.resolvePrintFilter() : {};
  if (filter === null) {
    return;
  }
  const result = await getPrintFormatList({
    printJsonType: data.printJsonType,
    bizType: data.bizType ?? undefined,
    codeIssueTypeId: filter.codeIssueTypeId,
    carrierId: filter.carrierId,
    orgId: filter.orgId,
    pageIndex: 1,
    pageSize: 200,
  });
  printTemplates.value = (result.items ?? []).map((item) => ({
    label: item.name || '未命名模板',
    value: item.id,
  }));
}

async function addPrintFile() {
  const data = openData.value;
  if (
    !data ||
    data.printJsonType === undefined ||
    data.printJsonType === null
  ) {
    return;
  }
  if (!selectedPrintFormatId.value) {
    message.warning('请先选择打印模板');
    return;
  }
  printing.value = true;
  try {
    const filename = await getPrintAsync({
      printFormatId: selectedPrintFormatId.value,
      printJsonType: data.printJsonType,
      detailInput: { id: data.entityId },
      format: PrintExportFormat.Pdf,
    });
    if (!filename) {
      message.error('打印未返回文件');
      return;
    }
    const label =
      printTemplates.value.find(
        (item) => item.value === selectedPrintFormatId.value,
      )?.label || filename;
    printFiles.value = [...printFiles.value, { fileName: filename, label }];
  } finally {
    printing.value = false;
  }
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    });
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('读取文件失败'));
    });
    reader.readAsDataURL(file);
  });
}

async function onLocalFile(file: File) {
  const nextSize =
    localFiles.value.reduce((sum, item) => sum + item.size, 0) + file.size;
  if (nextSize > LOCAL_UPLOAD_LIMIT_BYTES) {
    message.warning('本地上传合计请限制在 20MB 以内');
    return Upload.LIST_IGNORE;
  }
  const content = await fileToBase64(file);
  localFiles.value = [
    ...localFiles.value,
    { fileName: file.name, content, size: file.size },
  ];
  return Upload.LIST_IGNORE;
}

function knownAttachmentBytes() {
  const systemBytes = systemAttachments.value.reduce((sum, item) => {
    const id = String(item.attachmentId ?? '');
    if (!selectedAttachmentIds.value.includes(id)) {
      return sum;
    }
    const size = Number(item.fileLength);
    return sum + (Number.isFinite(size) ? size : 0);
  }, 0);
  const localBytes = localFiles.value.reduce((sum, item) => sum + item.size, 0);
  return systemBytes + localBytes;
}

function commitAddresses() {
  const toOk = toInputRef.value?.commit() !== false;
  const ccOk = ccInputRef.value?.commit() !== false;
  return toOk && ccOk;
}

function validateAddresses(addresses: string[], label: string) {
  for (const item of addresses) {
    if (!isEmailAddress(item)) {
      return `邮箱【${item}】格式不正确`;
    }
  }
  if (label === '收件人' && addresses.length === 0) {
    return '收件人不能为空';
  }
  return '';
}

function buildCompose() {
  const data = openData.value;
  if (!data) {
    return null;
  }
  const mailSubject = subject.value.trim();
  if (!mailSubject) {
    message.warning('邮件标题不能为空');
    return null;
  }
  if (mailSubject.length > 1024) {
    message.warning('邮件标题长度不能超过1024');
    return null;
  }
  if (knownAttachmentBytes() > TOTAL_ATTACHMENT_LIMIT_BYTES) {
    message.warning('附件合计不能超过50MB');
    return null;
  }
  return {
    frightModule: data.frightModule,
    entityId: data.entityId,
    toAddresses: [...toAddresses.value],
    ccAddresses: [...ccAddresses.value],
    subject: mailSubject,
    body: body.value || '',
    systemAttachmentIds: selectedAttachmentIds.value.filter(Boolean),
    printFileNames: printFiles.value.map((item) => item.fileName),
    attachments: localFiles.value.map((item) => ({
      fileName: item.fileName,
      content: item.content,
    })),
  };
}

async function onSaveDraft() {
  if (!commitAddresses()) {
    message.warning('邮箱格式不正确');
    return;
  }
  const addressError = [...toAddresses.value, ...ccAddresses.value]
    .map((item) => (isEmailAddress(item) ? '' : `邮箱【${item}】格式不正确`))
    .find(Boolean);
  if (addressError) {
    message.warning(addressError);
    return;
  }
  const payload = buildCompose();
  if (!payload) {
    return;
  }
  submitting.value = true;
  try {
    await saveMailDraft(payload, { skipErrorMessage: true });
    message.success('已存入个人邮箱草稿箱');
  } catch (error) {
    notifyRequestError(error);
  } finally {
    submitting.value = false;
  }
}

async function onSend() {
  if (!commitAddresses()) {
    message.warning('邮箱格式不正确');
    return;
  }
  const addressError =
    validateAddresses(toAddresses.value, '收件人') ||
    validateAddresses(ccAddresses.value, '抄送人');
  if (addressError) {
    message.warning(addressError);
    return;
  }
  if (!generatedTemplateId.value) {
    message.warning('请先选择邮件模板');
    return;
  }
  const payload = buildCompose();
  if (!payload) {
    return;
  }
  submitting.value = true;
  try {
    await sendMail(
      { ...payload, mailTemplateId: generatedTemplateId.value },
      { skipErrorMessage: true },
    );
    message.success('发送成功');
    await modalApi.close();
  } catch (error) {
    notifyRequestError(error);
  } finally {
    submitting.value = false;
  }
}

const [ModalBox, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: '关闭',
  async onOpenChange(isOpen) {
    if (!isOpen) {
      resetCompose();
      openData.value = null;
      return;
    }
    openData.value = modalApi.getData<OpenData>();
    await loadTemplates();
  },
});

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['gif', 'jpeg', 'jpg', 'png', 'webp'].includes(ext)) {
    return 'lucide:image';
  }
  if (ext === 'pdf') {
    return 'lucide:file-text';
  }
  if (['csv', 'xls', 'xlsx'].includes(ext)) {
    return 'lucide:sheet';
  }
  if (['7z', 'rar', 'zip'].includes(ext)) {
    return 'lucide:file-archive';
  }
  return 'lucide:file';
}

async function onPickFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files || [])];
  input.value = '';
  for (const file of files) {
    await onLocalFile(file);
  }
}

const attachmentCount = computed(
  () =>
    selectedAttachmentIds.value.length +
    printFiles.value.length +
    localFiles.value.length,
);

function onTabChange(key: number | string) {
  activeTab.value = String(key);
  if (activeTab.value === 'records') {
    recordPaneRef.value?.reload();
  }
}
</script>

<template>
  <ModalBox class="w-full max-w-[960px]" title="发邮件">
    <div class="send-mail">
      <div class="send-mail__switch" role="tablist">
        <button
          type="button"
          role="tab"
          :class="{ 'is-on': activeTab === 'compose' }"
          :aria-selected="activeTab === 'compose'"
          @click="onTabChange('compose')"
        >
          写信
        </button>
        <button
          type="button"
          role="tab"
          :class="{ 'is-on': activeTab === 'records' }"
          :aria-selected="activeTab === 'records'"
          @click="onTabChange('records')"
        >
          发送记录
        </button>
      </div>

      <section v-show="activeTab === 'compose'" class="send-mail__sheet">
        <div class="send-mail__actions">
          <button
            v-if="canSend"
            type="button"
            class="send-mail__action is-send"
            :disabled="submitting || generating"
            @click="onSend"
          >
            <IconifyIcon icon="lucide:send" />
            <span>发送</span>
          </button>
          <button
            v-if="canDraft"
            type="button"
            class="send-mail__action"
            :disabled="submitting || generating"
            @click="onSaveDraft"
          >
            <IconifyIcon icon="lucide:save" />
            <span>存草稿</span>
          </button>
          <button
            type="button"
            class="send-mail__action"
            :disabled="submitting"
            @click="fileInputRef?.click()"
          >
            <IconifyIcon icon="lucide:paperclip" />
            <span>附件</span>
          </button>
          <span v-if="attachmentCount > 0" class="send-mail__count">
            已选 {{ attachmentCount }} 个附件
          </span>
        </div>

        <p
          v-if="!loadingTemplates && templates.length === 0"
          class="send-mail__notice"
        >
          没有可用的邮件模板
        </p>
        <p v-else-if="generating" class="send-mail__notice">
          正在根据模板生成邮件
        </p>
        <p v-if="invalidAddresses.length > 0" class="send-mail__notice">
          以下邮箱格式不正确，已忽略：{{ invalidAddresses.join('、') }}
        </p>

        <div class="send-mail__fields">
          <div class="send-mail__row">
            <span class="send-mail__label">模板</span>
            <Select
              :loading="loadingTemplates || generating"
              :options="templateOptions"
              :value="selectedTemplateId"
              allow-clear
              class="send-mail__select"
              placeholder="选择模板后生成邮件"
              @update:value="onTemplateChange"
            />
          </div>
          <div class="send-mail__row">
            <span class="send-mail__label">收件人</span>
            <div class="send-mail__addresses">
              <AddressInput
                ref="toInputRef"
                v-model="toAddresses"
                borderless
                placeholder="输入邮箱，回车添加"
              />
            </div>
            <button
              type="button"
              class="send-mail__link"
              :class="{ 'is-on': showCc }"
              @click="showCc = !showCc"
            >
              抄送
            </button>
          </div>
          <div v-if="showCc" class="send-mail__row">
            <span class="send-mail__label">抄送</span>
            <div class="send-mail__addresses">
              <AddressInput
                ref="ccInputRef"
                v-model="ccAddresses"
                borderless
                placeholder="抄送"
              />
            </div>
          </div>
          <label class="send-mail__row">
            <span class="send-mail__label">主题</span>
            <input
              v-model="subject"
              class="send-mail__subject"
              maxlength="1024"
              placeholder="邮件主题"
            />
          </label>
        </div>

        <div
          v-if="
            systemAttachments.length > 0 ||
            printFiles.length > 0 ||
            localFiles.length > 0
          "
          class="send-mail__files"
        >
          <button
            v-for="item in systemAttachments"
            :key="attachmentKey(item) || item.friendlyFileName"
            type="button"
            class="send-mail__file"
            :class="{
              'is-on': selectedAttachmentIds.includes(attachmentKey(item)),
            }"
            :disabled="!attachmentKey(item)"
            @click="
              toggleAttachment(
                attachmentKey(item),
                !selectedAttachmentIds.includes(attachmentKey(item)),
              )
            "
          >
            <IconifyIcon :icon="fileIcon(item.friendlyFileName || '')" />
            <span class="send-mail__file-name">
              {{ item.friendlyFileName || '未命名附件' }}
            </span>
            <small>
              {{ attachmentTypeName(item) }}
              {{ formatByteSize(item.fileLength) }}
            </small>
          </button>
          <span
            v-for="(item, index) in printFiles"
            :key="`${item.fileName}-${index}`"
            class="send-mail__file is-on"
          >
            <IconifyIcon icon="lucide:printer" />
            <span class="send-mail__file-name">{{ item.label }}</span>
            <button
              type="button"
              aria-label="移除打印文件"
              @click="
                printFiles = printFiles.filter(
                  (_, itemIndex) => itemIndex !== index,
                )
              "
            >
              ×
            </button>
          </span>
          <span
            v-for="(item, index) in localFiles"
            :key="`${item.fileName}-${index}`"
            class="send-mail__file is-on"
          >
            <IconifyIcon :icon="fileIcon(item.fileName)" />
            <span class="send-mail__file-name">{{ item.fileName }}</span>
            <small>{{ formatByteSize(item.size) }}</small>
            <button
              type="button"
              aria-label="移除本地文件"
              @click="
                localFiles = localFiles.filter(
                  (_, itemIndex) => itemIndex !== index,
                )
              "
            >
              ×
            </button>
          </span>
        </div>

        <div v-if="hasPrint" class="send-mail__print">
          <IconifyIcon icon="lucide:printer" />
          <Select
            v-model:value="selectedPrintFormatId"
            :options="printTemplates"
            allow-clear
            class="send-mail__select"
            placeholder="选择打印模板，生成 PDF 加入附件"
            @dropdown-visible-change="
              (open) => {
                if (open && printTemplates.length === 0) {
                  void loadPrintTemplates();
                }
              }
            "
          />
          <button
            type="button"
            class="send-mail__action"
            :disabled="printing"
            @click="addPrintFile"
          >
            {{ printing ? '生成中' : '加入附件' }}
          </button>
        </div>

        <p class="send-mail__hint">
          点选业务附件即可附上。本地文件合计不超过 20MB，全部附件不超过 50MB。
        </p>

        <div class="send-mail__editor">
          <RichTextEditor v-model="body" auto-height placeholder="邮件正文" />
        </div>
        <input
          ref="fileInputRef"
          class="send-mail__file-input"
          type="file"
          multiple
          @change="onPickFiles"
        />
      </section>

      <section v-show="activeTab === 'records'" class="send-mail__records">
        <SendRecordPane
          v-if="openData"
          ref="recordPaneRef"
          embedded
          :entity-id="openData.entityId"
          :fright-module="openData.frightModule"
        />
      </section>
    </div>
  </ModalBox>
</template>

<style scoped>
.send-mail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 2px 16px;
}

.send-mail__switch {
  display: inline-flex;
  gap: 2px;
  align-self: flex-start;
  padding: 3px;
  background: hsl(var(--muted) / 55%);
  border-radius: 8px;
}

.send-mail__switch button {
  height: 28px;
  padding: 0 14px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.send-mail__switch button:hover {
  color: hsl(var(--foreground));
}

.send-mail__switch button.is-on {
  font-weight: 600;
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  box-shadow: 0 1px 2px hsl(var(--foreground) / 8%);
}

.send-mail__sheet {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.send-mail__actions {
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 8px 12px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
  border-radius: 9px 9px 0 0;
}

.send-mail__action {
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
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.send-mail__action:hover:not(:disabled) {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.send-mail__action.is-send {
  padding: 0 14px;
  font-weight: 600;
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
}

.send-mail__action.is-send:hover:not(:disabled) {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary) / 88%);
}

.send-mail__action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.send-mail__action :deep(svg) {
  width: 16px;
  height: 16px;
}

.send-mail__count {
  margin-left: auto;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.send-mail__notice {
  padding: 8px 16px;
  margin: 0;
  font-size: 13px;
  color: hsl(var(--foreground) / 78%);
  background: hsl(var(--muted) / 45%);
  border-bottom: 1px solid hsl(var(--border));
}

.send-mail__fields {
  background: hsl(var(--card));
}

.send-mail__row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding: 4px 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.send-mail__label {
  flex: none;
  width: 52px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.send-mail__addresses {
  display: flex;
  flex: 1;
  min-width: 0;
}

.send-mail__addresses :deep(.mail-address) {
  flex: 1;
  min-width: 0;
}

.send-mail__link {
  flex: none;
  padding: 0;
  font-size: 13px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: transparent;
  border: 0;
}

.send-mail__link.is-on {
  font-weight: 600;
}

.send-mail__subject {
  flex: 1;
  min-width: 0;
  height: 32px;
  font-size: 14px;
  color: hsl(var(--foreground));
  outline: none;
  background: transparent;
  border: 0;
}

.send-mail__select {
  flex: 1;
  min-width: 0;
}

.send-mail__select :deep(.ant-select-selector) {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.send-mail__select:hover :deep(.ant-select-selector),
.send-mail__select :deep(.ant-select-focused .ant-select-selector) {
  background: hsl(var(--accent) / 40%) !important;
}

.send-mail__files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  background: hsl(var(--primary) / 4%);
  border-bottom: 1px solid hsl(var(--border));
}

.send-mail__file {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 280px;
  height: 32px;
  padding: 0 8px;
  font-size: 12px;
  color: hsl(var(--foreground));
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

button.send-mail__file:hover:not(:disabled) {
  border-color: hsl(var(--primary) / 45%);
}

.send-mail__file.is-on {
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary) / 35%);
}

.send-mail__file:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.send-mail__file :deep(svg) {
  flex: none;
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
}

.send-mail__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.send-mail__file small {
  flex: none;
  color: hsl(var(--muted-foreground));
}

.send-mail__file button {
  flex: none;
  padding: 0 2px;
  font-size: 14px;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.send-mail__file button:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.send-mail__print {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.send-mail__print > :deep(svg) {
  flex: none;
  width: 16px;
  height: 16px;
  color: hsl(var(--muted-foreground));
}

.send-mail__hint {
  padding: 8px 16px 0;
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.send-mail__editor {
  min-height: 240px;
  padding: 4px 8px 12px;
}

.send-mail__editor :deep(.rich-text-editor) {
  background: transparent;
  border-color: transparent;
  border-radius: 8px;
}

.send-mail__editor :deep(.rich-text-editor:focus-within) {
  border-color: hsl(var(--primary) / 35%);
}

.send-mail__file-input {
  display: none;
}

.send-mail__records {
  padding: 4px 2px 8px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}
</style>
