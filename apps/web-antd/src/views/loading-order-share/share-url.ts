import type { Router } from 'vue-router';

import type { LoadingShareLang } from './share-text';

export function buildLoadingOrderShareUrl(options: {
  lang?: LoadingShareLang;
  loadingOrderNum: string;
  mblNum: string;
  router: Router;
}) {
  const query: Record<string, string> = {
    mblNum: options.mblNum,
    loadingOrderNum: options.loadingOrderNum,
  };
  if (options.lang === 'en') {
    query.lang = 'en';
  }
  const { href } = options.router.resolve({
    name: 'LoadingOrderSharePage',
    query,
  });
  return `${window.location.origin}${href}`;
}

export async function copyTextToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.append(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
