<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Modal, Space, Table } from 'ant-design-vue';

import { getCodeGoodsDetail } from '#/api/system/base-data/code-goods-admin';
import { $t } from '@vben/locales';

import CodeGoodsSelect from './code-goods-select.vue';

type OrderRow = SeaExportAdminApi.OrderCodeGoodsAddDto & { _rowKey: string };

const modelValue = defineModel<
  SeaExportAdminApi.OrderCodeGoodsAddDto[] | undefined
>({
  default: undefined,
});

/** codeGoodsId -> name 缓存，用于按钮文案展示 */
const nameMap = ref<Record<number, string>>({});

const displayText = computed(() => {
  const items = modelValue.value || [];
  if (!items.length) return $t('seaExport.export.pleaseSelectGoods');
  const names = items
    .map((item) =>
      item.codeGoodsId
        ? (nameMap.value[item.codeGoodsId] ?? String(item.codeGoodsId))
        : undefined,
    )
    .filter(Boolean);
  return names.length
    ? names.join(' / ')
    : $t('seaExport.export.pleaseSelectGoods');
});

const modalVisible = ref(false);
const pendingRows = ref<OrderRow[]>([]);
const selectedRowKeys = ref<string[]>([]);
let rowKeyCounter = 0;

const makeRowKey = () => `goods_${++rowKeyCounter}_${Date.now()}`;

const openModal = () => {
  pendingRows.value = (modelValue.value || []).map((item) => ({
    ...item,
    _rowKey: makeRowKey(),
  }));
  selectedRowKeys.value = [];
  modalVisible.value = true;
};

const handleConfirm = () => {
  modelValue.value = pendingRows.value.map(({ _rowKey: _k, ...rest }) => rest);
  modalVisible.value = false;
};

const addRow = () => {
  pendingRows.value = [...pendingRows.value, { _rowKey: makeRowKey() }];
};

const removeSelectedRows = () => {
  const keysSet = new Set(selectedRowKeys.value);
  pendingRows.value = pendingRows.value.filter(
    (row) => !keysSet.has(row._rowKey),
  );
  selectedRowKeys.value = [];
};

const updateRow = (index: number, codeGoodsId: number | undefined) => {
  const list = [...pendingRows.value];
  list[index] = { ...list[index], codeGoodsId };
  pendingRows.value = list;
  if (codeGoodsId && !nameMap.value[codeGoodsId]) {
    getCodeGoodsDetail(codeGoodsId)
      .then((detail) => {
        if (detail.name) {
          nameMap.value = { ...nameMap.value, [codeGoodsId]: detail.name };
        }
      })
      .catch(() => {});
  }
};

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys;
  },
}));

const loadNames = async (items: SeaExportAdminApi.OrderCodeGoodsAddDto[]) => {
  const toLoad = items
    .map((item) => item.codeGoodsId)
    .filter((id): id is number => !!id && !nameMap.value[id]);
  await Promise.all(
    toLoad.map(async (id) => {
      try {
        const detail = await getCodeGoodsDetail(id);
        if (detail.name) {
          nameMap.value = { ...nameMap.value, [id]: detail.name };
        }
      } catch {}
    }),
  );
};

watch(
  () => modelValue.value,
  (items) => {
    if (items?.length) loadNames(items);
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div class="w-full">
    <Button
      class="flex w-full items-center"
      style="justify-content: flex-start; text-align: left"
      @click="openModal"
    >
      <span class="flex-1 truncate">{{ displayText }}</span>
      <IconifyIcon
        icon="lucide:pencil"
        class="ml-auto flex-shrink-0 text-gray-400"
      />
    </Button>

    <Modal
      :open="modalVisible"
      :title="$t('seaExport.export.selectGoods')"
      :width="480"
      :ok-text="$t('common.confirm')"
      :cancel-text="$t('common.cancel')"
      destroy-on-close
      @ok="handleConfirm"
      @cancel="() => (modalVisible = false)"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-600">
          {{ $t('seaExport.export.orderCodeGoodss') }}
        </span>
        <Space>
          <Button type="primary" size="small" @click="addRow">
            {{ $t('seaExport.export.addGoods') }}
          </Button>
          <Button
            danger
            size="small"
            :disabled="!selectedRowKeys.length"
            @click="removeSelectedRows"
          >
            {{ $t('common.delete') }}
          </Button>
        </Space>
      </div>

      <Table
        :data-source="pendingRows"
        :row-selection="rowSelection"
        :pagination="false"
        row-key="_rowKey"
        size="small"
        bordered
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'codeGoodsId'">
            <CodeGoodsSelect
              :model-value="record.codeGoodsId"
              class="w-full"
              :placeholder="$t('ui.placeholder.select')"
              @update:model-value="(v) => updateRow(index, v)"
            />
          </template>
        </template>

        <Table.Column
          key="codeGoodsId"
          :title="$t('seaExport.export.codeGoodsId')"
        />
      </Table>
    </Modal>
  </div>
</template>
