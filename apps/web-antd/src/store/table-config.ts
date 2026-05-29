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
const SEARCH_FORM_CONFIG_KEYWORD = 'search_form_config_';
const TABLE_CONFIG_PAGE_SIZE = 999;

type UserSettingItem = UserSettingAdminApi.UserSettingDto;

export const useTableConfigStore = defineStore('table-config', () => {
  const userStore = useUserStore();
  const tableConfigMap = ref<Record<string, UserSettingItem>>({});
  const searchFormConfigMap = ref<Record<string, UserSettingItem>>({});
  const hasLoaded = ref(false);
  const searchFormHasLoaded = ref(false);
  const loadingPromise = ref<null | Promise<void>>(null);
  const searchFormLoadingPromise = ref<null | Promise<void>>(null);

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

  function setSearchFormConfigs(items: UserSettingItem[]) {
    const nextMap: Record<string, UserSettingItem> = {};
    items.forEach((item) => {
      if (!item?.name?.startsWith(SEARCH_FORM_CONFIG_KEYWORD)) {
        return;
      }
      nextMap[item.name] = item;
    });
    searchFormConfigMap.value = nextMap;
  }

  function upsertSearchFormConfig(item: UserSettingItem) {
    if (!item?.name?.startsWith(SEARCH_FORM_CONFIG_KEYWORD)) {
      return;
    }
    searchFormConfigMap.value = {
      ...searchFormConfigMap.value,
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

  function removeSearchFormConfigById(id: number) {
    if (!id) {
      return;
    }
    const nextMap: Record<string, UserSettingItem> = {};
    Object.entries(searchFormConfigMap.value).forEach(([name, item]) => {
      if (item.id !== id) {
        nextMap[name] = item;
      }
    });
    searchFormConfigMap.value = nextMap;
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

  async function loadSearchFormConfigsOnce(force = false) {
    if (searchFormHasLoaded.value && !force) {
      return;
    }
    if (searchFormLoadingPromise.value) {
      return await searchFormLoadingPromise.value;
    }
    searchFormLoadingPromise.value = (async () => {
      const creatorUserId = userStore.userInfo?.userId;
      const firstPage = await getUserSettingPagedList({
        CreatorUserId: creatorUserId,
        Keyword: SEARCH_FORM_CONFIG_KEYWORD,
        PageIndex: 1,
        PageSize: TABLE_CONFIG_PAGE_SIZE,
      });
      let items = [...(firstPage.items ?? [])];
      if ((firstPage.totalCount ?? 0) > TABLE_CONFIG_PAGE_SIZE) {
        const secondPage = await getUserSettingPagedList({
          CreatorUserId: creatorUserId,
          Keyword: SEARCH_FORM_CONFIG_KEYWORD,
          PageIndex: 2,
          PageSize: TABLE_CONFIG_PAGE_SIZE,
        });
        items = items.concat(secondPage.items ?? []);
      }
      setSearchFormConfigs(items);
      searchFormHasLoaded.value = true;
    })().finally(() => {
      searchFormLoadingPromise.value = null;
    });
    return await searchFormLoadingPromise.value;
  }

  function getTableConfigByName(name: string) {
    return tableConfigMap.value[name] ?? null;
  }

  function getSearchFormConfigByName(name: string) {
    return searchFormConfigMap.value[name] ?? null;
  }

  async function addTableConfig(payload: { name: string; setting: string }) {
    const id = await addUserSetting(payload);
    const item = {
      id,
      name: payload.name,
      setting: payload.setting,
    };
    upsertTableConfig(item);
    upsertSearchFormConfig(item);
    return id;
  }

  async function editTableConfig(payload: {
    id: number;
    name: string;
    setting: string;
  }) {
    await editUserSetting(payload);
    upsertTableConfig(payload);
    upsertSearchFormConfig(payload);
  }

  async function addSearchFormConfig(payload: {
    name: string;
    setting: string;
  }) {
    const id = await addUserSetting(payload);
    const item = {
      id,
      name: payload.name,
      setting: payload.setting,
    };
    upsertSearchFormConfig(item);
    upsertTableConfig(item);
    return id;
  }

  async function editSearchFormConfig(payload: {
    id: number;
    name: string;
    setting: string;
  }) {
    await editUserSetting(payload);
    upsertSearchFormConfig(payload);
    upsertTableConfig(payload);
  }

  async function removeTableConfig(id: number) {
    await deleteUserSetting(id);
    removeTableConfigById(id);
    removeSearchFormConfigById(id);
  }

  async function removeSearchFormConfig(id: number) {
    await deleteUserSetting(id);
    removeSearchFormConfigById(id);
    removeTableConfigById(id);
  }

  function $reset() {
    tableConfigMap.value = {};
    searchFormConfigMap.value = {};
    hasLoaded.value = false;
    searchFormHasLoaded.value = false;
    loadingPromise.value = null;
    searchFormLoadingPromise.value = null;
  }

  return {
    $reset,
    addSearchFormConfig,
    addTableConfig,
    editSearchFormConfig,
    editTableConfig,
    getSearchFormConfigByName,
    getTableConfigByName,
    hasLoaded,
    loadSearchFormConfigsOnce,
    loadTableConfigsOnce,
    removeSearchFormConfig,
    searchFormHasLoaded,
    removeTableConfig,
  };
});
