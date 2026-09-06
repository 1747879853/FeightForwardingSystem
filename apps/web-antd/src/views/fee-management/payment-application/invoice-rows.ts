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
  sellerHeader?: string;
  amount?: number | null;
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
    amount: undefined,
    attachment: null,
    invoiceDate: undefined,
    invoiceNo: '',
    key: createInvoiceRowKey(),
    sellerHeader: '',
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
      amount: invoice.amount ?? undefined,
      invoiceDate: formatInvoiceDate(invoice.invoiceDate),
      invoiceNo: invoice.invoiceNo ?? '',
      sellerHeader: invoice.sellerHeader ?? '',
    });
  });
}

function hasInvoiceNo(row: InvoiceRowForm) {
  return Boolean(row.invoiceNo?.trim());
}

function isMeaningfulInvoiceRow(row: InvoiceRowForm) {
  return (
    hasInvoiceNo(row) ||
    Boolean(row.invoiceDate) ||
    Boolean(row.sellerHeader?.trim()) ||
    row.amount != null ||
    row.attachment != null
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
      amount: row.amount ?? null,
      invoiceDate: row.invoiceDate
        ? dayjs(row.invoiceDate).toISOString()
        : null,
      invoiceNo: row.invoiceNo.trim(),
      sellerHeader: row.sellerHeader?.trim() || null,
      sortId: index,
    };
  });
}

export interface InvoiceRowsValidation {
  message?: string;
  ok: boolean;
}

export const INVOICE_REQUIRED_ON_SUBMIT_MESSAGE =
  '发票流程为先票后付时，提交前必须录入发票信息';

function hasPersistedInvoiceNo(
  invoices?: null | PaymentApplicationAdminApi.PaymentApplicationInvoiceDto[],
) {
  return (invoices ?? []).some((invoice) => Boolean(invoice.invoiceNo?.trim()));
}

/**
 * 与后端 ValidatePaymentApplicationInvoices 对齐（新增 / 编辑 / 仅编辑发票）。
 * 先票后付允许空票：正常节奏是先建单再补票。不开票不能有票由切流程时清空保证。
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
    const sellerHeader = row.sellerHeader?.trim() ?? '';
    if (sellerHeader.length > 256) {
      return { message: '销售方抬头长度不能超过256个字符', ok: false };
    }
  }

  return { ok: true };
}

/**
 * 与后端 ValidateInvoiceRequiredOnSubmit 对齐，只在 SubmitAsync 前调用。
 * 先票后付必须有发票；录入阶段不要用这个方法。
 */
export function validateInvoiceRequiredOnSubmit(
  invoiceProcess: number | undefined,
  rows: InvoiceRowForm[],
): InvoiceRowsValidation {
  if (invoiceProcess !== INVOICE_PROCESS.InvoiceBeforePayment) {
    return { ok: true };
  }
  if (buildInvoiceSubmitPayload(invoiceProcess, rows).length === 0) {
    return { message: INVOICE_REQUIRED_ON_SUBMIT_MESSAGE, ok: false };
  }
  return { ok: true };
}

/** 列表已落库发票：先票后付提交前按子表有无票号判断，不能看 InvoiceProcess。 */
export function validateInvoiceRequiredOnSubmitFromDetail(
  invoiceProcess: number | undefined,
  invoices?: null | PaymentApplicationAdminApi.PaymentApplicationInvoiceDto[],
): InvoiceRowsValidation {
  if (invoiceProcess !== INVOICE_PROCESS.InvoiceBeforePayment) {
    return { ok: true };
  }
  if (!hasPersistedInvoiceNo(invoices)) {
    return { message: INVOICE_REQUIRED_ON_SUBMIT_MESSAGE, ok: false };
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

export function formatPayAppSellerHeaders(
  invoices?: null | PaymentApplicationAdminApi.PaymentApplicationInvoiceDto[],
): string {
  const seen = new Set<string>();
  const headers: string[] = [];
  for (const invoice of invoices ?? []) {
    const value = invoice.sellerHeader?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    headers.push(value);
  }
  return headers.join(',');
}

/** 发票金额合计（前端自己算，不走后端）。全部未填返回 null。 */
export function sumInvoiceAmounts(
  invoices?:
    | null
    | InvoiceRowForm[]
    | PaymentApplicationAdminApi.PaymentApplicationInvoiceDto[],
): number | null {
  let hasValue = false;
  let total = 0;
  for (const invoice of invoices ?? []) {
    if (invoice.amount == null) continue;
    const amount = Number(invoice.amount);
    if (!Number.isFinite(amount)) continue;
    hasValue = true;
    total += amount;
  }
  if (!hasValue) return null;
  return Math.round(total * 100) / 100;
}

function parseExtractedAmount(value: null | number | string | undefined) {
  if (value == null || value === '') return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

function trimExtractedText(value?: null | string) {
  const text = value?.trim() ?? '';
  return text || undefined;
}

function mergeExtractedInvoice(
  row: InvoiceRowForm,
  result: GeminiInvoiceDto,
): { message: string; next: InvoiceRowForm; ok: boolean } {
  const nextNo = result.invoiceNo?.trim() || '';
  const parsedDate = result.invoiceDate ? dayjs(result.invoiceDate) : null;
  const nextDate = parsedDate?.isValid() ? parsedDate.format('YYYY-MM-DD') : '';
  const nextAmount = parseExtractedAmount(result.totalAmount);
  const nextSellerHeader = trimExtractedText(result.sellerHeader);
  if (!nextNo && !nextDate && nextAmount == null && !nextSellerHeader) {
    return {
      message: '未能识别出发票号、开票日期、抬头和金额，请手动填写',
      next: row,
      ok: false,
    };
  }

  const filled: string[] = [];
  if (nextNo) filled.push('发票号');
  if (nextDate) filled.push('开票日期');
  if (nextSellerHeader) filled.push('销售方抬头');
  if (nextAmount != null) filled.push('金额');

  return {
    message: `已填入${filled.join('、')}，请核对后保存`,
    next: {
      ...row,
      amount: nextAmount ?? row.amount,
      invoiceDate: nextDate || row.invoiceDate,
      invoiceNo: nextNo || row.invoiceNo,
      sellerHeader: nextSellerHeader || row.sellerHeader,
    },
    ok: true,
  };
}

/** 识别结果写入第一张空发票号的行；没有空行则追加一行。 */
export function applyExtractedInvoiceToRows(
  rows: InvoiceRowForm[],
  result: GeminiInvoiceDto,
): { message: string; next: InvoiceRowForm[]; ok: boolean } {
  const probe = mergeExtractedInvoice(createEmptyInvoiceRow(), result);
  if (!probe.ok) {
    return { message: probe.message, next: rows, ok: false };
  }

  const targetIndex = rows.findIndex((row) => !hasInvoiceNo(row));
  if (targetIndex >= 0) {
    const applied = mergeExtractedInvoice(rows[targetIndex]!, result);
    return {
      message: applied.message,
      next: rows.map((row, index) =>
        index === targetIndex ? applied.next : row,
      ),
      ok: true,
    };
  }

  return {
    message: probe.message,
    next: [...rows, probe.next],
    ok: true,
  };
}

export function applyExtractedInvoiceToRow(
  row: InvoiceRowForm,
  result: GeminiInvoiceDto,
): { message: string; next: InvoiceRowForm; ok: boolean } {
  return mergeExtractedInvoice(row, result);
}
