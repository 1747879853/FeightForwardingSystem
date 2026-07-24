import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import { getMyDefaultOrgId } from '#/composables/use-my-org';

/**
 * 费用选择抽屉保存处理逻辑
 */
export function useFeeSelectionSave(
  formData: Ref<any>,
  feeGroupsData: Ref<any[]>,
  goodsDetails: Ref<any[]>,
  invoiceExchangeRate: Ref<number>,
  selectedCurrencyCode: Ref<string>,
  addSelectedFeesToForm: (selectedFees: any[]) => void,
  autoFillGoodsDetails: (selectedFees: any[]) => Promise<void>,
  mergeAmountToExistingGoods: (selectedFees: any[]) => Promise<void>,
  loadClientInvoiceInfo: (settlementId: string) => Promise<void>,
  updateOrgBankByCurrency: () => void,
  loadDefaultRemarkTemplate?: () => Promise<void>,
) {
  /**
   * 处理费用选择保存
   */
  async function handleFeeSelectionSave(data: {
    selectedFees: any[];
    settlementId: string;
    currencyId: number;
    invoiceExchangeRate?: number;
    feeGroupsData?: any[];
  }) {
    const {
      selectedFees,
      settlementId,
      currencyId,
      invoiceExchangeRate: rate,
      feeGroupsData: groupsData,
    } = data;

    console.log('✅ 收到费用选择数据:', selectedFees.length, '条费用');

    // 设置结算单位和币别
    formData.value.settlementId = settlementId;
    formData.value.currencyId = currencyId;

    // 设置发票汇率
    if (rate !== undefined) {
      invoiceExchangeRate.value = rate;
    }

    // 自动设置归属组织
    const firstFee = selectedFees[0];
    if (firstFee?.transportOrder?.orgId) {
      formData.value.orgId = firstFee.transportOrder.orgId;
    } else if (!formData.value.orgId) {
      formData.value.orgId = getMyDefaultOrgId() ?? 0;
    }

    // 根据币别自动选择销售方默认银行
    updateOrgBankByCurrency();

    // 加载客户开票信息
    await loadClientInvoiceInfo(settlementId);

    // 合并费用组数据，避免重复添加
    if (groupsData && groupsData.length > 0) {
      const existingOrderIds = new Set<string>();
      feeGroupsData.value.forEach((group: any) => {
        if (group.transportOrder?.id) {
          existingOrderIds.add(String(group.transportOrder.id));
        }
      });

      const newGroups = groupsData.filter((group: any) => {
        const orderId = group.transportOrder?.id;
        return orderId && !existingOrderIds.has(String(orderId));
      });

      if (newGroups.length > 0) {
        feeGroupsData.value = [...feeGroupsData.value, ...newGroups];
        console.log(
          `✅ 已合并费用数据到 feeGroupsData: 新增 ${newGroups.length} 个订单组`,
        );
      }
    }

    // 过滤出真正的新费用
    const existingFeeIds = getAddedFeeIds();
    const newFees = selectedFees.filter((fee: any) => {
      const feeId = String(fee.orderFee?.id);
      return !existingFeeIds.has(feeId);
    });

    if (newFees.length === 0) {
      message.warning('所选费用已全部添加，无新增费用');
      return;
    }

    // 添加费用到表单
    addSelectedFeesToForm(selectedFees);

    // 自动加载当前币别对应的默认备注模板
    if (loadDefaultRemarkTemplate) {
      await loadDefaultRemarkTemplate();
    }

    // 根据商品明细数量决定处理方式
    if (goodsDetails.value.length === 0) {
      await autoFillGoodsDetails(newFees);
    } else if (goodsDetails.value.length === 1) {
      await mergeAmountToExistingGoods(newFees);
    } else {
      message.warning(
        '当前存在多行商品明细，系统无法自动合并金额。建议：\n' +
          '1. 删除多余的商品明细，保留一行\n' +
          '2. 或手动调整各行的金额',
      );
    }
  }

  /**
   * 获取已添加的费用ID集合
   */
  function getAddedFeeIds(): Set<string> {
    const items = formData.value.invoiceApplicationItems || [];
    return new Set(items.map((item: any) => String(item.orderFeeId)));
  }

  return {
    handleFeeSelectionSave,
  };
}
