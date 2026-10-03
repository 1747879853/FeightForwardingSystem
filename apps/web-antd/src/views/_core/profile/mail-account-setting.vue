<script setup lang="ts">
import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { computed, onMounted, reactive, shallowRef } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Spin,
  Switch,
} from 'ant-design-vue';

import {
  addMyPersonalMailAccount,
  deleteMyPersonalMailAccount,
  editMyPersonalMailAccount,
  getMyPersonalMailAccountList,
  testMyPersonalMailAccount,
} from '#/api/personal-mail/personal-mail-admin';
import { isEmailAddress } from '#/views/personal-mail/mail-format';
import {
  MAIL_PROVIDER_PRESETS,
  matchMailProviderPreset,
} from '#/views/personal-mail/provider-presets';

const loading = shallowRef(false);
const watchState =
  shallowRef<null | PersonalMailAdminApi.PersonalMailWatchState>(null);
const saving = shallowRef(false);
const testing = shallowRef(false);
const accountId = shallowRef<null | string>(null);
const hasStoredPassword = shallowRef(false);
const changingPassword = shallowRef(false);
const provider = shallowRef('custom');
const testedFingerprint = shallowRef('');
const testPassed = shallowRef(false);
const testResult =
  shallowRef<null | PersonalMailAdminApi.MailConnectionTestResult>(null);

const form = reactive({
  displayName: '',
  emailAddress: '',
  imapEnableSsl: true,
  imapHost: '',
  imapPort: 993,
  password: '',
  smtpEnableSsl: true,
  smtpHost: '',
  smtpPort: 465,
  userName: '',
});

const isEdit = computed(() => Boolean(accountId.value));
const showPasswordInput = computed(
  () => !hasStoredPassword.value || changingPassword.value,
);
const watchPaused = computed(() => watchState.value?.isPaused === true);
const watchFailureReason = computed(() => {
  const failures = watchState.value?.consecutiveFailures ?? 0;
  if (failures <= 0) return '';
  return watchState.value?.lastFailureReason?.trim() || '';
});
const providerOptions = MAIL_PROVIDER_PRESETS.map((item) => ({
  label: item.label,
  value: item.value,
}));

function applyAccount(account?: PersonalMailAdminApi.PersonalMailAccountDto) {
  accountId.value = account?.id || null;
  hasStoredPassword.value =
    Boolean(account?.id) && account?.hasPassword !== false;
  changingPassword.value = false;
  watchState.value = account?.watchState ?? null;
  form.emailAddress = account?.emailAddress?.trim() || '';
  form.displayName = account?.displayName?.trim() || '';
  form.userName = account?.userName?.trim() || '';
  form.password = '';
  form.imapHost = account?.imapHost?.trim() || '';
  form.imapPort = account?.imapPort || 993;
  form.imapEnableSsl = account?.imapEnableSsl ?? true;
  form.smtpHost = account?.smtpHost?.trim() || '';
  form.smtpPort = account?.smtpPort || 465;
  form.smtpEnableSsl = account?.smtpEnableSsl ?? true;
  provider.value = account ? matchMailProviderPreset(account) : 'custom';
  testedFingerprint.value = '';
  testPassed.value = false;
  testResult.value = null;
}

function applyPreset(value: string) {
  provider.value = value;
  const preset = MAIL_PROVIDER_PRESETS.find((item) => item.value === value);
  if (!preset || preset.value === 'custom') return;
  form.imapHost = preset.imapHost;
  form.imapPort = preset.imapPort;
  form.imapEnableSsl = preset.imapEnableSsl;
  form.smtpHost = preset.smtpHost;
  form.smtpPort = preset.smtpPort;
  form.smtpEnableSsl = preset.smtpEnableSsl;
}

function connectionFingerprint() {
  return JSON.stringify({
    emailAddress: form.emailAddress.trim(),
    imapEnableSsl: form.imapEnableSsl,
    imapHost: form.imapHost.trim(),
    imapPort: form.imapPort,
    password: form.password,
    smtpEnableSsl: form.smtpEnableSsl,
    smtpHost: form.smtpHost.trim(),
    smtpPort: form.smtpPort,
    userName: form.userName.trim(),
  });
}

