import { describe, expect, it } from 'vitest';

import {
  allocateStatementAmount,
  canSettleFeeInFull,
  checkAutoAllocationAmount,
  clampStatementAmount,
  hasIgnoredAutoAllocationFilters,
  netStatementUsage,
  pickAutoAllocationStatementNum,
  statementBalance,
  suggestWriteOffAmount,
  toBankAmount,
  toOriginalAmount,
} from './fee-write-off';

describe('流水币与原币折算', () => {
  it('670 RMB 按 7.2 折回 93.06 USD', () => {
    expect(toOriginalAmount(670, 7.2)).toBe(93.06);
  });

  it('10000 USD 按 7.2 折成 72000 RMB', () => {
    expect(toBankAmount(10_000, 7.2)).toBe(72_000);
  });

  it('汇率无效时不折算', () => {
    expect(toOriginalAmount(670, 0)).toBeNull();
    expect(toBankAmount(100, Number.NaN)).toBeNull();
  });
});

describe('勾选后的默认铺满', () => {
  it('流水只剩 670 时，不把整笔 72000 带出来', () => {
    expect(suggestWriteOffAmount({ cap: 72_000, room: 670, paySide: 0 })).toBe(
      670,
    );
  });

  it('流水够覆盖整笔费用时带出折合金额', () => {
    expect(suggestWriteOffAmount({ cap: 720, room: 670, paySide: 0 })).toBe(
      670,
    );
    expect(suggestWriteOffAmount({ cap: 500, room: 670, paySide: 0 })).toBe(
      500,
    );
  });

  it('没有剩余流水时不预填', () => {
    expect(
      suggestWriteOffAmount({ cap: 72_000, room: 0, paySide: 0 }),
    ).toBeUndefined();
  });

  it('应付按剩余折满，不跟收款抢额度', () => {
    expect(suggestWriteOffAmount({ cap: 200, room: 0, paySide: 1 })).toBe(200);
  });

  it('负数应收按剩余折满，负数应付只占用剩余流水', () => {
    expect(suggestWriteOffAmount({ cap: -100, room: 0, paySide: 0 })).toBe(
      -100,
    );
    expect(suggestWriteOffAmount({ cap: -100, room: 40, paySide: 1 })).toBe(
      -40,
    );
    expect(suggestWriteOffAmount({ cap: -100, room: 200, paySide: 1 })).toBe(
      -100,
    );
  });
});

describe('底栏试算', () => {
  it('应收相加、应付冲减', () => {
    expect(
      netStatementUsage([
        { paySide: 0, bankAmount: 670 },
        { paySide: 1, bankAmount: 70 },
      ]),
    ).toBe(600);
  });

  it('结余为 0 视为完全结清，超出则标红', () => {
    expect(statementBalance(670, 0).status).toBe('idle');
    expect(statementBalance(670, 670)).toEqual({
      balance: 0,
      status: 'settled',
    });
    expect(statementBalance(670, 400).status).toBe('partial');
    expect(statementBalance(670, 870)).toEqual({
      balance: -200,
      status: 'over',
    });
  });

  it('全额结清只在流水盖得住应收时可用', () => {
    expect(canSettleFeeInFull({ cap: 72_000, room: 670, paySide: 0 })).toBe(
      false,
    );
    expect(canSettleFeeInFull({ cap: 500, room: 670, paySide: 0 })).toBe(true);
    expect(allocateStatementAmount(72_000, 670)).toBe(670);
  });

  it('负数费用的流水金额夹在额度与 0 之间', () => {
    expect(clampStatementAmount(-150, -100)).toBe(-100);
    expect(clampStatementAmount(20, -100)).toBe(0);
    expect(clampStatementAmount(-40, -100)).toBe(-40);
    expect(toBankAmount(-100, 1)).toBe(-100);
    expect(toOriginalAmount(-50, 1)).toBe(-50);
  });

  it('只有负数净额时仍视为已录入', () => {
    expect(statementBalance(1000, -50).status).toBe('partial');
    expect(
      netStatementUsage([
        { paySide: 0, bankAmount: 500 },
        { paySide: 0, bankAmount: -100 },
      ]),
    ).toBe(400);
  });
});

describe('按金额自动核销入参整理', () => {
  it('对账单号去空格；空串不传', () => {
    expect(pickAutoAllocationStatementNum({ statementNum: ' DZ2609 ' })).toBe(
      'DZ2609',
    );
    expect(
      pickAutoAllocationStatementNum({ statementNum: '   ' }),
    ).toBeUndefined();
    expect(pickAutoAllocationStatementNum({})).toBeUndefined();
  });

  it('客户对账不算被忽略的条件；编号等算', () => {
    expect(hasIgnoredAutoAllocationFilters({ statementNum: 'DZ2609' })).toBe(
      false,
    );
    expect(hasIgnoredAutoAllocationFilters({ keyword: 'C2026' })).toBe(true);
    expect(hasIgnoredAutoAllocationFilters({ clientId: 'c-1' })).toBe(true);
    expect(
      hasIgnoredAutoAllocationFilters({
        etdRange: ['2026-01-01', '2026-01-31'],
      }),
    ).toBe(true);
    expect(hasIgnoredAutoAllocationFilters({ saleIds: [1] })).toBe(true);
    expect(hasIgnoredAutoAllocationFilters({ operatorIds: [] })).toBe(false);
    expect(hasIgnoredAutoAllocationFilters({ currencyId: 2 })).toBe(true);
  });

  it('金额必须大于 0 且不超过剩余可用流水', () => {
    expect(checkAutoAllocationAmount(undefined, 600)).toEqual({
      amount: 0,
      reason: 'empty',
    });
    expect(checkAutoAllocationAmount(0, 600)).toEqual({
      amount: 0,
      reason: 'not-positive',
    });
    expect(checkAutoAllocationAmount(700, 600)).toEqual({
      amount: 700,
      reason: 'over-available',
    });
    expect(checkAutoAllocationAmount(600, 600)).toEqual({
      amount: 600,
      reason: 'ok',
    });
    expect(checkAutoAllocationAmount(1330.456, 2000)).toEqual({
      amount: 1330.46,
      reason: 'ok',
    });
  });
});
