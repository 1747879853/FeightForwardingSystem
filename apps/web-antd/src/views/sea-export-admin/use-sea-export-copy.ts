import { defineComponent, h, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Checkbox, Modal, message } from 'ant-design-vue';

import { copySeaExport } from '#/api/sea-export/sea-export-admin';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

export interface SeaExportCopySource {
  id: number | string;
  commissionNum?: null | string;
  mblNum?: null | string;
  bookingNum?: null | string;
  contractNum?: null | string;
  clientName?: null | string;
}

export function resolveSeaExportCopyId(response: unknown): string {
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

export function buildCopyConfirmSummary(source: SeaExportCopySource): string[] {
  const lines: string[] = [];
  pushCopySummaryLine(
    lines,
    'seaExport.export.commissionNum',
    source.commissionNum,
  );
  pushCopySummaryLine(lines, 'seaExport.export.mblNum', source.mblNum);
  pushCopySummaryLine(lines, 'seaExport.export.bookingNum', source.bookingNum);
  pushCopySummaryLine(
    lines,
    'seaExport.export.contractNum',
    source.contractNum,
  );
  pushCopySummaryLine(lines, 'seaExport.export.clientId', source.clientName);
  if (lines.length === 0) {
    lines.push($t('seaExport.export.copyFallbackUnnamed'));
  }
  return lines;
}

export function resolveSeaExportCopyDisplayName(
  source: SeaExportCopySource,
): string {
  return (
    source.commissionNum?.trim() ||
    source.mblNum?.trim() ||
    source.bookingNum?.trim() ||
    source.clientName?.trim() ||
    $t('seaExport.export.copyFallbackUnnamed')
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
      title: $t('seaExport.export.copyUnsavedTitle'),
      content: $t('seaExport.export.copyUnsavedContent'),
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

function confirmSeaExportCopy(
  source: SeaExportCopySource,
): Promise<{ copyOrderFees: boolean } | null> {
  return new Promise((resolve) => {
    const summaryLines = buildCopyConfirmSummary(source);
    let getCopyOrderFees = () => false;

    const CopyConfirmContent = defineComponent({
      name: 'SeaExportCopyConfirmContent',
      setup() {
        const copyOrderFees = ref(false);
        getCopyOrderFees = () => copyOrderFees.value;

        return () =>
          h('div', { class: 'sea-export-copy-confirm' }, [
            h(
              'p',
              { style: 'margin-bottom: 8px;' },
              $t('seaExport.export.copyConfirmIntro'),
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
              $t('seaExport.export.copyScopeHint'),
            ),
            h(
              Checkbox,
              {
                checked: copyOrderFees.value,
                'onUpdate:checked': (checked: boolean) => {
                  copyOrderFees.value = checked;
                },
              },
              { default: () => $t('seaExport.export.copyOrderFees') },
            ),
          ]);
      },
    });

    Modal.confirm({
      title: $t('seaExport.export.copyConfirmTitle'),
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

export function useSeaExportCopy(options?: {
  checkDirty?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const copying = ref(false);

  const copyFrom = async (source: SeaExportCopySource) => {
    if (options?.checkDirty) {
      const dirty = await options.checkDirty();
      if (dirty) {
        const confirmed = await confirmUnsavedBeforeCopy();
        if (!confirmed) {
          return;
        }
      }
    }

    const confirmResult = await confirmSeaExportCopy(source);
    if (!confirmResult) {
      return;
    }

    const displayName = resolveSeaExportCopyDisplayName(source);
    copying.value = true;
    const hideLoading = message.loading({
      content: $t('seaExport.export.copying', [displayName]),
      duration: 0,
      key: 'sea_export_copy_msg',
    });

    try {
      const response = await copySeaExport({
        id: String(source.id),
        copyOrderFees: confirmResult.copyOrderFees,
      });
      hideLoading();
      message.success({
        content: $t('seaExport.export.copySuccess', [displayName]),
        key: 'sea_export_copy_msg',
      });
      markListShouldRefresh('SeaExportList');
      markListShouldRefresh('Workspace');

      const newId = resolveSeaExportCopyId(response);
      if (newId) {
        await router.replace(`/sea-exports/${newId}/edit`);
      } else {
        await router.replace('/sea-exports');
      }
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
