<script lang="ts" setup>
import type { MailTemplateAdminApi } from '#/api/mail-template/mail-template-admin';

import { computed, nextTick, ref, shallowRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Input, InputNumber, message, Select, Switch } from 'ant-design-vue';

import RichTextEditor from '#/adapter/component/rich-text-editor.vue';
import {
  addMailTemplate,
  editMailTemplate,
  getMailTemplateDetail,
} from '#/api/mail-template/mail-template-admin';

import {
  type RecipientRow,
  splitRecipientRows,
  stripUnsupportedPlaceholders,
  toRecipientInputs,
  validateRecipientRows,
} from '../mail-template-form';
import RecipientEditor from './recipient-editor.vue';

const emit = defineEmits<{ success: [] }>();

const moduleOptions = shallowRef<MailTemplateAdminApi.ModuleOption[]>([]);
const serviceOptions = shallowRef<Array<{ label: string; value: number }>>([]);
const editingId = ref('');
const lockedModule = ref<null | number>(null);
const name = ref('');
const frightModule = ref<null | number>(null);
const serviceType = ref<null | number>(null);
const isEnabled = ref(true);
const subject = ref('');
const body = ref('');
const sortId = ref<null | number>(0);
const toRows = ref<RecipientRow[]>([]);
const ccRows = ref<RecipientRow[]>([]);
const insertTarget = ref<'body' | 'subject'>('body');
const showCc = ref(false);
const subjectCursor = ref({ start: 0, end: 0 });
const editorRef = ref<InstanceType<typeof RichTextEditor>>();
const editorReady = ref(false);
const editorMountKey = ref(0);

const isEdit = computed(() => !!editingId.value);
const title = computed(() => (isEdit.value ? '编辑邮件模板' : '新增邮件模板'));

const currentModule = computed(() =>
  moduleOptions.value.find((item) => item.frightModule === frightModule.value),
);

const placeholders = computed(() => currentModule.value?.placeholders ?? []);
const sources = computed(() => currentModule.value?.recipientSources ?? []);

const serviceHint = computed(() => {
  const module = frightModule.value;
  if (module !== 5 && module !== 12 && module !== 15) {
    return '';
  }
  if (serviceType.value === null || serviceType.value === undefined) {
    return '';
  }
  return '空运出口、件杂货、发票开出目前没有服务项任务，选了服务项的模板在业务里不会出现。';
});

function rememberSubjectCursor(event: Event) {
  const input = event.target as HTMLInputElement;
  subjectCursor.value = {
    start: input.selectionStart ?? subject.value.length,
    end: input.selectionEnd ?? subject.value.length,
  };
  insertTarget.value = 'subject';
}

function insertPlaceholder(tokenName: string) {
  const token = `{{${tokenName}}}`;
  if (insertTarget.value === 'subject') {
    const start = subjectCursor.value.start;
    const end = subjectCursor.value.end;
    subject.value = `${subject.value.slice(0, start)}${token}${subject.value.slice(end)}`;
    const next = start + token.length;
    subjectCursor.value = { start: next, end: next };
    return;
  }
  editorRef.value?.insertText(token);
}

function allowedPlaceholderSet() {
  return new Set(placeholders.value);
}

function allowedSourceSet() {
  return new Set(sources.value.map((item) => item.value));
}

function onModuleChange(value: unknown) {
  const next =
    value === undefined || value === null || value === ''
      ? null
      : Number(value);
  const previous = frightModule.value;
  frightModule.value = next;
  if (previous === null || next === null || previous === next) {
    return;
  }
  const allowed = allowedPlaceholderSet();
  const subjectResult = stripUnsupportedPlaceholders(subject.value, allowed);
  const bodyResult = stripUnsupportedPlaceholders(body.value || '', allowed);
  subject.value = subjectResult.next;
  body.value = bodyResult.next;
  const sourceSet = allowedSourceSet();
  const before = toRows.value.length + ccRows.value.length;
  toRows.value = toRows.value.filter(
    (row) =>
      row.mode === 'email' ||
      (row.recipientSource !== null && sourceSet.has(row.recipientSource)),
  );
  ccRows.value = ccRows.value.filter(
    (row) =>
      row.mode === 'email' ||
      (row.recipientSource !== null && sourceSet.has(row.recipientSource)),
  );
  const removedNames = [...subjectResult.removed, ...bodyResult.removed];
  const removedSources = before - toRows.value.length - ccRows.value.length;
  if (removedNames.length > 0 || removedSources > 0) {
    message.info('已清掉新模块不支持的占位符或收件人来源');
  }
}

