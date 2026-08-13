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
import { toUserSelectedItems } from './detail-selected-items';

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

/** 用户详情缓存，仅用于头像与首字符展示；详情已带 user 的行不再请求 */
const userDetailMap = ref<
  Record<number, PreOrderAdminApi.UserSimpleDto | SystemUserAdminApi.UserDto>
>({});
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
  dataSource,
  (rows) => {
    // 业务联系单详情已返回 user（含昵称与头像），只有本地新选的人才需要补详情
    const fromDetail: Record<number, PreOrderAdminApi.UserSimpleDto> = {};
    for (const row of rows) {
      const id = Number(row.userId);
      if (!id || !row.user || userDetailMap.value[id]) continue;
      fromDetail[id] = row.user;
    }
    if (Object.keys(fromDetail).length > 0) {
      userDetailMap.value = { ...userDetailMap.value, ...fromDetail };
    }
    for (const row of rows) loadUserDetail(row.userId as number | undefined);
  },
  { deep: true, immediate: true },
);

/** 按行缓存回显项，避免每次渲染都新建数组触发 UserSelect 重新合并 */
const userSelectedItemsMap = computed(() => {
  const map: Record<string, any[]> = {};
  for (const row of dataSource.value) {
    map[row.rowKey] = toUserSelectedItems(row);
  }
  return map;
});

function userDetailOf(row: PreOrderUserRow) {
  if (!row.userId) return null;
  return row.user ?? userDetailMap.value[Number(row.userId)] ?? null;
}

function avatarSrc(row: PreOrderUserRow) {
  const avatar = userDetailOf(row)?.avatar?.trim();
  return avatar ? buildAttachmentUrl(avatar) : preferences.app.defaultAvatar;
}

function avatarText(row: PreOrderUserRow) {
  const detail = userDetailOf(row);
  const name = (
    detail?.nickName ||
    (detail as SystemUserAdminApi.UserDto)?.userName ||
    row.userNickName ||
    ''
  ).trim();
  return name ? name.slice(0, 1) : '?';
}

/** 换人后详情带来的 user 快照即失效，清掉后由 loadUserDetail 拉新头像 */
function handleUserChange(row: PreOrderUserRow, userId: unknown) {
  row.userId = userId == null || userId === '' ? undefined : Number(userId);
  row.user = undefined;
  loadUserDetail(row.userId);
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
          :model-value="row.userId"
          :selected-items="userSelectedItemsMap[row.rowKey] ?? []"
          :disabled="props.readonly"
          size="small"
          class="order-user-panel__select"
          @update:model-value="(value: unknown) => handleUserChange(row, value)"
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
