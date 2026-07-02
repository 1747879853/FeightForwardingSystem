<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';
import type { SystemPermissionApi } from '#/api/system/permission';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Table } from 'ant-design-vue';

import { OrganizationSelect, UserSelect } from '#/adapter/component';
import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOrganizationUnits } from '#/api/system/organization-unit';
import {
  addDataPermission,
  DataPermissionType,
  deleteDataPermission,
  editDataPermission,
  getDataPermissionDetail,
  getDataPermissionList,
} from '#/api/system/permission';
import { getUser } from '#/api/system/user-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import {
  formatDataPermissionType,
  needsDataPermissionItems,
  useDataPermissionColumns,
  useDataPermissionFormSchema,
  useDataPermissionItemColumns,
} from '../data';

// ==================== Props ====================

const props = defineProps<{
  roleId?: number;
  targetType: 'role' | 'user';
  userId?: number;
}>();

type DataPermissionItemRow = SystemPermissionApi.UserDataPermissionItemDto & {
  entityName?: string;
};

// ==================== 响应式状态 ====================

const editingId = ref<number>();
const originalDataPermissionType = ref<DataPermissionType>();
const entityIds = ref<number[]>([]);
const selectedUsers = ref<SystemUserAdminApi.UserListDto[]>([]);
const selectedOrgs = ref<SystemOrganizationUnitApi.OrganizationUnitDto[]>([]);
const currentFormType = ref<DataPermissionType>();

const itemRows = ref<DataPermissionItemRow[]>([]);
const loadingItems = ref(false);
const currentPermissionRow = ref<SystemPermissionApi.UserDataPermissionDto>();

// ==================== 计算属性 ====================

const currentTargetParams = computed(() => {
  return props.targetType === 'role'
    ? { roleId: props.roleId }
    : { userId: props.userId };
});

const showUserEntitySelect = computed(
  () => currentFormType.value === DataPermissionType.ManyUser,
);

const showOrgEntitySelect = computed(
  () => currentFormType.value === DataPermissionType.ManyPart,
);

const entitySelectLabel = computed(() => {
  if (showUserEntitySelect.value) {
    return $t('system.permission.dataPermissionSelectUsers');
  }
  if (showOrgEntitySelect.value) {
    return $t('system.permission.dataPermissionSelectOrgs');
  }
  return '';
});

// ==================== 表格配置 ====================

function handleActionClick(
  e: OnActionClickParams<SystemPermissionApi.UserDataPermissionDto>,
) {
  switch (e.code) {
    case 'delete': {
      handleDelete(e.row);
      break;
    }
    case 'edit': {
      handleEdit(e.row);
      break;
    }
    case 'viewItems': {
      handleViewItems(e.row);
      break;
    }
  }
}

const fetchDataPermissionList = (params: Record<string, any>) => {
  if (!props.roleId && !props.userId) {
    return Promise.resolve({ items: [], total: 0 });
  }
  return getDataPermissionList({
    ...params,
    ...currentTargetParams.value,
  });
};

const [Grid, gridApi] =
  useVbenVxeGrid<SystemPermissionApi.UserDataPermissionDto>({
    gridOptions: {
      columns: useDataPermissionColumns(handleActionClick, (row) =>
        handleViewItems(row as SystemPermissionApi.UserDataPermissionDto),
      ),
      height: 'auto',
      keepSource: true,
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(fetchDataPermissionList),
        },
      },
      rowConfig: {
        keyField: 'id',
      },
      toolbarConfig: {
        custom: true,
        export: false,
        refresh: true,
        search: false,
        zoom: false,
      },
    },
  });

// ==================== 表单配置 ====================

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useDataPermissionFormSchema(),
  showDefaultActions: false,
  handleValuesChange: (values) => {
    currentFormType.value = values.dataPermissionType;
  },
});

// ==================== Modal 配置 ====================

