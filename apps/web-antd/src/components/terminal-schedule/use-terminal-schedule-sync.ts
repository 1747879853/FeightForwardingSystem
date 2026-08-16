import type { ComputedRef, Ref } from 'vue';

import type { FeituoTerminalScheduleAdminApi } from '#/api/schedule/feituo-terminal-schedule-admin';

import { computed, ref } from 'vue';

import { message, notification } from 'ant-design-vue';

import { syncTerminalScheduleAsync } from '#/api/schedule/feituo-terminal-schedule-admin';
import { $t } from '#/locales';

type ScheduleItem = FeituoTerminalScheduleAdminApi.TerminalScheduleItemDto;
type SyncResult = FeituoTerminalScheduleAdminApi.SyncTerminalScheduleResultDto;

export interface TerminalScheduleQueryInfo {
  vessel?: null | string;
  voyage?: null | string;
  portName?: null | string;
  portCode?: null | string;
  /** E 出口 / I 进口，决定待选列表里航次取 evoyage 还是 ivoyage */
  isExport?: null | string;
}

export interface UseTerminalScheduleSyncOptions {
  /** 业务单Id；新建态为空时不可同步 */
  transportOrderId: ComputedRef<string | undefined> | Ref<string | undefined>;
  /** 回填成功后的刷新回调，需重新拉取详情 */
  onApplied: () => Promise<void> | void;
}

function buildFilledFieldsDescription(
  filledFields: FeituoTerminalScheduleAdminApi.TerminalScheduleFilledFieldDto[],
): string {
  const emptyText = $t('component.terminalSchedule.emptyValue');
  return filledFields
    .map((field) => {
      const label = field.fieldLabel || field.fieldName || '';
      const oldValue = field.oldValue ?? emptyText;
      const newValue = field.newValue ?? emptyText;
      return `${label}：${oldValue} → ${newValue}`;
    })
    .join('\n');
}

export function useTerminalScheduleSync(
  options: UseTerminalScheduleSyncOptions,
) {
  const syncing = ref(false);
  const pickerOpen = ref(false);
  const pickerItems = ref<ScheduleItem[]>([]);
  const queryInfo = ref<TerminalScheduleQueryInfo>({});

  const canSync = computed(() => Boolean(options.transportOrderId.value));

  const notifyApplied = (result: SyncResult) => {
    const filledFields = result.filledFields ?? [];
    notification.success({
      message: $t('component.terminalSchedule.appliedTitle'),
      description:
        filledFields.length > 0
          ? buildFilledFieldsDescription(filledFields)
          : result.message || $t('component.terminalSchedule.noFieldFilled'),
      duration: 6,
      style: { whiteSpace: 'pre-line' },
    });
  };

  /**
   * 调用同步接口。首次不传 selectedKey；用户在待选列表选定后带 key 再调一次。
   * 接口会写库，applied 为 true 时必须刷新单据。
   */
  const run = async (selectedKey?: string) => {
    const transportOrderId = options.transportOrderId.value;
    if (!transportOrderId) return;

    syncing.value = true;
    try {
      const result = await syncTerminalScheduleAsync({
        transportOrderId,
        ...(selectedKey ? { selectedKey } : {}),
      });

      queryInfo.value = {
        vessel: result?.vessel,
        voyage: result?.voyage,
        portName: result?.portName,
        portCode: result?.portCode,
        isExport: result?.isExport,
      };

      const items = result?.items ?? [];

      if (items.length === 0) {
        pickerOpen.value = false;
        pickerItems.value = [];
        message.warning(
          result?.message || $t('component.terminalSchedule.notFound'),
        );
        return;
      }

      // needSelect 时后端一个字段都没写，只开待选列表，不刷新单据
      if (result?.needSelect) {
        pickerItems.value = items;
        pickerOpen.value = true;
        return;
      }

      if (result?.applied) {
        pickerOpen.value = false;
        pickerItems.value = [];
        notifyApplied(result);
        await options.onApplied();
        return;
      }

      pickerOpen.value = false;
      pickerItems.value = [];
      if (result?.message) {
        message.info(result.message);
      }
    } catch {
      // 错误文案由请求层统一提示；带 key 的二次调用失败时（如飞驼数据已变化）
      // 关闭待选列表，让用户重新走首次查询流程
      if (selectedKey) {
        pickerOpen.value = false;
        pickerItems.value = [];
      }
    } finally {
      syncing.value = false;
    }
  };

  const sync = () => run();

  const confirmPick = (selectedKey: string) => run(selectedKey);

  const closePicker = () => {
    pickerOpen.value = false;
  };

  return {
    canSync,
    closePicker,
    confirmPick,
    pickerItems,
    pickerOpen,
    queryInfo,
    sync,
    syncing,
  };
}
