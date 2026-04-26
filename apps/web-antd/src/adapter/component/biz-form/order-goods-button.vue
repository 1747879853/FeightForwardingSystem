<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch } from 'vue';

import { Button, Modal, Space, Table } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { getCodeGoodsDetail } from '#/api/system/base-data/code-goods-admin';
import { $t } from '@vben/locales';

import CodeGoodsSelect from '../biz-select/code-goods-select.vue';

type OrderRow = SeaExportAdminApi.OrderCodeGoodsAddDto & { _rowKey: string };

const modelValue = defineModel<
  SeaExportAdminApi.OrderCodeGoodsAddDto[] | undefined
>({
  default: undefined,
});

/** codeGoodsId -> name 缓存，用于按钮文案展示 */
const nameMap = ref<Record<number, string>>({});

const toSafeText = (val: unknown) => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

const placeholderText = computed(() =>
  $t('seaExport.export.pleaseSelectGoods'),
);

const displayText = computed(() => {
  const items = modelValue.value || [];
  if (!items.length) return placeholderText.value;
  const names = items
    .map((item) => {
      const localName = toSafeText((item as any).codeGoodsName);
      const localHSCode = toSafeText(
        (item as any).codeGoodsHSCode ?? (item as any).hsCode,
      );
      if (localName && localHSCode) return `${localName}-${localHSCode}`;
      if (localName) return localName;
      if (!item.codeGoodsId) return undefined;
      return nameMap.value[item.codeGoodsId] ?? String(item.codeGoodsId);
    })
    .filter(Boolean);
  return names.length ? names.join(' / ') : placeholderText.value;
});

const isPlaceholderText = computed(
  () => displayText.value === placeholderText.value,
);

const modalVisible = ref(false);
const pendingRows = ref<OrderRow[]>([]);
const selectedRowKeys = ref<string[]>([]);
let rowKeyCounter = 0;

const makeRowKey = () => `goods_${++rowKeyCounter}_${Date.now()}`;

const openModal = () => {
  const rows = (modelValue.value || []).map((item) => ({
    ...item,
    _rowKey: makeRowKey(),
  }));
  // 打开弹窗时如果没有品名，默认补一行，避免再手动点击“添加品名”
  pendingRows.value = rows.length ? rows : [{ _rowKey: makeRowKey() }];
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
  list[index] = {
    ...list[index],
    codeGoodsId,
    codeGoodsName: undefined,
    codeGoodsHSCode: undefined,
  };
  pendingRows.value = list;
  if (codeGoodsId && !nameMap.value[codeGoodsId]) {
    getCodeGoodsDetail(codeGoodsId)
      .then((detail) => {
        const hsCode = toSafeText(
          (detail as any).codeGoodsHSCode ?? (detail as any).hsCode,
        );
        const fullName = detail.name
          ? `${detail.name}${hsCode ? `-${hsCode}` : ''}`
          : String(codeGoodsId);
        nameMap.value = { ...nameMap.value, [codeGoodsId]: fullName };

        const latest = [...pendingRows.value];
        const row = latest[index];
        if (row?.codeGoodsId === codeGoodsId) {
          latest[index] = {
            ...row,
            codeGoodsName: detail.name || undefined,
            codeGoodsHSCode: hsCode || undefined,
          };
          pendingRows.value = latest;
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
  for (const item of items) {
    if (!item.codeGoodsId) continue;
    const localName = toSafeText((item as any).codeGoodsName);
    const localHSCode = toSafeText(
      (item as any).codeGoodsHSCode ?? (item as any).hsCode,
    );
    if (localName && !nameMap.value[item.codeGoodsId]) {
      const fullName = localHSCode ? `${localName}-${localHSCode}` : localName;
      nameMap.value = { ...nameMap.value, [item.codeGoodsId]: fullName };
    }
  }
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
    <Button class="w-full text-left" :title="displayText" @click="openModal">
      <div class="flex w-full items-center">
        <span
          class="min-w-0 flex-1 truncate"
          :class="{ 'text-gray-400': isPlaceholderText }"
        >
          {{ displayText }}
        </span>
        <span
          class="ml-auto inline-flex h-full flex-shrink-0 items-center justify-center text-primary"
        >
          <IconifyIcon
            icon="mdi:square-edit-outline"
            class="size-4"
            aria-hidden="true"
          />
        </span>
      </div>
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
