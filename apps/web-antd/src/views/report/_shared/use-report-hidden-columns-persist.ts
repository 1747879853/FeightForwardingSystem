import {
  addUserSetting,
  editUserSetting,
  getUserSettingPagedList,
} from '#/api/system/user-setting-admin';

/** 报表隐藏列用户设置前缀，完整键为 report_hidden_columns_${tableId} */
export const REPORT_HIDDEN_COLUMNS_PREFIX = 'report_hidden_columns_';

const SAVE_DEBOUNCE_MS = 120;

export function buildReportHiddenColumnsSettingName(tableId: string) {
  return `${REPORT_HIDDEN_COLUMNS_PREFIX}${tableId}`;
}

type HiddenColumnsSetting = {
  hiddenColumnKeys?: string[];
};

function parseHiddenColumnKeys(setting: string | undefined): string[] {
  if (!setting) return [];
  try {
    const parsed = JSON.parse(setting) as HiddenColumnsSetting;
    if (!Array.isArray(parsed?.hiddenColumnKeys)) return [];
    return parsed.hiddenColumnKeys
      .map((key) => String(key ?? '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 报表 Handsontable 手动隐藏列的 UserSetting 读写（按 tableId 隔离）。
 * EditAsync 只传 name + setting，与列表列配置协议一致。
 */
export function useReportHiddenColumnsPersist(getTableId: () => string) {
  let knownSettingId: null | number = null;
  let saveTimer: null | ReturnType<typeof setTimeout> = null;

  async function loadHiddenColumnKeys(): Promise<string[]> {
    const tableId = getTableId()?.trim();
    if (!tableId) return [];

    const name = buildReportHiddenColumnsSettingName(tableId);
    try {
      const page = await getUserSettingPagedList({
        Keyword: name,
        PageIndex: 1,
        PageSize: 50,
      });
      const item = (page.items ?? []).find((row) => row.name === name);
      if (!item) {
        knownSettingId = null;
        return [];
      }
      knownSettingId = item.id ?? null;
      return parseHiddenColumnKeys(item.setting);
    } catch (error) {
      console.warn('[report] load hidden columns setting failed:', error);
      return [];
    }
  }

  function scheduleSaveHiddenColumnKeys(keys: string[]) {
    const tableId = getTableId()?.trim();
    if (!tableId) return;

    const name = buildReportHiddenColumnsSettingName(tableId);
    const setting = JSON.stringify({
      hiddenColumnKeys: [...new Set(keys.map(String))],
    });

    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      try {
        if (knownSettingId) {
          await editUserSetting({ name, setting });
        } else {
          knownSettingId = await addUserSetting({ name, setting });
        }
      } catch (error) {
        console.warn('[report] save hidden columns setting failed:', error);
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function dispose() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  }

  return {
    dispose,
    loadHiddenColumnKeys,
    scheduleSaveHiddenColumnKeys,
  };
}