function validateForm() {
  const templateName = name.value.trim();
  if (!templateName) {
    return '模板名不能为空';
  }
  if (templateName.length > 64) {
    return '模板名长度不能超过64';
  }
  if (
    !isEdit.value &&
    (frightModule.value === null || Number.isNaN(frightModule.value))
  ) {
    return '请选择适用模块';
  }
  const mailSubject = subject.value.trim();
  if (!mailSubject) {
    return '邮件标题不能为空';
  }
  if (mailSubject.length > 512) {
    return '邮件标题长度不能超过512';
  }
  const sourceSet = allowedSourceSet();
  return (
    validateRecipientRows(toRows.value, '收件人', sourceSet) ||
    validateRecipientRows(ccRows.value, '抄送人', sourceSet)
  );
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const errorText = validateForm();
    if (errorText) {
      message.warning(errorText);
      return;
    }
    const recipients = toRecipientInputs(toRows.value, ccRows.value);
    modalApi.lock();
    try {
      if (editingId.value) {
        await editMailTemplate({
          id: editingId.value,
          name: name.value.trim(),
          serviceType: serviceType.value,
          isEnabled: isEnabled.value,
          subject: subject.value.trim(),
          body: body.value || '',
          sortId: sortId.value ?? 0,
          mailTemplateRecipients: recipients,
        });
      } else {
        await addMailTemplate({
          name: name.value.trim(),
          frightModule: frightModule.value as number,
          serviceType: serviceType.value,
          isEnabled: isEnabled.value,
          subject: subject.value.trim(),
          body: body.value || '',
          sortId: sortId.value ?? 0,
          mailTemplateRecipients: recipients,
        });
      }
      message.success('保存成功');
      await modalApi.close();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      editorReady.value = false;
      return;
    }
    const data = modalApi.getData<{
      id?: string;
      moduleOptions?: MailTemplateAdminApi.ModuleOption[];
      serviceOptions?: Array<{ label: string; value: number }>;
    }>();
    moduleOptions.value = data?.moduleOptions ?? [];
    serviceOptions.value = data?.serviceOptions ?? [];
    editingId.value = data?.id || '';
    name.value = '';
    frightModule.value = null;
    lockedModule.value = null;
    serviceType.value = null;
    isEnabled.value = true;
    subject.value = '';
    body.value = '';
    sortId.value = 0;
    toRows.value = [];
    ccRows.value = [];
    showCc.value = false;
    insertTarget.value = 'body';
    if (data?.id) {
      const detail = await getMailTemplateDetail(data.id);
      name.value = detail.name || '';
      frightModule.value = detail.frightModule ?? null;
      lockedModule.value = detail.frightModule ?? null;
      serviceType.value = detail.serviceType ?? null;
      isEnabled.value = detail.isEnabled !== false;
      subject.value = detail.subject || '';
      body.value = detail.body || '';
      sortId.value = detail.sortId ?? 0;
      const split = splitRecipientRows(detail.mailTemplateRecipients);
      toRows.value = split.toRows;
      ccRows.value = split.ccRows;
      showCc.value = split.ccRows.length > 0;
    }
    editorMountKey.value += 1;
    await nextTick();
    editorReady.value = true;
  },
});
</script>

<template>
  <Modal :title="title" class="w-full max-w-[1080px]">
    <div class="tpl-mail">
      <section class="tpl-mail__meta">
        <div class="tpl-mail__meta-head">模板信息</div>
        <div class="tpl-mail__meta-body">
          <label class="tpl-mail__field">
            <span>模板名</span>
            <Input
              v-model:value="name"
              :maxlength="64"
              allow-clear
              placeholder="给这封模板起个名字"
            />
          </label>
          <label class="tpl-mail__field">
            <span>适用模块</span>
            <Select
              :disabled="isEdit"
              :value="isEdit ? lockedModule : frightModule"
              allow-clear
              class="w-full"
              placeholder="请选择"
              :options="
                moduleOptions.map((item) => ({
                  label: item.frightModuleName || String(item.frightModule),
                  value: item.frightModule,
                }))
              "
              @update:value="onModuleChange"
            />
          </label>
          <label class="tpl-mail__field">
            <span>服务项</span>
            <Select
              :value="serviceType ?? undefined"
              allow-clear
              class="w-full"
              placeholder="不选则为通用模板"
              :options="serviceOptions"
              @update:value="
                (value) => {
                  serviceType =
                    value === undefined || value === null
                      ? null
                      : Number(value);
                }
              "
            />
          </label>
          <div class="tpl-mail__field tpl-mail__field--split">
            <div class="tpl-mail__field">
              <span>启用</span>
              <Switch v-model:checked="isEnabled" />
            </div>
            <label class="tpl-mail__field">
              <span>排序</span>
              <InputNumber
                v-model:value="sortId"
                class="w-full"
                :precision="0"
              />
            </label>
          </div>
        </div>
        <p v-if="serviceHint" class="tpl-mail__notice">{{ serviceHint }}</p>
      </section>

      <section class="tpl-mail__sheet">
        <div class="tpl-mail__fields">
          <div class="tpl-mail__row">
            <span class="tpl-mail__label">收件人</span>
            <RecipientEditor
              v-model="toRows"
              title="收件人"
              :sources="sources"
            />
            <button
              type="button"
              class="tpl-mail__link"
              :class="{ 'is-on': showCc }"
              @click="showCc = !showCc"
            >
              抄送
            </button>
          </div>
          <div v-if="showCc" class="tpl-mail__row">
            <span class="tpl-mail__label">抄送</span>
            <RecipientEditor
              v-model="ccRows"
              title="抄送人"
              :sources="sources"
            />
          </div>
          <label
            class="tpl-mail__row"
            :class="{ 'is-target': insertTarget === 'subject' }"
          >
            <span class="tpl-mail__label">主题</span>
            <input
              v-model="subject"
              class="tpl-mail__subject"
              maxlength="512"
              placeholder="邮件主题"
              @blur="rememberSubjectCursor"
              @click="rememberSubjectCursor"
              @focus="rememberSubjectCursor"
              @keyup="rememberSubjectCursor"
              @select="rememberSubjectCursor"
            />
          </label>
        </div>

        <div class="tpl-mail__tokens">
          <span class="tpl-mail__tokens-label">
            <IconifyIcon icon="lucide:braces" />
            占位符
          </span>
          <span v-if="placeholders.length > 0" class="tpl-mail__tokens-hint">
            插入到{{ insertTarget === 'subject' ? '主题' : '正文' }}
          </span>
          <span v-else class="tpl-mail__tokens-hint">先选择适用模块</span>
          <button
            v-for="item in placeholders"
            :key="item"
            type="button"
            class="tpl-mail__token"
            @mousedown.prevent
            @click="insertPlaceholder(item)"
          >
            {{ item }}
          </button>
        </div>

        <div
          class="tpl-mail__editor"
          :class="{ 'is-target': insertTarget === 'body' }"
          @focusin="insertTarget = 'body'"
        >
          <RichTextEditor
            v-if="editorReady"
            :key="editorMountKey"
            ref="editorRef"
            v-model="body"
            auto-height
            placeholder="邮件正文"
          />
        </div>
      </section>
    </div>
  </Modal>
