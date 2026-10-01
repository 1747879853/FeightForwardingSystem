import { computed, ref, unref, watch, type MaybeRef } from 'vue';

import {
  getShareCompanyLogo,
  ShareCompanyLogoScene,
} from '#/api/share/share-company-logo';
import { brandLogo, brandLogoText } from '#/utils/brand-assets';

const brandHeaderLogo = brandLogoText || brandLogo;

/**
 * 分享页和轨迹弹窗页头：按场景和单号取所属公司 Logo。
 * 没有单号、接口失败或公司没上传时，回退到当前品牌图。
 */
export function useShareHeaderLogo(
  scene: MaybeRef<ShareCompanyLogoScene>,
  billNo: MaybeRef<null | string | undefined>,
) {
  const companyLogo = ref('');
  let requestSeq = 0;

  watch(
    () => [unref(scene), (unref(billNo) ?? '').trim()] as const,
    ([sceneValue, no]) => {
      const seq = ++requestSeq;
      companyLogo.value = '';
      if (!no) return;
      void getShareCompanyLogo(sceneValue, no)
        .then((result) => {
          if (seq !== requestSeq) return;
          companyLogo.value = result?.companyLogo?.trim() ?? '';
        })
        .catch(() => {
          if (seq !== requestSeq) return;
          companyLogo.value = '';
        });
    },
    { immediate: true },
  );

  const headerLogo = computed(() => companyLogo.value || brandHeaderLogo);

  function onLogoError() {
    if (companyLogo.value) {
      companyLogo.value = '';
    }
  }

  return { headerLogo, onLogoError };
}
