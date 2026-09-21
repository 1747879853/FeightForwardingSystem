import { describe, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: client }));
import {
  auditBills,
  getBillHistory,
  getBillList,
  getBillTask,
  runBillAction,
} from './bill-of-lading';
import {
  getConditionValueKind,
  getShouldBeOptionsForCondition,
  getTaskTypeConditionOptions,
  ShouldBe,
  TaskType,
} from './system/workflow-admin';
import {
  apiConditionsToUi,
  uiConditionsToApi,
} from '../views/system/workflow/utils/converter';

describe('提单接口与工作流契约', () => {
  it('保留 Async 后缀和页码，历史使用提单 id，任务详情使用主任务 id', async () => {
    await getBillList({ PageIndex: 2, PageSize: 20 });
    expect(client.get).toHaveBeenLastCalledWith(
      '/services/app/BillOfLadingAdmin/GetPagedListAsync',
      { params: { PageIndex: 2, PageSize: 20 } },
    );
    await getBillHistory('bill-1');
    expect(client.get).toHaveBeenLastCalledWith(
      '/services/app/BillOfLadingAdmin/GetHistoryListAsync',
      { params: { BillOfLadingId: 'bill-1' } },
    );
    await getBillTask('task-1');
    expect(client.get).toHaveBeenLastCalledWith(
      '/services/app/BillOfLadingAdmin/GetTaskAsync',
      { params: { Id: 'task-1' } },
    );
  });
  it('审核传提单 id，撤销传主任务 id，签出方式 0 不丢失', async () => {
    await auditBills(['bill-1'], false, '驳回');
    expect(client.post).toHaveBeenLastCalledWith(
      '/services/app/BillOfLadingAdmin/AuditAsync',
      { billOfLadingIds: ['bill-1'], success: false, remark: '驳回' },
    );
    await runBillAction('UnSubmit', { taskBaseId: 'task-1' });
    expect(client.post).toHaveBeenLastCalledWith(
      '/services/app/BillOfLadingAdmin/UnSubmitAsync',
      { taskBaseId: 'task-1' },
    );
    await runBillAction('SignOut', {
      ids: ['bill-1'],
      signOutType: 0,
      signOutDate: '2026-09-21',
      codeIssueTypeId: '181755750091286530',
    });
    expect(client.post.mock.lastCall?.[1]).toMatchObject({
      signOutType: 0,
      codeIssueTypeId: '181755750091286530',
    });
  });
  it('提单条件提供客户/组织/是否超期，序列化保留 Guid 和雪花 ID', () => {
    expect(
      getTaskTypeConditionOptions(TaskType.SignOutBillOfLading).map(
        (item) => item.value,
      ),
    ).toEqual([11001, 11002, 11003]);
    expect(getConditionValueKind(11001)).toBe('client');
    expect(
      getShouldBeOptionsForCondition(11001).map((item) => item.value),
    ).toEqual([ShouldBe.In, ShouldBe.NotIn]);
    expect(
      getShouldBeOptionsForCondition(11003).map((item) => item.value),
    ).toEqual([ShouldBe.Is, ShouldBe.IsNot]);
    const conditions = [
      {
        taskTypeCondition: 11001,
        shouldBe: ShouldBe.In,
        value: '49bf21c0-cd90-4f53-92de-f0b2a312eccf',
        isOr: false,
      },
      {
        taskTypeCondition: 11002,
        shouldBe: ShouldBe.In,
        value: '181755750091286530',
        isOr: true,
      },
    ];
    expect(
      uiConditionsToApi(apiConditionsToUi(conditions)).map(
        (item) => item.value,
      ),
    ).toEqual(conditions.map((item) => item.value));
  });
});
