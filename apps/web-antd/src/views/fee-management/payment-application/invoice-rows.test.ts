import { describe, expect, it } from 'vitest';

import {
  INVOICE_PROCESS,
  applyExtractedInvoiceToRows,
  buildInvoiceSubmitPayload,
  createEmptyInvoiceRow,
  formatPayAppInvoiceDates,
  formatPayAppInvoiceNos,
  mapInvoicesFromDetail,
  validateInvoiceRows,
} from './invoice-rows';

describe('formatPayAppInvoiceNos', () => {
  it('空数组与缺字段返回空串', () => {
    expect(formatPayAppInvoiceNos(undefined)).toBe('');
    expect(formatPayAppInvoiceNos(null)).toBe('');
    expect(formatPayAppInvoiceNos([])).toBe('');
    expect(formatPayAppInvoiceNos([{ invoiceNo: '  ' } as any])).toBe('');
  });

  it('多张发票号逗号拼接并保序去重', () => {
    expect(
      formatPayAppInvoiceNos([
        { invoiceNo: ' INV-1 ' } as any,
        { invoiceNo: 'INV-2' } as any,
        { invoiceNo: 'INV-1' } as any,
        { invoiceNo: '' } as any,
      ]),
    ).toBe('INV-1,INV-2');
  });
});

describe('formatPayAppInvoiceDates', () => {
  it('格式化为 YYYY-MM-DD 并去重', () => {
    expect(
      formatPayAppInvoiceDates([
        { invoiceDate: '2026-09-01T00:00:00' } as any,
        { invoiceDate: '2026-09-02T08:00:00' } as any,
        { invoiceDate: '2026-09-01T12:00:00' } as any,
      ]),
    ).toBe('2026-09-01,2026-09-02');
  });
});

describe('mapInvoicesFromDetail / buildInvoiceSubmitPayload', () => {
  it('详情回填后再提交，保留票号、日期和附件', () => {
    const rows = mapInvoicesFromDetail([
      {
        attachment: {
          attachmentId: '181755750091286530',
          clientVisible: true,
          displayOrder: 0,
          friendlyFileName: '发票.pdf',
          url: '/a.pdf',
        },
        invoiceDate: '2026-09-01T00:00:00',
        invoiceNo: 'INV-001',
      } as any,
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.invoiceNo).toBe('INV-001');
    expect(rows[0]?.invoiceDate).toBe('2026-09-01');
    expect(rows[0]?.attachment?.attachmentId).toBe('181755750091286530');

    const payload = buildInvoiceSubmitPayload(
      INVOICE_PROCESS.InvoiceBeforePayment,
      rows,
    );
    expect(payload).toEqual([
      {
        attachment: {
          attachmentDtlTypeId: null,
          attachmentId: '181755750091286530',
          clientVisible: true,
          displayOrder: 0,
        },
        invoiceDate: expect.any(String),
        invoiceNo: 'INV-001',
        sortId: 0,
      },
    ]);
  });

  it('不开票提交空数组，并丢掉空行', () => {
    const rows = [
      createEmptyInvoiceRow(),
      createEmptyInvoiceRow({ invoiceNo: 'INV-2' }),
    ];
    expect(buildInvoiceSubmitPayload(INVOICE_PROCESS.NoInvoice, rows)).toEqual(
      [],
    );
    expect(
      buildInvoiceSubmitPayload(INVOICE_PROCESS.PaymentBeforeInvoice, [
        createEmptyInvoiceRow(),
      ]),
    ).toEqual([]);
  });
});

describe('validateInvoiceRows', () => {
  it('先票后付必须至少一条发票', () => {
    expect(
      validateInvoiceRows(INVOICE_PROCESS.InvoiceBeforePayment, [
        createEmptyInvoiceRow(),
      ]).ok,
    ).toBe(false);
    expect(
      validateInvoiceRows(INVOICE_PROCESS.InvoiceBeforePayment, [
        createEmptyInvoiceRow({ invoiceNo: 'INV-1' }),
      ]).ok,
    ).toBe(true);
  });

  it('同一申请内发票号不可重复', () => {
    const result = validateInvoiceRows(INVOICE_PROCESS.PaymentBeforeInvoice, [
      createEmptyInvoiceRow({ invoiceNo: 'INV-1' }),
      createEmptyInvoiceRow({ invoiceNo: 'INV-1' }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('不可重复');
  });
});

describe('applyExtractedInvoiceToRows', () => {
  it('填入第一张空发票号的行，没空行则追加', () => {
    const filled = applyExtractedInvoiceToRows(
      [createEmptyInvoiceRow({ invoiceNo: 'OLD' }), createEmptyInvoiceRow()],
      { invoiceDate: '2026-09-04', invoiceNo: 'NEW' },
    );
    expect(filled.ok).toBe(true);
    expect(filled.next[1]?.invoiceNo).toBe('NEW');
    expect(filled.next[1]?.invoiceDate).toBe('2026-09-04');

    const appended = applyExtractedInvoiceToRows(
      [createEmptyInvoiceRow({ invoiceNo: 'OLD' })],
      { invoiceNo: 'NEW' },
    );
    expect(appended.next).toHaveLength(2);
    expect(appended.next[1]?.invoiceNo).toBe('NEW');
  });
});
