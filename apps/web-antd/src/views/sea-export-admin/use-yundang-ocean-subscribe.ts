import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { YundangAdminApi } from '#/api/yundang/yundang-admin';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { batchSubscribeOceanBill } from '#/api/yundang/yundang-admin';
import { $t } from '#/locales';

import YundangSubscribeResultModal from './modules/yundang-subscribe-result-modal.vue';

const MAX_BATCH_HINT = 30;

export interface SeaExportSubscribeRowInfo {
  id: string;
  commissionNum?: null | string;
  mblNum?: null | string;
  bookingNum?: null | string;
}

/** 云当运踪订阅状态：未订阅 / 订阅失败 / 订阅成功 */
export type YundangSubscribeStatus = 'failed' | 'none' | 'success';

/**
 * 依据 isYundangSubscribed / isYundangSubscribeSuccess 组合推导订阅状态。
 * 无订阅记录 → none；有记录但未成功 → failed；有记录且成功 → success。
 */
export function getYundangSubscribeStatus(row: {
  isYundangSubscribeSuccess?: boolean | null;
  isYundangSubscribed?: boolean | null;
}): YundangSubscribeStatus {
  if (!row.isYundangSubscribed) {
    return 'none';
  }
  return row.isYundangSubscribeSuccess ? 'success' : 'failed';
}

/** 订阅状态对应的展示文案与 Tag 颜色 */
export function getYundangSubscribeStatusMeta(status: YundangSubscribeStatus): {
  color: string;
  label: string;
} {
  switch (status) {
    case 'failed': {
      return { color: 'error', label: $t('seaExport.yundang.status.failed') };
    }
    case 'success': {
      return {
        color: 'success',
        label: $t('seaExport.yundang.status.success'),
      };
    }
    default: {
      return {
        color: 'default',
        label: $t('seaExport.yundang.status.notSubscribed'),
      };
    }
  }
}

export function buildSeaExportSubscribeRow(
  row: SeaExportAdminApi.SeaExportDto,
): SeaExportSubscribeRowInfo {
  return {
    id: String(row.id),
    commissionNum: row.transportOrder?.commissionNum,
    mblNum: row.transportOrder?.mblNum,
    bookingNum: row.transportOrder?.bookingNum,
  };
}

function showSubscribeToast(
  result: YundangAdminApi.YundangOceanBatchSubscribeResultDto,
) {
  const { totalCount, successCount, failCount } = result;
  if (failCount === 0 && successCount > 0) {
    message.success(
      $t('seaExport.yundang.result.toastAllSuccess', [
        successCount,
        totalCount,
      ]),
    );
    return;
  }
  if (successCount === 0 && failCount > 0) {
    message.error(
      $t('seaExport.yundang.result.toastAllFailed', [failCount, totalCount]),
    );
    return;
  }
  message.warning(
    $t('seaExport.yundang.result.toastPartial', [
      successCount,
      failCount,
      totalCount,
    ]),
  );
}

export function useYundangOceanSubscribe() {
  const subscribing = ref(false);

  const [ResultModal, resultModalApi] = useVbenModal({
    connectedComponent: YundangSubscribeResultModal,
    destroyOnClose: true,
  });

  const showSubscribeResult = (
    result: YundangAdminApi.YundangOceanBatchSubscribeResultDto,
    rows: SeaExportSubscribeRowInfo[],
  ) => {
    showSubscribeToast(result);
    resultModalApi
      .setData({
        result,
        rows,
      })
      .open();
  };

  const subscribe = async (rows: SeaExportSubscribeRowInfo[]) => {
    if (rows.length === 0) {
      message.warning($t('seaExport.yundang.pleaseSelectRecords'));
      return;
    }
    if (subscribing.value) {
      return;
    }

    if (rows.length > MAX_BATCH_HINT) {
      message.warning($t('seaExport.yundang.batchHint', [MAX_BATCH_HINT]));
    }

    subscribing.value = true;
    const hideLoading = message.loading({
      content: $t('seaExport.yundang.subscribing'),
      duration: 0,
    });
    try {
      const result = await batchSubscribeOceanBill({
        seaExportIds: rows.map((row) => row.id),
      });
      showSubscribeResult(result, [...rows]);
    } finally {
      hideLoading();
      subscribing.value = false;
    }
  };

  return {
    ResultModal,
    subscribe,
    subscribing,
  };
}
