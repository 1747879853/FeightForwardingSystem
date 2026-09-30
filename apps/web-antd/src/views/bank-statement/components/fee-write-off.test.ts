import { describe, expect, it } from 'vitest';

import {
  allocateStatementAmount,
  canSettleFeeInFull,
  netStatementUsage,
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
});
