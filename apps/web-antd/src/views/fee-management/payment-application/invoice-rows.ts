import type { GeminiInvoiceDto } from '#/api/sea-export/gemini-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import dayjs from 'dayjs';

/** 发票流程：0=先票后付、1=先付后票、2=不开票 */
export const INVOICE_PROCESS = {
  InvoiceBeforePayment: 0,
  PaymentBeforeInvoice: 1,
  NoInvoice: 2,
} as const;

export type InvoiceProcessValue =
  (typeof INVOICE_PROCESS)[keyof typeof INVOICE_PROCESS];

export const INVOICE_PROCESS_LABELS: Record<number, string> = {
  [INVOICE_PROCESS.InvoiceBeforePayment]: '先票后付',
  [INVOICE_PROCESS.PaymentBeforeInvoice]: '先付后票',
  [INVOICE_PROCESS.NoInvoice]: '不开票',
};

export interface InvoiceRowAttachment {
  attachmentId: number | string;
  attachmentDtlTypeId?: number | null;
  clientVisible?: boolean;
  displayOrder?: number;
  friendlyFileName?: string;
  url?: string;
}

/** 表单内发票行（含本地 key，提交前再转成接口入参） */
export interface InvoiceRowForm {
  key: string;
  invoiceNo: string;
  invoiceDate?: string;
  attachment?: InvoiceRowAttachment | null;
}

let invoiceRowSeq = 0;

export function createInvoiceRowKey() {
  invoiceRowSeq += 1;
  return `inv-${invoiceRowSeq}`;
}

export function createEmptyInvoiceRow(
  overrides?: Partial<InvoiceRowForm>,
): InvoiceRowForm {
  return {
    attachment: null,
    invoiceDate: undefined,
    invoiceNo: '',
    key: createInvoiceRowKey(),
    ...overrides,
  };
}

function formatInvoiceDate(value?: null | string): string | undefined {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
}

export function mapInvoicesFromDetail(
  invoices?: null | PaymentApplicationAdminApi.PaymentApplicationInvoiceDto[],
): InvoiceRowForm[] {
  return (invoices ?? []).map((invoice) => {
    const attachment = invoice.attachment;
    return createEmptyInvoiceRow({
      attachment:
        attachment?.attachmentId == null
          ? null
          : {
              attachmentDtlTypeId: attachment.attachmentDtlTypeId ?? null,
              attachmentId: attachment.attachmentId,
              clientVisible: attachment.clientVisible ?? false,
              displayOrder: attachment.displayOrder,
              friendlyFileName: attachment.friendlyFileName,
              url: attachment.url,
            },
      invoiceDate: formatInvoiceDate(invoice.invoiceDate),
      invoiceNo: invoice.invoiceNo ?? '',
    });
  });
}

function hasInvoiceNo(row: InvoiceRowForm) {
  return Boolean(row.invoiceNo?.trim());
}

function isMeaningfulInvoiceRow(row: InvoiceRowForm) {
  return (
    hasInvoiceNo(row) || Boolean(row.invoiceDate) || row.attachment != null
  );
}

function toPositiveAttachmentId(value: number | string | undefined) {
  if (value == null || value === '') return null;
  if (value === 0 || value === '0') return null;
  return value;
}

/** 提交用：去掉空行，按当前顺序写 sortId。不开票固定返回 []。 */
export function buildInvoiceSubmitPayload(
  invoiceProcess: number | undefined,
  rows: InvoiceRowForm[],
): PaymentApplicationAdminApi.PaymentApplicationInvoiceInputDto[] {
  if (invoiceProcess === INVOICE_PROCESS.NoInvoice) return [];

  return rows.filter(isMeaningfulInvoiceRow).map((row, index) => {
    const attachmentId = toPositiveAttachmentId(row.attachment?.attachmentId);
    return {
      attachment:
        attachmentId == null
          ? null
          : {
              attachmentDtlTypeId: row.attachment?.attachmentDtlTypeId ?? null,
              attachmentId,
              clientVisible: row.attachment?.clientVisible ?? false,
              displayOrder: row.attachment?.displayOrder ?? 0,
            },
      invoiceDate: row.invoiceDate
        ? dayjs(row.invoiceDate).toISOString()
        : null,
      invoiceNo: row.invoiceNo.trim(),
      sortId: index,
    };
  });
}

export interface InvoiceRowsValidation {
  message?: string;
  ok: boolean;
}

