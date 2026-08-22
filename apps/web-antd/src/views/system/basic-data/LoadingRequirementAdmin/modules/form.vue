<script lang="ts" setup>
import type { LoadingRequirementAdminApi } from '#/api/system/base-data/loading-requirement-admin';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, Input, message, Table } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addLoadingRequirement,
  editLoadingRequirement,
  getLoadingRequirementDetail,
} from '#/api/system/base-data/loading-requirement-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<LoadingRequirementAdminApi.LoadingRequirementDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [
        $t('system.basicData.loadingRequirement.name'),
      ])
    : $t('ui.actionTitle.create', [
        $t('system.basicData.loadingRequirement.name'),
      ]);
});

type ItemRow = {
  /** 表格行 key（本地） */
  _key: string;
  /** 后端明细 id；编辑保留，新增为 null */
  id?: null | string;
  name: string;
  remark?: null | string;
};

const itemsData = ref<ItemRow[]>([]);
let rowKeySeed = 0;

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const createEmptyRow = (): ItemRow => ({
  _key: `row_${++rowKeySeed}_${Date.now()}`,
  id: null,
  name: '',
  remark: '',
});

const mapDetailToRows = (
  items?: LoadingRequirementAdminApi.LoadingRequirementItemDto[] | null,
): ItemRow[] =>
  (items ?? []).map((item, index) => ({
    _key: `row_${item.id || `${++rowKeySeed}_${index}`}`,
    id: item.id ?? null,
    name: item.name ?? '',
    remark: item.remark ?? '',
  }));

const addItemRow = () => {
  itemsData.value = [...itemsData.value, createEmptyRow()];
};

const removeItemRow = (key: string) => {
  itemsData.value = itemsData.value.filter((row) => row._key !== key);
};

const patchItemRow = (
  key: string,
  field: keyof Pick<ItemRow, 'name' | 'remark'>,
  value: unknown,
) => {
  itemsData.value = itemsData.value.map((row) =>
    row._key === key ? { ...row, [field]: value } : row,
  );
};

/** 同一条要求下明细名称去空格、大小写不敏感唯一 */
const findDuplicateName = (rows: ItemRow[]) => {
  const seen = new Set<string>();
  for (const row of rows) {
    const normalized = String(row.name ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) {
      return String(row.name ?? '').trim();
    }
    seen.add(normalized);
  }
  return null;
};

/** 校验并按行顺序生成提交数组；sortId 由后端生成，不传 */
const collectItems = ():
  | LoadingRequirementAdminApi.LoadingRequirementItemEditDto[]
  | null => {
  for (const [index, row] of itemsData.value.entries()) {
    const name = String(row.name ?? '').trim();
    if (!name) {
      message.error(
        $t('system.basicData.loadingRequirement.itemNameRequired', [index + 1]),
      );
      return null;
    }
    if (name.length > 128) {
      message.error(
        $t('system.basicData.loadingRequirement.itemNameMaxLength', [
          index + 1,
        ]),
      );
      return null;
    }
  }

  const duplicated = findDuplicateName(itemsData.value);
  if (duplicated) {
    message.error(
      $t('system.basicData.loadingRequirement.itemNameDuplicated', [
        duplicated,
      ]),
    );
    return null;
  }

  return itemsData.value.map((row) => ({
    id: row.id ?? null,
    name: String(row.name).trim(),
    remark: row.remark ? String(row.remark) : null,
  }));
};

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[820px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    const loadingRequirementItems = collectItems();
    if (!loadingRequirementItems) return;

    drawerApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        await editLoadingRequirement({
          id: formData.value.id,
          name: values.name,
          sortId: values.sortId,
          remark: values.remark,
          loadingRequirementItems,
        });
      } else {
        await addLoadingRequirement({
          name: values.name,
          sortId: values.sortId,
          remark: values.remark,
          loadingRequirementItems: loadingRequirementItems.map(
            ({ id: _id, ...rest }) => rest,
          ),
        });
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      drawerApi.close();
      emit('success');
    } finally {
      drawerApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    const data = drawerApi.getData<{ id?: number | string }>();
    if (data?.id) {
      drawerApi.lock();
      try {
        const detail = await getLoadingRequirementDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          name: detail.name,
          sortId: detail.sortId,
          remark: detail.remark,
        });
        itemsData.value = mapDetailToRows(detail.loadingRequirementItems);
      } finally {
        drawerApi.lock(false);
      }
    } else {
      formData.value = undefined;
      formApi.resetForm();
      itemsData.value = [];
    }
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="mx-4" />

    <div class="mx-4 mt-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">
          {{ $t('system.basicData.loadingRequirement.items') }}
        </span>
        <Button type="dashed" size="small" @click="addItemRow">
          <IconifyIcon icon="mdi:plus" class="mr-1 size-4" />
          {{ $t('system.basicData.loadingRequirement.addItem') }}
        </Button>
      </div>
      <Table
        :data-source="itemsData"
        :pagination="false"
        size="small"
        row-key="_key"
        bordered
      >
        <Table.Column
          :title="$t('system.basicData.loadingRequirement.itemName')"
          key="name"
          :min-width="220"
        >
          <template #default="{ record }">
            <Input
              :value="record.name"
              :maxlength="128"
              :placeholder="$t('ui.placeholder.input')"
              allow-clear
              @update:value="(v) => patchItemRow(record._key, 'name', v)"
            />
          </template>
        </Table.Column>
        <Table.Column
          :title="$t('system.basicData.loadingRequirement.remark')"
          key="remark"
          :min-width="200"
        >
          <template #default="{ record }">
            <Input
              :value="record.remark"
              :maxlength="1024"
              :placeholder="$t('ui.placeholder.input')"
              allow-clear
              @update:value="(v) => patchItemRow(record._key, 'remark', v)"
            />
          </template>
        </Table.Column>
        <Table.Column
          :title="$t('system.basicData.operation')"
          key="action"
          width="72"
          align="center"
        >
          <template #default="{ record }">
            <Button
              type="link"
              danger
              size="small"
              @click="removeItemRow(record._key)"
            >
              {{ $t('common.delete') }}
            </Button>
          </template>
        </Table.Column>
      </Table>
      <div class="mt-1 text-xs text-gray-400">
        {{ $t('system.basicData.loadingRequirement.itemTableTip') }}
      </div>
    </div>
  </Drawer>
</template>
