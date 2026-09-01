import type { ComputedRef, Ref } from 'vue';

import type { FeituoTerminalScheduleAdminApi } from '#/api/schedule/feituo-terminal-schedule-admin';

import { computed, ref } from 'vue';

import { message } from 'ant-design-vue';

import { queryTerminalScheduleAsync } from '#/api/schedule/feituo-terminal-schedule-admin';
import { $t } from '#/locales';

export type TerminalScheduleItem =
  FeituoTerminalScheduleAdminApi.TerminalScheduleItemDto;

export const TERMINAL_SCHEDULE_BIZ_TYPE = {
  SeaExport: 0,
  SeaImport: 1,
} as const;

export interface TerminalScheduleQueryInfo {
  bizType?: number;
  vessel?: null | string;
  innerVoyno?: null | string;
  terminalVoyno?: null | string;
  terminalVoynoConverted?: boolean;
  filteredByTerminalVoyno?: boolean;
  portName?: null | string;
  portCode?: null | string;
  message?: null | string;
}

/** 选中一条后要写到表单上的补丁；缺值的键不会出现，避免把原值覆盖成空 */
export interface TerminalScheduleFormPatch {
  /** 码头航次（港区航次）。飞驼 evoyage/ivoyage 只能填这里，不能填 innerVoyno */
  terminalVoyno?: string;
  atd?: string;
  closeVgmTime?: string;
  closeDocTime?: string;
  closeManifestTime?: string;
}

export interface UseTerminalScheduleSyncOptions {
  /** 业务单Id；新建态为空时不可查询 */
  transportOrderId: ComputedRef<string | undefined> | Ref<string | undefined>;
}

function hasText(value: null | string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * 按业务类型把飞驼条目映射成表单补丁。
 * 出口：实际开船 / 码头航次 / 截港 / 截单 / 截关；进口表单没有实际开船与截关类字段，只回填码头航次。
 * 不映射 etd（计划离港）和 eta/ata（抵达起运港）。
 * 不映射船公司航次 innerVoyno：evoyage/ivoyage 都是码头航次。
 */
export function buildTerminalScheduleFormPatch(
  item: TerminalScheduleItem,
  bizType?: number,
): TerminalScheduleFormPatch {
  const isImport = bizType === TERMINAL_SCHEDULE_BIZ_TYPE.SeaImport;
  const patch: TerminalScheduleFormPatch = {};
  const voyage = isImport ? item.ivoyage : item.evoyage;
  if (hasText(voyage)) patch.terminalVoyno = voyage.trim();
  if (!isImport && hasText(item.atd)) patch.atd = item.atd;
  if (!isImport && hasText(item.cyClosing)) patch.closeVgmTime = item.cyClosing;
  if (!isImport && hasText(item.portCloseDate)) {
    patch.closeDocTime = item.portCloseDate;
  }
  if (!isImport && hasText(item.customsCloseDate)) {
    patch.closeManifestTime = item.customsCloseDate;
  }
  return patch;
}

export function hasImportableFields(patch: TerminalScheduleFormPatch): boolean {
  return Object.keys(patch).length > 0;
}

/** 弹窗行定位键：查询接口不再下发 key，前端用条目字段拼一份稳定值 */
export function buildTerminalScheduleRowKey(
  item: TerminalScheduleItem,
  index: number,
): string {
  return [
    index,
    item.vesselNameEn,
    item.evoyage,
    item.ivoyage,
    item.terminal,
    item.etd,
    item.atd,
    item.cyClosing,
    item.updateTime,
  ]
    .map((value) => value ?? '')
    .join('|');
}

export type TerminalSchedulePickerRow = TerminalScheduleItem & {
  _rowKey: string;
};

export function useTerminalScheduleSync(
  options: UseTerminalScheduleSyncOptions,
) {
  const querying = ref(false);
  const pickerOpen = ref(false);
  const pickerItems = ref<TerminalSchedulePickerRow[]>([]);
  const queryInfo = ref<TerminalScheduleQueryInfo>({});

  const canSync = computed(() => Boolean(options.transportOrderId.value));

  /**
   * 查询码头船舶计划。有可引入字段才打开待选弹窗；否则只提示，不改表单。
   */
  const sync = async () => {
    const transportOrderId = options.transportOrderId.value;
    if (!transportOrderId) return;

    querying.value = true;
    try {
      const result = await queryTerminalScheduleAsync({ transportOrderId });

      queryInfo.value = {
        bizType: result?.bizType,
        vessel: result?.vessel,
        innerVoyno: result?.innerVoyno,
        terminalVoyno: result?.terminalVoyno,
        terminalVoynoConverted: result?.terminalVoynoConverted,
        filteredByTerminalVoyno: result?.filteredByTerminalVoyno,
        portName: result?.portName,
        portCode: result?.portCode,
        message: result?.message,
      };

      const items = result?.items ?? [];
      const importableItems = items.filter((item) =>
        hasImportableFields(
          buildTerminalScheduleFormPatch(item, result?.bizType),
        ),
      );

      if (importableItems.length === 0) {
        pickerOpen.value = false;
        pickerItems.value = [];
        message.warning(
          result?.message || $t('component.terminalSchedule.notFound'),
        );
        return;
      }

      pickerItems.value = importableItems.map((item, index) => ({
        ...item,
        _rowKey: buildTerminalScheduleRowKey(item, index),
      }));
      pickerOpen.value = true;
    } catch {
      // 错误文案由请求层统一提示
    } finally {
      querying.value = false;
    }
  };

  const closePicker = () => {
    pickerOpen.value = false;
  };

  return {
    canSync,
    closePicker,
    pickerItems,
    pickerOpen,
    queryInfo,
    sync,
    syncing: querying,
  };
}
