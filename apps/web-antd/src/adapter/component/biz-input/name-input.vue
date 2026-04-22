<script lang="ts" setup>
/**
 * 船名/航次 合并输入组件
 * 视觉上合并为一个字段，实际仍为 vessel 和 innerVoyno 两个独立字段
 */
import { computed, watch, ref } from 'vue';

import { $t } from '@vben/locales';

import { Input, Tooltip } from 'ant-design-vue';

import { clientNameCheck } from '#/api/sea-export/client-admin';

import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

const route = useRoute();

interface Props {
  /** 名称 */
  value?: string;
  /** 禁用 */
  disabled?: boolean;
  /** 占位符 */
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
});

const emit = defineEmits<{
  'update:value': [value: string];
}>();

const isSuccess = ref(0);
const nameDes = ref('');
const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const nameValue = computed(() => props.value ?? '');

watch(
  nameValue,
  async (value) => {
    if (!value) return;
    try {
      const res = await clientNameCheck({
        id: editId ? editId.value : '',
        fullName: value,
      });
      console.log(res);
      isSuccess.value = 2;
      nameDes.value = '恭喜，该客户名称可用';
    } catch (error) {
      isSuccess.value = 1;
      nameDes.value = '该客户名称已存在';
      console.log(error);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <Input
      :value="nameValue"
      :disabled="props.disabled"
      :placeholder="$t('seaExport.export.vessel')"
      class="flex-1"
      allow-clear
      @update:value="(v) => emit('update:value', v)"
    >
      <template #suffix>
        <Tooltip :title="nameDes">
          <IconifyIcon
            v-if="isSuccess === 1"
            icon="mdi:close"
            class="size-4"
            style="color: #fe0000"
          ></IconifyIcon>
          <IconifyIcon
            v-else-if="isSuccess === 2"
            icon="mdi:check"
            class="size-4"
            style="color: #03b339"
          ></IconifyIcon>
          <IconifyIcon v-else icon="mdi:loading" class="size-0"></IconifyIcon>
        </Tooltip>
      </template>
    </Input>
  </div>
</template>
