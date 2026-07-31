<script lang="ts" setup>
import type {
  EnumConfigEntry,
  ImportConflictStrategy,
  ImportResult,
} from '../config-transfer';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Checkbox,
  message,
  Radio,
  Tag,
  UploadDragger,
} from 'ant-design-vue';

import { $t } from '#/locales';

import {
  buildExistingIdByName,
  fetchAllEnumerations,
  importEnumConfig,
  parseEnumConfigFile,
} from '../config-transfer';

const emits = defineEmits(['success']);

const fileName = ref('');
const parseError = ref('');
const entries = ref<EnumConfigEntry[]>([]);
const checkedNames = ref<string[]>([]);
const strategy = ref<ImportConflictStrategy>('overwrite');
/** 目标系统已有枚举：名称（小写）→ Id */
const existingIdByName = ref(new Map<string, string>());
const progress = ref('');
const result = ref<ImportResult | null>(null);

const selectedEntries = computed(() =>
  entries.value.filter((entry) => checkedNames.value.includes(entry.name)),
);

const allChecked = computed(
  () =>
    entries.value.length > 0 &&
    checkedNames.value.length === entries.value.length,
);

const someChecked = computed(
  () => checkedNames.value.length > 0 && !allChecked.value,
);

function isExisting(entry: EnumConfigEntry) {
  return existingIdByName.value.has(entry.name.toLowerCase());
}

function toggleAll(event: any) {
  checkedNames.value = event.target.checked
    ? entries.value.map((entry) => entry.name)
    : [];
}

function resetState() {
  fileName.value = '';
  parseError.value = '';
  entries.value = [];
  checkedNames.value = [];
  strategy.value = 'overwrite';
  existingIdByName.value = new Map();
  progress.value = '';
  result.value = null;
}

async function handleBeforeUpload(file: File) {
  resetState();
  if (!file.name.toLowerCase().endsWith('.json')) {
    parseError.value = $t('system.enumeration.onlyJsonAllowed');
    return false;
  }

  fileName.value = file.name;
  try {
    const parsed = parseEnumConfigFile(await file.text());
    entries.value = parsed.enumerations;
    checkedNames.value = parsed.enumerations.map((entry) => entry.name);
    existingIdByName.value = buildExistingIdByName(
      await fetchAllEnumerations(),
    );
  } catch (error: any) {
    entries.value = [];
    parseError.value =
      error?.message || $t('system.enumeration.invalidConfigFile');
  }
  return false;
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (selectedEntries.value.length === 0) {
      message.warning($t('system.enumeration.pleaseSelectEnum'));
      return;
    }

    modalApi.lock();
    result.value = null;
    try {
      const importResult = await importEnumConfig(
        selectedEntries.value,
        existingIdByName.value,
        strategy.value,
        (done, total) => {
          progress.value = $t('system.enumeration.importProgress', [
            done,
            total,
          ]);
        },
      );
      result.value = importResult;
      emits('success');
      if (importResult.failures.length === 0) {
        message.success($t('system.enumeration.importSuccess'));
      }
      // 重新拉一次，让「新增/已存在」标记与重试行为对上刚写入的数据
      existingIdByName.value = buildExistingIdByName(
        await fetchAllEnumerations(),
      );
    } finally {
      progress.value = '';
      modalApi.unlock();
    }
  },

  onOpenChange(isOpen) {
    if (isOpen) resetState();
  },
});
</script>

<template>
  <Modal
    :title="$t('system.enumeration.importConfigTitle')"
    class="w-[760px]"
    :confirm-text="$t('system.enumeration.importConfig')"
  >
    <div class="flex flex-col gap-3">
      <Alert
        type="info"
        show-icon
        :message="$t('system.enumeration.importTips')"
        :description="$t('system.enumeration.importTipsDetail')"
      />

      <UploadDragger
        :file-list="[]"
        accept=".json"
        :before-upload="handleBeforeUpload"
      >
        <p class="ant-upload-drag-icon">
          <IconifyIcon
            class="text-4xl text-blue-400"
            icon="ant-design:inbox-outlined"
          />
        </p>
        <p class="ant-upload-text">
          {{ fileName || $t('system.enumeration.clickOrDragUpload') }}
        </p>
        <p class="ant-upload-hint">
          {{ $t('system.enumeration.supportJson') }}
        </p>
      </UploadDragger>

      <Alert v-if="parseError" type="error" show-icon :message="parseError" />

      <template v-if="entries.length > 0">
        <div class="flex items-center gap-3 text-sm">
          <span>{{ $t('system.enumeration.conflictStrategy') }}</span>
          <Radio.Group v-model:value="strategy">
            <Radio value="overwrite">
              {{ $t('system.enumeration.conflictOverwrite') }}
            </Radio>
            <Radio value="skip">
              {{ $t('system.enumeration.conflictSkip') }}
            </Radio>
          </Radio.Group>
        </div>

        <div class="flex items-center justify-between text-sm">
          <Checkbox
            :checked="allChecked"
            :indeterminate="someChecked"
            @change="toggleAll"
          >
            {{ $t('system.enumeration.selectAll') }}
          </Checkbox>
          <span class="text-gray-500">
            {{ $t('system.enumeration.selectedCount', [checkedNames.length]) }}
          </span>
        </div>

        <div class="max-h-[300px] overflow-y-auto rounded border p-1">
          <Checkbox.Group v-model:value="checkedNames" class="w-full">
            <div
              v-for="entry in entries"
              :key="entry.name"
              class="flex items-center justify-between rounded px-2 py-1.5 hover:bg-gray-50"
            >
              <Checkbox :value="entry.name">
                <span class="font-medium">{{ entry.name }}</span>
                <span
                  v-if="entry.description"
                  class="ml-2 text-xs text-gray-500"
                >
                  {{ entry.description }}
                </span>
              </Checkbox>
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-xs text-gray-500">
                  {{ $t('system.enumeration.itemCount', [entry.items.length]) }}
                </span>
                <Tag :color="isExisting(entry) ? 'orange' : 'green'">
                  {{
                    isExisting(entry)
                      ? $t('system.enumeration.statusExists')
                      : $t('system.enumeration.statusNew')
                  }}
                </Tag>
              </div>
            </div>
          </Checkbox.Group>
        </div>
      </template>

      <div v-if="progress" class="text-sm text-gray-500">{{ progress }}</div>

      <Alert
        v-if="result"
        show-icon
        :type="result.failures.length > 0 ? 'warning' : 'success'"
        :message="
          $t('system.enumeration.importResult', [
            result.created,
            result.updated,
            result.skipped,
            result.failures.length,
          ])
        "
        :description="
          result.failures.length > 0
            ? result.failures.map((f) => `${f.name}: ${f.reason}`).join('; ')
            : undefined
        "
      />
    </div>
  </Modal>
</template>
