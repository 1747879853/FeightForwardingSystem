import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

/**
 * 加载详情数据相关逻辑
 */
export function useLoadDetail(
  editId: Ref<string | undefined>,
  isEdit: Ref<boolean>,
  isReadOnly: Ref<boolean>,
  loading: Ref<boolean>,
  formData: Ref<any>,
  goodsDetails: Ref<any[]>,
  feeGroupsData: Ref<any[]>,
  selectedClientInvoiceInfo: Ref<any>,
  invoiceExchangeRate: Ref<number>,
  selectedCurrencyCode: Ref<string>,
  applicantName: Ref<string>,
  applicationDate: Ref<string>,
  loadClientInvoiceInfo: (settlementId: string) => Promise<void>,
  updateOrgBankByCurrency: () => void,
  loadDefaultRemarkTemplate?: () => Promise<void>,
) {
  const router = useRouter();
  const { detailAsync } = InvoiceApplicationApi;

  /**
   * 加载详情数据
   */
  async function loadDetail() {
    if (!editId.value) return;

    loading.value = true;
    try {
      const detail = await detailAsync(editId.value);

      // 加载客户开票信息
      await loadClientInvoiceInfo(detail.settlementId);

      // 检查状态，只有录入或驳回状态可以编辑（只读模式除外）
      if (
        !isReadOnly.value &&
        detail.status !==
          InvoiceApplicationApi.InvoiceApplicationStatus.Entering &&
        detail.status !==
          InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
      ) {
        message.error('当前状态的申请不可编辑');
        router.back();
        return;
      }

      selectedClientInvoiceInfo.value = detail.clientInvoiceInfo;

      // 从 feeGroups 中提取 invoiceApplicationItems
      const invoiceApplicationItems: any[] = [];
      if (detail.feeGroups && detail.feeGroups.length > 0) {
        detail.feeGroups.forEach((group: any) => {
          if (group.items && group.items.length > 0) {
            group.items.forEach((item: any) => {
              invoiceApplicationItems.push({
                orderFeeId: item.orderFeeId,
                appliedAmount: item.appliedAmount,
                remark: item.remark || '',
              });
            });
          }
        });
      }

      formData.value = {
        id: detail.id,
        settlementId: detail.settlementId,
        orgId: detail.orgId,
        currencyId: detail.currencyId || 1,
        invoiceType:
          detail.invoiceType ||
          InvoiceApplicationApi.InvoiceType.NormalElectric,
        require: detail.require,
        remark: detail.remark,
        orgBankAccountId: detail.orgBankAccountId,
        clientInvoiceBankId: detail.clientInvoiceBankId,
        invoiceApplicationItems: invoiceApplicationItems,
        invoiceApplicationGoodsDtls: detail.invoiceApplicationGoodsDtls || [],
      };

      // 设置申请人和申请日期
      applicantName.value = detail.creatorUserName || '';
      applicationDate.value = detail.applyTime
        ? dayjs(detail.applyTime).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD');

      // 设置汇率
      invoiceExchangeRate.value = detail.invoiceExchangeRate || 1.0;

      // 加载币别代码
      if (detail.currencyId) {
        try {
          const currencyDetail = await getCurrencyDetail(detail.currencyId);
          selectedCurrencyCode.value = currencyDetail.code || '';
        } catch (error) {
          console.error('加载币别详情失败:', error);
          selectedCurrencyCode.value = '';
        }
      }

      // 根据币别更新销售方银行
      updateOrgBankByCurrency();

      // 从 feeGroups 中构建 feeGroupsData
      if (detail.feeGroups && detail.feeGroups.length > 0) {
        const feeGroupsForDisplay: any[] = [];

        detail.feeGroups.forEach((group: any) => {
          const parentNode: any = {
            id: group.transportOrder?.id || `order_${Date.now()}`,
            parentId: null,
            transportOrder: group.transportOrder,
            seaExport: group.transportOrder?.seaExport,
            orderFees: group.items?.map((item: any) => item.orderFee) || [],
            commissionNum: group.transportOrder?.commissionNum,
            mblNum: group.transportOrder?.mblNum || '-',
            bookingNum: group.transportOrder?.bookingNum || '-',
            clientName: group.transportOrder?.clientName,
            bizType:
              getBizTypeOptions().find(
                (o: any) => o.value === group.transportOrder?.bizType,
              )?.label || '-',
            carrier: group.transportOrder?.seaExport?.carrier?.cnName || '-',
            company: group.transportOrder?.orgs?.at(-1)?.name || '-',
            feeDetails: [] as any[],
          };

          if (group.items && group.items.length > 0) {
            group.items.forEach((item: any) => {
              const childNode: any = {
                id: item.id,
                parentId: parentNode.id,
                orderFee: item.orderFee,
                appliedAmount: item.appliedAmount,
                settlementUnit: item.orderFee?.settlementName || '-',
                payReceiveType: item.orderFee?.paySide === 0 ? '应收' : '应付',
                feeName: item.orderFee?.feeCodeName || '-',
                amount: item.orderFee?.amount,
                currencyCode: item.orderFee?.currencyCode || '-',
                remainingInvoiceAmount: item.remainingInvoiceAmount,
                commissionNum: group.transportOrder?.commissionNum,
                mblNum: group.transportOrder?.mblNum || '-',
                bookingNum: group.transportOrder?.bookingNum || '-',
                transportOrder: group.transportOrder,
              };
              parentNode.feeDetails.push(childNode);
            });
          }

          feeGroupsForDisplay.push(parentNode);
        });

        feeGroupsData.value = feeGroupsForDisplay;
      }

      // 加载商品明细数据
      if (
        detail.invoiceApplicationGoodsDtls &&
        detail.invoiceApplicationGoodsDtls.length > 0
      ) {
        const newGoodsDetails = detail.invoiceApplicationGoodsDtls.map(
          (item: any, index: number) => ({
            ...item,
            id: item.id
              ? String(item.id)
              : Date.now().toString() + index.toString(),
          }),
        );

        goodsDetails.value = [];
        await nextTick();
        goodsDetails.value = newGoodsDetails;
      }

      // 如果备注为空，尝试加载默认备注模板
      if (!formData.value.remark || !formData.value.remark.trim()) {
        if (loadDefaultRemarkTemplate) {
          await loadDefaultRemarkTemplate();
        }
      }
    } catch (error) {
      console.error('加载详情失败:', error);
    } finally {
      loading.value = false;
    }
  }

  return {
    loadDetail,
  };
}