/**
 * 与后端 ValidatePaymentApplicationInvoices 对齐。
 * 空行提交前会剥掉，所以这里按剥掉后的结果校验。
 */
export function validateInvoiceRows(
  invoiceProcess: number | undefined,
  rows: InvoiceRowForm[],
): InvoiceRowsValidation {
  if (invoiceProcess == null) {
    return { message: '请选择发票方式', ok: false };
  }

  if (invoiceProcess === INVOICE_PROCESS.NoInvoice) {
    return { ok: true };
  }

  const payload = buildInvoiceSubmitPayload(invoiceProcess, rows);

  if (
    invoiceProcess === INVOICE_PROCESS.InvoiceBeforePayment &&
    payload.length === 0
  ) {
    return {
      message: '发票流程为先票后付时，请至少录入一条发票',
      ok: false,
    };
  }

  const seen = new Set<string>();
  for (const row of payload) {
    const invoiceNo = row.invoiceNo?.trim() ?? '';
    if (!invoiceNo) {
      return { message: '发票号不能为空', ok: false };
    }
    if (invoiceNo.length > 128) {
      return { message: '发票号长度不能超过128个字符', ok: false };
    }
    if (seen.has(invoiceNo)) {
      return { message: '同一付费申请下发票号不可重复', ok: false };
    }
    seen.add(invoiceNo);
  }

  return { ok: true };
}

export function formatPayAppInvoiceNos(
  invoices?: null | PaymentApplicationAdminApi.PaymentApplicationInvoiceDto[],
): string {
  const seen = new Set<string>();
  const nums: string[] = [];
  for (const invoice of invoices ?? []) {
    const value = invoice.invoiceNo?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    nums.push(value);
  }
  return nums.join(',');
}

export function formatPayAppInvoiceDates(
  invoices?: null | PaymentApplicationAdminApi.PaymentApplicationInvoiceDto[],
): string {
  const seen = new Set<string>();
  const dates: string[] = [];
  for (const invoice of invoices ?? []) {
    const formatted = formatInvoiceDate(invoice.invoiceDate);
    if (!formatted || seen.has(formatted)) continue;
    seen.add(formatted);
    dates.push(formatted);
  }
  return dates.join(',');
}

/** 识别结果写入第一张空发票号的行；没有空行则追加一行。 */
export function applyExtractedInvoiceToRows(
  rows: InvoiceRowForm[],
  result: GeminiInvoiceDto,
): { message: string; next: InvoiceRowForm[]; ok: boolean } {
  const nextNo = result.invoiceNo?.trim() || '';
  const parsedDate = result.invoiceDate ? dayjs(result.invoiceDate) : null;
  const nextDate = parsedDate?.isValid() ? parsedDate.format('YYYY-MM-DD') : '';
  if (!nextNo && !nextDate) {
    return {
      message: '未能识别出发票号和开票日期，请手动填写',
      next: rows,
      ok: false,
    };
  }

  const targetIndex = rows.findIndex((row) => !hasInvoiceNo(row));
  if (targetIndex >= 0) {
    return {
      message: '已填入识别结果，请核对后保存',
      next: rows.map((row, index) =>
        index === targetIndex
          ? {
              ...row,
              invoiceDate: nextDate || row.invoiceDate,
              invoiceNo: nextNo || row.invoiceNo,
            }
          : row,
      ),
      ok: true,
    };
  }

  return {
    message: '已填入识别结果，请核对后保存',
    next: [
      ...rows,
      createEmptyInvoiceRow({
        invoiceDate: nextDate || undefined,
        invoiceNo: nextNo,
      }),
    ],
    ok: true,
  };
}

export function applyExtractedInvoiceToRow(
  row: InvoiceRowForm,
  result: GeminiInvoiceDto,
): { message: string; next: InvoiceRowForm; ok: boolean } {
  const nextNo = result.invoiceNo?.trim() || '';
  const parsedDate = result.invoiceDate ? dayjs(result.invoiceDate) : null;
  const nextDate = parsedDate?.isValid() ? parsedDate.format('YYYY-MM-DD') : '';
  if (!nextNo && !nextDate) {
    return {
      message: '未能识别出发票号和开票日期，请手动填写',
      next: row,
      ok: false,
    };
  }
  return {
    message: '已填入识别结果，请核对后保存',
    next: {
      ...row,
      invoiceDate: nextDate || row.invoiceDate,
      invoiceNo: nextNo || row.invoiceNo,
    },
    ok: true,
  };
}
