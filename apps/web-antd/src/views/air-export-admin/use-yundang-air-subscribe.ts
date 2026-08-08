import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';
import type { YundangAirAdminApi } from '#/api/yundang/yundang-air-admin';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { batchSubscribeAirBill } from '#/api/yundang/yundang-air-admin';
import { $t } from '#/locales';

import YundangAirSubscribeResultModal from './modules/yundang-air-subscribe-result-modal.vue';

const MAX_BATCH_HINT = 30;

export interface AirExportSubscribeRowInfo {
  id: string;
  commissionNum?: null | string;
  mblNum?: null | string;
}

/** 运踪订阅状态：未订阅 / 订阅失败 / 订阅成功 */
export type YundangAirSubscribeStatus = 'failed' | 'none' | 'success';

/**
 * 依据 isYundangSubscribed / isYundangSubscribeSuccess 组合推导订阅状态。
 * 无订阅记录 → none；有记录但未成功 → failed；有记录且成功 → success。
 */
export function getYundangAirSubscribeStatus(row: {
  isYundangSubscribeSuccess?: boolean | null;
  isYundangSubscribed?: boolean | null;
}): YundangAirSubscribeStatus {
  if (!row.isYundangSubscribed) {
    return 'none';
  }
  return row.isYundangSubscribeSuccess ? 'success' : 'failed';
}

export function buildAirExportSubscribeRow(
  row: AirExportAdminApi.AirExportDto,
): AirExportSubscribeRowInfo {
  return {
    id: String(row.id),
    commissionNum: row.transportOrder?.commissionNum,
    mblNum: row.transportOrder?.mblNum,
  };
}

function showSubscribeToast(
  result: YundangAirAdminApi.YundangAirBatchSubscribeResultDto,
) {
  const { totalCount, successCount, failCount } = result;
  if (failCount === 0 && successCount > 0) {
    message.success(
      $t('airExport.yundang.result.toastAllSuccess', [
        successCount,
        totalCount,
      ]),
    );
    return;
  }
  if (successCount === 0 && failCount > 0) {
    message.error(
      $t('airExport.yundang.result.toastAllFailed', [failCount, totalCount]),
    );
    return;
  }
  message.warning(
    $t('airExport.yundang.result.toastPartial', [
      successCount,
      failCount,
      totalCount,
    ]),
  );
}

export function useYundangAirSubscribe() {
  const subscribing = ref(false);

  const [ResultModal, resultModalApi] = useVbenModal({
    connectedComponent: YundangAirSubscribeResultModal,
    destroyOnClose: true,
  });

  const showSubscribeResult = (
    result: YundangAirAdminApi.YundangAirBatchSubscribeResultDto,
    rows: AirExportSubscribeRowInfo[],
  ) => {
    showSubscribeToast(result);
    resultModalApi
      .setData({
        result,
        rows,
      })
      .open();
  };

  const subscribe = async (rows: AirExportSubscribeRowInfo[]) => {
    if (rows.length === 0) {
      message.warning($t('airExport.yundang.pleaseSelectRecords'));
      return;
    }
    if (subscribing.value) {
      return;
    }

    if (rows.length > MAX_BATCH_HINT) {
      message.warning($t('airExport.yundang.batchHint', [MAX_BATCH_HINT]));
    }

    subscribing.value = true;
    const hideLoading = message.loading({
      content: $t('airExport.yundang.subscribing'),
      duration: 0,
    });
    try {
      const result = await batchSubscribeAirBill({
        airExportIds: rows.map((row) => row.id),
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
