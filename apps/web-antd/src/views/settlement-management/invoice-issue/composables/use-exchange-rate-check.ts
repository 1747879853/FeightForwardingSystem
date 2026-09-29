import { message, Modal } from 'ant-design-vue';

import {
  InvoiceIssueApi,
  syncApplicationGoodsDtlByExchangeRate,
} from '#/api/Invoice/InvoiceIssue';

/**
 * 处理 AddAsync / AddApplicationsAsync 返回的汇率校验结果（code != 0）
 * @returns true 表示业务已成功（code=0）；false 表示未落库或已引导用户处理
 */
export async function handleExchangeRateCheck(
  result: InvoiceIssueApi.InvoiceIssueExchangeRateCheckDto,
): Promise<boolean> {
  if (result.code === 0) {
    return true;
  }

  if (result.code === 2) {
    const multiApps = result.multiGoodsDtlApplicationIds || [];
    Modal.error({
      title: '无法自动更新商品明细',
      content: `以下开票申请无法自动修正（汇率已变动且商品明细不止一条，或申请缺汇率），请先驳回后补填汇率/调整商品明细：\n\n${multiApps
        .map((id) => `• ${id}`)
        .join('\n')}`,
      width: 600,
    });
    return false;
  }

  if (result.code === 1) {
    const singleApps = result.singleGoodsDtlApplicationIds || [];

    return new Promise((resolve) => {
      Modal.confirm({
        title: '发票汇率已变动',
        content: `所选开票申请的发票汇率已变动，确认按当前汇率更新其商品明细金额吗？\n\n受影响的申请数量：${singleApps.length} 个`,
        okText: '确认更新',
        cancelText: '取消',
        onOk: async () => {
          try {
            const syncResult = await syncApplicationGoodsDtlByExchangeRate({
              invoiceApplicationIds: singleApps,
            });

            message.success(
              `已成功修正 ${syncResult.updatedApplicationIds.length} 个申请的商品明细金额，请重新提交`,
            );
            resolve(false);
          } catch (error) {
            // 后端缺汇率等业务错误由 requestClient 拦截器原样提示，勿再覆盖
            console.error('❌ 修正商品明细失败:', error);
            resolve(false);
          }
        },
        onCancel: () => {
          resolve(false);
        },
      });
    });
  }

  return false;
}
