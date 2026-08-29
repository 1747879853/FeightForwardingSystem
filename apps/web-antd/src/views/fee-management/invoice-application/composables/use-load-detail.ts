import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getCodeInvoicePagedList } from '#/api/system/base-data/code-invoice-admin';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { isExchangeRateEffective } from '#/utils/exchange-rate-cache';
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
   * 按币别查询当前生效的发票汇率（口径与新增流程一致：启用且在有效期内，
   * 同币别多条时 sortId 大者优先，其次 id 大者）
   */
  async function fetchInvoiceExchangeRate(currencyId: number): Promise<number> {
    try {
      const result = await getExchangeRatePagedList({
        CurrencyId: currencyId,
        PageIndex: 1,
        PageSize: 100,
      });

      const validRates = (result?.items || []).filter((rate) =>
        isExchangeRateEffective(rate),
      );

      if (validRates.length > 0) {
        validRates.sort((a, b) => {
          const aSortId = Number(a.sortId ?? 0);
          const bSortId = Number(b.sortId ?? 0);
          if (bSortId !== aSortId) return bSortId - aSortId;
          return String(b.id) > String(a.id) ? -1 : 1;
        });

        const bestRate = validRates[0];
        if (bestRate && bestRate.invoiceValue) {
          console.log('✅ 查询到币别发票汇率:', bestRate.invoiceValue);
          return bestRate.invoiceValue;
        }
      }
      console.warn('⚠️ 未找到币别', currencyId, '的有效发票汇率，使用默认 1.0');
    } catch (error) {
      console.error('查询发票汇率失败:', error);
    }
    return 1.0;
  }

  /**
   * 根据结算对象和币别生成默认商品明细
   */
  async function generateDefaultGoodsDetail(
    settlementId: string,
    currencyId: number,
    invoiceApplicationItems: any[],
  ) {
    try {
      console.log('🔄 开始生成默认商品明细...', {
        settlementId,
        currencyId,
        itemsCount: invoiceApplicationItems.length,
      });

      // 1. 获取币别代码
      let currencyCode = '';
      try {
        const currencyDetail = await getCurrencyDetail(currencyId);
        currencyCode = currencyDetail.code || '';
        console.log('✅ 获取币别代码:', currencyCode);
      } catch (error) {
        console.error('获取币别详情失败:', error);
        message.warning('获取币别信息失败');
        return;
      }

      if (!currencyCode) {
        console.warn('未找到币别代码');
        return;
      }

      // 2. 加载发票商品编码列表
      let codeInvoiceList: any[] = [];
      try {
        const result = await getCodeInvoicePagedList({
          PageIndex: 1,
          PageSize: 1000,
        });
        codeInvoiceList = result.items || [];
        console.log('✅ 加载发票商品编码列表:', codeInvoiceList.length, '条');
      } catch (error) {
        console.error('加载发票商品编码失败:', error);
        message.warning('加载发票商品编码失败');
        return;
      }

      // 3. 查找默认商品编码（isDefault=true 且 defaultCurrency 匹配）
      const defaultCodeInvoice = codeInvoiceList.find(
        (item) => item.isDefault && item.defaultCurrency === currencyCode,
      );

      if (!defaultCodeInvoice) {
        console.warn(`未找到币别 ${currencyCode} 对应的默认商品编码`);
        message.warning(
          `未找到币别 ${currencyCode} 对应的默认商品编码，请手动添加`,
        );
        return;
      }

      console.log('✅ 找到默认商品编码:', defaultCodeInvoice.name);

      // 4. 计算所有费用的申请金额总和（转换为人民币）
      let totalRmbAmount = 0;

      invoiceApplicationItems.forEach((item: any) => {
        const appliedAmount = item.appliedAmount || 0;

        // 从 feeGroupsData 中找到对应的费用，获取其币别ID
        let feeCurrencyId = currencyId; // 默认使用发票币别

        // 尝试从 feeGroupsData 中查找该费用的原始币别
        for (const group of feeGroupsData.value) {
          if (group.feeDetails) {
            const fee = group.feeDetails.find(
              (f: any) => f.orderFee?.id === item.orderFeeId,
            );
            if (fee && fee.orderFee?.currencyId) {
              feeCurrencyId = fee.orderFee.currencyId;
              break;
            }
          }
        }

        // 如果费用币别与人民币不同，需要进行汇率转换
        if (feeCurrencyId !== 1) {
          const convertedAmount =
            appliedAmount * (invoiceExchangeRate.value || 1);
          totalRmbAmount += convertedAmount;
          console.log(
            `💰 外币转换: ${appliedAmount.toFixed(2)} × ${invoiceExchangeRate.value} = ${convertedAmount.toFixed(2)} RMB`,
          );
        } else {
          totalRmbAmount += appliedAmount;
          console.log(`💰 同币别累加: ${appliedAmount.toFixed(2)}`);
        }
      });

      console.log('📊 总申请金额（人民币）:', totalRmbAmount.toFixed(2));

      // 5. 创建默认商品明细
      const taxRate = defaultCodeInvoice.taxRate || 0;
      const noTaxAmount = totalRmbAmount / (1 + taxRate / 100);
      const taxAmount = noTaxAmount * (taxRate / 100);

      const defaultGoodsDetail = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        codeInvoiceId: defaultCodeInvoice.id,
        specification: defaultCodeInvoice.specification || '',
        unit: defaultCodeInvoice.unit || '票',
        quantity: 1,
        unitPrice: totalRmbAmount,
        amount: totalRmbAmount,
        noTaxAmount: noTaxAmount,
        taxRate: taxRate,
        taxAmount: taxAmount,
        remark: '',
      };

      // 6. 设置商品明细
      goodsDetails.value = [defaultGoodsDetail];
      await nextTick();

      console.log('✅ 成功生成默认商品明细:', {
        codeInvoiceId: defaultCodeInvoice.id,
        name: defaultCodeInvoice.name,
        amount: totalRmbAmount.toFixed(2),
        taxRate: taxRate,
      });

      message.success('已根据结算对象自动生成默认商品明细');
    } catch (error) {
      console.error('生成默认商品明细失败:', error);
      message.error('生成默认商品明细失败');
    }
  }

  /**
   * 加载详情数据
   */
  async function loadDetail() {
    if (!editId.value) return;

    loading.value = true;
    try {
      const detail = await detailAsync(editId.value);

      // ✅ 修改：先设置基本信息，包括currencyId和status，然后再加载客户开票信息
      formData.value = {
        id: detail.id,
        applicationNo: detail.applicationNo, // ✅ 新增：申请单号
        status: detail.status, // ✅ 新增：状态
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
        invoiceApplicationItems: [],
        invoiceApplicationGoodsDtls: detail.invoiceApplicationGoodsDtls || [],
      };

      // 设置申请人和申请日期
      applicantName.value = detail.creatorUserName || '';
      applicationDate.value = detail.applyTime
        ? dayjs(detail.applyTime).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD');

      // 设置汇率：优先使用后端返回的 invoiceExchangeRate；
      // 详情接口未返回有效值时，按币别查询当前生效的发票汇率，避免始终回退为 1.0
      if (detail.invoiceExchangeRate) {
        invoiceExchangeRate.value = detail.invoiceExchangeRate;
      } else if (detail.currencyId && detail.currencyId !== 1) {
        invoiceExchangeRate.value = await fetchInvoiceExchangeRate(
          detail.currencyId,
        );
      } else {
        invoiceExchangeRate.value = 1.0;
      }

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

      // ✅ 修改：在设置currencyId之后，再加载客户开票信息
      console.log(
        '🔄 开始加载客户开票信息，此时currencyId已设置为:',
        formData.value.currencyId,
      );
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

      // ✅ 修改：只有在没有自动选中开票信息时，才使用后端返回的clientInvoiceInfo
      if (
        !selectedClientInvoiceInfo.value ||
        !selectedClientInvoiceInfo.value.id
      ) {
        selectedClientInvoiceInfo.value = detail.clientInvoiceInfo;
        console.log('📋 使用后端返回的客户开票信息:', {
          id: selectedClientInvoiceInfo.value?.id,
          header: selectedClientInvoiceInfo.value?.header,
        });
      } else {
        console.log('📋 保持已自动选中的客户开票信息:', {
          id: selectedClientInvoiceInfo.value?.id,
          header: selectedClientInvoiceInfo.value?.header,
        });
      }

      // 从 feeGroups 中提取 invoiceApplicationItems
      const invoiceApplicationItems: any[] = [];
      if (detail.feeGroups && detail.feeGroups.length > 0) {
        detail.feeGroups.forEach((group: any) => {
          if (group.items && group.items.length > 0) {
            group.items.forEach((item: any) => {
              // ✅ 调试日志：检查 item 的结构
              console.log('📋 useLoadDetail - 提取 invoiceApplicationItem:', {
                id: item.id,
                orderFeeId: item.orderFeeId,
                appliedAmount: item.appliedAmount,
              });

              invoiceApplicationItems.push({
                id: item.id, // ✅ 关键修复：保存 invoiceApplicationItem 的 ID
                orderFeeId: item.orderFeeId,
                appliedAmount: item.appliedAmount,
                remark: item.remark || '',
              });
            });
          }
        });
      }

      // ✅ 更新formData中的invoiceApplicationItems
      formData.value.invoiceApplicationItems = invoiceApplicationItems;

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
              // ✅ 调试日志：检查 item 的结构
              console.log('📋 useLoadDetail - 构建 childNode, item:', {
                id: item.id,
                orderFeeId: item.orderFeeId,
                appliedAmount: item.appliedAmount,
              });

              const childNode: any = {
                id: item.id,
                parentId: parentNode.id,
                orderFee: item.orderFee,
                appliedAmount: item.appliedAmount,
                settlementUnit: item.orderFee?.settlement?.name || '-',
                payReceiveType: item.orderFee?.paySide === 0 ? '应收' : '应付',
                feeName: item.orderFee?.feeCode?.cnName || '-',
                amount: item.orderFee?.amount,
                currencyCode: item.orderFee?.currency?.code || '-',
                remainingInvoiceAmount: item.remainingInvoiceAmount,
                commissionNum: group.transportOrder?.commissionNum,
                mblNum: group.transportOrder?.mblNum || '-',
                bookingNum: group.transportOrder?.bookingNum || '-',
                transportOrder: group.transportOrder,
                // ✅ 新增：保存 invoiceApplicationItem 的 ID，用于删除操作
                invoiceApplicationItemId: item.id,
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
      } else {
        // ✅ 新增：如果商品明细为空，且存在费用，则根据结算对象生成默认商品明细
        if (
          invoiceApplicationItems.length > 0 &&
          detail.settlementId &&
          detail.currencyId
        ) {
          console.log('⚠️ 商品明细为空，准备生成默认商品明细...');
          await generateDefaultGoodsDetail(
            detail.settlementId,
            detail.currencyId,
            invoiceApplicationItems,
          );
        }
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
