import type { BillOfLading, BillTaskItem } from '../../api/bill-of-lading';
import { describe, expect, it } from 'vitest';
import { canAct, canAudit, selectionError } from './rules';

function bill(overrides: Partial<BillOfLading> = {}): BillOfLading {
  return {
    id: 'bill-1',
    status: 1,
    isOriginal: true,
    isSeparate: false,
    isOverdue: false,
    settlement: { id: 'client-1' },
    seaExport: { id: 'order-1', transportOrder: { id: 'order-1' } },
    ...overrides,
  };
}
describe('提单流转边界', () => {
  it('审核中只可撤销提交，已扣单只可取消扣单', () => {
    for (const action of [
      'SignIn',
      'SignOut',
      'Swap',
      'Deduct',
      'Submit',
      'CancelSwap',
      'CancelSignOut',
      'CancelSignIn',
    ] as const) {
      expect(canAct(bill({ status: 3 }), action)).toBe(false);
      expect(canAct(bill({ status: 6 }), action)).toBe(false);
    }
    expect(canAct(bill({ status: 3, taskBaseId: 'task-1' }), 'UnSubmit')).toBe(
      true,
    );
    expect(canAct(bill({ status: 6 }), 'CancelDeduct')).toBe(true);
  });
  it('非正本禁止签入/换签；取消签入必须有生效签入且未换签', () => {
    expect(canAct(bill({ status: 0, isOriginal: false }), 'SignIn')).toBe(
      false,
    );
    expect(canAct(bill({ isOriginal: false }), 'Swap')).toBe(false);
    expect(canAct(bill(), 'CancelSignIn')).toBe(false);
    const signIn = { id: 'history', creationTime: '2026-09-21' };
    expect(canAct(bill({ signIn }), 'CancelSignIn')).toBe(true);
    expect(canAct(bill({ signIn, swap: signIn }), 'CancelSignIn')).toBe(false);
    expect(canAct(bill({ status: 2 }), 'Submit')).toBe(true);
    expect(canAct(bill({ status: 4 }), 'Submit')).toBe(false);
  });
  it('批量提交使用分单结算对象而不是共同的主单委托单位', () => {
    const main = bill();
    const separate = bill({
      id: 'bill-2',
      isSeparate: true,
      settlement: { id: 'other-client' },
    });
    expect(selectionError([main, separate], 'Submit')).toContain(
      '相同结算对象',
    );
    expect(
      selectionError(
        [main, bill({ id: 'bill-2', isSeparate: true })],
        'Submit',
      ),
    ).toBeUndefined();
    expect(selectionError([bill({ settlement: null })], 'Submit')).toContain(
      '补齐',
    );
    expect(selectionError([main, main], 'CancelSignIn')).toContain(
      '只选择一张',
    );
  });
  it('只允许当前审核人处理当前步骤，已通过仅原通过人可驳回，已签出禁止驳回', () => {
    const item: BillTaskItem = {
      taskItemId: 'item',
      taskStatus: 0,
      myTaskStatus: 0,
      billOfLading: bill({ status: 3 }),
    };
    expect(canAudit(item, true)).toBe(true);
    expect(canAudit({ ...item, myTaskStatus: null }, true)).toBe(false);
    const passed = {
      ...item,
      taskStatus: 2,
      myTaskStatus: 2,
      billOfLading: bill({ status: 4 }),
    };
    expect(canAudit(passed, true)).toBe(false);
    expect(canAudit(passed, false)).toBe(true);
    expect(canAudit({ ...passed, myTaskStatus: null }, false)).toBe(false);
    expect(
      canAudit({ ...passed, billOfLading: bill({ status: 5 }) }, false),
    ).toBe(false);
  });
});
