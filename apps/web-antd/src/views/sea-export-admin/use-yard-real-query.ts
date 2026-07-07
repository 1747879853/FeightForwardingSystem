import type { Ref } from 'vue';

import { defineComponent, h, ref } from 'vue';

import { Button, Modal, message } from 'ant-design-vue';

import { getClientDetail } from '#/api/sea-export/client-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import { realQuery, YgdjAdminApi } from '#/api/ygdj/ygdj-admin';
import { $t } from '#/locales';

type DirtyAction = 'cancel' | 'discard' | 'save';

export interface YardRealQueryContext {
  mblNum: string;
  yardId?: number | string | null;
}

function isQuerySuccess(code: YgdjAdminApi.YgdjRealQueryResultDto['code']) {
  return String(code ?? '') === '200';
}

function collectCtnTypesFromQueryData(data: unknown): string[] {
  if (data === null || data === undefined) {
    return [];
  }

  let parsed: unknown = data;
  if (typeof data === 'string') {
    const text = data.trim();
    if (!text) {
      return [];
    }
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }
  }

  const root = parsed as Record<string, unknown>;
  const containers =
    root.containers ??
    root.ctnList ??
    root.CTN_LIST ??
    root.ctn_list ??
    root.data;

  if (!Array.isArray(containers)) {
    return [];
  }

  const types = new Set<string>();
  for (const item of containers) {
    const row = item as Record<string, unknown>;
    const type = String(
      row.CTNALL ?? row.ctnall ?? row.ctnType ?? row.ctnName ?? '',
    ).trim();
    if (type) {
      types.add(type);
    }
  }
  return [...types];
}

function collectOrderCtnTypeNames(
  orderCtns?: SeaExportAdminApi.OrderCtnAddDto[] | null,
): Set<string> {
  const names = new Set<string>();
  for (const row of orderCtns ?? []) {
    const anyRow = row as Record<string, unknown>;
    const name = String(anyRow.ctnCodeName ?? '').trim();
    if (name) {
      names.add(name.toUpperCase());
    }
  }
  return names;
}

function resolveSkippedCtnTypes(
  result: YgdjAdminApi.YgdjRealQueryResultDto,
  orderCtns?: SeaExportAdminApi.OrderCtnAddDto[] | null,
): string[] {
  const explicit = [
    ...(result.skippedCtnTypes ?? []),
    ...(result.unmatchedCtnTypes ?? []),
  ]
    .map((item) => String(item).trim())
    .filter(Boolean);
  if (explicit.length > 0) {
    return [...new Set(explicit)];
  }

  const responseTypes = collectCtnTypesFromQueryData(result.data);
  if (responseTypes.length === 0) {
    return [];
  }

  const writtenNames = collectOrderCtnTypeNames(orderCtns);
  return responseTypes.filter((type) => !writtenNames.has(type.toUpperCase()));
}

function confirmDirtyBeforeQuery(): Promise<DirtyAction> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: DirtyAction) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    const modal = Modal.confirm({
      title: $t('seaExport.yardRealQuery.unsavedTitle'),
      icon: null,
      width: 480,
      centered: true,
      content: h(
        defineComponent({
          name: 'YardRealQueryDirtyConfirm',
          setup() {
            return () =>
              h('div', [
                h(
                  'p',
                  { style: 'margin: 0 0 16px; color: rgba(0, 0, 0, 0.65);' },
                  $t('seaExport.yardRealQuery.unsavedContent'),
                ),
                h(
                  'div',
                  {
                    style:
                      'display: flex; justify-content: flex-end; gap: 8px;',
                  },
                  [
                    h(
                      Button,
                      {
                        onClick: () => {
                          modal.destroy();
                          settle('cancel');
                        },
                      },
                      { default: () => $t('common.cancel') },
                    ),
                    h(
                      Button,
                      {
                        onClick: () => {
                          modal.destroy();
                          settle('discard');
                        },
                      },
                      {
                        default: () =>
                          $t('seaExport.yardRealQuery.discardAndQuery'),
                      },
                    ),
                    h(
                      Button,
                      {
                        type: 'primary',
                        onClick: () => {
                          modal.destroy();
                          settle('save');
                        },
                      },
                      {
                        default: () => $t('seaExport.yardRealQuery.saveFirst'),
                      },
                    ),
                  ],
                ),
              ]);
          },
        }),
      ),
      footer: null,
      closable: true,
      onCancel: () => {
        settle('cancel');
      },
    });
  });
}

async function validateQueryContext(
  context: YardRealQueryContext,
): Promise<boolean> {
  const mblNum = context.mblNum.trim();
  if (!mblNum) {
    message.warning($t('seaExport.yardRealQuery.missingMblNum'));
    return false;
  }

  const yardId = context.yardId;
  if (yardId === undefined || yardId === null || yardId === '') {
    message.warning($t('seaExport.yardRealQuery.missingYard'));
    return false;
  }

  try {
    const yard = await getClientDetail(String(yardId));
    const yardCode = String(yard?.code ?? '').trim();
    if (!yardCode) {
      message.warning($t('seaExport.yardRealQuery.missingYardCode'));
      return false;
    }
  } catch {
    message.warning($t('seaExport.yardRealQuery.missingYardCode'));
    return false;
  }

  return true;
}

export function useYardRealQuery(options: {
  editId: Ref<string | undefined>;
  isFormDirty: () => Promise<boolean>;
  onSave: () => Promise<void>;
  onReload: () => Promise<SeaExportAdminApi.SeaExportDto | void>;
  getQueryContext: () => Promise<YardRealQueryContext>;
}) {
  const loading = ref(false);

  const runQuery = async () => {
    const seaExportId = options.editId.value?.trim();
    if (!seaExportId) {
      message.warning($t('seaExport.yardRealQuery.saveOrderFirst'));
      return;
    }

    if (await options.isFormDirty()) {
      const action = await confirmDirtyBeforeQuery();
      if (action === 'cancel') {
        return;
      }
      if (action === 'save') {
        await options.onSave();
        if (await options.isFormDirty()) {
          return;
        }
      }
    }

    const context = await options.getQueryContext();
    if (!(await validateQueryContext(context))) {
      return;
    }

    loading.value = true;
    const hideLoading = message.loading(
      $t('seaExport.yardRealQuery.querying'),
      0,
    );
    try {
      const result = await realQuery({
        seaExportId,
        reqType: '0',
      });

      if (!isQuerySuccess(result?.code)) {
        message.error(
          result?.msg?.trim() || $t('seaExport.yardRealQuery.failed'),
        );
        return;
      }

      const detail = await options.onReload();
      message.success($t('seaExport.yardRealQuery.success'));

      const skippedTypes = resolveSkippedCtnTypes(
        result,
        detail?.transportOrder?.orderCtns,
      );
      if (skippedTypes.length > 0) {
        message.warning(
          $t('seaExport.yardRealQuery.unmatchedCtnTypes', [
            skippedTypes.join('、'),
          ]),
        );
      }
    } catch {
      // 请求层已处理 UserFriendlyException
    } finally {
      hideLoading();
      loading.value = false;
    }
  };

  return {
    loading,
    runQuery,
  };
}
