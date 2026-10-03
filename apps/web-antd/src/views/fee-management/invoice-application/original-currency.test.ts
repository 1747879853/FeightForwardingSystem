import { describe, expect, it } from 'vitest';

import {
  groupFeesByCurrency,
  isOriginalApplicationCurrency,
  ORIGINAL_APPLICATION_CURRENCY,
} from './original-currency';

describe('原币申请', () => {
  it('空值和默认项都表示按原币拆单', () => {
    expect(isOriginalApplicationCurrency(undefined)).toBe(true);
    expect(isOriginalApplicationCurrency(null)).toBe(true);
    expect(isOriginalApplicationCurrency('')).toBe(true);
    expect(isOriginalApplicationCurrency(ORIGINAL_APPLICATION_CURRENCY)).toBe(
      true,
    );
    expect(isOriginalApplicationCurrency(1)).toBe(false);
  });

  it('按费用币别分组，缺币别的单独列出', () => {
    const { groups, missing } = groupFeesByCurrency([
      { orderFee: { currencyId: 2, id: 'a' } },
      { orderFee: { currencyId: 1, id: 'b' } },
      { orderFee: { currencyId: 2, id: 'c' } },
      { orderFee: { id: 'd' } },
    ]);
    expect(missing).toHaveLength(1);
    expect(groups.get(2)?.map((fee) => fee.orderFee.id)).toEqual(['a', 'c']);
    expect(groups.get(1)?.map((fee) => fee.orderFee.id)).toEqual(['b']);
  });
});
