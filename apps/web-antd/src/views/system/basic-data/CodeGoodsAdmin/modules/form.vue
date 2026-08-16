<script lang="ts" setup>
import type { CodeGoodsAdminApi } from '#/api/system/base-data/code-goods-admin';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, Input, InputNumber, message, Table } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCodeGoods,
  editCodeGoods,
  getCodeGoodsDetail,
} from '#/api/system/base-data/code-goods-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CodeGoodsAdminApi.CodeGoodsDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.codeGoods.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.codeGoods.name')]);
});

type SubRow = {
  /** 表格行 key（本地） */
  _key: string;
  /** 后端明细 id；编辑保留，新增为 null */
  id?: null | string;
  name: string;
  sortId?: null | number;
  remark?: null | string;
};

const specsData = ref<SubRow[]>([]);
const modelsData = ref<SubRow[]>([]);
let rowKeySeed = 0;

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const createEmptyRow = (): SubRow => ({
  _key: `row_${++rowKeySeed}_${Date.now()}`,
  id: null,
  name: '',
  sortId: undefined,
  remark: '',
});

const mapDetailToRows = (
  items?: CodeGoodsAdminApi.CodeGoodsSpecSimpleDto[] | null,
): SubRow[] =>
  (items ?? []).map((item, index) => ({
    _key: `row_${item.id || `${++rowKeySeed}_${index}`}`,
    id: item.id ?? null,
    name: item.name ?? '',
    sortId: item.sortId,
    remark: item.remark ?? '',
  }));

const addSpecRow = () => {
  specsData.value = [...specsData.value, createEmptyRow()];
};

const addModelRow = () => {
  modelsData.value = [...modelsData.value, createEmptyRow()];
};

const removeSpecRow = (key: string) => {
  specsData.value = specsData.value.filter((row) => row._key !== key);
};

const removeModelRow = (key: string) => {
  modelsData.value = modelsData.value.filter((row) => row._key !== key);
};

const patchSpecRow = (
  key: string,
  field: keyof Pick<SubRow, 'name' | 'remark' | 'sortId'>,
  value: unknown,
) => {
  specsData.value = specsData.value.map((row) =>
    row._key === key ? { ...row, [field]: value } : row,
  );
};

const patchModelRow = (
  key: string,
  field: keyof Pick<SubRow, 'name' | 'remark' | 'sortId'>,
  value: unknown,
) => {
  modelsData.value = modelsData.value.map((row) =>
    row._key === key ? { ...row, [field]: value } : row,
  );
};

/** 同品名下名称去空格、大小写不敏感唯一 */
const findDuplicateName = (rows: SubRow[]) => {
  const seen = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const normalized = String(rows[i]?.name ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) {
      return String(rows[i]?.name ?? '').trim();
    }
    seen.set(normalized, i);
  }
  return null;
};

