import { ref, type Ref } from 'vue';

import { useTableConfigStore } from '#/store/table-config';
import { isFreightRateBatchDefaultVisibleColumn } from '../../data';

/** 与 vxe columnPersist 对齐的精简结构（Handsontable 用 data 字段作列键） */
export type HotColumnPersistSetting = {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  columnFixed: Record<string, 'left' | 'right' | false>;
};

export type HotColumnConfigItem = {
  data: string;
  title?: string;
  visible: boolean;
  fixed?: 'left' | 'right' | false;
  order: number;
};

const TABLE_CONFIG_PREFIX = 'table_config_';

function toUserSettingKey(tableId: string) {
  return `${TABLE_CONFIG_PREFIX}${tableId}`;
}

/** 兼容旧 vxe 键 `field:xxx` → `xxx` */
function normalizeColumnKey(raw: string): string {
  const key = String(raw ?? '').trim();
  if (key.startsWith('field:')) {
    return key.slice('field:'.length);
  }
  return key;
}

function parseSetting(raw: string): HotColumnPersistSetting | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, any>;
    const columnVisibility: Record<string, boolean> = {};
    const columnFixed: Record<string, 'left' | 'right' | false> = {};
    const columnOrder: string[] = [];

    const orderSource: string[] = Array.isArray(parsed.columnOrder)
      ? parsed.columnOrder
      : Array.isArray(parsed.visibleColumnKeys)
        ? parsed.visibleColumnKeys
        : [];

    orderSource.forEach((rawKey) => {
      const key = normalizeColumnKey(rawKey);
      if (key && !columnOrder.includes(key)) {
        columnOrder.push(key);
      }
    });

    const visibilitySrc =
      parsed.columnVisibility && typeof parsed.columnVisibility === 'object'
        ? parsed.columnVisibility
        : {};
    Object.entries(visibilitySrc).forEach(([rawKey, value]) => {
      const key = normalizeColumnKey(rawKey);
      if (key) {
        columnVisibility[key] = value !== false;
      }
    });

    if (
      Object.keys(columnVisibility).length === 0 &&
      Array.isArray(parsed.visibleColumnKeys)
    ) {
      const visibleSet = new Set(
        parsed.visibleColumnKeys.map((k: string) => normalizeColumnKey(k)),
      );
      columnOrder.forEach((key) => {
        columnVisibility[key] = visibleSet.has(key);
      });
    }

    const fixedSrc =
      parsed.columnFixed && typeof parsed.columnFixed === 'object'
        ? parsed.columnFixed
        : {};
    Object.entries(fixedSrc).forEach(([rawKey, value]) => {
      const key = normalizeColumnKey(rawKey);
      if (!key) return;
      if (value === 'left' || value === 'right') {
        columnFixed[key] = value;
      } else {
        columnFixed[key] = false;
      }
    });

    if (
      columnOrder.length === 0 &&
      Object.keys(columnVisibility).length === 0
    ) {
      return null;
    }

    return { columnOrder, columnVisibility, columnFixed };
  } catch {
    return null;
  }
}

export function serializeHotColumnConfig(
  columns: HotColumnConfigItem[],
): HotColumnPersistSetting {
  const sorted = [...columns].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
  const columnOrder: string[] = [];
  const columnVisibility: Record<string, boolean> = {};
  const columnFixed: Record<string, 'left' | 'right' | false> = {};

  sorted.forEach((col) => {
    const key = String(col.data ?? '').trim();
    if (!key) return;
    columnOrder.push(key);
    columnVisibility[key] = col.visible !== false;
    if (col.fixed === 'left' || col.fixed === 'right') {
      columnFixed[key] = col.fixed;
    } else {
      columnFixed[key] = false;
    }
  });

  return { columnOrder, columnVisibility, columnFixed };
}

export type HotUserColumnConfigEntry = {
  visible: boolean;
  fixed: 'left' | 'right' | false;
  order: number;
};

/** 无用户配置时，按产品默认白名单生成显隐 Map */
export function buildFreightRateBatchDefaultColumnConfig(
  columns: Array<{ data?: string }>,
): Map<string, HotUserColumnConfigEntry> {
  const map = new Map<string, HotUserColumnConfigEntry>();
  columns.forEach((col, index) => {
    const key = String(col.data ?? '').trim();
    if (!key) return;
    map.set(key, {
      visible: isFreightRateBatchDefaultVisibleColumn(key),
      fixed: false,
      order: index,
    });
  });
  return map;
}

/**
 * 运价批量新增/编辑 Handsontable 列配置持久化。
 * 复用全站 `useTableConfigStore`（UserSetting `table_config_${tableId}`）。
 */
export function useBatchAddColumnPersist(
  tableId: Ref<string> | (() => string),
) {
  const tableConfigStore = useTableConfigStore();
  const userSettingId = ref<number | null>(null);

  function resolveTableId() {
    return typeof tableId === 'function' ? tableId() : tableId.value;
  }

  function settingToMap(
    setting: HotColumnPersistSetting,
  ): Map<string, HotUserColumnConfigEntry> {
    const map = new Map<string, HotUserColumnConfigEntry>();

    const orderIndex = new Map<string, number>();
    setting.columnOrder.forEach((key, index) => {
      orderIndex.set(key, index);
    });

    const allKeys = new Set([
      ...setting.columnOrder,
      ...Object.keys(setting.columnVisibility),
      ...Object.keys(setting.columnFixed),
    ]);

    allKeys.forEach((key) => {
      map.set(key, {
        visible: setting.columnVisibility[key] !== false,
        fixed: setting.columnFixed[key] ?? false,
        order: orderIndex.get(key) ?? 999,
      });
    });

    return map;
  }

  async function loadColumnConfig(): Promise<Map<
    string,
    HotUserColumnConfigEntry
  > | null> {
    const id = resolveTableId();
    if (!id) return null;

    await tableConfigStore.loadTableConfigsOnce();
    const keyword = toUserSettingKey(id);
    const hit = tableConfigStore.getTableConfigByName(keyword);
    if (!hit?.setting) {
      userSettingId.value = null;
      return null;
    }

    userSettingId.value = hit.id ?? null;
    const parsed = parseSetting(hit.setting);
    if (!parsed) return null;
    return settingToMap(parsed);
  }

  async function saveColumnConfig(columns: HotColumnConfigItem[]) {
    const id = resolveTableId();
    if (!id) return;

    const setting = JSON.stringify(serializeHotColumnConfig(columns));
    const name = toUserSettingKey(id);

    if (userSettingId.value) {
      await tableConfigStore.editTableConfig({
        id: userSettingId.value,
        name,
        setting,
      });
      return;
    }

    userSettingId.value = await tableConfigStore.addTableConfig({
      name,
      setting,
    });
  }

  return {
    loadColumnConfig,
    saveColumnConfig,
    userSettingId,
  };
}
