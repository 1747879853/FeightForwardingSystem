import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

import { computed, onBeforeUnmount, toValue, watch } from 'vue';

import { useTabs } from '@vben/hooks';

import { $t } from '#/locales';

export function resolveSeaImportTabTitle(options: {
  commissionNum?: null | string;
  isSaved: boolean;
  mblNum?: null | string;
}): string {
  const base = $t('seaImport.import.title');
  const mbl = options.mblNum?.trim();
  if (mbl) {
    return `${base}-${mbl}`;
  }
  if (options.isSaved) {
    const commission = options.commissionNum?.trim();
    if (commission) {
      return `${base}-${commission}`;
    }
  }
  return base;
}

export function useSeaImportTabTitle(
  mblNum: ComputedRef<string | undefined> | Ref<string | undefined>,
  commissionNum: ComputedRef<string | undefined> | Ref<string | undefined>,
  isSaved: ComputedRef<boolean> | Ref<boolean>,
  options?: {
    /** false 时不改写/复位页签标题 */
    enabled?: MaybeRefOrGetter<boolean>;
    /**
     * 卸载时是否复位页签标题。
     * 编辑工作台 Form 随内部 Tab 卸载时切勿复位，否则会丢掉「海运进口-编号」。
     */
    resetOnUnmount?: MaybeRefOrGetter<boolean>;
  },
) {
  const { resetTabTitle, setTabTitle } = useTabs();

  const enabled = computed(() => {
    if (options?.enabled === undefined) return true;
    return toValue(options.enabled);
  });

  const shouldResetOnUnmount = computed(() => {
    if (options?.resetOnUnmount === undefined) return true;
    return toValue(options.resetOnUnmount);
  });

  const tabTitle = computed(() =>
    resolveSeaImportTabTitle({
      commissionNum: commissionNum.value,
      isSaved: isSaved.value,
      mblNum: mblNum.value,
    }),
  );

  watch(
    [tabTitle, enabled, mblNum, commissionNum, isSaved],
    () => {
      if (!enabled.value) return;
      // 编辑态尚未回填主提单号/委托编号时跳过，避免把已设好的动态标题冲成「海运进口」
      if (
        isSaved.value &&
        !String(mblNum.value ?? '').trim() &&
        !String(commissionNum.value ?? '').trim()
      ) {
        return;
      }
      void setTabTitle(tabTitle.value);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (!enabled.value || !shouldResetOnUnmount.value) return;
    void resetTabTitle();
  });
}
