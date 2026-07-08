import type { Ref } from 'vue';

import dayjs from 'dayjs';
import { computed, ref } from 'vue';

import { message } from 'ant-design-vue';

import { getSeaExportDates } from '#/api/sea-export/sea-export-admin';
import { $t } from '#/locales';

type FormApiLike = {
  getValues: () => Promise<Record<string, any>>;
  setFieldValue: (field: string, value: any) => Promise<void> | void;
};

export interface UseSyncShipmentDatesOptions {
  vessel: Ref<string>;
  innerVoyno: Ref<string>;
  etd: Ref<unknown>;
  basicInfoFormApi: FormApiLike;
  shipmentFormApi: FormApiLike;
}

function formatEtdQueryParam(etd: unknown): string | undefined {
  if (etd == null || etd === '') return undefined;
  const parsed = dayjs(etd as string | Date);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
}

function toDayjsField(val: string | null | undefined) {
  if (val == null) return undefined;
  const parsed = dayjs(val);
  return parsed.isValid() ? parsed : undefined;
}

export function useSyncShipmentDates(options: UseSyncShipmentDatesOptions) {
  const loading = ref(false);
  let requestSeq = 0;

  const canSync = computed(
    () =>
      Boolean(options.vessel.value) &&
      Boolean(options.innerVoyno.value) &&
      formatEtdQueryParam(options.etd.value) != null,
  );

  const disabledTip = computed(() =>
    canSync.value
      ? $t('seaExport.syncShipmentDates.sync')
      : $t('seaExport.syncShipmentDates.missingParams'),
  );

  const refreshParamsFromForms = async () => {
    const [basicValues, shipmentValues] = await Promise.all([
      options.basicInfoFormApi.getValues(),
      options.shipmentFormApi.getValues(),
    ]);
    options.vessel.value = String(basicValues.vessel ?? '').trim();
    options.innerVoyno.value = String(basicValues.innerVoyno ?? '').trim();
    options.etd.value = shipmentValues.etd;
  };

  const syncDates = async () => {
    await refreshParamsFromForms();
    if (!canSync.value) {
      message.warning($t('seaExport.syncShipmentDates.missingParams'));
      return;
    }

    const currentSeq = ++requestSeq;
    loading.value = true;
    try {
      const result = await getSeaExportDates({
        vessel: options.vessel.value,
        innerVoyno: options.innerVoyno.value,
        etd: formatEtdQueryParam(options.etd.value)!,
      });

      if (currentSeq !== requestSeq) return;
      if (!result) return;

      const updates: Array<[string, ReturnType<typeof toDayjsField>]> = [];
      if (result.atd != null) updates.push(['atd', toDayjsField(result.atd)]);
      if (result.eta != null) updates.push(['eta', toDayjsField(result.eta)]);
      if (result.closeVgmTime != null) {
        updates.push(['closeVgmTime', toDayjsField(result.closeVgmTime)]);
      }
      if (result.closeDocTime != null) {
        updates.push(['closeDocTime', toDayjsField(result.closeDocTime)]);
      }
      if (result.closeManifestTime != null) {
        updates.push([
          'closeManifestTime',
          toDayjsField(result.closeManifestTime),
        ]);
      }

      for (const [field, value] of updates) {
        if (value !== undefined) {
          await options.shipmentFormApi.setFieldValue(field, value);
        }
      }

      if (updates.length > 0) {
        message.success($t('seaExport.syncShipmentDates.success'));
      }
    } catch (error: any) {
      if (currentSeq !== requestSeq) return;
      message.error(error?.message || $t('seaExport.syncShipmentDates.failed'));
    } finally {
      if (currentSeq === requestSeq) {
        loading.value = false;
      }
    }
  };

  return {
    canSync,
    disabledTip,
    loading,
    refreshParamsFromForms,
    syncDates,
  };
}
