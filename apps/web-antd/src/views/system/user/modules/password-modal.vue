<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Form, FormItem, Input, Checkbox, message } from 'ant-design-vue';

import { changePassword } from '#/api/system/user-admin';
import { $t } from '#/locales';

const emits = defineEmits(['success']);

const userData = ref<SystemUserAdminApi.SystemUser>();
const newPassword = ref('');
const confirmPassword = ref('');
const unlock = ref(false);
const submitting = ref(false);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
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

    if (!userData.value?.id) return;

    submitting.value = true;
    modalApi.lock();

    try {
      await changePassword(
        {
          userId: userData.value.id,
          newPassword: newPassword.value,
        },
        unlock.value,
      );
      message.success($t('system.user.changePasswordSuccess'));
      emits('success');
      modalApi.close();
    } catch {
      modalApi.unlock();
    } finally {
      submitting.value = false;
    }
  },

  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<SystemUserAdminApi.SystemUser>();
      userData.value = data;
      // 重置表单
      newPassword.value = '';
      confirmPassword.value = '';
      unlock.value = false;
    }
  },
});

const modalTitle = computed(() => {
  const userName = userData.value?.nickName || userData.value?.userName || '';
  return $t('system.user.changePasswordFor', { name: userName });
});
</script>

<template>
  <Modal :title="modalTitle">
    <Form layout="vertical">
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
  </Modal>
</template>
