import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

import { computed, onBeforeUnmount, toValue, watch } from 'vue';

import { useTabs } from '@vben/hooks';

import { $t } from '#/locales';

export function resolveSeaExportTabTitle(options: {
  commissionNum?: null | string;
  isSaved: boolean;
  mblNum?: null | string;
}): string {
  const base = $t('seaExport.export.title');
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

export function useSeaExportTabTitle(
  mblNum: ComputedRef<string | undefined> | Ref<string | undefined>,
  commissionNum: ComputedRef<string | undefined> | Ref<string | undefined>,
  isSaved: ComputedRef<boolean> | Ref<boolean>,
  options?: {
    /** false 时不改写/复位页签标题（业务联系单内嵌海出等场景） */
    enabled?: MaybeRefOrGetter<boolean>;
  },
) {
  const { resetTabTitle, setTabTitle } = useTabs();

  const enabled = computed(() => {
    if (options?.enabled === undefined) return true;
    return toValue(options.enabled);
  });

  const tabTitle = computed(() =>
    resolveSeaExportTabTitle({
      commissionNum: commissionNum.value,
      isSaved: isSaved.value,
      mblNum: mblNum.value,
    }),
  );

  watch(
    [tabTitle, enabled],
    ([title, isEnabled]) => {
      if (!isEnabled) return;
      void setTabTitle(title);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (!enabled.value) return;
    void resetTabTitle();
  });
}
