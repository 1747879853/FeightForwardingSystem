import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { subscribeContainerTracking } from '#/api/tracking/feituo-tracking-admin';
import { $t } from '#/locales';
import { sanitizeVendorText } from '#/utils/vendor-text';

import TrackingSubscribeResultModal from './tracking-subscribe-result-modal.vue';
import type {
  TrackingSubscribeResultRow,
  TrackingSubscribeResultView,
  TrackingSubscribeRowInfo,
} from './types';

/** 单次批量订阅的提示阈值，超过只提示不拦截 */
const MAX_BATCH_HINT = 30;

function showSubscribeToast(view: TrackingSubscribeResultView) {
  const { total, successCount, failedCount } = view;
  if (failedCount === 0 && successCount > 0) {
    message.success(
      $t('tracking.result.toastAllSuccess', [successCount, total]),
    );
    return;
  }
  if (successCount === 0 && failedCount > 0) {
    message.error($t('tracking.result.toastAllFailed', [failedCount, total]));
    return;
  }
  message.warning(
    $t('tracking.result.toastPartial', [successCount, failedCount, total]),
  );
}

function buildResultView(
  result: FeituoTrackingAdminApi.ContainerSubscribeResultDto,
  rows: TrackingSubscribeRowInfo[],
): TrackingSubscribeResultView {
  const labelMap = new Map(rows.map((row) => [row.id, row.orderLabel]));
  const resultRows: TrackingSubscribeResultRow[] = (result?.items ?? []).map(
    (item, index) => {
      const orderId = String(item.orderId);
      return {
        key: `${orderId}-${index}`,
        orderLabel: labelMap.get(orderId) ?? orderId,
        referenceNo: item.billNo?.trim() || item.containerNo?.trim() || '--',
        isSuccess: item.isSuccess,
        statusText: item.isSuccess
          ? $t('tracking.result.success')
          : $t('tracking.result.failed'),
        message: item.isSuccess
          ? // 20001 = 订阅成功但服务商暂未抓到数据，属正常情况
            item.data?.result
            ? sanitizeVendorText(item.message)
            : $t('tracking.result.dataLoading')
          : sanitizeVendorText(item.errorMessage || item.message),
      };
    },
  );
  return {
    total: result?.total ?? resultRows.length,
    successCount: result?.successCount ?? 0,
    failedCount: result?.failedCount ?? 0,
    rows: resultRows,
  };
}

/**
 * 海运集装箱运踪批量订阅（海运出口 / 海运进口共用，用 bizType 区分）。
 *
 * 订阅即查询：成功时后端已带回当前全量数据并落库，调用方订阅后刷新列表即可。
 */
export function useContainerTrackingSubscribe(
  bizType: FeituoTrackingAdminApi.TrackingBizType,
) {
  const subscribing = ref(false);

  const [ResultModal, resultModalApi] = useVbenModal({
    connectedComponent: TrackingSubscribeResultModal,
    destroyOnClose: true,
  });

  const subscribe = async (rows: TrackingSubscribeRowInfo[]) => {
    if (rows.length === 0) {
      message.warning($t('tracking.pleaseSelectRecords'));
      return;
    }
    if (subscribing.value) {
      return;
    }
    if (rows.length > MAX_BATCH_HINT) {
      message.warning($t('tracking.batchHint', [MAX_BATCH_HINT]));
    }

    subscribing.value = true;
    const hideLoading = message.loading({
      content: $t('tracking.subscribing'),
      duration: 0,
    });
    try {
      const result = await subscribeContainerTracking({
        bizType,
        orderIds: rows.map((row) => row.id),
      });
      const view = buildResultView(result, rows);
      showSubscribeToast(view);
      resultModalApi.setData(view).open();
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
