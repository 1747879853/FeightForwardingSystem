import { nextTick } from 'vue';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';
import { getInvoiceIssueDetail } from '#/api/Invoice/InvoiceIssue';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';

/**
 * 加载详情数据
 */
export function useLoadDetail(
  editId: any,
  formData: any,
  goodsDetails: any,
  applicationGroupsData: any,
  invoiceExchangeRate: any,
  applicantName: any,
  invoiceIssueTime: any,
  loadClientInvoiceInfo: (settlementId: string) => Promise<void>,
  updateOrgBankByCurrency: () => void,
  fixedHeaderId: any, // ✅ 新增：发票抬头ID
  fixedCurrencyId: any, // ✅ 新增：发票币别ID
) {
  /**
   * 加载详情数据
   */
  async function loadDetail() {
    if (!editId.value) return;

    try {
      const detail = await getInvoiceIssueDetail(editId.value);

      formData.value = {
        id: detail.id,
        settlementId: detail.settlementId,
        settlementName: detail.settlement?.name || '', // ✅ 从详情中获取结算单位名称
        orgId: detail.orgId,
        currencyId: detail.currencyId || 1,
        invoiceType: detail.invoiceType || 'p',
        invoiceIssueType: detail.invoiceIssueType,
        invoiceNo: detail.invoiceNo,
        require: detail.require,
        remark: detail.remark,
        orgBankAccountId: detail.orgBankAccountId,
        clientInvoiceBankId: detail.clientInvoiceBankId,
        invoiceIssueItems:
          detail.invoiceIssueItems?.map((item: any) => ({
            invoiceApplicationId: item.invoiceApplicationId,
            remark: item.remark || '',
          })) || [],
        invoiceIssueGoodsDtls: detail.invoiceIssueGoodsDtls || [],
      };

      // 设置开票人和开票日期
      applicantName.value = detail.applyUserName || '';
      invoiceIssueTime.value = detail.invoiceIssueTime
        ? dayjs(detail.invoiceIssueTime).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD');

      // 加载客户开票信息
      await loadClientInvoiceInfo(detail.settlementId);

      // ✅ 编辑模式：初始化 fixedHeaderId 和 fixedCurrencyId（用于锁定发票抬头和币别）
      if (detail.clientInvoiceBankId) {
        fixedHeaderId.value = detail.clientInvoiceBankId;
        fixedCurrencyId.value = detail.currencyId || undefined;
        console.log('✅ 编辑模式：初始化 fixedHeaderId 和 fixedCurrencyId', {
          fixedHeaderId: fixedHeaderId.value,
          fixedCurrencyId: fixedCurrencyId.value,
        });
      }

      // 设置开票汇率
      invoiceExchangeRate.value = detail.invoiceExchangeRate || 1.0;

      // 根据币别更新销售方银行
      updateOrgBankByCurrency();

      // 从 invoiceIssueItems 中构建 applicationGroupsData
      if (detail.invoiceIssueItems && detail.invoiceIssueItems.length > 0) {
        console.log(
          '✅ 已加载申请明细:',
          detail.invoiceIssueItems.length,
          '条',
        );
        await loadFullApplicationData(detail.invoiceIssueItems);
      }

      // 加载商品明细数据
      if (
        detail.invoiceIssueGoodsDtls &&
        detail.invoiceIssueGoodsDtls.length > 0
      ) {
        const newGoodsDetails = detail.invoiceIssueGoodsDtls.map(
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

        console.log('✅ 加载商品明细:', goodsDetails.value.length, '条');
      } else {
        console.log('⚠️ 详情中没有商品明细数据');
      }
    } catch (error) {
      console.error('加载详情失败:', error);
      message.error('加载详情失败');
    }
  }

  /**
   * 加载详情数据（不包含商品明细，用于删除后刷新）
   */
  async function loadDetailWithoutGoods() {
    if (!editId.value) return;

    try {
      const detail = await getInvoiceIssueDetail(editId.value);

      // 只更新基础字段和 invoiceIssueItems，不更新 goodsDetails
      formData.value = {
        ...formData.value, // 保留现有的 goodsDetails
        id: detail.id,
        settlementId: detail.settlementId,
        settlementName: detail.settlement?.name || '',
        orgId: detail.orgId,
        currencyId: detail.currencyId || 1,
        invoiceType: detail.invoiceType || 'p',
        invoiceIssueType: detail.invoiceIssueType,
        invoiceNo: detail.invoiceNo,
        require: detail.require,
        remark: detail.remark,
        orgBankAccountId: detail.orgBankAccountId,
        clientInvoiceBankId: detail.clientInvoiceBankId,
        invoiceIssueItems:
          detail.invoiceIssueItems?.map((item: any) => ({
            invoiceApplicationId: item.invoiceApplicationId,
            remark: item.remark || '',
          })) || [],
        // ✅ 不更新 invoiceIssueGoodsDtls，保留之前通过事件更新的 goodsDetails
      };

      // 设置开票人和开票日期
      applicantName.value = detail.applyUserName || '';
      invoiceIssueTime.value = detail.invoiceIssueTime
        ? dayjs(detail.invoiceIssueTime).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD');

      // 加载客户开票信息
      await loadClientInvoiceInfo(detail.settlementId);

      // 设置开票汇率
      invoiceExchangeRate.value = detail.invoiceExchangeRate || 1.0;

      // 根据币别更新销售方银行
      updateOrgBankByCurrency();

      // 从 invoiceIssueItems 中构建 applicationGroupsData
      if (detail.invoiceIssueItems && detail.invoiceIssueItems.length > 0) {
        console.log(
          '✅ 已加载申请明细:',
          detail.invoiceIssueItems.length,
          '条',
        );
        await loadFullApplicationData(detail.invoiceIssueItems);
      } else {
        // 如果没有申请明细，清空 applicationGroupsData
        applicationGroupsData.value = [];
        console.log('⚠️ 没有申请明细，已清空 applicationGroupsData');
      }

      console.log(
        '✅ 基础数据已更新，商品明细保持不变:',
        goodsDetails.value.length,
        '条',
      );
    } catch (error) {
      console.error('加载详情失败:', error);
      message.error('加载详情失败');
    }
  }

  /**
   * 根据 invoiceIssueItems 加载完整的申请数据
   */
  async function loadFullApplicationData(invoiceIssueItems: any[]) {
    try {
      const applicationIds = invoiceIssueItems.map(
        (item: any) => item.invoiceApplicationId,
      );

      console.log('🔍 需要加载的申请ID列表:', applicationIds);

      const groupsData: any[] = [];

      for (const appItemId of applicationIds) {
        try {
          console.log('📥 正在加载申请详情:', appItemId);
          const appDetail = await InvoiceApplicationAdminApi.detail(appItemId);

          console.log('✅ 成功加载申请详情:', {
            id: appDetail.id,
            applicationNo: appDetail.applicationNo,
          });

          // 构建扁平化的费用明细列表
          const flatItems: any[] = [];
          let totalAppliedAmount = 0;

          appDetail.feeGroups.forEach((group: any) => {
            group.items.forEach((item: any) => {
              flatItems.push({
                id: item.id,
                invoiceApplicationId: appDetail.id,
                orderFeeId: item.orderFeeId,
                appliedAmount: item.appliedAmount,
                remark: item.remark,
                orderFee: item.orderFee,
                remainingInvoiceAmount: item.remainingInvoiceAmount,
                commissionNum: group.transportOrder?.commissionNum || '',
                mblNum: group.transportOrder?.mblNum || '',
                currencyId: appDetail.currencyId,
                currencyCode: appDetail.currencyCode,
                totalAppliedAmount: item.appliedAmount,
              });

              totalAppliedAmount += item.appliedAmount;
            });
          });

          // 构建申请组对象
          const firstItem = flatItems[0];

          const applicationGroup = {
            id: appDetail.id,
            applicationNo: appDetail.applicationNo,
            settlementId: appDetail.settlementId,
            status: appDetail.status,
            currencyId: appDetail.currencyId,
            currencyCode: appDetail.currencyCode,
            invoiceType: appDetail.invoiceType,
            clientInvoiceBankId: appDetail.clientInvoiceBankId,
            orgBankAccountId: appDetail.orgBankAccountId,
            applyUserId: appDetail.applyUserId,
            applyTime: appDetail.applyTime,
            require: appDetail.require,
            remark: appDetail.remark,
            creatorUserName: appDetail.creatorUserName,
            applyUserName: appDetail.applyUserName,
            settlementName: appDetail.settlementName,
            companyName: undefined,
            invoiceExchangeRate: appDetail.invoiceExchangeRate,
            commissionNum: firstItem?.commissionNum || '',
            mblNum: firstItem?.mblNum || '',
            invoiceApplicationItems: flatItems,
            invoiceApplicationGoodsDtls:
              appDetail.invoiceApplicationGoodsDtls || [],
            totalAppliedAmount: totalAppliedAmount,
            totalGoodsAmount: 0,
            amountMatched: true,
            clientInvoiceInfo: null,
          };

          groupsData.push(applicationGroup);
        } catch (error) {
          console.error(`❌ 加载申请 ${appItemId} 详情失败:`, error);
          message.warning(`加载申请 ${appItemId} 详情失败`);
        }
      }

      applicationGroupsData.value = groupsData;
      console.log(
        '✅ applicationGroupsData 已加载完成，共',
        groupsData.length,
        '个申请组',
      );
    } catch (error) {
      console.error('加载完整申请数据失败:', error);
      message.error('加载申请详情失败，占位符可能无法正确替换');
    }
  }

  return {
    loadDetail,
    loadDetailWithoutGoods, // ✅ 新增：不包含商品明细的加载方法
  };
}
