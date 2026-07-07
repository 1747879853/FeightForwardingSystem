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
