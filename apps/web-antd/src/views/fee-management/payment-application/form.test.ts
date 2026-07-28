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
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { realName: 'Test User' } }),
}));

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

vi.mock('#/components/workflow-timeline', () => ({
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
  emits: ['confirm', 'update:settlement-currency-id', 'update:settlement-id'],
  setup(_props, { emit, expose }) {
    expose({ open: vi.fn() });
    return () =>
      h(
        'button',
        {
          'data-testid': 'confirm-fees',
          onClick: () => {
            emit('update:settlement-id', 'client-1');
            emit('confirm', [
              {
                amount: 100,
                appliedAmount: 80,
                currencyCode: 'USD',
                currencyId: 1,
                feeId: 'fee-1',
                settlementId: 'client-1',
                settledAmount: 0,
                transportOrderId: 'order-1',
                unRqstPaymentAmount: 100,
              },
            ]);
          },
        },
        'confirm fees',
      );
  },
});

describe('payment application add form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addPaymentApplication.mockResolvedValue('application-1');
    mocks.getClientInvoiceInfoList.mockResolvedValue([]);
  });

  it('saves selected fees as a draft and navigates to its edit page', async () => {
    const wrapper = shallowMount(PaymentApplicationForm, {
      global: {
        stubs: {
          ASpin: SlotStub,
          AddFeeDrawer: AddFeeDrawerStub,
          Page: SlotStub,
          Spin: SlotStub,
        },
      },
    });

    await wrapper.get('[data-testid="confirm-fees"]').trigger('click');
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
      }),
    );
    expect(mocks.replace).toHaveBeenCalledWith({
      path: '/fee-management/payment-application/application-1/edit',
      query: { fromCreate: '1' },
    });
  });
});
