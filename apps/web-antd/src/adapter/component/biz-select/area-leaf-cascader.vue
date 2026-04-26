<script lang="ts" setup>
import { ref, watch } from 'vue';

import { getAreaAndParents } from '#/api/common/area';

import AreaCascader from './area-cascader.vue';

interface Props {
  /** placeholder */
  placeholder?: string;
}

withDefaults(defineProps<Props>(), {
  placeholder: undefined,
});

/** 对外仅暴露末级 areaId（string） */
const modelValue = defineModel<string | undefined>();
/** 对内给 AreaCascader 使用完整路径 */
const areaPath = ref<string[]>([]);

const buildAreaPath = async (areaId?: string): Promise<string[]> => {
  if (!areaId) return [];
  try {
    const areas = await getAreaAndParents(areaId);
    if (!areas || areas.length === 0) return [];

    const idSet = new Set(areas.map((a) => a.id));
    const root = areas.find((a) => !a.parentId || !idSet.has(a.parentId));
    if (!root) return areas.map((a) => a.id).filter(Boolean) as string[];

    const ordered = [root];
    while (ordered.length < areas.length) {
      const currentId = ordered[ordered.length - 1]!.id;
      const next = areas.find((a) => a.parentId === currentId);
      if (!next) break;
      ordered.push(next);
    }

    return ordered.map((a) => a.id).filter(Boolean) as string[];
  } catch {
    return [];
  }
};

let latestSyncToken = 0;

watch(
  () => modelValue.value,
  async (newVal) => {
    const token = ++latestSyncToken;

    if (!newVal) {
      areaPath.value = [];
      return;
    }

    const currentLeaf = areaPath.value[areaPath.value.length - 1];
    if (currentLeaf === newVal) return;

    const path = await buildAreaPath(newVal);
    if (token !== latestSyncToken) return;
    areaPath.value = path;
  },
  { immediate: true },
);

watch(
  () => areaPath.value,
  (newPath) => {
    const leafId =
      Array.isArray(newPath) && newPath.length > 0
        ? newPath[newPath.length - 1]
        : undefined;
    if (leafId !== modelValue.value) {
      modelValue.value = leafId;
    }
  },
  { deep: true },
);
</script>

<template>
  <AreaCascader v-model="areaPath" :placeholder="placeholder" v-bind="$attrs" />
</template>
