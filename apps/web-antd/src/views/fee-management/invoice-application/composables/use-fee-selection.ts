import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import {
  getCompanyIdByOrgId,
  getMyDefaultOrgId,
} from '#/composables/use-my-org';
import { resolveOrganizationCompany } from '#/api/system/organization-unit';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import {
  isExchangeRateEffective,
  isRmbLocalCurrencyRate,
} from '#/utils/exchange-rate-cache';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
import { InvoiceRemarkTemplateApi } from '#/api/Invoice/invoiceRemarkTemplate';
import {
  buildExchangeRateRows,
  getMissingExchangeRateCurrencyIds,
  toApplicationCurrency,
  toExchangeRateInputs,
  toInvoiceRmbAmount,
  type InvoiceApplicationExchangeRateRow,
} from '#/utils/invoice-application-amount';

import { promptMissingExchangeRates } from './prompt-missing-exchange-rates';
import { groupFeesByCurrency } from '../original-currency';

/**
 * 费用选择抽屉保存处理逻辑
 */
export function useFeeSelectionSave(
  formData: Ref<any>,
  feeGroupsData: Ref<any[]>,
  goodsDetails: Ref<any[]>,
  invoiceExchangeRate: Ref<number>,
  selectedCurrencyCode: Ref<string>,
  codeInvoiceList: Ref<any[]>,
  loadCodeInvoiceList: () => Promise<void>,
  addSelectedFeesToForm: (selectedFees: any[]) => void,
  autoFillGoodsDetails: (selectedFees: any[]) => Promise<void>,
  mergeAmountToExistingGoods: (selectedFees: any[]) => Promise<void>,
  loadClientInvoiceInfo: (settlementId: string) => Promise<void>,
  updateOrgBankByCurrency: () => void,
  flattenTreeData: (data: any[]) => any[],
  invoiceApplicationExchangeRates: Ref<InvoiceApplicationExchangeRateRow[]>,
  syncExchangeRateRows: () => void,
  loadDefaultRemarkTemplate?: () => Promise<void>,
  orgBankAccounts?: Ref<any[]>,
  onCreated?: (ids: string[]) => void,
  onRefresh?: () => Promise<void>,
) {
  function buildMissingRateMessage(missingIds: number[]): string {
    return missingIds
      .map((id) => {
        const row = invoiceApplicationExchangeRates.value.find(
          (r) => r.currencyId === id,
        );
        const fromFee = flattenTreeData(feeGroupsData.value).find(
          (f: any) => Number(f.orderFee?.currencyId) === id,
        );
        const label =
          row?.currencyCode ||
          row?.currencyName ||
          fromFee?.orderFee?.currency?.code ||
          fromFee?.currencyCode ||
          String(id);
        return `币别[${label}]与开票申请币别不同,汇率必填且必须大于0`;
      })
      .join('；');
  }

  function rebuildRateRowsFromFees(fees: any[], applicationCurrencyId: number) {
    const items = fees.map((fee: any) => ({
      currencyId: Number(fee.orderFee?.currencyId),
      appliedAmount:
        Number(fee.appliedAmount ?? fee.orderFee?.remainingInvoiceAmount) || 0,
    }));
    const currencyMeta = new Map<
      number,
      { code?: string; cnName?: string; enName?: string }
    >();
    fees.forEach((fee: any) => {
      const currency = fee.orderFee?.currency;
      const cid = fee.orderFee?.currencyId;
      if (cid) {
        currencyMeta.set(Number(cid), {
          code: currency?.code || fee.currencyCode,
          cnName: currency?.cnName,
          enName: currency?.enName,
        });
      }
    });
    // 合并表单已有费用
    const existingItems = (formData.value.invoiceApplicationItems || []).map(
      (item: any) => {
        const fee = flattenTreeData(feeGroupsData.value).find(
          (f: any) => String(f.orderFee?.id) === String(item.orderFeeId),
        );
        return {
          currencyId: Number(
            fee?.orderFee?.currencyId || formData.value.currencyId,
          ),
          appliedAmount: Number(item.appliedAmount) || 0,
        };
      },
    );
    const allItems = [...existingItems, ...items];

    invoiceApplicationExchangeRates.value = buildExchangeRateRows({
      applicationCurrencyId,
      items: allItems,
      existingRates: invoiceApplicationExchangeRates.value,
      currencyMeta,
    });
  }

  /**
   * 基于所有费用重新计算商品明细金额
   */
  async function recalculateGoodsAmountFromAllFees() {
    if (goodsDetails.value.length !== 1) {
      return;
    }

    const items = formData.value.invoiceApplicationItems || [];
    if (items.length === 0) {
      goodsDetails.value = [];
      return;
    }

    if (codeInvoiceList.value.length === 0) {
      await loadCodeInvoiceList();
    }

    const invoiceCurrencyId = formData.value.currencyId;
    if (!invoiceCurrencyId) {
      return;
    }

    let currencyCode = '';
    try {
      const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
      currencyCode = currencyDetail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
      return;
    }

    if (!currencyCode) {
      return;
    }

    const defaultCodeInvoice = codeInvoiceList.value.find(
      (item) =>
        !!item.isDefault &&
        (item.currency?.code === currencyCode ||
          item.defaultCurrency === currencyCode),
    );

    if (!defaultCodeInvoice) {
      return;
    }

    const allFees = flattenTreeData(feeGroupsData.value);
    const feeItems = items
      .map((item: any) => {
        const fee = allFees.find(
          (f: any) => String(f.orderFee?.id) === String(item.orderFeeId),
        );
        const currencyId = fee?.orderFee?.currencyId;
        if (!currencyId) return null;
        return {
          currencyId: Number(currencyId),
          appliedAmount: Number(item.appliedAmount) || 0,
        };
      })
      .filter(Boolean) as Array<{ currencyId: number; appliedAmount: number }>;

    const totalApp = toApplicationCurrency(
      feeItems,
      Number(invoiceCurrencyId),
      invoiceApplicationExchangeRates.value,
    );
    const totalRmbAmount = toInvoiceRmbAmount(
      totalApp,
      invoiceExchangeRate.value || 1,
    );
    if (totalRmbAmount == null) {
      return;
    }

    const existingItem = goodsDetails.value[0];

    if (existingItem.codeInvoiceId === defaultCodeInvoice.id) {
      const taxRate = existingItem.taxRate || defaultCodeInvoice.taxRate || 0;

      existingItem.amount = totalRmbAmount;
      existingItem.unitPrice = totalRmbAmount;
      existingItem.noTaxAmount = totalRmbAmount / (1 + taxRate / 100);
      existingItem.taxAmount =
        (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100);
    } else {
      message.warning('商品明细与当前币别不匹配，请手动调整或重新填充');
    }
  }

  async function fetchInvoiceExchangeRateForCurrency(
    currencyId: number,
  ): Promise<number> {
    if (currencyId === 1) return 1;
    try {
      const exchangeRateList = await getExchangeRatePagedList({
        CurrencyId: currencyId,
        LocalCurrencyId: 1,
        PageIndex: 1,
        PageSize: 100,
      });
      const validRates = (exchangeRateList?.items || []).filter(
        (rate) => isRmbLocalCurrencyRate(rate) && isExchangeRateEffective(rate),
      );
      if (validRates.length > 0) {
        validRates.sort((a, b) => {
          const aSortId = a.sortId ?? 0;
          const bSortId = b.sortId ?? 0;
          if (bSortId !== aSortId) return bSortId - aSortId;
          return String(b.id) > String(a.id) ? -1 : 1;
        });
        return validRates[0]?.invoiceValue ?? 1;
      }
    } catch (error) {
      console.error('获取币别汇率失败:', error);
    }
    return 1;
  }

  /**
   * 处理费用选择保存
   */
  async function handleFeeSelectionSave(data: {
    selectedFees: any[];
    settlementId: string;
    /** 为空表示按费用原币分别生成开票申请 */
    currencyId: null | number;
    invoiceExchangeRate?: number;
    feeGroupsData?: any[];
  }) {
    const {
      selectedFees,
      settlementId,
      currencyId: applicationCurrencyId,
      invoiceExchangeRate: rate,
      feeGroupsData: groupsData,
    } = data;

    const isEdit = !!formData.value.id;
    if (!applicationCurrencyId && isEdit) {
      message.warning('请选择开票申请币别（主币别）');
      return;
    }

    formData.value.settlementId = settlementId;
    if (applicationCurrencyId) {
      formData.value.currencyId = applicationCurrencyId;
    }

    if (applicationCurrencyId && rate !== undefined) {
      invoiceExchangeRate.value = rate;
    }

    updateOrgBankByCurrency();
    await loadClientInvoiceInfo(settlementId);

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
      }
    }

    const existingFeeIds = getAddedFeeIds();
    const newFees = selectedFees.filter((fee: any) => {
      const feeId = String(fee.orderFee?.id);
      return !existingFeeIds.has(feeId);
    });

    if (newFees.length === 0) {
      message.warning('所选费用已全部添加，无新增费用');
      return;
    }

    if (applicationCurrencyId) {
      rebuildRateRowsFromFees(newFees, Number(applicationCurrencyId));
    }

    const feeItemsForValidation = applicationCurrencyId
      ? [
          ...((formData.value.invoiceApplicationItems || []).map(
            (item: any) => {
              const fee = flattenTreeData(feeGroupsData.value).find(
                (f: any) => String(f.orderFee?.id) === String(item.orderFeeId),
              );
              return {
                currencyId: Number(
                  fee?.orderFee?.currencyId || applicationCurrencyId,
                ),
                appliedAmount: Number(item.appliedAmount) || 0,
              };
            },
          ) as Array<{ currencyId: number; appliedAmount: number }>),
          ...newFees.map((fee: any) => ({
            currencyId: Number(fee.orderFee?.currencyId),
            appliedAmount:
              Number(
                fee.appliedAmount ?? fee.orderFee?.remainingInvoiceAmount,
              ) || 0,
          })),
        ]
      : [];

    let missing = applicationCurrencyId
      ? getMissingExchangeRateCurrencyIds(
          Number(applicationCurrencyId),
          feeItemsForValidation,
          invoiceApplicationExchangeRates.value,
        )
      : [];

    // 缺汇率：弹窗补录，确认后继续新增；取消则中止。原币拆单时各组币别与费用一致，不需要补汇率。
    if (applicationCurrencyId && missing.length > 0) {
      let appCurrencyLabel = selectedCurrencyCode.value;
      if (!appCurrencyLabel) {
        try {
          const detail = await getCurrencyDetail(Number(applicationCurrencyId));
          appCurrencyLabel = detail.code || String(applicationCurrencyId);
          selectedCurrencyCode.value = appCurrencyLabel;
        } catch {
          appCurrencyLabel = String(applicationCurrencyId);
        }
      }

      const missingRows = invoiceApplicationExchangeRates.value.filter((r) =>
        missing.includes(r.currencyId),
      );
      const filled = await promptMissingExchangeRates({
        applicationCurrencyLabel: appCurrencyLabel,
        rows: missingRows.map((r) => ({
          currencyId: r.currencyId,
          currencyCode: r.currencyCode,
          currencyName: r.currencyName,
          appliedAmount: r.appliedAmount,
          exchangeRate: r.exchangeRate,
        })),
      });

      if (!filled) {
        message.info('已取消添加费用');
        return;
      }

      for (const item of filled) {
        const row = invoiceApplicationExchangeRates.value.find(
          (r) => r.currencyId === item.currencyId,
        );
        if (row) {
          row.exchangeRate = item.exchangeRate;
        } else {
          invoiceApplicationExchangeRates.value.push({
            currencyId: item.currencyId,
            exchangeRate: item.exchangeRate,
          });
        }
      }

      missing = getMissingExchangeRateCurrencyIds(
        Number(applicationCurrencyId),
        feeItemsForValidation,
        invoiceApplicationExchangeRates.value,
      );
      if (missing.length > 0) {
        message.warning(buildMissingRateMessage(missing));
        return;
      }
    }

    const fixedRateInputs = applicationCurrencyId
      ? toExchangeRateInputs(
          Number(applicationCurrencyId),
          invoiceApplicationExchangeRates.value,
          { includeMain: true },
        )
      : [];

    const feeBuckets: Array<{ currencyId: number; fees: any[] }> = [];
    if (applicationCurrencyId) {
      feeBuckets.push({
        currencyId: Number(applicationCurrencyId),
        fees: newFees,
      });
    } else {
      const split = groupFeesByCurrency(newFees);
      if (split.missing.length > 0) {
        message.warning('有费用缺少币别，无法按原币生成开票申请');
        return;
      }
      for (const [currencyId, fees] of split.groups) {
        feeBuckets.push({ currencyId, fees });
      }
    }

    if (!isEdit) {
      try {
        const hasUserRemark = !!(
          formData.value.remark && formData.value.remark.trim()
        );

        if (loadDefaultRemarkTemplate && !hasUserRemark) {
          await loadDefaultRemarkTemplate();
        }

        if (codeInvoiceList.value.length === 0) {
          await loadCodeInvoiceList();
        }

        const currencyGroups: InvoiceApplicationAdminApi.InvoiceApplicationCurrencyGroupDto[] =
          [];
        for (const bucket of feeBuckets) {
          const planCurrencyId = bucket.currencyId;
          const planFees = bucket.fees;
          const planPresetRate = applicationCurrencyId ? rate : undefined;
          const planRateInputs = applicationCurrencyId
            ? fixedRateInputs
            : toExchangeRateInputs(
                planCurrencyId,
                [
                  {
                    currencyId: planCurrencyId,
                    exchangeRate: 1,
                  },
                ],
                { includeMain: true },
              );
          let currencyCode = applicationCurrencyId
            ? selectedCurrencyCode.value
            : '';
          try {
            const currencyDetail = await getCurrencyDetail(planCurrencyId);
            currencyCode = currencyDetail.code || currencyCode;
            selectedCurrencyCode.value = currencyCode;
          } catch (error) {
            console.error('获取币别详情失败:', error);
          }

          if (!currencyCode) {
            message.error('无法获取开票申请币别代码');
            return;
          }

          const currentCurrencyExchangeRate =
            planPresetRate !== undefined
              ? planPresetRate
              : await fetchInvoiceExchangeRateForCurrency(planCurrencyId);
          invoiceExchangeRate.value = currentCurrencyExchangeRate;

          let clientInvoiceBankIdForCurrency: string | undefined =
            formData.value.clientInvoiceBankId || undefined;
          let clientBankNameForCurrency = '';
          let clientBankAccountForCurrency = '';

          if (settlementId && planCurrencyId) {
            try {
              const clientInvoiceInfoList = await getClientInvoiceInfoList({
                ClientId: settlementId,
              });
              const defaultInvoiceInfo = clientInvoiceInfoList?.find(
                (info) => info.isDefault,
              );
              if (defaultInvoiceInfo?.clientInvoiceBanks) {
                const defaultBank =
                  defaultInvoiceInfo.clientInvoiceBanks
                    .filter((bank) => bank.currencyId === planCurrencyId)
                    .find((bank) => bank.isDefault) ||
                  defaultInvoiceInfo.clientInvoiceBanks.filter(
                    (bank) => bank.currencyId === planCurrencyId,
                  )[0];
                if (defaultBank) {
                  clientInvoiceBankIdForCurrency = defaultBank.id;
                  clientBankNameForCurrency = defaultBank.bankName || '';
                  clientBankAccountForCurrency = defaultBank.bankAccount || '';
                }
              }
            } catch (error) {
              console.warn('获取客户开票信息失败:', error);
            }
          }

          let currencyRemark = formData.value.remark || '';
          try {
            const rawOrgId = formData.value.orgId || getMyDefaultOrgId() || 0;
            const orgId =
              getCompanyIdByOrgId(rawOrgId) ??
              (await resolveOrganizationCompany(rawOrgId))?.id ??
              rawOrgId;
            if (!hasUserRemark && orgId && planCurrencyId) {
              const templates =
                await InvoiceRemarkTemplateApi.getPagedListAsync({
                  pageIndex: 1,
                  pageSize: 100,
                  orgId: orgId,
                  currencyId: planCurrencyId,
                });
              const defaultTemplate = templates.items?.find((t) => t.default);
              if (defaultTemplate) {
                let templateContent = defaultTemplate.template || '';
                const commissionNums = new Set<string>();
                const mblNums = new Set<string>();
                planFees.forEach((fee: any) => {
                  if (fee.transportOrder?.commissionNum) {
                    commissionNums.add(fee.transportOrder.commissionNum);
                  }
                  if (fee.transportOrder?.mblNum) {
                    mblNums.add(fee.transportOrder.mblNum);
                  }
                });

                const feeItems = planFees.map((fee: any) => ({
                  currencyId: Number(fee.orderFee?.currencyId),
                  appliedAmount:
                    Number(
                      fee.appliedAmount ?? fee.orderFee?.remainingInvoiceAmount,
                    ) || 0,
                }));
                const totalOriginalAmount =
                  toApplicationCurrency(
                    feeItems,
                    Number(planCurrencyId),
                    invoiceApplicationExchangeRates.value,
                  ) ?? 0;
                const totalRmbAmount =
                  toInvoiceRmbAmount(
                    totalOriginalAmount,
                    currentCurrencyExchangeRate,
                  ) ?? 0;

                let orgBankName = '';
                let orgBankAccount = '';
                if (orgBankAccounts?.value) {
                  const matchedOrgBank = orgBankAccounts.value.find(
                    (b) => b.currencyId === planCurrencyId,
                  );
                  if (matchedOrgBank) {
                    orgBankName = matchedOrgBank.bankName;
                    orgBankAccount = matchedOrgBank.bankAccount;
                  } else if (formData.value.orgBankAccountId) {
                    const selectedOrgBank = orgBankAccounts.value.find(
                      (b) => b.id === formData.value.orgBankAccountId,
                    );
                    if (selectedOrgBank) {
                      orgBankName = selectedOrgBank.bankName;
                      orgBankAccount = selectedOrgBank.bankAccount;
                    }
                  }
                }

                const replacements: Record<string, string> = {
                  '<委托编号>': Array.from(commissionNums).join('、'),
                  '<主提单号>': Array.from(mblNums).join('、'),
                  '[折算汇率]': String(currentCurrencyExchangeRate),
                  '[外币金额(总计)]': totalOriginalAmount.toFixed(2),
                  '[人民币金额(总计)]': totalRmbAmount.toFixed(2),
                  '[购方银行]': clientBankNameForCurrency,
                  '[购方账号]': clientBankAccountForCurrency,
                  '[销方银行]': orgBankName,
                  '[销方账号]': orgBankAccount,
                };

                for (const [placeholder, value] of Object.entries(
                  replacements,
                )) {
                  const regex = new RegExp(
                    placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                    'g',
                  );
                  templateContent = templateContent.replace(regex, value);
                }
                currencyRemark = templateContent;
              }
            }
          } catch (error) {
            console.warn('获取或处理默认备注模板失败:', error);
          }

          const { findDefaultCodeInvoice } =
            await import('#/views/_shared/invoice-goods');
          const defaultCodeInvoice = findDefaultCodeInvoice(
            codeInvoiceList.value,
            currencyCode,
          );

          if (!defaultCodeInvoice) {
            message.warning(
              `未找到${currencyCode}币别的默认商品编码，请手动添加商品明细后保存`,
            );
            return;
          }

          const feeItems = planFees.map((fee: any) => ({
            currencyId: Number(fee.orderFee?.currencyId),
            appliedAmount:
              Number(
                fee.appliedAmount ?? fee.orderFee?.remainingInvoiceAmount,
              ) || 0,
          }));
          const totalApp = toApplicationCurrency(
            feeItems,
            Number(planCurrencyId),
            invoiceApplicationExchangeRates.value,
          );
          const totalRmbAmount =
            toInvoiceRmbAmount(totalApp, currentCurrencyExchangeRate) ?? 0;

          const taxRate = defaultCodeInvoice.taxRate || 0;
          const invoiceApplicationGoodsDtls: InvoiceApplicationAdminApi.InvoiceApplicationGoodsDtlAddDto[] =
            [
              {
                codeInvoiceId: defaultCodeInvoice.id,
                specification: defaultCodeInvoice.specification || '',
                unit: defaultCodeInvoice.unit || '票',
                quantity: 1,
                unitPrice: totalRmbAmount,
                amount: totalRmbAmount,
                noTaxAmount: totalRmbAmount / (1 + taxRate / 100),
                taxRate: taxRate,
                taxAmount:
                  (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100),
                remark: '',
              },
            ];

          const currencyGroup: InvoiceApplicationAdminApi.InvoiceApplicationCurrencyGroupDto =
            {
              currencyId: planCurrencyId,
              invoiceType: formData.value.invoiceType,
              orgBankAccountId: formData.value.orgBankAccountId || undefined,
              clientInvoiceBankId: clientInvoiceBankIdForCurrency,
              invoiceApplicationItems: planFees.map((fee: any) => ({
                orderFeeId: fee.orderFee.id,
                appliedAmount:
                  fee.appliedAmount ?? fee.orderFee.remainingInvoiceAmount,
                remark: '',
              })),
              invoiceApplicationGoodsDtls,
              invoiceApplicationExchangeRates: planRateInputs,
              remark: currencyRemark,
            };

          currencyGroups.push(currencyGroup);
        }

        const addData: InvoiceApplicationAdminApi.InvoiceApplicationBatchAddDto =
          {
            settlementId: settlementId,
            orgId: formData.value.orgId || getMyDefaultOrgId() || 0,
            require: formData.value.require,
            currencyGroups,
          };

        const ids = await InvoiceApplicationAdminApi.add(addData);

        if (ids && ids.length > 0) {
          const firstId = ids[0];
          formData.value.id = firstId;
          // 成功后再写入本地费用，避免创建失败后抽屉灰掉无法重选
          addSelectedFeesToForm(selectedFees);
          if (onCreated) {
            onCreated(ids);
          }
          message.success(`成功创建 ${ids.length} 个开票申请单`);
          // 跳转编辑页后由详情重载，避免与本地商品重算竞态
          return;
        }
      } catch (error) {
        console.error('❌ 创建开票申请失败:', error);
        message.error('创建开票申请失败');
        return;
      }
    } else {
      try {
        const addItemsData: InvoiceApplicationAdminApi.InvoiceApplicationAddItemsDto =
          {
            id: formData.value.id,
            invoiceApplicationItems: newFees.map((fee: any) => ({
              orderFeeId: fee.orderFee.id,
              appliedAmount:
                fee.appliedAmount ?? fee.orderFee.remainingInvoiceAmount,
              remark: '',
            })),
            invoiceApplicationExchangeRates: fixedRateInputs,
            invoiceApplicationGoodsDtls: undefined,
          };

        await InvoiceApplicationAdminApi.addItems(addItemsData);
        message.success(`成功添加 ${newFees.length} 条新费用`);

        if (onRefresh) {
          await onRefresh();
          // 详情已重载，无需再本地追加费用/重算
          return;
        }

        addSelectedFeesToForm(selectedFees);
        syncExchangeRateRows();
      } catch (error) {
        console.error('❌ 添加费用明细失败:', error);
        message.error('添加费用明细失败');
        return;
      }
    }

    if (loadDefaultRemarkTemplate && isEdit) {
      await loadDefaultRemarkTemplate();
    }

    if (goodsDetails.value.length === 0) {
      await autoFillGoodsDetails(
        isEdit
          ? (formData.value.invoiceApplicationItems || []).map((item: any) => {
              const allFees = flattenTreeData(feeGroupsData.value);
              const fee = allFees.find(
                (f: any) => String(f.orderFee?.id) === String(item.orderFeeId),
              );
              return (
                fee || {
                  orderFee: item.orderFeeId,
                  appliedAmount: item.appliedAmount,
                }
              );
            })
          : newFees,
      );
    } else if (goodsDetails.value.length === 1) {
      await recalculateGoodsAmountFromAllFees();
    } else {
      message.warning(
        '当前存在多行商品明细，系统无法自动合并金额。建议：\n' +
          '1. 删除多余的商品明细，保留一行\n' +
          '2. 或手动调整各行的金额',
      );
    }
  }

  function getAddedFeeIds(): Set<string> {
    const items = formData.value.invoiceApplicationItems || [];
    return new Set(items.map((item: any) => String(item.orderFeeId)));
  }

  return {
    handleFeeSelectionSave,
  };
}
