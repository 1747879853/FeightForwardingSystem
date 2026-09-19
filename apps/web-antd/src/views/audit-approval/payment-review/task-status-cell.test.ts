import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import TaskStatusCell from './task-status-cell.vue';

vi.mock('#/api/audit-approval/payment-review-admin', () => ({
  TaskStatus: { Auditing: 0, Rejected: 1, Passed: 2, PartialPassed: 3 },
  TaskType: { PaymentApplication: 3 },
}));
vi.mock('#/locales', () => ({ $t: () => '我的审核状态' }));
vi.mock('#/views/audit-approval/data', () => ({
  getTaskStatusOptions: () => [
    { value: 0, label: '审核中', color: 'orange' },
    { value: 1, label: '已驳回', color: 'red' },
    { value: 2, label: '已通过', color: 'green' },
    { value: 3, label: '部分通过', color: 'gray' },
  ],
}));
vi.mock('#/components/workflow-timeline', () => ({
  WorkflowTimeline: defineComponent({
    props: { entityId: { type: String, default: '' } },
    setup: (props) => () =>
      h('div', { 'data-workflow': props.entityId }, '流程详情'),
  }),
}));

const wrappers: ReturnType<typeof mount>[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

function renderStatus(taskStatus: number, myStatus = 2) {
  const wrapper = mount(TaskStatusCell, {
    attachTo: document.body,
    props: {
      row: {
        id: 'task-id',
        paymentApplicationId: 'application-id',
        taskStatus,
        myStatus,
        taskType: 3,
        frightModule: 0,
        entityId: 'application-id',
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('审批状态入口', () => {
  it.each([0, 1, 3])(
    '状态 %s 点击后才加载本申请的流程，且不触发行勾选',
    async (status) => {
      const rowClick = vi.fn();
      document.body.addEventListener('click', rowClick);
      const wrapper = renderStatus(status);
      expect(document.querySelector('[data-workflow]')).toBeNull();
      await wrapper.get('button').trigger('click');
      await flushPromises();
      expect(
        document.querySelector<HTMLElement>('[data-workflow]')?.dataset
          .workflow,
      ).toBe('application-id');
      expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
      expect(rowClick).not.toHaveBeenCalled();
      document.body.removeEventListener('click', rowClick);
    },
  );

  it('整单通过只展示标签，不提供流程按钮', () => {
    const wrapper = renderStatus(2);
    expect(wrapper.text()).toContain('已通过');
    expect(wrapper.find('button').exists()).toBe(false);
    expect(document.querySelector('[data-workflow]')).toBeNull();
  });

  it('本人已通过但整单仍在审时，仍显示审核中并保留个人状态提示', () => {
    const wrapper = renderStatus(0, 2);
    expect(wrapper.text()).toContain('审核中');
    expect(wrapper.get('button').attributes('title')).toBe(
      '我的审核状态：已通过',
    );
  });
});
