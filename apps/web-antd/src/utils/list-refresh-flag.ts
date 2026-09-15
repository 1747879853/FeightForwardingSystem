import { onActivated } from 'vue';

const STORAGE_PREFIX = 'list-refresh:';
const ENTITY_PREFIX = 'entity-refresh:';

function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string, on: boolean) {
  try {
    if (on) {
      sessionStorage.setItem(key, '1');
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // sessionStorage 不可用时忽略，不影响主流程
  }
}

function entityRefreshKey(scope: string, id: number | string) {
  return `${ENTITY_PREFIX}${scope}:${id}`;
}

/** 表单保存成功后标记对应列表页需要在下次激活时刷新 */
export function markListShouldRefresh(listRouteName: string) {
  writeSessionFlag(`${STORAGE_PREFIX}${listRouteName}`, true);
}

/** 读取并清除刷新标记，避免重复刷新 */
export function consumeListShouldRefresh(listRouteName: string): boolean {
  const key = `${STORAGE_PREFIX}${listRouteName}`;
  if (!readSessionFlag(key)) return false;
  writeSessionFlag(key, false);
  return true;
}

/**
 * 列表侧改过票（如批量修改）后标记详情 KeepAlive 页下次激活要重拉。
 * `scope` 用业务名，如 `SeaExport`，避免各模块 id 撞车。
 */
export function markEntitiesShouldRefresh(
  scope: string,
  ids: Array<number | string | null | undefined>,
) {
  for (const id of ids) {
    if (id === null || id === undefined || id === '') continue;
    writeSessionFlag(entityRefreshKey(scope, id), true);
  }
}

export function peekEntityShouldRefresh(
  scope: string,
  id: number | string | null | undefined,
): boolean {
  if (id === null || id === undefined || id === '') return false;
  return readSessionFlag(entityRefreshKey(scope, id));
}

/** 真正开始拉详情时清掉标记，避免 KeepAlive 反复请求 */
export function consumeEntityShouldRefresh(
  scope: string,
  id: number | string | null | undefined,
): boolean {
  if (id === null || id === undefined || id === '') return false;
  const key = entityRefreshKey(scope, id);
  if (!readSessionFlag(key)) return false;
  writeSessionFlag(key, false);
  return true;
}

/** 列表页：仅在表单保存后返回时刷新，标签切换不请求接口 */
export function useRefreshListOnFormReturn(
  listRouteName: string,
  refresh: () => void,
) {
  onActivated(() => {
    if (consumeListShouldRefresh(listRouteName)) {
      refresh();
    }
  });
}

/** 保存成功并返回列表时使用 */
export function returnToListWithRefresh(
  listRouteName: string,
  navigate: () => void,
) {
  markListShouldRefresh(listRouteName);
  navigate();
}
