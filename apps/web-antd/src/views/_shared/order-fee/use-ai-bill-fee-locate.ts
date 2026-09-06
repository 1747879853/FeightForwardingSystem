import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { message } from 'ant-design-vue';

import { extractBillFees } from '#/api/sea-export/gemini-admin';

import { setPendingBillFees } from './ai-bill-fee-pending';

/**
 * bizType → 详情编辑路由前缀。
 * 0=海运出口 1=海运进口 2=空运出口（与后端 ExtractBillFeesAsync 返回的 transportOrder.bizType 一致）
 */
const BIZ_ROUTE_BASE: Record<number, string> = {
  0: '/sea-exports',
  1: '/sea-imports',
  2: '/air-exports',
};

/**
 * 列表页「AI 识别账单费用」→ 定位业务 → 跳转费用页。
 *
 * 流程：
 * 1. 在列表页上传单票账单（不传 transportOrderId），由后端按识别出的提单号匹配业务；
 * 2. 匹配成功后把识别出的费用写入跨页内存暂存（ai-bill-fee-pending）；
 * 3. 跳转到该业务详情的费用页（`?tab=fee`，editor.vue 读 query.tab 切到应收应付）；
 * 4. 费用页应付表挂载后按 transportOrderId 消费暂存并自动弹出确认弹窗，由用户勾选后添加。
 *
 * 三个列表页（海运出口/进口/空运出口）逻辑一致，路由前缀由返回的 bizType 决定，故收敛到此处共用。
 */
export function useAiBillFeeLocate() {
  const router = useRouter();

  /** 识别中：驱动上传弹窗的 Spin，并防止重复提交 */
  const recognizing = ref(false);

  /**
   * 识别账单并跳转到对应业务的费用页
   * @param file 单票账单文件（类型/大小已由上传弹窗前置校验）
   * @returns 识别并跳转成功返回 true；识别失败 / 未匹配业务返回 false（供调用方决定是否关闭上传弹窗）
   */
  async function recognizeAndLocate(file: File): Promise<boolean> {
    if (recognizing.value) return false;
    recognizing.value = true;

    const hideLoading = message.loading({
      content: 'AI识别中，请稍候...',
      duration: 0,
      key: 'ai_bill_fee_locate',
    });

    try {
      // 列表页不传 transportOrderId，由后端用识别出的提单号去匹配业务
      const result = await extractBillFees(file);
      hideLoading();

      const transportOrder = result?.transportOrder;
      if (!transportOrder?.id) {
        message.warning('未识别到匹配的提单号或业务，请检查账单后重试');
        return false;
      }

      const base = BIZ_ROUTE_BASE[transportOrder.bizType];
      if (!base) {
        message.warning(
          `暂不支持该业务类型（bizType=${transportOrder.bizType}）的账单识别`,
        );
        return false;
      }

      // 跨页暂存识别费用：费用页应付表挂载后按 transportOrderId 精确消费
      setPendingBillFees({
        transportOrderId: transportOrder.id,
        transportOrder,
        orderFees: result.orderFees ?? [],
      });

      const feeCount = result.orderFees?.length ?? 0;
      message.success(
        feeCount > 0
          ? `识别到 ${feeCount} 条费用，正在跳转到费用页确认`
          : '已匹配到业务，正在跳转到费用页',
      );

      await router.push(`${base}/${transportOrder.id}/edit?tab=fee`);
      return true;
    } catch (error) {
      // 后端错误文案（如「账单提单号与业务主提单号不一致」「未匹配到业务」）已由全局请求拦截器提示，
      // 此处仅关闭 loading 并记录，避免重复弹窗
      hideLoading();
      console.error('[useAiBillFeeLocate] 账单识别失败:', error);
      return false;
    } finally {
      recognizing.value = false;
    }
  }

  return {
    recognizing,
    recognizeAndLocate,
  };
}
