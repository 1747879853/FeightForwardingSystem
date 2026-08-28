<script lang="ts" setup>
import { ref } from 'vue';

import {
  Button,
  Checkbox,
  Form,
  FormItem,
  Input,
  message,
} from 'ant-design-vue';

import { changePassword } from '#/api/system/user-admin';
import { $t } from '#/locales';

defineOptions({ name: 'UserPasswordPanel' });

const props = defineProps<{ userId: number }>();

const newPassword = ref('');
const confirmPassword = ref('');
const unlock = ref(false);
const submitting = ref(false);

async function handleSubmit() {
  // 验证
  if (!newPassword.value) {
    message.error($t('system.user.newPasswordRequired'));
    return;
  }
  if (newPassword.value.length < 6) {
    message.error($t('system.user.passwordMinLength'));
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    message.error($t('system.user.passwordNotMatch'));
    return;
  }

  submitting.value = true;
  try {
    await changePassword(
      {
        id: props.userId,
        password: newPassword.value,
        confirmPassword: confirmPassword.value,
      },
      unlock.value,
    );
    message.success($t('system.user.changePasswordSuccess'));
    // 重置表单
    newPassword.value = '';
    confirmPassword.value = '';
    unlock.value = false;
  } catch {
    // 错误已由请求拦截器统一处理
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="p-4">
    <Form layout="vertical" class="max-w-xl">
      <FormItem :label="$t('system.user.newPassword')" required>
        <Input.Password
          v-model:value="newPassword"
          :placeholder="$t('system.user.enterNewPassword')"
          :maxlength="32"
          show-count
        />
      </FormItem>
      <FormItem :label="$t('system.user.confirmPassword')" required>
        <Input.Password
          v-model:value="confirmPassword"
          :placeholder="$t('system.user.enterConfirmPassword')"
          :maxlength="32"
          show-count
        />
      </FormItem>
      <FormItem>
        <Checkbox v-model:checked="unlock">
          {{ $t('system.user.unlockUser') }}
        </Checkbox>
        <div class="mt-1 text-xs text-gray-400">
          {{ $t('system.user.unlockUserHelp') }}
        </div>
      </FormItem>
    </Form>

    <div class="mt-3">
      <Button type="primary" :loading="submitting" @click="handleSubmit">
        {{ $t('common.save') }}
      </Button>
    </div>
  </div>
</template>
