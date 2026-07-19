import { ref } from 'vue';
import { message } from 'ant-design-vue';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { PrintJsonType, usePrintFormat } from '#/components/print-format';

/**
 * 打印功能 Composable
 */
export function useOrderFeePrint() {
  const printing = ref(false);
  const { openPrint } = usePrintFormat();

  /**
   * 处理打印操作
   */
  const handlePrint = async (
    selectedRows: any[],
    feeType: number,
    isSavedCheck: (row: any) => boolean,
  ) => {
    if (printing.value) return;

    if (!selectedRows.length) {
      message.warning('请先勾选要打印的费用');
      return;
    }

    if (selectedRows.some((row) => !isSavedCheck(row))) {
      message.warning('请先保存费用后再打印');
      return;
    }

    printing.value = true;
    const hideLoading = message.loading('正在准备打印...', 0);

    try {
      const json = JSON.stringify(
        selectedRows.map((row) => {
          const { _rowKey, ...fee } = row as OrderFeeAdminApi.OrderFeeDto & {
            _rowKey?: string;
          };
          return fee;
        }),
      );

      openPrint({
        printJsonType:
          feeType === 0
            ? PrintJsonType.RecOrderFeeList
            : PrintJsonType.PayOrderFeeList,
        json,
      });
    } catch {
      message.error('打印准备失败，请稍后重试');
    } finally {
      hideLoading();
      printing.value = false;
    }
  };

  return {
    printing,
    handlePrint,
  };
}
