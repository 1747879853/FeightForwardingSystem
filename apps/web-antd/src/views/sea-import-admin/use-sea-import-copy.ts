import { defineComponent, h, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Checkbox, message, Modal } from 'ant-design-vue';

import { copySeaImport } from '#/api/sea-import/sea-import-admin';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

export interface SeaImportCopySource {
  id: number | string;
  commissionNum?: null | string;
  mblNum?: null | string;
  bookingNum?: null | string;
  contractNum?: null | string;
  clientName?: null | string;
}

/** 复制接口返回的新 id 可能被包一层 result/id，统一取字符串避免雪花 id 精度丢失 */
export function resolveSeaImportCopyId(response: unknown): string {
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

export function buildCopyConfirmSummary(source: SeaImportCopySource): string[] {
  const lines: string[] = [];
  pushCopySummaryLine(
    lines,
    'seaImport.import.commissionNum',
    source.commissionNum,
  );
  pushCopySummaryLine(lines, 'seaImport.import.mblNum', source.mblNum);
  pushCopySummaryLine(lines, 'seaImport.import.bookingNum', source.bookingNum);
  pushCopySummaryLine(
    lines,
    'seaImport.import.contractNum',
    source.contractNum,
  );
  pushCopySummaryLine(lines, 'seaImport.import.clientId', source.clientName);
  if (lines.length === 0) {
    lines.push($t('seaImport.import.copyFallbackUnnamed'));
  }
  return lines;
}

export function resolveSeaImportCopyDisplayName(
  source: SeaImportCopySource,
): string {
  return (
    source.commissionNum?.trim() ||
    source.mblNum?.trim() ||
    source.bookingNum?.trim() ||
    source.clientName?.trim() ||
    $t('seaImport.import.copyFallbackUnnamed')
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
      title: $t('seaImport.import.copyUnsavedTitle'),
      content: $t('seaImport.import.copyUnsavedContent'),
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

function confirmSeaImportCopy(
  source: SeaImportCopySource,
): Promise<null | { copyOrderFees: boolean }> {
  return new Promise((resolve) => {
    const summaryLines = buildCopyConfirmSummary(source);
    let getCopyOrderFees = () => false;

    const CopyConfirmContent = defineComponent({
      name: 'SeaImportCopyConfirmContent',
      setup() {
        const copyOrderFees = ref(false);
        getCopyOrderFees = () => copyOrderFees.value;

        return () =>
          h('div', { class: 'sea-import-copy-confirm' }, [
            h(
              'p',
              { style: 'margin-bottom: 8px;' },
              $t('seaImport.import.copyConfirmIntro'),
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
              $t('seaImport.import.copyScopeHint'),
            ),
            h(
              'p',
              {
                style: 'margin-bottom: 12px; color: #d46b08; font-size: 13px;',
              },
              $t('seaImport.import.copyOrgHint'),
            ),
            h(
              Checkbox,
              {
                checked: copyOrderFees.value,
                'onUpdate:checked': (checked: boolean) => {
                  copyOrderFees.value = checked;
                },
              },
              { default: () => $t('seaImport.import.copyOrderFees') },
            ),
          ]);
      },
    });

    Modal.confirm({
      title: $t('seaImport.import.copyConfirmTitle'),
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

export function useSeaImportCopy(options?: {
  checkDirty?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const copying = ref(false);

  const copyFrom = async (source: SeaImportCopySource) => {
    if (options?.checkDirty) {
      const dirty = await options.checkDirty();
      if (dirty) {
        const confirmed = await confirmUnsavedBeforeCopy();
        if (!confirmed) {
          return;
        }
      }
    }

    const confirmResult = await confirmSeaImportCopy(source);
    if (!confirmResult) {
      return;
    }

    const displayName = resolveSeaImportCopyDisplayName(source);
    copying.value = true;
    const hideLoading = message.loading({
      content: $t('seaImport.import.copying', [displayName]),
      duration: 0,
      key: 'sea_import_copy_msg',
    });

    try {
      const response = await copySeaImport({
        id: String(source.id),
        copyOrderFees: confirmResult.copyOrderFees,
      });
      hideLoading();
      message.success({
        content: $t('seaImport.import.copySuccess', [displayName]),
        key: 'sea_import_copy_msg',
      });
      markListShouldRefresh('SeaImportList');
      markListShouldRefresh('Workspace');

      const newId = resolveSeaImportCopyId(response);
      await (newId
        ? router.replace(`/sea-imports/${newId}/edit`)
        : router.replace('/sea-imports'));
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
