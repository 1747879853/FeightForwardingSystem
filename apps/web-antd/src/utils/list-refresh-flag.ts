import { onActivated } from 'vue';

const STORAGE_PREFIX = 'list-refresh:';

/** 表单保存成功后标记对应列表页需要在下次激活时刷新 */
export function markListShouldRefresh(listRouteName: string) {
  sessionStorage.setItem(`${STORAGE_PREFIX}${listRouteName}`, '1');
}

/** 读取并清除刷新标记，避免重复刷新 */
export function consumeListShouldRefresh(listRouteName: string): boolean {
  const key = `${STORAGE_PREFIX}${listRouteName}`;
  if (sessionStorage.getItem(key) === '1') {
    sessionStorage.removeItem(key);
    return true;
  }
  return false;
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
