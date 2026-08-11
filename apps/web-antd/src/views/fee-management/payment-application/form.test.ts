import { defineComponent, h } from 'vue';

import { flushPromises, shallowMount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PaymentApplicationForm from './form.vue';

const mocks = vi.hoisted(() => ({
  addPaymentApplication: vi.fn(),
  getClientInvoiceInfoList: vi.fn(),
  markListShouldRefresh: vi.fn(),
  messageSuccess: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, query: {} }),
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { realName: 'Test User' } }),
}));

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

vi.mock('#/components/workflow-timeline', () => ({
  WorkflowTimeline: { render: () => null },
  useWorkflowTimeline: () => ({ open: vi.fn() }),
}));

vi.mock('#/utils/list-refresh-flag', () => ({
  markListShouldRefresh: mocks.markListShouldRefresh,
  returnToListWithRefresh: vi.fn(),
}));

vi.mock('#/api/sea-export/clinet-invoice-admin', () => ({
  getClientInvoiceInfoList: mocks.getClientInvoiceInfoList,
}));

vi.mock('#/api/settlement-management/payment-application-admin', () => ({
  PaymentApplicationStatus: {
    Auditing: 1,
    Entering: 0,
  },
  addPaymentApplication: mocks.addPaymentApplication,
  editPaymentApplication: vi.fn(),
  getPaymentApplicationDetail: vi.fn(),
  payAppItemAdd: vi.fn(),
  payAppItemDel: vi.fn(),
  submitPaymentApplication: vi.fn(),
  unsubmitPaymentApplication: vi.fn(),
}));

vi.mock('ant-design-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ant-design-vue')>();
  return {
    ...actual,
    message: {
      error: vi.fn(),
      success: mocks.messageSuccess,
      warning: vi.fn(),
    },
  };
});

const SlotStub = defineComponent({
  setup(_props, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const AddFeeDrawerStub = defineComponent({
  emits: [
    'confirm',
    'update:invoiceProcess',
    'update:settlement-currency-id',
    'update:settlement-id',
  ],
  setup(_props, { emit, expose }) {
    expose({ open: vi.fn() });
    const fees = [
      {
        amount: 100,
        appliedAmount: 80,
        currencyCode: 'USD',
        currencyId: 1,
        feeId: 'fee-1',
        paySide: 1,
        settlementId: 'client-1',
        settledAmount: 0,
        transportOrderId: 'order-1',
        unRqstPaymentAmount: 100,
      },
    ];
    const emitConfirm = () => {
      emit('update:settlement-id', 'client-1');
      emit('confirm', fees);
    };
    return () =>
      h('div', [
        h(
          'button',
          {
            'data-testid': 'confirm-fees',
            onClick: emitConfirm,
          },
          'confirm fees',
        ),
        h(
          'button',
          {
            'data-testid': 'confirm-fees-with-invoice',
            onClick: () => {
              emit('update:invoiceProcess', 1);
              emitConfirm();
            },
          },
          'confirm fees with invoice',
        ),
      ]);
  },
});

describe('payment application add form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addPaymentApplication.mockResolvedValue('application-1');
    mocks.getClientInvoiceInfoList.mockResolvedValue([]);
  });

  it('does not create an application until an invoice process is selected', async () => {
    const wrapper = shallowMount(PaymentApplicationForm, {
      global: {
        stubs: {
          ACard: SlotStub,
          ASpin: SlotStub,
          AddFeeDrawer: AddFeeDrawerStub,
          Card: SlotStub,
          Page: SlotStub,
          Spin: SlotStub,
        },
      },
    });

    await wrapper.get('[data-testid="confirm-fees"]').trigger('click');
    await flushPromises();

    expect(mocks.addPaymentApplication).not.toHaveBeenCalled();
  });

  it('saves selected fees using the invoice process selected in the fee drawer', async () => {
    const wrapper = shallowMount(PaymentApplicationForm, {
      global: {
        stubs: {
          ASpin: SlotStub,
          AddFeeDrawer: AddFeeDrawerStub,
          ACard: SlotStub,
          Card: SlotStub,
          Page: SlotStub,
          Spin: SlotStub,
        },
      },
    });

    await wrapper
      .get('[data-testid="confirm-fees-with-invoice"]')
      .trigger('click');
    await flushPromises();

    expect(mocks.addPaymentApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentApplicationItems: [
          expect.objectContaining({
            appliedAmount: 80,
            orderFeeId: 'fee-1',
          }),
        ],
        settlementId: 'client-1',
        status: 0,
        invoiceProcess: 1,
      }),
    );
    expect(mocks.replace).toHaveBeenCalledWith({
      path: '/fee-management/payment-application/application-1/edit',
      query: { fromCreate: '1' },
    });
  });

  it('includes default bank accounts when auto-saving on first fee confirm', async () => {
    mocks.getClientInvoiceInfoList.mockResolvedValue([
      {
        clientInvoiceBanks: [
          {
            accountName: 'Acc',
            bankAccount: '6222',
            bankName: 'ICBC',
            currencyId: 1,
            id: 'bank-usd-1',
            isDefault: true,
          },
        ],
      },
    ]);

    const wrapper = shallowMount(PaymentApplicationForm, {
      global: {
        stubs: {
          ASpin: SlotStub,
          AddFeeDrawer: AddFeeDrawerStub,
          ACard: SlotStub,
          Card: SlotStub,
          Page: SlotStub,
          Spin: SlotStub,
        },
      },
    });

    await wrapper
      .get('[data-testid="confirm-fees-with-invoice"]')
      .trigger('click');
    await flushPromises();

    expect(mocks.getClientInvoiceInfoList).toHaveBeenCalledWith({
      ClientId: 'client-1',
    });
    expect(mocks.addPaymentApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentApplicationBanks: [{ clientInvoiceBankId: 'bank-usd-1' }],
        settlementId: 'client-1',
      }),
    );
  });
});