const [FormModal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = (await formApi.getValues()) as Recordable<any>;
    const dataPermissionType = values.dataPermissionType as DataPermissionType;
    const needsItems = needsDataPermissionItems(dataPermissionType);

    if (needsItems && entityIds.value.length === 0) {
      message.warning($t('system.permission.dataPermissionItemsRequired'));
      return;
    }

    if (
      editingId.value &&
      originalDataPermissionType.value !== undefined &&
      needsDataPermissionItems(originalDataPermissionType.value) &&
      !needsItems
    ) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: $t('common.confirm'),
          content: $t('system.permission.dataPermissionTypeChangeConfirm'),
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return;
    }

    const submitData: SystemPermissionApi.UserDataPermissionAddDto = {
      ...currentTargetParams.value,
      manageType: values.manageType,
      dataPermissionType,
      entityIds: needsItems ? entityIds.value : [],
    };

    modalApi.lock();
    try {
      if (editingId.value) {
        await editDataPermission({
          id: editingId.value,
          ...submitData,
        });
      } else {
        await addDataPermission(submitData);
      }

      message.success($t('system.permission.saveSuccess'));
      modalApi.close();
      gridApi.query();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      await nextTick();
      const data =
        modalApi.getData<SystemPermissionApi.UserDataPermissionDto>();
      formApi.resetForm();
      resetEntityState();

      if (data?.id) {
        editingId.value = data.id;
        const detail = await resolvePermissionDetail(data);
        originalDataPermissionType.value = detail.dataPermissionType;
        currentFormType.value = detail.dataPermissionType;
        formApi.setValues({
          manageType: detail.manageType,
          dataPermissionType: detail.dataPermissionType,
        });
        await applyPermissionItems(detail);
      } else {
        editingId.value = undefined;
        originalDataPermissionType.value = undefined;
        currentFormType.value = undefined;
      }
    }
  },
});

const modalTitle = computed(() => {
  return editingId.value
    ? $t('system.permission.editDataPermission')
    : $t('system.permission.addDataPermission');
});

// ==================== 子项查看抽屉 ====================

const [ItemsDrawer, itemsDrawerApi] = useVbenDrawer({
  onOpenChange(isOpen) {
    if (isOpen) {
      const data =
        itemsDrawerApi.getData<SystemPermissionApi.UserDataPermissionDto>();
      if (data?.id) {
        currentPermissionRow.value = data;
        loadItemRows(data);
      }
    }
  },
});

const itemsDrawerTitle = computed(() => {
  const typeLabel = currentPermissionRow.value
    ? formatDataPermissionType(currentPermissionRow.value.dataPermissionType)
    : '';
  return `${$t('system.permission.viewDataPermissionItems')}${typeLabel ? ` - ${typeLabel}` : ''}`;
});

const itemColumns = useDataPermissionItemColumns()
  .map((column) => {
    if (column.field !== 'operation') {
      return {
        dataIndex: column.field,
        title: column.title,
        width: column.width,
        minWidth: column.minWidth,
      };
    }
    return null;
  })
  .filter(Boolean);

// ==================== 数据加载与保存 ====================

function resetEntityState() {
  entityIds.value = [];
  selectedUsers.value = [];
  selectedOrgs.value = [];
}

async function resolvePermissionDetail(
  data: SystemPermissionApi.UserDataPermissionDto,
) {
  if (data.items) {
    return data;
  }
  return getDataPermissionDetail(data.id);
}

async function applyPermissionItems(
  data: SystemPermissionApi.UserDataPermissionDto,
) {
  if (!needsDataPermissionItems(data.dataPermissionType)) {
    return;
  }

  const items = data.items || [];
  entityIds.value = items.map((item) => item.entityId);

  if (data.dataPermissionType === DataPermissionType.ManyUser) {
    selectedUsers.value = await loadUsersByIds(entityIds.value);
  } else if (data.dataPermissionType === DataPermissionType.ManyPart) {
    selectedOrgs.value = await loadOrgsByIds(entityIds.value);
  }
}

async function loadUsersByIds(ids: number[]) {
  const users = await Promise.all(
    ids.map(async (id) => {
      try {
        const user = await getUser(id, { silent: true });
        return {
          id: user.id,
          nickName: user.nickName || user.userName,
          userName: user.userName,
        } as SystemUserAdminApi.UserListDto;
      } catch {
        return {
          id,
          nickName: String(id),
          userName: String(id),
        } as SystemUserAdminApi.UserListDto;
      }
    }),
  );
  return users;
}

