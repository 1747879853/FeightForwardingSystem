import { buildBrandStorageKey } from '#/utils/brand-storage';

const PENDING_TAB_KEY_PREFIX = 'sea-export-edit-pending-tab';

function getPendingTabStorageKey(id: string) {
  return buildBrandStorageKey(`${PENDING_TAB_KEY_PREFIX}:${id}`);
}

/** 工作台「前往上传」等深链：进编辑页前写入，避免 query 被页签 key 吃掉后回落到会话记忆 */
export function setSeaExportEditPendingTab(id: string, tab: string) {
  if (!id || !tab) return;
  try {
    sessionStorage.setItem(getPendingTabStorageKey(id), tab);
  } catch {
    // sessionStorage 不可用时忽略
  }
}

export function consumeSeaExportEditPendingTab(
  id: string | undefined,
): string | null {
  if (!id) return null;
  try {
    const key = getPendingTabStorageKey(id);
    const raw = sessionStorage.getItem(key);
    if (raw == null || raw === '') return null;
    sessionStorage.removeItem(key);
    return raw;
  } catch {
    return null;
  }
}
