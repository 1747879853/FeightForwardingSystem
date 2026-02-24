<script lang="ts" setup>
import type { CascaderProps } from 'ant-design-vue';

import { computed, nextTick, ref, watch } from 'vue';

import { $t } from '@vben/locales';

import { Cascader } from 'ant-design-vue';

import { getProvinces } from '#/api/common/area';

interface CascaderOption {
  children?: CascaderOption[];
  isLeaf?: boolean;
  label: string;
  loading?: boolean;
  value: string;
}

interface Props {
  /** placeholder */
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
});

/** v-model 为完整路径数组，如 ['省code', '市code', '区code'] */
const modelValue = defineModel<string[]>({ default: () => [] });

const options = ref<CascaderOption[]>([]);
const loading = ref(false);

/** value → label 映射表，确保 displayRender 始终显示名称 */
const labelMap = new Map<string, string>();

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

/** 将 Area 数组映射为 CascaderOption 数组，同时缓存 label */
const mapToOptions = (
  areas: Array<{ displayName?: string; id?: string }>,
  level: number,
): CascaderOption[] => {
  return areas
    .filter((a) => a.id)
    .map((a) => {
      const label = a.displayName || a.id || '';
      labelMap.set(a.id!, label);
      return { label, value: a.id!, isLeaf: level === 3 };
    });
};

/** 在 options 树中查找节点 */
const findNodeInTree = (
  tree: CascaderOption[],
  value: string,
): CascaderOption | undefined => {
  for (const node of tree) {
    if (node.value === value) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, value);
      if (found) return found;
    }
  }
  return undefined;
};

/** 强制刷新 options 引用，使 Cascader 重新解析选项树 */
const refreshOptions = () => {
  options.value = [...options.value];
};

/** 加载顶层省级数据（单例 Promise 防止并发） */
let loadRootPromise: Promise<void> | null = null;
const loadRootOptions = (): Promise<void> => {
  if (options.value.length > 0) return Promise.resolve();
  if (!loadRootPromise) {
    loadRootPromise = (async () => {
      loading.value = true;
      try {
        const areas = await getProvinces('A1560000');
        options.value = mapToOptions(areas, 1);
      } finally {
        loading.value = false;
      }
    })();
  }
  return loadRootPromise;
};

/** 懒加载下级数据（点击展开时触发） */
const handleLoadData: CascaderProps['loadData'] = async (selectedOptions) => {
  const target = selectedOptions[selectedOptions.length - 1] as CascaderOption;
  if (!target || target.children) return;

  target.loading = true;
  try {
    const nextLevel = selectedOptions.length + 1;
    const areas = await getProvinces(target.value);
    const children = mapToOptions(areas, nextLevel);

    const treeNode = findNodeInTree(options.value, target.value);
    const nodeToUpdate = treeNode || target;

    if (children.length === 0) {
      nodeToUpdate.isLeaf = true;
      nodeToUpdate.children = [];
    } else {
      nodeToUpdate.children = children;
    }
    nodeToUpdate.loading = false;
  } finally {
    target.loading = false;
    refreshOptions();
  }
};

/**
 * 确保 options 树中包含完整路径（用于编辑回显）
 * 根据路径数组逐级加载 children，使 Cascader 能正确匹配 label
 */
const ensureOptionsContainPath = async (pathIds: string[]) => {
  await loadRootOptions();

  for (let i = 0; i < pathIds.length; i++) {
    const currentId = pathIds[i]!;
    const node = findNodeInTree(options.value, currentId);
    if (!node) break;

    // 非最后一级 且 还没有 children 时加载
    if (
      i < pathIds.length - 1 &&
      (!node.children || node.children.length === 0)
    ) {
      const nextLevel = i + 2;
      const areas = await getProvinces(currentId);
      const children = mapToOptions(areas, nextLevel);
      node.children = children;
      node.isLeaf = children.length === 0;
    }

    // 最后一级：标记为叶子（第三层）或加载子级判断
    if (i === pathIds.length - 1) {
      const level = i + 1;
      if (level >= 3) {
        node.isLeaf = true;
      } else if (!node.children) {
        const areas = await getProvinces(currentId);
        const children = mapToOptions(areas, level + 1);
        node.children = children;
        node.isLeaf = children.length === 0;
      }
    }
  }

  refreshOptions();
};

/** 自定义显示渲染：始终从 labelMap 取名称，兜底避免显示 code */
const handleDisplayRender: CascaderProps['displayRender'] = ({
  labels,
  selectedOptions,
}) => {
  if (selectedOptions && selectedOptions.length > 0) {
    return selectedOptions.map((opt) => opt?.label ?? opt?.value).join(' / ');
  }
  return (labels as string[])
    .map((val) => labelMap.get(String(val)) || val)
    .join(' / ');
};

/** 处理级联选择器值变化，直接将完整路径数组写入 modelValue */
const handleChange: CascaderProps['onChange'] = (value) => {
  const raw = (value || []) as (number | string)[];
  modelValue.value = raw.map(String);
};

/** 初始化加载根选项 */
loadRootOptions();

/** 监听 modelValue 变化，回显时加载 options 树 */
watch(
  () => modelValue.value,
  async (newVal) => {
    if (!newVal || newVal.length === 0) return;

    // 如果 options 树中已经能找到路径的最后一个节点，无需重新加载
    const lastId = newVal[newVal.length - 1]!;
    if (findNodeInTree(options.value, lastId)) return;

    try {
      await ensureOptionsContainPath(newVal);
      await nextTick();
    } catch {
      // 加载失败静默处理
    }
  },
  { immediate: true },
);
</script>

<template>
  <Cascader
    :value="modelValue"
    :options="options"
    :load-data="handleLoadData"
    :display-render="handleDisplayRender"
    :placeholder="computedPlaceholder"
    :change-on-select="true"
    :allow-clear="true"
    :show-search="false"
    class="w-full"
    v-bind="$attrs"
    @change="handleChange"
  />
</template>
