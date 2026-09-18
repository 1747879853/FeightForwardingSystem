import { h } from 'vue';

import { message, Modal, Textarea } from 'ant-design-vue';

import { $t } from '#/locales';

import {
  calcOrderFeeProfitRmb,
  collectFeesForPostSubmitProfit,
  type FeeProfitCalcRow,
} from './helpers';

/**
 * 提交前若「提交后利润」为负，弹出必填备注；否则直接返回空串。
 * 返回的备注写入 SubmitOrderFeeDto.remark。
 * @returns 备注；用户取消返回 null
 */
export function promptSubmitRemarkIfNegativeProfit(
  allFees: FeeProfitCalcRow[],
  submittingFees: FeeProfitCalcRow[],
): Promise<string | null> {
  const profitFees = collectFeesForPostSubmitProfit(allFees, submittingFees);
  const profit = calcOrderFeeProfitRmb(profitFees);

  if (profit >= 0) {
    return Promise.resolve('');
  }

  return new Promise((resolve) => {
    let modalRemark = '';
    let settled = false;
    const settle = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Modal.confirm({
      title: '利润为负，请填写备注',
      content: () =>
        h('div', {}, [
          h(
            'div',
            {
              style: 'margin-bottom: 8px; color: #666; font-size: 13px;',
            },
            `提交后合计利润约为 ¥${profit.toFixed(2)}（应收−应付，主单/更改单分算）。利润为负时备注必填。`,
          ),
          h(Textarea, {
            modelValue: modalRemark,
            onChange: (val: { target?: { value?: string } } | string) => {
              modalRemark =
                typeof val === 'string' ? val : (val.target?.value ?? '');
            },
            rows: 3,
            placeholder: '请说明负利润原因',
            maxlength: 100,
            style: 'margin-top: 4px;',
          }),
        ]),
      icon: null,
      width: 520,
      centered: true,
      okText: $t('common.confirm'),
      cancelText: $t('common.cancel'),
      async onOk() {
        const remark = modalRemark.trim();
        if (!remark) {
          message.warning('利润为负时备注必填');
          return Promise.reject(new Error('remark required'));
        }
        settle(remark);
      },
      onCancel() {
        settle(null);
      },
    });
  });
}