const validateSubRows = (
  rows: SubRow[],
  kindLabel: string,
): CodeGoodsAdminApi.CodeGoodsSpecEditDto[] | null => {
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i]?.name ?? '').trim();
    if (!name) {
      message.error(
        $t('system.basicData.codeGoods.subRowNameRequired', [kindLabel, i + 1]),
      );
      return null;
    }
    if (name.length > 128) {
      message.error(
        $t('system.basicData.codeGoods.subRowNameMaxLength', [
          kindLabel,
          i + 1,
        ]),
      );
      return null;
    }
  }

  const duplicated = findDuplicateName(rows);
  if (duplicated) {
    message.error(
      $t('system.basicData.codeGoods.subRowNameDuplicated', [
        kindLabel,
        duplicated,
      ]),
    );
    return null;
  }

  return rows.map((row, index) => ({
    id: row.id ?? null,
    name: String(row.name).trim(),
    sortId: row.sortId ?? index,
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

    const specs = validateSubRows(
      specsData.value,
      $t('system.basicData.codeGoods.spec'),
    );
    if (!specs) return;

    const models = validateSubRows(
      modelsData.value,
      $t('system.basicData.codeGoods.model'),
    );
    if (!models) return;

    drawerApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        await editCodeGoods({
          id: formData.value.id,
          code: values.code,
          name: values.name,
          cargoId: values.cargoId,
          goodNo: values.goodNo,
          enName: values.enName,
          description: values.description,
          hsCode: values.hsCode,
          ruleUnit: values.ruleUnit,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
          codeGoodsSpecs: specs,
          codeGoodsModels: models,
        });
      } else {
        await addCodeGoods({
          code: values.code,
          name: values.name,
          cargoId: values.cargoId,
          goodNo: values.goodNo,
          enName: values.enName,
          description: values.description,
          hsCode: values.hsCode,
          ruleUnit: values.ruleUnit,
          enable: values.enable,
          sortId: values.sortId,
          remark: values.remark,
          codeGoodsSpecs: specs.map(({ id: _id, ...rest }) => rest),
          codeGoodsModels: models.map(({ id: _id, ...rest }) => rest),
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
        const detail = await getCodeGoodsDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          code: detail.code,
          name: detail.name,
          cargoId: detail.cargoId,
          goodNo: detail.goodNo,
          enName: detail.enName,
          description: detail.description,
          hsCode: detail.hsCode,
          ruleUnit: detail.ruleUnit,
          enable: detail.enable,
          sortId: detail.sortId,
          remark: detail.remark,
        });
        specsData.value = mapDetailToRows(detail.codeGoodsSpecs);
        modelsData.value = mapDetailToRows(detail.codeGoodsModels);
      } finally {
        drawerApi.lock(false);
      }
    } else {
      formData.value = undefined;
      formApi.resetForm();
      specsData.value = [];
      modelsData.value = [];
    }
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="mx-4" />

    <div class="mx-4 mt-4 space-y-5">
      <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium">
            {{ $t('system.basicData.codeGoods.specs') }}
          </span>
          <Button type="dashed" size="small" @click="addSpecRow">
            <IconifyIcon icon="mdi:plus" class="mr-1 size-4" />
            {{ $t('system.basicData.codeGoods.addSpec') }}
          </Button>
        </div>
        <Table
          :data-source="specsData"
          :pagination="false"
          size="small"
          row-key="_key"
          bordered
        >
          <Table.Column
            :title="$t('system.basicData.codeGoods.subName')"
            key="name"
            :min-width="160"
          >
            <template #default="{ record }">
              <Input
                :value="record.name"
                :maxlength="128"
                :placeholder="$t('ui.placeholder.input')"
                allow-clear
                @update:value="(v) => patchSpecRow(record._key, 'name', v)"
              />
            </template>
          </Table.Column>
          <Table.Column
            :title="$t('system.basicData.codeGoods.sortId')"
            key="sortId"
            width="100"
          >
            <template #default="{ record }">
              <InputNumber
                :value="record.sortId"
                :min="0"
                :precision="0"
                class="w-full"
                :controls="false"
                @update:value="(v) => patchSpecRow(record._key, 'sortId', v)"
              />
            </template>
          </Table.Column>
          <Table.Column
            :title="$t('system.basicData.codeGoods.remark')"
            key="remark"
            :min-width="140"
          >
            <template #default="{ record }">
              <Input
                :value="record.remark"
                :maxlength="1024"
                :placeholder="$t('ui.placeholder.input')"
                allow-clear
                @update:value="(v) => patchSpecRow(record._key, 'remark', v)"
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
                @click="removeSpecRow(record._key)"
              >
                {{ $t('common.delete') }}
              </Button>
            </template>
          </Table.Column>
        </Table>
        <div class="mt-1 text-xs text-gray-400">
          {{ $t('system.basicData.codeGoods.subTableTip') }}
        </div>
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium">
            {{ $t('system.basicData.codeGoods.models') }}
          </span>
          <Button type="dashed" size="small" @click="addModelRow">
            <IconifyIcon icon="mdi:plus" class="mr-1 size-4" />
            {{ $t('system.basicData.codeGoods.addModel') }}
          </Button>
        </div>
        <Table
          :data-source="modelsData"
          :pagination="false"
          size="small"
          row-key="_key"
          bordered
        >
          <Table.Column
            :title="$t('system.basicData.codeGoods.subName')"
            key="name"
            :min-width="160"
          >
            <template #default="{ record }">
              <Input
                :value="record.name"
                :maxlength="128"
                :placeholder="$t('ui.placeholder.input')"
                allow-clear
                @update:value="(v) => patchModelRow(record._key, 'name', v)"
              />
            </template>
          </Table.Column>
          <Table.Column
            :title="$t('system.basicData.codeGoods.sortId')"
            key="sortId"
            width="100"
          >
            <template #default="{ record }">
              <InputNumber
                :value="record.sortId"
                :min="0"
                :precision="0"
                class="w-full"
                :controls="false"
                @update:value="(v) => patchModelRow(record._key, 'sortId', v)"
              />
            </template>
          </Table.Column>
          <Table.Column
            :title="$t('system.basicData.codeGoods.remark')"
            key="remark"
            :min-width="140"
          >
            <template #default="{ record }">
              <Input
                :value="record.remark"
                :maxlength="1024"
                :placeholder="$t('ui.placeholder.input')"
                allow-clear
                @update:value="(v) => patchModelRow(record._key, 'remark', v)"
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
                @click="removeModelRow(record._key)"
              >
                {{ $t('common.delete') }}
              </Button>
            </template>
          </Table.Column>
        </Table>
        <div class="mt-1 text-xs text-gray-400">
          {{ $t('system.basicData.codeGoods.subTableTip') }}
        </div>
      </div>
    </div>
  </Drawer>
</template>
