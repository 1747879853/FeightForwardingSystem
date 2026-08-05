import { defineComponent, h, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Checkbox, message, Modal } from 'ant-design-vue';

import { copyAirExport } from '#/api/air-export/air-export-admin';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

export interface AirExportCopySource {
  id: number | string;
  commissionNum?: null | string;
  mblNum?: null | string;
  flightNo?: null | string;
  contractNum?: null | string;
  clientName?: null | string;
}

/** 复制接口返回的新 id 可能被包一层 result/id，统一取字符串避免雪花 id 精度丢失 */
export function resolveAirExportCopyId(response: unknown): string {
  const resolved =
    (response as { id?: unknown; result?: unknown })?.result ??
    (response as { id?: unknown })?.id ??
    response;
  if (resolved === null || resolved === undefined) {
    return '';
  }
  return String(resolved).trim();
}

function pushCopySummaryLine(
  lines: string[],
  labelKey: string,
  value?: null | string,
) {
  const text = value?.trim();
  if (text) {
    lines.push(`${$t(labelKey)}：${text}`);
  }
}

export function buildCopyConfirmSummary(source: AirExportCopySource): string[] {
  const lines: string[] = [];
  pushCopySummaryLine(
    lines,
    'airExport.export.commissionNum',
    source.commissionNum,
  );
  pushCopySummaryLine(lines, 'airExport.export.mblNum', source.mblNum);
  pushCopySummaryLine(lines, 'airExport.export.flightNo', source.flightNo);
  pushCopySummaryLine(
    lines,
    'airExport.export.contractNum',
    source.contractNum,
  );
  pushCopySummaryLine(lines, 'airExport.export.clientId', source.clientName);
  if (lines.length === 0) {
    lines.push($t('airExport.export.copyFallbackUnnamed'));
  }
  return lines;
}

export function resolveAirExportCopyDisplayName(
  source: AirExportCopySource,
): string {
  return (
    source.commissionNum?.trim() ||
    source.mblNum?.trim() ||
    source.flightNo?.trim() ||
    source.clientName?.trim() ||
    $t('airExport.export.copyFallbackUnnamed')
  );
}

function confirmUnsavedBeforeCopy(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    Modal.confirm({
      title: $t('airExport.export.copyUnsavedTitle'),
      content: $t('airExport.export.copyUnsavedContent'),
      okText: $t('common.confirm'),
      cancelText: $t('common.cancel'),
      onOk: () => {
        settle(true);
      },
      onCancel: () => {
        settle(false);
      },
    });
  });
}

function confirmAirExportCopy(
  source: AirExportCopySource,
): Promise<null | { copyOrderFees: boolean }> {
  return new Promise((resolve) => {
    const summaryLines = buildCopyConfirmSummary(source);
    let getCopyOrderFees = () => false;

    const CopyConfirmContent = defineComponent({
      name: 'AirExportCopyConfirmContent',
      setup() {
        const copyOrderFees = ref(false);
        getCopyOrderFees = () => copyOrderFees.value;

        return () =>
          h('div', { class: 'air-export-copy-confirm' }, [
            h(
              'p',
              { style: 'margin-bottom: 8px;' },
              $t('airExport.export.copyConfirmIntro'),
            ),
            h(
              'ul',
              {
                style:
                  'margin: 0 0 12px; padding-left: 18px; color: rgba(0, 0, 0, 0.88);',
              },
              summaryLines.map((line) =>
                h('li', { style: 'margin-bottom: 4px;' }, line),
              ),
            ),
            h(
              'p',
              {
                style:
                  'margin-bottom: 12px; color: rgba(0, 0, 0, 0.65); font-size: 13px;',
              },
              $t('airExport.export.copyScopeHint'),
            ),
            h(
              'p',
              {
                style: 'margin-bottom: 12px; color: #d46b08; font-size: 13px;',
              },
              $t('airExport.export.copyOrgHint'),
            ),
            h(
              Checkbox,
              {
                checked: copyOrderFees.value,
                'onUpdate:checked': (checked: boolean) => {
                  copyOrderFees.value = checked;
                },
              },
              { default: () => $t('airExport.export.copyOrderFees') },
            ),
          ]);
      },
    });

    Modal.confirm({
      title: $t('airExport.export.copyConfirmTitle'),
      content: h(CopyConfirmContent),
      icon: null,
      width: 480,
      centered: true,
      okText: $t('common.confirm'),
      cancelText: $t('common.cancel'),
      async onOk() {
        await nextTick();
        resolve({ copyOrderFees: getCopyOrderFees() });
      },
      onCancel: () => {
        resolve(null);
      },
    });
  });
}

export function useAirExportCopy(options?: {
  checkDirty?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const copying = ref(false);

  const copyFrom = async (source: AirExportCopySource) => {
    if (options?.checkDirty) {
      const dirty = await options.checkDirty();
      if (dirty) {
        const confirmed = await confirmUnsavedBeforeCopy();
        if (!confirmed) {
          return;
        }
      }
    }

    const confirmResult = await confirmAirExportCopy(source);
    if (!confirmResult) {
      return;
    }

    const displayName = resolveAirExportCopyDisplayName(source);
    copying.value = true;
    const hideLoading = message.loading({
      content: $t('airExport.export.copying', [displayName]),
      duration: 0,
      key: 'air_export_copy_msg',
    });

    try {
      const response = await copyAirExport({
        id: String(source.id),
        copyOrderFees: confirmResult.copyOrderFees,
      });
      hideLoading();
      message.success({
        content: $t('airExport.export.copySuccess', [displayName]),
        key: 'air_export_copy_msg',
      });
      markListShouldRefresh('AirExportList');
      markListShouldRefresh('Workspace');

      const newId = resolveAirExportCopyId(response);
      await (newId
        ? router.replace(`/air-exports/${newId}/edit`)
        : router.replace('/air-exports'));
    } catch {
      hideLoading();
    } finally {
      copying.value = false;
    }
  };

  return {
    copying,
    copyFrom,
  };
}
