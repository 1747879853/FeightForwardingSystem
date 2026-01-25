<script lang="ts" setup>
import type { SystemRoleApi } from '#/api/system/role';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Form, FormItem, message, Spin } from 'ant-design-vue';

import { RoleSelect } from '#/adapter/component';
import { getRoleList } from '#/api/system/role';
import { getUserRolesName, setUserRoles } from '#/api/system/user-admin';
import { $t } from '#/locales';

const emits = defineEmits(['success']);

const userData = ref<SystemUserAdminApi.SystemUser>();
const selectedRoleNames = ref<string[]>([]);
const selectedRoleItems = ref<SystemRoleApi.RoleListDto[]>([]);
const loading = ref(false);
const submitting = ref(false);

/**
 * 根据角色名称获取角色对象列表（用于回显）
 */
async function fetchRoleItemsByNames(
  roleNames: string[],
): Promise<SystemRoleApi.RoleListDto[]> {
  if (roleNames.length === 0) return [];

  // 获取所有角色，用于匹配名称
  const { items: allRoles } = await getRoleList({ pageSize: 1000 });
  const matchedRoles: SystemRoleApi.RoleListDto[] = [];

  for (const name of roleNames) {
    const role = allRoles.find((r) => r.name === name);
    if (role) {
      matchedRoles.push(role);
    }
  }

  return matchedRoles;
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!userData.value?.id) return;

    submitting.value = true;
    modalApi.lock();

    try {
      await setUserRoles({
        userId: userData.value.id,
        roleNames: selectedRoleNames.value,
      });
      message.success($t('system.user.setRolesSuccess'));
      emits('success');
      modalApi.close();
    } catch {
      modalApi.unlock();
    } finally {
      submitting.value = false;
    }
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<SystemUserAdminApi.SystemUser>();
      userData.value = data;

      // 重置状态
      selectedRoleNames.value = [];
      selectedRoleItems.value = [];

      if (data?.id) {
        loading.value = true;
        try {
          // 获取用户当前的角色名称列表
          const roleNames = await getUserRolesName(data.id);
          selectedRoleNames.value = roleNames;
          // 获取角色对象用于回显
          selectedRoleItems.value = await fetchRoleItemsByNames(roleNames);
        } catch (error) {
          console.error('Failed to fetch user roles:', error);
        } finally {
          loading.value = false;
        }
      }
    }
  },
});

const modalTitle = computed(() => {
  const userName = userData.value?.nickName || userData.value?.userName || '';
  return $t('system.user.setRolesFor', { name: userName });
});
</script>

<template>
  <Modal :title="modalTitle">
    <Spin :spinning="loading">
      <Form layout="vertical">
        <FormItem :label="$t('system.user.roles')">
          <RoleSelect
            v-model="selectedRoleNames"
            mode="multiple"
            value-key="name"
            :placeholder="$t('system.user.selectRoles')"
            :selected-items="selectedRoleItems"
            style="width: 100%"
          />
        </FormItem>
        <div class="text-xs text-gray-400">
          {{ $t('system.user.setRolesHelp') }}
        </div>
      </Form>
    </Spin>
  </Modal>
</template>
