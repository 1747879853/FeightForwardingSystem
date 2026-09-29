import { createVNode, defineComponent, reactive } from 'vue';

import { InputNumber, Modal, message } from 'ant-design-vue';

export interface ExchangeRatePromptRow {
  currencyId: number;
  currencyCode?: string;
  currencyName?: string;
  appliedAmount?: number;
  exchangeRate?: null | number;
}

/**
 * 弹窗补录非主币别汇率。确认返回填好的汇率；取消返回 null。
 * 校验失败时 reject 以保持弹窗不关闭。
 */
export function promptMissingExchangeRates(options: {
  applicationCurrencyLabel: string;
  rows: ExchangeRatePromptRow[];
}): Promise<Array<{ currencyId: number; exchangeRate: number }> | null> {
  if (!options.rows.length) {
    return Promise.resolve([]);
  }

  const state = reactive({
    rows: options.rows.map((r) => ({
      currencyId: r.currencyId,
      currencyCode: r.currencyCode,
      currencyName: r.currencyName,
      appliedAmount: r.appliedAmount ?? 0,
      exchangeRate:
        r.exchangeRate != null && Number(r.exchangeRate) > 0
          ? Number(r.exchangeRate)
          : (undefined as number | undefined),
    })),
  });

  const Content = defineComponent({
    name: 'ExchangeRatePromptContent',
    setup() {
      return () =>
        createVNode('div', { class: 'exchange-rate-prompt' }, [
          createVNode(
            'p',
            {
              style:
                'margin: 0 0 14px; font-size: 13px; line-height: 1.6; color: #64748b;',
            },
            `开票申请主币别为 ${options.applicationCurrencyLabel}。以下费用币别与主币别不同，请填写汇率（1 单位费用币别 = N 主币别）后再继续：`,
          ),
          ...state.rows.map((row, index) =>
            createVNode(
              'div',
              {
                key: row.currencyId,
                style:
                  'padding: 12px; margin-bottom: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;',
              },
              [
                createVNode(
                  'div',
                  {
                    style:
                      'margin-bottom: 4px; font-size: 14px; font-weight: 600; color: #0f172a;',
                  },
                  `${row.currencyCode || row.currencyName || row.currencyId} → ${options.applicationCurrencyLabel}`,
                ),
                createVNode(
                  'div',
                  {
                    style:
                      'margin-bottom: 8px; font-size: 12px; color: #94a3b8;',
                  },
                  `原币合计 ${(Number(row.appliedAmount) || 0).toFixed(2)}`,
                ),
                createVNode(InputNumber, {
                  value: row.exchangeRate,
                  min: 0,
                  precision: 6,
                  step: 0.000001,
                  style: 'width: 100%',
                  placeholder: '汇率必填，且必须大于 0',
                  'onUpdate:value': (v: null | number | string) => {
                    state.rows[index]!.exchangeRate =
                      v == null || v === '' ? undefined : Number(v);
                  },
                }),
              ],
            ),
          ),
        ]);
    },
  });

  return new Promise((resolve) => {
    Modal.confirm({
      title: '补充费用币别汇率',
      width: 520,
      icon: null,
      centered: true,
      content: createVNode(Content),
      okText: '确认并继续',
      cancelText: '取消',
      onOk: () => {
        const filled: Array<{ currencyId: number; exchangeRate: number }> = [];
        for (const row of state.rows) {
          const rate = Number(row.exchangeRate);
          if (!rate || rate <= 0) {
            message.warning(
              `请填写币别[${row.currencyCode || row.currencyId}]的汇率，且必须大于0`,
            );
            return Promise.reject(new Error('exchange rate required'));
          }
          filled.push({ currencyId: row.currencyId, exchangeRate: rate });
        }
        resolve(filled);
      },
      onCancel: () => {
        resolve(null);
      },
    });
  });
}
