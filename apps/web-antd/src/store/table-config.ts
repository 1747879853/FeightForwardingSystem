import type { UserSettingAdminApi } from '#/api/system/user-setting-admin';

import { ref } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  addUserSetting,
  deleteUserSetting,
  editUserSetting,
  getUserSettingPagedList,
} from '#/api/system/user-setting-admin';

import { defineStore } from 'pinia';

const TABLE_CONFIG_KEYWORD = 'table_config_';
const TABLE_CONFIG_PAGE_SIZE = 999;

type UserSettingItem = UserSettingAdminApi.UserSettingDto;

export const useTableConfigStore = defineStore('table-config', () => {
  const userStore = useUserStore();
  const tableConfigMap = ref<Record<string, UserSettingItem>>({});
  const hasLoaded = ref(false);
  const loadingPromise = ref<null | Promise<void>>(null);

  function setTableConfigs(items: UserSettingItem[]) {
    const nextMap: Record<string, UserSettingItem> = {};
    items.forEach((item) => {
      if (!item?.name?.startsWith(TABLE_CONFIG_KEYWORD)) {
        return;
      }
      nextMap[item.name] = item;
    });
    tableConfigMap.value = nextMap;
  }

  function upsertTableConfig(item: UserSettingItem) {
    if (!item?.name?.startsWith(TABLE_CONFIG_KEYWORD)) {
      return;
    }
    tableConfigMap.value = {
      ...tableConfigMap.value,
      [item.name]: item,
    };
  }

  function removeTableConfigById(id: number) {
    if (!id) {
      return;
    }
    const nextMap: Record<string, UserSettingItem> = {};
    Object.entries(tableConfigMap.value).forEach(([name, item]) => {
      if (item.id !== id) {
        nextMap[name] = item;
      }
    });
    tableConfigMap.value = nextMap;
  }

  async function loadTableConfigsOnce(force = false) {
    if (hasLoaded.value && !force) {
      return;
    }
    if (loadingPromise.value) {
      return await loadingPromise.value;
    }
    loadingPromise.value = (async () => {
      const creatorUserId = userStore.userInfo?.userId;
      const firstPage = await getUserSettingPagedList({
        CreatorUserId: creatorUserId,
        Keyword: TABLE_CONFIG_KEYWORD,
        PageIndex: 1,
        PageSize: TABLE_CONFIG_PAGE_SIZE,
      });
      let items = [...(firstPage.items ?? [])];
      if ((firstPage.totalCount ?? 0) > TABLE_CONFIG_PAGE_SIZE) {
        const secondPage = await getUserSettingPagedList({
          CreatorUserId: creatorUserId,
          Keyword: TABLE_CONFIG_KEYWORD,
          PageIndex: 2,
          PageSize: TABLE_CONFIG_PAGE_SIZE,
        });
        items = items.concat(secondPage.items ?? []);
      }
      setTableConfigs(items);
      hasLoaded.value = true;
    })().finally(() => {
      loadingPromise.value = null;
    });
    return await loadingPromise.value;
  }

  function getTableConfigByName(name: string) {
    return tableConfigMap.value[name] ?? null;
  }

  async function addTableConfig(payload: { name: string; setting: string }) {
    const id = await addUserSetting(payload);
    upsertTableConfig({
      id,
      name: payload.name,
      setting: payload.setting,
    });
    return id;
  }

  async function editTableConfig(payload: {
    id: number;
    name: string;
    setting: string;
  }) {
    await editUserSetting(payload);
    upsertTableConfig(payload);
  }

  async function removeTableConfig(id: number) {
    await deleteUserSetting(id);
    removeTableConfigById(id);
  }

  function $reset() {
    tableConfigMap.value = {};
    hasLoaded.value = false;
    loadingPromise.value = null;
  }

  return {
    $reset,
    addTableConfig,
    editTableConfig,
    getTableConfigByName,
    hasLoaded,
    loadTableConfigsOnce,
    removeTableConfig,
  };
});