async function loadOrgsByIds(ids: number[]) {
  const allOrgs = await getOrganizationUnits();
  const idSet = new Set(ids);
  return allOrgs.filter((org) => idSet.has(org.id));
}

async function loadItemRows(row: SystemPermissionApi.UserDataPermissionDto) {
  loadingItems.value = true;
  try {
    const detail = await resolvePermissionDetail(row);
    const items = detail.items || [];

    if (detail.dataPermissionType === DataPermissionType.ManyUser) {
      const users = await loadUsersByIds(items.map((item) => item.entityId));
      const userMap = new Map(users.map((user) => [user.id, user]));
      itemRows.value = items.map((item) => ({
        ...item,
        entityName:
          userMap.get(item.entityId)?.nickName ||
          userMap.get(item.entityId)?.userName ||
          String(item.entityId),
      }));
      return;
    }

    if (detail.dataPermissionType === DataPermissionType.ManyPart) {
      const orgs = await loadOrgsByIds(items.map((item) => item.entityId));
      const orgMap = new Map(
        orgs.map((org: SystemOrganizationUnitApi.OrganizationUnitDto) => [
          org.id,
          org,
        ]),
      );
      itemRows.value = items.map((item) => ({
        ...item,
        entityName:
          orgMap.get(item.entityId)?.displayName || String(item.entityId),
      }));
      return;
    }

    itemRows.value = items.map((item) => ({
      ...item,
      entityName: String(item.entityId),
    }));
  } finally {
    loadingItems.value = false;
  }
}

// ==================== 事件处理方法 ====================

function handleCreate() {
  modalApi.setData({}).open();
}

function handleEdit(row: SystemPermissionApi.UserDataPermissionDto) {
  modalApi.setData(row).open();
}

function handleViewItems(row: SystemPermissionApi.UserDataPermissionDto) {
  itemsDrawerApi.setData(row).open();
}

function handleDelete(row: SystemPermissionApi.UserDataPermissionDto) {
  Modal.confirm({
    title: $t('common.confirm'),
    content: $t('system.permission.confirmDelete'),
    onOk: async () => {
      await deleteDataPermission(row.id);
      message.success($t('system.permission.deleteSuccess'));
      gridApi.query();
    },
  });
}

// ==================== 监听Props变化 ====================

watch(
  () => [props.roleId, props.userId],
  () => {
    gridApi.query();
  },
  { immediate: true },
);

watch(currentFormType, (newType, oldType) => {
  if (oldType === undefined || newType === oldType) {
    return;
  }
  if (needsDataPermissionItems(newType) && needsDataPermissionItems(oldType)) {
    entityIds.value = [];
    selectedUsers.value = [];
    selectedOrgs.value = [];
  }
});
</script>

<template>
  <div class="h-full">
    <FormModal :title="modalTitle" class="w-[560px]">
      <Form class="mx-4" />
      <div v-if="showUserEntitySelect || showOrgEntitySelect" class="mx-4 mt-2">
        <div class="mb-2 text-sm font-medium">
          {{ entitySelectLabel }}
          <span class="text-destructive">*</span>
        </div>
        <UserSelect
          v-if="showUserEntitySelect"
          v-model="entityIds"
          mode="multiple"
          class="w-full"
          :selected-items="selectedUsers"
          :placeholder="
            $t('system.permission.dataPermissionSelectUsersPlaceholder')
          "
        />
        <OrganizationSelect
          v-else-if="showOrgEntitySelect"
          v-model="entityIds"
          mode="multiple"
          class="w-full"
          :selected-items="selectedOrgs"
          :placeholder="
            $t('system.permission.dataPermissionSelectOrgsPlaceholder')
          "
        />
      </div>
    </FormModal>

    <ItemsDrawer :title="itemsDrawerTitle" width="520">
      <Table
        :columns="itemColumns"
        :data-source="itemRows"
        :loading="loadingItems"
        :pagination="false"
        size="small"
        row-key="id"
      />
    </ItemsDrawer>

    <Grid>
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('system.permission.addDataPermission') }}
        </Button>
      </template>
    </Grid>
  </div>
</template>
