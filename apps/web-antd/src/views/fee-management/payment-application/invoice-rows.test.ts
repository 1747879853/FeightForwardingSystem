import { describe, expect, it } from 'vitest';

import {
  INVOICE_PROCESS,
  applyExtractedInvoiceToRows,
  buildInvoiceSubmitPayload,
  createEmptyInvoiceRow,
  formatPayAppInvoiceDates,
  formatPayAppInvoiceNos,
  formatPayAppSellerHeaders,
  mapInvoicesFromDetail,
  sumInvoiceAmounts,
  validateInvoiceRequiredOnSubmit,
  validateInvoiceRequiredOnSubmitFromDetail,
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
  it('详情回填后再提交，保留票号、日期、抬头、金额和附件', () => {
    const rows = mapInvoicesFromDetail([
      {
        amount: 12800,
        attachment: {
          attachmentId: '181755750091286530',
          clientVisible: true,
          displayOrder: 0,
          friendlyFileName: '发票.pdf',
          url: '/a.pdf',
        },
        invoiceDate: '2026-09-01T00:00:00',
        invoiceNo: 'INV-001',
        sellerHeader: '上海某某国际物流有限公司',
      } as any,
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.invoiceNo).toBe('INV-001');
    expect(rows[0]?.invoiceDate).toBe('2026-09-01');
    expect(rows[0]?.sellerHeader).toBe('上海某某国际物流有限公司');
    expect(rows[0]?.amount).toBe(12800);
    expect(rows[0]?.attachment?.attachmentId).toBe('181755750091286530');

    const payload = buildInvoiceSubmitPayload(
      INVOICE_PROCESS.InvoiceBeforePayment,
      rows,
    );
    expect(payload).toEqual([
      {
        amount: 12800,
        attachment: {
          attachmentDtlTypeId: null,
          attachmentId: '181755750091286530',
          clientVisible: true,
          displayOrder: 0,
        },
        invoiceDate: expect.any(String),
        invoiceNo: 'INV-001',
        sellerHeader: '上海某某国际物流有限公司',
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
  it('先票后付在录入阶段允许空发票', () => {
    expect(
      validateInvoiceRows(INVOICE_PROCESS.InvoiceBeforePayment, [
        createEmptyInvoiceRow(),
      ]).ok,
    ).toBe(true);
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

  it('销售方抬头超过256字符时拦截', () => {
    const result = validateInvoiceRows(INVOICE_PROCESS.PaymentBeforeInvoice, [
      createEmptyInvoiceRow({
        invoiceNo: 'INV-1',
        sellerHeader: 'A'.repeat(257),
      }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('销售方抬头');
  });

  it('发票金额允许负数，不要求等于申请金额', () => {
    expect(
      validateInvoiceRows(INVOICE_PROCESS.PaymentBeforeInvoice, [
        createEmptyInvoiceRow({ amount: -100, invoiceNo: 'INV-RED' }),
      ]).ok,
    ).toBe(true);
  });
});

describe('validateInvoiceRequiredOnSubmit', () => {
  it('先票后付提交时必须至少一条发票', () => {
    const empty = validateInvoiceRequiredOnSubmit(
      INVOICE_PROCESS.InvoiceBeforePayment,
      [createEmptyInvoiceRow()],
    );
    expect(empty.ok).toBe(false);
    expect(empty.message).toContain('提交前必须录入发票信息');
    expect(
      validateInvoiceRequiredOnSubmit(INVOICE_PROCESS.InvoiceBeforePayment, [
        createEmptyInvoiceRow({ invoiceNo: 'INV-1' }),
      ]).ok,
    ).toBe(true);
  });

  it('先付后票与不开票提交时不要求发票', () => {
    expect(
      validateInvoiceRequiredOnSubmit(INVOICE_PROCESS.PaymentBeforeInvoice, [
        createEmptyInvoiceRow(),
      ]).ok,
    ).toBe(true);
    expect(
      validateInvoiceRequiredOnSubmit(INVOICE_PROCESS.NoInvoice, []).ok,
    ).toBe(true);
  });

  it('列表按子表票号判断，不把先票后付当成已有票', () => {
    expect(
      validateInvoiceRequiredOnSubmitFromDetail(
        INVOICE_PROCESS.InvoiceBeforePayment,
        [],
      ).ok,
    ).toBe(false);
    expect(
      validateInvoiceRequiredOnSubmitFromDetail(
        INVOICE_PROCESS.InvoiceBeforePayment,
        [{ invoiceNo: 'INV-1' } as any],
      ).ok,
    ).toBe(true);
  });
});

describe('formatPayAppSellerHeaders / sumInvoiceAmounts', () => {
  it('抬头保序去重，空值跳过', () => {
    expect(
      formatPayAppSellerHeaders([
        { sellerHeader: ' 甲物流 ' } as any,
        { sellerHeader: '乙物流' } as any,
        { sellerHeader: '甲物流' } as any,
        { sellerHeader: '  ' } as any,
      ]),
    ).toBe('甲物流,乙物流');
  });

  it('总额由前端对已填金额求和，未填返回 null，允许负数', () => {
    expect(sumInvoiceAmounts(undefined)).toBeNull();
    expect(sumInvoiceAmounts([])).toBeNull();
    expect(
      sumInvoiceAmounts([
        { amount: 12800 } as any,
        { amount: null } as any,
        { amount: -800 } as any,
      ]),
    ).toBe(12000);
  });
});

describe('applyExtractedInvoiceToRows', () => {
  it('填入第一张空发票号的行，没空行则追加', () => {
    const filled = applyExtractedInvoiceToRows(
      [createEmptyInvoiceRow({ invoiceNo: 'OLD' }), createEmptyInvoiceRow()],
      { invoiceDate: '2026-09-04', invoiceNo: 'NEW', totalAmount: 88.5 },
    );
    expect(filled.ok).toBe(true);
    expect(filled.next[1]?.invoiceNo).toBe('NEW');
    expect(filled.next[1]?.invoiceDate).toBe('2026-09-04');
    expect(filled.next[1]?.amount).toBe(88.5);

    const appended = applyExtractedInvoiceToRows(
      [createEmptyInvoiceRow({ invoiceNo: 'OLD' })],
      { invoiceNo: 'NEW' },
    );
    expect(appended.next).toHaveLength(2);
    expect(appended.next[1]?.invoiceNo).toBe('NEW');
  });

  it('价税合计回填金额，识别抬头写入销售方抬头', () => {
    const filled = applyExtractedInvoiceToRows([createEmptyInvoiceRow()], {
      invoiceNo: 'INV-9',
      sellerHeader: '上海某某国际物流有限公司',
      sellerTaxNo: '91310000MA1K35Q12X',
      totalAmount: 1234.56,
    });
    expect(filled.ok).toBe(true);
    expect(filled.next[0]?.amount).toBe(1234.56);
    expect(filled.next[0]?.sellerHeader).toBe('上海某某国际物流有限公司');
    expect(filled.message).toContain('金额');
    expect(filled.message).toContain('销售方抬头');
  });

  it('销方税号不写入抬头', () => {
    const result = applyExtractedInvoiceToRows(
      [createEmptyInvoiceRow({ sellerHeader: '已有抬头' })],
      {
        invoiceNo: 'INV-9',
        sellerTaxNo: '91310000MA1K35Q12X',
      },
    );
    expect(result.ok).toBe(true);
    expect(result.next[0]?.sellerHeader).toBe('已有抬头');
  });
});
