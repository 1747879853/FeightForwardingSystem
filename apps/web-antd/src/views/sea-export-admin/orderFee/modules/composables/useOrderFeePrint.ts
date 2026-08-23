import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  PrintFormatBizType,
  PrintJsonType,
  usePrintFormat,
} from '#/components/print-format';

export interface OrderFeePrintOptions {
  /** 收付类型：0 应收 1 应付 */
  feeType: number;
  /** 业务(TransportOrder) id，普通费用打印必传 */
  transportOrderId?: string;
  /** 当票详情，用于按签单方式/船公司/分公司筛选模板 */
  orderDetail?: null | SeaExportAdminApi.SeaExportDto;
  /** 是否更改单打印 */
  isChangeOrderPrint?: boolean;
  /** 更改单 id，更改单打印必传 */
  changeOrderId?: string;
  /** 指定只打印这些费用 id（更改单打印与普通费用打印均生效，不传则打印全部费用） */
  selectedFeeIds?: string[];
}

/**
 * 费用列表打印 Composable。
 * 打印数据由后端按 transportOrderId / 更改单 id 自动取数，前端无需拼接 json。
 */
export function useOrderFeePrint() {
  const printing = ref(false);
  const { openPrint } = usePrintFormat();

  const handlePrint = async (options: OrderFeePrintOptions) => {
    if (printing.value) return;

    const {
      feeType,
      transportOrderId,
      orderDetail,
      isChangeOrderPrint,
      changeOrderId,
      selectedFeeIds,
    } = options;

    const printJsonType =
      feeType === 0
        ? PrintJsonType.RecOrderFeeList
        : PrintJsonType.PayOrderFeeList;

    // 当票要素：用于按签单方式/船公司/分公司/业务类型筛选可用模板
    const templateContext = {
      codeIssueTypeId:
        (orderDetail as any)?.codeIssueTypeId ??
        (orderDetail as any)?.issueType ??
        null,
      carrierId: orderDetail?.carrierId ?? null,
      orgId: orderDetail?.orgId ?? null,
      bizType: PrintFormatBizType.SeaExport,
    };

    printing.value = true;
    const hideLoading = message.loading('正在准备打印...', 0);
    try {
      if (isChangeOrderPrint) {
        if (!changeOrderId) {
          message.warning('未找到更改单，无法打印');
          return;
        }
        openPrint({
          printJsonType,
          ...templateContext,
          isChangeOrderPrint: true,
          detailInput: {
            id: changeOrderId,
            ids: selectedFeeIds?.length ? selectedFeeIds : undefined,
          },
        });
        return;
      }

      if (!transportOrderId) {
        message.warning('请先保存业务信息后再打印');
        return;
      }
      openPrint({
        printJsonType,
        ...templateContext,
        orderFeeListInput: {
          transportOrderId,
          ids: selectedFeeIds?.length ? selectedFeeIds : undefined,
          pageIndex: 1,
          // 打印整票费用：需后端放开 OrderFeeQueryDto.pageSize 上限（原为 1000）
          pageSize: 9999,
        },
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
