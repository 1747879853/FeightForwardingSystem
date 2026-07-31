<script lang="ts" setup>
import type { PreOrderUserRow } from './user-defaults';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { preferences } from '@vben/preferences';

import {
  Avatar,
  Button,
  message,
  Modal,
  Radio,
  RadioGroup,
} from 'ant-design-vue';

import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { SystemUserAdminApi } from '#/api/system/user-admin';
import type { OrderUserRoleOption } from '#/composables/use-order-user-roles';

import UserSelect from '#/adapter/component/biz-select/user-select.vue';
import { getUser } from '#/api/system/user-admin';
import { getUserAttributeLabel } from '#/composables/use-order-user-roles';
import { buildAttachmentUrl } from '#/utils';

import { USER_ATTRIBUTE } from '../form-data';

/** 必选且不可删除：仅销售（操作改为非必填，审核通过时再强制指派） */
const REQUIRED_ROLES: number[] = [USER_ATTRIBUTE.Sale];

let rowSeed = 0;
const createRowKey = () => `user-${Date.now()}-${(rowSeed += 1)}`;

const props = withDefaults(
  defineProps<{ readonly?: boolean; roles?: OrderUserRoleOption[] }>(),
  {
    readonly: false,
    roles: () => [],
  },
);

const modelValue = defineModel<PreOrderUserRow[]>({ default: () => [] });

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
});

const roleModalOpen = ref(false);
const roleModalSelected = ref<number | undefined>();

/** 用户详情缓存，仅用于头像与首字符展示 */
const userDetailMap = ref<Record<number, SystemUserAdminApi.UserDto>>({});
const loadingUserIds = new Set<number>();

function loadUserDetail(userId?: number) {
  const id = Number(userId);
  if (!id || userDetailMap.value[id] || loadingUserIds.has(id)) return;
  loadingUserIds.add(id);
  getUser(id, { silent: true })
    .then((detail) => {
      userDetailMap.value = { ...userDetailMap.value, [id]: detail };
    })
    .catch(() => {})
    .finally(() => {
      loadingUserIds.delete(id);
    });
}

watch(
  () => dataSource.value.map((row) => row.userId),
  (ids) => {
    for (const id of ids) loadUserDetail(id as number | undefined);
  },
  { immediate: true },
);

function avatarSrc(row: PreOrderUserRow) {
  const detail = row.userId ? userDetailMap.value[Number(row.userId)] : null;
  const avatar = detail?.avatar?.trim();
  return avatar ? buildAttachmentUrl(avatar) : preferences.app.defaultAvatar;
}

function avatarText(row: PreOrderUserRow) {
  const detail = row.userId ? userDetailMap.value[Number(row.userId)] : null;
  const name = (detail?.nickName || detail?.userName || '').trim();
  return name ? name.slice(0, 1) : '?';
}

function roleLabel(value?: number) {
  return (
    props.roles.find((item) => item.value === value)?.label ??
    getUserAttributeLabel(value)
  );
}

function isRequired(row: PreOrderUserRow) {
  return REQUIRED_ROLES.includes(Number(row.userAttribute));
}

const selectedRoleSet = computed(
  () => new Set(dataSource.value.map((item) => Number(item.userAttribute))),
);

const availableRoleOptions = computed(() =>
  props.roles.filter((item) => !selectedRoleSet.value.has(item.value)),
);

function openRoleModal() {
  if (!availableRoleOptions.value.length) {
    message.warning('所有角色已添加，不可重复添加');
    return;
  }
  roleModalSelected.value = availableRoleOptions.value[0]?.value;
  roleModalOpen.value = true;
}

function handleRoleModalConfirm() {
  const userAttribute = roleModalSelected.value;
  if (userAttribute == null) return;
  if (selectedRoleSet.value.has(userAttribute)) {
    message.warning('该角色已存在');
    return;
  }
  dataSource.value = [
    ...dataSource.value,
    {
      rowKey: createRowKey(),
      sortId: 0,
      userAttribute: userAttribute as PreOrderAdminApi.UserAttribute,
    } as PreOrderUserRow,
  ];
  roleModalOpen.value = false;
}

function handleRemove(rowKey: string) {
  const row = dataSource.value.find((item) => item.rowKey === rowKey);
  if (row && isRequired(row)) {
    message.warning('销售角色不可删除');
    return;
  }
  dataSource.value = dataSource.value.filter((item) => item.rowKey !== rowKey);
}
</script>

<template>
  <div class="order-user-panel">
    <div
      v-for="row in dataSource"
      :key="row.rowKey"
      class="order-user-panel__row"
    >
      <div class="order-user-panel__body">
        <div class="order-user-panel__header">
          <div class="order-user-panel__role-label">
            <span
              v-if="isRequired(row)"
              class="order-user-panel__role-required"
            >
              *
            </span>
            {{ roleLabel(row.userAttribute) }}
          </div>
          <Avatar
            :size="28"
            :src="avatarSrc(row)"
            class="order-user-panel__avatar"
          >
            {{ avatarText(row) }}
          </Avatar>
        </div>
        <UserSelect
          v-model="row.userId"
          :disabled="props.readonly"
          size="small"
          class="order-user-panel__select"
        />
      </div>
      <Button
        v-if="!props.readonly && !isRequired(row)"
        type="text"
        danger
        size="small"
        class="order-user-panel__delete-btn"
        title="删除角色"
        @click.stop="handleRemove(row.rowKey)"
      >
        <IconifyIcon icon="mdi:close-circle" />
      </Button>
    </div>
    <Button
      v-if="!props.readonly"
      class="order-user-panel__add-btn"
      :disabled="!availableRoleOptions.length"
      @click="openRoleModal"
    >
      + 添加角色
    </Button>

    <Modal
      v-model:open="roleModalOpen"
      title="添加角色"
      ok-text="确定"
      cancel-text="取消"
      width="400px"
      destroy-on-close
      :ok-button-props="{ disabled: roleModalSelected == null }"
      @ok="handleRoleModalConfirm"
    >
      <RadioGroup
        v-model:value="roleModalSelected"
        class="order-user-role-modal__group"
      >
        <Radio
          v-for="option in availableRoleOptions"
          :key="option.value"
          :value="option.value"
          class="order-user-role-modal__item"
        >
          {{ option.label }}
        </Radio>
      </RadioGroup>
    </Modal>
  </div>
</template>

<style scoped src="../../sea-export-admin/basic-info-form/form.css"></style>
