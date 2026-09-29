import { describe, expect, it } from 'vitest';

import { joinPersonNames } from './data';

describe('业务联系单审核干系人列', () => {
  it('多人用顿号拼接', () => {
    expect(joinPersonNames(['张三', '李四'])).toBe('张三、李四');
  });

  it('空值和单个名字', () => {
    expect(joinPersonNames(['', '王五'])).toBe('王五');
    expect(joinPersonNames('赵六')).toBe('赵六');
    expect(joinPersonNames(null)).toBe('');
  });
});
