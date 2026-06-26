import type { CSSProperties } from 'vue';

import { InvoiceApplicationStatus } from '#/api/settlement-management/invoice-application-admin';
import { PaymentApplicationStatus } from '#/api/settlement-management/payment-application-admin';

export interface ApplicationStatusTagOption {
  value: number;
  label: string;
  color?: string;
  bordered?: boolean;
  style?: CSSProperties;
}

type StatusStyleConfig = Omit<ApplicationStatusTagOption, 'value' | 'label'>;

const UNSUBMITTED_TAG_STYLE: StatusStyleConfig = {
  bordered: true,
  style: {
    color: 'rgba(0, 0, 0, 0.85)',
    backgroundColor: '#ffffff',
    borderColor: '#d9d9d9',
  },
};

const PAYMENT_APPLICATION_STATUS_STYLES: Record<number, StatusStyleConfig> = {
  [PaymentApplicationStatus.Entering]: UNSUBMITTED_TAG_STYLE,
  [PaymentApplicationStatus.Auditing]: { color: '#faad14' },
  [PaymentApplicationStatus.Rejected]: { color: 'error' },
  [PaymentApplicationStatus.Passed]: { color: 'success' },
  [PaymentApplicationStatus.Partial]: { color: '#69c0ff' },
  [PaymentApplicationStatus.Settlemented]: { color: '#0958d9' },
};

const INVOICE_APPLICATION_STATUS_STYLES: Record<number, StatusStyleConfig> = {
  [InvoiceApplicationStatus.Entering]: UNSUBMITTED_TAG_STYLE,
  [InvoiceApplicationStatus.Auditing]: { color: '#faad14' },
  [InvoiceApplicationStatus.Rejected]: { color: 'error' },
  [InvoiceApplicationStatus.Invoiced]: { color: 'success' },
};

const PAYMENT_APPLICATION_LABEL_KEYS: Record<number, string> = {
  [PaymentApplicationStatus.Entering]:
    'seaExport.export.paymentApplication.entering',
  [PaymentApplicationStatus.Auditing]:
    'seaExport.export.paymentApplication.auditing',
  [PaymentApplicationStatus.Rejected]:
    'seaExport.export.paymentApplication.rejected',
  [PaymentApplicationStatus.Passed]:
    'seaExport.export.paymentApplication.passed',
  [PaymentApplicationStatus.Partial]:
    'seaExport.export.paymentApplication.partial',
  [PaymentApplicationStatus.Settlemented]:
    'seaExport.export.paymentApplication.settlemented',
};

const INVOICE_APPLICATION_LABEL_KEYS: Record<number, string> = {
  [InvoiceApplicationStatus.Entering]:
    'seaExport.export.invoiceApplication.entering',
  [InvoiceApplicationStatus.Auditing]:
    'seaExport.export.invoiceApplication.auditing',
  [InvoiceApplicationStatus.Rejected]:
    'seaExport.export.invoiceApplication.rejected',
  [InvoiceApplicationStatus.Invoiced]:
    'seaExport.export.invoiceApplication.invoiced',
};

function buildStatusOptions(
  labelKeys: Record<number, string>,
  styles: Record<number, StatusStyleConfig>,
  t: (key: string) => string,
): ApplicationStatusTagOption[] {
  return Object.entries(labelKeys)
    .map(([value, labelKey]) => {
      const status = Number(value);
      return {
        value: status,
        label: t(labelKey),
        ...styles[status],
      };
    })
    .sort((a, b) => a.value - b.value);
}

export function getPaymentApplicationStatusOptions(
  t: (key: string) => string,
): ApplicationStatusTagOption[] {
  return buildStatusOptions(
    PAYMENT_APPLICATION_LABEL_KEYS,
    PAYMENT_APPLICATION_STATUS_STYLES,
    t,
  );
}

export function getInvoiceApplicationStatusOptions(
  t: (key: string) => string,
): ApplicationStatusTagOption[] {
  return buildStatusOptions(
    INVOICE_APPLICATION_LABEL_KEYS,
    INVOICE_APPLICATION_STATUS_STYLES,
    t,
  );
}

export function resolvePaymentApplicationStatusTag(
  status: number,
  t: (key: string) => string,
): ApplicationStatusTagOption {
  const option = getPaymentApplicationStatusOptions(t).find(
    (item) => item.value === status,
  );
  return option ?? { value: status, label: '未知' };
}

export function getPaymentApplicationStatusLabel(
  status: number,
  t: (key: string) => string,
): string {
  return resolvePaymentApplicationStatusTag(status, t).label;
}

export function getPaymentApplicationStatusColor(status: number): string {
  const color = PAYMENT_APPLICATION_STATUS_STYLES[status]?.color;
  return color ?? 'default';
}
