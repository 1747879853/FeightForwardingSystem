<script lang="ts" setup>
import type { SystemRoleApi } from '#/api/system/role';

import { onMounted, ref } from 'vue';

import { Button, Form, FormItem, message, Spin } from 'ant-design-vue';

import { RoleSelect } from '#/adapter/component';
import { getRoleList } from '#/api/system/role';
import { getUserRolesName, setUserRoles } from '#/api/system/user-admin';
import { $t } from '#/locales';

defineOptions({ name: 'UserRoleAssignPanel' });

const props = defineProps<{ userId: number }>();

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

  const matchedRoles = await Promise.all(
    roleNames.map(async (name) => {
      const { items } = await getRoleList({ KeyWords: name, pageSize: 20 });
      return items.find((role) => role.name === name);
    }),
  );

  return matchedRoles.filter(
    (role): role is SystemRoleApi.RoleListDto => role !== undefined,
  );
}

async function loadRoles() {
  // 重置状态
  selectedRoleNames.value = [];
  selectedRoleItems.value = [];

  loading.value = true;
  try {
    // 获取用户当前的角色名称列表
    const roleNames = await getUserRolesName(props.userId);
    selectedRoleNames.value = roleNames;
    // 获取角色对象用于回显
    selectedRoleItems.value = await fetchRoleItemsByNames(roleNames);
  } catch (error) {
    console.error('Failed to fetch user roles:', error);
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  submitting.value = true;
  try {
    await setUserRoles({
      userId: props.userId,
      roleNames: selectedRoleNames.value,
    });
    message.success($t('system.user.setRolesSuccess'));
  } catch {
    // 错误已由请求拦截器统一处理
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  if (props.userId != null) {
    void loadRoles();
  }
});
</script>

<template>
  <div class="p-4">
    <Spin :spinning="loading">
      <Form layout="vertical" class="max-w-xl">
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

    <div class="mt-3">
      <Button
        type="primary"
        :loading="submitting"
        :disabled="loading"
        @click="handleSubmit"
      >
        {{ $t('common.save') }}
      </Button>
    </div>
  </div>
</template>