function validateForm() {
  const emailAddress = form.emailAddress.trim();
  if (!emailAddress) return '请输入邮箱地址';
  if (emailAddress.length > 128) return '邮箱地址长度不能超过128';
  if (!isEmailAddress(emailAddress)) return '邮箱地址格式不正确';
  if (form.displayName.trim().length > 64)
    return '发件人显示名称长度不能超过64';
  if (form.userName.trim().length > 128) return '登录用户名长度不能超过128';
  if (!isEdit.value && !form.password.trim())
    return '请输入邮箱密码或客户端授权码';
  if (form.password.trim().length > 128) return '邮箱密码长度不能超过128';
  if (!form.imapHost.trim()) return '请输入收信服务器地址';
  if (!form.smtpHost.trim()) return '请输入发信服务器地址';
  if (form.imapPort < 1 || form.imapPort > 65535) {
    return '收信服务器端口必须在 1 到 65535 之间';
  }
  if (form.smtpPort < 1 || form.smtpPort > 65535) {
    return '发信服务器端口必须在 1 到 65535 之间';
  }
  return '';
}

function buildPayload() {
  const password = form.password.trim();
  return {
    displayName: form.displayName.trim() || null,
    emailAddress: form.emailAddress.trim(),
    imapEnableSsl: form.imapEnableSsl,
    imapHost: form.imapHost.trim(),
    imapPort: form.imapPort,
    password: password || null,
    smtpEnableSsl: form.smtpEnableSsl,
    smtpHost: form.smtpHost.trim(),
    smtpPort: form.smtpPort,
    userName: form.userName.trim() || null,
  };
}

function askConfirm(content: string) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    Modal.confirm({
      title: '连接测试未通过',
      content,
      okText: '仍要保存',
      cancelText: '取消',
      onOk: () => finish(true),
      onCancel: () => finish(false),
    });
  });
}

async function loadAccount() {
  loading.value = true;
  try {
    const list = await getMyPersonalMailAccountList();
    applyAccount(list[0]);
  } finally {
    loading.value = false;
  }
}

async function handleTest() {
  const errorText = validateForm();
  if (errorText) {
    message.warning(errorText);
    return;
  }
  testing.value = true;
  try {
    const result = await testMyPersonalMailAccount({
      ...buildPayload(),
      id: accountId.value,
    });
    testResult.value = result;
    testedFingerprint.value = connectionFingerprint();
    testPassed.value = Boolean(result.imapSuccess && result.smtpSuccess);
  } finally {
    testing.value = false;
  }
}

async function handleSave() {
  const errorText = validateForm();
  if (errorText) {
    message.warning(errorText);
    return;
  }
  const tested =
    testedFingerprint.value === connectionFingerprint() && testPassed.value;
  if (!tested) {
    const confirmed = await askConfirm(
      '当前配置还没有测试通过。邮箱服务器临时连不上时也可以先保存。',
    );
    if (!confirmed) return;
  }
  saving.value = true;
  try {
    const payload = buildPayload();
    if (accountId.value) {
      await editMyPersonalMailAccount({ ...payload, id: accountId.value });
      message.success('邮箱配置已更新');
    } else {
      await addMyPersonalMailAccount({
        ...payload,
        password: form.password.trim(),
      });
      message.success('邮箱配置已保存');
    }
    await loadAccount();
  } finally {
    saving.value = false;
  }
}

function startChangePassword() {
  changingPassword.value = true;
  form.password = '';
}

function cancelChangePassword() {
  changingPassword.value = false;
  form.password = '';
}

function handleDelete() {
  const id = accountId.value;
  if (!id) return;
  Modal.confirm({
    title: '删除邮箱配置',
    content: '只删除系统里的这条配置，邮箱服务器上的邮件不会受影响。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await deleteMyPersonalMailAccount(id);
      message.success('邮箱配置已删除');
      applyAccount();
    },
  });
}

onMounted(() => {
  loadAccount();
});
</script>

