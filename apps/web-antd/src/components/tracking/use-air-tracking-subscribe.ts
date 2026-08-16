import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { subscribeAirWaybillTracking } from '#/api/tracking/feituo-tracking-admin';
import { $t } from '#/locales';
import { sanitizeVendorText } from '#/utils/vendor-text';

import TrackingSubscribeResultModal from './tracking-subscribe-result-modal.vue';
import type {
  TrackingSubscribeResultRow,
  TrackingSubscribeResultView,
  TrackingSubscribeRowInfo,
} from './types';

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

/**
 * 单条订阅结果的说明文案。
 * `trackingLoaded=false` 是「订阅成功、数据获取中」，不是失败，不能当报错展示。
 */
function resolveItemMessage(
  item: FeituoTrackingAdminApi.AirSubscribeItemResultDto,
): string {
  if (!item.isSuccess) {
    return sanitizeVendorText(item.errorMessage || item.message);
  }
  if (item.alreadySubscribed) {
    return $t('tracking.result.reusedHint');
  }
  if (item.trackingLoaded === false) {
    return $t('tracking.result.dataLoading');
  }
  return sanitizeVendorText(item.message);
}

function buildResultView(
  result: FeituoTrackingAdminApi.AirSubscribeResultDto,
  rows: TrackingSubscribeRowInfo[],
): TrackingSubscribeResultView {
  const labelMap = new Map(rows.map((row) => [row.id, row.orderLabel]));
  const resultRows: TrackingSubscribeResultRow[] = (result?.items ?? []).map(
    (item, index) => {
      const airExportId = String(item.airExportId);
      return {
        key: `${airExportId}-${index}`,
        orderLabel: labelMap.get(airExportId) ?? airExportId,
        referenceNo:
          item.businessNumber?.trim() || item.sourceMblNum?.trim() || '--',
        isSuccess: item.isSuccess,
        statusText: item.isSuccess
          ? item.alreadySubscribed
            ? $t('tracking.result.reused')
            : $t('tracking.result.success')
          : $t('tracking.result.failed'),
        message: resolveItemMessage(item),
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
 * 空运航空货运运踪批量订阅。
 *
 * 「已订阅成功且航司单号未变」的单默认复用已有订阅、不消耗配额（`alreadySubscribed`）；
 * 需要强制重订走单条重新订阅接口。
 */
export function useAirTrackingSubscribe() {
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
      const result = await subscribeAirWaybillTracking({
        airExportIds: rows.map((row) => row.id),
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