</template>

<style scoped>
.tpl-mail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 2px 16px;
}

.tpl-mail__meta,
.tpl-mail__sheet {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.tpl-mail__meta-head {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
  border-bottom: 1px solid hsl(var(--border));
}

.tpl-mail__meta-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  padding: 14px 16px;
}

.tpl-mail__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.tpl-mail__field > span {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.tpl-mail__field--split {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
}

.tpl-mail__field :deep(.ant-input),
.tpl-mail__field :deep(.ant-input-number),
.tpl-mail__field :deep(.ant-select-selector) {
  border-radius: 8px !important;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.tpl-mail__field :deep(.ant-input:hover),
.tpl-mail__field :deep(.ant-input-number:hover),
.tpl-mail__field :deep(.ant-select:hover .ant-select-selector) {
  border-color: hsl(var(--primary) / 45%) !important;
}

.tpl-mail__field :deep(.ant-input:focus),
.tpl-mail__field :deep(.ant-input-number-focused),
.tpl-mail__field :deep(.ant-select-focused .ant-select-selector) {
  border-color: hsl(var(--primary) / 55%) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 12%) !important;
}

.tpl-mail__notice {
  padding: 8px 16px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--foreground) / 78%);
  background: hsl(var(--muted) / 45%);
  border-top: 1px solid hsl(var(--border));
  border-radius: 0 0 9px 9px;
}

.tpl-mail__row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-height: 44px;
  padding: 4px 16px;
  border-bottom: 1px solid hsl(var(--border));
  transition: background 0.15s ease;
}

.tpl-mail__row.is-target {
  background: hsl(var(--primary) / 5%);
}

.tpl-mail__label {
  flex: none;
  width: 52px;
  padding-top: 10px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.tpl-mail__link {
  flex: none;
  height: 32px;
  padding: 0;
  margin-top: 6px;
  font-size: 13px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.tpl-mail__link:hover {
  background: hsl(var(--primary) / 10%);
}

.tpl-mail__link.is-on {
  font-weight: 600;
}

.tpl-mail__subject {
  flex: 1;
  min-width: 0;
  height: 36px;
  font-size: 14px;
  color: hsl(var(--foreground));
  outline: none;
  background: transparent;
  border: 0;
}

.tpl-mail__tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  background: hsl(var(--primary) / 4%);
  border-bottom: 1px solid hsl(var(--border));
}

.tpl-mail__tokens-label {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.tpl-mail__tokens-label :deep(svg) {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
}

.tpl-mail__tokens-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.tpl-mail__token {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  color: hsl(var(--foreground));
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;
}

.tpl-mail__token:hover {
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary) / 40%);
}

.tpl-mail__token:active {
  transform: translateY(1px);
}

.tpl-mail__editor {
  min-height: 240px;
  padding: 4px 8px 12px;
  border-radius: 0 0 10px 10px;
  transition: background 0.15s ease;
}

.tpl-mail__editor.is-target {
  background: hsl(var(--primary) / 4%);
}

.tpl-mail__editor :deep(.rich-text-editor) {
  background: transparent;
  border-color: transparent;
  border-radius: 8px;
}

.tpl-mail__editor :deep(.rich-text-editor:focus-within) {
  border-color: hsl(var(--primary) / 35%);
}
</style>
