import { flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DetailPanel from './detail-panel.vue';

const mocks = vi.hoisted(() => ({
  getDetail: vi.fn(),
  openAttachment: vi.fn(),
}));
vi.mock('#/api/settlement-management/payment-application-admin', () => ({
  getPaymentApplicationDetail: mocks.getDetail,
}));
vi.mock('#/components/attachment-viewer', () => ({
  openAttachmentViewer: mocks.openAttachment,
}));
vi.mock('@vben/icons', () => ({ IconifyIcon: { render: () => null } }));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/utils', () => ({ compareAttachmentTypeSortIdDesc: () => 0 }));
vi.mock('#/views/fee-management/add-fee-modal/data', () => ({
  resolvePodPortDisplayName: () => '',
  resolvePolPortDisplayName: () => '',
}));
vi.mock('./data', () => ({
  formatSettlementReceivableItems: () => [],
}));

const wrappers: ReturnType<typeof mount>[] = [];
beforeEach(() => {
  mocks.getDetail.mockReset();
  mocks.openAttachment.mockReset();
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

function detail(name = '结算单位甲', status: null | number = null) {
  return {
    applicationNo: 'PA-001',
    settlement: { name },
    payAppFeeBySeaExportGroup: [
      {
        transportOrder: {
          id: 'order-1',
          commissionNum: 'SE-001',
          recSettlementStatus: status,
        },
        paymentApplicationItems: [
          {
            orderFeeId: 'fee-1',
            appliedAmount: 100,
            orderFee: {
              transportOrderId: 'order-1',
              paySide: 1,
              settlementId: 'settlement-1',
              currencyId: 1,
              amount: 100,
            },
          },
        ],
      },
    ],
    paymentApplicationInvoices: [
      {
        id: 'invoice-1',
        sellerHeader: '发票抬头甲',
        invoiceNo: 'INV-001',
        invoiceDate: '2026-09-19',
        amount: 0,
        attachment: {
          attachmentId: 'attachment-1',
          friendlyFileName: '发票.pdf',
          url: '/invoice.pdf',
        },
      },
    ],
  };
}

function renderPanel(id = 'application-1') {
  const wrapper = mount(DetailPanel, { props: { paymentApplicationId: id } });
  wrappers.push(wrapper);
  return wrapper;
}

describe('付费审批详情', () => {
  it.each([
    [0, '未结算'],
    [1, '部分结算'],
    [2, '结算完毕'],
    [null, '—'],
  ] as const)(
    '展示后端整票结算状态 %s；空值不按本申请应付费用推算',
    async (status, label) => {
      mocks.getDetail.mockResolvedValue(detail('结算单位甲', status));
      const wrapper = renderPanel();
      await flushPromises();
      const table = wrapper.get('.fee-group-table');
      expect(table.text()).toContain('应收结算状态');
      expect(table.text()).toContain(label);
      expect(wrapper.get('.receivable-title').text()).toContain('结算单位甲');
      expect(wrapper.text()).not.toContain('paymentApplication.feeSummary');
    },
  );

  it('发票独立展示表头、零金额及可预览附件', async () => {
    mocks.getDetail.mockResolvedValue(detail());
    const wrapper = renderPanel();
    await flushPromises();
    const invoice = wrapper.get('.invoice-card');
    expect(invoice.text()).toContain('发票抬头');
    expect(invoice.text()).toContain('INV-001');
    expect(invoice.text()).toContain('0.00');
    await invoice.get('button').trigger('click');
    expect(mocks.openAttachment).toHaveBeenCalledWith(
      detail().paymentApplicationInvoices[0]?.attachment,
    );
    expect(wrapper.get('.attachment-card').text()).not.toContain('INV-001');
  });

  it('快速切换申请时，较晚返回的旧详情不能覆盖新结算单位', async () => {
    let resolveFirst!: (value: ReturnType<typeof detail>) => void;
    mocks.getDetail.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    mocks.getDetail.mockResolvedValueOnce(detail('结算单位乙'));
    const wrapper = renderPanel();
    await wrapper.setProps({ paymentApplicationId: 'application-2' });
    await flushPromises();
    resolveFirst(detail('结算单位甲'));
    await flushPromises();
    expect(wrapper.get('.receivable-title').text()).toContain('结算单位乙');
    expect(wrapper.get('.receivable-title').text()).not.toContain('结算单位甲');
  });
});
