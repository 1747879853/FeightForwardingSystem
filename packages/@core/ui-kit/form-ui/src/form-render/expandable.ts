import type { FormRenderProps } from '../types';

import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';

import {
  breakpointsTailwind,
  useBreakpoints,
  useElementVisibility,
} from '@vueuse/core';

/**
 * 动态计算行数
 */
export function useExpandable(props: FormRenderProps) {
  const wrapperRef = useTemplateRef<HTMLElement>('wrapperRef');
  const isVisible = useElementVisibility(wrapperRef);
  const rowMapping = ref<Record<number, number>>({});
  // 是否已经计算过一次
  const isCalculated = ref(false);

  const breakpoints = useBreakpoints(breakpointsTailwind);

  const keepFormItemIndex = computed(() => {
    const rows = props.collapsedRows ?? 1;
    const mapping = rowMapping.value;
    let maxItem = 0;
    for (let index = 1; index <= rows; index++) {
      maxItem += mapping?.[index] ?? 0;
    }
    // 保持一行
    return maxItem - 1 || 1;
  });

  watch(
    [
      () => props.showCollapseButton,
      () => breakpoints.active().value,
      // 用「字段顺序 + 显隐」指纹而非仅长度：搜索项持久化会在长度不变的情况下
      // 重排或显隐字段，只盯长度会让「折叠保留数」停留在旧布局，出现第一行留白/错位。
      () =>
        props.schema
          ?.map((item) => `${item?.fieldName}:${item?.hide ? 0 : 1}`)
          .join(','),
      () => isVisible.value,
    ],
    async ([val]) => {
      if (val) {
        await nextTick();
        rowMapping.value = {};
        isCalculated.value = false;
        await calculateRowMapping();
      }
    },
  );

  async function calculateRowMapping() {
    if (!props.showCollapseButton) {
      return;
    }

    await nextTick();
    if (!wrapperRef.value) {
      return;
    }
    // 小屏幕不计算
    // if (breakpoints.smaller('sm').value) {
    //   // 保持一行
    //   rowMapping.value = { 1: 2 };
    //   return;
    // }

    const formItems = [...wrapperRef.value.children] as HTMLElement[];

    // 不用 grid-template-rows：操作按钮钉在第一行末列后，计算值经常把两行合成一条轨道，
    // 折叠保留数偏大，收起时第二行条件仍占高度。
    // 按钮比输入框略矮，顶边会差几像素，12px 内视为同一行。
    const visibleItems = formItems.filter(
      (el) => !el.classList.contains('hidden') && el.offsetHeight > 0,
    );
    const tops = visibleItems.map((el) => el.offsetTop).sort((a, b) => a - b);
    const rowStarts: number[] = [];
    for (const top of tops) {
      const current = rowStarts[rowStarts.length - 1];
      if (current === undefined || top - current > 12) {
        rowStarts.push(top);
      }
    }

    const mapping: Record<number, number> = {};
    const collapsedRows = props.collapsedRows ?? 1;
    rowStarts.forEach((rowTop, index) => {
      const rowStart = index + 1;
      if (rowStart > collapsedRows) {
        return;
      }
      const nextTop = rowStarts[index + 1];
      mapping[rowStart] = visibleItems.filter((el) => {
        return (
          el.offsetTop >= rowTop &&
          (nextTop === undefined || el.offsetTop < nextTop)
        );
      }).length;
    });
    rowMapping.value = mapping;
    isCalculated.value = rowStarts.length > 0;
  }

  onMounted(() => {
    calculateRowMapping();
  });

  return { isCalculated, keepFormItemIndex, wrapperRef };
}
