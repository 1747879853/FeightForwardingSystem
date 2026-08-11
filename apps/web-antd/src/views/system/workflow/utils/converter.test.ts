import { describe, expect, it } from 'vitest';

import { ShouldBe, TaskTypeCondition } from '#/api/system/workflow-admin';

import { apiConditionsToUi, uiConditionsToApi } from './converter';

function orCondition(value: string) {
  return {
    isOr: true,
    taskTypeCondition: TaskTypeCondition.OrderFeeProfit,
    shouldBe: ShouldBe.Greater,
    value,
    valueText: value,
  };
}

describe('工作流条件序列化', () => {
  it('保留每条条件的且/或归属，不按下标改写首条', () => {
    const saved = uiConditionsToApi([
      orCondition('1'),
      orCondition('2'),
      orCondition('3'),
    ]);

    expect(saved.map((c) => c.isOr)).toEqual([true, true, true]);
  });

  it('全或条件多次保存后不会被逐条转成且条件', () => {
    let list: any[] = [orCondition('1'), orCondition('2'), orCondition('3')];

    // 保存 -> 重新打开 -> 删除一条或条件 -> 再保存 -> 再打开
    list = apiConditionsToUi(uiConditionsToApi(list));
    list.splice(1, 1);
    list = apiConditionsToUi(uiConditionsToApi(list));

    expect(list.map((c) => c.isOr)).toEqual([true, true]);
  });

  it('丢弃未选完字段或介词的半成品条件', () => {
    const saved = uiConditionsToApi([
      orCondition('1'),
      { isOr: true, taskTypeCondition: undefined, shouldBe: undefined },
    ]);

    expect(saved).toHaveLength(1);
  });
});