<template>
  <Spin :spinning="loading">
    <div class="mail-account">
      <div class="mail-account__head">
        <h3 class="mail-account__title">
          {{ isEdit ? '编辑邮箱' : '新增邮箱' }}
        </h3>
        <p class="mail-account__desc">
          每人只能配置一个邮箱。163、QQ、腾讯企业邮等请填写客户端授权码，不是网页登录密码。
        </p>
      </div>

      <Alert
        v-if="watchPaused"
        class="mail-account__watch"
        type="error"
        show-icon
        message="邮箱授权码不正确，新邮件提醒已暂停，请重新填写授权码"
        :description="watchFailureReason || undefined"
      />
      <Alert
        v-else-if="watchFailureReason"
        class="mail-account__watch"
        type="warning"
        show-icon
        :message="watchFailureReason"
      />

      <Form layout="vertical" class="mail-account__form">
        <FormItem label="邮箱服务商">
          <Select
            :value="provider"
            :options="providerOptions"
            @change="applyPreset(String($event ?? 'custom'))"
          />
        </FormItem>
        <div class="mail-account__grid">
          <FormItem label="邮箱地址" required>
            <Input
              v-model:value="form.emailAddress"
              :maxlength="128"
              placeholder="name@company.com"
            />
          </FormItem>
          <FormItem label="发件人显示名称">
            <Input
              v-model:value="form.displayName"
              :maxlength="64"
              placeholder="不填时收件人看到邮箱地址"
            />
          </FormItem>
          <FormItem label="登录用户名">
            <Input
              v-model:value="form.userName"
              :maxlength="128"
              placeholder="大多数邮箱不用填，留空则用邮箱地址登录"
            />
          </FormItem>
          <FormItem
            :label="changingPassword ? '新授权码' : '授权码'"
            :required="!isEdit"
          >
            <div class="mail-account__secret">
              <span
                v-if="!showPasswordInput"
                class="mail-account__secret-state"
              >
                授权码已填写
              </span>
              <Input.Password
                v-else
                v-model:value="form.password"
                :maxlength="128"
                class="mail-account__secret-input"
                :placeholder="
                  changingPassword ? '请输入新的授权码' : '请输入客户端授权码'
                "
              />
              <Button v-if="!showPasswordInput" @click="startChangePassword">
                修改授权码
              </Button>
              <Button
                v-else-if="changingPassword"
                @click="cancelChangePassword"
              >
                取消
              </Button>
              <Button :loading="testing" @click="handleTest">测试连接</Button>
            </div>
          </FormItem>
          <FormItem label="收信服务器" required>
            <Input
              v-model:value="form.imapHost"
              :maxlength="128"
              placeholder="imap.exmail.qq.com"
            />
          </FormItem>
          <FormItem label="收信端口" required>
            <InputNumber
              v-model:value="form.imapPort"
              :min="1"
              :max="65535"
              class="mail-account__port"
            />
          </FormItem>
          <FormItem label="收信 SSL">
            <Switch v-model:checked="form.imapEnableSsl" />
          </FormItem>
          <FormItem label="发信服务器" required>
            <Input
              v-model:value="form.smtpHost"
              :maxlength="128"
              placeholder="smtp.exmail.qq.com"
            />
          </FormItem>
          <FormItem label="发信端口" required>
            <InputNumber
              v-model:value="form.smtpPort"
              :min="1"
              :max="65535"
              class="mail-account__port"
            />
          </FormItem>
          <FormItem label="发信 SSL">
            <Switch v-model:checked="form.smtpEnableSsl" />
          </FormItem>
        </div>
      </Form>

      <div v-if="testResult" class="mail-account__test">
        <p :class="testResult.imapSuccess ? 'is-ok' : 'is-fail'">
          <IconifyIcon
            :icon="
              testResult.imapSuccess ? 'lucide:circle-check' : 'lucide:circle-x'
            "
          />
          <span
            >收信：{{
              testResult.imapMessage ||
              (testResult.imapSuccess ? '连接成功' : '连接失败')
            }}</span
          >
        </p>
        <p :class="testResult.smtpSuccess ? 'is-ok' : 'is-fail'">
          <IconifyIcon
            :icon="
              testResult.smtpSuccess ? 'lucide:circle-check' : 'lucide:circle-x'
            "
          />
          <span
            >发信：{{
              testResult.smtpMessage ||
              (testResult.smtpSuccess ? '连接成功' : '连接失败')
            }}</span
          >
        </p>
      </div>

      <div class="mail-account__actions">
        <Button type="primary" :loading="saving" @click="handleSave"
          >保存</Button
        >
        <Button v-if="isEdit" danger @click="handleDelete">删除</Button>
      </div>
    </div>
  </Spin>
</template>

<style scoped>
.mail-account {
  max-width: 880px;
}

.mail-account__head {
  margin-bottom: 16px;
}

.mail-account__title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
}

.mail-account__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--muted-foreground));
}

.mail-account__watch {
  margin-bottom: 16px;
}

.mail-account__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.mail-account__port {
  width: 100%;
}

.mail-account__secret {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mail-account__secret-state {
  flex: none;
  font-size: 13px;
  line-height: 32px;
  color: hsl(var(--foreground));
}

.mail-account__secret-input {
  flex: 1;
  min-width: 0;
}

.mail-account__test {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.mail-account__test p {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 0;
  line-height: 1.5;
}

.mail-account__test .is-ok {
  color: #389e0d;
}

.mail-account__test .is-fail {
  color: #cf1322;
}

.mail-account__actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 720px) {
  .mail-account__grid {
    grid-template-columns: 1fr;
  }
}
</style>
