import { ref, type Ref } from 'vue';

import { useTableConfigStore } from '#/store/table-config';

/**
 * 报表 Handsontable 列配置持久化结构。
 * 与运价批量页 / vxe columnPersist 对齐：UserSetting `table_config_${tableId}`。
 */
export type ReportColumnPersistSetting = {
  /** 右键「隐藏列」记住的列 data 键 */
  hiddenColumnKeys: string[];
  /** 列顺序（可选，供列配置弹窗） */
  columnOrder?: string[];
  /** 列显隐（可选；未出现的键视为可见） */
  columnVisibility?: Record<string, boolean>;
  /** 列固定（可选） */
  columnFixed?: Record<string, 'left' | 'right' | false>;
};

const TABLE_CONFIG_PREFIX = 'table_config_';

function toUserSettingKey(tableId: string) {
  return `${TABLE_CONFIG_PREFIX}${tableId}`;
}

function parseSetting(raw: string): ReportColumnPersistSetting | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, any>;
    const hiddenColumnKeys: string[] = [];
    const hiddenSrc = Array.isArray(parsed.hiddenColumnKeys)
      ? parsed.hiddenColumnKeys
      : [];
    hiddenSrc.forEach((key: unknown) => {
      const k = String(key ?? '').trim();
      if (k && !hiddenColumnKeys.includes(k)) {
        hiddenColumnKeys.push(k);
      }
    });

    const columnOrder: string[] = [];
    const orderSrc = Array.isArray(parsed.columnOrder)
      ? parsed.columnOrder
      : [];
    orderSrc.forEach((key: unknown) => {
      const k = String(key ?? '').trim();
      if (k && !columnOrder.includes(k)) {
        columnOrder.push(k);
      }
    });

    const columnVisibility: Record<string, boolean> = {};
    if (
      parsed.columnVisibility &&
      typeof parsed.columnVisibility === 'object'
    ) {
      Object.entries(parsed.columnVisibility).forEach(([key, value]) => {
        const k = String(key ?? '').trim();
        if (k) {
          columnVisibility[k] = value !== false;
        }
      });
    }

    const columnFixed: Record<string, 'left' | 'right' | false> = {};
    if (parsed.columnFixed && typeof parsed.columnFixed === 'object') {
      Object.entries(parsed.columnFixed).forEach(([key, value]) => {
        const k = String(key ?? '').trim();
        if (!k) return;
        columnFixed[k] = value === 'left' || value === 'right' ? value : false;
      });
    }

    return {
      hiddenColumnKeys,
      columnOrder: columnOrder.length > 0 ? columnOrder : undefined,
      columnVisibility:
        Object.keys(columnVisibility).length > 0 ? columnVisibility : undefined,
      columnFixed:
        Object.keys(columnFixed).length > 0 ? columnFixed : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 报表列配置持久化：隐藏列 + 可选显隐/顺序/固定。
 * 复用全站 `useTableConfigStore`。
 */
export function useReportColumnPersist(tableId: Ref<string> | (() => string)) {
  const tableConfigStore = useTableConfigStore();
  const userSettingId = ref<number | null>(null);
  /** 最近一次成功加载/保存的完整 setting，保存隐藏列时保留其它字段 */
  const lastSetting = ref<ReportColumnPersistSetting>({
    hiddenColumnKeys: [],
  });

  function resolveTableId() {
    return typeof tableId === 'function' ? tableId() : tableId.value;
  }

  async function loadColumnPersist(): Promise<ReportColumnPersistSetting | null> {
    const id = resolveTableId();
    if (!id) return null;

    await tableConfigStore.loadTableConfigsOnce();
    const keyword = toUserSettingKey(id);
    const hit = tableConfigStore.getTableConfigByName(keyword);
    if (!hit?.setting) {
      userSettingId.value = null;
      lastSetting.value = { hiddenColumnKeys: [] };
      return null;
    }

    userSettingId.value = hit.id ?? null;
    const parsed = parseSetting(hit.setting);
    if (!parsed) {
      lastSetting.value = { hiddenColumnKeys: [] };
      return null;
    }
    lastSetting.value = parsed;
    return parsed;
  }

  async function saveColumnPersist(patch: Partial<ReportColumnPersistSetting>) {
    const id = resolveTableId();
    if (!id) return;

    const next: ReportColumnPersistSetting = {
      ...lastSetting.value,
      ...patch,
      hiddenColumnKeys:
        patch.hiddenColumnKeys ?? lastSetting.value.hiddenColumnKeys ?? [],
    };
    lastSetting.value = next;

    const setting = JSON.stringify(next);
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

  async function clearColumnPersist() {
    const id = resolveTableId();
    if (!id) return;

    lastSetting.value = { hiddenColumnKeys: [] };

    if (userSettingId.value) {
      await tableConfigStore.removeTableConfig(userSettingId.value);
      userSettingId.value = null;
    }
  }

  return {
    loadColumnPersist,
    saveColumnPersist,
    clearColumnPersist,
    userSettingId,
    lastSetting,
  };
}
