import type { ComputedRef, Ref } from 'vue';

import { computed, onBeforeUnmount, watch } from 'vue';

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
) {
  const { resetTabTitle, setTabTitle } = useTabs();

  const tabTitle = computed(() =>
    resolveSeaExportTabTitle({
      commissionNum: commissionNum.value,
      isSaved: isSaved.value,
      mblNum: mblNum.value,
    }),
  );

  watch(
    tabTitle,
    (title) => {
      void setTabTitle(title);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    void resetTabTitle();
  });
}
