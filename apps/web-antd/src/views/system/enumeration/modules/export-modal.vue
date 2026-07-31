<script lang="ts" setup>
import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { Alert, Checkbox, Empty, Input, message, Spin } from 'ant-design-vue';

import { $t } from '#/locales';

import {
  buildEnumConfigFile,
  buildExportFileName,
  fetchAllEnumerations,
} from '../config-transfer';

const loading = ref(false);
const keyword = ref('');
const enumerations = ref<EnumerationAdminApi.EnumerationListDto[]>([]);
const checkedIds = ref<string[]>([]);
const progress = ref('');

const filteredList = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return enumerations.value;
  return enumerations.value.filter((item) =>
    `${item.name ?? ''} ${item.description ?? ''}`.toLowerCase().includes(text),
  );
});

const allChecked = computed(
  () =>
    filteredList.value.length > 0 &&
    filteredList.value.every((item) => checkedIds.value.includes(item.id)),
);

const someChecked = computed(
  () => checkedIds.value.length > 0 && !allChecked.value,
);

function toggleAll(event: any) {
  const visibleIds = filteredList.value.map((item) => item.id);
  checkedIds.value = event.target.checked
    ? [...new Set([...checkedIds.value, ...visibleIds])]
    : checkedIds.value.filter((id) => !visibleIds.includes(id));
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (checkedIds.value.length === 0) {
      message.warning($t('system.enumeration.pleaseSelectEnum'));
      return;
    }

    modalApi.lock();
    try {
      const total = checkedIds.value.length;
      progress.value = $t('system.enumeration.exportProgress', [0, total]);
      const config = await buildEnumConfigFile(
        [...checkedIds.value],
        (done, count) => {
          progress.value = $t('system.enumeration.exportProgress', [
            done,
            count,
          ]);
        },
      );
      downloadFileFromBlobPart({
        fileName: buildExportFileName(),
        source: JSON.stringify(config, null, 2),
      });
      message.success($t('system.enumeration.exportSuccess', [total]));
      modalApi.close();
    } catch {
      modalApi.unlock();
    } finally {
      progress.value = '';
    }
  },

  async onOpenChange(isOpen) {
    if (!isOpen) return;
    keyword.value = '';
    checkedIds.value = [];
    progress.value = '';
    loading.value = true;
    try {
      enumerations.value = await fetchAllEnumerations();
    } catch {
      enumerations.value = [];
    } finally {
      loading.value = false;
    }
  },
});
</script>

<template>
  <Modal
    :title="$t('system.enumeration.exportConfigTitle')"
    class="w-[720px]"
    :confirm-text="$t('system.enumeration.exportConfig')"
  >
    <div class="flex flex-col gap-3">
      <Alert
        type="info"
        show-icon
        :message="$t('system.enumeration.exportTips')"
      />

      <Input
        v-model:value="keyword"
        allow-clear
        :placeholder="$t('system.enumeration.searchEnumName')"
      />

      <div class="flex items-center justify-between text-sm">
        <Checkbox
          :checked="allChecked"
          :indeterminate="someChecked"
          :disabled="filteredList.length === 0"
          @change="toggleAll"
        >
          {{ $t('system.enumeration.selectAll') }}
        </Checkbox>
        <span class="text-gray-500">
          {{ $t('system.enumeration.selectedCount', [checkedIds.length]) }}
        </span>
      </div>

      <Spin :spinning="loading">
        <div class="h-[360px] overflow-y-auto rounded border p-1">
          <Empty v-if="filteredList.length === 0" />
          <Checkbox.Group v-else v-model:value="checkedIds" class="w-full">
            <div
              v-for="item in filteredList"
              :key="item.id"
              class="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
            >
              <Checkbox :value="item.id">
                <span class="font-medium">{{ item.name }}</span>
                <span
                  v-if="item.description"
                  class="ml-2 text-xs text-gray-500"
                >
                  {{ item.description }}
                </span>
              </Checkbox>
            </div>
          </Checkbox.Group>
        </div>
      </Spin>

      <div v-if="progress" class="text-sm text-gray-500">{{ progress }}</div>
    </div>
  </Modal>
</template>
