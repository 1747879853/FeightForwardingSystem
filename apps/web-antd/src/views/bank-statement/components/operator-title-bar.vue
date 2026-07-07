<script lang="ts" setup>
import type { BankStatementOperatorRow } from '../utils';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Input, Popover, Table, Tag } from 'ant-design-vue';

import { UserSelect } from '#/adapter/component';

import { resolveOperatorName } from '../utils';

const props = defineProps<{
  disabled?: boolean;
  rows: BankStatementOperatorRow[];
}>();

const emit = defineEmits<{
  'update:rows': [rows: BankStatementOperatorRow[]];
}>();

const popoverOpen = ref(false);
let rowKeyCounter = 0;
const makeRowKey = () => `op_${++rowKeyCounter}_${Date.now()}`;

const operatorColumns = [
  { key: 'operationId', title: '操作人', width: 130 },
  { key: 'remark', title: '备注' },
  { key: 'action', title: '', width: 40, align: 'center' as const },
];

function updateRows(rows: BankStatementOperatorRow[]) {
  emit('update:rows', rows);
}

function addOperatorRow() {
  updateRows([...props.rows, { _key: makeRowKey() }]);
}

function removeOperatorRow(key: string) {
  updateRows(props.rows.filter((row) => row._key !== key));
}

async function updateOperatorRow(
  key: string,
  patch: Partial<BankStatementOperatorRow>,
) {
  const nextRows = await Promise.all(
    props.rows.map(async (row) => {
      if (row._key !== key) return row;
      const merged = { ...row, ...patch };
      if (patch.operationId && patch.operationId !== row.operationId) {
        merged.operationName = await resolveOperatorName(
          patch.operationId,
          patch.operationName,
        );
      }
      return merged;
    }),
  );
  updateRows(nextRows);
}

function toOperatorSelectedItems(row: BankStatementOperatorRow) {
  if (!row.operationId) return [];
  return [
    {
      id: row.operationId,
      userName: row.operationName || '',
    },
  ];
}

function handleRemoveTag(row: BankStatementOperatorRow) {
  removeOperatorRow(row._key);
}
</script>

<template>
  <div class="operator-title-bar flex flex-wrap items-center gap-2">
    <span class="text-xs text-gray-400">操作人</span>

    <template v-if="rows.filter((row) => row.operationId).length === 0">
      <span class="text-xs text-gray-400">
        未配置时，所有人均可在非 Admin 端查看
      </span>
    </template>

    <Tag
      v-for="row in rows.filter((row) => row.operationId)"
      :key="row._key"
      :closable="!disabled"
      class="operator-tag"
      @close="handleRemoveTag(row)"
    >
      {{ row.operationName || row.operationId }}
    </Tag>

    <Popover
      v-model:open="popoverOpen"
      trigger="click"
      placement="bottomLeft"
      overlay-class-name="operator-popover"
    >
      <template #content>
        <div class="operator-popover-body">
          <Table
            class="operator-table"
            :columns="operatorColumns"
            :data-source="rows"
            :pagination="false"
            row-key="_key"
            size="small"
            :bordered="false"
            :locale="{
              emptyText: '未配置操作人，所有人均可在非 Admin 端查看该流水',
            }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'operationId'">
                <UserSelect
                  :key="record._key"
                  :model-value="record.operationId"
                  :selected-items="toOperatorSelectedItems(record)"
                  :disabled="disabled"
                  placeholder="请选择"
                  size="small"
                  class="w-full"
                  @update:model-value="
                    (value) =>
                      updateOperatorRow(record._key, { operationId: value })
                  "
                />
              </template>
              <template v-else-if="column.key === 'remark'">
                <Input
                  :value="record.remark"
                  :disabled="disabled"
                  placeholder="备注"
                  size="small"
                  allow-clear
                  @update:value="
                    (value) => updateOperatorRow(record._key, { remark: value })
                  "
                />
              </template>
              <template v-else-if="column.key === 'action'">
                <Button
                  v-if="!disabled"
                  type="text"
                  danger
                  size="small"
                  title="删除"
                  @click="removeOperatorRow(record._key)"
                >
                  <IconifyIcon icon="mdi:trash-can-outline" class="size-4" />
                </Button>
              </template>
            </template>
          </Table>

          <Button
            v-if="!disabled"
            type="dashed"
            block
            class="operator-add-btn"
            @click="addOperatorRow"
          >
            <IconifyIcon icon="ant-design:plus-outlined" class="mr-1 size-4" />
            添加操作人
          </Button>
        </div>
      </template>

      <Button v-if="!disabled" type="link" size="small" class="px-1">
        <IconifyIcon icon="ant-design:plus-outlined" class="mr-1 size-3.5" />
        管理操作人
      </Button>
    </Popover>
  </div>
</template>

<style scoped lang="scss">
.operator-title-bar {
  :deep(.operator-tag) {
    margin-inline-end: 0;
  }
}

.operator-popover-body {
  width: 420px;
}

.operator-table {
  margin-bottom: 8px;

  :deep(.ant-table) {
    font-size: 13px;
  }

  :deep(.ant-table-container) {
    border: 1px solid #f0f0f0;
    border-radius: 4px;
  }

  :deep(.ant-table-thead > tr > th) {
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 500;
    color: #8c8c8c;
    background: #fafafa;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 4px 6px;
  }
}

.operator-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
