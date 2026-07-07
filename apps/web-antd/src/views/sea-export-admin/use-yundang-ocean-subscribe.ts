import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { YundangAdminApi } from '#/api/yundang/yundang-admin';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { $t } from '#/locales';

import YundangSubscribeModal from './modules/yundang-subscribe-modal.vue';
import YundangSubscribeResultModal from './modules/yundang-subscribe-result-modal.vue';

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
  const [SubscribeModal, subscribeModalApi] = useVbenModal({
    connectedComponent: YundangSubscribeModal,
    destroyOnClose: true,
  });

  const [ResultModal, resultModalApi] = useVbenModal({
    connectedComponent: YundangSubscribeResultModal,
    destroyOnClose: true,
  });

  const openSubscribe = (
    rows: SeaExportSubscribeRowInfo[],
    options?: { fromEditor?: boolean },
  ) => {
    if (rows.length === 0) {
      message.warning($t('seaExport.yundang.pleaseSelectRecords'));
      return;
    }
    subscribeModalApi
      .setData({
        rows,
        fromEditor: options?.fromEditor,
      })
      .open();
  };

  const onSubscribed = (payload: {
    result: YundangAdminApi.YundangOceanBatchSubscribeResultDto;
    rows: SeaExportSubscribeRowInfo[];
  }) => {
    showSubscribeToast(payload.result);
    resultModalApi
      .setData({
        result: payload.result,
        rows: payload.rows,
      })
      .open();
  };

  return {
    SubscribeModal,
    ResultModal,
    openSubscribe,
    onSubscribed,
  };
}
